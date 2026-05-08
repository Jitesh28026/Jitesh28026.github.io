// Case-study page interactions:
// 1. Scroll progress bar (top hairline)
// 2. Scroll-triggered fade + stagger via IntersectionObserver
// 3. Parallax drift on chapter-break headings
// 4. Count-up animation on .outcome-num
//
// All visual changes are scoped to (prefers-reduced-motion: no-preference)
// in CSS. Reduced-motion users just see static content.

(function () {
  'use strict';

  var prefersReducedMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Scroll progress bar ----------------------------------------------
  var progressBar = document.querySelector('.scroll-progress');
  function updateProgress() {
    if (!progressBar) return;
    var doc = document.documentElement;
    var scrolled = window.scrollY || doc.scrollTop || 0;
    var max = (doc.scrollHeight - doc.clientHeight) || 1;
    var pct = Math.max(0, Math.min(1, scrolled / max));
    progressBar.style.transform = 'scaleX(' + pct + ')';
  }
  if (progressBar) {
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  // ---- Scroll-fade + scroll-stagger -------------------------------------
  if (!('IntersectionObserver' in window)) {
    document
      .querySelectorAll('.scroll-fade, .scroll-stagger > *')
      .forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    document.querySelectorAll('.scroll-stagger').forEach(function (parent) {
      Array.prototype.slice.call(parent.children).forEach(function (child, i) {
        child.style.setProperty('--i', i);
      });
    });

    var fadeIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        fadeIO.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    document
      .querySelectorAll('.scroll-fade, .scroll-stagger')
      .forEach(function (el) { fadeIO.observe(el); });
  }

  // ---- Chapter-break parallax (heading drifts up at half speed) --------
  if (!prefersReducedMotion) {
    var chapters = Array.prototype.slice.call(
      document.querySelectorAll('.chapter-break')
    );
    if (chapters.length) {
      var ticking = false;
      function updateChapters() {
        var vh = window.innerHeight;
        chapters.forEach(function (block) {
          var rect = block.getBoundingClientRect();
          var heading = block.querySelector('.chapter-inner');
          if (!heading) return;
          // Only run while the block is on screen.
          if (rect.bottom < 0 || rect.top > vh) return;
          // Progress: 0 when block enters bottom, 1 when it exits top.
          var progress = (vh - rect.top) / (vh + rect.height);
          progress = Math.max(0, Math.min(1, progress));
          // Drift heading up by ~40px across the full pass.
          var offset = (progress - 0.5) * -60;
          heading.style.transform = 'translate3d(0,' + offset + 'px,0)';
        });
        ticking = false;
      }
      function onChapterScroll() {
        if (!ticking) {
          window.requestAnimationFrame(updateChapters);
          ticking = true;
        }
      }
      window.addEventListener('scroll', onChapterScroll, { passive: true });
      window.addEventListener('resize', onChapterScroll);
      updateChapters();
    }
  }

  // ---- Count-up on .outcome-num ----------------------------------------
  function parseTarget(text) {
    var match = String(text).trim().match(/^(-?\d+(?:\.\d+)?)\s*(.*)$/);
    if (!match) return null;
    return { value: parseFloat(match[1]), suffix: match[2] || '' };
  }

  function animateCount(el, target, duration) {
    var start = performance.now();
    var startValue = 0;
    function frame(now) {
      var elapsed = now - start;
      var t = Math.min(1, elapsed / duration);
      // ease-out cubic
      var eased = 1 - Math.pow(1 - t, 3);
      var current = startValue + (target.value - startValue) * eased;
      var rounded = (target.value % 1 === 0)
        ? Math.round(current)
        : current.toFixed(1);
      el.textContent = rounded + target.suffix;
      if (t < 1) window.requestAnimationFrame(frame);
      else el.textContent = target.value + target.suffix;
    }
    window.requestAnimationFrame(frame);
  }

  if (!prefersReducedMotion && 'IntersectionObserver' in window) {
    var counters = document.querySelectorAll('.outcome-num');
    if (counters.length) {
      var countIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          var target = parseTarget(el.textContent);
          countIO.unobserve(el);
          if (!target || target.value === 0) return; // skip 0
          animateCount(el, target, 1200);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countIO.observe(el); });
    }
  }
})();
