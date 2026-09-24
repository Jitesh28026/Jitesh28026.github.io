/**
 * Scroll-scrub engine.
 *
 * One full-screen <canvas> is painted with the frame matching scroll position.
 * Deliberately NOT a <video> with currentTime seeking, which stutters badly on
 * mobile Safari. That is the whole reason for the frame-sequence approach.
 *
 * No gsap. ScrollTrigger would do the scroll maths for us, but gsap's npm ci
 * install is non-deterministic and has broken this repo's Pages deploy before,
 * so the mapping is done by hand. It keeps the build dependency free and
 * matches the rAF driven approach used by the v2 scripts.
 *
 * TIMELINE MODEL. The scrollable range is partitioned into contiguous segments
 * by the weights in the scene config, one per scene plus the loop seam. The
 * DOM sections exist only to give the document its height; nothing here reads
 * their positions.
 *
 * That matters. An earlier version derived each scene's progress from its own
 * element as (scrollY - top) / (height - viewportHeight). Under that mapping a
 * scene reached progress 1 a full viewport height BEFORE the next section
 * began, so between every pair of scenes sat a gap where no section matched
 * and the canvas fell back to scene 1's opening frame. Partitioning a single
 * range cannot produce a gap by construction.
 *
 * THE LOOP. The final segment is a seam that cross-fades scene 6's last frame
 * into scene 1's first frame, finishing exactly at maximum scroll. At that
 * point the canvas shows scene 1 frame 0, which is precisely what scroll
 * position 0 shows, so wrapping to the top swaps in an identical image and is
 * invisible in both directions.
 */

import { FrameLoader } from './frame-loader';
import { drawTvGlow } from './tv-glow';
import {
  BASE_SCROLL_VH,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  SCENES,
  SEAM_SCROLL_VH,
  type SceneConfig,
} from './config';

/** One contiguous stretch of the scroll range. A scene, or the loop seam. */
interface Segment {
  /** undefined marks the seam. */
  scene?: SceneConfig;
  /** Relative share of the scrollable range. */
  weight: number;
  start: number;
  end: number;
}

/** What the canvas should show right now: one frame, or two mid dissolve. */
interface Shot {
  from: HTMLImageElement;
  to?: HTMLImageElement;
  /** 0 = fully `from`, 1 = fully `to`. */
  mix: number;
  /** Scene being shown, so scene specific light can be layered on top. */
  sceneId?: number;
  /** Progress through that scene, 0..1. */
  progress?: number;
}

export interface ScrubHandle {
  /** 0..1 share of the opening scene that has loaded, for the preloader. */
  openingProgress(): number;
  /** Called once the viewer has entered, to arm the loop wrap. */
  start(): void;
}

