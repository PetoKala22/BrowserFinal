import { SkyLayerColors } from './skyTypes';
import { toCssRgb } from './skyColor';

export const renderSkyGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors
) => {
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, toCssRgb(layers.upperSky));
  gradient.addColorStop(0.5, toCssRgb(layers.midSky));
  gradient.addColorStop(1, toCssRgb(layers.horizonBand));
  gradient.addColorStop(1, toCssRgb(layers.groundBounce));

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
};
