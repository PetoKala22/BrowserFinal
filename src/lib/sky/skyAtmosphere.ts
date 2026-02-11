// src/lib/sky/skyAtmosphere.ts
import { SkyLayerColors } from './skyTypes';
import { toCssRgb } from './skyColor';
import { SunScreenPos } from './skyView';
import { clamp01, mixColor } from './skyUtils';

// ----------------------------
// Atmosphere: fog + stratus + optional lining
// ----------------------------
export const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  fogDensity: number,
  cloudCover: number,
  sunElevation: number,
  sunPos?: SunScreenPos,
  sunVisibility?: number,
  lightningEffect?: { intensity: number; centers: { x: number; y: number; intensity: number }[]; radius: number; color?: string }
) => {
  // REMOVED: Stratus cloud gradient - now using WebGL volumetric clouds
  /*
  const baseCloudColor = layers.horizonBand;

  const denseCloudColor = mixColor(layers.midSky, [0.78, 0.82, 0.9], 0.55);
  const lightIntensity = clamp01((sunElevation + 10) / 30);

  const dayCloud = mixColor(baseCloudColor, [1, 1, 1], 0.55);
  const nightCloud = mixColor([0.08, 0.08, 0.12], baseCloudColor, 0.45);

  let effectiveCloudColor = mixColor(nightCloud, dayCloud, lightIntensity);
  const coverageBias = Math.pow(clamp01(cloudCover), 1.2);
  effectiveCloudColor = mixColor(effectiveCloudColor, denseCloudColor, coverageBias);
  */

  // Fog
  if (fogDensity > 0.01) {
    const fogHeight = height * (0.2 + fogDensity * 0.8);
    const fogGrad = ctx.createLinearGradient(0, height, 0, height - fogHeight);
    // If lightning is present, temporarily boost fog alpha near peak
    const fogBoost = lightningEffect ? Math.min(1, lightningEffect.intensity * 1.2) : 0
    fogGrad.addColorStop(0, toCssRgb(layers.horizonBand, Math.min(1, fogDensity + fogBoost * 0.65)));
    fogGrad.addColorStop(1, toCssRgb(layers.horizonBand, 0));
    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, height - fogHeight, width, fogHeight);
  }

  // Stratus - REMOVED: Now using WebGL volumetric clouds instead
  /*
  if (cloudCover > 0.01) {
    const cloudGrad = ctx.createLinearGradient(0, 0, 0, height * 0.85);
    let alphaTop = Math.min(1, cloudCover * 1.5);
    let alphaMid = Math.min(1, cloudCover * 1.05);
    let alphaBottom = Math.min(1, cloudCover * 0.8);

    // Brighten clouds when lightning flash is active
    if (lightningEffect && lightningEffect.intensity > 0.01) {
      const boost = lightningEffect.intensity * 1.6
      alphaTop = Math.min(1, alphaTop + boost * 1.0)
      alphaMid = Math.min(1, alphaMid + boost * 0.7)
      alphaBottom = Math.min(1, alphaBottom + boost * 0.35)
    }

    cloudGrad.addColorStop(0, toCssRgb(effectiveCloudColor, alphaTop));
    cloudGrad.addColorStop(0.45, toCssRgb(effectiveCloudColor, alphaMid * 0.7));
    cloudGrad.addColorStop(1, toCssRgb(layers.horizonBand, alphaBottom * 0.12));

    ctx.fillStyle = cloudGrad;
    ctx.fillRect(0, 0, width, height);

    // Lightning bloom over clouds (sampled so glow follows bolt curve)
    if (lightningEffect && lightningEffect.intensity > 0.01 && lightningEffect.centers?.length) {
      const le = lightningEffect
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = Math.min(1, le.intensity * 0.9)

      for (const c of le.centers) {
        const sampleRadius = le.radius * (0.35 + 0.75 * clamp01(c.intensity))
        const rg = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, sampleRadius)
        rg.addColorStop(0, toCssRgb([1, 1, 1], Math.min(0.9, c.intensity * 0.9)))
        rg.addColorStop(0.2, le.color ?? toCssRgb([0.7, 0.85, 1], Math.min(0.6, c.intensity * 0.7)))
        rg.addColorStop(1, toCssRgb(layers.horizonBand, 0))

        ctx.fillStyle = rg
        // Slightly vary alpha per sample so overlapping yields natural falloff
        ctx.globalAlpha = Math.min(1, le.intensity * 0.9 * clamp01(c.intensity * 1.1))
        ctx.fillRect(c.x - sampleRadius, c.y - sampleRadius, sampleRadius * 2, sampleRadius * 2)
      }

      ctx.restore()
    }
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
  */
};
