/**
 * Updates any [data-live-clock] element with the current Bengaluru (IST,
 * UTC+5:30) wall time as "HH:MM", ticking every second. Used in the About
 * meta-row LOC line, the closing line, and (once swapped in) the homepage
 * hero meta panel — so the "where I am right now" signal is honest instead
 * of a hardcoded atmospheric number.
 */

const els = document.querySelectorAll<HTMLElement>('[data-live-clock]');

if (els.length) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const tick = () => {
    const now = fmt.format(new Date());
    els.forEach((el) => {
      if (el.textContent !== now) el.textContent = now;
    });
  };

  tick();
  // Align the next update with the start of the next minute so the clock
  // visibly ticks on minute boundaries, then settle into a 1s cadence so a
  // single visible tick can never miss its window by drift.
  const msToNextMinute = 60_000 - (Date.now() % 60_000);
  window.setTimeout(() => {
    tick();
    window.setInterval(tick, 1000);
  }, msToNextMinute);
}

export {};
