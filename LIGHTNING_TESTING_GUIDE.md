# Lightning Effect - Testing & Customization Guide

## 🚀 Quick Start

### How to Test the Lightning Effect

1. **Open the Browser App**
   - Navigate to the new tab page
   - Open the Developer Panel (bottom right corner)

2. **Enable Weather Override**
   - Toggle "Weather override" ON
   - Set Weather Code to **95** (Thunderstorm)
   - OR set Precipitation to **storm**

3. **Watch the Lightning**
   - Lightning bolts should appear every 5-8 seconds
   - Multiple bolts will branch and overlap
   - Screen will flash with bluish illumination
   - Effects should fade naturally

### What You Should See

✅ **Lightning Bolts**
- Jagged, realistic paths from top to bottom
- Branching structures with 3-5 segments
- White-to-blue color gradient
- Tapered lines (thinner as they extend)

✅ **Visual Effects**
- Bright bloom/halo around bolts
- Whole-screen bluish flash when strike hits
- Gradual fade (200-800ms)
- Atmospheric glow lingering after strike

✅ **Storm Behavior**
- Strike frequency ~every 5-6 seconds at full intensity
- 1-3 bolts per strike event
- Random timing (feels natural, not mechanical)
- Auto-clears when weather changes

---

## 🎛️ Customization Examples

### Located in: `src/lib/sky/skyLightning.ts` (lines 10-32)

### Example 1: More Frequent Lightning

**Current Setting:**
```typescript
strikeFrequency: 0.003, // ~1 strike every 5-6 seconds
```

**To make it more frequent (like severe storm):**
```typescript
strikeFrequency: 0.008, // ~1 strike every 2 seconds
```

**To make it less frequent (weak storm):**
```typescript
strikeFrequency: 0.001, // ~1 strike every 15 seconds
```

---

### Example 2: More Jagged Bolts

**Current Setting:**
```typescript
jitterFactor: 0.4,  // Horizontal deviation
branchFactor: 0.35, // Probability to branch
```

**For more chaotic, extremely jagged:**
```typescript
jitterFactor: 0.8,   // Double the jitter
branchFactor: 0.55,  // More branches
```

**For smooth, elegant bolts:**
```typescript
jitterFactor: 0.15,   // Less jitter
branchFactor: 0.20,   // Fewer branches
```

---

### Example 3: Thicker Bolts

**Current Setting:**
```typescript
tapering: 0.92, // 8% width reduction per segment
segmentLength: 30,
```

**For thicker, more prominent bolts:**
```typescript
tapering: 0.88,  // More width reduction = thicker appearance
// Don't change segmentLength (sets structure)
```

**For thinner, delicate bolts:**
```typescript
tapering: 0.97,  // Less width reduction = thinner overall
```

---

### Example 4: Change Lightning Color

**Current Setting:**
```typescript
coreColor: [1.0, 1.0, 1.0],     // Pure white core
outerColor: [0.7, 0.8, 1.0],    // Bluish-white glow
```

**For warmer, more orange lightning (rare storm):**
```typescript
coreColor: [1.0, 0.95, 0.8],    // Warm white
outerColor: [1.0, 0.65, 0.3],   // Orange glow
```

**For cooler, cyan lightning (exotic):**
```typescript
coreColor: [0.8, 1.0, 1.0],     // Cyan-white
outerColor: [0.3, 0.8, 1.0],    // Deep cyan
```

**For purple lightning (rare atmospheric effect):**
```typescript
coreColor: [0.95, 0.8, 1.0],    // Purple-white
outerColor: [0.75, 0.4, 1.0],   // Purple
```

---

### Example 5: Adjust Flash Timing

**Current Setting:**
```typescript
flashRiseDuration: 50,    // 50ms to reach peak
flashFallDuration: 200,   // 200ms to fade
glowHaloDuration: 800,    // 800ms for lingering glow
```

**For instant, dramatic flash (like a photograph):**
```typescript
flashRiseDuration: 5,     // Nearly instant
flashFallDuration: 80,    // Quick fade
glowHaloDuration: 300,    // Brief afterglow
```

