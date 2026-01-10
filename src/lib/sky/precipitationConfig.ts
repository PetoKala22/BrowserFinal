/**
 * Precipitation System Configuration
 * Defines the physics, rendering, and visual parameters for rain and snow
 * Philosophy: Perceptual realism over physical simulation
 */

export interface IntensityLevel {
  spawnRate: number; // particles per second
  lifetime: number; // seconds
  velocity: { y: [number, number] }; // y range in pixels/second
  size: [number, number]; // size range (relative to base)
  opacity: [number, number]; // opacity range (0-1)
  drift?: number; // horizontal drift for snow (pixels)
  description: string;
}

export interface PrecipitationType {
  visualModel: 'streak' | 'flake';
  gravity: number;
  angleVarianceDegrees?: number;
  rotation?: boolean;
  intensityLevels: {
    light: IntensityLevel;
    moderate: IntensityLevel;
    heavy: IntensityLevel;
  };
}

export interface MotionNoiseConfig {
  type: 'perlin';
  scale: number; // 0-1, affects wavelength
  speed: number; // animation speed multiplier
  smoothness: number; // 0-1, lerp factor
  appliesTo: {
    rain: string[];
    snow: string[];
  };
}

export interface RenderingConfig {
  blendMode: 'screen' | 'multiply' | 'overlay' | 'normal';
  softEdges: boolean;
  depthFade: boolean;
  motionBlur: {
    enabled: boolean;
    strength: {
      rain: number;
      snow: number;
    };
  };
}

export interface WindConfig {
  directionDegrees: number;
  strength: number; // 0-1 multiplier
  affects: string[]; // array of velocity components
  gusts: boolean;
}

export interface PrecipitationSystemConfig {
  philosophy: {
    goal: string;
    rules: string[];
  };

  global: {
    coordinateSystem: 'screen-space';
    spawnArea: 'top';
    despawnRule: 'below-screen';
    timeScale: number;
  };

  wind: WindConfig;
  motionNoise: MotionNoiseConfig;
  rendering: RenderingConfig;

  types: {
    rain: PrecipitationType;
    snow: PrecipitationType;
  };

  confidenceEncoding: {
    highConfidence: {
      edges: 'crisp';
      opacityStability: 'stable';
      motion: 'linear';
    };
    lowConfidence: {
      edges: 'soft';
      opacityStability: 'variable';
      motion: 'slightly dampened';
    };
  };

  transitions: {
    rainToSnow: {
      allowed: boolean;
      blendMethod: 'crossfade';
      temperatureThresholdC: [number, number];
      notes: string;
    };
  };

  nonGoals: string[];
}

export const PRECIPITATION_CONFIG: PrecipitationSystemConfig = {
  philosophy: {
    goal: 'Perceptual realism over physical simulation',
    rules: [
      'Intensity is expressed by density and motion, not particle size',
      'Motion must be smooth and predictable',
      'No chaotic turbulence or sudden changes',
      'Snow is visually conservative due to higher uncertainty'
    ]
  },

  global: {
    coordinateSystem: 'screen-space',
    spawnArea: 'top',
    despawnRule: 'below-screen',
    timeScale: 1.0
  },

  wind: {
    directionDegrees: 15,
    strength: 0.25,
    affects: ['velocity.x'],
    gusts: false
  },

  motionNoise: {
    type: 'perlin',
    scale: 0.35,
    speed: 0.15,
    smoothness: 0.9,
    appliesTo: {
      rain: ['x'],
      snow: ['x', 'rotation']
    }
  },

  rendering: {
    blendMode: 'screen',
    softEdges: true,
    depthFade: true,
    motionBlur: {
      enabled: true,
      strength: {
        rain: 0.25,
        snow: 0.05
      }
    }
  },

  types: {
    rain: {
      visualModel: 'streak',
      gravity: 0,
      angleVarianceDegrees: 5,
      intensityLevels: {
        light: {
          spawnRate: 80,
          lifetime: 1.2,
          velocity: { y: [1000, 1300] },
          size: [1.0, 1.2],
          opacity: [0.12, 0.2],
          description: 'Sparse drizzle, low confidence precipitation'
        },
        moderate: {
          spawnRate: 160,
          lifetime: 1.0,
          velocity: { y: [1300, 1800] },
          size: [1.0, 1.5],
          opacity: [0.2, 0.3],
          description: 'Steady rainfall with clear radar signal'
        },
        heavy: {
          spawnRate: 300,
          lifetime: 0.9,
          velocity: { y: [1800, 2400] },
          size: [1.2, 1.8],
          opacity: [0.25, 0.4],
          description: 'Dense downpour, strong radar reflectivity'
        }
      }
    },

    snow: {
      visualModel: 'flake',
      gravity: 0,
      rotation: true,
      intensityLevels: {
        light: {
          spawnRate: 50,
          lifetime: 6.0,
          velocity: { y: [80, 120] },
          size: [0.8, 1.6],
          opacity: [0.4, 0.6],
          drift: 35,
          description: 'Intermittent flakes, low accumulation confidence'
        },
        moderate: {
          spawnRate: 120,
          lifetime: 7.0,
          velocity: { y: [100, 150] },
          size: [1.0, 2.2],
          opacity: [0.5, 0.75],
          drift: 55,
          description: 'Consistent snowfall with visible accumulation'
        },
        heavy: {
          spawnRate: 200,
          lifetime: 8.0,
          velocity: { y: [120, 180] },
          size: [1.2, 2.8],
          opacity: [0.6, 0.85],
          drift: 75,
          description: 'Dense snow, wide flake variance, reduced visibility'
        }
      }
    }
  },

  confidenceEncoding: {
    highConfidence: {
      edges: 'crisp',
      opacityStability: 'stable',
      motion: 'linear'
    },
    lowConfidence: {
      edges: 'soft',
      opacityStability: 'variable',
      motion: 'slightly dampened'
    }
  },

  transitions: {
    rainToSnow: {
      allowed: true,
      blendMethod: 'crossfade',
      temperatureThresholdC: [0, 2],
      notes: 'Never hard-switch precipitation types'
    }
  },

  nonGoals: [
    'No splashes',
    'No ground interaction',
    'No thunder or extreme events',
    'No microbursts or gust fronts'
  ]
};
