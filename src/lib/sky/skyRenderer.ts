// skyRenderer.ts
import { SkyLayerColors, SkyStateInput, Star } from './skyTypes';
import { toCssRgb, mixOklab } from './skyColor'; // We need mixOklab for dynamic cloud coloring
import { createStarField } from './skyStars';

let starData: Star[] = [];

// Helper: Mix two colors for canvas gradients
const mixColor = (c1: [number, number, number], c2: [number, number, number], t: number) => {
  return mixOklab(c1, c2, t);
};

const getSunScreenPosition = (width: number, height: number, azimuth: number, elevation: number) => {
  const viewAzimuth = 180;
  const fov = 100; // Field of view
  let azDelta = azimuth - viewAzimuth;
  if (azDelta > 180) azDelta -= 360;
  if (azDelta < -180) azDelta += 360;

  const x = width / 2 + (azDelta / (fov / 2)) * (width / 2);
  const horizonY = height * 0.6; // Horizon line at 60% down
  const pixelsPerDegree = height / 90; 
  const y = horizonY - (elevation * pixelsPerDegree);

  return { x, y };
};

/**
 * Renders a realistic atmospheric haze (Fog + Stratus Clouds)
 * using gradient compositing rather than shapes.
 */
const drawAtmosphere = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  fogDensity: number,
  cloudCover: number,
  sunElevation: number
) => {
  // 1. Calculate Atmospheric Color
  // Clouds aren't just white; they reflect the horizon light (orange at sunset, blue-grey at night)
  const baseCloudColor = layers.horizonBand;
  const denseCloudColor = mixColor(layers.midSky, [0.8, 0.85, 0.9], 0.3); // Mix sky color with grey
  
  // Interpolate cloud color based on sun elevation (darker at night)
  const lightIntensity = Math.max(0, Math.min(1, (sunElevation + 10) / 30));
  const effectiveCloudColor = mixColor(
    mixColor([0.1, 0.1, 0.15], baseCloudColor, 0.5), // Night/Dark cloud
    [1, 1, 1], // Day cloud
    lightIntensity
  );

  // --- FOG LAYER (Bottom-Up) ---
  if (fogDensity > 0.01) {
    const fogHeight = height * (0.2 + fogDensity * 0.8); // Fog rises with density
    const fogGrad = ctx.createLinearGradient(0, height, 0, height - fogHeight);
    
    // Fog is thickest at bottom
    fogGrad.addColorStop(0, toCssRgb(layers.horizonBand, fogDensity));
    // Fades out upward
    fogGrad.addColorStop(1, toCssRgb(layers.horizonBand, 0));

    ctx.fillStyle = fogGrad;
    ctx.fillRect(0, height - fogHeight, width, fogHeight);
  }

  // --- CLOUD LAYER (Top-Down Stratus) ---
  if (cloudCover > 0.01) {
    // "Overcast" gradient: Heaviest at top, thinning towards horizon
    // This simulates a flat cloud layer viewed from below
    const cloudGrad = ctx.createLinearGradient(0, 0, 0, height * 0.85);
    
    // At high coverage, the sky becomes a solid blanket
    const alphaTop = Math.min(1, cloudCover * 1.5); 
    const alphaBottom = Math.min(1, cloudCover * 0.8);

    cloudGrad.addColorStop(0, toCssRgb(effectiveCloudColor, alphaTop));
    cloudGrad.addColorStop(0.4, toCssRgb(effectiveCloudColor, alphaTop * 0.7));
    cloudGrad.addColorStop(1, toCssRgb(layers.horizonBand, alphaBottom * 0.1));

    ctx.fillStyle = cloudGrad;
    ctx.fillRect(0, 0, width, height);
  }
};

