// skyRenderer.ts
import { SkyLayerColors, SkyStateInput, Star } from './skyTypes';
import { toCssRgb, mixOklab } from './skyColor';
import { createStarField } from './skyStars';

type SunScreenPos = { x: number; y: number };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Smoothstep for nicer falloffs
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};

// Helper: Mix two colors (OKLab for perceptual smoothness)
const mixColor = (c1: [number, number, number], c2: [number, number, number], t: number) => {
  return mixOklab(c1, c2, clamp01(t));
};

// ----------------------------
// View / projection configuration
// ----------------------------
const SKY_VIEW = {
  viewAzimuth: 180,
  fovDeg: 100,
  horizonYFrac: 0.6,
  verticalDeg: 90
};

const getSunScreenPosition = (
  width: number,
  height: number,
  azimuth: number,
  elevation: number
): SunScreenPos => {
  let azDelta = azimuth - SKY_VIEW.viewAzimuth;
  if (azDelta > 180) azDelta -= 360;
  if (azDelta < -180) azDelta += 360;

  const x = width / 2 + (azDelta / (SKY_VIEW.fovDeg / 2)) * (width / 2);
  const horizonY = height * SKY_VIEW.horizonYFrac;
  const pixelsPerDegree = height / SKY_VIEW.verticalDeg;
  const y = horizonY - elevation * pixelsPerDegree;

  return { x, y };
};

// ----------------------------
// Stars: realistic sprite-based rendering
// ----------------------------
type StarEx = Star & {
  // Local-only star enhancements (no need to change your Star type)
  rgb: [number, number, number];
  radius: number; // sprite radius (pixels)
  intensity: number; // normalized brightness (0..1-ish)
  twinkleAmp: number; // 0..1
  twinkleFreq: number; // radians/sec-ish
};

let starData: StarEx[] = [];
let starFieldW = 0;
let starFieldH = 0;

// Offscreen base star layer (static)
let starLayerCanvas: HTMLCanvasElement | null = null;
let starLayerCtx: CanvasRenderingContext2D | null = null;

// A subset to twinkle
let twinkleIndices: number[] = [];

// Sprite atlas keyed by (radius bucket + color bucket)
type SpriteKey = string;
const starSprites = new Map<SpriteKey, HTMLCanvasElement>();

// Convert [0..1] rgb to css
const rgbCss = (rgb: [number, number, number]) =>
  `rgb(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)})`;

/**
 * Approximate star color temperature distribution.
 * Return rgb in [0..1]. We bias toward near-white with some warm and some blue-white.
 */
const sampleStarColor = (r01: number): [number, number, number] => {
  // r01 in [0..1]
  // 0.0..0.35 warm, 0.35..0.85 neutral, 0.85..1.0 cool
  if (r01 < 0.35) return mixColor([1.0, 0.78, 0.55], [1.0, 0.92, 0.82], r01 / 0.35); // warm -> slightly warm-white
  if (r01 < 0.85)
    return mixColor([1.0, 0.92, 0.85], [0.97, 0.98, 1.0], (r01 - 0.35) / 0.5); // warm-white -> neutral
  return mixColor([0.93, 0.96, 1.0], [0.78, 0.86, 1.0], (r01 - 0.85) / 0.15); // neutral -> blue-white
};

/**
 * Star PSF sprite: soft halo + bright core.
 * We generate small canvases once and reuse via drawImage.
 */
