// skyLightning.ts
// Realistic lightning effects for thunderstorms, inspired by Apple's weather app
// Features: branching bolts, bloom flashes, color shifting, atmospheric glow

import { toCssRgb, Rgb, mixOklab } from './skyColor';
import { clamp01, hash01, lerp, smoothstep } from './skyUtils';

// ============== CONSTANTS ==============

const LIGHTNING = {
  // Strike generation
  strikeFrequency: 0.0008, // ~1 strike per 20-30 seconds at intensity 1.0
  futureLookAhead: 2000, // ms to generate strikes ahead of time
  
  // Bolt physics
  branchFactor: 0.45, // Probability of branching at each segment (more realistic)
  branchLengthFactor: 0.65, // Child branches are 65% of parent length
  maxBranchDepth: 5, // Maximum recursion depth (more detail)
  segmentLength: 35, // Base segment length in pixels
  jitterFactor: 0.55, // Horizontal jitter per segment (more jagged)
  tapering: 0.88, // Width reduction per segment (steeper taper)
  
  // Color (brighter, more intense white)
  coreColor: [1.0, 1.0, 1.0] as Rgb, // Pure white
  outerColor: [0.85, 0.9, 1.0] as Rgb, // Brighter bluish-white
  
  // Flash timing (quicker peak for more drama)
  flashRiseDuration: 30, // ms to reach peak brightness
  flashFallDuration: 150, // ms to fade
  glowHaloDuration: 500, // ms for bloom halo
  
  // Screen effects
  bloomIntensity: 2.0, // Multiply glow radius by this
  bloomAlpha: 0.5, // Peak bloom alpha
  haloDiffusion: 0.25, // Halo diffusion amount
};

// ============== TYPES ==============

type LightningSegment = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  width: number;
  depth: number;
};

type LightningBolt = {
  id: string;
  startTime: number; // When the strike began (performance.now())
  segments: LightningSegment[];
  flashPeak: number; // Time of peak flash brightness
  seedX: number; // Horizontal seed for randomness
  seedY: number; // Vertical seed for randomness
};

// ============== GENERATION ==============

const hash01 = (seed: number): number => {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
};

const generateBoltSegments = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  width: number,
  depth: number,
  seed: number
): LightningSegment[] => {
  const segments: LightningSegment[] = [];
  
  segments.push({ x0, y0, x1, y1, width, depth });
  
  // Recursively generate branches
  if (depth < LIGHTNING.maxBranchDepth) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    
    // Branch at 1-3 points along the segment
    const branchCount = hash01(seed + depth * 0.7) > 0.6 ? 2 : 1;
    for (let b = 0; b < branchCount; b++) {
      const t = 0.2 + hash01(seed + depth + b * 0.3) * 0.6;
      const bx = lerp(x0, x1, t);
      const by = lerp(y0, y1, t);
      
      const branchAngle = (hash01(seed + depth + b * 11.1) - 0.5) * Math.PI;
      const branchLen = len * LIGHTNING.branchLengthFactor;
      const bx2 = bx + Math.cos(branchAngle) * branchLen;
      const by2 = by + Math.sin(branchAngle) * branchLen;
      
      const newWidth = width * LIGHTNING.tapering;
      segments.push(
        ...generateBoltSegments(bx, by, bx2, by2, newWidth, depth + 1, seed + b * 7.3)
      );
    }
  }
  
  return segments;
};

const generateLightningBolt = (
  centerX: number,
  centerY: number,
  stormIntensity: number,
  seed: number
): LightningBolt => {
  const seedX = hash01(seed * 0.13) * centerX * 2 - centerX;
  const seedY = hash01(seed * 0.27) * centerY * 0.3;
  
  const x0 = centerX + seedX;
  const y0 = -100; // Start above screen
  
  const jitterX = (hash01(seed + 1.7) - 0.5) * centerX * 0.4;
  const x1 = centerX + jitterX;
  const y1 = centerY * (0.3 + hash01(seed + 3.2) * 0.4);
  
  const baseWidth = 4.5 + stormIntensity * 3; // Thicker base width
  
  const segments = generateBoltSegments(x0, y0, x1, y1, baseWidth, 0, seed);
  
  return {
    id: `bolt-${seed}-${Date.now()}`,
    startTime: performance.now(),
    segments,
    flashPeak: LIGHTNING.flashRiseDuration,
    seedX,
    seedY
  };
};

// ============== STATE MANAGEMENT ==============

const activeBolts: Map<string, LightningBolt> = new Map();
let nextStrikeTime = 0;

export const resetLightningState = () => {
  activeBolts.clear();
  nextStrikeTime = 0;
};

const updateStrikes = (now: number, stormIntensity: number) => {
  // Remove expired bolts (accounting for sustain phase)
  const boltLifetime = LIGHTNING.flashRiseDuration + 200 + LIGHTNING.flashFallDuration + 100;
  for (const [id, bolt] of activeBolts) {
    const age = now - bolt.startTime;
    if (age > boltLifetime) {
      activeBolts.delete(id);
    }
  }
  
  // Generate new strikes
  if (stormIntensity > 0.05 && now >= nextStrikeTime) {
    const frequency = LIGHTNING.strikeFrequency * Math.sqrt(stormIntensity);
    nextStrikeTime = now + (1 / frequency) * (0.5 + hash01(now * 0.001) * 1.5);
    
    // Can spawn 1-3 bolts per strike event (branching effect)
    const boltCount = stormIntensity > 0.7 ? 2 : 1;
    for (let i = 0; i < boltCount; i++) {
      const seed = now + i * 1.1;
      const bolt = generateLightningBolt(
        window.innerWidth * 0.5,
        window.innerHeight * 0.4,
        stormIntensity,
        seed
      );
      activeBolts.set(bolt.id, bolt);
    }
  }
};

