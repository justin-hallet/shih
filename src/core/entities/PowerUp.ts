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
  public bobHeight: number;
  public bobSpeed: number;
  private bobTimer: number;

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
    this.magnetRange = 3.0;
    this.attracted = false;
    this.attractionSpeed = 8.0;
    this.bobHeight = 0.5;
    this.bobSpeed = 2.0;
    this.bobTimer = Math.random() * Math.PI * 2; // Random start phase

    // Set properties based on power-up type
    this.initializeByType();
    this.createMesh();

    // Power-ups are immediately active
    this.state = EntityState.ACTIVE;
    this.animationType = AnimationType.FLOATING;
  }

  private initializeByType(): void {
    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        this.value = 50; // 50 shots
        this.weight = 0.2;
        this.collisionBounds = { radius: 0.5 };
        this.magnetRange = 2.5;
        break;

      case PowerUpSubType.SHIELD:
        this.value = 25; // 25 shield points
        this.weight = 0.3;
        this.collisionBounds = { radius: 0.6 };
        this.magnetRange = 3.0;
        break;

      case PowerUpSubType.LIFE:
        this.value = 1; // 1 extra life
        this.weight = 0.1;
        this.collisionBounds = { radius: 0.7 };
        this.magnetRange = 4.0; // Lives are more attractive
        this.bobHeight = 0.8;
        break;

      case PowerUpSubType.SPEED:
        this.value = 2; // 2x speed multiplier for 10 seconds
        this.weight = 0.2;
        this.collisionBounds = { radius: 0.4 };
        this.magnetRange = 2.0;
        this.bobSpeed = 4.0; // Faster bobbing for speed power-up
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        this.value = 1; // 1 weapon level
        this.weight = 0.4;
        this.collisionBounds = { radius: 0.8 };
        this.magnetRange = 3.5;
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
          emissiveIntensity: 1.0,
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
          emissiveIntensity: 0.9,
          transparent: true,
          opacity: 0.7,
        });
        break;

      case PowerUpSubType.LIFE:
        // Life/heart shape (simplified as diamond)
        geometry = new THREE.OctahedronGeometry(0.6);
        material = new THREE.MeshLambertMaterial({
          color: 0xff0088, // Pink/Red
          emissive: new THREE.Color(0xff66aa),
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.8,
        });
        break;

      case PowerUpSubType.SPEED:
        // Speed boost (lightning bolt shape, simplified as thin diamond)
        geometry = new THREE.ConeGeometry(0.2, 1.0, 4);
        material = new THREE.MeshLambertMaterial({
          color: 0x88ff00, // Bright Green
          emissive: new THREE.Color(0xaaff66),
          emissiveIntensity: 1.0,
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
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.8,
        });
        break;

      default:
        geometry = new THREE.SphereGeometry(0.3);
        material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    }

    this.mesh = new THREE.Mesh(geometry, material);
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
    this.bobTimer += this.bobSpeed * deltaTime;

    if (this.mesh) {
      // Smooth bobbing motion
      const bobOffset = Math.sin(this.bobTimer) * this.bobHeight;
      this.mesh.position.y = this.position.y + bobOffset;
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
    // This would typically get the player from EntityManager
    // For now, we'll implement basic magnetic behavior

    if (this.attracted && this.mesh) {
      // Move towards player position (simplified - assumes player at origin)
      const playerPos = { x: 0, y: 0, z: 2 }; // Approximate player position

      const dx = playerPos.x - this.position.x;
      const dy = playerPos.y - this.position.y;
      const dz = playerPos.z - this.position.z;

      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance > 0.5) {
        // Move towards player
        const moveSpeed = this.attractionSpeed * deltaTime;
        this.velocity.x += (dx / distance) * moveSpeed;
        this.velocity.y += (dy / distance) * moveSpeed;
        this.velocity.z += (dz / distance) * moveSpeed;
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
  public applyToPlayer(_player: IEntity): void {
    // This would be implemented based on the specific player interface
    // For now, we'll use the generic entity interface

    switch (this.powerUpType) {
      case PowerUpSubType.AMMO:
        // player.addAmmo(this.value);
        console.log(`Player gained ${this.value} ammo!`);
        break;

      case PowerUpSubType.SHIELD:
        // player.addShield(this.value);
        console.log(`Player gained ${this.value} shield!`);
        break;

      case PowerUpSubType.LIFE:
        // player.addLife(this.value);
        console.log(`Player gained ${this.value} extra life!`);
        break;

      case PowerUpSubType.SPEED:
        // player.applySpeedBoost(this.value, 10); // 10 second duration
        console.log(`Player gained ${this.value}x speed boost!`);
        break;

      case PowerUpSubType.WEAPON_UPGRADE:
        // player.upgradeWeapon();
        console.log(`Player weapon upgraded!`);
        break;
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

      // Destroy power-up after brief effect
      setTimeout(() => {
        this.die();
      }, 200);
    }
  }

  protected override onDie(): void {
    this.velocity = { x: 0, y: 0, z: 0 };
    this.animationType = AnimationType.EXPLODING;
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
