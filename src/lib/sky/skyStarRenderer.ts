// src/lib/sky/skyStarRenderer.ts
import { Star } from './skyStars';
import { createStarField } from './skyStars';
import { clamp01, mixColor, smoothstep } from './skyUtils';

// ----------------------------
// Stars: realistic sprite-based rendering with Apple Weather-like visuals
// ----------------------------
type StarEx = Star & {
  // Local-only star enhancements (no need to change your Star type)
  rgb: [number, number, number];
  radius: number; // sprite radius (pixels)
  intensity: number; // normalized brightness (0..1-ish)
};

let starData: StarEx[] = [];
let starFieldW = 0;
let starFieldH = 0;

// Offscreen base star layer (static)
let starLayerCanvas: HTMLCanvasElement | null = null;
let starLayerCtx: CanvasRenderingContext2D | null = null;

// A subset to twinkle
let twinkleIndices: number[] = [];

// Sprite atlas keyed by (radius bucket + color bucket)
type SpriteKey = string;
const starSprites = new Map<SpriteKey, HTMLCanvasElement>();

/**
 * Star color temperature distribution inspired by real celestial observations.
 * Returns rgb in [0..1]. Mostly white/cool, with some warm K-stars.
 */
const sampleStarColor = (r01: number): [number, number, number] => {
  // r01 in [0..1]
  // Distribution: 10% warm M-stars, 60% neutral F/G/A stars, 30% cool B/O stars
  if (r01 < 0.1) {
    // M-stars: warm orange/red
    return mixColor([1.0, 0.7, 0.4], [1.0, 0.82, 0.65], r01 / 0.1);
  } else if (r01 < 0.7) {
    // F/G/A stars: neutral white/warm-white
    const t = (r01 - 0.1) / 0.6;
    return mixColor([1.0, 0.92, 0.75], [0.98, 0.98, 0.95], t);
  } else {
    // B/O stars: cool blue-white
    const t = (r01 - 0.7) / 0.3;
    return mixColor([0.92, 0.95, 1.0], [0.8, 0.88, 1.0], t);
  }
};

/**
 * Apple Weather-style star sprite:
 * Sharp, pinpoint cores. Only bright stars have glow.
 */
const getStarSprite = (radius: number, rgb: [number, number, number], hasBrightGlow: boolean = false) => {
  const rBucket = Math.round(radius * 10) / 10;
  const cBucket = `${Math.round(rgb[0] * 10)}${Math.round(rgb[1] * 10)}${Math.round(rgb[2] * 10)}`;
  const glowBucket = hasBrightGlow ? '_glow' : '_sharp';
  const key: SpriteKey = `${rBucket}_${cBucket}${glowBucket}`;

  const cached = starSprites.get(key);
  if (cached) return cached;

  const size = 8; // Small, sharp
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const sctx = c.getContext('2d', { willReadFrequently: false })!;
  sctx.clearRect(0, 0, size, size);

  const centerX = size / 2;
  const centerY = size / 2;

  // Always have a sharp core
  const coreSize = Math.max(0.2, Math.min(0.8, radius * 0.5));
  
  const coreGradient = sctx.createRadialGradient(
    centerX, centerY, 0,
    centerX, centerY, coreSize + 0.5
  );
  coreGradient.addColorStop(0, `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},1)`);
  coreGradient.addColorStop(1, `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},0)`);
  sctx.fillStyle = coreGradient;
  sctx.fillRect(0, 0, size, size);

  // Only add subtle glow to bright stars
  if (hasBrightGlow) {
    const glowGradient = sctx.createRadialGradient(
      centerX, centerY, coreSize,
      centerX, centerY, size * 0.5
    );
    glowGradient.addColorStop(0, `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},0.06)`);
    glowGradient.addColorStop(1, `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},0)`);
    sctx.fillStyle = glowGradient;
    sctx.fillRect(0, 0, size, size);
  }

  starSprites.set(key, c);
  return c;
};

/**
 * Atmospheric extinction: stars dim near the horizon due to air mass.
 * alt = 1 at top of canvas, 0 at bottom (horizon).
 * Creates the natural effect of stars being brighter at zenith.
 */
const starExtinction = (y: number, height: number) => {
  const alt = clamp01(1 - y / height); // 0 near bottom, 1 near top
  // Realistic extinction curve: ~0.3 at horizon, ~1.0 at zenith
  // Using power law to match atmospheric extinction
  return 0.3 + 0.7 * Math.pow(alt, 1.2);
};

/**
 * Build the star cache from createStarField() and render a static base layer.
 */
