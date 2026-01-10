// cloudTypes.ts
// Different cloud configurations based on weather conditions

export interface CloudTypeConfig {
  // Size and shape parameters
  sizeScale: number; // Overall cloud size multiplier (affects both horizontal and vertical)
  shapeScale: number; // How stretched/tall clouds are (vertical scale)
  densityScale: number; // Overall cloud density multiplier
  detailScale: number; // Detail noise scale
  coverageBias: number; // Bias toward more/less coverage

  // Movement and animation
  windSpeedMultiplier: number; // How much wind affects cloud movement
  turbulence: number; // Random movement turbulence

  // Lighting and appearance
  brightnessMultiplier: number; // Overall brightness
  contrastMultiplier: number; // Contrast between light/dark areas
  saturationMultiplier: number; // Color saturation

  // Special effects
  anvilClouds: boolean; // Tall thunderstorm anvil clouds
  wispyEdges: boolean; // Soft, wispy cloud edges
  layeredEffect: boolean; // Multiple cloud layers
}

export type CloudType =
  | 'clear'
  | 'few_clouds'
  | 'scattered'
  | 'broken'
  | 'overcast'
  | 'light_rain'
  | 'moderate_rain'
  | 'heavy_rain'
  | 'light_snow'
  | 'moderate_snow'
  | 'heavy_snow'
  | 'thunderstorm'
  | 'fog'
  | 'mist';

// Cloud type configurations based on WMO weather codes and conditions
export const CLOUD_TYPE_CONFIGS: Record<CloudType, CloudTypeConfig> = {
  clear: {
    sizeScale: 1.0,
    densityScale: 0.0,
    shapeScale: 1.0,
    detailScale: 1.0,
    coverageBias: -1.0,
    windSpeedMultiplier: 1.0,
    turbulence: 0.1,
    brightnessMultiplier: 1.2,
    contrastMultiplier: 0.8,
    saturationMultiplier: 1.1,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: false
  },

  few_clouds: {
    sizeScale: 0.9,
    densityScale: 0.1,
    shapeScale: 1.2,
    detailScale: 1.1,
    coverageBias: -0.7,
    windSpeedMultiplier: 1.1,
    turbulence: 0.2,
    brightnessMultiplier: 1.1,
    contrastMultiplier: 0.9,
    saturationMultiplier: 1.0,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: false
  },

  scattered: {
    sizeScale: 0.8,
    densityScale: 0.5,
    shapeScale: 1.4,
    detailScale: 1.2,
    coverageBias: 0.0,
    windSpeedMultiplier: 1.2,
    turbulence: 0.3,
    brightnessMultiplier: 1.0,
    contrastMultiplier: 1.0,
    saturationMultiplier: 0.95,
    anvilClouds: false,
    wispyEdges: false,
    layeredEffect: false
  },

  broken: {
    sizeScale: 0.7,
    densityScale: 0.7,
    shapeScale: 1.6,
    detailScale: 1.3,
    coverageBias: 0.3,
    windSpeedMultiplier: 1.3,
    turbulence: 0.4,
    brightnessMultiplier: 0.9,
    contrastMultiplier: 1.1,
    saturationMultiplier: 0.9,
    anvilClouds: false,
    wispyEdges: false,
    layeredEffect: true
  },

  overcast: {
    sizeScale: 0.3,
    densityScale: 0.9,
    shapeScale: 1.8,
    detailScale: 1.4,
    coverageBias: 0.6,
    windSpeedMultiplier: 1.4,
    turbulence: 0.5,
    brightnessMultiplier: 0.7,
    contrastMultiplier: 1.2,
    saturationMultiplier: 0.8,
    anvilClouds: false,
    wispyEdges: false,
    layeredEffect: true
  },

  light_rain: {
    sizeScale: 0.5,
    densityScale: 0.8,
    shapeScale: 2.0,
    detailScale: 1.5,
    coverageBias: 0.4,
    windSpeedMultiplier: 1.5,
    turbulence: 0.6,
    brightnessMultiplier: 0.6,
    contrastMultiplier: 1.3,
    saturationMultiplier: 0.7,
    anvilClouds: false,
    wispyEdges: false,
    layeredEffect: true
  },

  moderate_rain: {
    sizeScale: 0.4,
    densityScale: 0.9,
    shapeScale: 2.2,
    detailScale: 1.6,
    coverageBias: 0.5,
    windSpeedMultiplier: 1.6,
    turbulence: 0.7,
    brightnessMultiplier: 0.5,
    contrastMultiplier: 1.4,
    saturationMultiplier: 0.6,
    anvilClouds: false,
    wispyEdges: false,
    layeredEffect: true
  },

  heavy_rain: {
    sizeScale: 0.3,
    densityScale: 1.0,
    shapeScale: 2.5,
    detailScale: 1.7,
    coverageBias: 0.7,
    windSpeedMultiplier: 1.8,
    turbulence: 0.8,
    brightnessMultiplier: 0.4,
    contrastMultiplier: 1.5,
    saturationMultiplier: 0.5,
    anvilClouds: false,
    wispyEdges: false,
    layeredEffect: true
  },

  light_snow: {
    sizeScale: 0.6,
    densityScale: 0.6,
    shapeScale: 1.8,
    detailScale: 1.8,
    coverageBias: 0.2,
    windSpeedMultiplier: 0.8,
    turbulence: 0.3,
    brightnessMultiplier: 0.8,
    contrastMultiplier: 1.1,
    saturationMultiplier: 0.9,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: false
  },

  moderate_snow: {
    sizeScale: 0.45,
    densityScale: 0.8,
    shapeScale: 2.0,
    detailScale: 1.9,
    coverageBias: 0.4,
    windSpeedMultiplier: 0.7,
    turbulence: 0.4,
    brightnessMultiplier: 0.7,
    contrastMultiplier: 1.2,
    saturationMultiplier: 0.8,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: true
  },

  heavy_snow: {
    sizeScale: 0.35,
    densityScale: 1.0,
    shapeScale: 2.2,
    detailScale: 2.0,
    coverageBias: 0.6,
    windSpeedMultiplier: 0.6,
    turbulence: 0.5,
    brightnessMultiplier: 0.6,
    contrastMultiplier: 1.3,
    saturationMultiplier: 0.7,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: true
  },

  thunderstorm: {
    sizeScale: 0.2,
    densityScale: 1.1,
    shapeScale: 3.0,
    detailScale: 1.8,
    coverageBias: 0.8,
    windSpeedMultiplier: 2.0,
    turbulence: 1.0,
    brightnessMultiplier: 0.3,
    contrastMultiplier: 1.6,
    saturationMultiplier: 0.4,
    anvilClouds: true,
    wispyEdges: false,
    layeredEffect: true
  },

  fog: {
    sizeScale: 0.9,
    densityScale: 0.4,
    shapeScale: 0.8,
    detailScale: 0.8,
    coverageBias: 0.1,
    windSpeedMultiplier: 0.3,
    turbulence: 0.1,
    brightnessMultiplier: 0.9,
    contrastMultiplier: 0.7,
    saturationMultiplier: 0.8,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: false
  },

  mist: {
    sizeScale: 1.0,
    densityScale: 0.2,
    shapeScale: 0.6,
    detailScale: 0.6,
    coverageBias: -0.2,
    windSpeedMultiplier: 0.2,
    turbulence: 0.05,
    brightnessMultiplier: 1.0,
    contrastMultiplier: 0.6,
    saturationMultiplier: 0.9,
    anvilClouds: false,
    wispyEdges: true,
    layeredEffect: false
  }
};

