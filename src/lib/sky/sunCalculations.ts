/**
 * Sun rendering calculations: color, extinction, elevation mapping
 */

import type { Rgb } from './skyColor';
import { mixColor, smoothstep, lerp, clamp01 } from './skyUtils';
import type { SkyLayerColors } from './skyTypes';
import { SUN } from './sunConstants';

const luminance = (c: Rgb) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export const sampleSkyColorAtY = (layers: SkyLayerColors, y01: number): Rgb => {
  const t = clamp01(y01);
  if (t <= 0.55) return mixColor(layers.upperSky, layers.midSky, t / 0.55);
  return mixColor(layers.midSky, layers.horizonBand, (t - 0.55) / 0.45);
};

export interface SunColorParams {
  sunElevation: number;
  extinction: number;
  layers: SkyLayerColors;
  sunPos: { x: number; y: number };
}

export interface SunColorResult {
  elevT: number;
  extinction: number;
  discRadius: number;
  squash: number;
  finalSunRGB: Rgb;
  skyLum: number;
  discToneScale: number;
  discBaseAlpha: number;
  haloRadius: number;
}

/**
 * Calculate sun color, extinction, and tone based on elevation and atmosphere
 */
export const calculateSunColor = (
  height: number,
  sunElevation: number,
  extinction: number,
  cloudCover: number,
  fogDensity: number,
  sunVisibility: number,
  layers: SkyLayerColors,
  sunPos: { x: number; y: number }
): SunColorResult => {
  // More realistic elevation mapping
  const elevT = smoothstep(-2, 10, sunElevation);

  // Refraction squash: strong only very near horizon
  const squash = lerp(SUN.squashMin, 1.0, Math.pow(extinction, SUN.squashPow));

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

  // Sky luminance at sun for SDR tone scaling
  const skyAtSun = sampleSkyColorAtY(layers, sunPos.y / Math.max(1, height));
  const skyLum = luminance(skyAtSun);
  const discToneScale = lerp(1.15, 0.55, smoothstep(0.35, 0.92, skyLum));

  // Visibility/alpha (night/day blend + SDR clamp)
  const discBaseAlpha = 0.95 * sunVisibility * elevT * discToneScale;

  // Apparent disc radius: slightly smaller near horizon
  const baseRadius = height * SUN.discRadiusFrac;
  const discRadius = baseRadius * lerp(0.6, 1.0, extinction);

  // Halo radius grows with clouds/fog
  const haloRadius =
    discRadius * (SUN.haloBase + cloudCover * SUN.haloCloudK + fogDensity * SUN.haloFogK);

  return {
    elevT,
    extinction,
    discRadius,
    squash,
    finalSunRGB,
    skyLum,
    discToneScale,
    discBaseAlpha,
    haloRadius
  };
};
