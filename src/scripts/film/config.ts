/**
 * Scene configuration for the scroll-scrub film.
 *
 * This is the single place to tune the journey. Everything else — the loader,
 * the scrubber, the reduced-motion fallback — reads from here.
 */

/**
 * Every scene shares these dimensions.
 *
 * Clip 1 was 1080p and the rest 720p; the extraction script normalises them
 * all to 1280x720 so the canvas never has to resize mid-journey. That matters
 * for the loop seam later: scene 6 cross-fades straight back into scene 1, and
 * a dimension change there would pop.
 */
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;

/**
 * Scroll distance for a full-length scene, in viewport heights.
 *
 * Higher = the scene takes longer to scrub through. This is the main pacing
 * dial; per-scene deviations go in `scrollFactor` below.
 */
export const BASE_SCROLL_VH = 320;

export interface SceneConfig {
  /** 1-based, matches public/frames/sceneN/ */
  id: number;
  /** Story beat, for debugging and the crawler fallback. */
  name: string;
  /** Folder of numbered WebP frames, served from public/. */
  path: string;
  /** How many frames the folder actually contains. */
  frameCount: number;
  /**
   * Multiplier on BASE_SCROLL_VH.
   *
   * Frames-per-scroll-pixel is what the eye reads as smooth, so a scene with
   * fewer frames needs proportionally less scroll to feel identical.
   */
  scrollFactor: number;
}

export const SCENES: SceneConfig[] = [
  { id: 1, name: 'Weeknight baseline', path: '/frames/scene1', frameCount: 144, scrollFactor: 1 },
  { id: 2, name: 'Party',              path: '/frames/scene2', frameCount: 144, scrollFactor: 1 },
  { id: 3, name: 'After-party',        path: '/frames/scene3', frameCount: 144, scrollFactor: 1 },
  { id: 4, name: 'The split',          path: '/frames/scene4', frameCount: 144, scrollFactor: 1 },
  { id: 5, name: 'Bed-rot',            path: '/frames/scene5', frameCount: 144, scrollFactor: 1 },
  // Scene 6's source clip is 4s rather than 8s, so it yields 96 frames instead
  // of 144. It is NOT decimated during extraction — it keeps every frame — and
  // takes 96/144 of the scroll distance so its scrub density matches the rest.
  { id: 6, name: 'Working till sunrise', path: '/frames/scene6', frameCount: 96, scrollFactor: 96 / 144 },
];

/** Zero-padded frame URL: /frames/scene3/0042.webp */
export function frameUrl(scene: SceneConfig, index: number): string {
  return `${scene.path}/${String(index + 1).padStart(4, '0')}.webp`;
}

/** Poster frame used for the reduced-motion fallback. */
export function posterUrl(scene: SceneConfig): string {
  return frameUrl(scene, Math.floor(scene.frameCount / 2));
}

/**
 * Mobile loads every Nth frame instead of the full sequence — roughly halves
 * both memory and network for a scrub that is still comfortably smooth on a
 * small screen.
 */
export const MOBILE_FRAME_STEP = 2;
export const MOBILE_BREAKPOINT = 768;
