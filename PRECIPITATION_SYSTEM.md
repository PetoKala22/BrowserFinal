# Precipitation System Documentation

## Overview

The precipitation system is a perceptually-driven particle-based rain and snow renderer integrated into the weather widget's sky background. It prioritizes smooth, realistic motion over physical simulation.

## Architecture

### Core Files

1. **precipitationConfig.ts** - Configuration object defining all precipitation parameters
2. **precipitationSystem.ts** - Particle system with physics and spawning logic
3. **useSkyBackground.ts** - Integration point that renders precipitation to canvas
4. **skyTypes.ts** - Type definitions (extended with precipitation metrics)

## Key Features

### Philosophy
- **Perceptual realism over physics**: Particles are sized and moved to create visual intensity, not realistic physics
- **Smooth, predictable motion**: No chaotic turbulence; motion uses Perlin-like noise
- **Confidence encoding**: Visual properties (edge softness, opacity) encode data confidence
- **Conservative snow**: Snow is less dense/uncertain than rain

### Intensity Levels

Three intensity levels control particle density and behavior:

#### Rain
- **Light**: 80 particles/sec, sparse drizzle, low confidence
- **Moderate**: 160 particles/sec, steady rainfall  
- **Heavy**: 300 particles/sec, dense downpour

#### Snow
- **Light**: 30 particles/sec, intermittent flakes
- **Moderate**: 70 particles/sec, consistent snowfall
- **Heavy**: 140 particles/sec, dense snow, reduced visibility

### Intensity Mapping

Intensity is automatically derived from weather data:
- **Light**: precipitation < 2.5mm/h OR probability < 40%
- **Heavy**: precipitation > 10mm/h OR probability > 80%
- **Moderate**: in between

## Physics & Effects

### Wind
- Direction: 15° (configurable)
- Strength: 0.25× multiplier (affected by weather.windSpeed)
- Only affects X velocity component

### Motion Noise
- Type: Perlin-like (sine wave octaves for smoothness)
- Scale: 0.35 (affects wavelength)
- Speed: 0.15 (animation speed)
- Rain: Applies noise to X (horizontal drift)
- Snow: Applies noise to both X and rotation

### Rendering

**Blend Mode**: Screen (additive, brightens background)
- Better for white precipitation against sky
- Creates natural light-scattering effect

**Rain Streaks**
- Line-based rendering
- Angle based on velocity vector
- Motion blur effect from elongation

**Snow Flakes**
- Circular particles with radial gradient
- Soft edges (configurable)
- Rotation for visual variation
- 3D depth suggested by size variation

### Particle Lifecycle

1. **Spawn**: Top of screen (y < 0), random X position
2. **Age**: Lifetime ranges 1.4s (heavy rain) to 8.0s (heavy snow)
3. **Fade**: 0.2s fade-in, 0.3s fade-out
4. **Despawn**: Automatic when lifetime exceeded or y > screen height

## Integration

The precipitation system is fully integrated into the sky background renderer:

```tsx
// In useSkyBackground.ts
const precipSystem = new PrecipitationSystem(width, height, windSpeed);
precipSystem.update(deltaTime, precipitation, intensity);
renderPrecipitation(ctx, precipSystem, precipitation);
```

## Extending the System

### Adding New Precipitation Types

1. Add type to `precipitationConfig.ts`:
```typescript
hail: {
  visualModel: 'particle',
  gravity: 0,
  intensityLevels: {
    light: { ... },
    // etc
  }
}
```

2. Update `PrecipitationType` union and rendering in `useSkyBackground.ts`

### Adjusting Visual Parameters

Edit `PRECIPITATION_CONFIG` in `precipitationConfig.ts`:
- Spawn rates
- Lifetimes
- Velocities
- Opacity ranges
- Drift amounts
- Noise parameters

### Fine-tuning Motion

The `PerlinNoiseGenerator` in `precipitationSystem.ts` uses sine wave octaves. Adjust:
- Frequency multipliers (currently 0.005, 0.008, 0.0001)
- Amplitude weights (currently 0.5, 0.3, 0.2)
- Time scale (currently 0.3, 0.2, 0.15)

## Performance Considerations

- Particle pool limited by spawn rate and lifetime
- Maximum typical particles: ~300 (heavy rain) → ~600-700 total
- Canvas operations are GPU-accelerated
- Motion noise uses lightweight approximation, not true Perlin
- Batch rendering in single animation frame

## Non-Goals

The system intentionally does NOT implement:
- Ground splashes or interaction
- Thunder or extreme weather events
- Microbursts or wind gust fronts
- Realistic precipitation accumulation
- Per-particle collision detection

## Weather API Integration

The system reads from the weather widget state:

```typescript
weather: {
  precipitation: 'none' | 'rain' | 'snow' | 'storm',
  precipitationAmount?: number,        // mm/h
  precipitationProbability?: number,   // 0-1
  windSpeed?: number,                  // km/h
  cloudCover: number,
  fogDensity: number,
  visibility: number
}
```

Intensity is calculated from `precipitationAmount` and `precipitationProbability`.