// ============== RENDERING ==============

const drawBolt = (
  ctx: CanvasRenderingContext2D,
  bolt: LightningBolt,
  now: number,
  width: number,
  height: number
) => {
  const age = now - bolt.startTime;
  
  // Longer visibility window: quick rise, sustain, then slow decay
  let flashAlpha = 0;
  if (age < LIGHTNING.flashRiseDuration) {
    // Quick rise to peak
    flashAlpha = smoothstep(0, LIGHTNING.flashRiseDuration, age);
  } else if (age < LIGHTNING.flashRiseDuration + 200) {
    // Sustain at peak for 200ms (much longer visibility!)
    flashAlpha = 1.0;
  } else if (age < LIGHTNING.flashRiseDuration + 200 + LIGHTNING.flashFallDuration) {
    // Then gradual fade
    const decayAge = age - LIGHTNING.flashRiseDuration - 200;
    flashAlpha = 1 - smoothstep(0, LIGHTNING.flashFallDuration, decayAge);
  }
  
  if (flashAlpha < 0.001) return; // Even lower threshold
  
  const coreAlpha = flashAlpha; // Full brightness
  const glowAlpha = flashAlpha * 0.6; // Increased glow
  
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // Outer glow pass (wider, softer)
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = glowAlpha * 1.0; // Much brighter outer glow
  ctx.strokeStyle = toCssRgb(LIGHTNING.outerColor);
  ctx.filter = 'blur(2px)';
  
  for (const seg of bolt.segments) {
    const glowWidth = seg.width * 5; // Even wider glow (was 4)
    ctx.lineWidth = glowWidth;
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.stroke();
  }
  
  ctx.filter = 'none';
  
  // Middle glow pass (medium brightness)
  ctx.globalAlpha = glowAlpha * 1.0;
  for (const seg of bolt.segments) {
    const midGlowWidth = seg.width * 2.8; // Thicker middle (was 2.2)
    ctx.lineWidth = midGlowWidth;
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.stroke();
  }
  
  // Core bolt pass (bright white center)
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = coreAlpha;
  ctx.strokeStyle = toCssRgb(LIGHTNING.coreColor);
  
  for (const seg of bolt.segments) {
    ctx.lineWidth = Math.max(3.5, seg.width * 1.5); // Much thicker core for visibility
    ctx.beginPath();
    ctx.moveTo(seg.x0, seg.y0);
    ctx.lineTo(seg.x1, seg.y1);
    ctx.stroke();
  }
  
  ctx.restore();
};

const drawFlashIllumination = (
  ctx: CanvasRenderingContext2D,
  bolt: LightningBolt,
  now: number,
  width: number,
  height: number,
  skyColor: Rgb,
  intensity: number
) => {
  const age = now - bolt.startTime;
  
  // Flash halo that illuminates the entire scene
  let haloAlpha = 0;
  if (age < LIGHTNING.flashRiseDuration + LIGHTNING.flashFallDuration + LIGHTNING.glowHaloDuration) {
    let haloAge = age - LIGHTNING.flashRiseDuration - LIGHTNING.flashFallDuration;
    if (haloAge > 0) {
      haloAlpha = Math.max(
        0,
        1 - smoothstep(0, LIGHTNING.glowHaloDuration, haloAge)
      ) * 0.15;
    } else {
      haloAge = age - LIGHTNING.flashRiseDuration;
      if (haloAge > 0) {
        haloAlpha = smoothstep(0, LIGHTNING.flashFallDuration, haloAge) * 0.2;
      }
    }
  }
  
  if (haloAlpha < 0.001) return;
  
  // Whole-screen brightening with bluish cast (subtle so bolt is visible)
  const blueShift: Rgb = [0.9, 0.92, 1.0];
  const illuminationColor = mixOklab(skyColor, blueShift, 0.25);
  
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = haloAlpha * intensity * 0.6;
  ctx.fillStyle = toCssRgb(illuminationColor);
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

// ============== PUBLIC API ==============

export const drawThunderstorm = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stormIntensity: number,
  skyColor: Rgb,
  time: number
) => {
  if (stormIntensity < 0.01) {
    resetLightningState();
    return;
  }
  
  const now = time;
  
  // Update bolt generation/removal
  updateStrikes(now, stormIntensity);
  
  // Log active bolts count
  if (activeBolts.size > 0) {
    console.log(`⚡ Lightning: ${activeBolts.size} active bolts, intensity: ${stormIntensity.toFixed(2)}`);
  }
  
  // Draw lightning bolts FIRST (so they're visible during flash)
  for (const bolt of activeBolts.values()) {
    drawBolt(ctx, bolt, now, width, height);
  }
  
  // Draw flash illumination AFTER (subtle background flash)
  for (const bolt of activeBolts.values()) {
    drawFlashIllumination(ctx, bolt, now, width, height, skyColor, stormIntensity);
  }
};

export type { LightningBolt };