const getStarSprite = (radius: number, rgb: [number, number, number]) => {
  const rBucket = Math.round(radius * 10) / 10; // bucket to keep atlas small
  const cBucket = `${Math.round(rgb[0] * 10)}${Math.round(rgb[1] * 10)}${Math.round(rgb[2] * 10)}`;
  const key: SpriteKey = `${rBucket}_${cBucket}`;

  const cached = starSprites.get(key);
  if (cached) return cached;

  const pad = Math.max(2, Math.ceil(radius * 3.0));
  const size = pad * 2 + 1;

  const c = document.createElement('canvas');
  c.width = c.height = size;
  const sctx = c.getContext('2d')!;
  sctx.clearRect(0, 0, size, size);

  const cx = pad;
  const cy = pad;

  // Halo gradient
  const haloR = radius * 1.4;
  const halo = sctx.createRadialGradient(cx, cy, 0, cx, cy, haloR);
  halo.addColorStop(0, `rgba(255,255,255,${0.0})`);
  halo.addColorStop(0.20, `rgba(255,255,255,${0.10})`);
  halo.addColorStop(1, `rgba(255,255,255,0)`);

  // Core gradient tinted slightly by star color
  const coreR = Math.max(0.7, radius);
  const core = sctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(
    0,
    `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},1)`
  );
  core.addColorStop(
    0.65,
    `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},0.35)`
  );
  core.addColorStop(
    1,
    `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},0)`
  );

  // Paint halo then core (additive-ish feel later via composite mode)
  sctx.fillStyle = halo;
  sctx.fillRect(0, 0, size, size);

  sctx.fillStyle = core;
  sctx.fillRect(0, 0, size, size);

  starSprites.set(key, c);
  return c;
};

/**
 * Atmospheric extinction: stars dim near the horizon.
 * alt = 1 at top of canvas, 0 at bottom.
 */
const starExtinction = (y: number, height: number) => {
  const alt = clamp01(1 - y / height); // 0 near bottom, 1 near top
  // Below ~15% altitude, heavy extinction. Above ~60%, mostly clear.
  return 0.22 + 0.78 * smoothstep(0.15, 0.6, alt);
};

/**
 * Build the star cache from createStarField() and render a static base layer.
 */
const ensureStarField = (width: number, height: number) => {
  if (starData.length && width === starFieldW && height === starFieldH && starLayerCanvas) return;

  // Raw stars from your generator
  const raw = createStarField(width, height);

  // Wrap into enriched stars
  starData = raw.map((s) => {
    // If your createStarField already gives good sizes/alfa, we respect it.
    // But we remap to a better perceptual intensity curve.
    const base = clamp01(s.baseAlpha);

    // Intensity curve: lots of faint stars, few bright. This compresses.
    const intensity = Math.pow(base, 1.6);

    // Color variation based on stable hash of position (deterministic)
    const h = (Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453) % 1;
    const rgb = sampleStarColor(Math.abs(h));

    // Radius: keep mostly subpixel-ish with a few larger
    const radius = Math.max(0.6, Math.min(2.2, s.size * 1.15));

    // Twinkle: only meaningful for brighter stars; amplitude scales with intensity
    const twBase = clamp01((intensity - 0.25) / 0.55);
    const twinkleAmp = twBase * 0.55; // cap twinkle
    const twinkleFreq = 0.8 + (s.speed ?? 1) * 1.5;

    return {
      ...s,
      rgb,
      radius,
      intensity,
      twinkleAmp,
      twinkleFreq
    } as StarEx;
  });

  starFieldW = width;
  starFieldH = height;

  // Create offscreen base layer
  starLayerCanvas = document.createElement('canvas');
  starLayerCanvas.width = width;
  starLayerCanvas.height = height;
  starLayerCtx = starLayerCanvas.getContext('2d');

  if (!starLayerCtx) {
    starLayerCanvas = null;
    twinkleIndices = [];
    return;
  }

  // Render static layer with sprites (fast and more realistic than arcs)
  starLayerCtx.clearRect(0, 0, width, height);
  starLayerCtx.save();

  for (const s of starData) {
    const ext = starExtinction(s.y, height);

    // Base alpha is intensity * extinction, capped low (stars are subtle)
    const a = clamp01(s.intensity * ext) * 0.9;
    if (a < 0.003) continue;

    const sprite = getStarSprite(s.radius, s.rgb);
    const half = sprite.width / 2;

    starLayerCtx.globalAlpha = a;
    starLayerCtx.drawImage(sprite, s.x - half, s.y - half);
  }

  starLayerCtx.restore();
  starLayerCtx.globalAlpha = 1;

  // Choose twinkle subset (brightest stars)
  const indices = starData
    .map((s, i) => ({ i, score: s.intensity }))
    .sort((a, b) => b.score - a.score);

  const target = Math.min(180, Math.max(40, Math.floor(starData.length * 0.035)));
  twinkleIndices = indices.slice(0, target).map((x) => x.i);
};

