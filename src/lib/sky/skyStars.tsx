// skyStars.ts
import type { Star } from './skyTypes';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Create stars with a magnitude-like distribution:
 * - Many faint stars, few bright stars.
 * - Slight size correlation with brightness.
 */
export const createStarField = (width: number, height: number): Star[] => {
  const area = width * height;

  // Density tuned for typical fullscreen canvases; adjust as needed.
  const baseCount = Math.floor(area / 9000); // ~ (1920*1080)/9000 ≈ 230 stars
  const count = Math.max(120, Math.min(1200, baseCount));

  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;

    // Magnitude distribution:
    const isHero = Math.random() < 0.03;
    const u = Math.pow(Math.random(), 0.35); // 0..1 with more high values
    
    const bright = isHero
      ? 0.85 + Math.random() * 0.15
      : Math.pow(1 - u, 2.4);

    // baseAlpha in [0.03..0.95], skewed to faint
    const baseAlpha = clamp01(0.03 + bright * 0.92);

    // size: mostly subpixel, a few larger (correlate with brightness)
    const size = 0.6 + Math.pow(bright, 0.7) * 1.8; // ~0.6..2.4

    // Twinkle speed: small random range
    const speed = 1 + Math.random() * 2.0;
    const phase = Math.random() * Math.PI * 2;

    stars.push({ x, y, size, baseAlpha });
  }

  return stars;
};
