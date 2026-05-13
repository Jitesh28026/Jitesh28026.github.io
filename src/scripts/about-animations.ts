/**
 * About-page micro-animations:
 *
 * 1. [data-reveal-words] heading — split into per-word spans, fade-up each
 *    word with a small stagger when the heading enters viewport.
 * 2. [data-stagger-children] container — sets a --stagger CSS variable on
 *    each child so the CSS animation-delay cascades. Triggered the same way.
 * 3. .aim-lab-reveal — bigger translate than the default .reveal; class is
 *    already on the element via about.astro, the CSS handles the rest.
 *
 * All gated on prefers-reduced-motion via about.css; this script just sets
 * up DOM + observers.
 */

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// 1. Split heading text into word spans
const splitWords = (el: HTMLElement) => {
  if (el.dataset.wordsReady) return;
  const fragment = document.createDocumentFragment();
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      text.split(/(\s+)/).forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.appendChild(document.createTextNode(part));
          return;
        }
        const span = document.createElement('span');
        span.className = 'word';
        span.textContent = part;
        fragment.appendChild(span);
      });
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      // Recurse into child elements (e.g., <span class="muted">) so words
      // inside them get the same treatment but the wrapping element stays.
      const childEl = node as HTMLElement;
      const wrapper = childEl.cloneNode(false) as HTMLElement;
      childEl.childNodes.forEach((inner) => {
        if (inner.nodeType === Node.TEXT_NODE) {
          (inner.textContent ?? '').split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) {
              wrapper.appendChild(document.createTextNode(part));
              return;
            }
            const span = document.createElement('span');
            span.className = 'word';
            span.textContent = part;
            wrapper.appendChild(span);
          });
        } else {
          wrapper.appendChild(inner.cloneNode(true));
        }
      });
      fragment.appendChild(wrapper);
    }
  });
  el.textContent = '';
  el.appendChild(fragment);
  // Assign stagger index to each word
  el.querySelectorAll<HTMLElement>('.word').forEach((w, i) => {
    w.style.setProperty('--word-index', String(i));
  });
  el.dataset.wordsReady = '1';
};

// 2. Apply --stagger to children of a [data-stagger-children] container
const indexChildren = (container: HTMLElement) => {
  Array.from(container.children).forEach((child, i) => {
    (child as HTMLElement).style.setProperty('--stagger', String(i));
  });
};

// Pre-index everything so the page is ready before the observer fires
document.querySelectorAll<HTMLElement>('[data-reveal-words]').forEach(splitWords);
document.querySelectorAll<HTMLElement>('[data-stagger-children]').forEach(indexChildren);

// 3. Observer — adds .is-revealed when an animated container enters view
if (!reducedMotion && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-revealed');
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.2 },
  );

  document
    .querySelectorAll<HTMLElement>('[data-reveal-words], [data-stagger-children]')
    .forEach((el) => io.observe(el));
} else {
  // Reduced-motion: just show everything immediately
  document
    .querySelectorAll<HTMLElement>('[data-reveal-words], [data-stagger-children]')
    .forEach((el) => el.classList.add('is-revealed'));
}

export {};
