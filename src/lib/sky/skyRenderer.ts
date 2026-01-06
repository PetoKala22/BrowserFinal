// skyRenderer.ts
import { SkyLayerColors, SkyStateInput, Star } from './skyTypes';
import { toCssRgb } from './skyColor';
import { createStarField } from './skyStars';

let starData: Star[] = [];

const getSunScreenPosition = (width: number, height: number, azimuth: number, elevation: number) => {
  const viewAzimuth = 180;
  const fov = 100;
  let azDelta = azimuth - viewAzimuth;
  if (azDelta > 180) azDelta -= 360;
  if (azDelta < -180) azDelta += 360;

  const x = width / 2 + (azDelta / (fov / 2)) * (width / 2);
  const horizonY = height * 0.6;
  const pixelsPerDegree = height / 90; 
  const y = horizonY - (elevation * pixelsPerDegree);

  return { x, y };
};

export const renderSkyGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  state: SkyStateInput,
  time: number // Time driven by requestAnimationFrame
) => {
  ctx.clearRect(0, 0, width, height);

  // 1. Base Atmospheric Gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, toCssRgb(layers.upperSky));
  gradient.addColorStop(0.55, toCssRgb(layers.midSky));
  gradient.addColorStop(1, toCssRgb(layers.horizonBand));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const sunElev = state.astronomy.sunElevation;

  // 2. Animated Twinkling Stars (Night only)
  if (sunElev < 5) {
    if (starData.length === 0 || width !== ctx.canvas.width) {
      starData = createStarField(width, height);
    }
    
    const starOpacity = Math.max(0, Math.min(1, (-sunElev + 5) / 10));
    
    if (starOpacity > 0.01) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      
      starData.forEach(star => {
        // Calculate twinkle using sine wave for smooth pulsing
        const twinkle = Math.sin(time * star.speed + star.phase);
        // Alpha oscillates between 40% and 100% of baseAlpha
        const alpha = star.baseAlpha * (0.7 + 0.3 * twinkle) * starOpacity;
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // 3. Sun Glow (Mie Scattering)
  if (sunElev > -18) {
    const sunPos = getSunScreenPosition(width, height, state.astronomy.sunAzimuth, sunElev);
    if (sunPos.x > -width && sunPos.x < width * 2) {
      const glowRadius = Math.min(width, height) * 0.9;
      const glowGrad = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, glowRadius);
      glowGrad.addColorStop(0, toCssRgb(layers.horizonBand, 0.5)); 
      glowGrad.addColorStop(0.4, toCssRgb(layers.midSky, 0.15));
      glowGrad.addColorStop(1, toCssRgb(layers.upperSky, 0));

      ctx.globalCompositeOperation = 'screen'; 
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  // 4. Ground Bounce
  const groundGrad = ctx.createLinearGradient(0, height * 1, 0, height);
  groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 0));
  groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 1));
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.85, width, height * 0.15);

  // 5. Dithering
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 3; 
    data[i] += noise;
    data[i+1] += noise;
    data[i+2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
};
