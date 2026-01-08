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
import { useSkyBackground } from '@/lib/sky/useSkyBackground';
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
  const iconSize = 44;
  const iconColor = 'rgba(255,255,255,0.9)';

  if (code >= 95) return <WiThunderstorm size={iconSize} color={iconColor} />;
  if (code >= 71 && code <= 86) return <WiSnow size={iconSize} color={iconColor} />;
  if (code >= 80 && code <= 82) return <WiShowers size={iconSize} color={iconColor} />;
  if (code >= 51 && code <= 67) return <WiRain size={iconSize} color={iconColor} />;
  if (code === 45 || code === 48) return <WiFog size={iconSize} color={iconColor} />;
  if (code === 3) return <WiCloudy size={iconSize} color={iconColor} />;
  if (code <= 2) return <WiDaySunnyOvercast size={iconSize} color={iconColor} />;
  return <WiDaySunny size={iconSize} color={iconColor} />;
};

/* ------------------ Precipitation Layer ------------------ */

const PrecipitationLayer: React.FC<{ precipitation: WeatherState['precipitation'] }> = ({
  precipitation
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<{ x: number; y: number; speed: number }[]>([]);
  const flakesRef = useRef<
    { x: number; y: number; speed: number; size: number; opacity: number; wind: number }[]
  >([]);
  const modeRef = useRef<WeatherState['precipitation']>(precipitation);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const rafRef = useRef<number | null>(null);
  const drawRef = useRef<(() => void) | null>(null);

  // Snow sprites (drawImage is typically cheaper than many arc()+fill() calls)
  const snowSpritesRef = useRef<HTMLCanvasElement[] | null>(null);

  const DPR_CAP = 1.5; // cap DPR for the animated overlay only (keeps UI crisp elsewhere)

  // Keep animation loop stable; only update mode.
  useEffect(() => {
    modeRef.current = precipitation;

    // If we were stopped (mode === 'none'), restart when precipitation becomes active.
    if (precipitation !== 'none' && rafRef.current == null && drawRef.current) {
      rafRef.current = window.requestAnimationFrame(drawRef.current);
    }
  }, [precipitation]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const maxDensity = 240; // allocate once (avoid popping on mode changes)

    // Create a few soft snow sprites once.
    const ensureSnowSprites = () => {
      if (snowSpritesRef.current) return snowSpritesRef.current;
      const sprites: HTMLCanvasElement[] = [];
      const radii = [1.0, 1.6, 2.2];

      for (const r of radii) {
        const s = document.createElement('canvas');
        const size = Math.ceil(r * 6);
        s.width = size;
        s.height = size;
        const sctx = s.getContext('2d')!;
        const cx = size / 2;
        const cy = size / 2;

        const g = sctx.createRadialGradient(cx, cy, 0, cx, cy, r * 2.8);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(0.45, 'rgba(255,255,255,0.35)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        sctx.fillStyle = g;
        sctx.beginPath();
        sctx.arc(cx, cy, r * 2.8, 0, Math.PI * 2);
        sctx.fill();

        sprites.push(s);
      }

      snowSpritesRef.current = sprites;
      return sprites;
    };

    const updateSize = () => {
      const bounds = (canvas.parentElement ?? canvas).getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const cssW = Math.max(0, Math.floor(bounds.width));
      const cssH = Math.max(0, Math.floor(bounds.height));
      const width = Math.max(0, Math.floor(cssW * dpr));
      const height = Math.max(0, Math.floor(cssH * dpr));
      if (!width || !height) return;

      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      sizeRef.current = { width, height, dpr };

      // Re-seed on resize only (stable during mode changes).
      dropsRef.current = Array.from({ length: maxDensity }, () => ({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        speed: 2 + Math.random() * 3
      }));

      flakesRef.current = Array.from({ length: Math.floor(maxDensity * 0.75) }, () => ({
        x: Math.random() * cssW,
        y: Math.random() * cssH,
        speed: 0.4 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.5,
        wind: -0.25 + Math.random() * 0.5
      }));
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    const draw = () => {
      const { width, height, dpr } = sizeRef.current;
      if (!width || !height) {
        rafRef.current = window.requestAnimationFrame(draw);
        return;
      }

      // Draw in CSS pixels for consistent motion across DPR.
      const cssW = Math.floor(width / dpr);
      const cssH = Math.floor(height / dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const mode = modeRef.current;

      // If precipitation is off, stop the loop entirely (zero cost) and clear once.
      if (mode === 'none') {
        ctx.clearRect(0, 0, cssW, cssH);
        rafRef.current = null;
        return;
      }

      ctx.clearRect(0, 0, cssW, cssH);
      const density = mode === 'storm' ? 220 : 140;

      if (mode === 'rain' || mode === 'storm') {
        ctx.strokeStyle =
          mode === 'storm' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = mode === 'storm' ? 1.3 : 1;

        // Batch all drops into one path -> a single stroke() call per frame.
        const wind = mode === 'storm' ? 0.6 : 0.25;
        const len = mode === 'storm' ? 12 : 8;

        ctx.beginPath();
        const count = Math.min(density, dropsRef.current.length);
        for (let i = 0; i < count; i++) {
          const d = dropsRef.current[i];
          const dx = wind * d.speed;
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x + dx, d.y + len);

          d.y = (d.y + d.speed) % cssH;
          d.x = (d.x + dx) % cssW;
          if (d.x < 0) d.x = cssW;
        }
        ctx.stroke();
      }

      if (mode === 'snow') {
        const sprites = ensureSnowSprites();
        const count = Math.min(Math.floor(density * 0.75), flakesRef.current.length);
        for (let i = 0; i < count; i++) {
          const flake = flakesRef.current[i];

          // Pick a cached sprite based on size.
          const spriteIndex = flake.size < 1 ? 0 : flake.size < 1.6 ? 1 : 2;
          const sprite = sprites[spriteIndex];
          const half = sprite.width / 2;

          ctx.globalAlpha = flake.opacity;
          ctx.drawImage(sprite, flake.x - half, flake.y - half);

          flake.y = (flake.y + flake.speed) % cssH;
          flake.x = (flake.x + flake.wind) % cssW;

          if (flake.x < 0) flake.x = cssW;
          if (flake.y > cssH) flake.y = 0;
        }

        ctx.globalAlpha = 1;
      }

      rafRef.current = window.requestAnimationFrame(draw);
    };

    drawRef.current = draw;

    // Start only when we actually have precipitation.
    if (modeRef.current !== 'none') {
      rafRef.current = window.requestAnimationFrame(draw);
    } else {
      // Ensure a clean canvas when starting with none.
      const { width, height, dpr } = sizeRef.current;
      if (width && height) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, Math.floor(width / dpr), Math.floor(height / dpr));
      }
    }

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      drawRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ filter: 'blur(1px)' }}
    />
  );
};