// Determine cloud type based on weather conditions
export function determineCloudType(weather: {
  weatherCode?: number;
  cloudCover: number;
  precipitation: 'none' | 'rain' | 'snow' | 'storm';
  precipitationAmount?: number;
  fogDensity: number;
  visibility: number;
}): CloudType {
  const { weatherCode, cloudCover, precipitation, precipitationAmount, fogDensity, visibility } = weather;

  // Handle fog/mist conditions first
  if (fogDensity > 0.6 || visibility < 2) {
    return visibility < 1 ? 'fog' : 'mist';
  }

  // Handle thunderstorm
  if (precipitation === 'storm' || (weatherCode && weatherCode >= 95)) {
    return 'thunderstorm';
  }

  // Handle precipitation
  if (precipitation === 'rain') {
    const amount = precipitationAmount || 0;
    if (amount > 7) return 'heavy_rain';
    if (amount > 2.5) return 'moderate_rain';
    return 'light_rain';
  }

  if (precipitation === 'snow') {
    const amount = precipitationAmount || 0;
    if (amount > 5) return 'heavy_snow';
    if (amount > 1) return 'moderate_snow';
    return 'light_snow';
  }

  // Prioritize weather codes for cloud type determination
  if (weatherCode === 3) return 'overcast'; // Overcast
  if (weatherCode && weatherCode >= 80 && weatherCode <= 82) return 'light_rain'; // Showers
  if (weatherCode && weatherCode >= 85 && weatherCode <= 86) return 'light_snow'; // Snow showers

  // Handle clear/cloudy conditions based on cloud cover
  if (cloudCover < 0.2) return 'clear';
  if (cloudCover < 0.4) return 'few_clouds';
  if (cloudCover < 0.6) return 'scattered';
  if (cloudCover < 0.8) return 'broken';
  return 'overcast';
}