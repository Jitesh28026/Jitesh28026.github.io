/**
 * Vanilla-tilt for the hero card stack. Lazy-loaded after first idle frame
 * and only attached on fine-pointer devices to avoid hijacking touch scroll.
 */

const isFinePointer = window.matchMedia?.('(pointer: fine)').matches;

if (isFinePointer) {
  const init = async () => {
    const VanillaTilt = (await import('vanilla-tilt')).default;
    const targets = document.querySelectorAll<HTMLElement>('[data-tilt]');
    if (targets.length) VanillaTilt.init(Array.from(targets));
  };

  const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => void })
    .requestIdleCallback;
  if (typeof ric === 'function') {
    ric(init);
  } else {
    window.setTimeout(init, 1500);
  }
}
