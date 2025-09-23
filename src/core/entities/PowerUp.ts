/**
 * PowerUp Entity - Ammo, shields, lives, speed boosts, weapon upgrades
 */

import * as THREE from 'three';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, PowerUpSubType, AnimationType, EntityState } from '../types';

export class PowerUp extends BaseEntity {
  public readonly powerUpType: PowerUpSubType;
  public value: number; // Amount of benefit this power-up provides
  public magnetRange: number; // Range at which player attracts this power-up
  public attracted: boolean;
  public attractionSpeed: number;
  public magnetBaseSpeed?: number;
  public magnetMaxSpeed?: number;
  public bobHeight: number;
  public bobSpeed: number;
  private bobTimer: number;
  // Visual emphasis
  public visualScale: number;
  public jiggleAmplitude: number;
  public jiggleFrequency: number;

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
    this.magnetBaseSpeed = 30.0;
    this.magnetMaxSpeed = 140.0;
    this.bobHeight = 0.5;
    this.bobSpeed = 2.0;
    this.bobTimer = Math.random() * Math.PI * 2; // Random start phase
    this.visualScale = 5.6; // make power-ups larger by default
    this.jiggleAmplitude = 0.5; // horizontal wiggle amplitude (units)
    this.jiggleFrequency = 12.0; // wiggle speed (Hz)