export function initScrollScrub(canvas: HTMLCanvasElement): ScrubHandle {
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = new FrameLoader();

  const firstScene = SCENES[0];
  const lastScene = SCENES[SCENES.length - 1];

  let activeId = 0;
  let started = false;
  /** Guards the frame after a programmatic wrap, so it cannot re-trigger. */
  let justWrapped = false;

  // The brief is explicit that a first load always begins at scene 1, so do
  // not let the browser restore a previous scroll position mid journey.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // --- Timeline -----------------------------------------------------------

  // Weights are in the same units the sections are sized in, so the painted
  // timeline stays aligned with the scroll height the CSS actually produces.
  const segments: Segment[] = [
    ...SCENES.map((scene) => ({
      scene,
      weight: BASE_SCROLL_VH * scene.scrollFactor,
      start: 0,
      end: 0,
    })),
    { weight: SEAM_SCROLL_VH, start: 0, end: 0 },
  ];

  function maxScroll(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  /** Lay the segments across the scrollable range. Recomputed on resize. */
  function layout(): void {
    const max = maxScroll();
    const total = segments.reduce((sum, seg) => sum + seg.weight, 0);
    let cursor = 0;
    for (const seg of segments) {
      seg.start = cursor;
      cursor += (seg.weight / total) * max;
      seg.end = cursor;
    }
    // Absorb rounding so the seam finishes exactly at the wrap point.
    segments[segments.length - 1].end = max;
  }

  // --- Canvas sizing ------------------------------------------------------

  function resize(): void {
    // Cap DPR at 2: 3x costs a lot of fill rate for no visible gain.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
  }

  // --- Painting -----------------------------------------------------------

  /**
   * Cover-fit geometry: fill the viewport, crop the overflowing axis, never
   * distort. Shared so overlays land in the same space as the frame.
   */
  function coverMetrics(): { scale: number; dx: number; dy: number } {
    const scale = Math.max(canvas.width / CANVAS_WIDTH, canvas.height / CANVAS_HEIGHT);
    return {
      scale,
      dx: (canvas.width - CANVAS_WIDTH * scale) / 2,
      dy: (canvas.height - CANVAS_HEIGHT * scale) / 2,
    };
  }

  function drawCover(img: HTMLImageElement): void {
    if (!ctx) return;
    const { scale, dx, dy } = coverMetrics();
    ctx.drawImage(img, dx, dy, CANVAS_WIDTH * scale, CANVAS_HEIGHT * scale);
  }

  function render(shot: Shot): void {
    if (!ctx) return;
    ctx.globalAlpha = 1;
    drawCover(shot.from);
    if (shot.to && shot.mix > 0) {
      ctx.globalAlpha = shot.mix;
      drawCover(shot.to);
      ctx.globalAlpha = 1;
    }

    // Scene 1 only: the television's light, layered over the painted frame.
    // Driven purely by scroll progress, so it holds still when the viewer does.
    if (shot.sceneId === firstScene.id && shot.progress !== undefined) {
      const { scale, dx, dy } = coverMetrics();
      drawTvGlow(ctx, shot.progress, (x, y) => [dx + x * scale, dy + y * scale], scale);
    }
  }

  // --- Scroll mapping -----------------------------------------------------

  /** Resolve scroll position to what should be on screen. */
  function resolve(): Shot | undefined {
    const scrollY = clamp(window.scrollY, 0, maxScroll());

    // Walk to the segment containing this position. The ranges tile the whole
    // scrollable span, so exactly one matches and there is never a gap.
    let segment = segments[segments.length - 1];
    for (const seg of segments) {
      if (scrollY < seg.end) {
        segment = seg;
        break;
      }
    }

    const span = Math.max(1, segment.end - segment.start);
    const progress = clamp((scrollY - segment.start) / span, 0, 1);

    // The seam.
    //
    // Both endpoints come from pinned frames rather than resident scenes. The
    // two scenes are never resident together, and resolving the target through
    // the normal path meant entering the seam released scene 1 and left the
    // dissolve with nothing to dissolve into.
    if (!segment.scene) {
      const from = loader.getPin(lastScene, 1) ?? loader.frameAt(lastScene, 1);
      const to = loader.getPin(firstScene, 0) ?? loader.frameAt(firstScene, 0);
      if (from) return { from, to, mix: progress };
      if (to) return { from: to, mix: 0 };
      return undefined;
    }

    if (segment.scene.id !== activeId) {
      activeId = segment.scene.id;
      loader.update(activeId);
    }

    const frame = loader.frameAt(segment.scene, progress);
    return frame
      ? { from: frame, mix: 0, sceneId: segment.scene.id, progress }
      : undefined;
  }

  // --- The wrap -----------------------------------------------------------

  /**
   * Wrap the scroll position when either end is reached.
   *
   * Both ends show the same image (scene 1 frame 0), so the jump is invisible.
   * `justWrapped` skips one frame afterwards so the new position cannot
   * immediately satisfy the opposite condition and ping-pong.
   */
  function wrapIfNeeded(): void {
    if (!started) return;
    if (justWrapped) {
      justWrapped = false;
      return;
    }
    const max = maxScroll();

    // Reaching the end of the seam returns to the top of scene 1.
    if (window.scrollY >= max - 1) {
      justWrapped = true;
      window.scrollTo(0, 1);
      return;
    }
    // Scrolling up off the top enters the seam from its end.
    if (window.scrollY <= 0) {
      justWrapped = true;
      window.scrollTo(0, max - 2);
    }
  }

  // --- Frame loop ---------------------------------------------------------

  // Everything happens on rAF rather than in a scroll handler, so a burst of
  // scroll events collapses into at most one read and one draw per frame.
  function tick(): void {
    wrapIfNeeded();
    const shot = resolve();
    // Repaint every frame rather than diffing: a dissolve changes on mix alone,
    // and a full-screen drawImage is cheap next to the decode already done.
    if (shot) render(shot);
    requestAnimationFrame(tick);
  }

  // --- Boot ---------------------------------------------------------------

  layout();
  resize();

  window.addEventListener('resize', () => {
    layout();
    resize();
  });

  // Two-step boot: paint the opening frame as soon as that single image
  // decodes, so the canvas fills almost immediately, then bring in the rest of
  // the sequence behind it.
  void loader.firstFrame(firstScene).then((img) => {
    if (ctx) drawCover(img);
  });

  void loader.load(firstScene).then(() => {
    activeId = firstScene.id;
    loader.update(firstScene.id);
  });

  // Pin the two frames the loop seam dissolves between. They sit outside the
  // release cycle, so the seam works no matter which scene is resident, and
  // the viewer can reach it immediately by scrolling up from the very start.
  void loader.pin(firstScene, 0);
  void loader.pin(lastScene, 1);

  requestAnimationFrame(tick);

  return {
    openingProgress: () => loader.progressOf(firstScene.id),
    start: () => {
      // Rest one pixel off the top before arming the wrap.
      //
      // The backwards wrap fires at scrollY <= 0, and the page opens at
      // exactly 0, so arming it here would instantly throw the viewer to the
      // seam. Sitting at 1 means only a deliberate upward scroll reaches 0.
      if (window.scrollY <= 0) window.scrollTo(0, 1);
      started = true;
    },
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
