// useSkyBackground.ts
import { useEffect, useRef } from 'react';
import { SkyLayerColors, SkyStateInput } from './skyTypes';
import { computeSkyLayers } from './skyModel';
import { mixOklab } from './skyColor';
import { renderSkyGradient } from './skyRenderer';
import { PrecipitationSystem, Particle } from './precipitationSystem';
import { PRECIPITATION_CONFIG } from './precipitationConfig';
import { SkyCloudsRenderer } from './skyClouds';

const blendLayers = (from: SkyLayerColors, to: SkyLayerColors, t: number): SkyLayerColors => ({
  upperSky: mixOklab(from.upperSky, to.upperSky, t),
  midSky: mixOklab(from.midSky, to.midSky, t),
  horizonBand: mixOklab(from.horizonBand, to.horizonBand, t),
  groundBounce: mixOklab(from.groundBounce, to.groundBounce, t)
});

/**
 * Sample the sky color at a normalized vertical position (0 = top, 1 = bottom)
 */
const sampleSkyColor = (layers: SkyLayerColors, normalizedY: number): [number, number, number] => {
  // Sky gradient stops: 0 (upperSky), 0.55 (midSky), 1 (horizonBand)
  if (normalizedY <= 0.55) {
    // Interpolate between upperSky and midSky
    const t = normalizedY / 0.55;
    return mixOklab(layers.upperSky, layers.midSky, t);
  } else {
    // Interpolate between midSky and horizonBand
    const t = (normalizedY - 0.55) / (1 - 0.55);
    return mixOklab(layers.midSky, layers.horizonBand, t);
  }
};

const getCanvasContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext(
    '2d',
    { colorSpace: 'display-p3', willReadFrequently: true } as CanvasRenderingContext2DSettings
  );
  return context ?? canvas.getContext('2d', { willReadFrequently: true });
};

