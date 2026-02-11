/**
 * Global weather hook for the new tab page sky background
 * Reuses logic from WeatherWidget but provides global access
 */

import { useEffect, useMemo, useState } from 'react';
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

const WEATHER_LOCATION_KEY = 'newtab-weather-location';
const WEATHER_CACHE_TTL_MS = 10 * 60 * 1000;
const WEATHER_CACHE_PREFIX = 'newtab-weather-cache-v1:';
const WEATHER_THROTTLE_MS = 15 * 1000;

type CachedWeatherPayload = {
  cachedAt: number;
  state: Omit<WeatherState, 'sunrise' | 'sunset'> & {
    sunrise: string;
    sunset: string;
  };
};

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
  precipitationAmount?: number;
  windSpeed?: number;
  windDirection?: number; // degrees, 0 = north, 90 = east
  precipitationProbability?: number;
  visibility: number;
  latitude: number;
  longitude: number;
};

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

const getStoredLocation = (): WeatherLocation | null => {
  try {
    const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherLocation;
    return typeof parsed?.latitude === 'number' &&
      typeof parsed?.longitude === 'number' &&
      typeof parsed?.name === 'string'
      ? parsed
      : null;
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
  const linear = Math.min(1, Math.max(0, 1 - visibilityKm / 14));
  return Math.min(0.7, Math.max(0, linear * linear));
};

const parseTime = (value?: string) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

export const useGlobalWeather = () => {
  const [weatherState, setWeatherState] = useState<WeatherState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const devPanel = useDevPanelState();
  const devWeather = devPanel.weather;
  const now = useDevTime();

  useEffect(() => {
    const storedLocation = getStoredLocation();

    if (devWeather.enabled) {
      if (storedLocation) {
        setError(null);
      }

      const coords = storedLocation ?? {
        name: 'Developer weather',
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

      let fogDensity = deriveFogDensity(devWeather.code, visibility);
      if (Number.isFinite(devWeather.fogDensity) && devWeather.fogDensity >= 0.5) {
        fogDensity = Math.min(1, Math.max(0, devWeather.fogDensity));
      }

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
        if (precip === 'rain') return 2;
        if (precip === 'snow') return 1;
        if (precip === 'storm') return 8;
        return 0;
      };

      setWeatherState({
        location: devWeather.location || 'Developer weather',
        temperature: `${Math.round(devWeather.temperature)}\u00B0`,
        condition: 'Developer mode',
        highLow: `H:${Math.round(devWeather.high)}\u00B0  L:${Math.round(devWeather.low)}\u00B0`,
        code: devWeather.code,
        sunrise,
        sunset,
        cloudCover,
        precipitation: devWeather.precipitation ?? derivePrecipitation(devWeather.code),
        fogDensity,
        precipitationAmount: mapDevPrecipAmount(devWeather.precipitation),
        precipitationProbability: devWeather.precipitation && devWeather.precipitation !== 'none' ? 1 : 0,
        windSpeed: Number.isFinite((devWeather as any).windSpeed) ? (devWeather as any).windSpeed : 0,
        windDirection: Number.isFinite((devWeather as any).windDirection) ? (devWeather as any).windDirection : 15,
        visibility,
        latitude: coords.latitude,
        longitude: coords.longitude
      });
      return;
    }

    if (!storedLocation) {
      setError('No location set for weather background');
      setWeatherState(null);
      return;
    }

    const cacheKey = makeWeatherKey(storedLocation.latitude, storedLocation.longitude);

    const cached = readCachedWeather(cacheKey);
    if (cached) {
      setError(null);
      setWeatherState(cached);
      return;
    }

    const lastFetchAt = 0;
    if (Date.now() - lastFetchAt < WEATHER_THROTTLE_MS) {
      return;
    }

    const controller = new AbortController();
    const referenceDate = new Date();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${storedLocation.latitude}&longitude=${storedLocation.longitude}&current_weather=true&hourly=precipitation,precipitation_probability,windspeed_10m,winddirection_10m,visibility,cloudcover&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto&windspeed_unit=kmh`;

    const request = fetch(url, { signal: controller.signal })
      .then((r) => {
        if (!r.ok) throw new Error('weather_fetch_failed');
        return r.json();
      })
      .then((data) => {
        const code = data.current_weather?.weathercode ?? data.current?.weather_code ?? 0;
        const temp = data.current_weather?.temperature ?? data.current?.temperature_2m ?? 0;

        const estimated = estimateSunriseSunset(
          referenceDate,
          storedLocation.latitude,
          storedLocation.longitude
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

        const windDirection =
          data.current_weather?.winddirection ?? data.current?.winddirection ??
          (data.hourly && Array.isArray(data.hourly.winddirection_10m) ? data.hourly.winddirection_10m[nearestIdx] : undefined);

        const fresh: WeatherState = {
          location: storedLocation.name,
          temperature: `${Math.round(temp)}\u00B0`,
          condition: 'Weather background',
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
          windDirection: typeof windDirection === 'number' ? windDirection : 15, // Default if not available
          visibility: visibilityKm ?? fallbackVisibility,
          latitude: storedLocation.latitude,
          longitude: storedLocation.longitude
        };

        writeCachedWeather(cacheKey, fresh);
        return fresh;
      });

    request
      .then((fresh) => {
        if (controller.signal.aborted) return;
        setError(null);
        setWeatherState(fresh);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError('Weather unavailable');
      });

    return () => controller.abort();
  }, [devWeather]);

  const sunPos = getSunPosition(now, weatherState?.latitude ?? 0, weatherState?.longitude ?? 0);
  const moonPhase = estimateMoonPhase(now);

  const skyState: SkyStateInput | null = useMemo(() => {
    if (!weatherState) return null;

    return {
      time: {
        localTime: getLocalTimeString(now),
        sunrise: getLocalTimeString(weatherState.sunrise),
        sunset: getLocalTimeString(weatherState.sunset)
      },
      astronomy: {
        sunElevation: sunPos.elevation,
        sunAzimuth: sunPos.azimuth,
        moonElevation: estimateMoonElevation(now, weatherState.latitude, moonPhase),
        moonPhase
      },
      weather: {
        cloudCover: weatherState.cloudCover,
        precipitation: weatherState.precipitation,
        fogDensity: weatherState.fogDensity,
        visibility: weatherState.visibility,
        windSpeed: weatherState.windSpeed ?? 0,
        windDirection: weatherState.windDirection ?? 15,
        precipitationAmount: weatherState.precipitationAmount,
        precipitationProbability: weatherState.precipitationProbability,
        weatherCode: weatherState.code
      },
      environment: {
        latitude: weatherState.latitude,
        longitude: weatherState.longitude,
        season: devWeather.enabled ? devWeather.season : getSeason(now, weatherState.latitude)
      }
    };
  }, [
    now,
    weatherState,
    devWeather.enabled,
    devWeather.season,
    sunPos.azimuth,
    sunPos.elevation,
    moonPhase
  ]);

  return { skyState, error };
};