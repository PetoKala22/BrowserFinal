/**
 * usePrecipitation Hook
 * Manages precipitation rendering on canvas with rain streaks and snow flakes
 */

import React, { useEffect, useRef } from 'react';
import { PrecipitationSystem, Particle } from '@/lib/sky/precipitationSystem';
import { PRECIPITATION_CONFIG } from '@/lib/sky/precipitationConfig';

const RAIN_GRADIENT_CACHE = new Map<string, CanvasGradient>();
const SNOW_TEXTURE_CACHE = new Map<string, HTMLCanvasElement>();

/**
 * Create a rain streak gradient (white-ish with transparency)
 */
function createRainGradient(ctx: CanvasRenderingContext2D, length: number): CanvasGradient {
  const cacheKey = `rain-${length}`;
  if (RAIN_GRADIENT_CACHE.has(cacheKey)) {
    return RAIN_GRADIENT_CACHE.get(cacheKey)!;
  }

  const grad = ctx.createLinearGradient(0, 0, 0, length);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  RAIN_GRADIENT_CACHE.set(cacheKey, grad);
  return grad;
}

/**
 * Create a snowflake texture (small white circle with blur effect)
 */
function createSnowflakeTexture(size: number): HTMLCanvasElement {
  const cacheKey = `snow-${size}`;
  if (SNOW_TEXTURE_CACHE.has(cacheKey)) {
    return SNOW_TEXTURE_CACHE.get(cacheKey)!;
  }

  const canvas = document.createElement('canvas');
  const actualSize = Math.ceil(size * 4); // Scale up for anti-aliasing
  canvas.width = actualSize;
  canvas.height = actualSize;

  const ctx = canvas.getContext('2d')!;

  // Draw a soft-edged snowflake (circle with gaussian-like blur)
  const centerX = actualSize / 2;
  const centerY = actualSize / 2;
  const radius = actualSize / 4;

  // Create radial gradient for soft edges
  const grad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.6)');
  grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  SNOW_TEXTURE_CACHE.set(cacheKey, canvas);
  return canvas;
}

interface UsePrecipitationProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  precipitationType: 'rain' | 'snow' | 'none';
  intensity: 'light' | 'moderate' | 'heavy';
  windSpeed?: number;
  enabled?: boolean;
}

export const usePrecipitation = ({
  canvasRef,
  precipitationType,
  intensity,
  windSpeed = 0,
  enabled = true
}: UsePrecipitationProps) => {
  const systemRef = useRef<PrecipitationSystem | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize system
    if (!systemRef.current) {
      systemRef.current = new PrecipitationSystem(canvas.width, canvas.height, windSpeed, 0); // Default wind direction
    } else {
      systemRef.current.updateWind(windSpeed, 0); // Default wind direction
    }

    const system = systemRef.current;
    let lastTime = performance.now();
    const config = PRECIPITATION_CONFIG;

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.033); // Cap at 33ms
      lastTime = currentTime;

      // Update particle system
      system.update(deltaTime, precipitationType, intensity);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Set blend mode
      const blendMode = config.rendering.blendMode;
      ctx.globalCompositeOperation =
        blendMode === 'screen'
          ? 'screen'
          : blendMode === 'multiply'
          ? 'multiply'
          : blendMode === 'overlay'
          ? 'overlay'
          : 'source-over';

      // Render particles
      const particles = system.getParticles();
      for (const particle of particles) {
        ctx.globalAlpha = particle.opacity;

        if (particle.type === 'rain') {
          renderRainStreak(ctx, particle);
        } else {
          renderSnowflake(ctx, particle);
        }
      }

      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    // Handle canvas resize
    const handleResize = () => {
      if (canvas.parentElement) {
        const rect = canvas.parentElement.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        system.resize(canvas.width, canvas.height);
      }
    };

    // Initial resize
    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [canvasRef, precipitationType, intensity, windSpeed, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (systemRef.current) {
        systemRef.current.clear();
      }
    };
  }, []);
};

/**
 * Render a rain streak particle
 */
function renderRainStreak(ctx: CanvasRenderingContext2D, particle: Particle) {
  const streakLength = particle.size * 12; // Base streak length

  ctx.save();
  ctx.translate(particle.x, particle.y);

  // Angle based on velocity
  const angle = Math.atan2(particle.vy, particle.vx);
  ctx.rotate(angle);

  // Draw streak
  ctx.strokeStyle = `rgba(255, 255, 255, ${particle.opacity})`;
  ctx.lineWidth = particle.size * 0.8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(-streakLength / 2, 0);
  ctx.lineTo(streakLength / 2, 0);
  ctx.stroke();

  ctx.restore();
}

/**
 * Render a snowflake particle
 */
function renderSnowflake(ctx: CanvasRenderingContext2D, particle: Particle) {
  const texture = createSnowflakeTexture(particle.size);

  ctx.save();
  ctx.translate(particle.x, particle.y);

  // Apply rotation
  if (particle.rotation) {
    ctx.rotate(particle.rotation);
  }

  // Draw snowflake texture centered
  ctx.drawImage(
    texture,
    -particle.size * 2,
    -particle.size * 2,
    particle.size * 4,
    particle.size * 4
  );

  ctx.restore();
}

export interface PrecipitationRenderState {
  type: 'rain' | 'snow' | 'none';
  intensity: 'light' | 'moderate' | 'heavy';
}
