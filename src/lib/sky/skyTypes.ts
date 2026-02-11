// skyTypes.ts

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
  windSpeed?: number;
  windDirection?: number; // degrees, 0 = north, 90 = east
  precipitationAmount?: number; // mm/h
  precipitationProbability?: number; // 0-1
  weatherCode?: number; // WMO weather code for precise intensity mapping
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