// ----------------------------
// Noise tile (cheap dithering/grain)
// ----------------------------
let noiseTileCanvas: HTMLCanvasElement | null = null;
let noiseTileSize = 128;

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

const getNoiseTile = (size = 128) => {
  if (noiseTileCanvas && noiseTileSize === size) return noiseTileCanvas;

  noiseTileSize = size;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const nctx = c.getContext('2d');
  if (!nctx) {
    noiseTileCanvas = null;
    return null;
  }

  const img = nctx.createImageData(size, size);
  const d = img.data;

  const rand = lcg(0xdecafbad);
  for (let i = 0; i < d.length; i += 4) {
    const v = (rand() * 255) | 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }

  nctx.putImageData(img, 0, 0);
  noiseTileCanvas = c;
  return noiseTileCanvas;
};

const overlayNoise = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
  time: number
) => {
  if (strength <= 0.001) return;

  const tile = getNoiseTile(128);
  if (!tile) return;

  const alpha = Math.min(0.12, strength / 45);
  const scrollX = Math.floor((time * 7) % tile.width);
  const scrollY = Math.floor((time * 5) % tile.height);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'soft-light';

  for (let y = -tile.height; y < height + tile.height; y += tile.height) {
    for (let x = -tile.width; x < width + tile.width; x += tile.width) {
      ctx.drawImage(tile, x - scrollX, y - scrollY);
    }
  }

  ctx.restore();
};

// ----------------------------
// Atmosphere: fog + stratus + optional lining
// ----------------------------
const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  fogDensity: number,
  cloudCover: number,
  sunElevation: number,
  sunPos?: SunScreenPos,
  sunVisibility?: number
) => {
  const baseCloudColor = layers.horizonBand;

  const denseCloudColor = mixColor(layers.midSky, [0.78, 0.82, 0.9], 0.55);
  const lightIntensity = clamp01((sunElevation + 10) / 30);

  const dayCloud = mixColor(baseCloudColor, [1, 1, 1], 0.55);
  const nightCloud = mixColor([0.08, 0.08, 0.12], baseCloudColor, 0.45);

  let effectiveCloudColor = mixColor(nightCloud, dayCloud, lightIntensity);
  const coverageBias = Math.pow(clamp01(cloudCover), 1.2);
  effectiveCloudColor = mixColor(effectiveCloudColor, denseCloudColor, coverageBias);

  // Fog
  if (fogDensity > 0.01) {
    const fogHeight = height * (0.2 + fogDensity * 0.8);
    const fogGrad = ctx.createLinearGradient(0, height, 0, height - fogHeight);
    fogGrad.addColorStop(0, toCssRgb(layers.horizonBand, fogDensity));
    fogGrad.addColorStop(1, toCssRgb(layers.horizonBand, 0));
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, height - fogHeight, width, fogHeight);
  }

  // Stratus
  if (cloudCover > 0.01) {
    const cloudGrad = ctx.createLinearGradient(0, 0, 0, height * 0.85);
    const alphaTop = Math.min(1, cloudCover * 1.5);
    const alphaMid = Math.min(1, cloudCover * 1.05);
    const alphaBottom = Math.min(1, cloudCover * 0.8);

    cloudGrad.addColorStop(0, toCssRgb(effectiveCloudColor, alphaTop));
    cloudGrad.addColorStop(0.45, toCssRgb(effectiveCloudColor, alphaMid * 0.7));
    cloudGrad.addColorStop(1, toCssRgb(layers.horizonBand, alphaBottom * 0.12));

    ctx.fillStyle = cloudGrad;
    ctx.fillRect(0, 0, width, height);

    // Silver lining / forward scattering
    if (sunPos && (sunVisibility ?? 0) > 0.05 && sunElevation > -8) {
      const sv = clamp01(sunVisibility ?? 0);
      const liningStrength = clamp01(cloudCover * 1.2) * sv;

      if (liningStrength > 0.02) {
        const radius = Math.min(width, height) * (0.35 + cloudCover * 0.65);
        const rg = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, radius);

        const warm = clamp01((10 - Math.abs(sunElevation)) / 12);
        const liningColor: [number, number, number] = mixColor([1, 0.85, 0.65], [1, 1, 1], 1 - warm);

        rg.addColorStop(0, toCssRgb(liningColor, 0.18 * liningStrength));
        rg.addColorStop(0.35, toCssRgb(liningColor, 0.08 * liningStrength));
        rg.addColorStop(1, toCssRgb(liningColor, 0));

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      }
    }
  }
};

