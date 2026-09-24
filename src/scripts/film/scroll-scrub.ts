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
 * lines either way and it keeps the build dependency-free, matching the rAF
 * driven approach used by the v2 scripts.
 *
 * Layout model: rather than pinning six sections, a single `position: fixed`
 * canvas sits behind six tall spacer sections. Visually identical to pinning,
 * without pin-spacer reflow or the flicker at hand-off between pinned sections.
 */

import { FrameLoader } from './frame-loader';
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCENES, type SceneConfig } from './config';

interface SceneSection {
  scene: SceneConfig;
  el: HTMLElement;
  /** Document-space offset of the section top. Cached; recomputed on resize. */
  top: number;
  /** Section height in px. Cached. */
  height: number;
}

export interface ScrubHandle {
  /** 0..1 share of the opening scene that has loaded, for the preloader. */
  openingProgress(): number;
}

export function initScrollScrub(canvas: HTMLCanvasElement): ScrubHandle {
  const ctx = canvas.getContext('2d', { alpha: false });
  const loader = new FrameLoader();

  /** Frame queued for the next animation frame. */
  let pending: HTMLImageElement | undefined;
  /** What is currently on the canvas, so redundant repaints are skipped. */
  let painted: HTMLImageElement | undefined;
  /** Scene whose frames are currently resident. */
  let activeId = 0;

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

  /**
   * Cache each section's document offset once, rather than calling
   * getBoundingClientRect for six sections on every frame.
   */
  function measure(): void {
    for (const s of sections) {
      const rect = s.el.getBoundingClientRect();
      s.top = rect.top + window.scrollY;
      s.height = rect.height;
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
    // Force a repaint of the current frame at the new size.
    if (painted) {
      pending = painted;
      painted = undefined;
    }
  }

  // --- Painting -----------------------------------------------------------

  /** Cover-fit: fill the viewport, crop the overflowing axis, never distort. */
  function paint(img: HTMLImageElement): void {
    if (!ctx) return;
    const scale = Math.max(canvas.width / CANVAS_WIDTH, canvas.height / CANVAS_HEIGHT);
    const w = CANVAS_WIDTH * scale;
    const h = CANVAS_HEIGHT * scale;
    ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  // --- Scroll mapping -----------------------------------------------------

  /**
   * Which scene the viewport is in, and how far through it, 0..1.
   *
   * Progress runs from the moment a section's top reaches the top of the
   * viewport until its bottom reaches the bottom, so the travel available is
   * (height - viewportHeight).
   */
  function resolve(): { scene: SceneConfig; progress: number } | undefined {
    const scrollY = window.scrollY;
    const viewportH = window.innerHeight;

    for (const s of sections) {
      const travel = Math.max(1, s.height - viewportH);
      const raw = (scrollY - s.top) / travel;
      if (raw >= 0 && raw <= 1) return { scene: s.scene, progress: raw };
    }

    // Past the end or before the start: clamp to the nearest section so the
    // canvas always has something valid to show.
    const first = sections[0];
    const last = sections[sections.length - 1];
    if (!first || !last) return undefined;
    return scrollY < first.top
      ? { scene: first.scene, progress: 0 }
      : { scene: last.scene, progress: 1 };
  }

  // --- Frame loop ---------------------------------------------------------

  // Everything happens on rAF rather than in a scroll handler, so a burst of
  // scroll events collapses into at most one read and one draw per frame.
  function tick(): void {
    const at = resolve();
    if (at) {
      if (at.scene.id !== activeId) {
        activeId = at.scene.id;
        loader.update(activeId);
      }
      const frame = loader.frameAt(at.scene, at.progress);
      // Hold the last painted frame while a scene loads rather than flashing
      // an empty canvas.
      if (frame) pending = frame;
    }

    if (pending && pending !== painted) {
      paint(pending);
      painted = pending;
    }

    requestAnimationFrame(tick);
  }

  // --- Boot ---------------------------------------------------------------

  measure();
  resize();

  window.addEventListener('resize', () => {
    measure();
    resize();
  });

  const opening = SCENES[0];

  // Two-step boot: paint the opening frame as soon as that single image
  // decodes, so the canvas fills almost immediately, then bring in the rest of
  // the sequence behind it.
  void loader.firstFrame(opening).then((img) => {
    if (!painted) pending = img;
  });

  void loader.load(opening).then(() => {
    activeId = opening.id;
    loader.update(opening.id);
  });

  requestAnimationFrame(tick);

  return {
    openingProgress: () => loader.progressOf(opening.id),
  };
}
