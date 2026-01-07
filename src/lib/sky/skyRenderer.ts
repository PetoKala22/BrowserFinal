// skyRenderer.ts
import { SkyLayerColors, SkyStateInput, Star } from './skyTypes';
import { toCssRgb, mixOklab } from './skyColor';
import { createStarField } from './skyStars';
import { drawVolumetricClouds } from './skyClouds';

export const createSkyRenderer = () => {
  let starData: Star[] = [];
  let starFieldW = 0;
  let starFieldH = 0;

  let noiseCanvas: HTMLCanvasElement | null = null;
  let starBuckets: Map<number, Star[]> | null = null;

  const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const deg2rad = (deg: number) => (deg * Math.PI) / 180;

  const mixColor = (c1: [number, number, number], c2: [number, number, number], t: number) => {
    return mixOklab(c1, c2, clamp01(t));
  };

  const getNoisePatternCanvas = () => {
    if (noiseCanvas) return noiseCanvas;

    const size = 128;
    noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = size;
    noiseCanvas.height = size;

    const nCtx = noiseCanvas.getContext('2d', { willReadFrequently: false })!;
    const idata = nCtx.createImageData(size, size);
    const data = idata.data;

    const amplitude = 14;
    for (let i = 0; i < data.length; i += 4) {
      const n = 128 + (Math.random() - 0.5) * 2 * amplitude;
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

  const getCelestialPosition = (width: number, height: number, azimuth: number, elevation: number) => {
    const viewAzimuth = 180;
    const fov = 100;

    let azDelta = azimuth - viewAzimuth;
    if (azDelta > 180) azDelta -= 360;
    if (azDelta < -180) azDelta += 360;

    const x = width / 2 + (azDelta / (fov / 2)) * (width / 2);

    const horizonY = height * 0.6;
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

      starBuckets = new Map();
      for (const s of starData) {
        const key = s.size;
        const arr = starBuckets.get(key);
        if (arr) arr.push(s);
        else starBuckets.set(key, [s]);
      }
    }
  };

  const drawMoon = (ctx: CanvasRenderingContext2D, width: number, height: number, state: SkyStateInput) => {
    const { moonElevation, moonPhase } = state.astronomy;
    const moonAzimuth = (state.astronomy.sunAzimuth + 180) % 360;

    if (moonElevation < -5) return;

    const pos = getCelestialPosition(width, height, moonAzimuth, moonElevation);
    const radius = Math.min(width, height) * 0.04;
    const margin = radius * 6;
    if (isOffscreen(pos.x, pos.y, width, height, margin)) return;

    const phase = ((moonPhase % 1) + 1) % 1;
    const illuminated = 1 - Math.abs(phase - 0.5) * 2;

    ctx.save();
    ctx.translate(pos.x, pos.y);

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

    ctx.fillStyle = '#E6E8F0';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    const waxing = phase < 0.5;
    const terminatorOffset = (1 - illuminated) * radius;

    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = 'rgba(10, 14, 30, 0.88)';

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
    moonPhase: number,
    time: number
  ) => {
    const cloudVisibilityFactor = Math.max(0, 1 - cloudCover * 1.2);
    if (sunElevation >= 5 || cloudVisibilityFactor <= 0.01) return;

    ensureStarField(width, height);

    const nightDarkness = clamp01((-sunElevation + 5) / 10);

    // Moon washes out stars.
    const phase = ((moonPhase % 1) + 1) % 1;
    const moonBrightness = clamp01(1 - Math.abs(phase - 0.5) * 2);
    const moonDimming = 1 - moonBrightness * 0.6;

    const starGlobalAlpha = nightDarkness * cloudVisibilityFactor * moonDimming;
    if (starGlobalAlpha <= 0.01) return;

    const horizonStart = height * 0.58;
    const horizonEnd = height * 0.92;
    const horizonRange = Math.max(1, horizonEnd - horizonStart);

    ctx.save();
    ctx.fillStyle = '#FFFFFF';

    if (starBuckets) {
      for (const [size, bucket] of starBuckets.entries()) {
        for (const star of bucket) {
          const twinkle = Math.sin(time * star.speed + star.phase);
          const alphaTwinkle = 0.7 + 0.3 * twinkle;

          const hf = clamp01((star.y - horizonStart) / horizonRange);
          const horizonFade = 1 - hf * hf;

          const alpha = star.baseAlpha * alphaTwinkle * starGlobalAlpha * horizonFade;
          if (alpha <= 0.003) continue;

          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(star.x, star.y, size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else {
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

    const sunVisibility = Math.max(0.1, 1 - cloudCover);
    const scatter = Math.max(1, 1 + fogDensity * 2 + cloudCover);
    const glowRadius = Math.min(width, height) * 0.9 * scatter;

    if (isOffscreen(sunPos.x, sunPos.y, width, height, glowRadius)) return;

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

    if (sunVisibility > 0.25 && sunElevation > -2) {
      ctx.save();
      ctx.translate(sunPos.x, sunPos.y);

      const baseRadius = height * 0.05;
      const flatten = Math.max(0.85, Math.min(1, (sunElevation + 5) / 15));
      ctx.scale(1, flatten);

      const t = clamp01(sunElevation / 10);
      const sunCore = mixColor([255, 245, 235], [255, 255, 250], t);
      const sunEdge = mixColor([255, 170, 100], [255, 230, 180], t);

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

      const innerCorona = ctx.createRadialGradient(0, 0, baseRadius * 0.6, 0, 0, baseRadius * 3);
      innerCorona.addColorStop(0, toCssRgb(sunEdge, 0.25 * sunVisibility));
      innerCorona.addColorStop(1, toCssRgb(sunEdge, 0));

      ctx.fillStyle = innerCorona;
      ctx.beginPath();
      ctx.arc(0, 0, baseRadius * 3, 0, Math.PI * 2);
      ctx.fill();

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

    {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, toCssRgb(layers.upperSky));
      gradient.addColorStop(0.55, toCssRgb(layers.midSky));
      gradient.addColorStop(1, toCssRgb(layers.horizonBand));

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    drawStars(ctx, width, height, cloudCover, sunElevation, state.astronomy.moonPhase, time);
    drawMoon(ctx, width, height, state);
    drawSun(ctx, width, height, layers, sunAzimuth, sunElevation, cloudCover, fogDensity);

    drawVolumetricClouds(ctx, width, height, cloudCover, sunElevation, layers.horizonBand);
    drawFogLayer(ctx, width, height, layers, fogDensity);

    {
      const groundLight = clamp01((sunElevation + 2) / 12);
      const groundVisibility = groundLight * (1 - fogDensity);

      if (groundVisibility > 0.05) {
        const groundGrad = ctx.createLinearGradient(0, height, 0, height * 1);
        groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 1 * groundVisibility));
        groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 0));

        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, height * 0.85, width, height * 0.15);
      }
    }

    {
      const noise = getNoisePatternCanvas();
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';

      const noiseStrength = 0.02 + fogDensity * 0.015 + cloudCover * 0.015;
      ctx.globalAlpha = noiseStrength;

      ctx.fillStyle = ctx.createPattern(noise, 'repeat')!;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  };

  return { renderSkyGradient };
};

const _singleton = createSkyRenderer();
export const renderSkyGradient = _singleton.renderSkyGradient;
