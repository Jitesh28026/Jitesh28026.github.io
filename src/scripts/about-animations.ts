/**
 * After Hours — About page interactions.
 *
 *  1. Long-exhale reveal      [data-exhale]
 *  2. Quiet chip stagger      [data-stagger-quiet]
 *  3. Idle state              [data-idle-cursor]                STATE meta row
 *  4. Inner voice             .ah-paragraph[data-inner-voice]
 *  5. Scroll progress         exposed on window.__ahScroll for the WebGL canvas
 *  6. Layered parallax        cursor head-tracking + per-element drift
 *
 * Headlight cursor lives globally in src/scripts/headlights.ts so it follows
 * the visitor across every page, not just /about.
 */

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
const canHover = window.matchMedia?.('(hover: hover)').matches ?? false;

// Cursor in screen coords — shared across the heading parallax + others below.
const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
window.addEventListener(
  'pointermove',
  (e) => { pointer.x = e.clientX; pointer.y = e.clientY; },
  { passive: true },
);

// Scroll progress shared with the WebGL canvas. 0 = section just entered,
// 1 = section bottom reached the viewport bottom. Clamped.
declare global {
  interface Window {
    __ahScroll?: { p: number; v: number };
  }
}
window.__ahScroll = { p: 0, v: 0 };

/* ---------- 1 & 2. Exhale + quiet stagger -------------------------------- */

document.querySelectorAll<HTMLElement>('[data-stagger-quiet]').forEach((container) => {
  Array.from(container.children).forEach((child, i) => {
    (child as HTMLElement).style.setProperty('--stagger', String(i));
  });
});

if ('IntersectionObserver' in window) {
  const exhaleIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target as HTMLElement;
        const delay = Number(el.dataset.exhaleDelay ?? 0);
        window.setTimeout(() => el.classList.add('is-exhaled'), delay);
        exhaleIO.unobserve(el);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -8% 0px' },
  );
  document.querySelectorAll<HTMLElement>('[data-exhale]').forEach((el) => exhaleIO.observe(el));

  const staggerIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        staggerIO.unobserve(entry.target);
      });
    },
    { threshold: 0.2 },
  );
  document.querySelectorAll<HTMLElement>('[data-stagger-quiet]').forEach((el) => staggerIO.observe(el));
} else {
  document.querySelectorAll<HTMLElement>('[data-exhale]').forEach((el) => el.classList.add('is-exhaled'));
  document.querySelectorAll<HTMLElement>('[data-stagger-quiet]').forEach((el) => el.classList.add('is-revealed'));
}

/* ---------- 3. Idle state (STATE meta row rotates after inactivity) ----- */
// Headlights themselves are wired globally in src/scripts/headlights.ts so
// they follow the cursor on every page. Only the idle-state copy below is
// /about-specific — STATE only renders inside the After Hours meta-rows.

if (finePointer && !reducedMotion) {
  const idleStates = ['thinking', 'remembering', 'still here', 'drafting', 'listening'];
  const idleEls = document.querySelectorAll<HTMLElement>('[data-idle-state]');

  if (idleEls.length) {
    let idleTimer = 0;
    let rotateTimer = 0;
    let isIdle = false;

    const setState = (txt: string) => {
      idleEls.forEach((el) => { el.textContent = txt; });
    };

    const enterIdle = () => {
      if (isIdle) return;
      isIdle = true;
      let i = 0;
      const tick = () => {
        i = (i + 1) % idleStates.length;
        setState(idleStates[i]);
        rotateTimer = window.setTimeout(tick, 3800);
      };
      rotateTimer = window.setTimeout(tick, 3800);
    };

    const exitIdle = () => {
      if (!isIdle) return;
      isIdle = false;
      window.clearTimeout(rotateTimer);
      setState('thinking');
    };

    const arm = () => {
      window.clearTimeout(idleTimer);
      exitIdle();
      idleTimer = window.setTimeout(enterIdle, 5000);
    };

    window.addEventListener('pointermove', arm, { passive: true });
    arm();
  }
}

/* ---------- 4. Inner voice ---------------------------------------------- */

if (canHover && !reducedMotion) {
  const HOLD_MS = 500;
  document.querySelectorAll<HTMLElement>('.ah-paragraph[data-inner-voice]').forEach((p) => {
    let holdTimer = 0;

    const onEnter = () => {
      window.clearTimeout(holdTimer);
      holdTimer = window.setTimeout(() => p.classList.add('is-voicing'), HOLD_MS);
    };
    const onLeave = () => {
      window.clearTimeout(holdTimer);
      p.classList.remove('is-voicing');
    };

    p.addEventListener('pointerenter', onEnter);
    p.addEventListener('pointerleave', onLeave);
  });
}

/* ---------- 6. Scroll progress tracking --------------------------------- */