// ----------------------------
// Sun: realistic disc + bloom + chromatic halo + extinction
// ----------------------------
const drawSunDisc = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
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
  const baseRadius = height * 0.035;
  const discRadius = baseRadius * lerp(0.6, 1.0, extinction);

  // Color shift: warm near horizon, neutral at high elevation
  const warmRGB: [number, number, number] = [1.0, 0.70, 0.50];
  const neutralRGB: [number, number, number] = [1.0, 0.96, 0.88];
  const sunRGB = mixColor(warmRGB, neutralRGB, elevT);

  // Fog makes the sun “eat the sky”
  const fogBoost = lerp(1.0, 2.5, fogDensity);

  // Anti-CGI micro jitter (subpixel)
  const jitter = (Math.sin(time * 12.7 + sunPos.x * 0.01 + sunPos.y * 0.02) * 0.5) * discRadius * 0.02;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(jitter, jitter);

  // -----------------------------
  // 1) Luminance-based disc core (no flat fill)
  // -----------------------------
  const core = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    0,
    sunPos.x,
    sunPos.y,
    discRadius * 0.85
  );
  core.addColorStop(0.0, toCssRgb([1.0, 1.0, 1.0], 1.0));
  core.addColorStop(0.25, toCssRgb([1.0, 0.99, 0.96], 0.95));
  core.addColorStop(0.55, toCssRgb(sunRGB, 0.55));
  core.addColorStop(1.0, toCssRgb(sunRGB, 0.0));

  ctx.globalAlpha = 0.95 * sunVisibility * elevT;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sunPos.x, sunPos.y, discRadius * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // -----------------------------
  // 2) Inner bloom (blurred)
  // -----------------------------
  ctx.globalAlpha = 0.55 * sunVisibility * fogBoost;
  ctx.filter = `blur(${discRadius * 0.75}px)`;
  ctx.fillStyle = toCssRgb(mixColor(sunRGB, [1, 1, 1], 0.35), 0.9);
  ctx.beginPath();
  ctx.arc(sunPos.x, sunPos.y, discRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // -----------------------------
  // 3) Chromatic halo split (warm + slightly cool fringe)
  // -----------------------------
  ctx.filter = 'none';

  const haloRadius = discRadius * (6 + cloudCover * 4 + fogDensity * 6);

  const haloWarm = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius,
    sunPos.x,
    sunPos.y,
    haloRadius
  );
  haloWarm.addColorStop(0.0, toCssRgb(mixColor([1, 0.82, 0.62], sunRGB, 0.6), 0.12 * sunVisibility * fogBoost));
  haloWarm.addColorStop(0.25, toCssRgb(mixColor([1, 0.78, 0.55], sunRGB, 0.35), 0.06 * sunVisibility));
  haloWarm.addColorStop(1.0, toCssRgb([1, 0.75, 0.55], 0));

  const haloCool = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius * 1.2,
    sunPos.x,
    sunPos.y,
    haloRadius * 1.1
  );
  haloCool.addColorStop(0.0, toCssRgb([0.90, 0.95, 1.0], 0.035 * sunVisibility));
  haloCool.addColorStop(0.6, toCssRgb([0.90, 0.95, 1.0], 0.012 * sunVisibility));
  haloCool.addColorStop(1.0, toCssRgb([0.90, 0.95, 1.0], 0));

  ctx.globalAlpha = 1;
  ctx.fillStyle = haloWarm;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = haloCool;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
};

