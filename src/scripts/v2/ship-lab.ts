/**
 * Ship System test choreography (Phase 5).
 * assembled -> separated -> independent -> reassembled, using the 7 real
 * pieces. Driven by CSS transitions (no animation library) — each piece is
 * moved by setting its transform; the transition on .ship-piece animates it.
 * Scatter offsets are % of the square stage, so motion scales responsively.
 * Respects prefers-reduced-motion (transition disabled in CSS).
 */
const stage = document.querySelector<HTMLElement>('[data-ship]');
if (stage) {
  const reduce =
    !!window.matchMedia &&
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
      el.style.transitionDelay = reduce ? '0s' : `${i * 40}ms`;
      el.style.transform = `translate(${px(dx)}px, ${px(dy)}px) rotate(${rot}deg)`;
    });
  }

  function reassemble(): void {
    pieces.forEach((el, i) => {
      el.style.transitionDelay = reduce ? '0s' : `${i * 30}ms`;
      el.style.transform = 'translate(0px, 0px) rotate(0deg)';
    });
  }

  document.querySelector('[data-separate]')?.addEventListener('click', separate);
  document.querySelector('[data-reassemble]')?.addEventListener('click', reassemble);

  const labStage = document.querySelector<HTMLElement>('[data-stage]');
  document.querySelector('[data-toggle-ref]')?.addEventListener('click', () => {
    labStage?.classList.toggle('show-ref');
  });
}

export {};
