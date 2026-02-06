/**
 * Enemy Entity - Various enemy types (swooper, mech, orb, striker, serpent, guardian)
 */

import * as THREE from 'three';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, EnemySubType, ProjectileSubType, AnimationType, EntityState } from '../types';
import type { MovementBehavior, MovementContext } from '../enemies/MovementBehavior';
import {
  SwooperMovement, MechMovement, OrbMovement,
  StrikerMovement, SerpentMovement, GuardianMovement,
} from '../enemies/MovementBehavior';

export class Enemy extends BaseEntity {
  public readonly enemyType: EnemySubType;
  public attackDamage: number;

  // Firing system
  protected fireCooldown: number = 2.0;
  protected fireCooldownTimer: number = 0;
  protected canFire: boolean = false;
  protected projectileType: ProjectileSubType = ProjectileSubType.BULLET;
  protected projectilesPerShot: number = 1;
  protected spreadAngle: number = 0;

  // Movement behavior system
  protected movementBehavior: MovementBehavior | null = null;
  protected spawnPosition: THREE.Vector3 = new THREE.Vector3();
  protected elapsedTime: number = 0;

  // Health bar display
  private healthBarGroup?: THREE.Group;
  private healthBarBackground?: THREE.Mesh;
  private healthBarForeground?: THREE.Mesh;

  // Score manager reference
  private static scoreManager?: any;

  public static setScoreManager(scoreManager: any): void {
    Enemy.scoreManager = scoreManager;
  }

  constructor(
    enemyType: EnemySubType,
    position: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scene?: THREE.Scene,
  ) {
    super(EntityType.ENEMY, enemyType, position, scene);

    this.enemyType = enemyType;
    this.attackDamage = 10;

    // Set properties based on enemy type
    this.initializeByType();
    this.createMesh();

    // Initialize movement behavior and record spawn position
    this.spawnPosition.copy(this.position);
    this.initializeMovement();

    // Enemies are immediately active
    this.state = EntityState.ACTIVE;
  }

  public setMovementBehavior(behavior: MovementBehavior): void {
    this.movementBehavior = behavior;
  }

  protected initializeMovement(): void {
    switch (this.enemyType) {
      case EnemySubType.SWOOPER:
        this.movementBehavior = new SwooperMovement(Math.random() > 0.5);
        break;
      case EnemySubType.MECH:
        this.movementBehavior = new MechMovement();
        break;
      case EnemySubType.ORB:
        this.movementBehavior = new OrbMovement(new THREE.Vector3());
        break;
      case EnemySubType.STRIKER:
        this.movementBehavior = new StrikerMovement();
        break;
      case EnemySubType.SERPENT:
        this.movementBehavior = new SerpentMovement();
        break;
      case EnemySubType.GUARDIAN:
        this.movementBehavior = new GuardianMovement();
        break;
    }
  }

