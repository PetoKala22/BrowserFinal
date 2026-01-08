// src/lib/sky/skySun.ts
import { toCssRgb, type Rgb } from './skyColor';
import type { SkyLayerColors } from './skyTypes';
import type { SunScreenPos } from './skyView';
import { clamp01, lerp, mixColor, smoothstep } from './skyUtils';

// ----------------------------
// Sun: disc + bloom + halo + extinction + cloud occlusion + subtle lens ghosts
// Optimized for Canvas2D (SDR) with caching and bounded draws.
// ----------------------------

type Granule = { x: number; y: number; r: number; a: number };

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const luminance = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

const sampleSkyColorAtY = (layers: SkyLayerColors, y01: number): Rgb => {
  // Matches renderer’s 3-stop gradient: 0 (upper), 0.55 (mid), 1 (horizon)
  const t = clamp01(y01);
  if (t <= 0.55) return mixColor(layers.upperSky, layers.midSky, t / 0.55);
  return mixColor(layers.midSky, layers.horizonBand, (t - 0.55) / 0.45);
};

// Deterministic hash for cheap pseudo-random (no allocations)
const hash01 = (n: number) => {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
};

// Granulation cache (bucketed by radius)
const granuleCache = new Map<number, Granule[]>();

const getGranules = (radius: number) => {
  const bucket = Math.max(8, Math.round(radius / 6) * 6);
  const cached = granuleCache.get(bucket);
  if (cached) return cached;

  // Keep count low for perf; only subtle.
  const count = clamp(Math.round(bucket * 1.4), 40, 160);
  const pts: Granule[] = [];

  for (let i = 0; i < count; i++) {
    const u = hash01(i * 12.9898 + bucket * 0.23);
    const v = hash01(i * 78.233 + bucket * 0.71);
    const a = u * Math.PI * 2;
    // Bias toward mid-radius, avoid edge.
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

// Cached Path2D for circular clip areas (bucketed by radius)
const clipPathCache = new Map<string, Path2D>();
const getDiscClipPath = (rx: number, ry: number) => {
  const key = `${Math.round(rx)}x${Math.round(ry)}`;
  const cached = clipPathCache.get(key);
  if (cached) return cached;
  const p = new Path2D();
  p.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  clipPathCache.set(key, p);
  return p;
};

// Bounded fills: clip to a halo circle and fill only its bounding box (faster than full-canvas fillRect)
const fillRadialBounded = (
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

export const drawSunDisc = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  sunPos: SunScreenPos,
  sunElevation: number,
  sunVisibility: number,
  cloudCover: number,
  fogDensity: number,
  time: number
) => {
  if (sunVisibility <= 0.25 || sunElevation <= -2) return;

  // Elevation normalization for “day-ness”
  const elevT = clamp01((sunElevation + 2) / 12);

  // Extinction: more atmosphere near horizon
  const extinction = clamp01((sunElevation + 1) / 6);

  // Apparent disc radius: slightly smaller near horizon
  const baseRadius = height * 0.05;
  const discRadius = baseRadius * lerp(0.6, 1.0, extinction);

  // Refraction squash near horizon (vertical compression)
  const squash = lerp(0.55, 1.0, extinction);

  // Color shift: warm near horizon, neutral at high elevation
  const warmRGB: Rgb = [1.0, 0.70, 0.50];
  const neutralRGB: Rgb = [1.0, 0.96, 0.88];
  const sunRGB = mixColor(warmRGB, neutralRGB, elevT);

  // Wavelength-dependent atmospheric extinction (blue attenuates more)
  const extinctionRGB: Rgb = [
    1.0,
    lerp(0.85, 1.0, extinction),
    lerp(0.58, 1.0, extinction)
  ];
  const finalSunRGB = mixColor(sunRGB, extinctionRGB, 0.38);

  // Fog makes the sun “eat the sky”
  const fogBoost = lerp(1.0, 2.5, fogDensity);

  // Match luminance to sky model (SDR-friendly): avoid a huge clipped white blob at noon.
  const skyAtSun = sampleSkyColorAtY(layers, sunPos.y / Math.max(1, height));
  const skyLum = luminance(skyAtSun);
  const discToneScale = lerp(1.15, 0.55, smoothstep(0.35, 0.92, skyLum));
  const discBaseAlpha = 0.95 * sunVisibility * elevT * discToneScale;

  // Anti-CGI micro jitter (subpixel)
  const jitter =
    Math.sin(time * 12.7 + sunPos.x * 0.01 + sunPos.y * 0.02) *
    discRadius *
    0.006;

  // Limb darkening strength (stronger near horizon)
  const limbStrength = lerp(0.15, 0.45, 1.0 - extinction);

  // Halo radius (bounded draw)
  const haloRadius = discRadius * (6 + cloudCover * 4 + fogDensity * 6);

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(jitter, jitter);

  // --- Geometry transform for refraction squash ---
  ctx.translate(sunPos.x, sunPos.y);
  ctx.scale(1.0, squash);
  ctx.translate(-sunPos.x, -sunPos.y);

  // -----------------------------
  // 1) Disc: limb darkening + slight edge distortion
  // -----------------------------

  // Soft outer edge (helps avoid a hard “vector disc”)
  const edgeGrad = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius * 0.72,
    sunPos.x,
    sunPos.y,
    discRadius * 1.02
  );
  edgeGrad.addColorStop(0.0, toCssRgb(finalSunRGB, 0.55));
  edgeGrad.addColorStop(0.8, toCssRgb(finalSunRGB, 0.15));
  edgeGrad.addColorStop(1.0, toCssRgb(finalSunRGB, 0.0));

  // Draw a slightly distorted edge path
  ctx.globalAlpha = discBaseAlpha;
  ctx.fillStyle = edgeGrad;
  ctx.beginPath();
  const steps = 72;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const n =
      Math.sin(a * 7.3 + time * 0.8 + sunPos.x * 0.002) *
      Math.sin(a * 3.1 - time * 1.2 + sunPos.y * 0.002);
    const r = discRadius * (1.0 + n * 0.003 * (1.0 - extinction));
    const x = sunPos.x + Math.cos(a) * r;
    const y = sunPos.y + Math.sin(a) * r;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  // Limb darkening layers (cheap approximation)
  ctx.fillStyle = toCssRgb(finalSunRGB, 1.0);
  for (let i = 0; i < 3; i++) {
    const t = i / 2;
    const r = discRadius * lerp(0.32, 0.98, t);
    const alpha = Math.pow(1.0 - t, 1.6 + limbStrength * 2.0);
    ctx.globalAlpha = discBaseAlpha * alpha * 0.85;
    ctx.beginPath();
    ctx.arc(sunPos.x, sunPos.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Bright core (not flat fill)
  const core = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    0,
    sunPos.x,
    sunPos.y,
    discRadius * 0.9
  );
  core.addColorStop(0.0, toCssRgb([1.0, 1.0, 1.0], 1.0));
  core.addColorStop(0.18, toCssRgb([1.0, 0.99, 0.96], 0.96));
  core.addColorStop(0.55, toCssRgb(mixColor(finalSunRGB, [1, 1, 1], 0.18), 0.6));
  core.addColorStop(1.0, toCssRgb(finalSunRGB, 0.0));

  ctx.globalAlpha = discBaseAlpha * 0.95;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sunPos.x, sunPos.y, discRadius * 0.92, 0, Math.PI * 2);
  ctx.fill();

  // -----------------------------
  // 2) Solar granulation (very subtle, only when disc is large enough)
  // -----------------------------
  if (discRadius > 18 && elevT > 0.25) {
    const granules = getGranules(discRadius);
    ctx.save();
    ctx.globalAlpha = 0.05 * elevT;
    ctx.globalCompositeOperation = 'overlay';
    ctx.translate(sunPos.x, sunPos.y);
    const clip = getDiscClipPath(discRadius * 0.92, discRadius * 0.92);
    ctx.clip(clip);
    for (let i = 0; i < granules.length; i++) {
      const g = granules[i];
      // Slight temporal shimmer without re-randomizing
      const tw = 0.5 + 0.5 * Math.sin(time * (0.7 + (i % 7) * 0.06) + i);
      ctx.globalAlpha = 0.012 + g.a * tw;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
    ctx.restore();
  }

  // -----------------------------
  // 3) Cloud occlusion on the disc (procedural, fast)
  // -----------------------------
  // Your atmosphere layer is a large gradient; this adds local, partial dimming on the disc.
  if (cloudCover > 0.08) {
    const occ = clamp01(cloudCover * 1.1 + fogDensity * 0.4);
    const occAlpha = 0.08 + occ * 0.28;
    const wind = time * (0.35 + cloudCover * 0.25);

    ctx.save();
    // Clip to disc
    ctx.translate(sunPos.x, sunPos.y);
    ctx.clip(getDiscClipPath(discRadius * 0.95, discRadius * 0.95));
    ctx.translate(-sunPos.x, -sunPos.y);

    ctx.globalCompositeOperation = 'multiply';
    ctx.filter = `blur(${discRadius * 0.18}px)`;
    ctx.globalAlpha = occAlpha;
    ctx.fillStyle = toCssRgb(mixColor(skyAtSun, [0.65, 0.68, 0.74], 0.6), 1.0);

    // A few moving blobs; deterministic positions
    const blobCount = clamp(Math.round(4 + cloudCover * 6), 4, 10);
    for (let i = 0; i < blobCount; i++) {
      const a = (i / blobCount) * Math.PI * 2;
      const rr = discRadius * (0.2 + hash01(i * 13.1 + 0.4) * 0.6);
      const bx = sunPos.x + Math.cos(a + wind * 0.6) * rr + Math.sin(wind + i) * discRadius * 0.12;
      const by = sunPos.y + Math.sin(a - wind * 0.5) * rr + Math.cos(wind * 0.9 + i) * discRadius * 0.12;
      const br = discRadius * (0.22 + hash01(i * 4.7 + 2.2) * 0.38);

      ctx.beginPath();
      ctx.arc(bx, by, br, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.filter = 'none';
  }

  // -----------------------------
  // 4) Inner bloom (anisotropic)
  // -----------------------------
  {
    const bloomAlpha = (0.18 + fogDensity * 0.35) * sunVisibility * fogBoost;
    ctx.save();
    ctx.globalAlpha = bloomAlpha;
    ctx.fillStyle = toCssRgb(mixColor(finalSunRGB, [1, 1, 1], 0.28), 0.95);

    // Directional-ish bloom: stack a few ellipses with increasing blur.
    const passes = 3;
    for (let i = 0; i < passes; i++) {
      const blurPx = discRadius * (0.45 + i * 0.38);
      ctx.filter = `blur(${blurPx}px)`;
      ctx.beginPath();
      ctx.ellipse(
        sunPos.x,
        sunPos.y,
        discRadius * (1.25 + i * 0.85),
        discRadius * (1.05 + i * 1.45),
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.restore();
  }

  // -----------------------------
  // 5) Chromatic halo split (warm + slightly cool fringe)
  // -----------------------------
  ctx.filter = 'none';

  const haloWarm = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius,
    sunPos.x,
    sunPos.y,
    haloRadius
  );
  haloWarm.addColorStop(0.0, toCssRgb(mixColor([1, 0.82, 0.62], finalSunRGB, 0.6), 0.11 * sunVisibility * fogBoost));
  haloWarm.addColorStop(0.25, toCssRgb(mixColor([1, 0.78, 0.55], finalSunRGB, 0.35), 0.055 * sunVisibility));
  haloWarm.addColorStop(1.0, toCssRgb([1, 0.75, 0.55], 0));

  const haloCool = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius * 1.2,
    sunPos.x,
    sunPos.y,
    haloRadius * 1.08
  );
  haloCool.addColorStop(0.0, toCssRgb([0.90, 0.95, 1.0], 0.03 * sunVisibility));
  haloCool.addColorStop(0.6, toCssRgb([0.90, 0.95, 1.0], 0.012 * sunVisibility));
  haloCool.addColorStop(1.0, toCssRgb([0.90, 0.95, 1.0], 0));

  ctx.globalAlpha = 1;
  fillRadialBounded(ctx, sunPos.x, sunPos.y, haloRadius, haloWarm);
  fillRadialBounded(ctx, sunPos.x, sunPos.y, haloRadius * 1.08, haloCool);

  // -----------------------------
  // 6) Subtle cinematic lens ghosting (very conservative)
  // -----------------------------
  // Only when sun is visible and not heavily clouded.
  if (sunVisibility > 0.25 && cloudCover < 0.85 && elevT > 0.25) {
    const cx = width * 0.5;
    const cy = height * 0.5;
    const dx = cx - sunPos.x;
    const dy = cy - sunPos.y;
    const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;
    const nx = dx / dist;
    const ny = dy / dist;

    const ghostStrength = 0.035 * sunVisibility * (1.0 - cloudCover) * clamp01(1.0 - fogDensity * 0.7);
    if (ghostStrength > 0.004) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = `blur(${discRadius * 0.35}px)`;
      ctx.globalAlpha = ghostStrength;

      // A few ghosts placed along the sun->center axis
      const ghosts = [0.22, 0.46, 0.72, 0.92];
      for (let i = 0; i < ghosts.length; i++) {
        const t = ghosts[i];
        const px = sunPos.x + nx * dist * t;
        const py = sunPos.y + ny * dist * t;
        const s = discRadius * (0.55 + i * 0.38);
        const ring = ctx.createRadialGradient(px, py, s * 0.1, px, py, s);
        ring.addColorStop(0.0, toCssRgb(mixColor([0.95, 1.0, 1.0], finalSunRGB, 0.15), 0.14));
        ring.addColorStop(0.55, toCssRgb(mixColor([0.85, 0.95, 1.0], finalSunRGB, 0.05), 0.05));
        ring.addColorStop(1.0, toCssRgb([0.85, 0.95, 1.0], 0.0));
        ctx.fillStyle = ring;
        ctx.beginPath();
        ctx.arc(px, py, s, 0, Math.PI * 2);
        ctx.fill();
      }

      // Very faint “aperture” spot opposite the sun
      const ox = cx + (cx - sunPos.x) * 0.22;
      const oy = cy + (cy - sunPos.y) * 0.22;
      ctx.filter = `blur(${discRadius * 0.55}px)`;
      ctx.globalAlpha = ghostStrength * 0.65;
      ctx.fillStyle = toCssRgb(mixColor([0.9, 1, 0.95], finalSunRGB, 0.1), 0.08);
      ctx.beginPath();
      ctx.arc(ox, oy, discRadius * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  ctx.restore();
};
