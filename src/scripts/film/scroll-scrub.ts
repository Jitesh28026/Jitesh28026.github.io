/**
 * Scroll-scrub engine.
 *
 * One full-screen <canvas> is painted with the frame matching scroll position.
 * Deliberately NOT a <video> with currentTime seeking, which stutters badly on
 * mobile Safari. That is the whole reason for the frame-sequence approach.
 *
 * No gsap. ScrollTrigger would do the scroll maths for us, but gsap's npm ci
 * install is non-deterministic and has broken this repo's Pages deploy before,
 * so the mapping is done by hand against cached section offsets. It is a few
 * lines either way and it keeps the build dependency free, matching the rAF
 * driven approach used by the v2 scripts.
 *
 * Layout model: rather than pinning six sections, a single `position: fixed`
 * canvas sits behind six tall spacer sections plus a seam section.
 *
 * THE LOOP. After scene 6 comes a seam that cross-fades scene 6's last frame
 * into scene 1's first frame. At the end of the seam the canvas shows scene 1
 * frame 0 at full opacity, which is precisely what scroll position 0 shows, so
 * jumping the scroll back to the top swaps in an identical image. The wrap is
 * therefore invisible, in both directions, with no snap or flicker.
 */

import { FrameLoader } from './frame-loader';
import { drawTvGlow } from './tv-glow';
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCENES, type SceneConfig } from './config';

interface SceneSection {
  scene: SceneConfig;
  el: HTMLElement;
  /** Document-space offset of the section top. Cached; recomputed on resize. */
  top: number;
  /** Section height in px. Cached. */
  height: number;
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

  let activeId = 0;
  let started = false;
  /** Guards the frame after a programmatic wrap, so it cannot re-trigger. */
  let justWrapped = false;

  // The brief is explicit that a first load always begins at scene 1, so do
  // not let the browser restore a previous scroll position into the middle of
  // the journey.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  // --- Section geometry ---------------------------------------------------

  const sections: SceneSection[] = [];
  for (const scene of SCENES) {
    const el = document.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`);
    if (!el) {
      console.warn(`[film] no section for scene ${scene.id}`);
      continue;
    }
    sections.push({ scene, el, top: 0, height: 0 });
  }

  const seamEl = document.querySelector<HTMLElement>('[data-film-seam]');
  let seamTop = 0;
  let seamHeight = 0;

  /**
   * Cache document offsets once rather than calling getBoundingClientRect for
   * every section on every frame.
   */
  function measure(): void {
    for (const s of sections) {
      const rect = s.el.getBoundingClientRect();
      s.top = rect.top + window.scrollY;
      s.height = rect.height;
    }
    if (seamEl) {
      const rect = seamEl.getBoundingClientRect();
      seamTop = rect.top + window.scrollY;
      seamHeight = rect.height;
    }
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
   * distort. Shared so that overlays can be positioned in the same space as
   * the frame rather than guessing at it.
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
      drawTvGlow(
        ctx,
        shot.progress,
        (x, y) => [dx + x * scale, dy + y * scale],
        scale,
      );
    }
  }

  // --- Scroll mapping -----------------------------------------------------

  const firstScene = SCENES[0];
  const lastScene = SCENES[SCENES.length - 1];

  /**
   * Resolve scroll position to what should be on screen.
   *
   * Progress within a scene runs from the moment its top reaches the top of
   * the viewport until its bottom reaches the bottom, so the travel available
   * is (height - viewportHeight).
   */
  function resolve(): Shot | undefined {
    const scrollY = window.scrollY;
    const viewportH = window.innerHeight;

    // The seam, cross-fading the end of scene 6 into the start of scene 1.
    //
    // Both endpoints come from pinned frames rather than resident scenes. The
    // two scenes are never resident together, and an earlier version resolved
    // the target through the normal path, where entering the seam released
    // scene 1 and left the dissolve with nothing to dissolve into.
    if (seamEl && seamHeight > 0 && scrollY >= seamTop) {
      // The seam is the last section, so the scroll actually available inside
      // it is (height - viewportHeight), not its full height. Dividing by the
      // full height would leave the dissolve unfinished at the wrap point,
      // which is precisely the jump this seam exists to hide.
      const seamTravel = Math.max(1, seamHeight - viewportH);
      const mix = clamp((scrollY - seamTop) / seamTravel, 0, 1);
      const from = loader.getPin(lastScene, 1) ?? loader.frameAt(lastScene, 1);
      const to = loader.getPin(firstScene, 0) ?? loader.frameAt(firstScene, 0);
      if (from) return { from, to, mix };
      if (to) return { from: to, mix: 0 };
      return undefined;
    }

    for (const s of sections) {
      const travel = Math.max(1, s.height - viewportH);
      const raw = (scrollY - s.top) / travel;
      if (raw >= 0 && raw <= 1) {
        if (s.scene.id !== activeId) {
          activeId = s.scene.id;
          loader.update(activeId);
        }
        const frame = loader.frameAt(s.scene, raw);
        return frame ? { from: frame, mix: 0, sceneId: s.scene.id, progress: raw } : undefined;
      }
    }

    // Before the first section: hold the opening frame.
    const opening = loader.frameAt(firstScene, 0);
    return opening ? { from: opening, mix: 0, sceneId: firstScene.id, progress: 0 } : undefined;
  }

  // --- The wrap -----------------------------------------------------------

  function maxScroll(): number {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

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
    if (max <= 0) return;

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

  measure();
  resize();

  window.addEventListener('resize', () => {
    measure();
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
