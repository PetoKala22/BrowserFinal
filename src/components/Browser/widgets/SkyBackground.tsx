// SkyBackground.tsx
import React from 'react';
import { useSkyBackground } from '@/lib/sky/useSkyBackground';
import { SkyStateInput } from '@/lib/sky/skyTypes';

export const SkyBackground: React.FC<{ state: SkyStateInput | null }> = ({ state }) => {
  const { canvasRef, cloudsCanvasRef } = useSkyBackground(state || {
    time: {
      localTime: '12:00',
      sunrise: '06:00',
      sunset: '18:00'
    },
    astronomy: {
      sunElevation: 30,
      sunAzimuth: 180,
      moonElevation: -30,
      moonPhase: 0
    },
    weather: {
      cloudCover: 0.1,
      precipitation: 'none',
      fogDensity: 0.1,
      visibility: 10,
      windSpeed: 5,
      weatherCode: 0
    },
    environment: {
      latitude: 0,
      longitude: 0,
      season: 'spring'
    }
  });

  if (!state) return null;

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
      <canvas
        ref={cloudsCanvasRef}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </>
  );
};