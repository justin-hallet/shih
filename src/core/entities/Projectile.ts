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
  public explosionRadius: number;
  public growthExponent: number; // 1.0 = linear, >1 grows late, <1 early
  public growthMaxScale: number; // final scale multiplier at death
  public blastRadiusScale: number;

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
    this.explosionRadius = 0;
    this.growthExponent = 2.0; // slow-start so max reached near end
    this.growthMaxScale = 2.0; // Reduced from 8.0 to prevent massive projectiles
    this.blastRadiusScale = 1.0; // Reduced from 2.0 to prevent massive projectiles

    // Set initial velocity based on direction
    const dir =
      direction instanceof THREE.Vector3
        ? direction.clone().normalize()
        : new THREE.Vector3(direction.x, direction.y, direction.z).normalize();
    this.velocity.copy(dir).multiplyScalar(this.speed);

    // Set properties based on projectile type
    this.initializeByType();
    this.createMesh();

    // Projectiles are immediately active
    this.state = EntityState.ACTIVE;
  }

  private initializeByType(): void {
    switch (this.projectileType) {
      case ProjectileSubType.BULLET:
        // Player damage should come from Player entity, enemy damage is random
        this.damage = this.owner === 'player' ? 15 : 0.5 + Math.random() * 0.5; // Enemy: 0.5-1.0 random
        this.speed = 20.0;
        this.lifetime = 3.0;
        this.blastRadiusScale = 1.2;
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.MISSILE:
        this.damage = this.owner === 'player' ? 40 : 0.6 + Math.random() * 0.4; // Enemy: 0.6-1.0 random
        this.speed = 12.0;
        this.lifetime = 8.0;
        this.explosionRadius = 2.0;
        this.blastRadiusScale = 1.3;
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.LASER:
        this.damage = this.owner === 'player' ? 25 : 0.5 + Math.random() * 0.5; // Enemy: 0.5-1.0 random
        this.speed = 30.0;
        this.lifetime = 2.0;
        this.piercing = true; // Goes through targets
        this.blastRadiusScale = 1.4;
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.PLASMA:
        this.damage = this.owner === 'player' ? 35 : 0.7 + Math.random() * 0.3; // Enemy: 0.7-1.0 random
        this.speed = 8.0;
        this.lifetime = 4.0;
        this.explosionRadius = 1.5;
        this.blastRadiusScale = 1.5;
        this.animationType = AnimationType.MOVING;
        break;

      case ProjectileSubType.FIREBALL:
        this.damage = this.owner === 'player' ? 50 : 0.8 + Math.random() * 0.2; // Enemy: 0.8-1.0 random
        this.speed = 6.0;
        this.lifetime = 6.0;
        this.explosionRadius = 3.0;
        this.blastRadiusScale = 1.6;
        this.animationType = AnimationType.FLOATING;
        break;
    }

    // Update velocity with new speed
    this.velocity.normalize().multiplyScalar(this.speed);
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
        break;

      case ProjectileSubType.MISSILE:
        // Missile with fins
        geometry = new THREE.ConeGeometry(0.15, 0.8, 6);
        material = new THREE.MeshLambertMaterial({
          color: this.owner === 'player' ? 0x00ff00 : 0xff0000,
        });
        break;

      case ProjectileSubType.LASER:
        // Pill-shaped laser (capsule), more visible, aligned to XZ plane
        geometry = new THREE.CapsuleGeometry(0.12, 0.6, 4, 8);
        material = new THREE.MeshLambertMaterial({
          color: this.owner === 'player' ? 0x00ffff : 0xff00ff,
          transparent: true,
          opacity: 0.95,
        });
        break;

      case ProjectileSubType.PLASMA:
        // Glowing plasma ball
        geometry = new THREE.SphereGeometry(0.34, 12, 8);
        material = new THREE.MeshLambertMaterial({
          color: 0x66ccff,
        });
        break;

      case ProjectileSubType.FIREBALL:
        // Large fireball
        geometry = new THREE.SphereGeometry(0.55, 12, 10);
        material = new THREE.MeshLambertMaterial({
          color: 0xff6622,
          transparent: true,
          opacity: 0.95,
        });
        break;

      default:
        geometry = new THREE.SphereGeometry(0.1);
        material = new THREE.MeshLambertMaterial({ color: 0xffffff });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;

    // Align pill/laser along XZ plane
    if (this.projectileType === ProjectileSubType.LASER) {
      this.mesh.rotation.x = Math.PI / 2; // rotate so capsule length lies in XZ
      this.mesh.rotation.z = Math.PI / 2; // Align along movement
    } else if (this.projectileType === ProjectileSubType.MISSILE) {
      this.mesh.rotation.x = Math.PI / 2; // Point forward
    }

    this.scene.add(this.mesh);

    // Calculate collision bounds from the actual mesh
    this.updateCollisionBoundsFromMesh(this.blastRadiusScale);

    // Apply outline effect for glow
    this.applyOutlineEffect();
  }

  private applyOutlineEffect(): void {
    if (!this.mesh || !this.scene) return;

    // Get the outline pass from scene userData
    // Define outline colors based on projectile type and owner
    const getOutlineColor = (): THREE.Color => {
      switch (this.projectileType) {
        case ProjectileSubType.BULLET:
          return new THREE.Color(this.owner === 'player' ? 0xffff00 : 0xff4444);
        case ProjectileSubType.MISSILE:
          return new THREE.Color(this.owner === 'player' ? 0x00ff00 : 0xff0000);
        case ProjectileSubType.LASER:
          return new THREE.Color(this.owner === 'player' ? 0x00ffff : 0xff00ff);
        case ProjectileSubType.PLASMA:
          return new THREE.Color(0x66ccff);
        case ProjectileSubType.FIREBALL:
          return new THREE.Color(0xff6622);
        default:
          return new THREE.Color(0xffffff);
      }
    };

    // Add projectile to outline system
    this.createOutlineEffect(getOutlineColor());
  }

  public override destroy(): void {
    // Remove from outline system before destroying
    this.removeOutlineEffect();

    // Call parent destroy
    super.destroy();
  }

  protected onUpdate(deltaTime: number): void {
    // Age the projectile
    this.age += deltaTime;

    // Check lifetime
    if (this.age >= this.lifetime) {
      this.die();
      return;
    }

    // Handle special effects
    this.updateSpecialEffects(deltaTime);

    // Apply growth over lifetime (up to growthMaxScale by end of life)
    if (this.mesh) {
      const t = Math.max(0, Math.min(1, this.lifetime > 0 ? this.age / this.lifetime : 1));
      const growth = 1 + (this.growthMaxScale - 1) * Math.pow(t, this.growthExponent);
      this.mesh.scale.setScalar(growth);

      this.updateCollisionBoundsFromMesh(this.blastRadiusScale);
    }

    // If projectile stopped moving significantly, remove it
    if (this.velocity.lengthSq() < 0.0001) {
      this.die();
      return;
    }
  }

  private updateSpecialEffects(deltaTime: number): void {
    const time = Date.now() * 0.001;

    if (!this.mesh) return;

    switch (this.projectileType) {
      case ProjectileSubType.PLASMA:
        // Spinning plasma effect
        this.mesh.rotation.x += 5.0 * deltaTime;
        this.mesh.rotation.y += 3.0 * deltaTime;

        // Pulsing effect
        const pulseScale = 1.0 + Math.sin(time * 8.0) * 0.2;
        this.mesh.scale.multiplyScalar(pulseScale);
        break;

      case ProjectileSubType.FIREBALL:
        // Floating/flickering fireball
        this.mesh.position.y += Math.sin(time * 6.0) * 0.1 * deltaTime;

        // Flickering opacity
        if (this.mesh.material instanceof THREE.MeshBasicMaterial) {
          this.mesh.material.opacity = 0.8 + Math.sin(time * 15.0) * 0.2;
        }
        break;

      case ProjectileSubType.LASER:
        // Laser glow effect
        if (this.mesh.material instanceof THREE.MeshBasicMaterial) {
          this.mesh.material.opacity = 0.9 + Math.sin(time * 20.0) * 0.1;
        }
        break;

      case ProjectileSubType.MISSILE:
        // Missile trail effect (simplified - could add particle system later)
        this.mesh.rotation.x += 0.1 * deltaTime; // Slight wobble
        break;
    }

  }

  public override onCollision(other: IEntity): void {
    if (this.state !== EntityState.ACTIVE) return;

    // Don't collide with same owner
    if (this.owner === 'player' && other.type === EntityType.PLAYER) return;
    if (this.owner === 'enemy' && other.type === EntityType.ENEMY) return;

    // Deal damage to target if we can damage it
    if (
      (this.owner === 'player' &&
        (other.type === EntityType.ENEMY || other.type === EntityType.OBSTACLE)) ||
      (this.owner === 'enemy' && other.type === EntityType.PLAYER)
    ) {
      other.takeDamage(this.damage);

      // Handle explosion
      if (this.explosionRadius > 0) {
        this.explode();
      }

      // Destroy projectile unless it's piercing
      if (!this.piercing) {
        this.die();
      }
    }
  }

  private explode(): void {
    // Visual explosion effect
    if (this.mesh instanceof THREE.Mesh && this.mesh.material instanceof THREE.MeshBasicMaterial) {
      this.mesh.material.color.setHex(0xffffff);
      this.mesh.scale.setScalar(this.explosionRadius);

      setTimeout(() => {
        this.die();
      }, 100);
    }
  }

  public override die(): void {
    if (this.state === EntityState.DEAD) return;

    // Skip DYING state - go directly to DEAD for immediate cleanup
    this.state = EntityState.DEAD;
  }
}
