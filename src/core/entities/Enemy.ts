/**
 * Enemy Entity - Various enemy types (grunt, soldier, flyer, tank, boss, dragon)
 */

import * as THREE from 'three';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, EnemySubType, AnimationType, EntityState } from '../types';

export class Enemy extends BaseEntity {
  public readonly enemyType: EnemySubType;
  public attackDamage: number;
  public attackRange: number;
  public attackCooldown: number;
  public lastAttackTime: number;
  public movementPattern: 'straight' | 'zigzag' | 'circular' | 'aggressive' | 'boss';
  public targetPlayer: IEntity | null;
  public aiUpdateTimer: number;

  // Health bar display
  private healthBarGroup?: THREE.Group;
  private healthBarBackground?: THREE.Mesh;
  private healthBarForeground?: THREE.Mesh;

  constructor(
    enemyType: EnemySubType,
    position: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scene?: THREE.Scene,
  ) {
    super(EntityType.ENEMY, enemyType, position, scene);

    this.enemyType = enemyType;
    this.attackDamage = 10;
    this.attackRange = 3.0;
    this.attackCooldown = 1.0; // seconds
    this.lastAttackTime = 0;
    this.movementPattern = 'straight';
    this.targetPlayer = null;
    this.aiUpdateTimer = 0;

    // Set properties based on enemy type
    this.initializeByType();
    this.createMesh();

    // Enemies are immediately active
    this.state = EntityState.ACTIVE;
  }

  private initializeByType(): void {
    switch (this.enemyType) {
      case EnemySubType.GRUNT:
        this.health = 60;
        this.maxHealth = 60;
        this.attackDamage = 15;
        this.attackRange = 2.5;
        this.attackCooldown = 1.5;
        this.animationType = AnimationType.MOVING;
        this.movementPattern = 'straight';
        this.velocity.z = -3.0; // Moving toward player
        break;

      case EnemySubType.SOLDIER:
        this.health = 100;
        this.maxHealth = 100;
        this.attackDamage = 20;
        this.attackRange = 4.0;
        this.attackCooldown = 1.0;
        this.animationType = AnimationType.MOVING;
        this.movementPattern = 'zigzag';
        this.velocity.z = -2.5;
        break;

      case EnemySubType.FLYER:
        this.health = 80;
        this.maxHealth = 80;
        this.attackDamage = 12;
        this.attackRange = 5.0;
        this.attackCooldown = 0.8;
        this.animationType = AnimationType.FLOATING;
        this.movementPattern = 'circular';
        this.velocity.z = -4.0;
        this.position.y += 2.0; // Start higher
        break;

      case EnemySubType.TANK:
        this.health = 300;
        this.maxHealth = 300;
        this.attackDamage = 40;
        this.attackRange = 6.0;
        this.attackCooldown = 2.0;
        this.animationType = AnimationType.MOVING;
        this.movementPattern = 'straight';
        this.velocity.z = -1.5;
        break;

      case EnemySubType.BOSS:
        this.health = 1000;
        this.maxHealth = 1000;
        this.attackDamage = 75;
        this.attackRange = 8.0;
        this.attackCooldown = 3.0;
        this.animationType = AnimationType.ATTACKING;
        this.movementPattern = 'boss';
        this.velocity.z = -1.0;
        break;

      case EnemySubType.DRAGON:
        this.health = 500;
        this.maxHealth = 500;
        this.attackDamage = 60;
        this.attackRange = 7.0;
        this.attackCooldown = 1.5;
        this.animationType = AnimationType.FLOATING;
        this.movementPattern = 'aggressive';
        this.velocity.z = -2.0;
        this.position.y += 3.0; // Start high like a dragon
        break;
    }
  }

