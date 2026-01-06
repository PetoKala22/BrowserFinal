// skyStars.tsx
import { Star } from './skyTypes';

export const createStarField = (width: number, height: number, density = 0.0006): Star[] => {
  const count = Math.floor(width * height * density);
  const stars: Star[] = [];

  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      // Bias towards fainter stars for realism
      baseAlpha: Math.pow(Math.random(), 3) * 0.7 + 0.3, 
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.003
    });
  }
  return stars;
};