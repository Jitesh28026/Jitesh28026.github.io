/**
 * Frame sequence loader.
 *
 * Holds decoded frames for a small window of scenes and throws the rest away.
 * All six sequences at once would be ~34MB of WebP and well over 1GB decoded,
 * which mobile Safari will not tolerate — so the rule is: keep the scene the
 * viewer is in, prefetch the one they are heading into, release everything
 * else.
 */

import {
  MOBILE_BREAKPOINT,
  MOBILE_FRAME_STEP,
  SCENES,
  frameUrl,
  type SceneConfig,
} from './config';

type SceneFrames = (HTMLImageElement | undefined)[];

/** How many scenes either side of the active one stay resident. */
const KEEP_RADIUS = 1;

export class FrameLoader {
  private frames = new Map<number, SceneFrames>();
  private loading = new Map<number, Promise<void>>();
  /**
   * Scenes the current window wants resident.
   *
   * Checked again when a load finishes: a scene can drift out of the window
   * while its frames are still in flight, and without this it would quietly
   * land in memory after its own release and sit there until the next update.
   */
  private wanted = new Set<number>();
  private readonly step: number;

  constructor() {
    // Decided once at construction: a mid-journey change would leave the
    // resident scenes indexed on a different step than new ones.
    this.step = window.innerWidth < MOBILE_BREAKPOINT ? MOBILE_FRAME_STEP : 1;
  }

  /** Number of frames actually loaded for a scene, after the mobile step. */
  frameCountFor(scene: SceneConfig): number {
    return Math.ceil(scene.frameCount / this.step);
  }

  /** True once a scene's frames are decoded and paintable. */
  isReady(sceneId: number): boolean {
    return this.frames.has(sceneId);
  }

  /**
   * Frame nearest to `progress` (0..1) through the scene, or undefined if the
   * scene has not loaded yet — the caller keeps the previous frame on screen
   * rather than flashing empty.
   */
  frameAt(scene: SceneConfig, progress: number): HTMLImageElement | undefined {
    const loaded = this.frames.get(scene.id);
    if (!loaded) return undefined;
    const last = loaded.length - 1;
    const index = Math.round(clamp(progress, 0, 1) * last);
    const exact = loaded[index];
    if (exact) return exact;

    // Frame missing (a failed decode). Walk outward for the nearest one that
    // loaded, so a gap reads as a held frame rather than a blank canvas.
    for (let offset = 1; offset <= last; offset++) {
      const before = loaded[index - offset];
      if (before) return before;
      const after = loaded[index + offset];
      if (after) return after;
    }
    return undefined;
  }

  /**
   * Make `activeId` resident, prefetch its neighbours, release the rest.
   * Safe to call on every scroll tick — in-flight and resident scenes are
   * skipped.
   */
  update(activeId: number): void {
    this.wanted = new Set(
      SCENES.filter((s) => Math.abs(s.id - activeId) <= KEEP_RADIUS).map((s) => s.id),
    );
    for (const scene of SCENES) {
      if (this.wanted.has(scene.id)) {
        void this.load(scene);
      } else {
        this.release(scene.id);
      }
    }
  }

  /**
   * Decode just the opening frame of a scene.
   *
   * Boot paints this the moment it lands, so the canvas fills after one ~50KB
   * image rather than waiting on all 144 frames of scene 1.
   */
  firstFrame(scene: SceneConfig): Promise<HTMLImageElement> {
    return decodeImage(frameUrl(scene, 0));
  }

  /** Load a scene's frames. Idempotent. */
  load(scene: SceneConfig): Promise<void> {
    this.wanted.add(scene.id);
    const existing = this.loading.get(scene.id);
    if (existing) return existing;
    if (this.frames.has(scene.id)) return Promise.resolve();

    const total = this.frameCountFor(scene);
    const images: SceneFrames = new Array(total);

    // allSettled, not all: a single unreadable frame must not take the scene
    // down with it. Gaps are tolerated — frameAt() falls back to the nearest
    // frame that did load.
    const job = Promise.allSettled(
      Array.from({ length: total }, (_, i) => {
        const sourceIndex = i * this.step;
        return decodeImage(frameUrl(scene, sourceIndex)).then((img) => {
          images[i] = img;
        });
      }),
    )
      .then((results) => {
        const failed = results.filter((r) => r.status === 'rejected').length;
        if (failed === total) {
          console.warn(`[film] scene ${scene.id}: every frame failed to load`);
          return;
        }
        if (failed > 0) {
          console.warn(`[film] scene ${scene.id}: ${failed}/${total} frames missing`);
        }
        // The viewer may have scrolled away while this was in flight; if the
        // scene is no longer wanted, drop it rather than banking the memory.
        if (!this.wanted.has(scene.id)) return;
        this.frames.set(scene.id, images);
      })
      .finally(() => {
        this.loading.delete(scene.id);
      });

    this.loading.set(scene.id, job);
    return job;
  }

  /** Drop a scene's frames so the browser can reclaim the decoded bitmaps. */
  private release(sceneId: number): void {
    if (!this.frames.has(sceneId)) return;
    this.frames.delete(sceneId);
  }
}

/**
 * Resolve only once the bitmap is actually decoded.
 *
 * `img.decode()` matters here: without it the first paint of each frame does
 * the decode work synchronously inside the scroll handler, which is exactly
 * the stutter this whole canvas approach exists to avoid.
 */
function decodeImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img
      .decode()
      .then(() => resolve(img))
      .catch(() => {
        // Some browsers reject decode() for images that still paint fine, so
        // fall back to load events rather than dropping the frame.
        //
        // The `complete` check is essential: if decode() rejects AFTER the
        // image already finished loading, the load event has been and gone,
        // and attaching onload here would wait forever — hanging the whole
        // scene, since one pending frame blocks the sequence.
        if (img.complete) {
          if (img.naturalWidth > 0) resolve(img);
          else reject(new Error(`failed to load ${src}`));
          return;
        }
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`failed to load ${src}`));
      });
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
