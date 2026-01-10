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
  drift?: number; // maximum horizontal drift amplitude (pixels)
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
      'Snow prioritizes depth ambiguity and gentle nonlinearity'
    ]
  },

  global: {
    coordinateSystem: 'screen-space',
    spawnArea: 'top',
    despawnRule: 'below-screen',
    timeScale: 1.0
  },

  wind: {
    directionDegrees: 12,
    strength: 0.2,
    affects: ['velocity.x'],
    gusts: false
  },

  motionNoise: {
    type: 'perlin',
    scale: 0.25,        // long wavelength = gentle float
    speed: 0.08,        // slow temporal evolution
    smoothness: 0.95,   // very smooth interpolation
    appliesTo: {
      rain: ['x'],
      snow: ['x', 'rotation', 'velocity.y']
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
        snow: 0.02
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
      spawnRate: 45,
      lifetime: 7.5,
      velocity: { y: [35, 90] },
      size: [0.69, 1.27], // was [0.6, 1.1]
      opacity: [0.3, 0.55],
      drift: 30,
      description: 'Sparse, floating flakes with high depth ambiguity'
    },
    moderate: {
      spawnRate: 110,
      lifetime: 8.0,
      velocity: { y: [45, 120] },
      size: [0.86, 1.55], // was [0.75, 1.35]
      opacity: [0.35, 0.65],
      drift: 50,
      description: 'Layered snowfall with visible depth separation'
    },
    heavy: {
      spawnRate: 180,
      lifetime: 9.0,
      velocity: { y: [60, 150] },
      size: [0.98, 1.84], // was [0.85, 1.6]
      opacity: [0.4, 0.7],
      drift: 65,
      description: 'Dense snowfall with foreground/background velocity stratification'
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
