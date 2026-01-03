import React, { useEffect, useRef, useState } from 'react';
import { WeatherLocation } from '@/lib/types';
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

const weatherGradient = (code: number) => {
  if (code === 0) return 'from-[#58b2ff] via-[#7fd2ff] to-[#bfe7ff]';
  if (code <= 2) return 'from-[#6bb7ff] via-[#8ad2ff] to-[#bfe8ff]';
  if (code === 3) return 'from-[#8aa1b5] via-[#a8b8c7] to-[#d7e0ea]';
  if (code === 45 || code === 48) return 'from-[#9aa5b1] via-[#b0bcc9] to-[#d6dde4]';
  if (code >= 51 && code <= 67) return 'from-[#6e8aa8] via-[#90a9c2] to-[#c6d4e2]';
  if (code >= 71 && code <= 77) return 'from-[#9fc5e8] via-[#c7ddf0] to-[#e8f2fb]';
  if (code >= 80 && code <= 82) return 'from-[#6e8fb3] via-[#96b0ca] to-[#cbd7e2]';
  if (code >= 85 && code <= 86) return 'from-[#a7c2d9] via-[#cddceb] to-[#edf4fa]';
  if (code >= 95) return 'from-[#5b6b7f] via-[#7b8aa1] to-[#a9b7c9]';
  return 'from-[#8fb2d3] via-[#b3cbe0] to-[#dce7f2]';
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

/* ------------------ Atmosphere Layer ------------------ */

const AtmosphereLayer: React.FC<{ code: number }> = ({ code }) => {
  const cloudy = code >= 1 && code <= 3;
  const fog = code === 45 || code === 48;
  const storm = code >= 95;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cloudy && (
        <div className="absolute inset-0 animate-clouds bg-[radial-gradient(circle_at_20%_30%,rgba(255,255,255,0.18),transparent_60%)]" />
      )}
      {fog && (
        <div className="absolute inset-0 animate-fog bg-white/25 blur-3xl" />
      )}
      {storm && (
        <div className="absolute inset-0 bg-black/20" />
      )}
    </div>
  );
};

/* ------------------ Precipitation Layer ------------------ */

const PrecipitationLayer: React.FC<{ code: number }> = ({ code }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<{ x: number; y: number; speed: number }[]>([]);
  const sizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const density = 120;

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
    };

    updateSize();
    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(canvas.parentElement ?? canvas);

    let raf: number;
    const draw = () => {
      const { width, height } = sizeRef.current;
      ctx.clearRect(0, 0, width, height);

      if (code >= 51) {
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1;

        dropsRef.current.forEach(d => {
          ctx.beginPath();
          ctx.moveTo(d.x, d.y);
          ctx.lineTo(d.x, d.y + 8);
          ctx.stroke();
          d.y = (d.y + d.speed) % height;
        });
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [code]);

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

  useEffect(() => {
    if (location) {
      setResolvedLocation(location);
      setError(null);
      return;
    }

    try {
      const raw = localStorage.getItem(WEATHER_LOCATION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WeatherLocation;
        if (isValidLocation(parsed)) {
          setResolvedLocation(parsed);
          setError(null);
          return;
        }
      }
    } catch {
      // Ignore invalid stored location.
    }

    setError('Set a location to see weather.');
  }, [location]);

  useEffect(() => {
    if (!resolvedLocation) return;

    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${resolvedLocation.latitude}&longitude=${resolvedLocation.longitude}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`
    )
      .then(r => r.json())
      .then(data => {
        setState({
          location: resolvedLocation.name,
          temperature: `${Math.round(data.current.temperature_2m)}\u00B0`,
          condition: weatherCodeToLabel(data.current.weather_code),
          highLow: `H:${Math.round(data.daily.temperature_2m_max[0])}\u00B0  L:${Math.round(data.daily.temperature_2m_min[0])}\u00B0`,
          code: data.current.weather_code
        });
      })
      .catch(() => {
        setError('Weather unavailable.');
      });
  }, [resolvedLocation]);

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

  return (
    <div
      className={`relative h-full w-full overflow-hidden rounded-2xl bg-gradient-to-br ${weatherGradient(
        state.code
      )} text-white`}
    >
      <AtmosphereLayer code={state.code} />
      <PrecipitationLayer code={state.code} />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.45),_transparent_60%)]" />

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