  private createMesh(): void {
    if (!this.scene) return;

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (this.enemyType) {
      case EnemySubType.GRUNT:
        // Simple grunt representation
        geometry = new THREE.CapsuleGeometry(0.3, 1.0, 4, 8);
        material = new THREE.MeshLambertMaterial({ color: 0xff4444 });
        break;

      case EnemySubType.SOLDIER:
        // Soldier representation (larger capsule)
        geometry = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8);
        material = new THREE.MeshLambertMaterial({ color: 0xff6600 });
        break;

      case EnemySubType.FLYER:
        // Flying enemy (diamond shape)
        geometry = new THREE.OctahedronGeometry(0.6);
        material = new THREE.MeshLambertMaterial({
          color: 0xff00ff,
          transparent: true,
          opacity: 0.9,
        });
        break;

      case EnemySubType.TANK:
        // Tank representation (large box)
        geometry = new THREE.BoxGeometry(2.5, 1.5, 3.0);
        material = new THREE.MeshLambertMaterial({ color: 0x666666 });
        break;

      case EnemySubType.BOSS:
        // Boss representation (large imposing shape)
        geometry = new THREE.DodecahedronGeometry(2.0);
        material = new THREE.MeshLambertMaterial({
          color: 0x880000,
          wireframe: false,
        });
        break;

      case EnemySubType.DRAGON:
        // Dragon representation (elongated diamond)
        geometry = new THREE.ConeGeometry(1.0, 4.0, 8);
        material = new THREE.MeshLambertMaterial({
          color: 0x00ff88,
          transparent: true,
          opacity: 0.8,
        });
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

  protected onUpdate(deltaTime: number): void {
    this.aiUpdateTimer += deltaTime;

    // Update health bar position and display
    this.updateHealthBarPosition();
    this.updateHealthBarDisplay();
    this.updateHealthBarBillboard();

    // Update AI every 0.1 seconds (10 FPS for AI)
    if (this.aiUpdateTimer >= 0.1) {
      this.updateAI(deltaTime);
      this.aiUpdateTimer = 0;
    }

    // Handle movement patterns
    this.updateMovementPattern(deltaTime);

    // Handle attacking
    this.updateCombat(deltaTime);

    // Special animations based on type
    this.updateSpecialEffects(deltaTime);
  }

  private updateAI(_deltaTime: number): void {
    // Find player if we don't have a target
    // This would typically get the player from the EntityManager
    // For now, we'll implement basic movement patterns

    // Basic AI: adjust movement based on pattern
    switch (this.movementPattern) {
      case 'aggressive':
        // Try to move toward player position (simplified)
        if (this.position.x > 0) {
          this.velocity.x = -2.0;
        } else {
          this.velocity.x = 2.0;
        }
        break;

      case 'boss':
        // Boss movement: side to side
        const time = Date.now() * 0.001;
        this.velocity.x = Math.sin(time * 0.5) * 1.0;
        break;
    }
  }

  private updateMovementPattern(deltaTime: number): void {
    const time = Date.now() * 0.001;

    switch (this.movementPattern) {
      case 'zigzag':
        this.velocity.x = Math.sin(time * 3.0) * 2.0;
        break;

      case 'circular':
        const radius = 2.0;
        const speed = 2.0;
        this.velocity.x = Math.cos(time * speed) * radius * deltaTime;
        this.velocity.y = Math.sin(time * speed) * radius * deltaTime;
        break;

      case 'straight':
        // Already set in initialization
        break;
    }
  }

  private updateCombat(deltaTime: number): void {
    this.lastAttackTime += deltaTime;

    // Check if we can attack (simplified - would check for player in range)
    if (this.lastAttackTime >= this.attackCooldown && this.canAttack()) {
      this.attack();
      this.lastAttackTime = 0;
    }
  }

  private updateSpecialEffects(deltaTime: number): void {
    const time = Date.now() * 0.001;

    switch (this.enemyType) {
      case EnemySubType.FLYER:
      case EnemySubType.DRAGON:
        // Floating/hovering effect
        if (this.mesh) {
          this.mesh.position.y += Math.sin(time * 4.0) * 0.5 * deltaTime;
        }
        break;

      case EnemySubType.BOSS:
        // Boss pulsing effect
        if (this.mesh) {
          const scale = 1.0 + Math.sin(time * 2.0) * 0.1;
          this.mesh.scale.setScalar(scale);
        }
        break;
    }
  }

  private canAttack(): boolean {
    // Simplified attack check
    // In a real game, this would check distance to player
    return this.state === EntityState.ACTIVE && this.position.z > -5.0;
  }

  private attack(): void {
    if (this.state !== EntityState.ACTIVE) return;

    this.animationType = AnimationType.ATTACKING;
    this.animationFrame = 0;

    // This would create projectiles or damage the player
    // For now, just visual feedback
    if (
      this.mesh &&
      this.mesh instanceof THREE.Mesh &&
      this.mesh.material instanceof THREE.MeshBasicMaterial
    ) {
      const originalColor = this.mesh.material.color.clone();
      this.mesh.material.color.setHex(0xffffff); // Flash white

      setTimeout(() => {
        if (
          this.mesh &&
          this.mesh instanceof THREE.Mesh &&
          this.mesh.material instanceof THREE.MeshBasicMaterial
        ) {
          this.mesh.material.color.copy(originalColor);
        }
      }, 100);
    }
  }

  // Override collision to handle player damage
  public override onCollision(other: IEntity): void {
    if (other.type === EntityType.PLAYER && this.state === EntityState.ACTIVE) {
      // Damage the player
      other.takeDamage(this.attackDamage);

      // Take collision damage ourselves
      this.takeDamage(10);
    }
    // Note: Projectile damage is handled automatically by the projectile's onCollision method
    // which calls other.takeDamage(this.damage), so we don't need to handle it here
  }

  protected override onTakeDamage(_damage: number): void {
    // Visual feedback for damage
    if (
      this.mesh &&
      this.mesh instanceof THREE.Mesh &&
      this.mesh.material instanceof THREE.MeshBasicMaterial
    ) {
      const originalColor = this.mesh.material.color.clone();
      this.mesh.material.color.setHex(0xff0000);

      setTimeout(() => {
        if (
          this.mesh &&
          this.mesh instanceof THREE.Mesh &&
          this.mesh.material instanceof THREE.MeshBasicMaterial
        ) {
          this.mesh.material.color.copy(originalColor);
        }
      }, 150);
    }

    // Update health bar immediately when damage is taken
    this.updateHealthBarDisplay();

    // Knockback effect
    this.velocity.z += 0.5; // Push away from player
  }

  protected override onDie(): void {
    this.animationType = AnimationType.EXPLODING;
    this.velocity.set(0, 0, 0);

    // Boss death effects
    if (this.enemyType === EnemySubType.BOSS || this.enemyType === EnemySubType.DRAGON) {
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

  protected override onDestroy(): void {
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

    // Enemy cleanup - could drop power-ups, award points, etc.
  }

  // Get enemy difficulty rating (for spawning logic)
  public getDifficultyRating(): number {
    switch (this.enemyType) {
      case EnemySubType.GRUNT:
        return 1;
      case EnemySubType.SOLDIER:
        return 2;
      case EnemySubType.FLYER:
        return 2;
      case EnemySubType.TANK:
        return 4;
      case EnemySubType.DRAGON:
        return 6;
      case EnemySubType.BOSS:
        return 10;
      default:
        return 1;
    }
  }

  // Get point value (for scoring)
  public getPointValue(): number {
    return this.getDifficultyRating() * 100;
  }
}
