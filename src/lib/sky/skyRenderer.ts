// skyRenderer.ts
import { SkyLayerColors, SkyStateInput } from './skyTypes';
import { toCssRgb } from './skyColor';
import { clamp01 } from './skyUtils';
import { getSunScreenPosition } from './skyView';
import { drawSunDisc } from './skySun';
import { drawAtmosphere } from './skyAtmosphere';
import { overlayNoise } from './skyNoise';
import { drawStars } from './skyStarRenderer';
import { drawThunderstormWithEffect } from './skyLightning';

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
): { lightningEffect: any } => {
  ctx.clearRect(0, 0, width, height);

  const { sunElevation, sunAzimuth } = state.astronomy;
  const cloudCover = clamp01(state.weather.cloudCover);
  const fogDensity = clamp01(state.weather.fogDensity);
  const windSpeed = state.weather.windSpeed ?? 0;

  // 1) Base sky gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, toCssRgb(layers.upperSky));
  gradient.addColorStop(0.55, toCssRgb(layers.midSky));
  gradient.addColorStop(1, toCssRgb(layers.horizonBand));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const hasSunGlow = sunElevation > -18;
  const sunPos = hasSunGlow ? getSunScreenPosition(width, height, sunAzimuth, sunElevation) : undefined;

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

      // Sun disc (pass windSpeed to influence cloud motion)
      drawSunDisc(
        ctx,
        width,
        height,
        layers,
        sunPos,
        sunElevation,
        sunVisibility,
        cloudCover,
        fogDensity,
        time,
        windSpeed
      );
    }
  }

  // 3.5) Stars (before atmosphere so stars glow through clouds realistically)
  drawStars(ctx, width, height, sunElevation, cloudCover, time);

  // 4) Lightning (only during explicit storms)
  const isStorm = state.weather.precipitation === 'storm';
  const stormIntensity = isStorm ? 1 : 0;
  let lightningEffect = null;
  if (isStorm) {
    lightningEffect = drawThunderstormWithEffect(ctx, width, height, stormIntensity, layers.midSky, time);
  }

  // 5) Atmosphere over sky/sun/stars/lightning
  drawAtmosphere(ctx, width, height, layers, fogDensity, cloudCover, sunElevation, sunPos, sunVisibility, lightningEffect);

  // 6) Ground bounce
  const groundVisibility = Math.max(0, 1 - fogDensity);
  if (groundVisibility > 0.05) {
    const groundGrad = ctx.createLinearGradient(0, height * 1, 0, height);
    groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 0));
    groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 1 * groundVisibility));
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, height * 0.85, width, height * 0.15);
  }

  return { lightningEffect };
};
