/**
 * Sun disc and sprite rendering calculations
 * Handles sprite baking with disc, bloom, halo, and granulation
 */

import { toCssRgb, type Rgb } from './skyColor';
import { clamp01, lerp, mixColor } from './skyUtils';
import { SUN } from './sunConstants';

type Granule = { x: number; y: number; r: number; a: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// Deterministic hash for cheap pseudo-random (no allocations)
const hash01 = (n: number) => {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
};

// ----------------------------
// Granulation cache (bucketed by radius)
// ----------------------------
const granuleCache = new Map<number, Granule[]>();

export const getGranules = (radius: number) => {
  const bucket = Math.max(8, Math.round(radius / 6) * 6);
  const cached = granuleCache.get(bucket);
  if (cached) return cached;

  const count = clamp(Math.round(bucket * 1.4), 40, 160);
  const pts: Granule[] = [];

  for (let i = 0; i < count; i++) {
    const u = hash01(i * 12.9898 + bucket * 0.23);
    const v = hash01(i * 78.233 + bucket * 0.71);
    const a = u * Math.PI * 2;
    const rr = Math.sqrt(v) * bucket * 0.85;

    pts.push({
      x: Math.cos(a) * rr,
      y: Math.sin(a) * rr,
      r: lerp(bucket * 0.008, bucket * 0.028, hash01(i * 3.11 + 1.7)),
      a: lerp(0.012, 0.045, hash01(i * 5.23 + 9.1))
    });
  }

  granuleCache.set(bucket, pts);
  return pts;
};

// ----------------------------
// Cached Path2D for circular clip areas (bucketed by radius)
// ----------------------------
const clipPathCache = new Map<string, Path2D>();

export const getDiscClipPath = (rx: number, ry: number) => {
  const key = `${Math.round(rx)}x${Math.round(ry)}`;
  const cached = clipPathCache.get(key);
  if (cached) return cached;
  const p = new Path2D();
  p.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  clipPathCache.set(key, p);
  return p;
};

// ----------------------------
// Bounded fills helper (used in sprite baking)
// ----------------------------
export const fillRadialBounded = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fillStyle: CanvasGradient
) => {
  const x0 = Math.floor(x - r);
  const y0 = Math.floor(y - r);
  const size = Math.ceil(r * 2);
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = fillStyle;
  ctx.fillRect(x0, y0, size, size);
  ctx.restore();
};

// ----------------------------
// Sprite cache: bake disc+bloom+halo into offscreen canvas
// (dramatically reduces per-frame gradient/filter churn)
// ----------------------------
export type SunSprite = {
  canvas: HTMLCanvasElement;
  half: number; // half-size for centering
  discRadius: number;
  haloRadius: number;
};

const bucket = (v: number, step: number, min = -Infinity, max = Infinity) => {
  const vv = clamp(v, min, max);
  return Math.round(vv / step) * step;
};

const colorBucketKey = (rgb: Rgb) =>
  `${Math.round(rgb[0] * 20)}${Math.round(rgb[1] * 20)}${Math.round(rgb[2] * 20)}`;

const sunSpriteCache = new Map<string, SunSprite>();

export interface SpriteParams {
  discRadius: number;
  haloRadius: number;
  extinction: number;
  elevT: number;
  fogDensity: number;
  cloudCover: number;
  skyLum: number;
  finalSunRGB: Rgb;
  discToneScale: number;
  timeSeed: number;
}