export const ensureStarField = (width: number, height: number) => {
  if (starData.length && width === starFieldW && height === starFieldH && starLayerCanvas) return;

  // Raw stars from your generator
  const raw = createStarField(width, height);

  // Wrap into enriched stars
  starData = raw.map((s) => {
    const base = clamp01(s.baseAlpha);
    const intensity = Math.pow(base, 1.8); // Gamma curve for perceptual brightness
    const h = (Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453) % 1;
    const rgb = sampleStarColor(Math.abs(h));
    const radius = Math.max(0.5, Math.min(2.0, s.size * 1.2));

    return {
      ...s,
      rgb,
      radius,
      intensity,
    } as StarEx;
  });

  starFieldW = width;
  starFieldH = height;

  // Create offscreen base layer
  starLayerCanvas = document.createElement('canvas');
  starLayerCanvas.width = width;
  starLayerCanvas.height = height;
  starLayerCtx = starLayerCanvas.getContext('2d');

  if (!starLayerCtx) {
    starLayerCanvas = null;
    twinkleIndices = [];
    return;
  }

  // Render static layer with sprite-based stars (fast and realistic)
  starLayerCtx.clearRect(0, 0, width, height);
  starLayerCtx.save();

  for (const s of starData) {
    const ext = starExtinction(s.y, height);

    // Base alpha accounts for intensity and atmospheric extinction
    const a = clamp01(s.intensity * ext) * 0.95;
    if (a < 0.002) continue;

    // Only bright stars get glow
    const isBright = s.intensity > 0.4;
    const sprite = getStarSprite(s.radius, s.rgb, isBright);
    const half = sprite.width / 2; // 4 pixels, centered

    starLayerCtx.globalAlpha = a;
    starLayerCtx.drawImage(sprite, s.x - half, s.y - half);
  }

  starLayerCtx.restore();
  starLayerCtx.globalAlpha = 1;

  // Select ~15-20% of stars to twinkle (brightest ones preferentially)
  twinkleIndices = [];
  for (let i = 0; i < starData.length; i++) {
    const brightness = starData[i].intensity;
    // Brighter stars twinkle more obviously
    const twinkleProbability = 0.15 + brightness * 0.1;
    if (Math.random() < twinkleProbability) twinkleIndices.push(i);
  }
};

export const drawStars = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    sunElevation: number,
    cloudCover: number,
    time: number
) => {
    const cloudVisibilityFactor = Math.max(0, 1 - cloudCover * 1.2);

    // Physically accurate twilight thresholds (in degrees below horizon)
    // Civil twilight: -6° (brightest stars appear)
    // Astronomical twilight: -18° (all stars visible, full night)
    const CIVIL_TWILIGHT = -6;
    const ASTRONOMICAL_TWILIGHT = -18;

    if (sunElevation < CIVIL_TWILIGHT && cloudVisibilityFactor > 0.01) {
        ensureStarField(width, height);
    
        // Stars fade in from civil twilight (-6°) to astronomical twilight (-18°)
        // This is a 12-degree range for realistic star visibility progression
        const fadeRange = CIVIL_TWILIGHT - ASTRONOMICAL_TWILIGHT; // 12 degrees
        const nightDarkness = clamp01((CIVIL_TWILIGHT - sunElevation) / fadeRange);
        
        const starGlobalAlpha = nightDarkness * cloudVisibilityFactor;
    
        if (starGlobalAlpha > 0.01 && starLayerCanvas) {
          // ========== BASE LAYER ==========
          // Render static, non-twinkling stars
          ctx.save();
          ctx.globalAlpha = starGlobalAlpha;
          ctx.globalCompositeOperation = 'lighter'; // Additive blending for glow
          ctx.drawImage(starLayerCanvas, 0, 0);
          ctx.restore();

          // ========== TWINKLE OVERLAY ==========
          // Animate subset of stars with realistic scintillation
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          
          for (const idx of twinkleIndices) {
            const s = starData[idx];
            const ext = starExtinction(s.y, height);
            const baseA = clamp01(s.intensity * ext) * 0.95;
            
            if (baseA < 0.002) continue;

            // Multi-frequency twinkle for realistic scintillation
            // Uses multiple sine waves with different frequencies and phases
            const timeMs = time * 0.001; // Convert to seconds
            
            // Primary twinkle: ~1-2 Hz (slow breath-like variation)
            const t1 = Math.sin(timeMs * 1.2 + s.x * 0.008 + s.y * 0.002) * 0.3;
            
            // Secondary twinkle: ~2-4 Hz (faster variation)
            const t2 = Math.sin(timeMs * 3.1 + s.x * 0.015 - s.y * 0.005) * 0.25;
            
            // Tertiary twinkle: ~4-8 Hz (micro-oscillations, more for bright stars)
            const t3 = Math.sin(timeMs * 6.7 + (s.x + s.y) * 0.01) * s.intensity * 0.2;
            
            // Combine twinkles: creates natural looking scintillation
            // Range: 0.45 to 1.55 (base to +55% brightness variation)
            const twinkleFactor = 1 + t1 + t2 + t3;

            const a = clamp01(baseA * twinkleFactor * starGlobalAlpha);
            
            if (a > 0.002) {
              // Only bright stars get glow
              const isBright = s.intensity > 0.4;
              const sprite = getStarSprite(s.radius, s.rgb, isBright);
              const half = sprite.width / 2; // 4 pixels
              ctx.globalAlpha = a;
              ctx.drawImage(sprite, s.x - half, s.y - half);
            }
          }
          
          ctx.restore();
        }
      }
};