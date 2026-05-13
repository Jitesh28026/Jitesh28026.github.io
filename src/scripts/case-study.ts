/**
 * Case-study page interactions. Ported from public/legacy/assets/case-study.js.
 *
 * 1. Scroll progress bar (top hairline)
 * 2. Scroll-triggered fade + stagger via IntersectionObserver
 * 3. Parallax drift on chapter-break headings
 * 4. Count-up animation on .outcome-num
 *
 * All animated behavior is gated on prefers-reduced-motion. Reduced-motion
 * users see static content with all reveals already shown.
 */

const prefersReducedMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---- Scroll progress bar ----------------------------------------------
const progressBar = document.querySelector<HTMLElement>('.scroll-progress');
const updateProgress = () => {
  if (!progressBar) return;
  const doc = document.documentElement;
  const scrolled = window.scrollY || doc.scrollTop || 0;
  const max = doc.scrollHeight - doc.clientHeight || 1;
  const pct = Math.max(0, Math.min(1, scrolled / max));
  progressBar.style.transform = `scaleX(${pct})`;
};
if (progressBar) {
  updateProgress();
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
}

// ---- Scroll-fade + scroll-stagger -------------------------------------
if (!('IntersectionObserver' in window)) {
  document
    .querySelectorAll<HTMLElement>('.scroll-fade, .scroll-stagger > *')
    .forEach((el) => el.classList.add('is-visible'));
} else {
  document.querySelectorAll<HTMLElement>('.scroll-stagger').forEach((parent) => {
    Array.from(parent.children).forEach((child, i) => {
      (child as HTMLElement).style.setProperty('--i', String(i));
    });
  });

  const fadeIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        fadeIO.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
  );

  document
    .querySelectorAll<HTMLElement>('.scroll-fade, .scroll-stagger')
    .forEach((el) => fadeIO.observe(el));
}

// ---- Chapter-break parallax -----------------------------------------
if (!prefersReducedMotion) {
  const chapters = Array.from(
    document.querySelectorAll<HTMLElement>('.chapter-break'),
  );
  if (chapters.length) {
    let ticking = false;
    const updateChapters = () => {
      const vh = window.innerHeight;
      chapters.forEach((block) => {
        const rect = block.getBoundingClientRect();
        const heading = block.querySelector<HTMLElement>('.chapter-inner');
        if (!heading) return;
        if (rect.bottom < 0 || rect.top > vh) return;
        let progress = (vh - rect.top) / (vh + rect.height);
        progress = Math.max(0, Math.min(1, progress));
        const offset = (progress - 0.5) * -60;
        heading.style.transform = `translate3d(0,${offset}px,0)`;
      });
      ticking = false;
    };
    const onChapterScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateChapters);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onChapterScroll, { passive: true });
    window.addEventListener('resize', onChapterScroll);
    updateChapters();
  }
}

// ---- Count-up on .outcome-num ----------------------------------------
type CountTarget = { value: number; suffix: string };

const parseTarget = (text: string): CountTarget | null => {
  const match = String(text).trim().match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
  if (!match) return null;
  return { value: parseFloat(match[1] ?? '0'), suffix: match[2] || '' };
};

const animateCount = (el: HTMLElement, target: CountTarget, duration: number) => {
  const start = performance.now();
  const startValue = 0;
  const frame = (now: number) => {
    const elapsed = now - start;
    const t = Math.min(1, elapsed / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    const current = startValue + (target.value - startValue) * eased;
    const rounded =
      target.value % 1 === 0
        ? String(Math.round(current))
        : current.toFixed(1);
    el.textContent = rounded + target.suffix;
    if (t < 1) {
      window.requestAnimationFrame(frame);
    } else {
      el.textContent = target.value + target.suffix;
    }
  };
  window.requestAnimationFrame(frame);
};

if (!prefersReducedMotion && 'IntersectionObserver' in window) {
  const counters = document.querySelectorAll<HTMLElement>('.outcome-num');
  if (counters.length) {
    const countIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const target = parseTarget(el.textContent || '');
          countIO.unobserve(el);
          if (!target || target.value === 0) return;
          animateCount(el, target, 1200);
        });
      },
      { threshold: 0.4 },
    );
    counters.forEach((el) => countIO.observe(el));
  }
}