export const getSunSprite = (params: SpriteParams): SunSprite => {
  // Bucket params to keep cache bounded
  const dr = bucket(params.discRadius, 2, 6, 220);
  const hr = bucket(params.haloRadius, 8, 32, 1400);
  const ext = bucket(params.extinction, 0.05, 0, 1);
  const et = bucket(params.elevT, 0.05, 0, 1);
  const fog = bucket(params.fogDensity, 0.05, 0, 1);
  const cloud = bucket(params.cloudCover, 0.05, 0, 1);
  const lum = bucket(params.skyLum, 0.05, 0, 1);
  const col = colorBucketKey(params.finalSunRGB);
  const tone = bucket(params.discToneScale, 0.05, 0.35, 1.25);

  const key = `dr${dr}_hr${hr}_e${ext}_t${et}_f${fog}_c${cloud}_l${lum}_k${tone}_${col}`;

  const cached = sunSpriteCache.get(key);
  if (cached) return cached;

  // Offscreen size: include halo + padding for blur
  const pad = Math.max(18, Math.ceil(hr * 0.12));
  const size = Math.ceil((hr + pad) * 2);
  const half = size / 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  const cx = half;
  const cy = half;

  // Build a normalized disc alpha (we'll apply overall alpha at draw time)
  const discBaseAlphaNorm = clamp01(0.95 * tone) * 0.95;

  // Fog wash reduces disc contrast (disc eats sky)
  const haze = clamp01(cloud * 0.7 + fog * 0.9);
  const fogDiscWash = lerp(0.0, 0.22, fog);
  const discRGB = mixColor(params.finalSunRGB, [1, 1, 1], 0.08);
  const discRGB2 = mixColor(discRGB, mixColor(params.finalSunRGB, [0.9, 0.92, 0.97], 0.35), 0.2);
  const finalDiscRGB = mixColor(
    discRGB2,
    mixColor(params.finalSunRGB, [0.75, 0.78, 0.82], 0.25),
    fogDiscWash
  );

  // Limb darkening: reduce under haze
  const limbStrength = lerp(0.12, 0.42, 1.0 - ext) * lerp(1.0, 0.55, haze);

  // Composite mode: screen-like feel
  ctx.save();
  ctx.globalCompositeOperation = 'screen';

  // 1) Disc edge softness + subtle distortion (baked, stable)
  {
    const edgeGrad = ctx.createRadialGradient(
      cx,
      cy,
      dr * SUN.edgeInner,
      cx,
      cy,
      dr * SUN.edgeOuter
    );
    edgeGrad.addColorStop(0.0, toCssRgb(finalDiscRGB, 0.55));
    edgeGrad.addColorStop(0.8, toCssRgb(finalDiscRGB, 0.15));
    edgeGrad.addColorStop(1.0, toCssRgb(finalDiscRGB, 0.0));

    ctx.globalAlpha = discBaseAlphaNorm;
    ctx.fillStyle = edgeGrad;

    ctx.beginPath();
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;

      // deterministic edge noise (no time in sprite)
      const n =
        Math.sin(a * 7.3 + params.timeSeed * 0.001) *
        Math.sin(a * 3.1 + params.timeSeed * 0.002);

      const r = dr * (1.0 + n * SUN.edgeNoiseAmp * (1.0 - ext));
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }

  // 2) Limb darkening layers
  {
    ctx.fillStyle = toCssRgb(finalDiscRGB, 1.0);
    for (let i = 0; i < SUN.limbLayers; i++) {
      const t = i / (SUN.limbLayers - 1);
      const r = dr * lerp(0.32, 0.98, t);
      const alpha = Math.pow(1.0 - t, 1.6 + limbStrength * 2.0);
      ctx.globalAlpha = discBaseAlphaNorm * alpha * 0.85;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3) Bright core
  {
    const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, dr * 0.9);
    core.addColorStop(0.0, toCssRgb([1.0, 1.0, 1.0], 1.0));
    core.addColorStop(0.18, toCssRgb([1.0, 0.99, 0.96], 0.96));
    core.addColorStop(0.55, toCssRgb(mixColor(params.finalSunRGB, [1, 1, 1], 0.18), 0.6));
    core.addColorStop(1.0, toCssRgb(params.finalSunRGB, 0.0));

    ctx.globalAlpha = discBaseAlphaNorm * 0.95;
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, dr * 0.92, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4) Granulation (static baked; shimmer stays in main pass if desired)
  if (dr > SUN.granuleMinRadius && et > 0.25) {
    const granules = getGranules(dr);
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(cx, cy);
    const clip = getDiscClipPath(dr * 0.92, dr * 0.92);
    ctx.clip(clip);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = SUN.granuleAlpha * et * 0.75;

    for (let i = 0; i < granules.length; i++) {
      const g = granules[i];
      ctx.globalAlpha = (0.010 + g.a * 0.55) * et;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5) Inner bloom (baked; reduces per-frame filter churn massively)
  {
    const fogBoost = lerp(1.0, 2.5, fog);
    const bloomAlpha = (SUN.bloomBase + fog * SUN.bloomFogK) * fogBoost;
    const bloomCol = mixColor(params.finalSunRGB, [1, 1, 1], 0.28);

    ctx.save();
    ctx.globalAlpha = bloomAlpha;
    ctx.fillStyle = toCssRgb(bloomCol, 0.95);

    for (let i = 0; i < SUN.bloomPasses; i++) {
      const blurPx = dr * (0.45 + i * 0.38);
      ctx.filter = `blur(${blurPx}px)`;
      ctx.beginPath();
      ctx.ellipse(
        cx,
        cy,
        dr * (1.25 + i * 0.85),
        dr * (1.05 + i * 1.45),
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    ctx.filter = 'none';
    ctx.restore();
  }

  // 6) Halos (warm + cool chromatic fringe)
  {
    const fogBoost = lerp(1.0, 2.5, fog);

    const haloWarm = ctx.createRadialGradient(cx, cy, dr, cx, cy, hr);
    haloWarm.addColorStop(
      0.0,
      toCssRgb(mixColor([1, 0.82, 0.62], params.finalSunRGB, 0.6), SUN.haloWarmA0 * fogBoost)
    );
    haloWarm.addColorStop(
      0.25,
      toCssRgb(mixColor([1, 0.78, 0.55], params.finalSunRGB, 0.35), SUN.haloWarmA1)
    );
    haloWarm.addColorStop(1.0, toCssRgb([1, 0.75, 0.55], 0));

    const haloCool = ctx.createRadialGradient(cx, cy, dr * 1.2, cx, cy, hr * 1.08);
    haloCool.addColorStop(0.0, toCssRgb([0.9, 0.95, 1.0], SUN.haloCoolA0));
    haloCool.addColorStop(0.6, toCssRgb([0.9, 0.95, 1.0], SUN.haloCoolA1));
    haloCool.addColorStop(1.0, toCssRgb([0.9, 0.95, 1.0], 0));

    ctx.globalAlpha = 1;
    fillRadialBounded(ctx, cx, cy, hr, haloWarm);
    fillRadialBounded(ctx, cx, cy, hr * 1.08, haloCool);
  }

  ctx.restore(); // screen composite
  ctx.filter = 'none';
  ctx.globalAlpha = 1;

  const sprite: SunSprite = { canvas, half, discRadius: dr, haloRadius: hr };
  sunSpriteCache.set(key, sprite);
  return sprite;
};
