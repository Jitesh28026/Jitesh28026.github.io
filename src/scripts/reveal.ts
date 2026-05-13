/**
 * Scroll-reveal observer. Adds the `visible` class to any `.reveal` element
 * as it enters the viewport, with a small stagger so siblings cascade rather
 * than all popping in at once.
 *
 * Imported once via BaseLayout so it runs on every page. Safe to import
 * multiple times — the observer is created lazily and won't double-bind
 * because each element is `unobserve`d after its first intersection.
 */

const REVEAL_SELECTOR = '.reveal';
const VISIBLE_CLASS = 'visible';
const STAGGER_MS = 100;

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, idx) => {
      if (!entry.isIntersecting) return;
      window.setTimeout(() => {
        entry.target.classList.add(VISIBLE_CLASS);
      }, idx * STAGGER_MS);
      observer.unobserve(entry.target);
    });
  },
  { threshold: 0.1 },
);

const observeAll = () => {
  document
    .querySelectorAll<HTMLElement>(REVEAL_SELECTOR)
    .forEach((el) => observer.observe(el));
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeAll, { once: true });
} else {
  observeAll();
}
