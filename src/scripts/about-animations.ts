/**
 * After Hours — About page interactions.
 *
 *  1. Long-exhale reveal      [data-exhale]
 *  2. Quiet chip stagger      [data-stagger-quiet]
 *  3. Headlights              [data-headlights]            CSS-only fallback
 *  4. Idle state              [data-idle-cursor]
 *  5. Timestamp drift         [data-timestamps]
 *  6. Inner voice             .ah-paragraph[data-inner-voice]
 *  7. Lenis smooth scroll     (page-level, only on /about)
 *  8. Scroll progress         exposed on window.__ahScroll for the WebGL canvas
 *  9. Heading char parallax   per-glyph z-depth waved by cursor position
 * 10. Drive arc odometer      [data-drive-arc]             scroll-tied clock
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

/* ---------- 3. Headlights ------------------------------------------------ */

const headlights = document.querySelector<HTMLElement>('[data-headlights]');

if (headlights && finePointer && !reducedMotion) {
  let tx = window.innerWidth / 2;
  let ty = window.innerHeight / 2;
  let x = tx;
  let y = ty;
  let raf = 0;
  let lastMove = performance.now();

  const onMove = (e: PointerEvent) => {
    tx = e.clientX;
    ty = e.clientY;
    lastMove = performance.now();
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

  /* ---------- 4. Idle state ---------------------------------------------- */
  // Shares pointer-move detection with the headlights so we don't bind twice.
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

/* ---------- 5. Timestamp drift ------------------------------------------ */

const timestampLayer = document.querySelector<HTMLElement>('[data-timestamps]');

if (timestampLayer && !reducedMotion && finePointer) {
  const notes = [
    '01:47',
    '02:13',
    '03:08',
    '2am, still',
    'after the meeting',
    'before the deck',
    'on the bus home',
    'between iterations',
    'one more pass',
  ];

  let spawnTimer = 0;
  const spawn = () => {
    const note = document.createElement('span');
    note.className = 'ah-timestamp';
    note.textContent = notes[Math.floor(Math.random() * notes.length)];
    // Keep clear of the centre column where copy lives — bias to the gutters.
    const side = Math.random() < 0.5 ? 'left' : 'right';
    const lateral = 4 + Math.random() * 16;
    if (side === 'left') note.style.left = `${lateral}%`;
    else note.style.right = `${lateral}%`;
    note.style.top = `${15 + Math.random() * 60}%`;
    timestampLayer.appendChild(note);
    window.setTimeout(() => note.remove(), 6000);

    spawnTimer = window.setTimeout(spawn, 9000 + Math.random() * 5000);
  };

  // First note shows up after the page settles.
  spawnTimer = window.setTimeout(spawn, 4200);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) window.clearTimeout(spawnTimer);
    else spawnTimer = window.setTimeout(spawn, 6000);
  });
}

/* ---------- 6. Inner voice ----------------------------------------------- */

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

/* ---------- 7. Lenis smooth scroll -------------------------------------- */
// Lenis is now initialized globally in src/scripts/smooth-scroll.ts so the
// homepage and case studies share the same butter scroll. Nothing to do
// here — the global instance owns wheel events on /about too.

/* ---------- 8. Scroll progress tracking --------------------------------- */

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

/* ---------- 9. Heading per-char parallax --------------------------------- */

if (finePointer && !reducedMotion) {
  const heading = document.querySelector<HTMLElement>('.ah-heading');
  if (heading) {
    // Split into words first (each <span class="ah-word"> stays nowrap),
    // then split each word into chars inside it. Browser can break BETWEEN
    // words but never mid-word, so "systems." never loses its trailing 's'.
    const splitText = (text: string, into: HTMLElement) => {
      const parts = text.split(/(\s+)/);
      for (const part of parts) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          into.appendChild(document.createTextNode(part));
          continue;
        }
        const word = document.createElement('span');
        word.className = 'ah-word';
        for (const ch of part) {
          const span = document.createElement('span');
          span.className = 'ah-char';
          span.textContent = ch;
          word.appendChild(span);
        }
        into.appendChild(word);
      }
    };
    const splitInto = (el: HTMLElement) => {
      const out = document.createDocumentFragment();
      el.childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const holder = document.createElement('span');
          splitText(node.textContent ?? '', holder);
          while (holder.firstChild) out.appendChild(holder.firstChild);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const child = node as HTMLElement;
          const wrapper = child.cloneNode(false) as HTMLElement;
          child.childNodes.forEach((inner) => {
            if (inner.nodeType === Node.TEXT_NODE) {
              splitText(inner.textContent ?? '', wrapper);
            } else {
              wrapper.appendChild(inner.cloneNode(true));
            }
          });
          out.appendChild(wrapper);
        }
      });
      el.textContent = '';
      el.appendChild(out);
    };
    splitInto(heading);
    heading.classList.add('is-split');

    const chars = Array.from(heading.querySelectorAll<HTMLElement>('.ah-char'));
    let rects: Array<{ el: HTMLElement; cx: number; cy: number }> = [];
    const measure = () => {
      rects = chars.map((el) => {
        const r = el.getBoundingClientRect();
        return { el, cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
      });
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', () => { measure(); }, { passive: true });

    // Damped cursor for the heading wave — without lerping the raw pointer,
    // the chars snap with each mouse event and the wave looks twitchy.
    const lp = { x: pointer.x, y: pointer.y };
    const SIGMA = 200;        // radius of influence (px)
    const PEAK = 24;          // max translateZ (px)
    const TILT = 4;           // max rotateX (deg)
    let raf = 0;
    const loop = () => {
      lp.x += (pointer.x - lp.x) * 0.08;
      lp.y += (pointer.y - lp.y) * 0.08;
      for (const r of rects) {
        const dx = lp.x - r.cx;
        const dy = lp.y - r.cy;
        const d2 = dx * dx + dy * dy;
        const w = Math.exp(-d2 / (SIGMA * SIGMA));
        const z = PEAK * w;
        const tx = TILT * w * Math.sign(dx) * -0.4;
        const ty = TILT * w * Math.sign(dy) * 0.4;
        r.el.style.transform = `translate3d(0,0,${z}px) rotateX(${ty}deg) rotateY(${tx}deg)`;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(loop);
    });
  }
}

/* ---------- 10. Layered parallax system --------------------------------- */
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

/* ---------- 11. Drive arc odometer -------------------------------------- */

(() => {
  const arc = document.querySelector<HTMLElement>('[data-drive-arc]');
  if (!arc) return;
  const fill = arc.querySelector<HTMLElement>('.ah-arc-fill');
  const time = arc.querySelector<HTMLElement>('.ah-arc-time');
  if (!fill || !time) return;

  // 01:47 target — total of 107 minutes scaled by scroll progress.
  const TOTAL_MIN = 107;
  let raf = 0;
  const tick = () => {
    const p = window.__ahScroll?.p ?? 0;
    fill.style.transform = `scaleY(${p})`;
    // Fade arc in once user starts scrolling the section.
    arc.style.opacity = String(Math.min(1, p * 6));
    const mins = Math.round(TOTAL_MIN * p);
    const hh = Math.floor(mins / 60).toString().padStart(2, '0');
    const mm = (mins % 60).toString().padStart(2, '0');
    time.textContent = `${hh}:${mm}`;
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else raf = requestAnimationFrame(tick);
  });
})();

export {};
