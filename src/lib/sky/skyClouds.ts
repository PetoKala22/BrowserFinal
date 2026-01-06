import { toCssRgb } from './skyColor';

type Rgb = [number, number, number];

const clamp = (v: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, v));

const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

export const drawVolumetricClouds = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cloudCover: number,
  sunElevation: number,
  horizonColor: Rgb
) => {
  if (cloudCover < 0.08) return;

  ctx.save();

  // --- Lighting --------------------------------------------------
  const sun = clamp((sunElevation + 6) / 40); // 0 at twilight, 1 at high noon
  const lightDirX = Math.cos((sunElevation * Math.PI) / 180);
  const lightDirY = -Math.sin((sunElevation * Math.PI) / 180);

  const cloudCount = Math.floor(6 + cloudCover * 18);

  // Base cloud colors
  const lightColor: Rgb = [1, 1, 1];
  const shadowColor: Rgb = [
    horizonColor[0] * 0.75,
    horizonColor[1] * 0.75,
    horizonColor[2] * 0.8
  ];

  // --- Cloud Layers ---------------------------------------------
  for (let i = 0; i < cloudCount; i++) {
    // Stable pseudo-random layout
    const seed = i * 928.371;
    const nx = Math.sin(seed * 1.31) * 0.5 + 0.5;
    const ny = Math.sin(seed * 2.17 + 1.4) * 0.5 + 0.5;

    // Height distribution (most clouds near horizon)
    const altitude = smoothstep(0, 1, ny);
    const y = height * (0.18 + altitude * 0.38);
    const x = nx * width;

    const baseSize = width * (0.18 + altitude * 0.25);
    const density = clamp(0.5 + cloudCover * 0.7);

    // --- Self-shadow pass ---------------------------------------
    ctx.globalAlpha = 0.12 + cloudCover * 0.25;
    drawCloudLobes(
      ctx,
      x - lightDirX * baseSize * 0.12,
      y - lightDirY * baseSize * 0.12,
      baseSize * 1.05,
      shadowColor,
      density,
      0.9
    );

    // --- Main volume --------------------------------------------
    ctx.globalAlpha = 0.25 + cloudCover * 0.45;
    drawCloudLobes(
      ctx,
      x,
      y,
      baseSize,
      mixRgb(shadowColor, lightColor, sun * 0.7),
      density,
      1
    );

    // --- Sun-facing highlight -----------------------------------
    if (sun > 0.15) {
      ctx.globalAlpha = 0.12 * sun;
      drawCloudLobes(
        ctx,
        x + lightDirX * baseSize * 0.18,
        y + lightDirY * baseSize * 0.18,
        baseSize * 0.75,
        lightColor,
        density * 0.7,
        0.8
      );
    }
  }

  ctx.restore();
};

// ----------------------------------------------------------------

const drawCloudLobes = (
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  color: Rgb,
  density: number,
  softness: number
) => {
  const lobes = 5;
  for (let i = 0; i < lobes; i++) {
    const a = (i / lobes) * Math.PI * 2;
    const r = size * (0.35 + 0.25 * Math.sin(i * 17.13));
    const x = cx + Math.cos(a) * r * 0.35;
    const y = cy + Math.sin(a) * r * 0.18;

    const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, toCssRgb(color, density));
    grad.addColorStop(1, toCssRgb(color, 0));

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  }
};

const mixRgb = (a: Rgb, b: Rgb, t: number): Rgb => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t
];
