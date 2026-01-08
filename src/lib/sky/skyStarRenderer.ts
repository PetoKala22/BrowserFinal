// src/lib/sky/skyStarRenderer.ts
import { Star } from './skyTypes';
import { createStarField } from './skyStars';
import { clamp01, mixColor, smoothstep } from './skyUtils';

// ----------------------------
// Stars: realistic sprite-based rendering
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
 * Approximate star color temperature distribution.
 * Return rgb in [0..1]. We bias toward near-white with some warm and some blue-white.
 */
const sampleStarColor = (r01: number): [number, number, number] => {
  // r01 in [0..1]
  // 0.0..0.35 warm, 0.35..0.85 neutral, 0.85..1.0 cool
  if (r01 < 0.35) return mixColor([1.0, 0.78, 0.55], [1.0, 0.92, 0.82], r01 / 0.35); // warm -> slightly warm-white
  if (r01 < 0.85)
    return mixColor([1.0, 0.92, 0.85], [0.97, 0.98, 1.0], (r01 - 0.35) / 0.5); // warm-white -> neutral
  return mixColor([0.93, 0.96, 1.0], [0.78, 0.86, 1.0], (r01 - 0.85) / 0.15); // neutral -> blue-white
};

/**
 * Star PSF sprite: soft halo + bright core.
 * We generate small canvases once and reuse via drawImage.
 */
const getStarSprite = (radius: number, rgb: [number, number, number]) => {
  const rBucket = Math.round(radius * 10) / 10;
  const cBucket = `${Math.round(rgb[0] * 10)}${Math.round(rgb[1] * 10)}${Math.round(rgb[2] * 10)}`;
  const key: SpriteKey = `${rBucket}_${cBucket}`;

  const cached = starSprites.get(key);
  if (cached) return cached;

  const size = 4;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const sctx = c.getContext('2d')!;
  sctx.clearRect(0, 0, size, size);

  sctx.fillStyle = `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},1)`;
  sctx.fillRect(1, 1, 2, 2);

  starSprites.set(key, c);
  return c;
};

/**
 * Atmospheric extinction: stars dim near the horizon.
 * alt = 1 at top of canvas, 0 at bottom.
 */
const starExtinction = (y: number, height: number) => {
  const alt = clamp01(1 - y / height); // 0 near bottom, 1 near top
  // Below ~15% altitude, heavy extinction. Above ~60%, mostly clear.
  return 0.22 + 0.78 * smoothstep(0.15, 0.6, alt);
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
    const intensity = Math.pow(base, 1.6);
    const h = (Math.sin(s.x * 12.9898 + s.y * 78.233) * 43758.5453) % 1;
    const rgb = sampleStarColor(Math.abs(h));
    const radius = Math.max(0.6, Math.min(2.2, s.size * 1.15));

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

  // Render static layer with sprites (fast and more realistic than arcs)
  starLayerCtx.clearRect(0, 0, width, height);
  starLayerCtx.save();

  for (const s of starData) {
    const ext = starExtinction(s.y, height);

    // Base alpha is intensity * extinction, capped low (stars are subtle)
    const a = clamp01(s.intensity * ext) * 0.9;
    if (a < 0.003) continue;

    const sprite = getStarSprite(s.radius, s.rgb);
    const half = sprite.width / 2;

    starLayerCtx.globalAlpha = a;
    starLayerCtx.drawImage(sprite, s.x - half, s.y - half);
  }

  starLayerCtx.restore();
  starLayerCtx.globalAlpha = 1;

  twinkleIndices = [];
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

    // FIXED: Only start fading stars in when sun is well below horizon.
    // Previously '5' (visible during day), now '-2' (twilight only).
    const STAR_VISIBILITY_THRESHOLD = -2;

    if (sunElevation < STAR_VISIBILITY_THRESHOLD && cloudVisibilityFactor > 0.01) {
        ensureStarField(width, height);
    
        // Calculate darkness factor based on new negative threshold.
        // Starts at 0 when sun is at -2deg, reaches 1.0 when sun is at -12deg.
        const fadeRange = 10;
        const nightDarkness = clamp01((-sunElevation + STAR_VISIBILITY_THRESHOLD) / fadeRange);
        
        const starGlobalAlpha = nightDarkness * cloudVisibilityFactor;
    
        if (starGlobalAlpha > 0.01 && starLayerCanvas) {
          // Base layer
          ctx.save();
          ctx.globalAlpha = starGlobalAlpha;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(starLayerCanvas, 0, 0);
          ctx.restore();
        }
      }
};