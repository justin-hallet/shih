/**
 * Player Entity - The main protagonist (Space Harrier)
 */

import * as THREE from 'three';
import { BaseEntity } from '../Entity';
import { EntityType, AnimationType, EntityState } from '../types';

export class Player extends BaseEntity {
  // Player-specific properties
  public ammo: number;
  public maxAmmo: number;
  public shield: number;
  public maxShield: number;
  public weaponLevel: number;
  public invulnerableTime: number;

  // Movement constraints
  public maxSpeed: number;
  public acceleration: number;
  public deceleration: number;

  constructor(position = { x: 0, y: 0, z: 0 }, scene?: THREE.Scene) {
    super(EntityType.PLAYER, 'harrier', position, scene);

    // Player stats
    this.maxHealth = 100;
    this.health = this.maxHealth;
    this.maxAmmo = 999;
    this.ammo = this.maxAmmo;
    this.maxShield = 50;
    this.shield = 0;
    this.weaponLevel = 1;
    this.invulnerableTime = 0;

    // Movement properties
    this.maxSpeed = 10.0;
    this.acceleration = 20.0;
    this.deceleration = 15.0;
    this.weight = 1.5;

    // Collision
    this.collisionBounds = { radius: 0.8 };

    // Start active
    this.state = EntityState.ACTIVE;
    this.createMesh();
  }

  private createMesh(): void {
    if (!this.scene) return;

    // Create a simple Harrier representation (will be replaced with proper model later)
    const geometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.rotation.x = Math.PI / 2; // Point forward
    this.scene.add(this.mesh);
  }

  // Player-specific update logic
  protected onUpdate(deltaTime: number): void {
    // Handle invulnerability
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaTime;

      // Flicker effect during invulnerability
      if (this.mesh) {
        this.mesh.visible = Math.floor(this.invulnerableTime * 10) % 2 === 0;
      }
    } else if (this.mesh) {
      this.mesh.visible = true;
    }

    // Apply deceleration if no input
    this.applyDeceleration(deltaTime);

    // Clamp velocity to max speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2);

    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
      this.velocity.z *= scale;
    }
  }

  private applyDeceleration(deltaTime: number): void {
    const decel = this.deceleration * deltaTime;

    this.velocity.x = this.lerp(this.velocity.x, 0, decel);
    this.velocity.y = this.lerp(this.velocity.y, 0, decel);
    this.velocity.z = this.lerp(this.velocity.z, 0, decel);
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * Math.min(factor, 1);
  }

  // Movement input methods
  public moveLeft(intensity = 1.0): void {
    this.velocity.x -= this.acceleration * intensity;
  }

  public moveRight(intensity = 1.0): void {
    this.velocity.x += this.acceleration * intensity;
  }

  public moveUp(intensity = 1.0): void {
    this.velocity.y += this.acceleration * intensity;
  }

  public moveDown(intensity = 1.0): void {
    this.velocity.y -= this.acceleration * intensity;
  }

  // Combat methods
  public shoot(): boolean {
    if (this.ammo <= 0 || this.state !== EntityState.ACTIVE) return false;

    this.ammo--;
    this.animationType = AnimationType.ATTACKING;
    this.animationFrame = 0;

    return true;
  }

  public addAmmo(amount: number): void {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
  }

  public addShield(amount: number): void {
    this.shield = Math.min(this.maxShield, this.shield + amount);
  }

  public upgradeWeapon(): void {
    this.weaponLevel = Math.min(5, this.weaponLevel + 1);
  }

  // Override damage to handle shield
  public override takeDamage(damage: number): void {
    if (this.invulnerableTime > 0) return;

    let actualDamage = damage;

    // Shield absorbs damage first
    if (this.shield > 0) {
      const shieldAbsorbed = Math.min(this.shield, damage);
      this.shield -= shieldAbsorbed;
      actualDamage -= shieldAbsorbed;
    }

    if (actualDamage > 0) {
      super.takeDamage(actualDamage);
      // Grant brief invulnerability
      this.invulnerableTime = 1.5;
    }
  }

  protected override onDie(): void {
    this.animationType = AnimationType.EXPLODING;
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  protected override onDestroy(): void {
    // Player cleanup
  }
}