/* ------------------ Sky Layer ------------------ */

const SkyLayer: React.FC<{ state: SkyStateInput }> = ({ state }) => {
  const canvasRef = useSkyBackground(state);
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
};

/* ------------------ Main Widget ------------------ */

export const WeatherWidget: React.FC<WeatherWidgetProps> = ({ location }) => {
  const [state, setState] = useState<WeatherState | null>(null);
  const [resolvedLocation, setResolvedLocation] = useState<WeatherLocation | null>(
    location ?? null
  );
  const [error, setError] = useState<string | null>(null);
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

      // Canonical form in state as Date.
      const sunriseStr = devWeather.sunrise || estimated.sunrise;
      const sunsetStr = devWeather.sunset || estimated.sunset;

      const sunrise = new Date(referenceDate);
      const sunset = new Date(referenceDate);

      const [srH, srM] = sunriseStr.split(':').map((v) => Number(v));
      const [ssH, ssM] = sunsetStr.split(':').map((v) => Number(v));

      sunrise.setHours(Number.isFinite(srH) ? srH : 0, Number.isFinite(srM) ? srM : 0, 0, 0);
      sunset.setHours(Number.isFinite(ssH) ? ssH : 0, Number.isFinite(ssM) ? ssM : 0, 0, 0);

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
        fogDensity: deriveFogDensity(devWeather.code, visibility),
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

    setError('Set a location to see weather.');
  }, [
    devWeather.code,
    devWeather.enabled,
    devWeather.high,
    devWeather.location,
    devWeather.low,
    devWeather.temperature,
    devWeather.cloudCover,
    devWeather.visibility,
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

    lastFetchAtByKey.set(cacheKey, Date.now());

    const request = fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${resolvedLocation.latitude}&longitude=${resolvedLocation.longitude}&current=temperature_2m,weather_code,cloud_cover,visibility,precipitation&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`,
      { signal: controller.signal }
    )
      .then((r) => {
        if (!r.ok) throw new Error('weather_fetch_failed');
        return r.json();
      })
      .then((data) => {
        const code = data.current?.weather_code ?? 0;
        const estimated = estimateSunriseSunset(
          referenceDate,
          resolvedLocation.latitude,
          resolvedLocation.longitude
        );

        const parsedSunrise = parseTime(data.daily?.sunrise?.[0]);
        const parsedSunset = parseTime(data.daily?.sunset?.[0]);

        // If API time is missing/invalid, fall back to estimated HH:mm on the reference day.
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

        const visibilityKm = deriveVisibilityKm(data.current?.visibility);

        const cloudCover = Number.isFinite(data.current?.cloud_cover)
          ? Math.min(1, Math.max(0, data.current.cloud_cover / 100))
          : deriveCloudCover(code);

        const fallbackVisibility = Math.max(2, 16 - cloudCover * 10);

        const fresh: WeatherState = {
          location: resolvedLocation.name,
          temperature: `${Math.round(data.current.temperature_2m)}\u00B0`,
          condition: weatherCodeToLabel(code),
          highLow: `H:${Math.round(data.daily.temperature_2m_max[0])}\u00B0  L:${Math.round(
            data.daily.temperature_2m_min[0]
          )}\u00B0`,
          code,
          sunrise,
          sunset,
          cloudCover,
          precipitation: derivePrecipitation(code, data.current?.precipitation),
          fogDensity: deriveFogDensity(code, visibilityKm),
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
        visibility: state.visibility
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
      <div className="flex h-full w-full items-center justify-center rounded-3xl bg-[color:var(--ui-surface-subtle)] text-xs text-[color:var(--ui-text-muted)]">
        Loading weather...
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden rounded-3xl text-white">
      <SkyLayer state={skyState!} />
      <div className="absolute inset-0 bg-black/10" />
      <PrecipitationLayer precipitation={state.precipitation} />

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">Weather</div>
            <div className="mt-2 text-3xl font-semibold">{state.temperature}</div>
            <div className="text-sm text-white/80">{state.condition}</div>
          </div>
          <WeatherIcon code={state.code} />
        </div>

        <div className="flex items-center justify-between text-xs text-white/80">
          <span className="truncate">{state.location}</span>
          <span>{state.highLow}</span>
        </div>
      </div>
    </div>
  );
};
