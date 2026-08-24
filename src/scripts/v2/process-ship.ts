/**
 * Phase 8 (v1): scroll-driven ship choreography through the Process section.
 * The sticky ship deconstructs as you scroll into the section and reassembles
 * as you approach the end. Progress-driven via rAF; no animation library.
 * Bails out on reduced-motion and small screens (ship stays assembled/hidden).
 */
const wrap = document.querySelector<HTMLElement>('[data-proc-scroll]');
const shipHost = document.querySelector<HTMLElement>('[data-proc-ship]');
const ship = shipHost?.querySelector<HTMLElement>('[data-ship]') ?? null;

if (wrap && ship) {
  const reduce =
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // id -> [dx%, dy%, rotationDeg] fully-spread offset (% of ship stage width).
  // Up/outward so nothing sinks below the waterline (mask1 stays on).
  const SPREAD: Record<string, [number, number, number]> = {
    flag: [-26, -24, -12],
    'vertical-piece': [-34, -6, -8],
    'middle-top': [10, -32, 8],
    'middle-bottom': [-20, -14, -6],
    'right-piece': [32, -16, 10],
    body: [0, -20, 0],
    waves: [0, 22, 0],
  };

  const pieces = Array.from(ship.querySelectorAll<HTMLElement>('[data-piece]'));

  const smoothstep = (a: number, b: number, x: number): number => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };

  let ticking = false;

  const apply = (spread: number): void => {
    ship.classList.toggle('is-separated', spread > 0.02);
    const w = ship.getBoundingClientRect().width || 1;
    for (const el of pieces) {
      const [dx, dy, rot] = SPREAD[el.dataset.piece as string] ?? [0, 0, 0];
      const x = ((dx / 100) * w * spread).toFixed(2);
      const y = ((dy / 100) * w * spread).toFixed(2);
      el.style.transform = `translate(${x}px, ${y}px) rotate(${(rot * spread).toFixed(2)}deg)`;
    }
  };

  const update = (): void => {
    ticking = false;
    const r = wrap.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = r.height - vh;
    const p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
    // assemble (0..0.12) -> deconstruct (..0.4) -> hold -> reassemble (0.72..0.95)
    const spread = smoothstep(0.12, 0.4, p) - smoothstep(0.72, 0.95, p);
    apply(Math.max(0, spread));
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
