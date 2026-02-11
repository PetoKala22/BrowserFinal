// src/lib/sky/skyNoise.ts

// ----------------------------
// Noise tile (cheap dithering/grain)
// ----------------------------
let noiseTileCanvas: HTMLCanvasElement | null = null;
let noiseTileSize = 128;

const lcg = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
};

const getNoiseTile = (size = 128) => {
  if (noiseTileCanvas && noiseTileSize === size) return noiseTileCanvas;

  noiseTileSize = size;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const nctx = c.getContext('2d');
  if (!nctx) {
    noiseTileCanvas = null;
    return null;
  }

  const img = nctx.createImageData(size, size);
  const d = img.data;

  const rand = lcg(0xdecafbad);
  for (let i = 0; i < d.length; i += 4) {
    const v = (rand() * 255) | 0;
    d[i] = v;
    d[i + 1] = v;
    d[i + 2] = v;
    d[i + 3] = 255;
  }

  nctx.putImageData(img, 0, 0);
  noiseTileCanvas = c;
  return c;
};

export const overlayNoise = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength: number,
  time: number
) => {
  if (strength <= 0.001) return;

  const tile = getNoiseTile(256); // Larger tile for smoother gradients
  if (!tile) return;

  const alpha = Math.min(0.015, strength / 120); // Much lower opacity for smoother blending
  const scrollX = Math.floor((time * 2) % tile.width); // Slower scroll
  const scrollY = Math.floor((time * 1.5) % tile.height);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = 'overlay'; // Smoother blending than soft-light

  for (let y = -tile.height; y < height + tile.height; y += tile.height) {
    for (let x = -tile.width; x < width + tile.width; x += tile.width) {
      ctx.drawImage(tile, x - scrollX, y - scrollY);
    }
  }

  ctx.restore();
};
