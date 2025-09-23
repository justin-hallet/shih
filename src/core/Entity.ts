/**
 * Base Entity System for Space Harrier
 * All game objects inherit from this base entity
 */

import * as THREE from 'three';
import { EntityType, AnimationType, EntityState, GameVector3, CollisionBounds } from './types';

// Base Entity Interface
export interface IEntity {
  readonly id: string;
  readonly type: EntityType;
  readonly subType: string;

  // Transform properties
  position: GameVector3;
  direction: GameVector3;
  velocity: GameVector3;

  // Animation properties
  animationType: AnimationType;
  animationFrame: number;
  animationSpeed: number;

  // State
  state: EntityState;
  health: number;
  maxHealth: number;

  // Collision
  collisionBounds: CollisionBounds;

  // 3D Object reference
  mesh?: THREE.Object3D;

  // Lifecycle methods
  update(deltaTime: number): void;
  destroy(): void;

  // Combat
  takeDamage(damage: number): void;

  // Collision
  checkCollision(other: IEntity): boolean;
  onCollision(other: IEntity): void;
}

// Base Entity Implementation
export abstract class BaseEntity implements IEntity {
  public readonly id: string;
  public readonly type: EntityType;
  public readonly subType: string;

  // Transform
  public position: GameVector3;
  public direction: GameVector3;
  public velocity: GameVector3;

  // Animation
  public animationType: AnimationType;
  public animationFrame: number;
  public animationSpeed: number;
  private animationTimer: number;

  // State
  public state: EntityState;
  public health: number;
  public maxHealth: number;

  // Collision
  public collisionBounds: CollisionBounds;

  // 3D Object
  public mesh?: THREE.Object3D;

  protected scene: THREE.Scene | undefined;

  constructor(
    type: EntityType,
    subType: string,
    position: GameVector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scene?: THREE.Scene,
  ) {
    this.id = this.generateId();
    this.type = type;
    this.subType = subType;
    this.scene = scene;

    // Initialize transform with proper THREE.Vector3 objects
    this.position =
      position instanceof THREE.Vector3
        ? position
        : new THREE.Vector3(position.x, position.y, position.z);
    this.direction = new THREE.Vector3(0, 0, -1); // Default forward
    this.velocity = new THREE.Vector3(0, 0, 0);

    // Initialize animation
    this.animationType = AnimationType.IDLE;
    this.animationFrame = 0;
    this.animationSpeed = 1.0;
    this.animationTimer = 0;

    // Initialize state
    this.state = EntityState.SPAWNING;
    this.health = 100;
    this.maxHealth = 100;

    // Initialize collision
    this.collisionBounds = { radius: 1.0 };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Update entity (called every frame)
  public update(deltaTime: number): void {
    if (this.state === EntityState.DEAD) return;

    // Update position based on velocity
    this.position.x += this.velocity.x * deltaTime;
    this.position.y += this.velocity.y * deltaTime;
    this.position.z += this.velocity.z * deltaTime;

    // Update animation
    this.updateAnimation(deltaTime);

    // Update 3D mesh position
    this.updateMesh();

    // Handle state transitions
    this.updateState();

    // Call subclass update
    this.onUpdate(deltaTime);
  }

  // Animation update
  private updateAnimation(deltaTime: number): void {
    this.animationTimer += deltaTime * this.animationSpeed;

    if (this.animationTimer >= 1.0) {
      this.animationFrame++;
      this.animationTimer = 0;

      // Handle animation cycling (subclasses can override)
      this.onAnimationFrame();
    }
  }

  // Update 3D mesh
  private updateMesh(): void {
    if (this.mesh) {
      this.mesh.position.set(this.position.x, this.position.y, this.position.z);

      // Update rotation based on direction
      const direction = new THREE.Vector3(this.direction.x, this.direction.y, this.direction.z);
      if (direction.length() > 0) {
        this.mesh.lookAt(this.mesh.position.clone().add(direction));
      }
    }
  }

  // State management
  private updateState(): void {
    switch (this.state) {
      case EntityState.SPAWNING:
        // Auto-activate after spawn
        this.state = EntityState.ACTIVE;
        break;
      case EntityState.DYING:
        // Auto-transition to dead after dying animation
        if (this.animationType === AnimationType.DYING && this.animationFrame > 10) {
          this.state = EntityState.DEAD;
        }
        break;
    }
  }

  // Collision detection (sphere-based)
  public checkCollision(other: IEntity): boolean {
    const dx = this.position.x - other.position.x;
    const dy = this.position.y - other.position.y;
    const dz = this.position.z - other.position.z;

    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const combinedRadius = this.collisionBounds.radius + other.collisionBounds.radius;

    return distance < combinedRadius;
  }

  // Take damage
  public takeDamage(damage: number): void {
    if (this.state === EntityState.DYING || this.state === EntityState.DEAD) return;

    this.health -= damage;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }

    this.onTakeDamage(damage);
  }

  // Die
  public die(): void {
    if (this.state === EntityState.DEAD) return;

    this.state = EntityState.DYING;
    this.animationType = AnimationType.DYING;
    this.animationFrame = 0;

    this.onDie();
  }

  // Destroy entity
  public destroy(): void {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);

      // Dispose geometry and materials
      if (this.mesh instanceof THREE.Mesh) {
        this.mesh.geometry?.dispose();
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material?.dispose();
        }
      }
    }

    this.onDestroy();
  }

  // Subclass hooks (to be overridden)
  protected abstract onUpdate(deltaTime: number): void;
  protected onAnimationFrame(): void {}
  public onCollision(_other: IEntity): void {} // Made public to match interface
  protected onTakeDamage(_damage: number): void {} // Use underscore for unused params
  protected onDie(): void {}
  protected onDestroy(): void {}
}
