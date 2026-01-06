// skyRenderer.ts
import { SkyLayerColors, SkyStateInput } from './skyTypes';
import { toCssRgb } from './skyColor';
import { createStarField } from './skyStars';

let cachedStars: HTMLCanvasElement | null = null;

const getSunScreenPosition = (width: number, height: number, azimuth: number, elevation: number) => {
  // Approximate a camera looking South (180 degrees) with ~100 degree FOV
  const viewAzimuth = 180;
  const fov = 100;
  
  // Normalize azimuth difference to [-180, 180]
  let azDelta = azimuth - viewAzimuth;
  if (azDelta > 180) azDelta -= 360;
  if (azDelta < -180) azDelta += 360;

  const x = width / 2 + (azDelta / (fov / 2)) * (width / 2);
  
  // Map elevation: +90 (zenith) to -90 (nadir)
  // Horizon is usually at ~60% of screen height
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
  state: SkyStateInput
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

  // 2. Stars (Night only)
  if (sunElev < 5) {
    if (!cachedStars || cachedStars.width !== width || cachedStars.height !== height) {
      cachedStars = createStarField(width, height);
    }
    
    // Fade out as sun approaches horizon (-6 to +5 degrees)
    const starOpacity = Math.max(0, Math.min(1, (-sunElev + 5) / 10));
    
    if (starOpacity > 0.01) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = starOpacity;
      ctx.drawImage(cachedStars, 0, 0);
      ctx.globalAlpha = 1.0;
    }
  }

  // 3. Sun Glow (Mie Scattering)
  // This adds the "bright spot" around the sun position
  if (sunElev > -18) {
    const sunPos = getSunScreenPosition(width, height, state.astronomy.sunAzimuth, sunElev);
    
    // If the sun is roughly within or near the screen bounds
    if (sunPos.x > -width && sunPos.x < width * 2) {
      const glowRadius = Math.min(width, height) * 0.9;
      const glowGrad = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, glowRadius);
      
      // The glow color is based on the horizon color (scattering)
      // We use 'screen' blend mode to make it additive light
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
  const groundGrad = ctx.createLinearGradient(0, height * 0.85, 0, height);
  groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 0));
  groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 1));
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.85, width, height * 0.15);

  // 5. Dithering (Remove banding)
  // Adds subtle noise to every pixel to smooth out the gradient
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 3; 
    data[i] = data[i] + noise;     // R
    data[i+1] = data[i+1] + noise; // G
    data[i+2] = data[i+2] + noise; // B
  }
  ctx.putImageData(imageData, 0, 0);
};