/**
 * Precipitation Particle System
 * Handles rain and snow particles with smooth motion, Perlin noise modulation,
 * and realistic visual effects
 */

import { PRECIPITATION_CONFIG, PrecipitationType } from './precipitationConfig';

/**
 * Simplifed Perlin-like noise for smooth, predictable motion
 * Uses a combination of sine waves for smooth, continuous variation
 */
class PerlinNoiseGenerator {
  private seeds: number[] = [];
  private currentTime: number = 0;

  constructor() {
    // Initialize with random seeds for multiple octaves
    for (let i = 0; i < 4; i++) {
      this.seeds[i] = Math.random() * 256;
    }
  }

  update(deltaTime: number, speed: number) {
    this.currentTime += deltaTime * speed;
  }

  getValue(x: number, y: number, scale: number): number {
    const t = this.currentTime;
    const s = scale;

    // Multiple octaves of sine waves for natural-looking noise
    let value = 0;
    value += Math.sin((x * 0.005 + t * 0.3) / s) * 0.5;
    value += Math.sin((y * 0.008 + t * 0.2) / s) * 0.3;
    value += Math.sin((x * y * 0.0001 + t * 0.15) / s) * 0.2;

    return (value + 1) / 2; // Normalize to 0-1
  }
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  lifetime: number;
  age: number;
  rotation: number;
  rotationVelocity: number;
  type: 'rain' | 'snow';
  intensity: 'light' | 'moderate' | 'heavy';
  motionNoiseOffset: number; // for variation between particles
}

export class PrecipitationSystem {
  private particles: Particle[] = [];
  private width: number;
  private height: number;
  private config = PRECIPITATION_CONFIG;
  private noiseGenerator: PerlinNoiseGenerator;
  private spawnAccumulator: number = 0;
  private lastTime: number = performance.now();

  // Wind calculation
  private windAngleRadians: number;
  private windStrength: number;

  constructor(width: number, height: number, windSpeed: number = 0, windDirection: number = 12) {
    this.width = width;
    this.height = height;
    this.noiseGenerator = new PerlinNoiseGenerator();
    this.updateWind(windSpeed, windDirection);
  }

  updateWind(windSpeed: number = 0, windDirection: number = 12) {
    const baseWind = this.config.wind;
    this.windAngleRadians = (windDirection * Math.PI) / 180;
    this.windStrength = baseWind.strength * Math.max(windSpeed, 0.5); // Minimum wind speed for some movement
  }

  update(deltaTime: number, precipitationType: 'rain' | 'snow' | 'storm' | 'none', intensity: 'light' | 'moderate' | 'heavy' = 'moderate') {
    this.noiseGenerator.update(deltaTime, this.config.motionNoise.speed);

    // Update existing particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;

      // Remove particle if lifetime exceeded or off-screen
      if (p.age >= p.lifetime || p.y > this.height) {
        this.particles.splice(i, 1);
        continue;
      }

      // Update position with velocity
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      // Apply motion noise for smooth horizontal drift
      const noiseInfluence = this.config.motionNoise.scale;
      const noise = this.noiseGenerator.getValue(p.x, p.y, noiseInfluence);
      const noiseOffset = (noise - 0.5) * 2; // -1 to 1

      if (p.type === 'rain') {
        // Horizontal drift based on wind strength
        const baseDrift = 20;
        const windDrift = this.windStrength * Math.cos(this.windAngleRadians) * baseDrift;
        p.vx += (windDrift + noiseOffset * baseDrift) * deltaTime; // Smooth drift
      } else {
        // More pronounced drift for snow based on wind
        const baseDrift = this.config.types.snow.intensityLevels[intensity].drift || 15;
        const windDrift = this.windStrength * Math.cos(this.windAngleRadians) * baseDrift;
        p.vx = windDrift * 0.5 + noiseOffset * baseDrift * deltaTime;

        // Update rotation for snow
        if (this.config.types.snow.rotation) {
          p.rotation += p.rotationVelocity * deltaTime;
          p.rotation %= Math.PI * 2;
        }
      }

      // Fade in/out
      const fadeInDuration = 0.2;
      const fadeOutDuration = 0.3;
      let fadeMultiplier = 1;

      if (p.age < fadeInDuration) {
        fadeMultiplier = p.age / fadeInDuration;
      } else if (p.age > p.lifetime - fadeOutDuration) {
        fadeMultiplier = (p.lifetime - p.age) / fadeOutDuration;
      }

      p.opacity *= this.config.rendering.softEdges ? fadeMultiplier : 1;
    }

