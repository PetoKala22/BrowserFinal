/**
 * Main sun rendering module
 * Orchestrates disc, bloom, halo, cloud occlusion, and lens ghosts
 * Optimized for Canvas2D (SDR) with caching and bounded draws.
 */

import type { SkyLayerColors } from './skyTypes';
import type { SunScreenPos } from './skyView';
import { lerp } from './skyUtils';
import { calculateSunColor, sampleSkyColorAtY } from './sunCalculations';
import { getSunSprite } from './sunSprite';
import { drawCloudOcclusion, drawLensGhosts } from './sunEffects';

/**
 * Main draw function for sun disc with all effects
 */
export const drawSunDisc = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  sunPos: SunScreenPos,
  sunElevation: number,
  sunVisibility: number,
  cloudCover: number,
  fogDensity: number,
  time: number,
  windSpeed: number
) => {
  if (sunVisibility <= 0.25 || sunElevation <= -2) return;

  // Extinction ramps sharply near horizon
  const extinction = Math.max(0, Math.min(1, (sunElevation + 1.5) / 8));

  // Calculate sun color and atmospheric properties
  const colorResult = calculateSunColor(
    height,
    sunElevation,
    extinction,
    cloudCover,
    fogDensity,
    sunVisibility,
    layers,
    sunPos
  );

  const {
    discRadius,
    squash,
    finalSunRGB,
    discBaseAlpha,
    haloRadius
  } = colorResult;

  // Subpixel micro jitter (keeps sun from looking static)
  const jitter =
    Math.sin(time * 12.7 + sunPos.x * 0.01 + sunPos.y * 0.02) * discRadius * 0.006;

  // Bake/cached sprite for disc+bloom+halo (cheap drawImage per frame)
  const sprite = getSunSprite({
    discRadius,
    haloRadius,
    extinction,
    elevT: colorResult.elevT,
    fogDensity,
    cloudCover,
    skyLum: colorResult.skyLum,
    finalSunRGB,
    discToneScale: colorResult.discToneScale,
    timeSeed: Math.floor(sunPos.x * 0.2 + sunPos.y * 0.2) // stable-ish
  });

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(jitter, jitter);

  // Apply refraction squash to the rendered sprite (cheap)
  ctx.translate(sunPos.x, sunPos.y);
  ctx.scale(1.0, squash);
  ctx.translate(-sunPos.x, -sunPos.y);

  // Draw cached sprite
  ctx.globalAlpha = discBaseAlpha;
  ctx.drawImage(sprite.canvas, sunPos.x - sprite.half, sunPos.y - sprite.half);

  // Cloud occlusion (dynamic, clipped to disc)
  const skyAtSun = sampleSkyColorAtY(layers, sunPos.y / Math.max(1, height));
  drawCloudOcclusion(ctx, sunPos, sprite, cloudCover, fogDensity, time, windSpeed, skyAtSun);

  // Lens ghosts (cinematic, conservative)
  drawLensGhosts(
    ctx,
    width,
    height,
    sunPos,
    sprite,
    sunVisibility,
    cloudCover,
    fogDensity,
    colorResult.elevT,
    finalSunRGB
  );

  ctx.restore(); // screen + transforms
};
