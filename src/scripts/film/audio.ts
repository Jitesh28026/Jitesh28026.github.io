/**
 * Soundtrack controller.
 *
 * Browsers refuse to start audio without a user gesture, which is why the
 * preloader ends on a button rather than dissolving on its own: the click that
 * opens the door is also the gesture that unlocks sound.
 *
 * The track file is NOT in the repo. Drop it at the path below and it plays;
 * if it is missing every method is a no-op and the film runs silent, so a
 * missing file can never break the page.
 */

export const TRACK_SRC = '/audio/in-the-moment.mp3';

/** Ceiling volume. A soundtrack under a portfolio should sit well back. */
const TARGET_VOLUME = 0.45;
/** Fade duration in ms, long enough to feel like a room you walked into. */
const FADE_MS = 2200;

export class Soundtrack {
  private el: HTMLAudioElement | null = null;
  private fadeHandle = 0;
  private available = false;

  constructor(private readonly src: string = TRACK_SRC) {}

  /**
   * Attach the element and find out whether the file actually exists.
   *
   * Resolves either way. `available` decides whether the sound toggle is shown
   * at all, so a silent build simply hides the control instead of offering a
   * button that does nothing.
   */
  init(): Promise<boolean> {
    const el = new Audio();
    el.src = this.src;
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    this.el = el;

    return new Promise((resolve) => {
      const ok = () => {
        this.available = true;
        cleanup();
        resolve(true);
      };
      const fail = () => {
        this.available = false;
        cleanup();
        resolve(false);
      };
      const cleanup = () => {
        el.removeEventListener('canplaythrough', ok);
        el.removeEventListener('loadeddata', ok);
        el.removeEventListener('error', fail);
      };
      el.addEventListener('canplaythrough', ok, { once: true });
      el.addEventListener('loadeddata', ok, { once: true });
      el.addEventListener('error', fail, { once: true });
    });
  }

  isAvailable(): boolean {
    return this.available;
  }

  isPlaying(): boolean {
    return !!this.el && !this.el.paused;
  }

  /** Start playing and fade up. Must be called from inside a user gesture. */
  async play(): Promise<void> {
    if (!this.el || !this.available) return;
    try {
      await this.el.play();
      this.fadeTo(TARGET_VOLUME);
    } catch {
      // Autoplay still refused, e.g. the gesture was not trusted. Staying
      // silent is an acceptable outcome; the film does not depend on sound.
    }
  }

  /** Fade down, then pause once silent. */
  pause(): void {
    if (!this.el) return;
    this.fadeTo(0, () => this.el?.pause());
  }

  toggle(): void {
    if (this.isPlaying()) this.pause();
    else void this.play();
  }

  /**
   * Linear volume ramp on rAF.
   *
   * Not Web Audio: a GainNode would be smoother but needs an AudioContext that
   * carries its own autoplay unlock rules, and this is a single looping bed,
   * not a mix.
   */
  private fadeTo(target: number, done?: () => void): void {
    if (!this.el) return;
    cancelAnimationFrame(this.fadeHandle);

    const el = this.el;
    const start = el.volume;
    const delta = target - start;
    if (Math.abs(delta) < 0.001) {
      done?.();
      return;
    }
    const t0 = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / FADE_MS);
      el.volume = Math.max(0, Math.min(1, start + delta * t));
      if (t < 1) {
        this.fadeHandle = requestAnimationFrame(step);
      } else {
        done?.();
      }
    };
    this.fadeHandle = requestAnimationFrame(step);
  }
}
