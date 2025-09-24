/**
 * OutlinePass - Professional silhouette outline post-processing
 * Renders selected objects to a separate buffer and creates glowing outlines
 */

import * as THREE from 'three';
import { Pass, FullScreenQuad } from 'three/examples/jsm/postprocessing/Pass.js';

export class OutlinePass extends Pass {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderTarget: THREE.WebGLRenderTarget;
  private outlineRenderTarget: THREE.WebGLRenderTarget;
  private outlineMaterial: THREE.ShaderMaterial;
  private fsQuad: FullScreenQuad;
  private outlineObjects: Map<THREE.Object3D, THREE.Color> = new Map();

  // Outline shader for edge detection and glow
  private static vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  private static fragmentShader = `
    uniform sampler2D tDiffuse;
    uniform sampler2D tOutline;
    uniform vec2 resolution;
    uniform float outlineThickness;
    uniform float outlineGlow;
    uniform bool hasOutlineData;
    
    varying vec2 vUv;
    
    void main() {
      // Get original scene color
      vec4 sceneColor = texture2D(tDiffuse, vUv);
      
      // If no outline data, just return the scene color
      if (!hasOutlineData) {
        gl_FragColor = sceneColor;
        return;
      }
      
      vec2 texelSize = 1.0 / resolution;
      
      // Sample the outline buffer
      vec4 outline = texture2D(tOutline, vUv);
      
      // Edge detection using Sobel operator
      vec4 n = texture2D(tOutline, vUv + vec2(0.0, texelSize.y));
      vec4 s = texture2D(tOutline, vUv - vec2(0.0, texelSize.y));
      vec4 e = texture2D(tOutline, vUv + vec2(texelSize.x, 0.0));
      vec4 w = texture2D(tOutline, vUv - vec2(texelSize.x, 0.0));
      
      // Calculate edge strength
      vec4 dx = e - w;
      vec4 dy = n - s;
      float edge = length(dx) + length(dy);
      
      // Create outline glow
      float outlineStrength = smoothstep(0.1, 0.5, edge) * outlineThickness;
      
      // Blend outline with scene
      vec3 outlineColor = outline.rgb * outlineStrength * outlineGlow;
      gl_FragColor = vec4(sceneColor.rgb + outlineColor, sceneColor.a);
    }
  `;

  constructor(scene: THREE.Scene, camera: THREE.Camera, width: number, height: number) {
    super();

    this.scene = scene;
    this.camera = camera;

    // Create render targets
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
    });

    this.outlineRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false,
    });

    // Create outline material
    this.outlineMaterial = new THREE.ShaderMaterial({
      vertexShader: OutlinePass.vertexShader,
      fragmentShader: OutlinePass.fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        tOutline: { value: this.outlineRenderTarget.texture },
        resolution: { value: new THREE.Vector2(width, height) },
        outlineThickness: { value: 2.0 },
        outlineGlow: { value: 3.0 },
        hasOutlineData: { value: false },
      },
    });

    this.fsQuad = new FullScreenQuad(this.outlineMaterial);
  }

  // Add object to outline with specific color
  public addOutlineObject(object: THREE.Object3D, color: THREE.Color): void {
    this.outlineObjects.set(object, color);
  }

  // Remove object from outline
  public removeOutlineObject(object: THREE.Object3D): void {
    this.outlineObjects.delete(object);
  }

  // Clear all outline objects
  public clearOutlineObjects(): void {
    this.outlineObjects.clear();
  }

  public override render(
    renderer: THREE.WebGLRenderer,
    writeBuffer: THREE.WebGLRenderTarget,
    readBuffer: THREE.WebGLRenderTarget,
  ): void {
    // Skip rendering if no objects to outline
    if (this.outlineObjects.size === 0) {
      // Just copy the input to output
      this.outlineMaterial.uniforms['tDiffuse'].value = readBuffer.texture;
      this.outlineMaterial.uniforms['hasOutlineData'].value = false;

      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
      } else {
        renderer.setRenderTarget(writeBuffer);
      }

      this.fsQuad.render(renderer);
      return;
    }

    // Store original materials and layer settings
    const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const originalLayers = new Map<THREE.Object3D, number>();

    // First pass: Render ONLY outline objects with solid colors to outline buffer
    renderer.setRenderTarget(this.outlineRenderTarget);
    renderer.clear();

    // Set up a special layer (layer 2) for outline rendering
    const outlineLayer = 2;
    const originalCameraLayers = this.camera.layers.mask;
    this.camera.layers.set(outlineLayer);

    // First, disable outline layer on all objects
    this.scene.traverse(child => {
      originalLayers.set(child, child.layers.mask);
      child.layers.disable(outlineLayer);
    });

    // Enable outline layer and set materials only for objects we want outlined
    Array.from(this.outlineObjects.entries()).forEach(([object, color]) => {
      object.traverse(child => {
        child.layers.enable(outlineLayer);
        if (child instanceof THREE.Mesh) {
          originalMaterials.set(child, child.material);
          child.material = new THREE.MeshBasicMaterial({ color: color });
        }
      });
    });

    // Render only objects on the outline layer
    renderer.render(this.scene, this.camera);

    // Restore original materials and layers
    Array.from(originalMaterials.entries()).forEach(([mesh, material]) => {
      mesh.material = material;
    });

    Array.from(originalLayers.entries()).forEach(([object, layerMask]) => {
      object.layers.mask = layerMask;
    });

    // Restore camera layers
    this.camera.layers.mask = originalCameraLayers;

    // Second pass: Combine with main scene
    this.outlineMaterial.uniforms['tDiffuse'].value = readBuffer.texture;
    this.outlineMaterial.uniforms['hasOutlineData'].value = true;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
    } else {
      renderer.setRenderTarget(writeBuffer);
    }

    this.fsQuad.render(renderer);
  }

  public override setSize(width: number, height: number): void {
    this.renderTarget.setSize(width, height);
    this.outlineRenderTarget.setSize(width, height);
    this.outlineMaterial.uniforms['resolution'].value.set(width, height);
  }

  public override dispose(): void {
    this.renderTarget.dispose();
    this.outlineRenderTarget.dispose();
    this.outlineMaterial.dispose();
    this.fsQuad.dispose();
  }
}
