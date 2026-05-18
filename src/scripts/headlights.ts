/**
 * Headlight cursor — a warm gold pool that follows the pointer site-wide.
 * The signature interaction of the After Hours register. Lives in BaseLayout
 * so every page inherits it. On /about, the WebGL fog scene (after-hours-canvas)
 * takes over once it loads and hides this CSS pool via .ah-webgl-on — same
 * interaction, finer rendering. Everywhere else, this is the real thing.
 */

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;

const headlights = document.querySelector<HTMLElement>('[data-headlights]');

if (headlights && finePointer && !reducedMotion) {
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let x = tx;
  let y = ty;
  let raf = 0;

  const onMove = (e: PointerEvent) => {
    tx = e.clientX;
    ty = e.clientY;
    if (!headlights.classList.contains('is-on')) headlights.classList.add('is-on');
  };

  const loop = () => {
    x += (tx - x) * 0.14;
    y += (ty - y) * 0.14;
    headlights.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    raf = requestAnimationFrame(loop);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  // Pointer left the window — fade out (still alone).
  window.addEventListener('pointerleave', () => headlights.classList.remove('is-on'));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(raf);
    } else {
      raf = requestAnimationFrame(loop);
    }
  });

  raf = requestAnimationFrame(loop);
}

export {};