export const renderSkyGradient = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  layers: SkyLayerColors,
  state: SkyStateInput,
  time: number
) => {
  // Clear
  ctx.clearRect(0, 0, width, height);

  const { sunElevation, sunAzimuth } = state.astronomy;
  const { cloudCover, fogDensity } = state.weather;

  // 1. Base Gradient (The clear sky)
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, toCssRgb(layers.upperSky));
  gradient.addColorStop(0.55, toCssRgb(layers.midSky));
  gradient.addColorStop(1, toCssRgb(layers.horizonBand));
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Stars (Night only) - Dimmed by Clouds
  // Stars disappear as clouds get thicker (cloudCover * 1.5 makes them vanish faster)
  const cloudVisibilityFactor = Math.max(0, 1 - (cloudCover * 1.2));
  
  if (sunElevation < 5 && cloudVisibilityFactor > 0.01) {
    if (starData.length === 0 || width !== ctx.canvas.width) {
      starData = createStarField(width, height);
    }
    
    const nightDarkness = Math.max(0, Math.min(1, (-sunElevation + 5) / 10));
    const starGlobalAlpha = nightDarkness * cloudVisibilityFactor;
    
    if (starGlobalAlpha > 0.01) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      
      starData.forEach(star => {
        const twinkle = Math.sin(time * star.speed + star.phase);
        const alpha = star.baseAlpha * (0.7 + 0.3 * twinkle) * starGlobalAlpha;
        
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }
  }

  // 3. Sun Glow (Mie Scattering) - Dimmed by Clouds
  if (sunElevation > -18) {
    const sunPos = getSunScreenPosition(width, height, sunAzimuth, sunElevation);
    
    // Clouds diffuse the sun. High cloud cover spreads the light but dims the "disc"
    const sunVisibility = Math.max(0.1, 1 - cloudCover); 
    
    if (sunPos.x > -width && sunPos.x < width * 2) {
      // Glow radius expands when foggy/cloudy (scattering), but intensity drops
      const scatter = Math.max(1, (1 + fogDensity * 2 + cloudCover));
      const glowRadius = Math.min(width, height) * 0.9 * scatter;

      const glowGrad = ctx.createRadialGradient(sunPos.x, sunPos.y, 0, sunPos.x, sunPos.y, glowRadius);
      
      // Core color
      glowGrad.addColorStop(0, toCssRgb(layers.horizonBand, 0.5 * sunVisibility)); 
      // Mid scattering
      glowGrad.addColorStop(0.4, toCssRgb(layers.midSky, 0.15 * sunVisibility));
      // Outer edge
      glowGrad.addColorStop(1, toCssRgb(layers.upperSky, 0));

      ctx.globalCompositeOperation = 'screen'; 
      ctx.fillStyle = glowGrad;
      ctx.fillRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'source-over';
      
      // Draw Sun Disc (optional, only if sky is relatively clear)
      if (sunVisibility > 0.3 && sunElevation > 0) {
        ctx.beginPath();
        ctx.fillStyle = `rgba(255, 255, 230, ${0 * sunVisibility})`;
        ctx.arc(sunPos.x, sunPos.y, height * 0.04, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 4. ATMOSPHERE LAYER (Fog & Clouds)
  // We draw this *over* the sun/stars/sky but *before* the ground bounce
  drawAtmosphere(ctx, width, height, layers, fogDensity, cloudCover, sunElevation);

  // 5. Ground Bounce (Reflections on the ground)
  // Fog obscures the ground bounce
  const groundVisibility = Math.max(0, 1 - fogDensity);
  if (groundVisibility > 0.05) {
      const groundGrad = ctx.createLinearGradient(0, height * 1, 0, height);
      groundGrad.addColorStop(0, toCssRgb(layers.groundBounce, 0));
      groundGrad.addColorStop(1, toCssRgb(layers.groundBounce, 1 * groundVisibility));
      ctx.fillStyle = groundGrad;
      ctx.fillRect(0, height * 0.85, width, height * 0.15);
  }

  // 6. Dithering (Crucial for gradients to look smooth)
  // We increase noise slightly in bad weather to simulate "grain"
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const noiseStrength = 3 + (fogDensity * 4) + (cloudCover * 2); // More grain in fog

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * noiseStrength; 
    data[i] += noise;
    data[i+1] += noise;
    data[i+2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);
};