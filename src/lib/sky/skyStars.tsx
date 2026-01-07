// skyStars.tsx
import { Star } from './skyTypes';

export const createStarField = (width: number, height: number, density = 0.0006): Star[] => {
  const count = Math.floor(width * height * density);
  const stars: Star[] = [];

  // Quantize sizes so the renderer can bucket effectively (fewer unique radii)
  // while still looking natural.
  const sizeBuckets = [0.5, 0.75, 1.0, 1.25, 1.5];

  for (let i = 0; i < count; i++) {
    // Bias toward smaller stars (more realistic density in the sky)
    const sizePick = Math.pow(Math.random(), 1.8);
    const sizeIndex = Math.min(sizeBuckets.length - 1, Math.floor(sizePick * sizeBuckets.length));

    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: sizeBuckets[sizeIndex],
      // Bias towards fainter stars for realism
      baseAlpha: Math.pow(Math.random(), 3) * 0.7 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.003
    });
  }

  return stars;
};
