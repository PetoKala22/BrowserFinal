import React, { useEffect, useRef, useState } from 'react';
import { WeatherLocation } from '@/lib/types';
import { useDevPanelState, useDevTime } from '@/lib/devPanelState';
import {
  estimateMoonElevation,
  estimateMoonPhase,
  getSunPosition, // Updated import
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

/* ------------------ Types ------------------ */

type WeatherState = {
  location: string;
  temperature: string;
  condition: string;
  highLow: string;
  code: number;
  sunrise: string;
  sunset: string;
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

const WEATHER_LOCATION_KEY = 'newtab-weather-location';

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
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const density = precipitation === 'storm' ? 220 : 140;

    const updateSize = () => {
      const bounds = (canvas.parentElement ?? canvas).getBoundingClientRect();
      const width = Math.max(0, Math.floor(bounds.width));
      const height = Math.max(0, Math.floor(bounds.height));
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      sizeRef.current = { width, height };
      dropsRef.current = Array.from({ length: density }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 2 + Math.random() * 3
      }));
      flakesRef.current = Array.from({ length: density * 0.7 }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.4 + Math.random() * 0.8,
        size: 0.5 + Math.random() * 1.5,
        opacity: 0.2 + Math.random() * 0.5,
        wind: -0.25 + Math.random() * 0.5
      }));
    };

    updateSize();
    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(canvas.parentElement ?? canvas);

    let raf: number;
    const draw = () => {
      const { width, height } = sizeRef.current;
      ctx.clearRect(0, 0, width, height);

      if (precipitation === 'rain' || precipitation === 'storm') {
        ctx.strokeStyle =
          precipitation === 'storm' ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.3)';
        ctx.lineWidth = precipitation === 'storm' ? 1.3 : 1;

        dropsRef.current.forEach(d => {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x, d.y + (precipitation === 'storm' ? 12 : 8));
          ctx.stroke();
          d.y = (d.y + d.speed) % height;
        });
      }

      if (precipitation === 'snow') {
        flakesRef.current.forEach(flake => {
          ctx.fillStyle = `rgba(255,255,255,${flake.opacity})`;
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size, 0, Math.PI * 2);
          ctx.fill();

          // Move the flake
          flake.y = (flake.y + flake.speed) % height;
          flake.x = (flake.x + flake.wind) % width;

          // Wrap around if it goes off screen
          if (flake.x < 0) flake.x = width;
          if (flake.y > height) flake.y = 0;
        });
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [precipitation]);

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
    return Math.min(0.6, Math.max(0, 1 - visibilityKm / 14));
  };

  const parseTime = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return getLocalTimeString(date);
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
      const estimated = estimateSunriseSunset(
        referenceDate,
        coords.latitude,
        coords.longitude
      );
      const cloudCover = Number.isFinite(devWeather.cloudCover)
        ? Math.min(1, Math.max(0, devWeather.cloudCover))
        : deriveCloudCover(devWeather.code);
      const visibility = Number.isFinite(devWeather.visibility)
        ? Math.max(0.5, devWeather.visibility)
        : Math.max(2, 16 - cloudCover * 10);
      const sunrise = devWeather.sunrise || estimated.sunrise;
      const sunset = devWeather.sunset || estimated.sunset;
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
    location
  ]);

  useEffect(() => {
    if (devWeather.enabled) return;
    if (!resolvedLocation) return;

    const referenceDate = new Date();
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${resolvedLocation.latitude}&longitude=${resolvedLocation.longitude}&current=temperature_2m,weather_code,cloud_cover,visibility,precipitation&daily=temperature_2m_max,temperature_2m_min,sunrise,sunset&timezone=auto`
    )
      .then(r => r.json())
      .then(data => {
        const code = data.current?.weather_code ?? 0;
        const estimated = estimateSunriseSunset(
          referenceDate,
          resolvedLocation.latitude,
          resolvedLocation.longitude
        );
        const sunrise = parseTime(data.daily?.sunrise?.[0]) ?? estimated.sunrise;
        const sunset = parseTime(data.daily?.sunset?.[0]) ?? estimated.sunset;
        const visibilityKm = deriveVisibilityKm(data.current?.visibility);
        const cloudCover = Number.isFinite(data.current?.cloud_cover)
          ? Math.min(1, Math.max(0, data.current.cloud_cover / 100))
          : deriveCloudCover(code);
        const fallbackVisibility = Math.max(2, 16 - cloudCover * 10);

        setState({
          location: resolvedLocation.name,
          temperature: `${Math.round(data.current.temperature_2m)}\u00B0`,
          condition: weatherCodeToLabel(code),
          highLow: `H:${Math.round(data.daily.temperature_2m_max[0])}\u00B0  L:${Math.round(data.daily.temperature_2m_min[0])}\u00B0`,
          code,
          sunrise,
          sunset,
          cloudCover,
          precipitation: derivePrecipitation(code, data.current?.precipitation),
          fogDensity: deriveFogDensity(code, visibilityKm),
          visibility: visibilityKm ?? fallbackVisibility,
          latitude: resolvedLocation.latitude,
          longitude: resolvedLocation.longitude
        });
      })
      .catch(() => {
        setError('Weather unavailable.');
      });
  }, [devWeather.enabled, resolvedLocation]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] text-xs text-[color:var(--ui-text-muted)]">
        {error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[color:var(--ui-border)] bg-[color:var(--ui-surface-subtle)] text-xs text-[color:var(--ui-text-muted)]">
        Loading weather...
      </div>
    );
  }

  // --- NEW: Calculate full Sun Position (Azimuth + Elevation) ---
  const sunPos = getSunPosition(now, state.latitude, state.longitude);
  const moonPhase = estimateMoonPhase(now);

  const skyState: SkyStateInput = {
    time: {
      localTime: getLocalTimeString(now),
      sunrise: state.sunrise,
      sunset: state.sunset
    },
    astronomy: {
      sunElevation: sunPos.elevation,
      sunAzimuth: sunPos.azimuth, // Passed to renderer for sun glare
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

  return (
    <div className="relative h-full w-full overflow-hidden rounded-2xl text-white">
      <SkyLayer state={skyState} />
      <div className="absolute inset-0 bg-black/10" />
      <PrecipitationLayer precipitation={state.precipitation} />

      <div className="relative z-10 flex h-full flex-col justify-between p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">
              Weather
            </div>
            <div className="mt-2 text-3xl font-semibold">
              {state.temperature}
            </div>
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