// skyLightning.ts
import { Rgb, toCssRgb, mixOklab } from './skyColor'
import { clamp01, lerp, smoothstep } from './skyUtils'

const LIGHTNING = {
  baseFrequency: 0.0005,
  segmentCount: 32,
  curveSmoothness: 0.6, // Higher = more fluid/snaky
  
  // Timing
  flashDuration: 80,   // The "peak" brightness
  fadeDuration: 300,   // How long the ghost lingers
  
  // Aesthetics
  coreWidth: 2,
  innerGlowWidth: 4,
  outerGlowWidth: 8,
  
  colors: {
    core: '#fdfefe',                 // Slightly warm white core
    inner: 'rgba(210, 225, 255, 0.9)', // Pale blue-violet plasma
    outer: 'rgba(120, 150, 210, 0.35)' // Desaturated blue halo
  }
}

const BASE_STRIKE_INTERVAL = 6000

type Point = { x: number; y: number }
type Bolt = {
  points: Point[]
  startTime: number
  seed: number
}

let activeBolts: Bolt[] = []
let nextStrikeTime = 0

const generateBolt = (width: number, height: number, now: number): Bolt => {
  const points: Point[] = []
  const startX = width * (0.15 + Math.random() * 0.7)
  let curX = startX
  let curY = -20
  
  const stepY = (height + 40) / LIGHTNING.segmentCount
  let velocityX = 0

  for (let i = 0; i <= LIGHTNING.segmentCount; i++) {
    points.push({ x: curX, y: curY })
    
    // Sinuous math: use sine waves + random drift
    const drift = (Math.random() - 0.5) * 40
    velocityX = velocityX * LIGHTNING.curveSmoothness + drift * (1 - LIGHTNING.curveSmoothness)
    
    curX += velocityX
    curY += stepY
  }

  return { points, startTime: now, seed: Math.random() }
}

export const drawThunderstorm = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stormIntensity: number,
  skyColor: Rgb,
  time: number
) => {
  if (stormIntensity < 0.01) return

  if (time >= nextStrikeTime) {
    activeBolts.push(generateBolt(width, height, time))
    nextStrikeTime =
      time +
      BASE_STRIKE_INTERVAL * Math.pow(1 / stormIntensity, 1.3) * (0.6 + Math.random() * 0.8)
  }

  activeBolts = activeBolts.filter(b => time < b.startTime + LIGHTNING.flashDuration + LIGHTNING.fadeDuration)

  for (const b of activeBolts) {
    const elapsed = time - b.startTime
    const totalLife = LIGHTNING.flashDuration + LIGHTNING.fadeDuration
    
    // Calculate intensity: rapid peak then smooth fade
    let intensity = 0
    if (elapsed < LIGHTNING.flashDuration) {
      intensity = 1.0 // Peak brightness
    } else {
      intensity = 1.0 - smoothstep(LIGHTNING.flashDuration, totalLife, elapsed)
    }

    ctx.save()
    
    // Use 'lighter' so overlapping glows brighten each other
    ctx.globalCompositeOperation = 'lighter'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 1. ATMOSPHERIC FLASH (The "Bloom" in the clouds)
    if (elapsed < 100) {
      const flashAlpha = (1.0 - (elapsed / 100)) * 0.2 * stormIntensity
      ctx.fillStyle = `rgba(100, 160, 255, ${flashAlpha})`
      ctx.fillRect(0, 0, width, height)
    }

    // 2. OUTER HALO (Deep Blue)
    ctx.globalAlpha = intensity * 0.6
    ctx.strokeStyle = LIGHTNING.colors.outer
    ctx.lineWidth = LIGHTNING.outerGlowWidth
    ctx.filter = 'blur(8px)' // Creates the soft ionization
    renderPath(ctx, b.points)

    // 3. INNER GLOW (Cyan)
    ctx.filter = 'blur(2px)'
    ctx.strokeStyle = LIGHTNING.colors.inner
    ctx.lineWidth = LIGHTNING.innerGlowWidth
    ctx.globalAlpha = intensity
    renderPath(ctx, b.points)

    // 4. THE HOT CORE (Pure White)
    ctx.filter = 'none'
    ctx.strokeStyle = LIGHTNING.colors.core
    ctx.lineWidth = LIGHTNING.coreWidth
    ctx.globalAlpha = intensity
    renderPath(ctx, b.points)

    ctx.restore()
  }
}

export type LightningSample = { x: number; y: number; intensity: number }

export type LightningEffect = {
  intensity: number
  centers: LightningSample[]
  radius: number
  color?: string
}

// A convenience wrapper that both draws thunderstorm and returns a lightweight
// effect object other render passes (clouds/atmosphere) can use to modulate
// scattering and brightness. Returns null when no active flash is present.
export const drawThunderstormWithEffect = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stormIntensity: number,
  skyColor: Rgb,
  time: number
): LightningEffect | null => {
  // Draw as before
  drawThunderstorm(ctx, width, height, stormIntensity, skyColor, time)

  // Compute an array of sample centers along bolts so the bloom follows the
  // bolt path instead of a single circular center.
  let peak = 0
  const centers: LightningSample[] = []

  for (const b of activeBolts) {
    const elapsed = time - b.startTime
    const totalLife = LIGHTNING.flashDuration + LIGHTNING.fadeDuration
    let intensity = 0
    if (elapsed < LIGHTNING.flashDuration) intensity = 1
    else intensity = 1.0 - smoothstep(LIGHTNING.flashDuration, totalLife, elapsed)

    if (intensity <= 0.001) continue
    peak = Math.max(peak, intensity)

    // Sample along the bolt points - pick a few points so bloom follows curve
    const step = Math.max(1, Math.floor(b.points.length / 6))
    for (let i = 0; i < b.points.length; i += step) {
      const p = b.points[i]
      // weight sample intensity slightly by position (closer to center of bolt -> stronger)
      const posBias = 1 - Math.abs((i / b.points.length) - 0.5) * 0.9
      centers.push({ x: p.x, y: p.y, intensity: intensity * posBias })
    }
  }

  if (centers.length === 0) return null

  // Aggregate radius based on peak and screen size
  const radius = Math.min(width, height) * (0.18 + clamp01(peak) * 0.6)

  return {
    intensity: clamp01(peak) * stormIntensity,
    centers,
    radius,
    color: 'rgba(180,210,255,0.22)'
  }
}

const renderPath = (ctx: CanvasRenderingContext2D, points: Point[]) => {
  if (points.length < 2) return
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)

  // Use curveTo for the snaking effect
  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2
    const yc = (points[i].y + points[i + 1].y) / 2
    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc)
  }
  ctx.stroke()
}