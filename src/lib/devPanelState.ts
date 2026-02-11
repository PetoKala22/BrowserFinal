import { useEffect, useState } from 'react';

type DevPanelTimeState = {
  enabled: boolean;
  hour: number;
  minute: number;
  second: number;
};

type DevPanelWeatherState = {
  enabled: boolean;
  location: string;
  temperature: number;
  high: number;
  low: number;
  code: number;
  cloudCover: number;
  visibility: number;
  fogDensity: number;
  windSpeed: number;
  precipitation: 'none' | 'rain' | 'snow' | 'storm';
  sunrise: string;
  sunset: string;
  season: 'winter' | 'spring' | 'summer' | 'autumn';
};

export type DevPanelState = {
  time: DevPanelTimeState;
  weather: DevPanelWeatherState;
};

const STORAGE_KEY = 'newtab-dev-panel-v1';
const EVENT_NAME = 'dev-panel-state-changed';

const DEFAULT_STATE: DevPanelState = {
  time: {
    enabled: false,
    hour: 12,
    minute: 0,
    second: 0
  },
  weather: {
    enabled: false,
    location: 'Developer City',
    temperature: 22,
    high: 26,
    low: 18,
    code: 0,
    cloudCover: 0.2,
    visibility: 12,
    fogDensity: 0.2,
    windSpeed: 10,
    precipitation: 'none',
    sunrise: '06:30',
    sunset: '19:30',
    season: 'summer'
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeState = (state: Partial<DevPanelState> | null): DevPanelState => {
  const time = (state?.time ?? {}) as Partial<DevPanelTimeState>;
  const weather = (state?.weather ?? {}) as Partial<DevPanelWeatherState>;
  const normalizeTime = (value: unknown, fallback: string) => {
    if (typeof value !== 'string') return fallback;
    return /^\d{2}:\d{2}$/.test(value) ? value : fallback;
  };
  const normalizePrecipitation = (value: unknown) => {
    if (value === 'rain' || value === 'snow' || value === 'storm' || value === 'none') {
      return value;
    }
    return DEFAULT_STATE.weather.precipitation;
  };
  const normalizeSeason = (value: unknown) => {
    if (value === 'winter' || value === 'spring' || value === 'summer' || value === 'autumn') {
      return value;
    }
    return DEFAULT_STATE.weather.season;
  };
  return {
    time: {
      enabled: Boolean(time.enabled),
      hour: clamp(Number(time.hour ?? DEFAULT_STATE.time.hour), 0, 23),
      minute: clamp(Number(time.minute ?? DEFAULT_STATE.time.minute), 0, 59),
      second: clamp(Number(time.second ?? DEFAULT_STATE.time.second), 0, 59)
    },
    weather: {
      enabled: Boolean(weather.enabled),
      location: typeof weather.location === 'string'
        ? weather.location
        : DEFAULT_STATE.weather.location,
      temperature: Number.isFinite(weather.temperature)
        ? Number(weather.temperature)
        : DEFAULT_STATE.weather.temperature,
      high: Number.isFinite(weather.high)
        ? Number(weather.high)
        : DEFAULT_STATE.weather.high,
      low: Number.isFinite(weather.low)
        ? Number(weather.low)
        : DEFAULT_STATE.weather.low,
      code: clamp(
        Number.isFinite(weather.code) ? Number(weather.code) : DEFAULT_STATE.weather.code,
        0,
        99
      ),
      cloudCover: clamp(
        Number.isFinite(weather.cloudCover)
          ? Number(weather.cloudCover)
          : DEFAULT_STATE.weather.cloudCover,
        0,
        1
      ),
      visibility: clamp(
        Number.isFinite(weather.visibility)
          ? Number(weather.visibility)
          : DEFAULT_STATE.weather.visibility,
        0.5,
        50
      ),
      fogDensity: clamp(
        Number.isFinite(weather.fogDensity)
          ? Number(weather.fogDensity)
          : DEFAULT_STATE.weather.fogDensity,
        0,
        1
      ),
      windSpeed: clamp(
        Number.isFinite((weather as any).windSpeed) ? Number((weather as any).windSpeed) : DEFAULT_STATE.weather.windSpeed,
        0,
        200
      ),
      precipitation: normalizePrecipitation(weather.precipitation),
      sunrise: normalizeTime(weather.sunrise, DEFAULT_STATE.weather.sunrise),
      sunset: normalizeTime(weather.sunset, DEFAULT_STATE.weather.sunset),
      season: normalizeSeason(weather.season)
    }
  };
};

export const loadDevPanelState = (): DevPanelState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return normalizeState(JSON.parse(raw));
  } catch {
    return DEFAULT_STATE;
  }
};

const emitChange = () => {
  window.dispatchEvent(new CustomEvent(EVENT_NAME));
};

export const saveDevPanelState = (state: DevPanelState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  emitChange();
};

type DevPanelStatePatch = {
  time?: Partial<DevPanelTimeState>;
  weather?: Partial<DevPanelWeatherState>;
};

export const updateDevPanelState = (patch: DevPanelStatePatch) => {
  const current = loadDevPanelState();
  const next: DevPanelState = normalizeState({
    ...current,
    ...patch,
    time: { ...current.time, ...patch.time },
    weather: { ...current.weather, ...patch.weather }
  });
  saveDevPanelState(next);
};

export const resetDevPanelState = () => {
  saveDevPanelState(DEFAULT_STATE);
};

export const useDevPanelState = () => {
  const [state, setState] = useState<DevPanelState>(() => loadDevPanelState());

  useEffect(() => {
    const handle = () => setState(loadDevPanelState());
    window.addEventListener(EVENT_NAME, handle);
    return () => window.removeEventListener(EVENT_NAME, handle);
  }, []);

  return state;
};

export const useDevTime = () => {
  const { time } = useDevPanelState();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (time.enabled) {
      const base = new Date();
      base.setHours(time.hour, time.minute, time.second, 0);
      setNow(base);
      return;
    }

    let raf: number;
    const tick = () => {
      setNow(new Date());
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [time.enabled, time.hour, time.minute, time.second]);

  return now;
};
