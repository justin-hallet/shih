/**
 * Projectile Entity - Bullets, missiles, lasers, plasma, fireballs
 */

import * as THREE from 'three';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, ProjectileSubType, AnimationType, EntityState } from '../types';

export class Projectile extends BaseEntity {
  public readonly projectileType: ProjectileSubType;
  public damage: number;
  public speed: number;
  public lifetime: number;
  public age: number;
  public owner: 'player' | 'enemy';
  public piercing: boolean; // Can go through multiple targets
  public explosive: boolean; // Causes explosion on impact
  public explosionRadius: number;
  public homingTarget: IEntity | null;
  public homingStrength: number;
  // Visual growth over lifetime
  public growthExponent: number; // 1.0 = linear, >1 grows late, <1 early
  public growthMaxScale: number; // final scale multiplier at death
  private baseScale: number; // initial mesh scale baseline
  private effectScale: number; // transient effect scale from specials

  constructor(
    projectileType: ProjectileSubType,
    owner: 'player' | 'enemy',
    position: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    direction: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: -1 },
    scene?: THREE.Scene,
  ) {
    const posVec =
      position instanceof THREE.Vector3
        ? position
        : new THREE.Vector3(position.x, position.y, position.z);
    super(EntityType.PROJECTILE, `${owner}_${projectileType}`, posVec, scene);

    this.projectileType = projectileType;
    this.owner = owner;
    this.damage = 10;
    this.speed = 15.0;
    this.lifetime = 5.0; // seconds
    this.age = 0;
    this.piercing = false;
    this.explosive = false;
    this.explosionRadius = 0;
    this.homingTarget = null;
    this.homingStrength = 0;
    this.growthExponent = 2.0; // slow-start so max reached near end
    this.growthMaxScale = 8.0;
    this.baseScale = 1.0;
    this.effectScale = 1.0;

    // Set direction
    if (direction instanceof THREE.Vector3) {
      this.direction = direction.clone();
    } else {
      this.direction = new THREE.Vector3(direction.x, direction.y, direction.z);
    }

    // Set properties based on projectile type
    this.initializeByType();
    this.createMesh();

    // Set initial velocity based on direction and speed
    this.velocity.x = this.direction.x * this.speed;
    this.velocity.y = this.direction.y * this.speed;
    this.velocity.z = this.direction.z * this.speed;

    // Projectiles are immediately active
    this.state = EntityState.ACTIVE;
  }

  private initializeByType(): void {
    switch (this.projectileType) {
      case ProjectileSubType.BULLET:
        this.damage = this.owner === 'player' ? 15 : 10;
        this.speed = 20.0;
        this.lifetime = 3.0;
        this.weight = 0.1;
        this.collisionBounds = { radius: 0.1 };
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.MISSILE:
        this.damage = this.owner === 'player' ? 40 : 30;
        this.speed = 12.0;
        this.lifetime = 8.0;
        this.weight = 0.5;
        this.explosive = true;
        this.explosionRadius = 2.0;
        this.homingStrength = 2.0; // Can home in on targets
        this.collisionBounds = { radius: 0.3 };
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.LASER:
        this.damage = this.owner === 'player' ? 25 : 20;
        this.speed = 30.0;
        this.lifetime = 2.0;
        this.weight = 0.01;
        this.piercing = true; // Goes through targets
        this.collisionBounds = { radius: 0.05 };
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.PLASMA:
        this.damage = this.owner === 'player' ? 35 : 25;
        this.speed = 8.0;
        this.lifetime = 4.0;
        this.weight = 0.3;
        this.explosive = true;
        this.explosionRadius = 1.5;
        this.collisionBounds = { radius: 0.4 };
        this.animationType = AnimationType.SPINNING;
        break;

      case ProjectileSubType.FIREBALL:
        this.damage = this.owner === 'player' ? 50 : 40;
        this.speed = 6.0;
        this.lifetime = 6.0;
        this.weight = 0.8;
        this.explosive = true;
        this.explosionRadius = 3.0;
        this.collisionBounds = { radius: 0.6 };
        this.animationType = AnimationType.FLOATING;
        break;
    }
  }

  private createMesh(): void {
    if (!this.scene) return;

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (this.projectileType) {
      case ProjectileSubType.BULLET:
        // Small bullet
        geometry = new THREE.SphereGeometry(0.15, 8, 6);
        material = new THREE.MeshLambertMaterial({
          color: this.owner === 'player' ? 0xffff00 : 0xff4444,
        });
        // Use default exponent (set in ctor) for late growth
        break;

      case ProjectileSubType.MISSILE:
        // Missile with fins
        geometry = new THREE.ConeGeometry(0.15, 0.8, 6);
        material = new THREE.MeshLambertMaterial({
          color: this.owner === 'player' ? 0x00ff00 : 0xff0000,
        });
        break;

      case ProjectileSubType.LASER:
        // Thin laser beam
        geometry = new THREE.CylinderGeometry(0.02, 0.02, 1.0, 4);
        material = new THREE.MeshLambertMaterial({
          color: this.owner === 'player' ? 0x00ffff : 0xff00ff,
          transparent: true,
          opacity: 0.9,
        });
        break;

      case ProjectileSubType.PLASMA:
        // Glowing plasma ball
        geometry = new THREE.SphereGeometry(0.3, 8, 6);
        material = new THREE.MeshLambertMaterial({
          color: this.owner === 'player' ? 0x0088ff : 0xff8800,
          transparent: true,
          opacity: 0.8,
        });
        break;

      case ProjectileSubType.FIREBALL:
        // Large fireball
        geometry = new THREE.SphereGeometry(0.5, 10, 8);
        material = new THREE.MeshLambertMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.9,
        });
        break;

      default:
        geometry = new THREE.SphereGeometry(0.1);
        material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.baseScale = this.mesh.scale.x; // assume uniform scale

    // Orient missile and laser correctly
    if (this.projectileType === ProjectileSubType.MISSILE) {
      this.mesh.rotation.x = Math.PI / 2; // Point forward
    } else if (this.projectileType === ProjectileSubType.LASER) {
      this.mesh.rotation.z = Math.PI / 2; // Align along movement
    }

    this.scene.add(this.mesh);
  }

  protected onUpdate(deltaTime: number): void {
    // Age the projectile
    this.age += deltaTime;

    // Check lifetime
    if (this.age >= this.lifetime) {
      this.die();
      return;
    }

    // Handle homing behavior
    if (this.homingTarget && this.homingStrength > 0) {
      this.updateHoming(deltaTime);
    }

    // Handle special effects
    this.updateSpecialEffects(deltaTime);

    // Apply growth over lifetime (up to growthMaxScale by end of life)
    if (this.mesh) {
      const t = Math.max(0, Math.min(1, this.lifetime > 0 ? this.age / this.lifetime : 1));
      const growth = 1 + (this.growthMaxScale - 1) * Math.pow(t, this.growthExponent);
      this.mesh.scale.setScalar(this.baseScale * this.effectScale * growth);
    }

    // If projectile stopped moving significantly, remove it
    const speedSq =
      this.velocity.x * this.velocity.x +
      this.velocity.y * this.velocity.y +
      this.velocity.z * this.velocity.z;
    if (speedSq < 0.0001) {
      this.die();
      return;
    }

    // Remove projectiles that have gone too far behind the camera
    if (this.position.z > 10) {
      this.die();
    }
  }

  private updateHoming(deltaTime: number): void {
    if (!this.homingTarget) return;

    // Calculate direction to target
    const targetDir = {
      x: this.homingTarget.position.x - this.position.x,
      y: this.homingTarget.position.y - this.position.y,
      z: this.homingTarget.position.z - this.position.z,
    };

    // Normalize target direction
    const targetLength = Math.sqrt(targetDir.x ** 2 + targetDir.y ** 2 + targetDir.z ** 2);
    if (targetLength > 0) {
      targetDir.x /= targetLength;
      targetDir.y /= targetLength;
      targetDir.z /= targetLength;

      // Interpolate current direction toward target
      const homingFactor = this.homingStrength * deltaTime;
      this.direction.x += (targetDir.x - this.direction.x) * homingFactor;
      this.direction.y += (targetDir.y - this.direction.y) * homingFactor;
      this.direction.z += (targetDir.z - this.direction.z) * homingFactor;

      // Normalize direction
      const dirLength = Math.sqrt(
        this.direction.x ** 2 + this.direction.y ** 2 + this.direction.z ** 2,
      );
      if (dirLength > 0) {
        this.direction.x /= dirLength;
        this.direction.y /= dirLength;
        this.direction.z /= dirLength;
      }

      // Update velocity
      this.velocity.x = this.direction.x * this.speed;
      this.velocity.y = this.direction.y * this.speed;
      this.velocity.z = this.direction.z * this.speed;
    }
  }

  private updateSpecialEffects(deltaTime: number): void {
    const time = Date.now() * 0.001;
    this.effectScale = 1.0; // reset each frame

    switch (this.projectileType) {
      case ProjectileSubType.PLASMA:
        // Spinning plasma effect
        if (this.mesh) {
          this.mesh.rotation.x += 5.0 * deltaTime;
          this.mesh.rotation.y += 3.0 * deltaTime;

          // Pulsing effect
          this.effectScale = 1.0 + Math.sin(time * 8.0) * 0.2;
        }
        break;

      case ProjectileSubType.FIREBALL:
        // Floating/flickering fireball
        if (this.mesh) {
          this.mesh.position.y += Math.sin(time * 6.0) * 0.1 * deltaTime;

          // Flickering opacity
          if (
            this.mesh instanceof THREE.Mesh &&
            this.mesh.material instanceof THREE.MeshBasicMaterial
          ) {
            this.mesh.material.opacity = 0.8 + Math.sin(time * 15.0) * 0.2;
          }
        }
        break;

      case ProjectileSubType.LASER:
        // Laser glow effect
        if (
          this.mesh instanceof THREE.Mesh &&
          this.mesh.material instanceof THREE.MeshBasicMaterial
        ) {
          this.mesh.material.opacity = 0.9 + Math.sin(time * 20.0) * 0.1;
        }
        break;

      case ProjectileSubType.MISSILE:
        // Missile trail effect (simplified - could add particle system later)
        if (this.mesh) {
          this.mesh.rotation.x += 0.1 * deltaTime; // Slight wobble
        }
        break;
    }
  }

  // Override collision to handle damage and special effects
  public override onCollision(other: IEntity): void {
    if (this.state !== EntityState.ACTIVE) return;

    // Don't collide with same owner
    if (this.owner === 'player' && other.type === EntityType.PLAYER) return;
    if (this.owner === 'enemy' && other.type === EntityType.ENEMY) return;

    // Deal damage to target
    other.takeDamage(this.damage);

    // Handle explosion
    if (this.explosive) {
      this.explode();
    }

    // Destroy projectile unless it's piercing
    if (!this.piercing) {
      this.die();
    }
  }

  private explode(): void {
    // Visual explosion effect
    if (this.mesh instanceof THREE.Mesh && this.mesh.material instanceof THREE.MeshBasicMaterial) {
      this.mesh.material.color.setHex(0xffffff);

      // Scale up for explosion
      this.mesh.scale.setScalar(this.explosionRadius);

      setTimeout(() => {
        this.die();
      }, 100);
    }

    // TODO: In a full game, this would:
    // - Create particle effects
    // - Damage all entities within explosionRadius
    // - Play explosion sound
  }

  public setHomingTarget(target: IEntity): void {
    this.homingTarget = target;
  }

  protected override onDie(): void {
    // Immediately mark as dead; EntityManager will remove and cleanup
    this.state = EntityState.DEAD;
  }

  protected override onDestroy(): void {
    // Projectile cleanup
  }

  // Check if projectile should damage specific entity type
  public canDamage(entityType: EntityType): boolean {
    if (this.owner === 'player') {
      return entityType === EntityType.ENEMY || entityType === EntityType.OBSTACLE;
    } else {
      return entityType === EntityType.PLAYER;
    }
  }
}
