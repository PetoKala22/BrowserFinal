import { toCssRgb } from './skyColor';

type Rgb = [number, number, number];

const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];

// Stable pseudo-random (no shimmer)
const hash = (n: number) =>
  Math.sin(n * 43758.5453) * 0.5 + 0.5;

// Perlin-style noise for organic variation
const noise2d = (x: number, y: number) => {
  const i = Math.floor(x);
  const j = Math.floor(y);
  const fx = x - i;
  const fy = y - j;
  
  const a = hash(i + j * 57);
  const b = hash(i + 1 + j * 57);
  const c = hash(i + (j + 1) * 57);
  const d = hash(i + 1 + (j + 1) * 57);
  
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  
  return a * (1 - u) * (1 - v) +
         b * u * (1 - v) +
         c * (1 - u) * v +
         d * u * v;
};

// Fractal noise for detail
const fbm = (x: number, y: number, octaves = 3) => {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1;
  
  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency) * amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  
  return value;
};

/**
 * Enhanced cloud mass with realistic noise-based edges
 */
const drawCloudMass = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: Rgb,
  alpha: number,
  lightBias: number,
  seed: number
) => {
  const lobes = 6;
  const stretchX = 1.8;
  const stretchY = 0.85;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(stretchX, stretchY);

  // Use noise for organic variation
  const noiseScale = 0.005;
  const turbulence = fbm(cx * noiseScale, cy * noiseScale, 2);

  // Core body with enhanced gradient
  const bodyGrad = ctx.createRadialGradient(
    0,
    -size * 0.25 * lightBias,
    size * 0.15,
    0,
    0,
    size * 1.1
  );

  const coreAlpha = alpha * (0.85 + turbulence * 0.15);
  bodyGrad.addColorStop(0, toCssRgb(color, coreAlpha));
  bodyGrad.addColorStop(0.4, toCssRgb(color, coreAlpha * 0.7));
  bodyGrad.addColorStop(0.75, toCssRgb(color, coreAlpha * 0.3));
  bodyGrad.addColorStop(1, toCssRgb(color, 0));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // Edge lobes with noise-based variation
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const h = hash(i * 91.7 + seed);
    const noiseFactor = fbm((cx + i * 100) * noiseScale, cy * noiseScale, 2);

    const r = size * (0.5 + h * 0.4 + noiseFactor * 0.1);
    const lx = Math.cos(a) * r;
    const ly = Math.sin(a) * r * 0.55 - size * 0.18;

    const lobeSize = size * (0.55 + h * 0.35 + noiseFactor * 0.1);

    const g = ctx.createRadialGradient(
      lx,
      ly - lobeSize * 0.25,
      0,
      lx,
      ly,
      lobeSize * 1.1
    );

    const lobeAlpha = alpha * (0.75 + noiseFactor * 0.25);
    g.addColorStop(0, toCssRgb(color, lobeAlpha));
    g.addColorStop(0.6, toCssRgb(color, lobeAlpha * 0.4));
    g.addColorStop(1, toCssRgb(color, 0));

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, lobeSize, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wispy edges for realism
  const wisps = 8;
  for (let i = 0; i < wisps; i++) {
    const a = (i / wisps) * Math.PI * 2 + hash(seed + i) * 0.5;
    const h = hash(i * 123.4 + seed);
    
    const r = size * (1.1 + h * 0.3);
    const wx = Math.cos(a) * r;
    const wy = Math.sin(a) * r * 0.6;
    
    const wispSize = size * (0.2 + h * 0.15);
    
    const wg = ctx.createRadialGradient(wx, wy, 0, wx, wy, wispSize);
    wg.addColorStop(0, toCssRgb(color, alpha * 0.15));
    wg.addColorStop(1, toCssRgb(color, 0));
    
    ctx.fillStyle = wg;
    ctx.beginPath();
    ctx.arc(wx, wy, wispSize, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
};

export const drawVolumetricClouds = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cloudCover: number,
  sunElevation: number,
  horizonColor: Rgb
) => {
  if (cloudCover <= 0.01) return;

  ctx.save();

  const sunIntensity = clamp((sunElevation + 10) / 20, 0, 1);

  // Enhanced lighting palette
  const highlight: Rgb = mixRgb(
    [1, 0.96, 0.88],
    [1, 1, 0.98],
    sunIntensity
  );

  const shadow: Rgb = mixRgb(
    [0.12, 0.15, 0.22],
    [0.82, 0.88, 0.94],
    sunIntensity
  );

  const shadowTinted = mixRgb(shadow, horizonColor, 0.3);

  // Optimized layer count
  const layers = Math.min(3 + Math.floor(cloudCover * 4), 8);

  for (let i = 0; i < layers; i++) {
    const seed = i * 173.31;
    const rx = hash(seed);
    const ry = hash(seed + 9.1);

    const y = height * (0.12 + ry * 0.4);
    const x = rx * width;

    const perspective = smoothstep(0.6, 0, y / height);
    const size = width * (0.15 + perspective * 0.4);
    const density = clamp(cloudCover * 1.2, 0, 1);

    // Atmospheric haze (back layer)
    drawCloudMass(
      ctx,
      x,
      y + size * 0.2,
      size * 1.2,
      shadowTinted,
      0.15 * density,
      -1,
      seed
    );

    // Main cloud body
    drawCloudMass(
      ctx,
      x,
      y + size * 0.1,
      size,
      shadowTinted,
      0.8 * density,
      -0.6,
      seed + 1
    );

    // Sunlit highlights
    if (sunIntensity > 0.1) {
      drawCloudMass(
        ctx,
        x,
        y - size * 0.15,
        size * 0.85,
        highlight,
        0.6 * density * sunIntensity,
        1,
        seed + 2
      );
    }
  }

  ctx.restore();
};