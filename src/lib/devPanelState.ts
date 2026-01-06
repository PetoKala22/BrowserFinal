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
    code: 0
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const normalizeState = (state: Partial<DevPanelState> | null): DevPanelState => {
  const time = state?.time ?? {};
  const weather = state?.weather ?? {};
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
      )
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

export const updateDevPanelState = (patch: Partial<DevPanelState>) => {
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
