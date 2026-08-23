/**
 * Ship System test choreography (Phase 5).
 * Demonstrates: assembled -> separated -> independent -> reassembled,
 * using the 7 real pieces. Scatter offsets are % of the square stage, so
 * the motion scales responsively. Respects prefers-reduced-motion.
 */
import gsap from 'gsap';

const stage = document.querySelector<HTMLElement>('[data-ship]');
if (stage) {
  const reduce =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // id -> [dx%, dy%, rotationDeg]
  const SCATTER: Record<string, [number, number, number]> = {
    flag: [-16, -20, -14],
    'vertical-piece': [-26, -2, -7],
    'middle-top': [6, -24, 7],
    'middle-bottom': [-10, 20, -6],
    'right-piece': [26, 8, 10],
    body: [2, 26, 0],
    waves: [0, 15, 0],
  };

  const px = (pct: number) => (pct / 100) * stage.getBoundingClientRect().width;
  const pieces = Array.from(stage.querySelectorAll<HTMLElement>('[data-piece]'));

  function separate(): void {
    pieces.forEach((el, i) => {
      const id = el.dataset.piece as string;
      const [dx, dy, rot] = SCATTER[id] ?? [0, 0, 0];
      gsap.to(el, {
        x: px(dx),
        y: px(dy),
        rotation: rot,
        duration: reduce ? 0 : 1,
        ease: 'power3.inOut',
        delay: reduce ? 0 : i * 0.04,
      });
    });
  }

  function reassemble(): void {
    pieces.forEach((el, i) => {
      gsap.to(el, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: reduce ? 0 : 1.1,
        ease: 'power3.inOut',
        delay: reduce ? 0 : i * 0.03,
      });
    });
  }

  document.querySelector('[data-separate]')?.addEventListener('click', separate);
  document.querySelector('[data-reassemble]')?.addEventListener('click', reassemble);

  const ref = document.querySelector<HTMLElement>('[data-ref]');
  document.querySelector('[data-toggle-ref]')?.addEventListener('click', () => {
    if (ref) ref.hidden = !ref.hidden;
  });
}

export {};
