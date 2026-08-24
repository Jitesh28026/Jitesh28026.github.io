/**
 * Scroll-velocity kinetic marquee. Base drift + a boost/skew driven by how
 * fast you're scrolling, with the velocity decaying back to the base drift.
 * Two identical groups in the track make the wrap seamless. No dependency.
 */
const track = document.querySelector<HTMLElement>('[data-kinetic-track]');

if (track) {
  const reduce =
    !!window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce) {
    const groups = track.querySelectorAll<HTMLElement>('.kinetic-group');

    let single = 0;
    const measure = () => {
      single = groups[0] ? groups[0].offsetWidth : 0;
    };
    measure();
    window.addEventListener('resize', measure);

    let x = 0;
    const base = -0.55; // px/frame idle drift (leftward)
    let vel = 0;
    let lastScroll = window.scrollY || window.pageYOffset || 0;

    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY || window.pageYOffset || 0;
        vel += y - lastScroll;
        lastScroll = y;
      },
      { passive: true }
    );

    const tick = () => {
      vel *= 0.88; // decay
      x += base + vel * 0.22;
      if (single > 0) {
        while (x <= -single) x += single;
        while (x > 0) x -= single;
      }
      const skew = Math.max(-9, Math.min(9, vel * 0.06));
      track.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0) skewX(${skew.toFixed(2)}deg)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

export {};
