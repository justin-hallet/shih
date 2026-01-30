import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';
import * as THREE from 'three';

export type EffectPreset =
  | 'none'
  | '90s'
  | 'pixelate'
  | 'bw'
  | 'bw_red'
  | 'vhs'
  | 'crt'
  | 'snow'
  | 'rain';

export class VisualEffectPresetPass extends Pass {
  private material: THREE.ShaderMaterial;
  private fsQuad: FullScreenQuad;
  private time = 0;

  constructor(width: number, height: number) {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(width, height) },
        time: { value: 0.0 },
        effectMode: { value: 0 }, // 0=none, 1=90s, 2=pixelate, etc.

        // Effect-specific parameters
        vignetteStrength: { value: 0.6 },
        garbleAmount: { value: 0.15 },
        pixelSize: { value: 4.0 }, // Reduced from 8.0 for less pixelation
        shadowDarken: { value: 1.5 },
        vhsLineCount: { value: 240.0 },
        vhsSpeed: { value: 0.2 },
        crtRefreshRate: { value: 2.0 },
        crtDarken: { value: 0.85 },
        snowIntensity: { value: 0.15 },
        rainIntensity: { value: 0.2 }
      },
      vertexShader: this.getVertexShader(),
      fragmentShader: this.getFragmentShader()
    });

    this.fsQuad = new FullScreenQuad(this.material);
  }

  private getVertexShader(): string {
    return `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
  }

  private getFragmentShader(): string {
    return `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float time;
      uniform int effectMode;

      // Effect-specific uniforms
      uniform float vignetteStrength;
      uniform float garbleAmount;
      uniform float pixelSize;
      uniform float shadowDarken;
      uniform float vhsLineCount;
      uniform float vhsSpeed;
      uniform float crtRefreshRate;
      uniform float crtDarken;
      uniform float snowIntensity;
      uniform float rainIntensity;

      varying vec2 vUv;

      // Helper function for noise
      float random(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898, 78.233))) * 43758.5453);
      }

      // Better hash function for pseudo-randomness
      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Hash function for 2D output
      vec2 hash2(vec2 p) {
        return fract(sin(vec2(
          dot(p, vec2(127.1, 311.7)),
          dot(p, vec2(269.5, 183.3))
        )) * 43758.5453);
      }

      // Effect 1: 90s - Vignette + Garbling
      vec3 apply90s(vec3 color, vec2 uv) {
        // Vignette effect
        float dist = distance(uv, vec2(0.5));
        float vignette = 1.0 - smoothstep(0.3, 0.9, dist);
        color *= mix(0.4, 1.0, vignette * vignetteStrength);

        // Light garbling (chromatic aberration)
        float noise = random(uv * 100.0);
        vec2 offset = vec2(noise * garbleAmount * 0.01);
        vec3 rShift = texture2D(tDiffuse, uv + offset).rgb;
        vec3 bShift = texture2D(tDiffuse, uv - offset).rgb;
        color = vec3(rShift.r, color.g, bShift.b);

        return color;
      }

      // Effect 2: Pixelate
      vec3 applyPixelate(vec3 color, vec2 uv) {
        // Snap UV coordinates to pixel grid
        vec2 pixelatedUV = floor(uv * resolution / pixelSize) * pixelSize / resolution;
        vec4 pixelColor = texture2D(tDiffuse, pixelatedUV);

        // Color quantization (reduce color depth)
        vec3 quantized = floor(pixelColor.rgb * 16.0) / 16.0;

        return quantized;
      }

      // Effect 3 & 4: Black & White (with optional red preservation)
      vec3 applyBW(vec3 color, bool preserveRed) {
        // Luminance calculation
        float lum = dot(color, vec3(0.299, 0.587, 0.114));

        // Darken shadows
        lum = pow(lum, shadowDarken);

        if (preserveRed) {
          // Keep red as red - detect if red is significantly higher than other channels
          float redStrength = color.r - max(color.g, color.b);
          float isRed = smoothstep(0.1, 0.3, redStrength);

          // Preserve original red color, convert rest to grayscale
          return mix(vec3(lum), color, isRed);
        }

        return vec3(lum);
      }

      // Effect 5: VHS - Scanlines
      vec3 applyVHS(vec3 color, vec2 uv, float t) {
        // Rolling scanlines
        float scanline = mod(uv.y * vhsLineCount + t * vhsSpeed, 1.0);
        float scanlineDim = smoothstep(0.0, 0.1, scanline) * smoothstep(1.0, 0.9, scanline);

        // Horizontal tracking offset
        float offset = sin(uv.y * 50.0 + t * 2.0) * 0.002;
        vec3 vhsColor = texture2D(tDiffuse, uv + vec2(offset, 0.0)).rgb;

        // Dim scanlines
        vhsColor *= 0.85 + scanlineDim * 0.15;

        // Add noise
        float noise = random(uv + t * 0.1);
        vhsColor += vec3(noise * 0.05);

        return vhsColor;
      }

      // Effect 6: CRT - Screen Tearing
      vec3 applyCRT(vec3 color, vec2 uv, float t) {
        // Screen tearing effect (vertical bands that shift)
        float tear = step(0.95, sin(uv.y * 20.0 + t * crtRefreshRate));
        vec2 tearOffset = vec2(tear * 0.02, 0.0);
        vec3 crtColor = texture2D(tDiffuse, uv + tearOffset).rgb;

        // Heavy scanlines
        float scanline = sin(uv.y * resolution.y * 0.5) * 0.5 + 0.5;
        crtColor *= 0.7 + scanline * 0.3;

        // Darken overall tone
        crtColor *= crtDarken;

        // Slight curvature darkening
        float dist = length(uv - 0.5);
        crtColor *= 1.0 - dist * 0.3;

        return crtColor;
      }

      // Effect 7: Snow (Grid-based procedural)
      vec3 applySnow(vec3 color, vec2 uv, float t) {
        float snow = 0.0;

        // Multiple layers for depth (foreground = larger/faster, background = smaller/slower)
        for (float i = 0.0; i < 3.0; i++) {
          float layer = i + 1.0;
          float scale = 8.0 + i * 6.0; // Varying scales: 8, 14, 20
          float speed = 0.15 + i * 0.1; // Varying speeds: 0.15, 0.25, 0.35

          // Apply horizontal drift with sine wave for floating effect
          float drift = sin(t * 0.5 + i * 2.0) * 0.3;
          vec2 snowUV = vec2(uv.x + drift / scale, uv.y);

          // Move snow downward
          snowUV.y += t * speed;
          snowUV *= scale;

          // Grid cell identification
          vec2 cellId = floor(snowUV);
          vec2 cellUV = fract(snowUV);

          // Pseudo-random position offset within cell
          vec2 offset = hash2(cellId);

          // Calculate distance from snowflake center
          vec2 flakePos = offset;
          float dist = length(cellUV - flakePos);

          // Soft circular snowflake with size variation
          float flakeSize = 0.05 + hash(cellId) * 0.05; // Random size 0.05-0.1
          float flake = smoothstep(flakeSize, flakeSize * 0.5, dist);

          // Add opacity variation
          float opacity = 0.5 + hash(cellId + 100.0) * 0.5;
          flake *= opacity;

          // Layer contribution (foreground layers more visible)
          snow += flake / (layer * 0.8);
        }

        // Add snow overlay with slight blue tint
        vec3 snowColor = vec3(0.95, 0.95, 1.0) * snow * snowIntensity;
        return color + snowColor;
      }

      // Effect 8: Rain (Grid-based with motion blur)
      vec3 applyRain(vec3 color, vec2 uv, float t) {
        float rain = 0.0;

        // Multiple layers for depth
        for (float i = 0.0; i < 3.0; i++) {
          float layer = i + 1.0;
          float scaleX = 20.0 + i * 10.0; // Horizontal scale
          float scaleY = 15.0 + i * 8.0;  // Vertical scale
          float speed = 2.0 + i * 1.5;     // Fast downward speed

          // Animate UV downward
          vec2 rainUV = vec2(uv.x * scaleX, uv.y * scaleY + t * speed);

          // Grid cell identification
          vec2 cellId = floor(rainUV);
          vec2 cellUV = fract(rainUV);

          // Pseudo-random position offset within cell
          vec2 offset = hash2(cellId);

          // Raindrop position (centered horizontally in cell)
          vec2 dropPos = vec2(offset.x, 0.5);

          // Create elongated raindrop shape (motion blur effect)
          float dropLength = 0.2 + hash(cellId) * 0.05; // Length 0.2-0.25
          float dropWidth = 0.015; // Thin drops

          // Distance calculations for elongated shape
          float distX = abs(cellUV.x - dropPos.x);
          float distY = cellUV.y - dropPos.y;

          // Elongated drop shape (stretched vertically)
          float drop = 0.0;
          if (distY > 0.0 && distY < dropLength) {
            float widthFactor = smoothstep(0.0, 0.1, distY) * smoothstep(dropLength, dropLength * 0.9, distY);
            drop = smoothstep(dropWidth, 0.0, distX) * widthFactor;
          }

          // Add opacity variation
          float opacity = 0.4 + hash(cellId + 200.0) * 0.4;
          drop *= opacity;

          // Layer contribution
          rain += drop / (layer * 1.2);
        }

        // Add rain overlay with blue-grey tint
        vec3 rainColor = vec3(0.6, 0.7, 0.85) * rain * rainIntensity;
        return color + rainColor;
      }

      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec3 color = texel.rgb;

        // Mode switching
        if (effectMode == 1) {
          // 90s
          color = apply90s(color, vUv);
        } else if (effectMode == 2) {
          // Pixelate
          color = applyPixelate(color, vUv);
        } else if (effectMode == 3) {
          // Black & White
          color = applyBW(color, false);
        } else if (effectMode == 4) {
          // Black & White & Red
          color = applyBW(color, true);
        } else if (effectMode == 5) {
          // VHS
          color = applyVHS(color, vUv, time);
        } else if (effectMode == 6) {
          // CRT
          color = applyCRT(color, vUv, time);
        } else if (effectMode == 7) {
          // Snow
          color = applySnow(color, vUv, time);
        } else if (effectMode == 8) {
          // Rain
          color = applyRain(color, vUv, time);
        }
        // effectMode == 0: pass-through (no change)

        gl_FragColor = vec4(color, texel.a);
      }
    `;
  }

  setPreset(preset: EffectPreset): void {
    const modeMap: Record<EffectPreset, number> = {
      'none': 0,
      '90s': 1,
      'pixelate': 2,
      'bw': 3,
      'bw_red': 4,
      'vhs': 5,
      'crt': 6,
      'snow': 7,
      'rain': 8
    };
    this.material.uniforms['effectMode'].value = modeMap[preset];
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    this.material.uniforms['time'].value = this.time;
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget
  ): void {
    this.material.uniforms['tDiffuse'].value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }

    this.fsQuad.render(renderer);
  }

  override setSize(width: number, height: number): void {
    this.material.uniforms['resolution'].value.set(width, height);
  }

  override dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