export const useSkyBackground = (state: SkyStateInput) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cloudsCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetRef = useRef<SkyLayerColors>(computeSkyLayers(state));
  const currentRef = useRef<SkyLayerColors>(targetRef.current);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const stateRef = useRef(state);
  const precipitationSystemRef = useRef<PrecipitationSystem | null>(null);
  const cloudsRendererRef = useRef<SkyCloudsRenderer | null>(null); 

  useEffect(() => {
    targetRef.current = computeSkyLayers(state);
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = getCanvasContext(canvas);
    if (!ctx) return;

    const updateSize = () => {
      const bounds = (canvas.parentElement ?? canvas).getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(bounds.width * dpr));
      const height = Math.max(1, Math.floor(bounds.height * dpr));
      if (width === sizeRef.current.width && height === sizeRef.current.height) return;
      sizeRef.current = { width, height, dpr };
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${Math.floor(bounds.width)}px`;
      canvas.style.height = `${Math.floor(bounds.height)}px`;
      
      // Resize precipitation system
      if (precipitationSystemRef.current) {
        precipitationSystemRef.current.resize(width, height);
      }

      // Resize clouds canvas
      const cloudsCanvas = cloudsCanvasRef.current;
      if (cloudsCanvas) {
        cloudsCanvas.width = width;
        cloudsCanvas.height = height;
        cloudsCanvas.style.width = `${Math.floor(bounds.width)}px`;
        cloudsCanvas.style.height = `${Math.floor(bounds.height)}px`;
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(canvas.parentElement ?? canvas);

    let raf = 0;
    let last = performance.now();
    const animate = (now: number) => {
      const dt = Math.min(200, now - last);
      last = now;

      const smoothing = 1 - Math.exp(-dt / 400);
      currentRef.current = blendLayers(currentRef.current, targetRef.current, smoothing);

      const { width, height } = sizeRef.current;
      
      // Pass the high-res timestamp 'now' into the renderer
      const skyResult = renderSkyGradient(ctx, width, height, currentRef.current, stateRef.current, now);

      // Render precipitation
      if (!precipitationSystemRef.current) {
        precipitationSystemRef.current = new PrecipitationSystem(width, height, stateRef.current.weather.windSpeed || 0, stateRef.current.weather.windDirection || 0);
      }

      const precipSystem = precipitationSystemRef.current;
      const precipitation = stateRef.current.weather.precipitation;
      const precipIntensity = mapPrecipitationToIntensity(stateRef.current.weather);

      // Update and render precipitation
      precipSystem.updateWind(stateRef.current.weather.windSpeed || 0, stateRef.current.weather.windDirection || 0);
      precipSystem.update(dt / 1000, precipitation, precipIntensity);
      renderPrecipitation(ctx, precipSystem, precipitation, precipIntensity, currentRef.current);

      // Render clouds
      const cloudCover = stateRef.current.weather.cloudCover;
      if (cloudCover > 0) {
        if (!cloudsRendererRef.current) {
          const cloudsCanvas = cloudsCanvasRef.current;
          if (cloudsCanvas) {
            try {
              cloudsRendererRef.current = new SkyCloudsRenderer(cloudsCanvas);
            } catch (e) {
              console.warn('WebGL not supported for clouds:', e);
            }
          }
        }
        if (cloudsRendererRef.current) {
          cloudsRendererRef.current.render(
            now / 1000,
            width,
            height,
            currentRef.current.upperSky,
            currentRef.current.midSky,
            currentRef.current.horizonBand,
            stateRef.current.astronomy.sunElevation,
            {
              ...stateRef.current.weather,
              lightningEffect: skyResult.lightningEffect
            }
          );
        }
      } else {
        if (cloudsRendererRef.current) {
          cloudsRendererRef.current.dispose();
          cloudsRendererRef.current = null;
        }
      }

      raf = window.requestAnimationFrame(animate);
    };

    raf = window.requestAnimationFrame(animate);

    return () => {
      resizeObserver.disconnect();
      window.cancelAnimationFrame(raf);
      if (precipitationSystemRef.current) {
        precipitationSystemRef.current.clear();
      }
      if (cloudsRendererRef.current) {
        cloudsRendererRef.current.dispose();
      }
    };
  }, []);

  return { canvasRef, cloudsCanvasRef };
};

/**
 * Map weather code to realistic precipitation intensity
 * Based on WMO weather codes
 */
const mapWeatherCodeToIntensity = (code: number): 'light' | 'moderate' | 'heavy' => {
  // Drizzle: light but present (51-57)
  if (code >= 51 && code <= 57) {
    return code === 57 ? 'moderate' : 'light'; // 57 is freezing drizzle, slightly more intense
  }
  
  // Rain: varies by intensity code (61-67)
  if (code >= 61 && code <= 67) {
    if (code === 61) return 'light';      // Slight rain
    if (code === 62) return 'moderate';   // Moderate rain
    if (code === 63) return 'heavy';      // Heavy rain
    if (code === 64) return 'light';      // Light freezing rain
    if (code === 65) return 'moderate';   // Moderate/heavy freezing rain
    if (code === 66) return 'moderate';   // Light rain and snow
    if (code === 67) return 'heavy';      // Rain and snow/sleet
    return 'moderate';
  }
  
  // Showers: typically heavy and intermittent (80-82)
  if (code >= 80 && code <= 82) {
    if (code === 80) return 'moderate';   // Slight rain showers
    if (code === 81) return 'heavy';      // Moderate/heavy rain showers
    if (code === 82) return 'heavy';      // Violent rain showers
    return 'heavy';
  }
  
  // Snow showers: heavy (85-86)
  if (code >= 85 && code <= 86) {
    return 'heavy';
  }
  
  // Thunderstorm: heavy rain (95-99)
  if (code >= 95) {
    return code === 95 ? 'heavy' : 'heavy'; // Thunderstorm variants
  }
  
  return 'moderate';
};

/**
 * Map weather precipitation state to intensity level
 */
const mapPrecipitationToIntensity = (weather: SkyStateInput['weather']): 'light' | 'moderate' | 'heavy' => {
  // First, try to use weather code if available for precise mapping
  if (weather.weatherCode !== undefined && weather.weatherCode !== null) {
    return mapWeatherCodeToIntensity(weather.weatherCode);
  }
  
  const { precipitationAmount = 0, precipitationProbability = 0 } = weather;

  // Light: < 2.5mm/h or low probability
  if (precipitationAmount < 2.5 || precipitationProbability < 0.4) {
    return 'light';
  }

  // Heavy: > 10mm/h or high probability
  if (precipitationAmount > 10 || precipitationProbability > 0.8) {
    return 'heavy';
  }

  // Moderate: in between
  return 'moderate';
};

/**
 * Render precipitation particles to canvas
 */
const renderPrecipitation = (
  ctx: CanvasRenderingContext2D,
  system: PrecipitationSystem,
  precipitationType: 'rain' | 'snow' | 'none',
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate',
  skyLayers: SkyLayerColors
) => {
  const config = PRECIPITATION_CONFIG;
  const particles = system.getParticles();
  const canvasHeight = ctx.canvas.height;

  if (particles.length === 0) return;

  // Set blend mode for precipitation - lighter blending for better visibility
  const previousBlendMode = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighten';

  for (const particle of particles) {
    // Don't modulate alpha here - let renderRainStreak/renderSnowflake handle it
    ctx.globalAlpha = 1.0;

    if (particle.type === 'rain') {
      renderRainStreak(ctx, particle, intensity);
    } else {
      renderSnowflake(ctx, particle, intensity, skyLayers, canvasHeight);
    }
  }

  ctx.globalAlpha = 1.0;
  ctx.globalCompositeOperation = previousBlendMode;
};

/**
 * Render a single rain streak with intensity-based color and opacity
 */
const renderRainStreak = (ctx: CanvasRenderingContext2D, particle: Particle, intensity: 'light' | 'moderate' | 'heavy' = 'moderate') => {
  // Realistic rain streaks - balance between visibility and realism
  let streakLength = particle.size * 8;
  if (intensity === 'moderate') streakLength = particle.size * 9;
  if (intensity === 'heavy') streakLength = particle.size * 10;

  ctx.save();
  ctx.translate(particle.x, particle.y);

  const angle = Math.atan2(particle.vy, particle.vx);
  ctx.rotate(angle);

  // Adjust opacity and color based on rain intensity
  let baseOpacity = Math.max(0.4, particle.opacity * 1.5);
  let rainColor = 'rgba(255, 255, 255,';
  
  switch (intensity) {
    case 'light':
      // Drizzle: pale, slightly gray, lower opacity
      baseOpacity *= 0.7;
      rainColor = 'rgba(240, 245, 250,';
      break;
    case 'moderate':
      // Normal rain: bright white
      rainColor = 'rgba(255, 255, 255,';
      break;
    case 'heavy':
      // Heavy rain/showers: very bright, slightly blue-tinted, higher opacity
      baseOpacity *= 1.2;
      rainColor = 'rgba(220, 240, 255,';
      break;
  }

  ctx.strokeStyle = `${rainColor} ${baseOpacity})`;
  ctx.lineWidth = Math.max(1.0, particle.size * 1.2);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-streakLength / 2, 0);
  ctx.lineTo(streakLength / 2, 0);
  ctx.stroke();

  ctx.restore();
};

/**
 * Render a single snowflake with intensity-based opacity and sky-tinted color
 */
const renderSnowflake = (
  ctx: CanvasRenderingContext2D, 
  particle: Particle, 
  intensity: 'light' | 'moderate' | 'heavy' = 'moderate',
  skyLayers: SkyLayerColors,
  canvasHeight: number
) => {
  ctx.save();
  ctx.translate(particle.x, particle.y);

  if (particle.rotation) {
    ctx.rotate(particle.rotation);
  }

  // Adjust opacity based on snow intensity
  let opacity = Math.max(0.5, particle.opacity * 1.5);
  
  switch (intensity) {
    case 'light':
      // Light snow: subtle, lower opacity
      opacity *= 0.8;
      break;
    case 'moderate':
      // Normal snow: balanced visibility
      break;
    case 'heavy':
      // Heavy snow: very visible, higher opacity
      opacity *= 1.1;
      break;
  }

  // Sample sky color at particle position for realistic tinting
  const normalizedY = particle.y / canvasHeight;
  const skyColor = sampleSkyColor(skyLayers, normalizedY);
  
  // Create tinted snow color - blend white snow with sky color
  // Snow should appear whiter in darker skies and more tinted in colorful skies
  const snowTintFactor = 0.3; // How much the sky color affects the snow
  const tintedColor: [number, number, number] = [
    1.0 - (1.0 - skyColor[0]) * snowTintFactor, // Blend towards white
    1.0 - (1.0 - skyColor[1]) * snowTintFactor,
    1.0 - (1.0 - skyColor[2]) * snowTintFactor
  ];

  // Draw soft-edged snowflake with sky-tinted color
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size * 2);
  grad.addColorStop(0, `rgba(${Math.floor(tintedColor[0] * 255)}, ${Math.floor(tintedColor[1] * 255)}, ${Math.floor(tintedColor[2] * 255)}, ${opacity})`);
  grad.addColorStop(0.6, `rgba(${Math.floor(tintedColor[0] * 255)}, ${Math.floor(tintedColor[1] * 255)}, ${Math.floor(tintedColor[2] * 255)}, ${opacity * 0.6})`);
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, particle.size * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