    // Spawn new particles
    if (precipitationType !== 'none') {
      // Map 'storm' to rain
      const actualType = precipitationType === 'storm' ? 'rain' : precipitationType;
      const typeConfig = this.config.types[actualType];
      
      if (typeConfig) {
        const intensityConfig = typeConfig.intensityLevels[intensity];
        const spawnRate = intensityConfig.spawnRate;

        this.spawnAccumulator += spawnRate * deltaTime;

        while (this.spawnAccumulator >= 1) {
          this.spawnParticle(actualType as 'rain' | 'snow', intensity, typeConfig);
          this.spawnAccumulator -= 1;
        }
      }
    } else {
      this.spawnAccumulator = 0;
    }
  }

  private spawnParticle(
    type: 'rain' | 'snow',
    intensity: 'light' | 'moderate' | 'heavy',
    typeConfig: PrecipitationType
  ) {
    const intensityConfig = typeConfig.intensityLevels[intensity];

    // Spawn across full width with padding, accounting for wind drift
    // Wind will carry particles horizontally - we just need enough horizontal spawn area
    const [vyMin, vyMax] = intensityConfig.velocity.y;
    const avgVy = (vyMin + vyMax) / 2;
    const avgLifetime = intensityConfig.lifetime;
    
    // Calculate how far wind will drift a particle during its lifetime
    const windDriftDistance = Math.abs(Math.cos(this.windAngleRadians)) * this.windStrength * 300 * avgLifetime;
    
    // Expand spawn width to account for wind drift
    const spawnPadding = Math.min(1.5, windDriftDistance / this.width);
    const spawnWidth = this.width * (1.0 + spawnPadding);
    const spawnOffsetX = -(spawnWidth - this.width) / 2; // Center it
    
    const x = Math.random() * spawnWidth + spawnOffsetX;
    const y = -50; // Start above screen with buffer

    // Velocity with variance
    const vy = vyMin + Math.random() * (vyMax - vyMin);

    // Size and opacity
    const [sizeMin, sizeMax] = intensityConfig.size;
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);

    const [opacityMin, opacityMax] = intensityConfig.opacity;
    const opacity = opacityMin + Math.random() * (opacityMax - opacityMin);

    // Wind effect
    const windVx = Math.cos(this.windAngleRadians) * this.windStrength * 50;

    // Angle variance for rain streaks
    let vx = windVx;
    if (type === 'rain' && typeConfig.angleVarianceDegrees) {
      const angleVariance = (typeConfig.angleVarianceDegrees * Math.PI) / 180;
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * angleVariance;
      vx = Math.cos(angle) * 50 + windVx;
    }

    // Rotation for snow
    let rotation = Math.random() * Math.PI * 2;
    let rotationVelocity = 0;
    if (type === 'snow' && typeConfig.rotation) {
      rotationVelocity = (Math.random() - 0.5) * 4; // -2 to 2 rad/s
    }

    const particle: Particle = {
      x,
      y,
      vx,
      vy,
      size,
      opacity,
      lifetime: intensityConfig.lifetime,
      age: 0,
      rotation,
      rotationVelocity,
      type,
      intensity,
      motionNoiseOffset: Math.random()
    };

    this.particles.push(particle);
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clear() {
    this.particles = [];
    this.spawnAccumulator = 0;
  }
}
