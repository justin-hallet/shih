/**
 * PowerUp Entity - Ammo, shields, lives, speed boosts, weapon upgrades
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, PowerUpSubType, AnimationType, EntityState } from '../types';

export class PowerUp extends BaseEntity {
  public readonly powerUpType: PowerUpSubType;
  public value: number; // Amount of benefit this power-up provides
  public magnetRange: number; // Range at which player attracts this power-up
  public attracted: boolean;
  public attractionSpeed: number;
  public bobHeight: number;
  public bobSpeed: number;
  public visualScale: number;

  // GLTF model loading
  private static gltfLoader: GLTFLoader = new GLTFLoader();
  private static modelCache: Map<PowerUpSubType, THREE.Group> = new Map();
  private originalMaterial?: THREE.Material; // Store original material for bloom effects

  constructor(
    powerUpType: PowerUpSubType,
    position: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scene?: THREE.Scene,
  ) {
    const posVec =
      position instanceof THREE.Vector3
        ? position
        : new THREE.Vector3(position.x, position.y, position.z);
    super(EntityType.POWERUP, powerUpType, posVec, scene);

    this.powerUpType = powerUpType;
    this.value = 1;
    this.magnetRange = 20.0;
    this.attracted = false;
    this.attractionSpeed = 18.0;
    this.bobHeight = 0.5;
    this.bobSpeed = 2.0;
    this.visualScale = 5.6; // make power-ups larger by default

    // Set properties based on power-up type
    this.initializeByType();

    // Create mesh asynchronously
    this.createMesh().catch(() => {
      this.createFallbackMesh();
    });

    // Power-ups are immediately active
    this.state = EntityState.ACTIVE;
    this.animationType = AnimationType.FLOATING;
  }

  private initializeByType(): void {
    const radiusScale = 4.0;
    const magnetRangeScale = 4.0;
    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        this.value = 50; // 50 shots
        this.collisionBounds = { radius: 2.0 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        break;

      case PowerUpSubType.SHIELD:
        this.value = 25; // 25 shield points
        this.collisionBounds = { radius: 2.4 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        break;

      case PowerUpSubType.LIFE:
        this.value = 1; // 1 extra life
        this.collisionBounds = { radius: 2.8 * radiusScale };
        this.magnetRange = 28.0 * magnetRangeScale; // Lives are more attractive
        this.bobHeight = 0.8;
        this.visualScale *= 2;
        break;

      case PowerUpSubType.SPEED:
        this.value = 2; // 2x speed multiplier for 10 seconds
        this.collisionBounds = { radius: 2.0 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        this.bobSpeed = 4.0; // Faster bobbing for speed power-up
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        this.value = 1; // 1 weapon level
        this.collisionBounds = { radius: 3.0 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        this.bobHeight = 0.6;
        break;
    }
  }

  private async createMesh(): Promise<void> {
    if (!this.scene || this.mesh) return;

    try {
      // Load GLTF model
      const model = await this.loadGLTFModel();
      if (!model) {
        this.createFallbackMesh();
        return;
      }

      // Clone the model for this instance
      this.mesh = model.clone();

      // Apply bloom material effects
      this.applyBloomMaterial();

      // Set up mesh properties
      this.mesh.castShadow = true;
      this.mesh.receiveShadow = false;
      this.mesh.scale.setScalar(this.visualScale);

      // Set position (make sure it's at the right location)
      this.mesh.position.copy(this.position);

      this.mesh.layers.enable(1); // Bloom layer
      this.scene.add(this.mesh);
    } catch (error) {
      this.createFallbackMesh();
    }
  }

  private async loadGLTFModel(): Promise<THREE.Group | null> {
    // Check cache first
    if (PowerUp.modelCache.has(this.powerUpType)) {
      return PowerUp.modelCache.get(this.powerUpType)!;
    }

    // Map power-up types to model files
    const modelFiles: Record<PowerUpSubType, string> = {
      [PowerUpSubType.AMMO]: 'ammo.glb',
      [PowerUpSubType.SHIELD]: 'shield.glb',
      [PowerUpSubType.LIFE]: 'life.glb',
      [PowerUpSubType.SPEED]: 'speed.glb',
      [PowerUpSubType.WEAPON_UPGRADE]: 'weapon.glb',
    };

    const modelFile = modelFiles[this.powerUpType];
    if (!modelFile) {
      console.warn(`No model file mapped for power-up type: ${this.powerUpType}`);
      return null;
    }

    try {
      const gltf = await PowerUp.gltfLoader.loadAsync(`/src/assets/models/${modelFile}`);
      const model = gltf.scene;

      // Cache the model
      PowerUp.modelCache.set(this.powerUpType, model);

      return model;
    } catch (error) {
      return null;
    }
  }

  private applyBloomMaterial(): void {
    if (!this.mesh || !this.scene) return;

    // Get bloom color based on power-up type
    const bloomColors: Record<PowerUpSubType, number> = {
      [PowerUpSubType.AMMO]: 0xffee66, // bright yellow
      [PowerUpSubType.SHIELD]: 0x66ccff, // blue
      [PowerUpSubType.LIFE]: 0xff3333, // red
      [PowerUpSubType.SPEED]: 0x33ff33, // green
      [PowerUpSubType.WEAPON_UPGRADE]: 0xffaa44, // orange
    };

    const emissiveColor = new THREE.Color(bloomColors[this.powerUpType]);

    this.applyEmissiveMaterial(emissiveColor);
    this.createOutlineEffect(emissiveColor);
  }

  private createFallbackMesh(): void {
    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        geometry = new THREE.BoxGeometry(0.6, 0.4, 0.3);
        material = new THREE.MeshLambertMaterial({
          color: 0x000000,
          emissive: new THREE.Color(0xffee66),
          emissiveIntensity: 2.8,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;

      case PowerUpSubType.SHIELD:
        geometry = new THREE.SphereGeometry(0.5, 10, 8);
        material = new THREE.MeshLambertMaterial({
          color: 0x000000,
          emissive: new THREE.Color(0x66ccff),
          emissiveIntensity: 2.8,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;

      case PowerUpSubType.LIFE:
        geometry = new THREE.OctahedronGeometry(0.6);
        material = new THREE.MeshLambertMaterial({
          color: 0x000000,
          emissive: new THREE.Color(0xff3333),
          emissiveIntensity: 3.0,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;

      case PowerUpSubType.SPEED:
        geometry = new THREE.ConeGeometry(0.2, 1.0, 4);
        material = new THREE.MeshLambertMaterial({
          color: 0x000000,
          emissive: new THREE.Color(0x33ff33),
          emissiveIntensity: 2.8,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        geometry = new THREE.DodecahedronGeometry(0.7);
        material = new THREE.MeshLambertMaterial({
          color: 0x000000,
          emissive: new THREE.Color(0xffaa44),
          emissiveIntensity: 2.8,
          transparent: true,
          opacity: 0.95,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        break;

      default:
        geometry = new THREE.SphereGeometry(0.3);
        material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.scale.setScalar(this.visualScale);

    this.mesh.layers.enable(1); // Bloom layer
    if (this.scene) {
      this.scene.add(this.mesh);
    }
  }

  protected onUpdate(deltaTime: number): void {
    // Handle bouncing animation (up and down)
    this.updateBouncing(deltaTime);

    // Handle Y-axis spinning
    this.updateSpinning(deltaTime);

    // Handle player attraction (if player is nearby)
    this.updatePlayerAttraction(deltaTime);
  }

  private updateBouncing(deltaTime: number): void {
    // Stop bouncing once magnetism is active
    if (this.attracted) return;

    const time = Date.now() * 0.001;
    const bouncePhase = time * this.bobSpeed;

    if (this.mesh) {
      // Dramatic bouncing motion (up and down only) - much more visible
      const bounceOffset = Math.sin(bouncePhase) * this.bobHeight * 4.0; // 4x the bounce height
      this.mesh.position.y = this.position.y + bounceOffset;

      // Keep X and Z position fixed
      this.mesh.position.x = this.position.x;
      this.mesh.position.z = this.position.z;

      // Add special effects based on type
      switch (this.powerUpType) {
        case PowerUpSubType.SHIELD:
          if (this.mesh.material instanceof THREE.MeshLambertMaterial) {
            this.mesh.material.opacity = 0.6 + Math.sin(time * 4.0) * 0.2;
            this.mesh.material.transparent = true;
          }
          break;

        case PowerUpSubType.LIFE:
          const heartbeat = Math.sin(time * 8.0) * 0.1 + Math.sin(time * 2.0) * 0.1;
          this.mesh.scale.setScalar(this.visualScale * (1.0 + heartbeat));
          break;

        case PowerUpSubType.SPEED:
          if (this.mesh.material instanceof THREE.MeshLambertMaterial) {
            this.mesh.material.opacity = 0.8 + Math.sin(time * 20.0) * 0.2;
            this.mesh.material.transparent = true;
          }
          break;

        case PowerUpSubType.WEAPON_UPGRADE:
          if (this.mesh.material instanceof THREE.MeshLambertMaterial) {
            this.mesh.material.opacity = 0.7 + Math.sin(time * 3.0) * 0.3;
            this.mesh.material.transparent = true;
          }
          break;
      }
    }
  }

  private updateSpinning(deltaTime: number): void {
    if (!this.mesh) return;

    // All power-ups spin around Y-axis at different speeds based on type
    const spinSpeeds: Record<PowerUpSubType, number> = {
      [PowerUpSubType.AMMO]: 2.0, // Moderate spin for ammo
      [PowerUpSubType.SHIELD]: 1.5, // Slower, steady spin for shield
      [PowerUpSubType.LIFE]: 2.5, // Slightly faster for life (important)
      [PowerUpSubType.SPEED]: 3.0, // Fastest spin for speed boost
      [PowerUpSubType.WEAPON_UPGRADE]: 2.2, // Medium-fast for weapon upgrades
    };

    const spinSpeed = spinSpeeds[this.powerUpType] || 2.0;
    this.mesh.rotation.y = (Date.now() * 0.001 * spinSpeed) % (Math.PI * 2);
  }

  private updatePlayerAttraction(deltaTime: number): void {
    if (!this.scene) return;
    const em = (this.scene as any).userData?.entityManager;
    const cam = (this.scene as any).userData?.camera as THREE.PerspectiveCamera | undefined;
    const player = em?.player;
    if (!player) return;

    // Only attract if visible in camera frustum
    if (cam) {
      const frustum = new THREE.Frustum();
      const projView = new THREE.Matrix4().multiplyMatrices(
        cam.projectionMatrix,
        cam.matrixWorldInverse,
      );
      frustum.setFromProjectionMatrix(projView);
      const isVisible = frustum.containsPoint(
        new THREE.Vector3(this.position.x, this.position.y, this.position.z),
      );
      if (!isVisible && !this.attracted) return;
    }

    // Check magnet activation
    const dx = player.position.x - this.position.x;
    const dy = player.position.y - this.position.y;
    const dz = player.position.z - this.position.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (!this.attracted && distance <= this.magnetRange) this.attracted = true;

    if (this.attracted) {
      // If within snap radius, immediately apply and remove
      if (distance < 1.2) {
        this.applyToPlayer(player as IEntity);
        this.onDeath();
        return;
      }

      // If very close, directly interpolate toward player to avoid orbiting
      if (distance < 3.0) {
        const lerpFactor = Math.min(1, 8.0 * deltaTime);
        this.position.x += (player.position.x - this.position.x) * lerpFactor;
        this.position.y += (player.position.y - this.position.y) * lerpFactor;
        this.position.z += (player.position.z - this.position.z) * lerpFactor;
        this.velocity.set(0, 0, 0);
        return;
      }

      // Calculate attraction speed based on distance
      const dir = new THREE.Vector3(dx, dy, dz);
      const dist = Math.max(0.0001, distance);
      dir.multiplyScalar(1 / dist);

      // Speed grows with remaining range and proximity
      const proximity = Math.max(0, Math.min(1, 1 - dist / this.magnetRange));
      const boost = (this.magnetRange - dist) * 10.0 + 80.0 * Math.pow(proximity, 1.2);
      const speed = Math.min(140.0, 30.0 + boost);

      // Apply velocity
      this.velocity.copy(dir).multiplyScalar(speed);

      // If very close, ensure immediate pickup next frame
      if (dist < 0.2) {
        this.velocity.multiplyScalar(2);
      }
    }
  }

  public applyToPlayer(player: IEntity): void {
    const playerEntity = player as any;

    // Map power-up types to player.powerUp() method calls
    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        playerEntity.powerUp('ammo', this.value || 10);
        break;
      case PowerUpSubType.SHIELD:
        playerEntity.powerUp('health', this.value || 1); // Shield now restores health
        break;
      case PowerUpSubType.LIFE:
        playerEntity.powerUp('life', 1);
        break;
      case PowerUpSubType.SPEED:
        playerEntity.powerUp('speed', 1);
        break;
      case PowerUpSubType.WEAPON_UPGRADE:
        playerEntity.powerUp('weapon', 1);
        break;
      default:
        console.warn(`Unknown power-up type: ${this.powerUpType}`);
    }
  }

  protected override onCollisionResponse(other: IEntity): void {
    if (other.type === EntityType.PLAYER && this.state === EntityState.ACTIVE) {
      // Apply power-up effect
      this.applyToPlayer(other);

      // Create collection effect
      if (
        this.mesh instanceof THREE.Mesh &&
        this.mesh.material instanceof THREE.MeshLambertMaterial
      ) {
        this.mesh.material.color.setHex(0xffffff);
        this.mesh.scale.setScalar(1.5);
      }

      // Destroy power-up immediately
      this.onDeath();
      return;
    }

    // If hit by the player's projectile, snap into magnet mode toward the player
    if (other.type === EntityType.PROJECTILE && this.state === EntityState.ACTIVE) {
      // Only react to player's projectiles
      const owner = (other as any).owner;
      if (owner === 'player') {
        // Play collection sound immediately when shot
        this.getAudioManager()?.playPowerUpSound(this.powerUpType, this.position);

        this.attracted = true;
        // Strong magnet effect and wide range so it quickly reaches the player
        this.magnetRange = Math.max(this.magnetRange, 40.0);
        this.attractionSpeed = Math.max(this.attractionSpeed, 24.0);
      }
    }
  }

  protected override onDie(): void {
    this.velocity.set(0, 0, 0);
    this.animationType = AnimationType.EXPLODING;
    this.state = EntityState.DEAD;
  }
}
