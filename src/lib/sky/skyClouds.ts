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

/**
 * Apple-style cloud mass
 * - One dominant body
 * - Soft dissolving edges
 * - Vertical lighting (top brighter)
 */
const drawCloudMass = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: Rgb,
  alpha: number,
  lightBias: number // -1 = bottom heavy, +1 = top lit
) => {
  const lobes = 5;
  const stretchX = 1.6;
  const stretchY = 0.9;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(stretchX, stretchY);

  // Core body
  const bodyGrad = ctx.createRadialGradient(
    0,
    -size * 0.2 * lightBias,
    size * 0.2,
    0,
    0,
    size
  );

  bodyGrad.addColorStop(0, toCssRgb(color, alpha));
  bodyGrad.addColorStop(0.6, toCssRgb(color, alpha * 0.55));
  bodyGrad.addColorStop(1, toCssRgb(color, 0));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(0, 0, size, 0, Math.PI * 2);
  ctx.fill();

  // Edge lobes (large + soft)
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const h = hash(i * 91.7 + cx * 0.01);

    const r = size * (0.45 + h * 0.35);
    const lx = Math.cos(a) * r;
    const ly = Math.sin(a) * r * 0.6 - size * 0.15;

    const lobeSize = size * (0.5 + h * 0.3);

    const g = ctx.createRadialGradient(
      lx,
      ly - lobeSize * 0.2,
      0,
      lx,
      ly,
      lobeSize
    );

    g.addColorStop(0, toCssRgb(color, alpha * 0.9));
    g.addColorStop(1, toCssRgb(color, 0));

    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lx, ly, lobeSize, 0, Math.PI * 2);
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

  // --- Apple-style lighting palette ---
  const highlight: Rgb = mixRgb(
    [1, 0.95, 0.9],
    [1, 1, 1],
    sunIntensity
  );

  const shadow: Rgb = mixRgb(
    [0.15, 0.18, 0.25],
    [0.85, 0.9, 0.95],
    sunIntensity
  );

  const shadowTinted = mixRgb(shadow, horizonColor, 0.25);

  // Cloud layers (Apple stacks shelves)
  const layers = 4 + Math.floor(cloudCover * 6);

  for (let i = 0; i < layers; i++) {
    const seed = i * 173.31;
    const rx = hash(seed);
    const ry = hash(seed + 9.1);

    const y = height * (0.15 + ry * 0.35);
    const x = rx * width;

    const perspective = smoothstep(0.5, 0, y / height);
    const size = width * (0.18 + perspective * 0.35);
    const density = clamp(cloudCover * 1.3, 0, 1);

    // Back haze (atmospheric glue)
    drawCloudMass(
      ctx,
      x,
      y + size * 0.18,
      size * 1.15,
      shadowTinted,
      0.12 * density,
      -1
    );

    // Core mass
    drawCloudMass(
      ctx,
      x,
      y + size * 0.08,
      size,
      shadowTinted,
      0.75 * density,
      -0.5
    );

    // Highlight cap (only if sun exists)
    if (sunIntensity > 0.05) {
      drawCloudMass(
        ctx,
        x,
        y - size * 0.12,
        size * 0.9,
        highlight,
        0.55 * density * sunIntensity,
        1
      );
    }
  }

  ctx.restore();
};
