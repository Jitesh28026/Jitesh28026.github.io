/**
 * Frame sequence loader.
 *
 * Two hard constraints shape this:
 *
 *  1. MEMORY. A decoded 1280x720 frame is ~3.7MB (w * h * 4 bytes). A full
 *     144-frame scene is therefore ~530MB decoded, and holding two scenes at
 *     once is over a gigabyte — enough to kill the tab outright. So only ONE
 *     scene is ever fully resident; neighbours are warmed through the HTTP
 *     cache instead of being decoded and retained.
 *
 *  2. TIME TO FIRST PAINT. Waiting for a whole sequence before painting leaves
 *     the canvas black for seconds. Frames are published into the array as
 *     they arrive and the scene is paintable as soon as the first one lands;
 *     `frameAt` falls back to the nearest frame that has actually loaded.
 */

import {
  MOBILE_BREAKPOINT,
  MOBILE_FRAME_STEP,
  SCENES,
  frameUrl,
  type SceneConfig,
} from './config';

type SceneFrames = (HTMLImageElement | undefined)[];

/** Parallel image requests. Enough to saturate the connection, not enough to thrash decode. */
const CONCURRENCY = 8;

export class FrameLoader {
  /** Decoded frames, per scene id. Only the active scene is kept. */
  private frames = new Map<number, SceneFrames>();
  /** Scenes whose load is in flight, with a flag the loop checks to bail out. */
  private jobs = new Map<number, { cancelled: boolean }>();
  private readonly step: number;

  constructor() {
    // Fixed at construction: changing mid-journey would leave resident scenes
    // indexed on a different step than newly loaded ones.
    this.step = window.innerWidth < MOBILE_BREAKPOINT ? MOBILE_FRAME_STEP : 1;
  }

  frameCountFor(scene: SceneConfig): number {
    return Math.ceil(scene.frameCount / this.step);
  }

  /** True once at least one frame of the scene is paintable. */
  isReady(sceneId: number): boolean {
    return this.frames.get(sceneId)?.some(Boolean) ?? false;
  }

  /** How much of a scene has arrived, 0..1. Useful for a loading indicator. */
  progressOf(sceneId: number): number {
    const loaded = this.frames.get(sceneId);
    if (!loaded || loaded.length === 0) return 0;
    let n = 0;
    for (const f of loaded) if (f) n++;
    return n / loaded.length;
  }

  /**
   * Nearest available frame to `progress` (0..1).
   *
   * Searches outward from the target index so a partially loaded scene still
   * scrubs — it just snaps to whichever neighbouring frame exists yet.
   */
  frameAt(scene: SceneConfig, progress: number): HTMLImageElement | undefined {
    const loaded = this.frames.get(scene.id);
    if (!loaded) return undefined;

    const last = loaded.length - 1;
    const target = Math.round(clamp(progress, 0, 1) * last);
    if (loaded[target]) return loaded[target];

    for (let offset = 1; offset <= last; offset++) {
      const before = loaded[target - offset];
      if (before) return before;
      const after = loaded[target + offset];
      if (after) return after;
    }
    return undefined;
  }

  /**
   * Make `activeId` the resident scene and release every other.
   *
   * The next scene is only prefetched — its bytes are pulled into the HTTP
   * cache without decoding or retaining them — so entering it is fast without
   * paying the memory cost of a second resident sequence.
   */
  update(activeId: number): void {
    for (const scene of SCENES) {
      if (scene.id !== activeId) this.release(scene.id);
    }
    const active = SCENES.find((s) => s.id === activeId);
    if (active) void this.load(active);

    const next = SCENES.find((s) => s.id === activeId + 1);
    if (next) this.prefetch(next);
  }

  /**
   * Decode just the opening frame of a scene.
   *
   * Lets the canvas fill almost immediately instead of staying black until the
   * whole sequence arrives. The frame is written into the scene's array, so
   * the full load picks it up rather than fetching it twice.
   */
  async firstFrame(scene: SceneConfig): Promise<HTMLImageElement> {
    const total = this.frameCountFor(scene);
    const images: SceneFrames = this.frames.get(scene.id) ?? new Array(total);
    this.frames.set(scene.id, images);

    if (images[0]) return images[0];
    const img = await decodeImage(frameUrl(scene, 0));
    images[0] = img;
    return img;
  }

  /** Load and retain a scene's frames. Idempotent. */
  load(scene: SceneConfig): Promise<void> {
    if (this.jobs.has(scene.id)) return Promise.resolve();

    const total = this.frameCountFor(scene);
    const images: SceneFrames = this.frames.get(scene.id) ?? new Array(total);
    this.frames.set(scene.id, images);

    const job = { cancelled: false };
    this.jobs.set(scene.id, job);

    // Fixed pool of workers pulling from a shared cursor, so at most
    // CONCURRENCY decodes are in flight regardless of sequence length.
    let cursor = 0;
    const worker = async (): Promise<void> => {
      while (!job.cancelled) {
        const i = cursor++;
        if (i >= total) return;
        if (images[i]) continue;
        try {
          const img = await decodeImage(frameUrl(scene, i * this.step));
          if (job.cancelled) return;
          images[i] = img;
        } catch {
          // A single dropped frame is survivable — frameAt falls back to a
          // neighbour. Losing the whole scene to one 404 is not.
        }
      }
    };

    return Promise.all(Array.from({ length: CONCURRENCY }, worker))
      .then(() => undefined)
      .finally(() => {
        if (this.jobs.get(scene.id) === job) this.jobs.delete(scene.id);
      });
  }

  /**
   * Warm the HTTP cache without decoding or retaining.
   *
   * `<link rel=prefetch>` rather than `new Image()` on purpose: it fetches at
   * low priority and does NOT hold a decoded bitmap, which is the whole point.
   */
  private prefetch(scene: SceneConfig): void {
    if (this.prefetched.has(scene.id)) return;
    this.prefetched.add(scene.id);

    const total = this.frameCountFor(scene);
    for (let i = 0; i < total; i++) {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'image';
      link.href = frameUrl(scene, i * this.step);
      document.head.appendChild(link);
    }
  }
  private prefetched = new Set<number>();

  /** Drop a scene's frames so the browser can reclaim the decoded bitmaps. */
  private release(sceneId: number): void {
    const job = this.jobs.get(sceneId);
    if (job) {
      job.cancelled = true;
      this.jobs.delete(sceneId);
    }
    this.frames.delete(sceneId);
  }
}

function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img
      .decode()
      .then(() => resolve(img))
      // Some browsers reject decode() for images that still paint fine;
      // fall back to the load event rather than dropping the frame.
      .catch(() => {
        img.onload = () => resolve(img);
        img.onerror = reject;
      });
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
