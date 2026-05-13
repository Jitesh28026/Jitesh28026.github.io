/**
 * Cross-fade page transitions. Intercepts internal link clicks, adds
 * `body.is-leaving` (which triggers the CSS fade-out), then navigates after
 * 220ms so the fade has time to play. The new page's CSS pageFadeIn animation
 * runs on its own when it loads.
 *
 * Skipped when:
 *   - prefers-reduced-motion is set
 *   - user clicks with a modifier key (Cmd/Ctrl/Shift/Alt) — preserves
 *     "open in new tab" behavior
 *   - link is external, mailto:, target=_blank, or download
 *   - link is just an in-page anchor (#section)
 *
 * Back/forward cache (pageshow with e.persisted) clears is-leaving so a
 * cached page doesn't get stuck invisible.
 */

const reducedMotionForTransitions = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

if (!reducedMotionForTransitions) {
  document.addEventListener('click', (e) => {
    if (
      e.defaultPrevented ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0
    ) {
      return;
    }
    const target = e.target as HTMLElement | null;
    const link = target?.closest?.('a');
    if (!link) return;

    const href = link.getAttribute('href');
    if (!href) return;
    if (link.target === '_blank' || link.hasAttribute('download')) return;

    // Skip pure hash anchors (in-page scroll only)
    if (href.startsWith('#')) return;

    // Skip non-http schemes
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

    // Resolve to a full URL so we can compare it with the current location
    let destination: URL;
    try {
      destination = new URL(href, window.location.href);
    } catch {
      return;
    }

    // Skip cross-origin links
    if (destination.origin !== window.location.origin) return;

    // Skip same-page hash changes (e.g. clicking /#work while already on /).
    // The browser handles the scroll; intercepting would fade body to 0 and
    // then never actually navigate because the pathname didn't change.
    if (
      destination.pathname === window.location.pathname &&
      destination.search === window.location.search
    ) {
      return;
    }

    e.preventDefault();
    document.body.classList.add('is-leaving');
    window.setTimeout(() => {
      window.location.href = href;
    }, 220);

    // Safety: if navigation somehow doesn't fire (e.g., service worker
    // intercepts), clear is-leaving so the page isn't permanently invisible.
    window.setTimeout(() => {
      document.body.classList.remove('is-leaving');
    }, 1500);
  });

  // Clear leaving state if user comes back via bfcache
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) {
      document.body.classList.remove('is-leaving');
    }
  });
}

export {};