**For slow, ethereal flash:**
```typescript
flashRiseDuration: 150,   // Gradual rise
flashFallDuration: 400,   // Slow decay
glowHaloDuration: 1200,   // Long lingering
```

---

### Example 6: Multiple Bolts Per Strike

**Current Logic (in updateStrikes function, line 108):**
```typescript
const boltCount = stormIntensity > 0.7 ? 2 : 1;
```

**To always spawn 3 bolts (very dramatic):**
```typescript
const boltCount = 3;
```

**To spawn 2-5 bolts based on intensity:**
```typescript
const boltCount = Math.ceil(1 + stormIntensity * 4);
```

---

### Example 7: Brightness Control

**Current Setting:**
```typescript
bloomAlpha: 0.35,   // Peak bloom transparency
// And flashAlpha calculations in drawBolt()
```

**For brighter, more visible lightning:**
- In `drawBolt()`, increase `coreAlpha`:
```typescript
const coreAlpha = flashAlpha * 1.2;  // Was 0.9
```

**For dimmer, more subtle lightning:**
```typescript
const coreAlpha = flashAlpha * 0.6;  // Was 0.9
```

---

## 🧪 Testing Scenarios

### Scenario 1: Weak Storm
```
Settings:
- Weather: Thunderstorm
- Cloud cover: 40%
- Result: Occasional, subtle bolts
```

### Scenario 2: Severe Storm
```
Settings:
- Weather: Thunderstorm
- Cloud cover: 90%
- Result: Frequent, prominent bolts with multiple branches
```

### Scenario 3: Transition
```
Steps:
1. Set Weather to Thunderstorm
2. Wait 10 seconds (observe frequent strikes)
3. Change to "Mostly clear"
4. Watch lightning fade out smoothly
```

### Scenario 4: Night Storm
```
Steps:
1. Set time to 22:00 (10 PM) or later
2. Set Weather to Thunderstorm
3. Watch lightning illuminate dark sky
4. Notice bluish atmospheric cast
```

---

## 📊 Parameter Reference Table

| Parameter | Range | Default | Effect |
|-----------|-------|---------|--------|
| `strikeFrequency` | 0.001-0.01 | 0.003 | Lightning frequency (higher = more strikes) |
| `branchFactor` | 0.1-0.8 | 0.35 | Probability of branching (higher = bushier) |
| `maxBranchDepth` | 2-6 | 4 | Recursion depth (higher = more detail) |
| `jitterFactor` | 0.0-1.0 | 0.4 | Jaggedness (higher = more chaotic) |
| `tapering` | 0.85-0.99 | 0.92 | Width reduction per segment |
| `flashRiseDuration` | 0-200 | 50 | ms to peak brightness |
| `flashFallDuration` | 50-500 | 200 | ms to fade |
| `glowHaloDuration` | 100-1500 | 800 | ms for atmospheric glow |
| `bloomAlpha` | 0.0-1.0 | 0.35 | Peak bloom opacity |

---

## 🎯 Recommended Configurations

### Configuration A: Realistic (Default)
```typescript
const LIGHTNING = {
  strikeFrequency: 0.003,
  branchFactor: 0.35,
  maxBranchDepth: 4,
  jitterFactor: 0.4,
  tapering: 0.92,
  flashRiseDuration: 50,
  flashFallDuration: 200,
  glowHaloDuration: 800,
  bloomAlpha: 0.35,
};
// Result: Natural, Apple Weather-like appearance
```

### Configuration B: Intense & Dramatic
```typescript
const LIGHTNING = {
  strikeFrequency: 0.008,      // More frequent
  branchFactor: 0.55,          // More branching
  maxBranchDepth: 5,           // More complex
  jitterFactor: 0.6,           // More jagged
  tapering: 0.88,              // Thicker bolts
  flashRiseDuration: 20,       // Quicker peak
  flashFallDuration: 150,      // Faster fade
  glowHaloDuration: 600,       // Shorter afterglow
  bloomAlpha: 0.45,            // Brighter
};
// Result: Intense, action-movie storms
```

