import { SkyLayerColors, SkyStateInput } from './skyTypes';
import { adjustOklab, mixOklab, clampRgb } from './skyColor';

type Rgb = [number, number, number];

const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
};

const blendLayers = (a: SkyLayerColors, b: SkyLayerColors, t: number): SkyLayerColors => ({
  upperSky: mixOklab(a.upperSky, b.upperSky, t),
  midSky: mixOklab(a.midSky, b.midSky, t),
  horizonBand: mixOklab(a.horizonBand, b.horizonBand, t),
  groundBounce: mixOklab(a.groundBounce, b.groundBounce, t)
});

const PALETTES: Record<string, SkyLayerColors> = {
  day: {
    upperSky: [0.32, 0.56, 0.93],
    midSky: [0.46, 0.68, 0.95],
    horizonBand: [0.8, 0.86, 0.94],
    groundBounce: [0.26, 0.38, 0.52]
  },
  golden: {
    upperSky: [0.36, 0.52, 0.88],
    midSky: [0.55, 0.64, 0.86],
    horizonBand: [0.96, 0.74, 0.53],
    groundBounce: [0.35, 0.32, 0.4]
  },
  sunset: {
    upperSky: [0.18, 0.28, 0.5],
    midSky: [0.42, 0.34, 0.62],
    horizonBand: [0.95, 0.56, 0.38],
    groundBounce: [0.22, 0.2, 0.32]
  },
  night: {
    upperSky: [0.06, 0.1, 0.22],
    midSky: [0.1, 0.14, 0.28],
    horizonBand: [0.22, 0.2, 0.3],
    groundBounce: [0.08, 0.1, 0.16]
  }
};

const SEASON_TINT: Record<SkyStateInput['environment']['season'], Rgb> = {
  winter: [0.84, 0.9, 0.98],
  spring: [0.78, 0.9, 0.82],
  summer: [0.92, 0.86, 0.74],
  autumn: [0.9, 0.78, 0.68]
};

const applySeason = (layers: SkyLayerColors, season: SkyStateInput['environment']['season']) => {
  const tint = SEASON_TINT[season];
  return {
    upperSky: mixOklab(layers.upperSky, tint, 0.05),
    midSky: mixOklab(layers.midSky, tint, 0.06),
    horizonBand: mixOklab(layers.horizonBand, tint, 0.08),
    groundBounce: mixOklab(layers.groundBounce, tint, 0.1)
  };
};

const applyClouds = (layers: SkyLayerColors, cloudCover: number) => {
  const cloud = clamp(cloudCover);
  const saturation = 1 - cloud * 0.5;
  const lShift = -cloud * 0.05;
  const soften = cloud * 0.3;
  return {
    upperSky: mixOklab(adjustOklab(layers.upperSky, lShift, saturation), layers.midSky, soften),
    midSky: mixOklab(adjustOklab(layers.midSky, lShift, saturation), layers.horizonBand, soften),
    horizonBand: adjustOklab(layers.horizonBand, lShift * 0.5, saturation),
    groundBounce: adjustOklab(layers.groundBounce, lShift * 0.3, saturation)
  };
};

const applyFog = (layers: SkyLayerColors, fogDensity: number) => {
  const fog = clamp(fogDensity);
  const horizon = layers.horizonBand;
  return {
    upperSky: adjustOklab(mixOklab(layers.upperSky, horizon, fog * 0.4), fog * 0.06, 1 - fog * 0.3),
    midSky: adjustOklab(mixOklab(layers.midSky, horizon, fog * 0.5), fog * 0.06, 1 - fog * 0.3),
    horizonBand: adjustOklab(horizon, fog * 0.08, 1 - fog * 0.25),
    groundBounce: adjustOklab(mixOklab(layers.groundBounce, horizon, fog * 0.4), fog * 0.05, 1 - fog * 0.3)
  };
};

