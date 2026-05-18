/**
 * Global smooth scroll via Lenis. Single instance attached to window so
 * other scripts (about-animations, etc.) can read it instead of double-
 * initializing.
 *
 * Tuned shorter than the About-page-only attempt — homepage / case studies
 * are denser, scan-heavy content, so 1.1s glide instead of 1.6s.
 *
 *  - Skipped on prefers-reduced-motion.
 *  - Intercepts a[href^="#"] anchor clicks → lenis.scrollTo.
 *  - On first paint, if window.location.hash is set (e.g. arriving on
 *    "/#work" from /about), scrolls to that target with Lenis instead of
 *    the browser's instant jump.
 */

import type Lenis from 'lenis';

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

if (!reducedMotion) {
  void (async () => {
    try {
      const LenisCtor = (await import('lenis')).default;
      const lenis = new LenisCtor({
        duration: 1.1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        wheelMultiplier: 0.9,
        touchMultiplier: 1.4,
        smoothWheel: true,
      });
      window.__lenis = lenis;

      const raf = (time: number) => {
        lenis.raf(time);
        requestAnimationFrame(raf);
      };
      requestAnimationFrame(raf);

      // Anchor-link interception. Runs after page-transitions.ts but its
      // hash-link handler returns early for hash anchors, so we own these.
      document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        const target = e.target as HTMLElement | null;
        const link = target?.closest?.('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || !href.startsWith('#') || href === '#') return;

        const id = href.slice(1);
        const dest = document.getElementById(id);
        if (!dest) return;

        e.preventDefault();
        lenis.scrollTo(dest, { offset: -80, duration: 1.3 });
        // Keep URL in sync without retriggering native scroll
        history.pushState(null, '', href);
      });

      // Handle arriving with an initial hash (e.g. "/#work" from another page).
      // Wait one frame so layout settles, then scroll-to with Lenis.
      if (window.location.hash && window.location.hash.length > 1) {
        const id = window.location.hash.slice(1);
        requestAnimationFrame(() => {
          const dest = document.getElementById(id);
          if (dest) lenis.scrollTo(dest, { offset: -80, immediate: false, duration: 1.4 });
        });
      }
    } catch (err) {
      console.warn('[smooth-scroll] lenis failed to load', err);
    }
  })();
}

export {};