### Configuration C: Subtle & Atmospheric
```typescript
const LIGHTNING = {
  strikeFrequency: 0.001,      // Less frequent
  branchFactor: 0.20,          // Simpler structure
  maxBranchDepth: 2,           // Less detail
  jitterFactor: 0.2,           // Smoother bolts
  tapering: 0.95,              // Thinner
  flashRiseDuration: 100,      // Slow rise
  flashFallDuration: 400,      // Gradual fade
  glowHaloDuration: 1200,      // Long glow
  bloomAlpha: 0.25,            // Subtle
};
// Result: Gentle, atmospheric storms
```

### Configuration D: Alien/Exotic
```typescript
const LIGHTNING = {
  strikeFrequency: 0.006,
  branchFactor: 0.7,           // Very branchy
  maxBranchDepth: 6,           // Deep recursion
  jitterFactor: 0.8,           // Chaotic
  tapering: 0.80,              // Very tapered
  flashRiseDuration: 5,        // Instant peak
  flashFallDuration: 50,       // Quick fade
  glowHaloDuration: 200,       // Brief glow
};
// + Change coreColor/outerColor to purple/cyan
// Result: Otherworldly, exotic storms
```

---

## 🔍 Debugging Tips

### Check if Lightning is Rendering
```typescript
// Add to skyLightning.ts in drawThunderstorm():
console.log(`Storm intensity: ${stormIntensity}, Active bolts: ${activeBolts.size}`);
```

### Monitor Strike Timing
```typescript
// Add to updateStrikes():
console.log(`Next strike in ${nextStrikeTime - now}ms`);
```

### Visual Debugging
```typescript
// In drawBolt(), add indicator:
ctx.fillStyle = 'red';
ctx.fillRect(bolt.segments[0].x0 - 5, bolt.segments[0].y0 - 5, 10, 10);
// Shows bolt origin point (top)
```

### Performance Profiling
```typescript
// In browser DevTools:
performance.mark('lightning-frame-start');
drawThunderstorm(...);
performance.mark('lightning-frame-end');
performance.measure('Lightning', 'lightning-frame-start', 'lightning-frame-end');
```

---

## 🎨 Color Space Reference

All colors use RGB format: `[r, g, b]` where each value is 0.0-1.0

**Common Colors:**
```typescript
[1.0, 1.0, 1.0]   // White (pure light)
[1.0, 0.95, 0.8]  // Warm white
[0.7, 0.8, 1.0]   // Bluish-white (sky)
[0.95, 0.8, 1.0]  // Purple-white (rare)
[0.8, 1.0, 1.0]   // Cyan-white (exotic)
[1.0, 0.65, 0.3]  // Orange (rare storm)
[0.3, 0.8, 1.0]   // Deep cyan
[0.75, 0.4, 1.0]  // Purple
```

Use online RGB converter to visualize: `rgb(r×255, g×255, b×255)`

---

## ✨ Tips for Best Results

1. **Test at different times of day**
   - Night storms: Lightning stands out more
   - Day storms: Subtler, more realistic
   - Golden hour: Warm color cast + lightning = dramatic

2. **Combine with other weather**
   - Heavy clouds (90%) + storm = very dark, frequent lightning
   - Partly cloudy (40%) + storm = lighter, occasional bolts

3. **Match visual style**
   - Keep bloom levels proportional to screen size
   - Consider device brightness/contrast

4. **Use moderate settings**
   - Too frequent = distracting and unrealistic
   - Too rare = anticlimactic
   - Goldilocks zone: one strike every 5-8 seconds

---

## 📝 Next Steps

1. **Make your first customization** - Start with `strikeFrequency`
2. **Test different combinations** - Try the premade configs
3. **Find your style** - Adjust until it feels right for your app
4. **Commit changes** - Save your favorite configuration

---

**Happy Customizing!** ⚡🌩️

For detailed implementation info, see: [LIGHTNING_EFFECT.md](./LIGHTNING_EFFECT.md)
