/**
 * Hero status panel — live Bengaluru clock + typewriter cycling through
 * site-derived phrases. All phrases are drawn from copy already on the site
 * (hero, contact, footer) so this doesn't introduce new marketing voice.
 */

const PHRASES = [
  'I work on the hard things.',
  'open to new collaborations',
  'thakker.jitesh04@gmail.com',
  'made with overthinking and black coffee',
];

const TYPE_SPEED_MIN = 38;
const TYPE_SPEED_MAX = 78;
const DELETE_SPEED_MIN = 18;
const DELETE_SPEED_MAX = 36;
const HOLD_AFTER_TYPED_MS = 2200;
const PAUSE_BETWEEN_PHRASES_MS = 380;

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// ---- Live Bengaluru clock (IST) ----
const clockEl = document.getElementById('hero-clock');
const updateClock = () => {
  if (!clockEl) return;
  try {
    const time = new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    clockEl.textContent = `${time} IST`;
  } catch {
    clockEl.textContent = '— IST';
  }
};

if (clockEl) {
  updateClock();
  // Update every 15s — minute boundary is captured without polling every tick
  window.setInterval(updateClock, 15_000);
}

// ---- Typewriter ----
const typedEl = document.getElementById('hero-typed');

if (typedEl && PHRASES.length > 0) {
  if (reducedMotion) {
    // Reduced motion: show first phrase statically, skip animation
    typedEl.textContent = PHRASES[0] ?? '';
  } else {
    let phraseIndex = 0;
    let charIndex = 0;
    let deleting = false;

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const step = () => {
      const current = PHRASES[phraseIndex] ?? '';

      if (!deleting) {
        charIndex += 1;
        typedEl.textContent = current.slice(0, charIndex);
        if (charIndex >= current.length) {
          deleting = true;
          window.setTimeout(step, HOLD_AFTER_TYPED_MS);
          return;
        }
        window.setTimeout(step, rand(TYPE_SPEED_MIN, TYPE_SPEED_MAX));
      } else {
        charIndex -= 1;
        typedEl.textContent = current.slice(0, Math.max(0, charIndex));
        if (charIndex <= 0) {
          deleting = false;
          phraseIndex = (phraseIndex + 1) % PHRASES.length;
          window.setTimeout(step, PAUSE_BETWEEN_PHRASES_MS);
          return;
        }
        window.setTimeout(step, rand(DELETE_SPEED_MIN, DELETE_SPEED_MAX));
      }
    };

    step();
  }
}

export {};
