/**
 * Scene 1 TV light.
 *
 * The television in the weeknight scene is drawn dark for the first quarter of
 * the clip and then switches on. This adds the LIGHT it should be throwing:
 * a soft cool glow on the screen plus a wider spill into the room. It does not
 * attempt to put a picture on the screen. The brief rules that out for the
 * phone and monitor, and the same reasoning applies here, the panel sits at an
 * angle and the camera dollies past it, so real content would need a tracked
 * perspective warp.
 *
 * SCROLL DRIVEN, NOT TIME DRIVEN. Every value below is a pure function of
 * scroll progress, so the flicker is identical every time you pass through the
 * same point and freezes when the viewer stops. Nothing here runs on a clock.
 *
 * All coordinates are in source frame space (1280x720) and are mapped into
 * canvas space by the caller, so they survive any viewport size.
 */

/** Cool TV white, deliberately against the warm amber of the lamp. */
const TV_RGB = '150, 196, 226';

/**
 * Where the screen sits as the camera dollies in, measured off the frames.
 *
 * `p` is progress through scene 1, `x`/`y` the screen centre and `r` roughly
 * its half width. The TV drifts right and grows, then slides off the right
 * edge of frame entirely.
 */
interface TvKey {
  p: number;
  x: number;
  y: number;
  r: number;
}

const TV_PATH: TvKey[] = [
  { p: 0.0, x: 1113, y: 297, r: 58 },
  { p: 0.161, x: 1154, y: 302, r: 76 },
  { p: 0.329, x: 1200, y: 310, r: 84 },
  { p: 0.497, x: 1232, y: 286, r: 86 },
  { p: 0.664, x: 1262, y: 270, r: 88 },
];

/**
 * Screen brightness envelope, measured rather than guessed.
 *
 * Mean luma of the screen region sits around 37 through frame 26 and reaches
 * 101 by frame 30, so the set switches on across progress 0.175 to 0.203.
 * After roughly 0.50 the panel is sliding out of frame, and the glow fades
 * with it so no light is left hanging over empty wall.
 */
function envelope(p: number): number {
  const ON_START = 0.175;
  const ON_END = 0.205;
  const OUT_START = 0.5;
  const OUT_END = 0.68;

  if (p < ON_START) return 0;
  if (p < ON_END) return smoothstep((p - ON_START) / (ON_END - ON_START));
  if (p < OUT_START) return 1;
  if (p < OUT_END) return 1 - smoothstep((p - OUT_START) / (OUT_END - OUT_START));
  return 0;
}

/**
 * Flicker, as a deterministic function of scroll position.
 *
 * Two incommensurate sine terms give an irregular pulse that never repeats
 * visibly, without any randomness, so scrubbing backwards reproduces exactly
 * the same light. Kept shallow: a television across a dim room modulates the
 * ambient level, it does not strobe.
 */
function flicker(p: number): number {
  const a = Math.sin(p * 190.0);
  const b = Math.sin(p * 71.3 + 1.7);
  return 0.86 + 0.14 * (a * 0.6 + b * 0.4);
}

/**
 * Paint the TV light for a given progress through scene 1.
 *
 * `toCanvas` maps a point in frame space to canvas space and `scale` converts
 * a frame space length, both supplied by the caller so this stays independent
 * of how the frame is fitted.
 */
export function drawTvGlow(
  ctx: CanvasRenderingContext2D,
  progress: number,
  toCanvas: (x: number, y: number) => [number, number],
  scale: number,
): void {
  const strength = envelope(progress);
  if (strength <= 0) return;

  const key = sampleTvPath(progress);
  const [cx, cy] = toCanvas(key.x, key.y);
  const intensity = strength * flicker(progress);

  // 'screen' rather than 'lighter': it lifts the dark panel convincingly
  // without clipping to white where the glow overlaps the lamp spill.
  const previous = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'screen';

  // The panel itself.
  const face = key.r * scale * 1.15;
  const faceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, face);
  faceGrad.addColorStop(0, `rgba(${TV_RGB}, ${0.5 * intensity})`);
  faceGrad.addColorStop(0.55, `rgba(${TV_RGB}, ${0.26 * intensity})`);
  faceGrad.addColorStop(1, `rgba(${TV_RGB}, 0)`);
  ctx.fillStyle = faceGrad;
  ctx.fillRect(cx - face, cy - face, face * 2, face * 2);

  // Spill into the room. Much wider and much fainter, which is what actually
  // sells it as a light source rather than a bright rectangle.
  const spill = key.r * scale * 4.2;
  const spillGrad = ctx.createRadialGradient(cx, cy, face * 0.5, cx, cy, spill);
  spillGrad.addColorStop(0, `rgba(${TV_RGB}, ${0.14 * intensity})`);
  spillGrad.addColorStop(1, `rgba(${TV_RGB}, 0)`);
  ctx.fillStyle = spillGrad;
  ctx.fillRect(cx - spill, cy - spill, spill * 2, spill * 2);

  ctx.globalCompositeOperation = previous;
}

/** Linear interpolation along TV_PATH, clamped at both ends. */
function sampleTvPath(p: number): TvKey {
  const first = TV_PATH[0];
  const last = TV_PATH[TV_PATH.length - 1];
  if (p <= first.p) return first;
  if (p >= last.p) return last;

  for (let i = 1; i < TV_PATH.length; i++) {
    const a = TV_PATH[i - 1];
    const b = TV_PATH[i];
    if (p <= b.p) {
      const t = (p - a.p) / (b.p - a.p);
      return {
        p,
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        r: a.r + (b.r - a.r) * t,
      };
    }
  }
  return last;
}

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}