    // Set properties based on power-up type
    this.initializeByType();
    this.createMesh();

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
        this.weight = 0.2;
        this.collisionBounds = { radius: 2.0 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        break;

      case PowerUpSubType.SHIELD:
        this.value = 25; // 25 shield points
        this.weight = 0.3;
        this.collisionBounds = { radius: 2.4 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        break;

      case PowerUpSubType.LIFE:
        this.value = 1; // 1 extra life
        this.weight = 0.1;
        this.collisionBounds = { radius: 2.8 * radiusScale };
        this.magnetRange = 28.0 * magnetRangeScale; // Lives are more attractive
        this.bobHeight = 0.8;
        break;

      case PowerUpSubType.SPEED:
        this.value = 2; // 2x speed multiplier for 10 seconds
        this.weight = 0.2;
        this.collisionBounds = { radius: 2.0 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        this.bobSpeed = 4.0; // Faster bobbing for speed power-up
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        this.value = 1; // 1 weapon level
        this.weight = 0.4;
        this.collisionBounds = { radius: 3.0 * radiusScale };
        this.magnetRange = 24.0 * magnetRangeScale;
        this.bobHeight = 0.6;
        break;
    }
  }

  private createMesh(): void {
    if (!this.scene) return;

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        // Ammo box
        geometry = new THREE.BoxGeometry(0.6, 0.4, 0.3);
        material = new THREE.MeshLambertMaterial({
          color: 0xffff00, // Yellow
          emissive: new THREE.Color(0xffee66),
          emissiveIntensity: 2.2,
          transparent: true,
          opacity: 0.9,
        });
        break;

      case PowerUpSubType.SHIELD:
        // Shield orb
        geometry = new THREE.SphereGeometry(0.5, 10, 8);
        material = new THREE.MeshLambertMaterial({
          color: 0x00aaff, // Blue
          emissive: new THREE.Color(0x66ccff),
          emissiveIntensity: 1.8,
          transparent: true,
          opacity: 0.7,
        });
        break;

      case PowerUpSubType.LIFE:
        // Life/heart shape (simplified as diamond)
        geometry = new THREE.OctahedronGeometry(0.6);
        material = new THREE.MeshLambertMaterial({
          color: 0xff0000, // Red
          emissive: new THREE.Color(0xaa0000),
          emissiveIntensity: 2.0,
          transparent: true,
          opacity: 0.85,
        });
        break;

      case PowerUpSubType.SPEED:
        // Speed boost (lightning bolt shape, simplified as thin diamond)
        geometry = new THREE.ConeGeometry(0.2, 1.0, 4);
        material = new THREE.MeshLambertMaterial({
          color: 0x00ff00, // Green
          emissive: new THREE.Color(0x33ff33),
          emissiveIntensity: 2.0,
          transparent: true,
          opacity: 0.9,
        });
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        // Weapon upgrade (star/plus shape)
        geometry = new THREE.DodecahedronGeometry(0.7);
        material = new THREE.MeshLambertMaterial({
          color: 0xff8800, // Orange
          emissive: new THREE.Color(0xffaa44),
          emissiveIntensity: 2.0,
          transparent: true,
          opacity: 0.8,
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
    this.scene.add(this.mesh);
  }

  protected onUpdate(deltaTime: number): void {
    // Handle bobbing animation
    this.updateBobbing(deltaTime);

    // Handle rotation
    this.updateRotation(deltaTime);

    // Handle player attraction (if player is nearby)
    this.updatePlayerAttraction(deltaTime);

    // Handle special effects
    this.updateSpecialEffects(deltaTime);
  }

  private updateBobbing(deltaTime: number): void {
    // Stop all bob/jiggle once magnetism is active
    if (this.attracted) return;

    this.bobTimer += this.bobSpeed * deltaTime;

    if (this.mesh) {
      // Smooth bobbing motion
      const bobOffset = Math.sin(this.bobTimer) * this.bobHeight;
      this.mesh.position.y = this.position.y + bobOffset;
      // Horizontal jiggle/wiggle to catch the eye
      const jiggle = Math.sin(this.bobTimer * this.jiggleFrequency) * this.jiggleAmplitude;
      this.mesh.position.x = this.position.x + jiggle;
      this.mesh.position.z = this.position.z + jiggle * 0.6;
    }
  }

  private updateRotation(deltaTime: number): void {
    if (!this.mesh) return;

    // Rotate based on power-up type
    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        this.mesh.rotation.y += 1.0 * deltaTime;
        break;

      case PowerUpSubType.SHIELD:
        this.mesh.rotation.x += 0.5 * deltaTime;
        this.mesh.rotation.y += 1.5 * deltaTime;
        break;

      case PowerUpSubType.LIFE:
        this.mesh.rotation.y += 2.0 * deltaTime;
        this.mesh.rotation.z += 1.0 * deltaTime;
        break;

      case PowerUpSubType.SPEED:
        this.mesh.rotation.z += 3.0 * deltaTime; // Fast spin for speed boost
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        this.mesh.rotation.x += 1.0 * deltaTime;
        this.mesh.rotation.y += 1.0 * deltaTime;
        this.mesh.rotation.z += 1.0 * deltaTime;
        break;
    }
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
        this.die();
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
      // Much snappier: override velocity toward player with speed that scales by distance.
      const dir = new THREE.Vector3(dx, dy, dz);
      const dist = Math.max(0.0001, distance);
      dir.multiplyScalar(1 / dist);
      // Speed grows with remaining range and proximity, clamped by magnetMaxSpeed
      const range = this.magnetRange;
      const base = this.magnetBaseSpeed || 30.0;
      const maxS = this.magnetMaxSpeed || 140.0;
      const proximity = Math.max(0, Math.min(1, 1 - dist / range));
      const boost = (range - dist) * 10.0 + 80.0 * Math.pow(proximity, 1.2);
      const speed = Math.min(maxS, base + boost);
      const step = speed; // units/sec
      this.velocity.x = dir.x * step;
      this.velocity.y = dir.y * step;
      this.velocity.z = dir.z * step;

      // If very close, ensure immediate pickup next frame
      if (dist < 0.2) {
        this.velocity.x *= 2;
        this.velocity.y *= 2;
        this.velocity.z *= 2;
      }
    }
  }

  private updateSpecialEffects(_deltaTime: number): void {
    const time = Date.now() * 0.001;

    if (!this.mesh) return;

    switch (this.powerUpType) {
      case PowerUpSubType.SHIELD:
        // Pulsing shield effect
        if (
          this.mesh instanceof THREE.Mesh &&
          this.mesh.material instanceof THREE.MeshLambertMaterial
        ) {
          this.mesh.material.opacity = 0.6 + Math.sin(time * 4.0) * 0.2;
          this.mesh.material.transparent = true;
        }
        break;

      case PowerUpSubType.LIFE:
        // Heartbeat pulsing
        const heartbeat = Math.sin(time * 8.0) * 0.1 + Math.sin(time * 2.0) * 0.1;
        this.mesh.scale.setScalar(1.0 + heartbeat);
        break;

      case PowerUpSubType.SPEED:
        // Rapid flickering for speed
        if (
          this.mesh instanceof THREE.Mesh &&
          this.mesh.material instanceof THREE.MeshLambertMaterial
        ) {
          this.mesh.material.opacity = 0.8 + Math.sin(time * 20.0) * 0.2;
          this.mesh.material.transparent = true;
        }
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        // Glowing effect
        const glow = 0.7 + Math.sin(time * 3.0) * 0.3;
        if (
          this.mesh instanceof THREE.Mesh &&
          this.mesh.material instanceof THREE.MeshLambertMaterial
        ) {
          this.mesh.material.opacity = glow;
          this.mesh.material.transparent = true;
        }
        break;
    }
  }

  // Check if player is in magnet range
  public checkPlayerInRange(playerPosition: { x: number; y: number; z: number }): boolean {
    const dx = this.position.x - playerPosition.x;
    const dy = this.position.y - playerPosition.y;
    const dz = this.position.z - playerPosition.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance <= this.magnetRange) {
      this.attracted = true;
      return true;
    }

    return false;
  }

