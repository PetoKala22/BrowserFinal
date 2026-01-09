// skyClouds.ts
// WebGL-based cloud renderer using 3D Simplex noise

export class SkyCloudsRenderer {
  private gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private quadBuffer: WebGLBuffer;
  private timeUniform: WebGLUniformLocation;
  private resolutionUniform: WebGLUniformLocation;
  private seedUniform: WebGLUniformLocation;
  private seed: number;
  private canvas: HTMLCanvasElement;

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
        // Scale to make clouds more vertical (stretched in y)
        vec3 scaledP = p * vec3(2.0, 3.0, 2.0);
        
        float base = snoise((scaledP + vec3(uSeed)) * 0.6);
        float detail1 = snoise((scaledP + vec3(uSeed * 1.7)) * 2.0) * 0.3;
        float detail2 = snoise((scaledP + vec3(uSeed * 3.1)) * 4.0) * 0.15;
        float detail3 = snoise((scaledP + vec3(uSeed * 5.7)) * 8.0) * 0.075;

        float d = base + detail1 + detail2 + detail3;
        d = smoothstep(0.1, 0.6, d);
        
        // Add vertical variation for more realistic cloud shapes
        float height = p.y;
        float verticalMask = smoothstep(-0.3, 0.2, height) * (1.0 - smoothstep(0.2, 0.8, height));
        d *= verticalMask;
        
        return d;
      }

      // Ray marching function
      vec4 marchClouds(vec3 ro, vec3 rd) {
        float t = 0.0;
        float alpha = 0.0;
        vec3 col = vec3(0.0);

        for (int i = 0; i < 16; i++) {
          vec3 pos = ro + rd * t;

          // Add parallax motion: closer clouds move faster
          float speed = 0.02 + t * 0.01;
          pos += vec3(-uTime * speed, 0.0, 0.0);

          float d = cloudDensity(pos);
          float light = clamp(d * 1.2, 0.0, 1.0);

          vec3 cloudColor = mix(
  vec3(0.18, 0.22, 0.32),
  vec3(0.55, 0.6, 0.7),
  light
);

          cloudColor = mix(cloudColor, vec3(dot(cloudColor, vec3(0.333))), 1.0);

          float distFade = exp(-t * 0.05);
          cloudColor *= distFade;

          float a = d * 0.12 * (1.0 - alpha);
          col += cloudColor * a;
          alpha += a;

          if (alpha > 0.95) break;
          t += 0.12;
        }

        alpha *= 0.9;

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

  render(time: number, width: number, height: number) {
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