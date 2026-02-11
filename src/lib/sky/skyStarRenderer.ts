import { Star } from './skyStars';
import { createStarField } from './skyStars';
import { clamp01, mixColor, smoothstep } from './skyUtils';

/* --------------------------------------------------
   Types
-------------------------------------------------- */

type StarEx = Star & {
  rgb: [number, number, number];
  radius: number;
  intensity: number;
  extinction: number;
  phase: number;
  glowPhase: number;
};

/* --------------------------------------------------
   State
-------------------------------------------------- */

let starData: StarEx[] = [];
let starFieldW = 0;
let starFieldH = 0;

let starLayerCanvas: HTMLCanvasElement | null = null;
let starLayerCtx: CanvasRenderingContext2D | null = null;

let twinkleIndices: number[] = [];

type SpriteKey = string;
const starSprites = new Map<SpriteKey, HTMLCanvasElement>();

/* --------------------------------------------------
   Star color temperature
-------------------------------------------------- */

const sampleStarColor = (r01: number): [number, number, number] => {
  if (r01 < 0.1) {
    return mixColor([1.0, 0.7, 0.4], [1.0, 0.82, 0.65], r01 / 0.1);
  } else if (r01 < 0.7) {
    const t = (r01 - 0.1) / 0.6;
    return mixColor([1.0, 0.92, 0.75], [0.98, 0.98, 0.95], t);
  } else {
    const t = (r01 - 0.7) / 0.3;
    return mixColor([0.92, 0.95, 1.0], [0.8, 0.88, 1.0], t);
  }
};

/* --------------------------------------------------
   Star sprite generation
-------------------------------------------------- */

const getStarSprite = (
  radius: number,
  rgb: [number, number, number],
  hasGlow: boolean,
  glowStrength: number = 1
) => {
  const rBucket = Math.round(radius * 10) / 10;
  const cBucket = `${Math.round(rgb[0] * 10)}${Math.round(rgb[1] * 10)}${Math.round(rgb[2] * 10)}`;
  const gBucket = hasGlow ? `g${Math.round(glowStrength * 10)}` : 'g0';
  const key: SpriteKey = `${rBucket}_${cBucket}_${gBucket}`;

  const cached = starSprites.get(key);
  if (cached) return cached;

  const size = 6;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2;
  const cy = size / 2;

  // ---- HARD PINPOINT CORE (1 pixel) ----
  ctx.fillStyle = `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},1)`;
  ctx.fillRect(cx - 0.5, cy - 0.5, 1, 1);

  // ---- SOFT ATMOSPHERIC GLOW ----
  if (hasGlow) {
    const glow = ctx.createRadialGradient(cx, cy, 1.2, cx, cy, size * 0.6);

    const g0 = 0.028 * glowStrength; // was 0.018
const g1 = 0.012 * glowStrength; // was 0.007

    glow.addColorStop(0, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},${g0})`);
    glow.addColorStop(0.25, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},${g1})`);
    glow.addColorStop(1, `rgba(${rgb.map(v => Math.round(v * 255)).join(',')},0)`);

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, size, size);
  }

  starSprites.set(key, canvas);
  return canvas;
};

/* --------------------------------------------------
   Atmospheric extinction
-------------------------------------------------- */

const starExtinction = (y: number, height: number) => {
  const alt = clamp01(1 - y / height);
  return 0.3 + 0.7 * Math.pow(alt, 1.2);
};

/* --------------------------------------------------
   Build static star field
-------------------------------------------------- */

