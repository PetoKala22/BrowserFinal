// WeatherWidget.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WeatherLocation } from '@/lib/types';
import { useDevPanelState, useDevTime } from '@/lib/devPanelState';
import {
  estimateMoonElevation,
  estimateMoonPhase,
  getSunPosition,
  estimateSunriseSunset,
  getLocalTimeString,
  getSeason
} from '@/lib/sky/skyAstronomy';
import { SkyStateInput } from '@/lib/sky/skyTypes';
import {
  WiDaySunny,
  WiDaySunnyOvercast,
  WiCloudy,
  WiFog,
  WiRain,
  WiSnow,
  WiShowers,
  WiThunderstorm
} from 'react-icons/wi';
import { updateDevPanelState } from '@/lib/devPanelState';
import { SkyBackground } from './SkyBackground';
import { LuMapPin, LuSettings } from 'react-icons/lu';

/* ------------------ Weather Cache & Dedupe ------------------ */

const WEATHER_LOCATION_KEY = 'newtab-weather-location';

// 10 minutes is a sensible balance for a new tab widget.
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_CACHE_PREFIX = 'newtab-weather-cache-v1:';

// Avoid tight retry loops across remounts/StrictMode.
const WEATHER_THROTTLE_MS = 15 * 1000;

type CachedWeatherPayload = {
  cachedAt: number;
  state: Omit<WeatherState, 'sunrise' | 'sunset'> & {
    sunrise: string; // ISO
    sunset: string; // ISO
  };
};

// Module-level (survives StrictMode remounts in dev):
const inFlightByKey = new Map<string, Promise<WeatherState>>();
const lastFetchAtByKey = new Map<string, number>();

const makeWeatherKey = (lat: number, lon: number) =>
  `${WEATHER_CACHE_PREFIX}${lat.toFixed(5)},${lon.toFixed(5)}`;

const readCachedWeather = (key: string): WeatherState | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedWeatherPayload;
    if (!parsed?.cachedAt || !parsed?.state) return null;
    if (Date.now() - parsed.cachedAt > WEATHER_CACHE_TTL_MS) return null;

    return {
      ...parsed.state,
      sunrise: new Date(parsed.state.sunrise),
      sunset: new Date(parsed.state.sunset)
    };
  } catch {
    return null;
  }
};

const writeCachedWeather = (key: string, state: WeatherState) => {
  try {
    const payload: CachedWeatherPayload = {
      cachedAt: Date.now(),
      state: {
        ...state,
        sunrise: state.sunrise.toISOString(),
        sunset: state.sunset.toISOString()
      }
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
};

/* ------------------ Types ------------------ */

type WeatherState = {
  location: string;
  temperature: string;
  condition: string;
  highLow: string;
  code: number;
  sunrise: Date;
  sunset: Date;
  cloudCover: number;
  precipitation: 'none' | 'rain' | 'snow' | 'storm';
  fogDensity: number;
  // mm of precipitation per hour (when available)
  precipitationAmount?: number;
  // wind speed in km/h
  windSpeed?: number;
  // precipitation probability (0-1)
  precipitationProbability?: number;
  visibility: number;
  latitude: number;
  longitude: number;
};

type WeatherWidgetProps = {
  location?: WeatherLocation | null;
};

const isValidLocation = (value: WeatherLocation | null) =>
  !!value &&
  typeof value.name === 'string' &&
  typeof value.latitude === 'number' &&
  typeof value.longitude === 'number';

/* ------------------ Helpers ------------------ */

const weatherCodeToLabel = (code: number) => {
  if (code === 0) return 'Clear';
  if (code <= 2) return 'Mostly clear';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 57) return 'Drizzle';
  if (code >= 61 && code <= 67) return 'Rain';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 85 && code <= 86) return 'Snow showers';
  if (code >= 95) return 'Thunderstorm';
  return 'Mixed conditions';
};