  private initializeByType(): void {
    switch (this.enemyType) {
      case EnemySubType.SWOOPER:
        this.health = this.maxHealth = 60;
        this.attackDamage = 0.3;
        this.velocity.z = -4.0;
        this.canFire = true;
        this.projectileType = ProjectileSubType.PLASMA;
        this.fireCooldown = 3.0;
        this.projectilesPerShot = 1;
        break;
      case EnemySubType.MECH:
        this.health = this.maxHealth = 150;
        this.attackDamage = 0.5;
        this.velocity.z = -2.0;
        this.canFire = true;
        this.projectileType = ProjectileSubType.MISSILE;
        this.fireCooldown = 4.0;
        this.projectilesPerShot = 2;
        this.spreadAngle = 0.2;
        break;
      case EnemySubType.ORB:
        this.health = this.maxHealth = 40;
        this.attackDamage = 0.3;
        this.velocity.z = -3.0;
        this.canFire = true;
        this.projectileType = ProjectileSubType.PLASMA;
        this.fireCooldown = 5.0;
        this.projectilesPerShot = 3;
        this.spreadAngle = 0.4;
        break;
      case EnemySubType.STRIKER:
        this.health = this.maxHealth = 50;
        this.attackDamage = 0.4;
        this.velocity.z = -6.0;
        this.canFire = true;
        this.projectileType = ProjectileSubType.MISSILE;
        this.fireCooldown = 2.5;
        this.projectilesPerShot = 2;
        this.spreadAngle = 0.15;
        break;
      case EnemySubType.SERPENT:
        this.health = this.maxHealth = 800;
        this.attackDamage = 1.5;
        this.velocity.z = -1.5;
        this.canFire = true;
        this.projectileType = ProjectileSubType.FIREBALL;
        this.fireCooldown = 3.0;
        this.projectilesPerShot = 5;
        this.spreadAngle = 0.6;
        break;
      case EnemySubType.GUARDIAN:
        this.health = this.maxHealth = 600;
        this.attackDamage = 1.0;
        this.velocity.z = -1.0;
        this.canFire = true;
        this.projectileType = ProjectileSubType.PLASMA;
        this.fireCooldown = 4.0;
        this.projectilesPerShot = 8;
        this.spreadAngle = Math.PI * 2;
        break;
    }
  }

  private createMesh(): void {
    if (!this.scene) return;

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (this.enemyType) {
      case EnemySubType.SWOOPER:
        // Aerial formation flyer (octahedron, magenta)
        geometry = new THREE.OctahedronGeometry(0.6);
        material = new THREE.MeshLambertMaterial({ color: 0xff00ff });
        break;

      case EnemySubType.MECH:
        // Ground walker/leaper (box, gray)
        geometry = new THREE.BoxGeometry(1.2, 1.5, 0.8);
        material = new THREE.MeshLambertMaterial({ color: 0x888888 });
        break;

      case EnemySubType.ORB:
        // Splits apart, opens to fire (sphere, cyan)
        geometry = new THREE.SphereGeometry(0.6);
        material = new THREE.MeshLambertMaterial({ color: 0x00ffff });
        break;

      case EnemySubType.STRIKER:
        // Fast dive-bomber (cone, white)
        geometry = new THREE.ConeGeometry(0.3, 1.5, 6);
        material = new THREE.MeshLambertMaterial({ color: 0xffffff });
        break;

      case EnemySubType.SERPENT:
        // Multi-segment boss (dodecahedron, green)
        geometry = new THREE.DodecahedronGeometry(1.5);
        material = new THREE.MeshLambertMaterial({ color: 0x00ff88 });
        break;

      case EnemySubType.GUARDIAN:
        // Boss with orbiting shields (icosahedron, dark red)
        geometry = new THREE.IcosahedronGeometry(1.5);
        material = new THREE.MeshLambertMaterial({ color: 0x880000 });
        break;

      default:
        geometry = new THREE.SphereGeometry(0.5);
        material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
    }


    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.scale.set(5, 5, 5);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.scene.add(this.mesh);

    // Calculate collision bounds from the actual mesh
    this.updateCollisionBoundsFromMesh();

    // Create health bar
    this.createHealthBar();
  }

