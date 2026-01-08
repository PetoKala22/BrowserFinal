/**
 * skyStars.ts
 * Physically inspired night-sky starfield generator.
 */

export type Star = {
  x: number;
  y: number;
  baseAlpha: number; // brightness 0..1
  size: number; // point size (mostly constant)
  color: "cool" | "neutral" | "warm";
  glow?: number; // optional halo strength
};

/* ------------------ utilities ------------------ */

const magnitudeBrightness = (r: number): number => {
  // Apparent magnitude distribution (inverse power law)
  const magnitude = Math.pow(r, 0.45) * 6;
  return Math.max(0, 1 - magnitude / 6);
};

const verticalExtinction = (yNorm: number): number => {
  // Atmospheric extinction near horizon
  return 1 - Math.pow(yNorm, 2.5) * 0.6;
};

const milkyWayDensity = (
  x: number,
  y: number,
  w: number,
  h: number
): number => {
  // Tilted galactic plane
  const angle = -0.35;
  const cx = x - w / 2;
  const cy = y - h / 2;

  const d =
    Math.sin(angle) * cx +
    Math.cos(angle) * cy;

  const bandWidth = h * 0.18;
  return Math.exp(-(d * d) / (2 * bandWidth * bandWidth));
};

const starColor = (r: number): "cool" | "neutral" | "warm" => {
  if (r < 0.65) return "cool";
  if (r < 0.88) return "neutral";
  return "warm";
};

/* ------------------ generator ------------------ */

export const createStarField = (
  width: number,
  height: number
): Star[] => {
  const stars: Star[] = [];

  // Density: ~1 star per 1500 px
  const targetStarCount = Math.floor(
    (width * height) / 1500
  );

  // Jittered grid (prevents clustering artifacts)
  const cellSize = Math.sqrt(
    (width * height) / targetStarCount
  );

  for (let gx = 0; gx < width; gx += cellSize) {
    for (let gy = 0; gy < height; gy += cellSize) {
      const x = gx + Math.random() * cellSize;
      const y = gy + Math.random() * cellSize;

      if (x >= width || y >= height) continue;

      const yNorm = y / height;

      // Atmospheric extinction
      if (Math.random() > verticalExtinction(yNorm)) continue;

      // Milky Way density boost
      const mw = milkyWayDensity(x, y, width, height);
      if (Math.random() > 0.75 + mw * 0.6) continue;

      const brightness = magnitudeBrightness(Math.random());

      // Cull faintest stars
      if (brightness < 0.045 && Math.random() > 0.015) continue;

      // Realistic star size (almost all are points)
      let size = 0.6;
      if (brightness > 0.9) size = 1.1;
      if (brightness > 0.96) size = 1.4;

      const star: Star = {
        x,
        y,
        baseAlpha: brightness,
        size,
        color:
          brightness > 0.65
            ? starColor(Math.random())
            : "neutral"
      };

      // Bright star halo (rare)
      if (brightness > 0.9) {
        star.glow = brightness * 2.4;
      }

      stars.push(star);
    }
  }

  /* --------- rare bright anchor stars --------- */

  const brightStarCount = Math.max(3, Math.floor(stars.length / 300));
  for (let i = 0; i < brightStarCount; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height * 0.7;

    stars.push({
      x,
      y,
      baseAlpha: 0.8 + Math.random() * 0.2,
      size: 1.5,
      glow: 3.0,
      color: starColor(Math.random())
    });
  }

  return stars;
};