const WeatherIcon: React.FC<{ code: number }> = ({ code }) => {
  const iconSize = 52;
  const iconColor = 'rgba(255,255,255,0.95)';

  if (code >= 95) return <WiThunderstorm size={iconSize} color={iconColor} />;
  if (code >= 71 && code <= 86) return <WiSnow size={iconSize} color={iconColor} />;
  if (code >= 80 && code <= 82) return <WiShowers size={iconSize} color={iconColor} />;
  if (code >= 51 && code <= 67) return <WiRain size={iconSize} color={iconColor} />;
  if (code === 45 || code === 48) return <WiFog size={iconSize} color={iconColor} />;
  if (code === 3) return <WiCloudy size={iconSize} color={iconColor} />;
  if (code <= 2) return <WiDaySunnyOvercast size={iconSize} color={iconColor} />;
  return <WiDaySunny size={iconSize} color={iconColor} />;
};

/* ------------------ Main Widget ------------------ */

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location }) => {
  const [state, setState] = useState<WeatherState | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<WeatherLocation | null>(
    location ?? null
  );
  const [error, setError] = useState<string | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const devPanel = useDevPanelState();
  const devWeather = devPanel.weather;
  const now = useDevTime();

  const getStoredLocation = () => {
    try {
      const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as WeatherLocation;
      return isValidLocation(parsed) ? parsed : null;
    } catch {
      return null;
    }
  };

  const deriveCloudCover = (code: number) => {
    if (code === 0) return 0.05;
    if (code <= 2) return 0.35;
    if (code === 3) return 0.75;
    if (code === 45 || code === 48) return 0.6;
    if (code >= 51 && code <= 67) return 0.65;
    if (code >= 71 && code <= 77) return 0.5;
    if (code >= 80 && code <= 82) return 0.65;
    if (code >= 85 && code <= 86) return 0.6;
    if (code >= 95) return 0.85;
    return 0.45;
  };

  const derivePrecipitation = (code: number, precipitationValue?: number) => {
    if (code >= 95) return 'storm';
    if (code >= 71 && code <= 86) return 'snow';
    if (code >= 51 && code <= 67) return 'rain';
    if (code >= 80 && code <= 82) return 'rain';
    if (typeof precipitationValue === 'number' && precipitationValue > 0) return 'rain';
    return 'none';
  };

  const deriveVisibilityKm = (value?: number) => {
    if (!Number.isFinite(value)) return undefined;
    return Math.max(0.5, value / 1000);
  };

  const deriveFogDensity = (code: number, visibilityKm?: number) => {
    if (code === 45 || code === 48) return 0.8;
    if (!visibilityKm) return 0.2;
    // Nonlinear ramp: fog becomes perceptually dense quickly at low vis.
    const linear = Math.min(1, Math.max(0, 1 - visibilityKm / 14));
    return Math.min(0.7, Math.max(0, linear * linear));
  };

  const parseTime = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  };

  useEffect(() => {
    const storedLocation = getStoredLocation();
    const fallbackLocation = location ?? storedLocation ?? resolvedLocation;

    if (devWeather.enabled) {
      if (fallbackLocation && isValidLocation(fallbackLocation)) {
        setResolvedLocation(fallbackLocation);
      }
      setError(null);

      const coords = fallbackLocation ?? {
        name: devWeather.location || 'Developer weather',
        latitude: 0,
        longitude: 0
      };

      const referenceDate = new Date();
      const estimated = estimateSunriseSunset(referenceDate, coords.latitude, coords.longitude);

      const cloudCover = Number.isFinite(devWeather.cloudCover)
        ? Math.min(1, Math.max(0, devWeather.cloudCover))
        : deriveCloudCover(devWeather.code);

      const visibility = Number.isFinite(devWeather.visibility)
        ? Math.max(0.5, devWeather.visibility)
        : Math.max(2, 16 - cloudCover * 10);

      // For dev panel, visibility slider should always affect fog density
      // unless explicitly overridden by a very high fog density value (0.8+)
      let fogDensity = deriveFogDensity(devWeather.code, visibility);
      if (Number.isFinite(devWeather.fogDensity) && devWeather.fogDensity >= 0.5) {
        // Only use explicit fogDensity if it's substantial (heavy fog scenario)
        fogDensity = Math.min(1, Math.max(0, devWeather.fogDensity));
      }

      // Canonical form in state as Date.
      const sunriseStr = devWeather.sunrise || estimated.sunrise;
      const sunsetStr = devWeather.sunset || estimated.sunset;

      const sunrise = new Date(referenceDate);
      const sunset = new Date(referenceDate);

      const [srH, srM] = sunriseStr.split(':').map((v) => Number(v));
      const [ssH, ssM] = sunsetStr.split(':').map((v) => Number(v));

      sunrise.setHours(Number.isFinite(srH) ? srH : 0, Number.isFinite(srM) ? srM : 0, 0, 0);
      sunset.setHours(Number.isFinite(ssH) ? ssH : 0, Number.isFinite(ssM) ? ssM : 0, 0, 0);

      const mapDevPrecipAmount = (precip: typeof devWeather.precipitation | undefined) => {
        if (!precip || precip === 'none') return 0;
        if (precip === 'rain') return 2; // mm/h moderate
        if (precip === 'snow') return 1;
        if (precip === 'storm') return 8;
        return 0;
      };

      setState({
        location: devWeather.location || 'Developer weather',
        temperature: `${Math.round(devWeather.temperature)}\u00B0`,
        condition: weatherCodeToLabel(devWeather.code),
        highLow: `H:${Math.round(devWeather.high)}\u00B0  L:${Math.round(
          devWeather.low
        )}\u00B0`,
        code: devWeather.code,
        sunrise,
        sunset,
        cloudCover,
        precipitation: devWeather.precipitation ?? derivePrecipitation(devWeather.code),
        fogDensity,
        precipitationAmount: mapDevPrecipAmount(devWeather.precipitation),
        precipitationProbability: devWeather.precipitation && devWeather.precipitation !== 'none' ? 1 : 0,
        windSpeed: Number.isFinite((devWeather as any).windSpeed) ? (devWeather as any).windSpeed : 0,
        visibility,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      return;
    }

    if (location) {
      setResolvedLocation(location);
      setError(null);
      return;
    }

    if (storedLocation) {
      setResolvedLocation(storedLocation);
      setError(null);
      return;
    }

    setError('Set a location in settings to see weather.');
  }, [
    devWeather.code,
    devWeather.enabled,
    devWeather.high,
    devWeather.location,
    devWeather.low,
    devWeather.temperature,
    devWeather.cloudCover,
    devWeather.visibility,
    devWeather.fogDensity,
    devWeather.sunrise,
    devWeather.sunset,
    devWeather.precipitation,
    location
  ]);

  useEffect(() => {
    if (devWeather.enabled) return;
    if (!resolvedLocation) return;

    const cacheKey = makeWeatherKey(resolvedLocation.latitude, resolvedLocation.longitude);

    // 1) Serve cache immediately when fresh.
    const cached = readCachedWeather(cacheKey);
    if (cached) {
      setError(null);
      setState(cached);
      return;
    }

    // 2) Throttle rapid repeats (across remounts).
    const lastFetchAt = lastFetchAtByKey.get(cacheKey) ?? 0;
    if (Date.now() - lastFetchAt < WEATHER_THROTTLE_MS) {
      // Keep UI stable: do not spam; just show "Loading" until next opportunity.
      return;
    }

    // 3) Dedupe concurrent requests across remounts/instances.
    const existing = inFlightByKey.get(cacheKey);
    if (existing) {
      existing
        .then((fresh) => {
          setError(null);
          setState(fresh);
        })
        .catch(() => {
          setError('Weather unavailable.');
        });
      return;
    }

    const controller = new AbortController();
    const referenceDate = new Date();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${resolvedLocation.latitude}&longitude=${resolvedLocation.longitude}&current_weather=true&hourly=precipitation,precipitation_probability,windspeed_10m,visibility,cloudcover&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&windspeed_unit=kmh`;

    const request = fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('weather_fetch_failed');
        return r.json();
      })
      .then((data) => {
        // Normalize fields from different possible API shapes
        const code = data.current_weather?.weathercode ?? data.current?.weather_code ?? 0;
        const temp = data.current_weather?.temperature ?? data.current?.temperature_2m ?? 0;

        const estimated = estimateSunriseSunset(
          referenceDate,
          resolvedLocation.latitude,
          resolvedLocation.longitude
        );

        const parsedSunrise = parseTime(data.daily?.sunrise?.[0]);
        const parsedSunset = parseTime(data.daily?.sunset?.[0]);

        const sunrise =
          parsedSunrise ??
          (() => {
            const d = new Date(referenceDate);
            const [h, m] = estimated.sunrise.split(':').map((v: string) => Number(v));
            d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
            return d;
          })();

        const sunset =
          parsedSunset ??
          (() => {
            const d = new Date(referenceDate);
            const [h, m] = estimated.sunset.split(':').map((v: string) => Number(v));
            d.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
            return d;
          })();

        // Find nearest hourly index (if hourly arrays exist)
        let nearestIdx = 0;
        if (data.hourly && Array.isArray(data.hourly.time)) {
          let minDiff = Infinity;
          for (let i = 0; i < data.hourly.time.length; i++) {
            const t = new Date(data.hourly.time[i]);
            const diff = Math.abs(t.getTime() - referenceDate.getTime());
            if (diff < minDiff) {
              minDiff = diff;
              nearestIdx = i;
            }
          }
        }

        const visibilityKm =
          typeof data.current?.visibility === 'number'
            ? deriveVisibilityKm(data.current.visibility)
            : data.hourly && data.hourly.visibility && data.hourly.visibility[nearestIdx]
            ? deriveVisibilityKm(data.hourly.visibility[nearestIdx])
            : undefined;

        const cloudCover = Number.isFinite(data.current?.cloud_cover)
          ? Math.min(1, Math.max(0, data.current.cloud_cover / 100))
          : data.hourly && data.hourly.cloudcover && typeof data.hourly.cloudcover[nearestIdx] === 'number'
          ? Math.min(1, Math.max(0, data.hourly.cloudcover[nearestIdx] / 100))
          : deriveCloudCover(code);

        const fallbackVisibility = Math.max(2, 16 - cloudCover * 10);

        // Precipitation amount: prefer current/hourly, with better granularity
        const precipitationAmount =
          typeof data.current?.precipitation === 'number'
            ? data.current.precipitation
            : data.hourly && Array.isArray(data.hourly.precipitation)
            ? Number.isFinite(data.hourly.precipitation[nearestIdx])
              ? data.hourly.precipitation[nearestIdx]
              : undefined
            : undefined;

        const windSpeed =
          data.current_weather?.windspeed ?? data.current?.windspeed ??
          (data.hourly && Array.isArray(data.hourly.windspeed_10m) ? data.hourly.windspeed_10m[nearestIdx] : undefined);

        const fresh: WeatherState = {
          location: resolvedLocation.name,
          temperature: `${Math.round(temp)}\u00B0`,
          condition: weatherCodeToLabel(code),
          highLow: `H:${Math.round(data.daily?.temperature_2m_max?.[0] ?? 0)}\u00B0  L:${Math.round(
            data.daily?.temperature_2m_min?.[0] ?? 0
          )}\u00B0`,
          code,
          sunrise,
          sunset,
          cloudCover,
          precipitation: derivePrecipitation(code, precipitationAmount),
          fogDensity: deriveFogDensity(code, visibilityKm),
          precipitationAmount: typeof precipitationAmount === 'number' ? precipitationAmount : undefined,
          precipitationProbability:
            data.current?.precipitation_probability ??
            (data.hourly && Array.isArray(data.hourly.precipitation_probability)
              ? data.hourly.precipitation_probability[nearestIdx]
              : undefined),
          windSpeed: typeof windSpeed === 'number' ? windSpeed : undefined,
          visibility: visibilityKm ?? fallbackVisibility,
          latitude: resolvedLocation.latitude,
          longitude: resolvedLocation.longitude
        };

        writeCachedWeather(cacheKey, fresh);
        return fresh;
      });

    inFlightByKey.set(cacheKey, request);

    request
      .then((fresh) => {
        if (controller.signal.aborted) return;
        setError(null);
        setState(fresh);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Weather unavailable.');
      })
      .finally(() => {
        inFlightByKey.delete(cacheKey);
      });

    return () => controller.abort();
  }, [devWeather.enabled, resolvedLocation]);

  const sunPos = getSunPosition(now, state?.latitude ?? 0, state?.longitude ?? 0);
  const moonPhase = estimateMoonPhase(now);

  const skyState: SkyStateInput | null = useMemo(() => {
    if (!state) return null;

    return {
      time: {
        localTime: getLocalTimeString(now),
        sunrise: getLocalTimeString(state.sunrise),
        sunset: getLocalTimeString(state.sunset)
      },
      astronomy: {
        sunElevation: sunPos.elevation,
        sunAzimuth: sunPos.azimuth,
        moonElevation: estimateMoonElevation(now, state.latitude, moonPhase),
        moonPhase
      },
      weather: {
        cloudCover: state.cloudCover,
        precipitation: state.precipitation,
        fogDensity: state.fogDensity,
        visibility: state.visibility,
        windSpeed: state.windSpeed ?? 0,
        precipitationAmount: state.precipitationAmount,
        precipitationProbability: state.precipitationProbability,
        weatherCode: state.code
      },
      environment: {
        latitude: state.latitude,
        longitude: state.longitude,
        season: devWeather.enabled ? devWeather.season : getSeason(now, state.latitude)
      }
    };
  }, [
    now,
    state,
    devWeather.enabled,
    devWeather.season,
    sunPos.azimuth,
    sunPos.elevation,
    moonPhase
  ]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-3xl bg-[color:var(--ui-surface-subtle)] text-xs text-[color:var(--ui-text-muted)] border border-[color:var(--ui-border)]">
        {error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-3xl bg-[color:var(--ui-surface-subtle)] p-6 border border-[color:var(--ui-border)]">
        <div className="flex flex-col items-center space-y-4 w-full">
          {/* Weather icon skeleton */}
          <div className="w-12 h-12 bg-[color:var(--ui-surface)] rounded-full animate-pulse" />
          
          {/* Temperature skeleton */}
          <div className="w-16 h-8 bg-[color:var(--ui-surface)] rounded animate-pulse" />
          
          {/* Condition skeleton */}
          <div className="w-24 h-4 bg-[color:var(--ui-surface)] rounded animate-pulse" />
          
          {/* High/Low skeleton */}
          <div className="w-20 h-3 bg-[color:var(--ui-surface)] rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl text-white">
      <SkyBackground state={skyState!} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-transparent to-black/15" />

      <div className="relative z-10 flex h-full flex-col justify-between p-6">
        {/* Main weather info */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="text-4xl font-light tracking-tight">{state.temperature}</div>
            <div className="mt-1 text-base font-medium text-white/90">{state.condition}</div>
          </div>
          <div className="ml-4 opacity-90">
            <WeatherIcon code={state.code} />
          </div>
        </div>

        {/* Location and high/low */}
        <div className="flex items-end justify-between">
          <div className="text-sm font-medium text-white/90 truncate max-w-[60%]">
            {state.location}
          </div>
          <div className="text-sm font-medium text-white/80">
            {state.highLow}
          </div>
        </div>
      </div>
    </div>
  );
};
