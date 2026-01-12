// skyClouds.ts
// WebGL-based cloud renderer using 3D Simplex noise

import { CloudTypeConfig, determineCloudType, CLOUD_TYPE_CONFIGS } from './cloudTypes';

export class SkyCloudsRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private quadBuffer: WebGLBuffer;
  private timeUniform: WebGLUniformLocation;
  private resolutionUniform: WebGLUniformLocation;
  private seedUniform: WebGLUniformLocation;
  private upperSkyUniform: WebGLUniformLocation;
  private midSkyUniform: WebGLUniformLocation;
  private horizonBandUniform: WebGLUniformLocation;
  private sunElevationUniform: WebGLUniformLocation;
  private cloudConfigUniform: WebGLUniformLocation;
  private cloudConfig2Uniform: WebGLUniformLocation;
  private cloudConfig3Uniform: WebGLUniformLocation;
  private sizeScaleUniform: WebGLUniformLocation;
  private lightningIntensityUniform: WebGLUniformLocation;
  private windSpeedUniform: WebGLUniformLocation;
  private windDirectionUniform: WebGLUniformLocation;
  private seed: number;
  private canvas: HTMLCanvasElement;
  private currentCloudConfig: CloudTypeConfig;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.seed = Math.random() * 1000; // Generate random seed
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    this.gl = gl as WebGLRenderingContext;

    this.program = this.createShaderProgram();
    this.quadBuffer = this.createQuadBuffer();
    this.timeUniform = this.gl.getUniformLocation(this.program, 'uTime')!;
    this.resolutionUniform = this.gl.getUniformLocation(this.program, 'uResolution')!;
    this.seedUniform = this.gl.getUniformLocation(this.program, 'uSeed')!;
    this.upperSkyUniform = this.gl.getUniformLocation(this.program, 'uUpperSky')!;
    this.midSkyUniform = this.gl.getUniformLocation(this.program, 'uMidSky')!;
    this.horizonBandUniform = this.gl.getUniformLocation(this.program, 'uHorizonBand')!;
    this.sunElevationUniform = this.gl.getUniformLocation(this.program, 'uSunElevation')!;
    this.cloudConfigUniform = this.gl.getUniformLocation(this.program, 'uCloudConfig')!;
    this.cloudConfig2Uniform = this.gl.getUniformLocation(this.program, 'uCloudConfig2')!;
    this.cloudConfig3Uniform = this.gl.getUniformLocation(this.program, 'uCloudConfig3')!;
    this.sizeScaleUniform = this.gl.getUniformLocation(this.program, 'uSizeScale')!;
    this.lightningIntensityUniform = this.gl.getUniformLocation(this.program, 'uLightningIntensity')!;
    this.windSpeedUniform = this.gl.getUniformLocation(this.program, 'uWindSpeed')!;
    this.windDirectionUniform = this.gl.getUniformLocation(this.program, 'uWindDirection')!;

    // Default to clear skies
    this.currentCloudConfig = {
      sizeScale: 1.0,
      densityScale: 0.1,
      shapeScale: 1.0,
      detailScale: 1.0,
      coverageBias: -0.8,
      windSpeedMultiplier: 1.0,
      turbulence: 0.1,
      brightnessMultiplier: 1.2,
      contrastMultiplier: 0.8,
      saturationMultiplier: 1.1,
      anvilClouds: false,
      wispyEdges: true,
      layeredEffect: false
    };
  }

  private createShaderProgram(): WebGLProgram {
    const vertexShaderSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;

      void main() {
        vUv = aPosition * 0.5 + 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;

      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uSeed;
      uniform vec3 uUpperSky;
      uniform vec3 uMidSky;
      uniform vec3 uHorizonBand;
      uniform float uSunElevation;
      uniform vec3 uCloudConfig; // densityScale, shapeScale, detailScale
      uniform vec3 uCloudConfig2; // coverageBias, windSpeedMultiplier, turbulence
      uniform vec3 uCloudConfig3; // brightnessMultiplier, contrastMultiplier, saturationMultiplier
      uniform float uSizeScale;
      uniform float uLightningIntensity;
      uniform float uWindSpeed;
      uniform float uWindDirection;

      varying vec2 vUv;

      // 3D Simplex Noise functions
      vec4 permute(vec4 x) {
        return mod(((x * 34.0) + 1.0) * x, 289.0);
      }

      vec4 taylorInvSqrt(vec4 r) {
        return 1.79284291400159 - 0.85373472095314 * r;
      }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);

        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);

        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;

        i = mod(i, 289.0);
        vec4 p = permute(
          permute(
            permute(i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));

        float n_ = 1.0 / 7.0;
        vec3 ns = n_ * D.wyz - D.xzx;

        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);

        vec4 x = x_ * ns.x + ns.y;
        vec4 y = y_ * ns.x + ns.y;
        vec4 h = 1.0 - abs(x) - abs(y);

        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);

        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));

        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);

        vec4 norm = taylorInvSqrt(vec4(
          dot(p0, p0),
          dot(p1, p1),
          dot(p2, p2),
          dot(p3, p3)
        ));

        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;

        vec4 m = max(0.6 - vec4(
          dot(x0, x0),
          dot(x1, x1),
          dot(x2, x2),
          dot(x3, x3)
        ), 0.0);

        m = m * m;
        return 42.0 * dot(m * m, vec4(
          dot(p0, x0),
          dot(p1, x1),
          dot(p2, x2),
          dot(p3, x3)
        ));
      }

      // Cloud density function
      float cloudDensity(vec3 p) {
        // Scale to make clouds more vertical (stretched in y) - configurable shape and size
        vec3 scaledP = p * vec3(2.0 * uSizeScale, uCloudConfig.y * uSizeScale, 2.0 * uSizeScale); // sizeScale affects overall cloud size, shapeScale affects vertical stretching
        
        float base = snoise((scaledP + vec3(uSeed)) * uCloudConfig.z); // detailScale affects noise frequency
        float detail1 = snoise((scaledP + vec3(uSeed * 1.7)) * uCloudConfig.z * 2.0) * 0.3;
        float detail2 = snoise((scaledP + vec3(uSeed * 3.1)) * uCloudConfig.z * 4.0) * 0.15;
        float detail3 = snoise((scaledP + vec3(uSeed * 5.7)) * uCloudConfig.z * 8.0) * 0.075;

        float d = base + detail1 + detail2 + detail3;
        d = smoothstep(0.1 + uCloudConfig2.x * 0.2, 0.6 + uCloudConfig2.x * 0.2, d); // coverageBias affects threshold
        
        // Add vertical variation for more realistic cloud shapes
        float height = p.y;
        float verticalMask = smoothstep(-0.3, 0.2, height) * (1.0 - smoothstep(0.2, 0.8, height));
        d *= verticalMask;
        
        return d * uCloudConfig.x; // Apply density scale
      }

      // Density gradient normal for proper lighting
      vec3 densityNormal(vec3 p) {
        float eps = 0.05;
        return normalize(vec3(
          cloudDensity(p + vec3(eps, 0.0, 0.0)) - cloudDensity(p - vec3(eps, 0.0, 0.0)),
          cloudDensity(p + vec3(0.0, eps, 0.0)) - cloudDensity(p - vec3(0.0, eps, 0.0)),
          cloudDensity(p + vec3(0.0, 0.0, eps)) - cloudDensity(p - vec3(0.0, 0.0, eps))
        ));
      }

      // Ray marching function
      vec4 marchClouds(vec3 ro, vec3 rd) {
        float t = 0.0;
        float alpha = 0.0;
        vec3 col = vec3(0.0);

        for (int i = 0; i < 16; i++) {
          vec3 pos = ro + rd * t;

          // Constant wind speed for smooth, continuous horizontal movement
          float windRadians = uWindDirection * 3.14159 / 180.0;
          float windX = cos(windRadians); // Only horizontal component
          float speed = uWindSpeed * 0.001; // Scale wind speed for appropriate cloud movement
          // Minimal turbulence for subtle variation, not direction changes
          vec3 turbulence = vec3(
            snoise(pos * 0.3 + uTime * 0.05) * 0.05, // Fixed small horizontal variation
            0.0, // No vertical movement
            0.0  // No depth movement
          );
          vec3 shapePos = pos + vec3(-uTime * speed * windX, 0.0, 0.0) + turbulence;
          float d = cloudDensity(shapePos);

          // Density-based lighting with proper surface normals
          float densityLight = clamp(d * 1.2, 0.0, 1.0);

          // Proper directional lighting using density gradients
          vec3 sunDir = normalize(vec3(sin(uSunElevation * 3.14159 / 180.0), cos(uSunElevation * 3.14159 / 180.0), 0.0));
          vec3 n = densityNormal(pos);
          float sunDot = clamp(dot(n, sunDir), 0.0, 1.0);

          // Self-shadowing toward the sun
          float shadow = 0.0;
          vec3 shadowPos = pos;
          for (int s = 0; s < 4; s++) {
            shadowPos += sunDir * 0.15;
            shadow += cloudDensity(shadowPos);
          }
          shadow = exp(-shadow * 1.2);

          // Combine lighting components
          float directionalLight = sunDot;
          float combinedLight = densityLight * 0.6 + directionalLight * 0.4;
          combinedLight *= shadow;

          // Atmospheric inertia - clouds respond slower to sun changes
          float sunResponse = smoothstep(-6.0, 4.0, uSunElevation);
          sunResponse *= smoothstep(0.2, 0.8, d); // thicker clouds respond more slowly

          // Starlight illumination for nighttime clouds
          float starlightIntensity = smoothstep(0.0, -6.0, uSunElevation);
          vec3 starlightColor = vec3(0.8, 0.85, 1.0) * 0.1;
          float starlightContribution = starlightIntensity * (1.0 - combinedLight * 0.4);

          // Base cloud color with atmospheric inertia
          vec3 baseCloudColor;
          float horizonInfluence;

          // Smooth transition zones
          float dayToDusk = smoothstep(-2.0, 2.0, sunResponse);
          float duskToNight = smoothstep(-8.0, -4.0, sunResponse);

          // Daytime clouds (bright white)
          vec3 dayCloudColor = vec3(0.95, 0.95, 0.95);
          float dayHorizonInfluence = 0.1;

          // Dusk/dawn clouds (warm tinted with luminance preservation)
          vec3 duskCloudColor = mix(vec3(0.9, 0.85, 0.8), vec3(0.7, 0.6, 0.5), clamp(-sunResponse / 6.0, 0.0, 1.0));
          float duskHorizonInfluence = 0.4 + clamp(-sunResponse / 6.0, 0.0, 1.0) * 0.3;

          // Night clouds (luminance-driven, not color-driven)
          float skyLuma = dot(uMidSky, vec3(0.333));
          vec3 nightCloudColor = vec3(skyLuma) * 0.6;
          float nightHorizonInfluence = 0.2;

          // Smoothly interpolate between day and dusk
          vec3 dayDuskColor = mix(duskCloudColor, dayCloudColor, dayToDusk);
          float dayDuskHorizon = mix(duskHorizonInfluence, dayHorizonInfluence, dayToDusk);

          // Smoothly interpolate between dusk and night
          baseCloudColor = mix(nightCloudColor, dayDuskColor, duskToNight);
          horizonInfluence = mix(nightHorizonInfluence, dayDuskHorizon, duskToNight);

          // Mix with sky colors for additional tinting, emphasizing horizon
          vec3 skyTint = mix(uHorizonBand, mix(uMidSky, uUpperSky, 0.5), 0.3);
          baseCloudColor = mix(baseCloudColor, skyTint, horizonInfluence);

          // Luminance-preserving warm shift for dusk colors
          float luma = dot(baseCloudColor, vec3(0.2126, 0.7152, 0.0722));
          vec3 warmTint = vec3(1.05, 0.95, 0.85);
          baseCloudColor = mix(baseCloudColor, baseCloudColor * warmTint, (1.0 - sunResponse));
          baseCloudColor *= luma / max(dot(baseCloudColor, vec3(0.2126, 0.7152, 0.0722)), 0.001);

          // Apply lighting variation with cloud type adjustments
          float adjustedLight = pow(combinedLight, 1.0 / uCloudConfig3.y); // contrastMultiplier affects light falloff
          vec3 cloudColor = mix(baseCloudColor * 0.7 * uCloudConfig3.x, baseCloudColor * uCloudConfig3.x, adjustedLight); // brightnessMultiplier

          // Add starlight tinting (subtle)
          cloudColor = mix(cloudColor, starlightColor + baseCloudColor * 0.2, starlightContribution);

          // Lightning illumination - clouds glow brightly during lightning flashes
          if (uLightningIntensity > 0.01) {
            vec3 lightningColor = vec3(1.0, 1.0, 0.95); // Bright white-blue lightning color
            float lightningGlow = uLightningIntensity * d * 2.0; // Intensity scales with cloud density
            cloudColor = mix(cloudColor, lightningColor, clamp(lightningGlow, 0.0, 0.8));
          }

          // Forward scattering - clouds glow when viewed toward the sun
          float forwardScatter = pow(max(dot(rd, sunDir), 0.0), 6.0);
          cloudColor += forwardScatter * vec3(1.0, 0.9, 0.8) * 0.4 * d;

          // Apply saturation adjustment
          float cloudLuma = dot(cloudColor, vec3(0.333));
          cloudColor = mix(vec3(cloudLuma), cloudColor, uCloudConfig3.z); // saturationMultiplier

          float distFade = exp(-t * 0.05);
          cloudColor *= distFade;

          float a = d * 0.4 * (1.0 - alpha);
          col += cloudColor * a;
          alpha += a;

          if (alpha > 0.95) break;
          t += 0.12;
        }

        alpha *= 0.95;

        return vec4(col, alpha);
      }

      void main() {
        vec2 uv = vUv * 2.0 - 1.0;

// Push clouds upward
float skyMask = smoothstep(-0.2, 0.6, uv.y);
        uv.x *= uResolution.x / uResolution.y;

        vec3 ro = vec3(0.0, 0.0, -2.0);
        vec3 rd = normalize(vec3(uv, 1.0));

        vec4 clouds = marchClouds(ro, rd);
        clouds.a *= skyMask;
        gl_FragColor = clouds;
      }
    `;

    const vertexShader = this.createShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.createShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = this.gl.createProgram()!;
    this.gl.attachShader(program, vertexShader);
    this.gl.attachShader(program, fragmentShader);
    this.gl.linkProgram(program);

    if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
      throw new Error('Shader program linking failed: ' + this.gl.getProgramInfoLog(program));
    }

    return program;
  }

  private createShader(type: number, source: string): WebGLShader {
    const shader = this.gl.createShader(type)!;
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error('Shader compilation failed: ' + this.gl.getShaderInfoLog(shader));
    }

    return shader;
  }

  private createQuadBuffer(): WebGLBuffer {
    const buffer = this.gl.createBuffer()!;
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
    const vertices = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
    return buffer;
  }

  render(time: number, width: number, height: number, upperSky: [number, number, number], midSky: [number, number, number], horizonBand: [number, number, number], sunElevation: number, weather?: {
    weatherCode?: number;
    cloudCover: number;
    precipitation: 'none' | 'rain' | 'snow' | 'storm';
    precipitationAmount?: number;
    fogDensity: number;
    visibility: number;
    windSpeed?: number;
    windDirection?: number;
    lightningEffect?: { intensity: number; centers: { x: number; y: number; intensity: number }[]; radius: number; color?: string };
  }) {
    // Update cloud configuration based on weather
    if (weather) {
      const cloudType = determineCloudType(weather);
      this.currentCloudConfig = CLOUD_TYPE_CONFIGS[cloudType];
    }

    this.gl.viewport(0, 0, width, height);
    this.gl.clearColor(0, 0, 0, 0);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    // Enable alpha blending
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);

    this.gl.useProgram(this.program);

    this.gl.uniform1f(this.timeUniform, time);
    this.gl.uniform2f(this.resolutionUniform, width, height);
    this.gl.uniform1f(this.seedUniform, this.seed);
    this.gl.uniform3f(this.upperSkyUniform, upperSky[0], upperSky[1], upperSky[2]);
    this.gl.uniform3f(this.midSkyUniform, midSky[0], midSky[1], midSky[2]);
    this.gl.uniform3f(this.horizonBandUniform, horizonBand[0], horizonBand[1], horizonBand[2]);
    this.gl.uniform1f(this.sunElevationUniform, sunElevation);
    this.gl.uniform3f(this.cloudConfigUniform, 
      this.currentCloudConfig.densityScale, 
      this.currentCloudConfig.shapeScale, 
      this.currentCloudConfig.detailScale
    );
    this.gl.uniform3f(this.cloudConfig2Uniform,
      this.currentCloudConfig.coverageBias,
      this.currentCloudConfig.windSpeedMultiplier,
      this.currentCloudConfig.turbulence
    );
    this.gl.uniform3f(this.cloudConfig3Uniform,
      this.currentCloudConfig.brightnessMultiplier,
      this.currentCloudConfig.contrastMultiplier,
      this.currentCloudConfig.saturationMultiplier
    );
    this.gl.uniform1f(this.sizeScaleUniform, this.currentCloudConfig.sizeScale);
    this.gl.uniform1f(this.lightningIntensityUniform, weather?.lightningEffect?.intensity || 0.0);
    this.gl.uniform1f(this.windSpeedUniform, Math.max(weather?.windSpeed || 0.0, 0.5)); // Use real wind speed with minimum
    this.gl.uniform1f(this.windDirectionUniform, weather?.windDirection || 0.0); // Use real wind direction

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quadBuffer);
    const positionAttribute = this.gl.getAttribLocation(this.program, 'aPosition');
    this.gl.enableVertexAttribArray(positionAttribute);
    this.gl.vertexAttribPointer(positionAttribute, 2, this.gl.FLOAT, false, 0, 0);

    this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
  }

  dispose() {
    this.gl.deleteProgram(this.program);
    this.gl.deleteBuffer(this.quadBuffer);
  }
}