// ----------------------------
// Main render
// ----------------------------
export const renderSkyGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  state: SkyStateInput,
  time: number
) => {
  ctx.clearRect(0, 0, width, height);

  const { sunElevation, sunAzimuth } = state.astronomy;
  const cloudCover = clamp01(state.weather.cloudCover);
  const fogDensity = clamp01(state.weather.fogDensity);

  // 1) Base sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, toCssRgb(layers.upperSky));
  gradient.addColorStop(0.55, toCssRgb(layers.midSky));
  gradient.addColorStop(1, toCssRgb(layers.horizonBand));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const hasSunGlow = sunElevation > -18;
  const sunPos = hasSunGlow ? getSunScreenPosition(width, height, sunAzimuth, sunElevation) : undefined;

  // 2) Stars (night only) with realistic rendering
  const cloudVisibilityFactor = Math.max(0, 1 - cloudCover * 1.2);

  if (sunElevation < 5 && cloudVisibilityFactor > 0.01) {
    ensureStarField(width, height);

    const nightDarkness = clamp01((-sunElevation + 5) / 10);
    const starGlobalAlpha = nightDarkness * cloudVisibilityFactor;

    if (starGlobalAlpha > 0.01 && starLayerCanvas) {
      // Base layer
      ctx.save();
      ctx.globalAlpha = starGlobalAlpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(starLayerCanvas, 0, 0);
      ctx.restore();

      // Twinkle overlay
      const twinkleAlpha = starGlobalAlpha * 0.55;
      if (twinkleAlpha > 0.01) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (const idx of twinkleIndices) {
          const s = starData[idx];

          const ext = starExtinction(s.y, height);

          const t1 = Math.sin(time * s.twinkleFreq + s.phase);
          const t2 = Math.sin(time * (s.twinkleFreq * 0.37 + 0.9) + s.phase * 1.7);
          const tw = 0.6 * t1 + 0.4 * t2;

          const amp = s.twinkleAmp;
          const twFactor = 1 + amp * tw;

          const a = clamp01(s.intensity * ext * twinkleAlpha) * twFactor;
          if (a < 0.01) continue;

          const sprite = getStarSprite(s.radius, s.rgb);
          const half = sprite.width / 2;

          ctx.globalAlpha = Math.min(0.18, a);
          ctx.drawImage(sprite, s.x - half, s.y - half);
        }

        ctx.restore();
      }
    }
  }

  // 3) Sun glow + disc
  let sunVisibility = 0;
  if (hasSunGlow && sunPos) {
    sunVisibility = Math.max(0.1, 1 - cloudCover);

    if (sunPos.x > -width && sunPos.x < width * 2) {
      const scatter = Math.max(1, 1 + fogDensity * 2 + cloudCover);
      const glowRadius = Math.min(width, height) * 0.9 * scatter;

      const glowGrad = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, glowRadius);
      glowGrad.addColorStop(0, toCssRgb(layers.horizonBand, 0.5 * sunVisibility));
      glowGrad.addColorStop(0.4, toCssRgb(layers.midSky, 0.15 * sunVisibility));
      glowGrad.addColorStop(1, toCssRgb(layers.upperSky, 0));

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();

      // Sun disc (replaces your old arc+blur block)
      drawSunDisc(ctx, width, height, sunPos, sunElevation, sunVisibility, cloudCover, fogDensity, time);
    }
  }

  // 4) Atmosphere over sky/sun/stars
  drawAtmosphere(ctx, width, height, layers, fogDensity, cloudCover, sunElevation, sunPos, sunVisibility);

  // 5) Ground bounce
  const groundVisibility = Math.max(0, 1 - fogDensity);
  if (groundVisibility > 0.05) {
    const groundGrad = ctx.createLinearGradient(0, height * 1, 0, height);
    groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 0));
    groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 1 * groundVisibility));
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height * 0.85, width, height * 0.15);
  }

  // 6) Grain / dithering
  const noiseStrength = 3 + fogDensity * 4 + cloudCover * 2;
  overlayNoise(ctx, width, height, noiseStrength, time);
};
