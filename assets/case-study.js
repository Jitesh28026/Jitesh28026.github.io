// Scroll-triggered fade/stagger for case study pages.
// Runs alongside CSS in @media (prefers-reduced-motion: no-preference);
// reduced-motion users see everything at full opacity (handled in CSS).
(function () {
  if (!('IntersectionObserver' in window)) {
    document
      .querySelectorAll('.scroll-fade, .scroll-stagger > *')
      .forEach(function (el) { el.classList.add('is-visible'); });
    return;
  }

  // Set --i on direct children of staggered grids so transition-delay
  // can be `calc(var(--i) * 70ms)` in CSS.
  document.querySelectorAll('.scroll-stagger').forEach(function (parent) {
    Array.prototype.slice.call(parent.children).forEach(function (child, i) {
      child.style.setProperty('--i', i);
    });
  });

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  document
    .querySelectorAll('.scroll-fade, .scroll-stagger')
    .forEach(function (el) { io.observe(el); });
})();