  // Apply power-up effect to player
  public applyToPlayer(player: IEntity): void {
    const sceneUser = (this.scene as any)?.userData || {};
    const hud = sceneUser.hud as any;
    switch (this.powerUpType) {
      case PowerUpSubType.AMMO: {
        (player as any).ammo = Math.min(250, ((player as any).ammo || 0) + (this.value || 10));
        hud?.updateAmmo((player as any).ammo);
        break;
      }
      case PowerUpSubType.SHIELD: {
        const maxShield = (player as any).maxShield || 8;
        (player as any).shield = Math.min(
          maxShield,
          ((player as any).shield || 0) + (this.value || 1),
        );
        hud?.updateShieldSegments((player as any).shield);
        break;
      }
      case PowerUpSubType.LIFE: {
        const currentLives = Math.min(8, (hud?.getGameState?.().lives || 0) + 1);
        hud?.updateLives(currentLives);
        break;
      }
      case PowerUpSubType.SPEED: {
        const base = sceneUser.baseRailsSpeed || 50;
        const boosted = Math.min(500, base * 1.5);
        sceneUser.railsSpeed = boosted;
        hud?.updateSpeed(boosted);
        setTimeout(() => {
          sceneUser.railsSpeed = base;
          hud?.updateSpeed(base);
        }, 5000);
        break;
      }
      case PowerUpSubType.WEAPON_UPGRADE: {
        const current = (player as any).weaponLevel || 0;
        // Cycle levels 1→5, then wrap to 1
        const nextLevel = (current % 5) + 1;
        (player as any).weaponLevel = nextLevel;
        hud?.updateWeaponLevel(nextLevel);
        break;
      }
    }
  }

  // Override collision to apply power-up to player
  public override onCollision(other: IEntity): void {
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
      this.die();
      return;
    }

    // If hit by the player's projectile, snap into magnet mode toward the player
    if (other.type === EntityType.PROJECTILE && this.state === EntityState.ACTIVE) {
      // Only react to player's projectiles
      const owner = (other as any).owner;
      if (owner === 'player') {
        this.attracted = true;
        // Strong magnet effect and wide range so it quickly reaches the player
        this.magnetRange = Math.max(this.magnetRange, 40.0);
        this.attractionSpeed = Math.max(this.attractionSpeed, 24.0);
      }
    }
  }

  protected override onDie(): void {
    // Immediately mark as DEAD so EntityManager removes the power-up
    this.velocity.set(0, 0, 0);
    this.animationType = AnimationType.EXPLODING;
    this.state = EntityState.DEAD;
  }

  protected override onDestroy(): void {
    // Power-up cleanup - could spawn sparkle effects, etc.
  }

  // Get rarity/value rating (for spawning logic)
  public getRarityRating(): number {
    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        return 1; // Common
      case PowerUpSubType.SPEED:
        return 2; // Uncommon
      case PowerUpSubType.SHIELD:
        return 3; // Rare
      case PowerUpSubType.WEAPON_UPGRADE:
        return 4; // Very Rare
      case PowerUpSubType.LIFE:
        return 5; // Ultra Rare
      default:
        return 1;
    }
  }
}
