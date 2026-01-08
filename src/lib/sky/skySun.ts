// src/lib/sky/skySun.ts
import { toCssRgb } from './skyColor';
import { SunScreenPos } from './skyView';
import { clamp01, lerp, mixColor } from './skyUtils';

// ----------------------------
// Sun: realistic disc + bloom + chromatic halo + extinction
// ----------------------------
export const drawSunDisc = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  sunPos: SunScreenPos,
  sunElevation: number,
  sunVisibility: number,
  cloudCover: number,
  fogDensity: number,
  time: number
) => {
  if (sunVisibility <= 0.25 || sunElevation <= -2) return;

  // Elevation normalization for “day-ness”
  const elevT = clamp01((sunElevation + 2) / 12);

  // Extinction: more atmosphere near horizon
  const extinction = clamp01((sunElevation + 1) / 6);

  // Apparent disc radius: slightly smaller near horizon
  const baseRadius = height * 0.035;
  const discRadius = baseRadius * lerp(0.6, 1.0, extinction);

  // Color shift: warm near horizon, neutral at high elevation
  const warmRGB: [number, number, number] = [1.0, 0.70, 0.50];
  const neutralRGB: [number, number, number] = [1.0, 0.96, 0.88];
  const sunRGB = mixColor(warmRGB, neutralRGB, elevT);

  // Fog makes the sun “eat the sky”
  const fogBoost = lerp(1.0, 2.5, fogDensity);

  // Anti-CGI micro jitter (subpixel)
  const jitter = (Math.sin(time * 12.7 + sunPos.x * 0.01 + sunPos.y * 0.02) * 0.5) * discRadius * 0.02;

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(jitter, jitter);

  // -----------------------------
  // 1) Luminance-based disc core (no flat fill)
  // -----------------------------
  const core = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    0,
    sunPos.x,
    sunPos.y,
    discRadius * 0.85
  );
  core.addColorStop(0.0, toCssRgb([1.0, 1.0, 1.0], 1.0));
  core.addColorStop(0.25, toCssRgb([1.0, 0.99, 0.96], 0.95));
  core.addColorStop(0.55, toCssRgb(sunRGB, 0.55));
  core.addColorStop(1.0, toCssRgb(sunRGB, 0.0));

  ctx.globalAlpha = 0.95 * sunVisibility * elevT;
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sunPos.x, sunPos.y, discRadius * 0.9, 0, Math.PI * 2);
  ctx.fill();

  // -----------------------------
  // 2) Inner bloom (blurred)
  // -----------------------------
  ctx.globalAlpha = 0.55 * sunVisibility * fogBoost;
  ctx.filter = `blur(${discRadius * 0.75}px)`;
  ctx.fillStyle = toCssRgb(mixColor(sunRGB, [1, 1, 1], 0.35), 0.9);
  ctx.beginPath();
  ctx.arc(sunPos.x, sunPos.y, discRadius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // -----------------------------
  // 3) Chromatic halo split (warm + slightly cool fringe)
  // -----------------------------
  ctx.filter = 'none';

  const haloRadius = discRadius * (6 + cloudCover * 4 + fogDensity * 6);

  const haloWarm = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius,
    sunPos.x,
    sunPos.y,
    haloRadius
  );
  haloWarm.addColorStop(0.0, toCssRgb(mixColor([1, 0.82, 0.62], sunRGB, 0.6), 0.12 * sunVisibility * fogBoost));
  haloWarm.addColorStop(0.25, toCssRgb(mixColor([1, 0.78, 0.55], sunRGB, 0.35), 0.06 * sunVisibility));
  haloWarm.addColorStop(1.0, toCssRgb([1, 0.75, 0.55], 0));

  const haloCool = ctx.createRadialGradient(
    sunPos.x,
    sunPos.y,
    discRadius * 1.2,
    sunPos.x,
    sunPos.y,
    haloRadius * 1.1
  );
  haloCool.addColorStop(0.0, toCssRgb([0.90, 0.95, 1.0], 0.035 * sunVisibility));
  haloCool.addColorStop(0.6, toCssRgb([0.90, 0.95, 1.0], 0.012 * sunVisibility));
  haloCool.addColorStop(1.0, toCssRgb([0.90, 0.95, 1.0], 0));

  ctx.globalAlpha = 1;
  ctx.fillStyle = haloWarm;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = haloCool;
  ctx.fillRect(0, 0, width, height);

  ctx.restore();
};