(() => {
  const section = document.querySelector<HTMLElement>('.after-hours');
  if (!section) return;

  let last = window.scrollY;
  let raf = 0;
  const tick = () => {
    const rect = section.getBoundingClientRect();
    const vh = window.innerHeight;
    // Progress = 0 when section top hits viewport top,
    //          = 1 when section bottom hits viewport bottom.
    const total = rect.height - vh;
    const scrolled = -rect.top;
    const p = total > 0 ? Math.max(0, Math.min(1, scrolled / total)) : 0;

    const v = Math.min(Math.abs(window.scrollY - last) / 40, 1);
    last = window.scrollY;

    if (window.__ahScroll) {
      // Smooth p slightly for the scene; v decays
      window.__ahScroll.p += (p - window.__ahScroll.p) * 0.15;
      window.__ahScroll.v += (v - window.__ahScroll.v) * 0.2;
      window.__ahScroll.v *= 0.92;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
})();

/* ---------- 7. Layered parallax system ---------------------------------- */
/*
 * Three depth layers reacting to two inputs:
 *
 *   INPUT          ELEMENTS                          DEPTH BEHAVIOR
 *   cursor         .ah-container                     content shifts opposite to cursor (head-tracking)
 *   cursor         .ah-portrait-col                  portrait drifts WITH cursor (closer = bigger move)
 *   scroll prog    .ah-heading                       heading sticks slightly (drifts down)
 *   scroll prog    .ah-portrait-col                  portrait rises faster (parallax up)
 *   scroll prog    .aim-lab                          rises into place as it enters viewport
 *
 * The cumulative effect: every layer has its own depth plane. As you scroll
 * and move the cursor, the whole section breathes in 3D.
 */

if (finePointer && !reducedMotion) {
  const container = document.querySelector<HTMLElement>('.after-hours .ah-container');
  const heading = document.querySelector<HTMLElement>('.ah-heading');
  const portrait = document.querySelector<HTMLElement>('.ah-portrait-col');
  const aimLab = document.querySelector<HTMLElement>('.aim-lab');
  const aimLabCopy = document.querySelector<HTMLElement>('.aim-lab-copy');
  const aimLabPanel = document.querySelector<HTMLElement>('.aim-lab-panel');

  /*
   * Section-to-section parallax:
   *
   * Each element drifts proportionally to its distance from the viewport
   * center. Positive factor = element LAGS the scroll (feels closer to
   * camera, parallax-up effect). Negative factor = element LEADS the
   * scroll (feels deeper, drifts away faster).
   *
   * As you scroll from one block to the next, the blocks pass each other
   * at different speeds — that's the depth illusion.
   *
   * Body paragraphs use a tiny factor so reading isn't disrupted; non-text
   * elements (label, skills, closing, meta) can move more boldly.
   */
  type ParaTarget = { el: HTMLElement; factor: number };
  const collectParallax = (): ParaTarget[] => {
    const items: Array<[string, number]> = [
      ['.ah-label',                       0.12],
      ['.ah-text-col .ah-paragraph:nth-of-type(1)',  0.02],
      ['.ah-text-col .ah-paragraph:nth-of-type(2)', -0.02],
      ['.ah-text-col .ah-paragraph:nth-of-type(3)',  0.03],
      ['.ah-text-col .ah-paragraph:nth-of-type(4)', -0.01],
      ['.ah-meta',                        0.08],
      ['.ah-skills',                      0.09],
      ['.ah-closing',                     0.14],
      ['.aim-lab-copy',                   0.10],
      ['.aim-lab-panel',                 -0.06],
    ];
    const out: ParaTarget[] = [];
    for (const [sel, factor] of items) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el) out.push({ el, factor });
    }
    return out;
  };
  const paraTargets = collectParallax();

  // Center cursor for parallax — value is damped toward target each frame.
  const px = { tx: 0, ty: 0, x: 0, y: 0 };
  window.addEventListener(
    'pointermove',
    (e) => {
      px.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      px.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    },
    { passive: true },
  );

  let raf = 0;
  const tick = () => {
    // Lerp 0.09 — content drifts with cursor but stays close enough that
    // the head-tracking doesn't feel disconnected from the pointer.
    px.x += (px.tx - px.x) * 0.09;
    px.y += (px.ty - px.y) * 0.09;

    const p = window.__ahScroll?.p ?? 0;
    const vhHalf = window.innerHeight / 2;

    if (container) {
      // Opposite-direction head-tracking — the whole content is on a
      // flexible mount, drifts subtly against your cursor.
      container.style.transform = `translate3d(${-px.x * 6}px, ${-px.y * 4}px, 0)`;
    }
    if (heading) {
      // Heading sticks slightly + cursor-lifts.
      const dy = p * 28 + px.y * -3;
      const dx = px.x * 2;
      heading.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    }
    if (aimLab) {
      const aimRect = aimLab.getBoundingClientRect();
      const aimP = Math.max(0, Math.min(1, 1 - aimRect.top / window.innerHeight));
      const rise = (1 - aimP) * 60;
      aimLab.style.transform = `translate3d(0, ${rise}px, 0)`;
    }

    // Per-element section parallax. Each element drifts proportionally to
    // its distance from the viewport center.
    for (const t of paraTargets) {
      // Skip aim-lab copy/panel if their parent aim-lab is animating its own
      // entrance — let the entrance dominate.
      if ((t.el === aimLabCopy || t.el === aimLabPanel) && aimLab) {
        const aimRect = aimLab.getBoundingClientRect();
        const aimP = Math.max(0, Math.min(1, 1 - aimRect.top / window.innerHeight));
        if (aimP < 0.9) continue;
      }
      const rect = t.el.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2 - vhHalf;
      const dy = -centerY * t.factor;
      t.el.style.transform = `translate3d(0, ${dy.toFixed(2)}px, 0)`;
    }

    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
}

export {};
