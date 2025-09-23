/**
 * Cell Shading Pass - Borderlands-style toon shading
 * Implements edge detection and color quantization for cartoon-like rendering
 */

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

export class CellShadingPass extends Pass {
  private material: THREE.ShaderMaterial;
  private fsQuad: FullScreenQuad;

  constructor(width: number, height: number) {
    super();

    // Create shader material for cell shading
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        resolution: { value: new THREE.Vector2(width, height) },

        // Cell shading parameters
        edgeThreshold: { value: 0.2 },
        edgeThickness: { value: 0.4 },
        edgeColor: { value: new THREE.Color(0x000000) },

        // Color quantization
        colorLevels: { value: 4.0 },
        brightness: { value: 2.5 },
        contrast: { value: 1.0 },

        // Lighting enhancement
        rimLightStrength: { value: 0.3 },
        rimLightColor: { value: new THREE.Color(0xffffff) },
      },

      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        
        uniform float edgeThreshold;
        uniform float edgeThickness;
        uniform vec3 edgeColor;
        
        uniform float colorLevels;
        uniform float brightness;
        uniform float contrast;
        
        uniform float rimLightStrength;
        uniform vec3 rimLightColor;
        
        varying vec2 vUv;
        
        // Luminance-based edge detection (simpler approach)
        float getEdgeStrength(vec2 uv) {
          vec2 texelSize = 1.0 / resolution;
          
          // Sample surrounding pixels
          vec3 colorC = texture2D(tDiffuse, uv).rgb;
          vec3 colorN = texture2D(tDiffuse, uv + vec2(0.0, texelSize.y)).rgb;
          vec3 colorS = texture2D(tDiffuse, uv + vec2(0.0, -texelSize.y)).rgb;
          vec3 colorE = texture2D(tDiffuse, uv + vec2(texelSize.x, 0.0)).rgb;
          vec3 colorW = texture2D(tDiffuse, uv + vec2(-texelSize.x, 0.0)).rgb;
          
          // Convert to luminance
          float lumC = dot(colorC, vec3(0.299, 0.587, 0.114));
          float lumN = dot(colorN, vec3(0.299, 0.587, 0.114));
          float lumS = dot(colorS, vec3(0.299, 0.587, 0.114));
          float lumE = dot(colorE, vec3(0.299, 0.587, 0.114));
          float lumW = dot(colorW, vec3(0.299, 0.587, 0.114));
          
          // Sobel edge detection
          float sobelX = (lumE - lumW) + 2.0 * (lumE - lumW);
          float sobelY = (lumN - lumS) + 2.0 * (lumN - lumS);
          
          return sqrt(sobelX * sobelX + sobelY * sobelY);
        }
        
        // Color quantization for cell shading effect
        vec3 quantizeColor(vec3 color) {
          return floor(color * colorLevels + 0.5) / colorLevels;
        }
        
        // Simple rim lighting based on edge proximity
        vec3 calculateRimLight(vec3 color, vec2 uv) {
          // Only add rim light near detected edges, not based on screen position
          vec2 texelSize = 1.0 / resolution;
          float edgeStrength = getEdgeStrength(uv);
          
          // Rim effect only appears near edges
          float rimFactor = smoothstep(0.05, 0.15, edgeStrength) * 0.5;
          return rimLightColor * rimFactor * rimLightStrength;
        }
        
        void main() {
          vec4 originalColor = texture2D(tDiffuse, vUv);
          
          // Apply brightness and contrast
          vec3 color = originalColor.rgb * brightness;
          color = (color - 0.5) * contrast + 0.5;
          
          // Quantize colors for cell shading
          color = quantizeColor(color);
          
          // Add rim lighting
          color += calculateRimLight(color, vUv);
          
          // Edge detection
          float edgeStrength = getEdgeStrength(vUv);
          float edge = smoothstep(edgeThreshold - 0.01, edgeThreshold + 0.01, edgeStrength);
          
          // Apply edge lines
          color = mix(color, edgeColor, edge * edgeThickness);
          
          // Ensure colors stay in valid range
          color = clamp(color, 0.0, 1.0);
          
          gl_FragColor = vec4(color, originalColor.a);
        }
      `,
    });

    this.fsQuad = new FullScreenQuad(this.material);
  }

  override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    this.material.uniforms['tDiffuse'].value = readBuffer.texture;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      this.fsQuad.render(renderer);
    }
  }

  override setSize(width: number, height: number): void {
    this.material.uniforms['resolution'].value.set(width, height);
  }

  // Public methods to adjust cell shading parameters
  setEdgeThreshold(threshold: number): void {
    this.material.uniforms['edgeThreshold'].value = threshold;
  }

  setEdgeThickness(thickness: number): void {
    this.material.uniforms['edgeThickness'].value = thickness;
  }

  setColorLevels(levels: number): void {
    this.material.uniforms['colorLevels'].value = levels;
  }

  setBrightness(brightness: number): void {
    this.material.uniforms['brightness'].value = brightness;
  }

  setContrast(contrast: number): void {
    this.material.uniforms['contrast'].value = contrast;
  }

  setRimLightStrength(strength: number): void {
    this.material.uniforms['rimLightStrength'].value = strength;
  }

  // Getters for current values
  getEdgeThreshold(): number {
    return this.material.uniforms['edgeThreshold'].value;
  }

  getColorLevels(): number {
    return this.material.uniforms['colorLevels'].value;
  }

  override dispose(): void {
    this.material.dispose();
    this.fsQuad.dispose();
  }
}
