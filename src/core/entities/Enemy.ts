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

    switch (this.enemyType) {
      case EnemySubType.SWOOPER: {
        const group = new THREE.Group();

        // Body: flattened ellipsoid
        const bodyGeo = new THREE.SphereGeometry(0.5, 12, 8);
        bodyGeo.scale(1.5, 0.6, 2.0);
        const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc44cc });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        group.add(body);

        // Left wing
        const wingGeo = new THREE.BoxGeometry(2.0, 0.08, 0.8);
        const wingMat = new THREE.MeshLambertMaterial({ color: 0x993399 });
        const leftWing = new THREE.Mesh(wingGeo, wingMat);
        leftWing.position.set(-1.2, 0, 0.2);
        leftWing.rotation.z = 0.15;
        leftWing.rotation.y = -0.3;
        group.add(leftWing);

        // Right wing
        const rightWing = new THREE.Mesh(wingGeo.clone(), wingMat.clone());
        rightWing.position.set(1.2, 0, 0.2);
        rightWing.rotation.z = -0.15;
        rightWing.rotation.y = 0.3;
        group.add(rightWing);

        // Wing tip accents (emissive)
        const tipGeo = new THREE.SphereGeometry(0.12, 6, 6);
        const tipMat = new THREE.MeshLambertMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8 });
        const leftTip = new THREE.Mesh(tipGeo, tipMat);
        leftTip.position.set(-2.2, 0, 0.2);
        group.add(leftTip);
        const rightTip = new THREE.Mesh(tipGeo.clone(), tipMat.clone());
        rightTip.position.set(2.2, 0, 0.2);
        group.add(rightTip);

        this.mesh = group;
        break;
      }

      case EnemySubType.MECH: {
        const group = new THREE.Group();

        // Torso
        const torsoGeo = new THREE.BoxGeometry(1.2, 1.0, 0.8);
        const torsoMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
        const torso = new THREE.Mesh(torsoGeo, torsoMat);
        torso.position.y = 1.2;
        torso.name = 'torso';
        group.add(torso);

        // Head (dome)
        const headGeo = new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const headMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
        const head = new THREE.Mesh(headGeo, headMat);
        head.position.y = 1.9;
        group.add(head);

        // Visor (red stripe)
        const visorGeo = new THREE.BoxGeometry(0.5, 0.1, 0.4);
        const visorMat = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6 });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.75, 0.25);
        group.add(visor);

        // Shoulder cannon
        const cannonGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const cannonMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
        const cannon = new THREE.Mesh(cannonGeo, cannonMat);
        cannon.rotation.x = Math.PI / 2;
        cannon.position.set(0.5, 1.6, -0.2);
        group.add(cannon);

        // Left leg
        const legGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 6);
        const legMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
        const leftLeg = new THREE.Mesh(legGeo, legMat);
        leftLeg.position.set(-0.35, 0.5, 0);
        leftLeg.name = 'leftLeg';
        group.add(leftLeg);

        // Right leg
        const rightLeg = new THREE.Mesh(legGeo.clone(), legMat.clone());
        rightLeg.position.set(0.35, 0.5, 0);
        rightLeg.name = 'rightLeg';
        group.add(rightLeg);

        this.mesh = group;
        break;
      }

      case EnemySubType.ORB: {
        const group = new THREE.Group();

        // Top hemisphere
        const hemiGeo = new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
        const hemiMat = new THREE.MeshLambertMaterial({ color: 0x334444 });
        const topHalf = new THREE.Mesh(hemiGeo, hemiMat);
        topHalf.name = 'topHalf';
        group.add(topHalf);

        // Bottom hemisphere (flipped)
        const bottomHalf = new THREE.Mesh(hemiGeo.clone(), hemiMat.clone());
        bottomHalf.rotation.x = Math.PI;
        bottomHalf.name = 'bottomHalf';
        group.add(bottomHalf);

        // Inner core (visible when open)
        const coreGeo = new THREE.IcosahedronGeometry(0.3, 1);
        const coreMat = new THREE.MeshLambertMaterial({
          color: 0x00ffff,
          emissive: 0x00ffff,
          emissiveIntensity: 1.0,
        });
        const core = new THREE.Mesh(coreGeo, coreMat);
        core.name = 'core';
        core.visible = false;
        group.add(core);

        this.mesh = group;
        break;
      }

      case EnemySubType.STRIKER: {
        // Fast dive-bomber (cone, white)
        const geometry = new THREE.ConeGeometry(0.3, 1.5, 6);
        const material = new THREE.MeshLambertMaterial({ color: 0xffffff });
        this.mesh = new THREE.Mesh(geometry, material);
        break;
      }

      case EnemySubType.SERPENT: {
        // Multi-segment boss (dodecahedron, green)
        const geometry = new THREE.DodecahedronGeometry(1.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff88 });
        this.mesh = new THREE.Mesh(geometry, material);
        break;
      }

      case EnemySubType.GUARDIAN: {
        // Boss with orbiting shields (icosahedron, dark red)
        const geometry = new THREE.IcosahedronGeometry(1.5);
        const material = new THREE.MeshLambertMaterial({ color: 0x880000 });
        this.mesh = new THREE.Mesh(geometry, material);
        break;
      }

      default: {
        const geometry = new THREE.SphereGeometry(0.5);
        const material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        this.mesh = new THREE.Mesh(geometry, material);
      }
    }

    this.mesh.scale.set(5, 5, 5);
    this.mesh.castShadow = true;
    this.scene.add(this.mesh);
    this.mesh.position.copy(this.position);

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

    // Orbs only fire when open
    if (this.enemyType === EnemySubType.ORB) {
      const behavior = this.movementBehavior;
      const isOpen = (behavior && 'isOpen' in behavior) ? (behavior as any).isOpen : false;
      if (!isOpen) {
        this.fireCooldownTimer = 0;
      }
    }

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
        // Bank into turns
        if (this.mesh && this.velocity.length() > 0.1) {
          this.mesh.rotation.z = -this.velocity.x * 0.03;
          this.mesh.rotation.x = this.velocity.y * 0.02;
        }
        break;

      case EnemySubType.MECH: {
        if (!this.mesh) break;
        const leftLeg = this.mesh.getObjectByName('leftLeg');
        const rightLeg = this.mesh.getObjectByName('rightLeg');
        if (leftLeg && rightLeg) {
          const walkCycle = Math.sin(this.elapsedTime * 6.0) * 0.4;
          leftLeg.rotation.x = walkCycle;
          rightLeg.rotation.x = -walkCycle;
        }
        const torso = this.mesh.getObjectByName('torso');
        if (torso) {
          torso.position.y = 1.2 + Math.abs(Math.sin(this.elapsedTime * 6.0)) * 0.1;
        }
        break;
      }

      case EnemySubType.ORB: {
        if (!this.mesh) break;
        const behavior = this.movementBehavior;
        const isOpen = (behavior && 'isOpen' in behavior) ? (behavior as any).isOpen : false;
        const topHalf = this.mesh.getObjectByName('topHalf');
        const bottomHalf = this.mesh.getObjectByName('bottomHalf');
        const core = this.mesh.getObjectByName('core');

        const targetSep = isOpen ? 0.5 : 0;
        if (topHalf) {
          topHalf.position.y += (targetSep - topHalf.position.y) * 0.1;
        }
        if (bottomHalf) {
          bottomHalf.position.y += (-targetSep - bottomHalf.position.y) * 0.1;
        }
        if (core) {
          core.visible = isOpen;
          core.rotation.y += 0.05;
          core.rotation.x += 0.03;
        }
        break;
      }

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

  protected override handleDamage(damage: number): void {
    // Orbs are invulnerable when closed
    if (this.enemyType === EnemySubType.ORB) {
      const behavior = this.movementBehavior;
      const isOpen = (behavior && 'isOpen' in behavior) ? (behavior as any).isOpen : false;
      if (!isOpen) {
        this.health = Math.min(this.maxHealth, this.health + damage);
        return;
      }
    }

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
