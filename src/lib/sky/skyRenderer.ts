// skyRenderer.ts
import { SkyLayerColors, SkyStateInput, Star } from './skyTypes';
import { toCssRgb, mixOklab } from './skyColor';
import { createStarField } from './skyStars';
import { drawVolumetricClouds } from './skyClouds';

/**
 * Renderer factory so the sky can be instantiated per-canvas without hidden module globals.
 * This avoids cross-canvas contamination and makes hot-reload/testing more predictable.
 */
export const createSkyRenderer = () => {
  // ---- Internal cache (per renderer instance) -----------------------------
  let starData: Star[] = [];
  let starFieldW = 0;
  let starFieldH = 0;

  let noiseCanvas: HTMLCanvasElement | null = null;

  // Optional pre-bucketing for faster star drawing
  let starBuckets: Map<number, Star[]> | null = null;

  // ---- Helpers ------------------------------------------------------------

  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const deg2rad = (deg: number) => (deg * Math.PI) / 180;

  const mixColor = (c1: [number, number, number], c2: [number, number, number], t: number) => {
    return mixOklab(c1, c2, clamp01(t));
  };

  // Generates a reusable static noise tile for dithering
  const getNoisePatternCanvas = () => {
    if (noiseCanvas) return noiseCanvas;

    const size = 128;
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = size;
    noiseCanvas.height = size;

    const nCtx = noiseCanvas.getContext('2d', { willReadFrequently: false })!;
    const idata = nCtx.createImageData(size, size);
    const data = idata.data;

    /**
     * Slightly “tinted” noise (blue-ish bias) tends to read less like gray speckle,
     * while still breaking gradient banding. Keep amplitude small to avoid grit.
     */
    const amplitude = 14; // lower than before: less visible speckling
    for (let i = 0; i < data.length; i += 4) {
      // Centered noise around 0 in byte-space: 128 +/- amplitude
      const n = 128 + (Math.random() - 0.5) * 2 * amplitude;

      // Subtle channel offsets to reduce “flat gray” appearance
      const r = n * 0.95;
      const g = n * 0.98;
      const b = n * 1.05;

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }

    nCtx.putImageData(idata, 0, 0);
    return noiseCanvas;
  };

  /**
   * Simple panoramic projection:
   * - X: azimuth mapped across a FOV centered on the camera direction
   * - Y: use a sine projection for elevation (better feel near horizon/zenith than linear)
   */
  const getCelestialPosition = (width: number, height: number, azimuth: number, elevation: number) => {
    const viewAzimuth = 180; // looking South
    const fov = 100; // degrees

    let azDelta = azimuth - viewAzimuth;
    if (azDelta > 180) azDelta -= 360;
    if (azDelta < -180) azDelta += 360;

    const x = width / 2 + (azDelta / (fov / 2)) * (width / 2);

    // Horizon anchor (keep your artistic choice)
    const horizonY = height * 0.6;

    // Sine-based elevation projection (0° -> horizonY, 90° -> near top)
    const elevRad = deg2rad(elevation);
    const y = horizonY - Math.sin(elevRad) * (height * 0.9);

    return { x, y };
  };

  const isOffscreen = (x: number, y: number, width: number, height: number, margin: number) => {
    return x < -margin || x > width + margin || y < -margin || y > height + margin;
  };

  const ensureStarField = (width: number, height: number) => {
    if (starData.length === 0 || width !== starFieldW || height !== starFieldH) {
      starData = createStarField(width, height);
      starFieldW = width;
      starFieldH = height;

      // Bucket by size to reduce beginPath/arc calls
      starBuckets = new Map();
      for (const s of starData) {
        const key = s.size;
        const arr = starBuckets.get(key);
        if (arr) arr.push(s);
        else starBuckets.set(key, [s]);
      }
    }
  };

  // ---- Drawing Functions --------------------------------------------------

  const drawMoon = (ctx: CanvasRenderingContext2D, width: number, height: number, state: SkyStateInput) => {
    const { moonElevation, moonPhase } = state.astronomy;

    // Visual approximation (you can replace with a real moon azimuth later)
    const moonAzimuth = (state.astronomy.sunAzimuth + 180) % 360;

    if (moonElevation < -5) return;

    const pos = getCelestialPosition(width, height, moonAzimuth, moonElevation);
    const radius = Math.min(width, height) * 0.04;

    // Use radius-based margin so culling matches the draw footprint
    const margin = radius * 6;
    if (isOffscreen(pos.x, pos.y, width, height, margin)) return;

    // Phase: 0=new, 0.5=full, 1=new
    // Map to illuminated fraction and terminator offset.
    const phase = ((moonPhase % 1) + 1) % 1;
    const illuminated = 1 - Math.abs(phase - 0.5) * 2; // 0..1

    ctx.save();
    ctx.translate(pos.x, pos.y);

    // 1) Moon glow
    {
      const glowRadius = radius * 4;
      const glow = ctx.createRadialGradient(0, 0, radius, 0, 0, glowRadius);
      glow.addColorStop(0, 'rgba(220, 230, 255, 0.22)');
      glow.addColorStop(1, 'rgba(220, 230, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2) Base disc
    ctx.fillStyle = '#E6E8F0';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // 3) Shadow mask (terminator via clipping)
    // Determine waxing/waning direction (simple heuristic):
    // phase in (0..0.5) waxing, (0.5..1) waning
    const waxing = phase < 0.5;

    // Terminator offset: larger offset => thinner crescent
    // illuminated=1 => full => offset ~ 0
    // illuminated=0 => new => offset ~ radius
    const terminatorOffset = (1 - illuminated) * radius;

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';

    // Paint shadow by drawing an offset circle; clipping stabilizes the edge.
    // The sign flips for waxing/waning.
    const sx = (waxing ? 1 : -1) * terminatorOffset;

    ctx.beginPath();
    ctx.arc(sx, 0, radius * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  };

  const drawFogLayer = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layers: SkyLayerColors,
    fogDensity: number
  ) => {
    if (fogDensity <= 0.01) return;

    const fogHeight = height * (0.25 + fogDensity * 0.75);
    const fogGrad = ctx.createLinearGradient(0, height, 0, height - fogHeight);

    fogGrad.addColorStop(0, toCssRgb(layers.horizonBand, fogDensity));
    fogGrad.addColorStop(1, toCssRgb(layers.horizonBand, 0));

    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, height - fogHeight, width, fogHeight);
  };

  const drawStars = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cloudCover: number,
    sunElevation: number,
    time: number
  ) => {
    const cloudVisibilityFactor = Math.max(0, 1 - cloudCover * 1.2);
    if (sunElevation >= 5 || cloudVisibilityFactor <= 0.01) return;

    ensureStarField(width, height);

    const nightDarkness = clamp01((-sunElevation + 5) / 10);
    const starGlobalAlpha = nightDarkness * cloudVisibilityFactor;
    if (starGlobalAlpha <= 0.01) return;

    // Fade stars toward the horizon (extinction & haze)
    const horizonStart = height * 0.58;
    const horizonEnd = height * 0.92;
    const horizonRange = Math.max(1, horizonEnd - horizonStart);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';

    // Fast path: bucketed draw by size
    if (starBuckets) {
      for (const [size, bucket] of starBuckets.entries()) {
        ctx.beginPath();

        // Draw all circles for this size in one path, but alpha varies per-star,
        // so we need to fill per star. Instead, we compromise:
        // - If you want maximum speed, you can quantize alpha into buckets too.
        // - Here we keep correctness by filling per star but still avoid arc setup overhead across sizes.
        // (Still notably faster than mixed sizes due to less state churn.)
        for (const star of bucket) {
          const twinkle = Math.sin(time * star.speed + star.phase);
          const alphaTwinkle = 0.7 + 0.3 * twinkle;

          const hf = clamp01((star.y - horizonStart) / horizonRange);
          const horizonFade = 1 - hf * hf; // stronger fade near horizon

          const alpha = star.baseAlpha * alphaTwinkle * starGlobalAlpha * horizonFade;
          if (alpha <= 0.003) continue;

          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
      // Fallback path
      for (const star of starData) {
        const twinkle = Math.sin(time * star.speed + star.phase);
        const alphaTwinkle = 0.7 + 0.3 * twinkle;

        const hf = clamp01((star.y - horizonStart) / horizonRange);
        const horizonFade = 1 - hf * hf;

        const alpha = star.baseAlpha * alphaTwinkle * starGlobalAlpha * horizonFade;
        if (alpha <= 0.003) continue;

        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawSun = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layers: SkyLayerColors,
    sunAzimuth: number,
    sunElevation: number,
    cloudCover: number,
    fogDensity: number
  ) => {
    if (sunElevation <= -18) return;

    const sunPos = getCelestialPosition(width, height, sunAzimuth, sunElevation);

    // Visibility suppressed by cloud cover, but never fully off to keep “presence”
    const sunVisibility = Math.max(0.1, 1 - cloudCover);

    // Cull based on expected halo footprint
    const scatter = Math.max(1, 1 + fogDensity * 2 + cloudCover);
    const glowRadius = Math.min(width, height) * 0.9 * scatter;

    if (isOffscreen(sunPos.x, sunPos.y, width, height, glowRadius)) return;

    // 1) Atmospheric scattering glow (screen blend)
    {
      const glowGrad = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, glowRadius);
      glowGrad.addColorStop(0, toCssRgb(layers.horizonBand, 0.5 * sunVisibility));
      glowGrad.addColorStop(0.4, toCssRgb(layers.midSky, 0.15 * sunVisibility));
      glowGrad.addColorStop(1, toCssRgb(layers.upperSky, 0));

      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }

    // 2) Sun disc + coronas
    if (sunVisibility > 0.25 && sunElevation > -2) {
      ctx.save();
      ctx.translate(sunPos.x, sunPos.y);

      const baseRadius = height * 0.05;

      // Atmospheric flattening near horizon
      const flatten = Math.max(0.85, Math.min(1, (sunElevation + 5) / 15));
      ctx.scale(1, flatten);

      // Elevation-based color shift
      const t = clamp01(sunElevation / 10);
      const sunCore = mixColor([255, 245, 235], [255, 255, 250], t);
      const sunEdge = mixColor([255, 170, 100], [255, 230, 180], t);

      // Limb-darkened disc
      const discGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, baseRadius);
      discGrad.addColorStop(0, toCssRgb(sunCore, 0.95 * sunVisibility));
      discGrad.addColorStop(0.7, toCssRgb(sunCore, 0.85 * sunVisibility));
      discGrad.addColorStop(1, toCssRgb(sunEdge, 0.75 * sunVisibility));

      ctx.globalCompositeOperation = 'screen';
      ctx.filter = 'blur(0.9px)';

      ctx.fillStyle = discGrad;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.filter = 'none';

      // Inner corona (forward scattering)
      const innerCorona = ctx.createRadialGradient(0, 0, baseRadius * 0.6, 0, 0, baseRadius * 3);
      innerCorona.addColorStop(0, toCssRgb(sunEdge, 0.25 * sunVisibility));
      innerCorona.addColorStop(1, toCssRgb(sunEdge, 0));

      ctx.fillStyle = innerCorona;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 3, 0, Math.PI * 2);
      ctx.fill();

      // Outer atmospheric halo
      const outerCorona = ctx.createRadialGradient(0, 0, baseRadius * 2, 0, 0, baseRadius * 10);
      outerCorona.addColorStop(0, toCssRgb(layers.horizonBand, 0.12 * sunVisibility));
      outerCorona.addColorStop(1, toCssRgb(layers.upperSky, 0));

      ctx.fillStyle = outerCorona;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  };

  // ---- Main renderer ------------------------------------------------------

  const renderSkyGradient = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    layers: SkyLayerColors,
    state: SkyStateInput,
    time: number
  ) => {
    const { sunElevation, sunAzimuth } = state.astronomy;
    const { cloudCover, fogDensity } = state.weather;

    // 0) Hygiene: ensure canvas is the expected size (optional; do this outside if you prefer)
    // ctx.canvas.width = width; ctx.canvas.height = height;

    // 1) Base gradient
    {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, toCssRgb(layers.upperSky));
      gradient.addColorStop(0.55, toCssRgb(layers.midSky));
      gradient.addColorStop(1, toCssRgb(layers.horizonBand));

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    // 2) Stars (night only)
    drawStars(ctx, width, height, cloudCover, sunElevation, time);

    // 3) Moon
    drawMoon(ctx, width, height, state);

    // 4) Sun glow + disc
    drawSun(ctx, width, height, layers, sunAzimuth, sunElevation, cloudCover, fogDensity);

    // 5) Clouds (volumetric)
    // Pass horizon color so clouds can reflect sunrise/sunset
    drawVolumetricClouds(ctx, width, height, cloudCover, sunElevation, layers.horizonBand);

    // 6) Fog layer
    drawFogLayer(ctx, width, height, layers, fogDensity);

    // 7) Ground bounce (tie to sun elevation so it doesn’t glow at night)
    {
      const groundLight = clamp01((sunElevation + 2) / 12); // start contributing slightly before horizon
      const groundVisibility = groundLight * (1 - fogDensity);

      if (groundVisibility > 0.05) {
        const groundGrad = ctx.createLinearGradient(0, height, 0, height * 1);
        groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 1 * groundVisibility));
        groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 0));

        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, height * 0.85, width, height * 0.15);
      }
    }

    // 8) Fast dithering (overlay pattern)
    {
      const noise = getNoisePatternCanvas();
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';

      // Scale with weather (slightly), keep subtle to avoid visible texture
      const noiseStrength = 0.02 + fogDensity * 0.015 + cloudCover * 0.015;
      ctx.globalAlpha = noiseStrength;

      ctx.fillStyle = ctx.createPattern(noise, 'repeat')!;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  return { renderSkyGradient };
};

// Backward-compatible default export-like function if you want it:
// This creates a singleton renderer instance (still better than raw module globals).
const _singleton = createSkyRenderer();

/**
 * Backward compatible API: same signature as your original.
 * Prefer using `createSkyRenderer()` in new code.
 */
export const renderSkyGradient = _singleton.renderSkyGradient;
