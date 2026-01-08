/**
 * Sun disc, bloom, halo rendering tunables and constants
 * Extracted from skySun.ts for better organization
 */

import type { Rgb } from './skyColor';

export const SUN = {
  discRadiusFrac: 0.05,

  // Halo scaling
  haloBase: 6,
  haloCloudK: 4,
  haloFogK: 6,

  // Refraction squash (vertical compression) near horizon
  squashMin: 0.50,
  squashPow: 1.7,

  // Disc: edge softness & limb
  edgeInner: 0.72,
  edgeOuter: 1.02,
  edgeNoiseAmp: 0.003,

  limbLayers: 3,

  // Granulation
  granuleAlpha: 0.05,
  granuleMinRadius: 18,

  // Bloom (baked into sprite)
  bloomBase: 0.18,
  bloomFogK: 0.35,
  bloomPasses: 3,

  // Halo colors (baked into sprite)
  haloWarmA0: 0.11,
  haloWarmA1: 0.055,
  haloCoolA0: 0.03,
  haloCoolA1: 0.012,

  // Lens ghosts (still dynamic)
  ghostBase: 0.035
} as const;

export type SunConfig = typeof SUN;
