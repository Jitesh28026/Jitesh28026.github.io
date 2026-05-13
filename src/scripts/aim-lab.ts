/**
 * AIM LAB — a 15-second canvas-based aim trainer used as a playful interactive
 * element on the About page. Tracks score, accuracy, average reaction time,
 * and surfaces a verdict string.
 *
 * Imported by /about. No-ops on pages that don't have the #aimLab element.
 */

type Target = { x: number; y: number; radius: number };
type Burst = { x: number; y: number; start: number };

const ROUND_LENGTH_MS = 15_000;

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
  document.getElementById(id) as T | null;

const aimLab = $('aimLab');
const aimStage = $('aimStage');
const aimCanvas = $<HTMLCanvasElement>('aimCanvas');
const aimOverlay = $('aimOverlay');
const aimResults = $('aimResults');
const aimStartButton = $<HTMLButtonElement>('aimStartButton');
const aimReplayButton = $<HTMLButtonElement>('aimReplayButton');
const aimScoreEl = $('aimScore');
const aimTimeEl = $('aimTime');
const aimResultScore = $('aimResultScore');
const aimResultAccuracy = $('aimResultAccuracy');
const aimResultReaction = $('aimResultReaction');
const aimVerdict = $('aimVerdict');

if (
  aimLab &&
  aimStage &&
  aimCanvas &&
  aimOverlay &&
  aimResults &&
  aimStartButton &&
  aimReplayButton &&
  aimScoreEl &&
  aimTimeEl &&
  aimResultScore &&
  aimResultAccuracy &&
  aimResultReaction &&
  aimVerdict
) {
  const ctx = aimCanvas.getContext('2d');
  if (ctx) {
    let score = 0;
    let totalClicks = 0;
    let reactionTimes: number[] = [];
    let target: Target | null = null;
    let roundActive = false;
    let roundStart = 0;
    let targetSpawnedAt = 0;
    let rafId = 0;
    let burst: Burst | null = null;

    const resizeAimCanvas = () => {
      const rect = aimStage.getBoundingClientRect();
      const ratio = window.devicePixelRatio || 1;
      aimCanvas.width = Math.round(rect.width * ratio);
      aimCanvas.height = Math.round(rect.height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const randomBetween = (min: number, max: number) =>
      Math.random() * (max - min) + min;

    const spawnTarget = (now: number) => {
      const rect = aimStage.getBoundingClientRect();
      const radius = randomBetween(20, 30);
      target = {
        x: randomBetween(radius + 18, rect.width - radius - 18),
        y: randomBetween(radius + 52, rect.height - radius - 18),
        radius,
      };
      targetSpawnedAt = now;
    };

    const createBurst = (x: number, y: number) => {
      burst = { x, y, start: performance.now() };
    };

    const drawGrid = (width: number, height: number) => {
      ctx.save();
      ctx.strokeStyle = 'rgba(200, 169, 110, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 36) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(width, y + 0.5);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawTarget = (now: number) => {
      if (!target) return;
      const pulse = 1 + Math.sin(now / 140) * 0.06;
      const radius = target.radius * pulse;
      ctx.save();
      ctx.translate(target.x, target.y);

      ctx.strokeStyle = 'rgba(200, 169, 110, 0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(200, 169, 110, 0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, radius + 7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#c8a96e';
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(200, 169, 110, 0.5)';
      ctx.beginPath();
      ctx.moveTo(-radius - 12, 0);
      ctx.lineTo(radius + 12, 0);
      ctx.moveTo(0, -radius - 12);
      ctx.lineTo(0, radius + 12);
      ctx.stroke();
      ctx.restore();
    };

    const drawBurst = (now: number) => {
      if (!burst) return;
      const elapsed = now - burst.start;
      if (elapsed > 220) {
        burst = null;
        return;
      }
      const progress = elapsed / 220;
      const radius = 10 + progress * 26;
      ctx.save();
      ctx.translate(burst.x, burst.y);
      ctx.strokeStyle = `rgba(200, 169, 110, ${0.7 - progress * 0.7})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };

    const updateScoreboard = (timeLeftMs: number) => {
      aimScoreEl.textContent = String(score);
      aimTimeEl.textContent = Math.max(0, timeLeftMs / 1000).toFixed(1);
    };

    const verdictForReaction = (value: number, hasSamples: boolean) => {
      if (!hasSamples) return 'NEEDS WARMUP';
      if (value < 700) return 'VALORANT READY';
      if (value <= 1000) return 'SHARP';
      if (value <= 1300) return 'DECENT AIM';
      return 'NEEDS WARMUP';
    };

    const drawFrame = (now: number) => {
      const rect = aimStage.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      drawGrid(rect.width, rect.height);
      drawTarget(now);
      drawBurst(now);
    };

    const endRound = () => {
      roundActive = false;
      cancelAnimationFrame(rafId);
      const accuracy = totalClicks ? Math.round((score / totalClicks) * 100) : 0;
      const avgReaction = reactionTimes.length
        ? Math.round(
            reactionTimes.reduce((sum, time) => sum + time, 0) /
              reactionTimes.length,
          )
        : 0;

      aimResultScore.textContent = String(score);
      aimResultAccuracy.textContent = `${accuracy}%`;
      aimResultReaction.textContent = `${avgReaction}ms`;
      aimVerdict.textContent = verdictForReaction(
        avgReaction,
        reactionTimes.length > 0,
      );
      aimResults.hidden = false;
      aimOverlay.hidden = true;
      aimLab.dataset.state = 'results';
      target = null;
      drawFrame(performance.now());
    };

    const frame = (now: number) => {
      if (!roundActive) return;
      const elapsed = now - roundStart;
      const timeLeftMs = ROUND_LENGTH_MS - elapsed;
      updateScoreboard(timeLeftMs);
      drawFrame(now);

      if (timeLeftMs <= 0) {
        endRound();
        return;
      }

      rafId = window.requestAnimationFrame(frame);
    };

    const startRound = () => {
      resizeAimCanvas();
      score = 0;
      totalClicks = 0;
      reactionTimes = [];
      burst = null;
      roundActive = true;
      roundStart = performance.now();
      spawnTarget(roundStart);
      updateScoreboard(ROUND_LENGTH_MS);
      aimOverlay.hidden = true;
      aimResults.hidden = true;
      aimLab.dataset.state = 'live';
      rafId = window.requestAnimationFrame(frame);
    };

    const getPointerPosition = (event: MouseEvent) => {
      const rect = aimCanvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
    };

    aimStage.addEventListener('click', (event) => {
      if (!roundActive || !target) return;
      totalClicks += 1;
      const point = getPointerPosition(event);
      const distance = Math.hypot(point.x - target.x, point.y - target.y);

      if (distance <= target.radius) {
        score += 1;
        reactionTimes.push(performance.now() - targetSpawnedAt);
        createBurst(target.x, target.y);
        spawnTarget(performance.now());
      }
    });

    aimStartButton.addEventListener('click', startRound);
    aimReplayButton.addEventListener('click', startRound);
    window.addEventListener('resize', () => {
      resizeAimCanvas();
      drawFrame(performance.now());
    });

    resizeAimCanvas();
    updateScoreboard(ROUND_LENGTH_MS);
    drawFrame(performance.now());
  }
}