  private createHealthBar(): void {
    if (!this.scene) return;

    // Create health bar group
    this.healthBarGroup = new THREE.Group();

    // Health bar dimensions
    const barWidth = 3.0;
    const barHeight = 0.3;
    const barDepth = 0.1;

    // Background (red) - shows max health
    const backgroundGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth);
    const backgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0x440000,
      transparent: true,
      opacity: 0.8,
    });
    this.healthBarBackground = new THREE.Mesh(backgroundGeometry, backgroundMaterial);
    this.healthBarGroup.add(this.healthBarBackground);

    // Foreground (green/yellow/red) - shows current health
    const foregroundGeometry = new THREE.BoxGeometry(barWidth, barHeight, barDepth + 0.01);
    const foregroundMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.9,
    });
    this.healthBarForeground = new THREE.Mesh(foregroundGeometry, foregroundMaterial);
    this.healthBarGroup.add(this.healthBarForeground);

    // Position health bar above enemy
    this.updateHealthBarPosition();

    // Make health bar always face camera (billboard effect)
    this.healthBarGroup.renderOrder = 1000; // Render on top

    this.scene.add(this.healthBarGroup);
  }

  private updateHealthBarPosition(): void {
    if (!this.healthBarGroup) return;

    // Position health bar just above the collision radius
    const collisionRadius = this.collisionBounds?.radius || 1.0;
    const healthBarOffset = 0.8; // Small gap above the collision sphere

    this.healthBarGroup.position.set(
      this.position.x,
      this.position.y + collisionRadius + healthBarOffset,
      this.position.z,
    );
  }

  private updateHealthBarDisplay(): void {
    if (!this.healthBarForeground || !this.healthBarBackground) return;

    // Calculate health percentage
    const healthPercent = Math.max(0, this.health / this.maxHealth);

    // Update foreground bar width to match current health
    this.healthBarForeground.scale.x = healthPercent;

    // Position foreground bar to align left
    const barWidth = 3.0;
    const offset = (barWidth * (1 - healthPercent)) / 2;
    this.healthBarForeground.position.x = -offset;

    // Change color based on health percentage (Borderlands style)
    const material = this.healthBarForeground.material as THREE.MeshBasicMaterial;
    if (healthPercent > 0.6) {
      material.color.setHex(0x00ff00); // Green (healthy)
    } else if (healthPercent > 0.3) {
      material.color.setHex(0xffff00); // Yellow (damaged)
    } else {
      material.color.setHex(0xff0000); // Red (critical)
    }
  }

  private updateHealthBarBillboard(): void {
    if (!this.healthBarGroup || !this.scene) return;

    // Get camera from scene userData
    const camera = (this.scene as any)?.userData?.camera;
    if (camera) {
      this.healthBarGroup.lookAt(camera.position);
    }
  }

  protected fireProjectile(targetPosition: THREE.Vector3): void {
    if (this.fireCooldownTimer < this.fireCooldown || !this.canFire) return;
    if (this.state !== EntityState.ACTIVE) return;
    if (!this.scene || !this.mesh) return;

    this.fireCooldownTimer = 0;

    const entityManager = (this.scene as any)?.userData?.['entityManager'];
    if (!entityManager) return;

    for (let i = 0; i < this.projectilesPerShot; i++) {
      const direction = new THREE.Vector3()
        .subVectors(targetPosition, this.position)
        .normalize();

      // Apply spread for multi-shot
      if (this.projectilesPerShot > 1 && this.spreadAngle > 0) {
        const angleOffset = this.spreadAngle * ((i / (this.projectilesPerShot - 1)) - 0.5);
        const axis = new THREE.Vector3(0, 1, 0);
        direction.applyAxisAngle(axis, angleOffset);
      }

      entityManager.spawnProjectile(
        this.projectileType,
        'enemy',
        { x: this.position.x, y: this.position.y, z: this.position.z },
        { x: direction.x, y: direction.y, z: direction.z },
      );
    }
  }

  protected onUpdate(deltaTime: number): void {
    // Update elapsed time
    this.elapsedTime += deltaTime;

    // Update movement behavior
    if (this.movementBehavior) {
      const player = (this.scene as any)?.userData?.['entityManager']?.player;
      const gameState = (this.scene as any)?.userData?.['gameState'];
      const ctx: MovementContext = {
        position: this.position,
        playerPosition: player?.position || new THREE.Vector3(),
        spawnPosition: this.spawnPosition,
        deltaTime,
        elapsedTime: this.elapsedTime,
        railsSpeed: gameState?.railsSpeed || 50,
      };
      this.movementBehavior.update(ctx, this.velocity);

      if (this.movementBehavior.shouldDespawn(ctx)) {
        this.state = EntityState.DEAD;
        return;
      }
    }

    // Update firing cooldown
    this.fireCooldownTimer += deltaTime;

    // Attempt to fire at player if in range
    if (this.canFire && this.fireCooldownTimer >= this.fireCooldown) {
      const player = (this.scene as any)?.userData?.['entityManager']?.player;
      if (player && player.state === EntityState.ACTIVE) {
        const distToPlayer = this.position.distanceTo(player.position);
        if (distToPlayer < 150) {
          this.fireProjectile(player.position.clone());
        }
      }
    }

    // Update health bar position and display
    this.updateHealthBarPosition();
    this.updateHealthBarDisplay();
    this.updateHealthBarBillboard();

    // Update special effects
    this.updateSpecialEffects(deltaTime);
  }

  private updateSpecialEffects(deltaTime: number): void {
    const time = Date.now() * 0.001;

    switch (this.enemyType) {
      case EnemySubType.SWOOPER:
      case EnemySubType.STRIKER:
        // Floating/hovering sin-wave effect
        if (this.mesh) {
          this.mesh.position.y += Math.sin(time * 4.0) * 0.5 * deltaTime;
        }
        break;

      case EnemySubType.SERPENT:
      case EnemySubType.GUARDIAN:
        // Pulsing scale effect
        if (this.mesh) {
          const scale = 1.0 + Math.sin(time * 2.0) * 0.1;
          this.mesh.scale.setScalar(scale);
        }
        break;
    }
  }

  // Override collision to handle player damage
  protected override onCollisionResponse(other: IEntity): void {
    if (other.type === EntityType.PLAYER && this.state === EntityState.ACTIVE) {
      // Damage the player
      other.onDamage(this.attackDamage);

      // Take collision damage ourselves
      this.onDamage(10);
    }
  }

  protected override handleDamage(_damage: number): void {
    // Visual feedback for damage - red silhouette outline
    this.createDamageOutline();

    // Play enemy hit sound
    this.getAudioManager()?.playEnemyHitSound(this.position);

    // Update health bar immediately when damage is taken
    this.updateHealthBarDisplay();

    // Knockback effect
    this.velocity.z += 0.5; // Push away from player
  }

  private createDamageOutline(): void {
    if (!this.mesh || !this.scene) return;

    // Get the outline pass from scene userData
    this.createOutlineEffect(new THREE.Color(0xff3333));

    // Remove outline after a short delay
    setTimeout(() => {
      this.removeOutlineEffect();
    }, 200);
  }

  protected override onDie(): void {
    this.animationType = AnimationType.EXPLODING;
    this.velocity.set(0, 0, 0);

    // Play enemy death sound
    this.getAudioManager()?.playEnemyDeathSound(this.position);

    // Add score for enemy kill
    Enemy.scoreManager?.addEnemyKillScore(this.enemyType);

    // Boss death effects
    if (this.enemyType === EnemySubType.GUARDIAN || this.enemyType === EnemySubType.SERPENT) {
      // More dramatic death animation for bosses
      if (this.mesh) {
        this.mesh.rotation.x = Math.random() * Math.PI;
        this.mesh.rotation.y = Math.random() * Math.PI;
        this.mesh.rotation.z = Math.random() * Math.PI;
      }
    }

    // Immediately mark as DEAD so EntityManager removes the enemy
    this.state = EntityState.DEAD;
  }

  public override destroy(): void {
    // Clean up health bar
    if (this.healthBarGroup && this.scene) {
      this.scene.remove(this.healthBarGroup);

      // Dispose of health bar materials and geometries
      if (this.healthBarBackground) {
        this.healthBarBackground.geometry.dispose();
        (this.healthBarBackground.material as THREE.Material).dispose();
      }
      if (this.healthBarForeground) {
        this.healthBarForeground.geometry.dispose();
        (this.healthBarForeground.material as THREE.Material).dispose();
      }
    }

    super.destroy();
  }
}
