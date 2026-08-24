/**
 * Phase 8: scroll-driven ship choreography through the Process section.
 * Timeline (progress p over the section):
 *   dismantle  — pieces fan out toward the step list (left, staggered down)
 *   reassemble — pieces return to the ship
 *   invert     — the reassembled ship flips horizontally (bow swaps sides)
 * Ends as the mirrored ship, matching the reference. rAF driven, no gsap.
 * Bails to a static assembled ship on reduced-motion / small screens.
 */
const wrap = document.querySelector<HTMLElement>('[data-proc-scroll]');
const shipHost = document.querySelector<HTMLElement>('[data-proc-ship]');
const ship = shipHost?.querySelector<HTMLElement>('[data-ship]') ?? null;

if (wrap && ship) {
  const reduce =
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // id -> [dx%, dy%, rotationDeg]: where the piece travels when fully
  // dismantled. Fanned left toward the step column, staggered down the list so
  // each piece roughly lines up with its step (flag=01 at top ... waves=06).
  const SPREAD: Record<string, [number, number, number]> = {
    flag: [-56, -30, -10],
    'vertical-piece': [-60, -12, -8],
    'middle-top': [-52, 6, 7],
    'middle-bottom': [-56, 24, -6],
    'right-piece': [-48, 40, 10],
    body: [-38, 52, 0],
    waves: [-30, 58, 4],
  };

  const pieces = Array.from(ship.querySelectorAll<HTMLElement>('[data-piece]'));

  const smoothstep = (a: number, b: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  let ticking = false;

  const apply = (spread: number, flip: number): void => {
    ship.classList.toggle('is-dismantled', spread > 0.02);
    const w = ship.getBoundingClientRect().width || 1;
    for (const el of pieces) {
      const [dx, dy, rot] = SPREAD[el.dataset.piece as string] ?? [0, 0, 0];
      const x = ((dx / 100) * w * spread).toFixed(2);
      const y = ((dy / 100) * w * spread).toFixed(2);
      el.style.transform = `translate(${x}px, ${y}px) rotate(${(rot * spread).toFixed(2)}deg)`;
    }
    // flip the whole ship once it's back together (bow swaps side)
    ship.style.transform = `scaleX(${flip.toFixed(3)})`;
  };

  const update = (): void => {
    ticking = false;
    const r = wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = r.height - vh;
    const p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
    // dismantle (0.08..0.42) -> hold -> reassemble (0.58..0.80) -> flip (0.80..0.95)
    const spread = smoothstep(0.08, 0.42, p) - smoothstep(0.58, 0.8, p);
    const flip = 1 - 2 * smoothstep(0.8, 0.95, p);
    apply(Math.max(0, spread), flip);
  };

  const onScroll = (): void => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  };

  const enabled = () => !reduce && window.innerWidth > 860;

  if (enabled()) {
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();
  }
}

export {};
