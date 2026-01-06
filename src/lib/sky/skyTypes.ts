// skyTypes.ts

export type Star = {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;    // Starting offset for the twinkle
  speed: number;    // Frequency of the twinkle
};

export type SkyTimeInput = {
  localTime: string;
  sunrise: string;
  sunset: string;
};

export type SkyAstronomyInput = {
  sunElevation: number;
  sunAzimuth: number;
  moonElevation: number;
  moonPhase: number;
};

export type SkyWeatherInput = {
  cloudCover: number;
  precipitation: 'none' | 'rain' | 'snow' | 'storm';
  fogDensity: number;
  visibility: number;
};

export type SkyEnvironmentInput = {
  latitude: number;
  longitude: number;
  season: 'winter' | 'spring' | 'summer' | 'autumn';
};

export type SkyStateInput = {
  time: SkyTimeInput;
  astronomy: SkyAstronomyInput;
  weather: SkyWeatherInput;
  environment: SkyEnvironmentInput;
};

export type SkyLayerColors = {
  upperSky: [number, number, number];
  midSky: [number, number, number];
  horizonBand: [number, number, number];
  groundBounce: [number, number, number];
};