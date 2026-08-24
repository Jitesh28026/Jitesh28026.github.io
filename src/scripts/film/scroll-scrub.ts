/**
 * Scroll-scrub engine.
 *
 * One full-screen <canvas> is painted with the frame matching scroll position.
 * Deliberately NOT a <video> with currentTime seeking — that stutters badly on
 * mobile Safari, which is the whole reason for the frame-sequence approach.
 *
 * Layout note: rather than pinning six separate canvases, there is a single
 * `position: fixed` canvas with six tall spacer sections scrolling past it.
 * Visually identical to pinning, but it avoids pin-spacer reflow and the
 * flicker that shows up at hand-off between two pinned sections.
 */

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { FrameLoader } from './frame-loader';
import { CANVAS_HEIGHT, CANVAS_WIDTH, SCENES, type SceneConfig } from './config';

gsap.registerPlugin(ScrollTrigger);

export function initScrollScrub(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) return;

  const loader = new FrameLoader();

  // Dev-only introspection hook, stripped from production builds.
  const debug = {
    updates: 0,
    triggers: 0,
    ready: () => SCENES.map((s) => loader.isReady(s.id)),
    loader,
    toggles: [] as string[],
    // Runs one paint step synchronously. Needed for automated checks, where
    // the page may not be compositing and requestAnimationFrame never fires.
    paintNow: () => {
      if (pending && pending !== painted) {
        paint(pending);
        painted = pending;
        return true;
      }
      return false;
    },
    ScrollTrigger,
    dump: () =>
      ScrollTrigger.getAll().map((t) => ({
        start: Math.round(t.start),
        end: Math.round(t.end),
        progress: +t.progress.toFixed(3),
        isActive: t.isActive,
        scroller: t.scroller === window ? 'window' : String((t.scroller as Element)?.tagName),
      })),
  };
  if (import.meta.env.DEV) (window as unknown as Record<string, unknown>).__film = debug;

  /** Frame queued for the next animation frame, if it changed. */
  let pending: HTMLImageElement | undefined;
  /** What is currently on the canvas, so we skip redundant repaints. */
  let painted: HTMLImageElement | undefined;

  // --- Canvas sizing ------------------------------------------------------

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // cap: 3x costs a lot for no visible gain
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    // Force a repaint of whatever frame is showing at the new size.
    if (painted) {
      pending = painted;
      painted = undefined;
    }
  }

  // --- Painting -----------------------------------------------------------

  /** Cover-fit: fill the viewport, crop the overflowing axis, never distort. */
  function paint(img: HTMLImageElement): void {
    const scale = Math.max(canvas.width / CANVAS_WIDTH, canvas.height / CANVAS_HEIGHT);
    const w = CANVAS_WIDTH * scale;
    const h = CANVAS_HEIGHT * scale;
    ctx!.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  }

  // Painting happens on rAF rather than inside ScrollTrigger's onUpdate, so a
  // burst of scroll events collapses into at most one draw per frame.
  function tick(): void {
    if (pending && pending !== painted) {
      paint(pending);
      painted = pending;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  // --- Scroll wiring ------------------------------------------------------

  function wireScene(scene: SceneConfig, section: HTMLElement): void {
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      // scrub keeps the frame index tied to scroll position rather than
      // animating toward it on its own clock.
      scrub: true,
      onUpdate: (self) => {
        if (import.meta.env.DEV) debug.updates++;
        const frame = loader.frameAt(scene, self.progress);
        // If the scene has not finished loading, hold the last painted frame
        // instead of flashing an empty canvas.
        if (frame) pending = frame;
      },
      onToggle: (self) => {
        if (import.meta.env.DEV) {
          debug.toggles.push(`${scene.id}:${self.isActive}`);
          if (debug.toggles.length > 20) debug.toggles.shift();
        }
        if (self.isActive) loader.update(scene.id);
      },
    });
  }

  SCENES.forEach((scene) => {
    const section = document.querySelector<HTMLElement>(`[data-scene="${scene.id}"]`);
    if (!section) {
      console.warn(`[film] no section for scene ${scene.id}`);
      return;
    }
    wireScene(scene, section);
    if (import.meta.env.DEV) debug.triggers++;
  });

  // --- Boot ---------------------------------------------------------------

  resize();
  window.addEventListener('resize', () => {
    resize();
    ScrollTrigger.refresh();
  });

  // The journey always begins at scene 1.
  //
  // Two-step boot: paint the opening frame as soon as that single image
  // decodes, so the canvas fills almost immediately, then bring in the rest of
  // the sequence behind it. Waiting on all 144 frames before the first paint
  // left the viewer staring at an empty canvas for seconds.
  void loader.firstFrame(SCENES[0]).then((img) => {
    if (!painted) pending = img;
  });

  void loader.load(SCENES[0]).then(() => {
    loader.update(1);
    ScrollTrigger.refresh();
  });
}
