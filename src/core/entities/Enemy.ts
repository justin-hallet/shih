/**
 * Enemy Entity - Various enemy types (swooper, mech, orb, striker, serpent, guardian)
 */

import * as THREE from 'three';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, EnemySubType, AnimationType, EntityState } from '../types';

export class Enemy extends BaseEntity {
  public readonly enemyType: EnemySubType;
  public attackDamage: number;

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

    // Enemies are immediately active
    this.state = EntityState.ACTIVE;
  }

  private initializeByType(): void {
    switch (this.enemyType) {
      case EnemySubType.SWOOPER:
        this.health = this.maxHealth = 60;
        this.attackDamage = 0.3;
        this.velocity.z = -4.0;
        break;
      case EnemySubType.MECH:
        this.health = this.maxHealth = 150;
        this.attackDamage = 0.5;
        this.velocity.z = -2.0;
        break;
      case EnemySubType.ORB:
        this.health = this.maxHealth = 40;
        this.attackDamage = 0.3;
        this.velocity.z = -3.0;
        break;
      case EnemySubType.STRIKER:
        this.health = this.maxHealth = 50;
        this.attackDamage = 0.4;
        this.velocity.z = -6.0;
        break;
      case EnemySubType.SERPENT:
        this.health = this.maxHealth = 800;
        this.attackDamage = 1.5;
        this.velocity.z = -1.5;
        break;
      case EnemySubType.GUARDIAN:
        this.health = this.maxHealth = 600;
        this.attackDamage = 1.0;
        this.velocity.z = -1.0;
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

  protected onUpdate(deltaTime: number): void {
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