const applyStorm = (layers: SkyLayerColors, intensity: number) => {
  const storm = clamp(intensity);
  const tint: Rgb = [0.38, 0.43, 0.48];
  return {
    upperSky: adjustOklab(mixOklab(layers.upperSky, tint, storm * 0.6), -storm * 0.1, 1 - storm * 0.4),
    midSky: adjustOklab(mixOklab(layers.midSky, tint, storm * 0.6), -storm * 0.1, 1 - storm * 0.4),
    horizonBand: adjustOklab(mixOklab(layers.horizonBand, tint, storm * 0.5), -storm * 0.08, 1 - storm * 0.35),
    groundBounce: adjustOklab(mixOklab(layers.groundBounce, tint, storm * 0.5), -storm * 0.08, 1 - storm * 0.35)
  };
};

const dampenHorizon = (
  layers: SkyLayerColors,
  sunElevation: number,
  cloudCover: number,
  fogDensity: number
) => {
  const elevationFactor = smoothstep(2, 12, sunElevation);
  const cloud = clamp(cloudCover);
  const fog = clamp(fogDensity);
  const reduction = clamp(elevationFactor * 0.45 + cloud * 0.35 + fog * 0.4);
  if (reduction <= 0) return layers;
  return {
    upperSky: layers.upperSky,
    midSky: mixOklab(layers.midSky, layers.upperSky, reduction * 0.1),
    horizonBand: mixOklab(layers.horizonBand, layers.midSky, reduction),
    groundBounce: mixOklab(layers.groundBounce, layers.midSky, reduction * 0.2)
  };
};

const applyMoonlight = (layers: SkyLayerColors, moonElevation: number, moonPhase: number) => {
  const elevationFactor = clamp(moonElevation / 90);
  const phase = clamp(moonPhase);
  const intensity = elevationFactor * (0.2 + 0.8 * phase);
  if (intensity <= 0) return layers;
  return {
    upperSky: adjustOklab(layers.upperSky, intensity * 0.08, 1 + intensity * 0.05),
    midSky: adjustOklab(layers.midSky, intensity * 0.06, 1 + intensity * 0.04),
    horizonBand: adjustOklab(layers.horizonBand, intensity * 0.03, 1 + intensity * 0.02),
    groundBounce: adjustOklab(layers.groundBounce, intensity * 0.02, 1 + intensity * 0.02)
  };
};

export const computeSkyLayers = (state: SkyStateInput): SkyLayerColors => {
  const sunElevation = state.astronomy.sunElevation;
  const dayBlend = smoothstep(0, 15, sunElevation);
  const duskBlend = smoothstep(-6, 0, sunElevation);
  const nightBlend = smoothstep(-12, -6, sunElevation);

  const goldenToDay = blendLayers(PALETTES.golden, PALETTES.day, dayBlend);
  const sunsetToGolden = blendLayers(PALETTES.sunset, PALETTES.golden, duskBlend);
  const nightToSunset = blendLayers(PALETTES.night, PALETTES.sunset, nightBlend);

  let base: SkyLayerColors;
  if (sunElevation >= 0) {
    base = goldenToDay;
  } else if (sunElevation >= -6) {
    base = sunsetToGolden;
  } else {
    base = nightToSunset;
  }

  base = applySeason(base, state.environment.season);
  base = applyClouds(base, state.weather.cloudCover);

  const stormIntensity = state.weather.precipitation === 'storm' ? 1 : state.weather.cloudCover * 0.4;
  base = applyStorm(base, stormIntensity);
  base = applyFog(base, state.weather.fogDensity);
  base = dampenHorizon(
    base,
    state.astronomy.sunElevation,
    state.weather.cloudCover,
    state.weather.fogDensity
  );

  if (sunElevation < -6) {
    base = applyMoonlight(base, state.astronomy.moonElevation, state.astronomy.moonPhase);
  }

  return {
    upperSky: clampRgb(base.upperSky),
    midSky: clampRgb(base.midSky),
    horizonBand: clampRgb(base.horizonBand),
    groundBounce: clampRgb(base.groundBounce)
  };
};
