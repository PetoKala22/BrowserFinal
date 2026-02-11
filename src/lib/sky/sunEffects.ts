/**
 * Sun atmospheric effects: cloud occlusion and lens ghosts
 */

import { toCssRgb, type Rgb } from './skyColor';
import { mixColor, clamp01, smoothstep } from './skyUtils';
import { SUN } from './sunConstants';
import { getDiscClipPath, type SunSprite } from './sunSprite';

// Deterministic hash for cheap pseudo-random
const hash01 = (n: number) => {
  const x = Math.sin(n) * 43758.5453123;
  return x - Math.floor(x);
};

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/**
 * Draw cloud occlusion over the sun disc
 */
export const drawCloudOcclusion = (
  ctx: CanvasRenderingContext2D,
  sunPos: { x: number; y: number },
  sprite: SunSprite,
  cloudCover: number,
  fogDensity: number,
  time: number,
  windSpeed: number,
  skyAtSun: Rgb
) => {
  if (cloudCover <= 0.08) return;

  const occ = clamp01(cloudCover * 1.1 + fogDensity * 0.4);
  const occAlpha = 0.08 + occ * 0.28;
  // base animated wind plus contribution from real wind speed
  const wind = time * (0.35 + cloudCover * 0.25) + (windSpeed || 0) * 0.02;

  ctx.save();

  // Clip to disc in the current transformed space (squash already applied)
  ctx.translate(sunPos.x, sunPos.y);
  ctx.clip(getDiscClipPath(sprite.discRadius * 0.95, sprite.discRadius * 0.95));
  ctx.translate(-sunPos.x, -sunPos.y);

  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = `blur(${sprite.discRadius * 0.18}px)`;
  ctx.globalAlpha = occAlpha;
  ctx.fillStyle = toCssRgb(mixColor(skyAtSun, [0.65, 0.68, 0.74], 0.6), 1.0);

  const blobCount = clamp(Math.round(4 + cloudCover * 6), 4, 10);
  for (let i = 0; i < blobCount; i++) {
    const a = (i / blobCount) * Math.PI * 2;
    const rr = sprite.discRadius * (0.2 + hash01(i * 13.1 + 0.4) * 0.6);
    const bx =
      sunPos.x +
      Math.cos(a + wind * 0.6) * rr +
      Math.sin(wind + i) * sprite.discRadius * 0.12;
    const by =
      sunPos.y +
      Math.sin(a - wind * 0.5) * rr +
      Math.cos(wind * 0.9 + i) * sprite.discRadius * 0.12;
    const br = sprite.discRadius * (0.22 + hash01(i * 4.7 + 2.2) * 0.38);

    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  ctx.filter = 'none';
};

/**
 * Draw cinematic lens ghosts (refraction artifacts)
 */
export const drawLensGhosts = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: { x: number; y: number },
  sprite: SunSprite,
  sunVisibility: number,
  cloudCover: number,
  fogDensity: number,
  elevT: number,
  finalSunRGB: Rgb
) => {
  // Only when sun is visible and not heavily clouded
  if (sunVisibility <= 0.25 || cloudCover >= 0.85 || elevT <= 0.25) return;

  const cx = width * 0.5;
  const cy = height * 0.5;
  const dx = cx - sunPos.x;
  const dy = cy - sunPos.y;
  const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;
  const nx = dx / dist;
  const ny = dy / dist;

  // Reduce ghosts when sun near center (looks more natural)
  const centerDist01 = clamp01(dist / Math.max(width, height));
  const ghostStrength =
    SUN.ghostBase *
    sunVisibility *
    (1.0 - cloudCover) *
    clamp01(1.0 - fogDensity * 0.7) *
    smoothstep(0.15, 0.55, centerDist01);

  if (ghostStrength <= 0.004) return;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.filter = `blur(${sprite.discRadius * 0.35}px)`;
  ctx.globalAlpha = ghostStrength;

  const ghosts = [0.22, 0.46, 0.72, 0.92];
  for (let i = 0; i < ghosts.length; i++) {
    const t = ghosts[i];
    const px = sunPos.x + nx * dist * t;
    const py = sunPos.y + ny * dist * t;
    const s = sprite.discRadius * (0.55 + i * 0.38);

    const ring = ctx.createRadialGradient(px, py, s * 0.1, px, py, s);
    ring.addColorStop(0.0, toCssRgb(mixColor([0.95, 1.0, 1.0], finalSunRGB, 0.15), 0.14));
    ring.addColorStop(0.55, toCssRgb(mixColor([0.85, 0.95, 1.0], finalSunRGB, 0.05), 0.05));
    ring.addColorStop(1.0, toCssRgb([0.85, 0.95, 1.0], 0.0));

    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(px, py, s, 0, Math.PI * 2);
    ctx.fill();
  }

  // Very faint "aperture" spot opposite the sun
  const ox = cx + (cx - sunPos.x) * 0.22;
  const oy = cy + (cy - sunPos.y) * 0.22;
  ctx.filter = `blur(${sprite.discRadius * 0.55}px)`;
  ctx.globalAlpha = ghostStrength * 0.65;
  ctx.fillStyle = toCssRgb(mixColor([0.9, 1, 0.95], finalSunRGB, 0.1), 0.08);
  ctx.beginPath();
  ctx.arc(ox, oy, sprite.discRadius * 1.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};