export const ensureStarField = (width: number, height: number) => {
  if (
    starData.length &&
    width === starFieldW &&
    height === starFieldH &&
    starLayerCanvas
  ) return;

  const raw = createStarField(width, height);

  starData = raw.map((s) => {
    const base = clamp01(s.baseAlpha);
    const intensity = Math.pow(base, 1.8);
    const h = Math.abs((Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453) % 1);

    return {
      ...s,
      rgb: sampleStarColor(h),
      radius: Math.max(0.5, Math.min(2.0, s.size * 1.2)),
      intensity,
      extinction: starExtinction(s.y, height),
      phase: Math.random() * Math.PI * 2,
      glowPhase: Math.random() * Math.PI * 2
    };
  });

  starFieldW = width;
  starFieldH = height;

  starLayerCanvas = document.createElement('canvas');
  starLayerCanvas.width = width;
  starLayerCanvas.height = height;
  starLayerCtx = starLayerCanvas.getContext('2d');
  if (!starLayerCtx) return;

  starLayerCtx.clearRect(0, 0, width, height);
  starLayerCtx.globalCompositeOperation = 'lighter';
  starLayerCtx.imageSmoothingEnabled = false;

  for (const s of starData) {
    const a = clamp01(s.intensity * s.extinction) * 0.95;
    if (a < 0.002) continue;

    const sprite = getStarSprite(s.radius, s.rgb, s.intensity > 0.4, 1);
    const half = sprite.width / 2;

    starLayerCtx.globalAlpha = a;
    starLayerCtx.drawImage(sprite, s.x - half, s.y - half);
  }

  starLayerCtx.globalAlpha = 1;
  starLayerCtx.imageSmoothingEnabled = true;

  twinkleIndices = [];
  for (let i = 0; i < starData.length; i++) {
    if (Math.random() < 0.12 + starData[i].intensity * 0.12) {
      twinkleIndices.push(i);
    }
  }
};

/* --------------------------------------------------
   Draw stars
-------------------------------------------------- */

export const drawStars = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunElevation: number,
  cloudCover: number,
  time: number
) => {
  const cloudVisibility = Math.max(0, 1 - cloudCover * 1.2);

  const CIVIL = -6;
  const ASTRO = -18;

  if (sunElevation >= CIVIL || cloudVisibility < 0.01) return;

  ensureStarField(width, height);

  const nightFade = clamp01((CIVIL - sunElevation) / (CIVIL - ASTRO));
  const globalAlpha = nightFade * cloudVisibility;
  if (!starLayerCanvas || globalAlpha < 0.01) return;

  // ---------- BASE STAR LAYER ----------
  ctx.save();
  ctx.globalAlpha = globalAlpha;
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(starLayerCanvas, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();

  // ---------- TWINKLE + GLOW OVERLAY ----------
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.imageSmoothingEnabled = false;

  const timeSec = time * 0.001;
  const cloudTwinkleSuppression = smoothstep(0.2, 0.8, cloudCover);

  for (const idx of twinkleIndices) {
    const s = starData[idx];
    const baseA = clamp01(s.intensity * s.extinction) * 0.95;
    if (baseA < 0.002) continue;

    const altitude = clamp01(1 - s.y / height);
    const scint = smoothstep(0.0, 0.6, 1 - altitude);

    const t1 = Math.sin(timeSec * 1.2 + s.phase) * 0.3 * scint;
    const t2 = Math.sin(timeSec * 3.1 + s.phase * 1.7) * 0.25 * scint;
    const t3 = Math.sin(timeSec * 6.7 + s.phase * 2.3) * s.intensity * 0.2 * scint;

    const twinkleBoost =
      Math.max(0, t1 + t2 + t3) * (1 - cloudTwinkleSuppression);

    const glowTwinkle =
      s.intensity > 0.82
        ? clamp01(Math.sqrt(twinkleBoost) * 0.85)
        : 0;

    const glowLag =
      1 + Math.sin(timeSec * 0.8 + s.glowPhase) * glowTwinkle * 0.3;

    const a = clamp01(baseA * (1 + twinkleBoost) * globalAlpha);
    if (a < 0.002) continue;

    if (s.intensity > 0.6) {
      const chroma = 1 + Math.sin(timeSec * 5.2 + s.phase) * 0.015;
      ctx.filter = `brightness(${chroma})`;
    }

    const sprite = getStarSprite(
      s.radius,
      s.rgb,
      s.intensity > 0.4,
      1 + glowTwinkle * glowLag
    );

    const half = sprite.width / 2;
    ctx.globalAlpha = a;
    ctx.drawImage(sprite, s.x - half, s.y - half);

    if (s.intensity > 0.9 && glowTwinkle > 0.2) {
      ctx.globalAlpha = a * 0.35;
      ctx.filter = 'blur(1px)';
      ctx.drawImage(sprite, s.x - half, s.y - half);
      ctx.filter = 'none';
    }

    ctx.filter = 'none';
  }

  ctx.imageSmoothingEnabled = true;
  ctx.restore();
};
