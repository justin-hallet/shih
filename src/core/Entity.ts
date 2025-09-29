/**
 * Base Entity System for Space Harrier
 * All game objects inherit from this base entity
 */

import * as THREE from 'three';
import { EntityType, AnimationType, EntityState, CollisionBounds } from './types';

export interface IEntity {
  readonly id: string;
  readonly type: EntityType;
  readonly subType: string;

  position: THREE.Vector3;
  velocity: THREE.Vector3;

  animationType: AnimationType;
  animationFrame: number;

  state: EntityState;
  health: number;
  maxHealth: number;

  collisionBounds: CollisionBounds;
  mesh?: THREE.Object3D;
  modelCenterOffset?: THREE.Vector3;

  update(deltaTime: number): void;
  destroy(): void;
  takeDamage(damage: number): void;
  checkCollision(other: IEntity): boolean;
  onCollision(other: IEntity): void;
}

export abstract class BaseEntity implements IEntity {
  public readonly id: string;
  public readonly type: EntityType;
  public readonly subType: string;

  public position: THREE.Vector3;
  public velocity: THREE.Vector3;

  public animationType: AnimationType;
  public animationFrame: number;

  public state: EntityState;
  public health: number;
  public maxHealth: number;

  public collisionBounds: CollisionBounds;
  public mesh?: THREE.Object3D;
  public modelCenterOffset?: THREE.Vector3;

  protected scene: THREE.Scene | undefined;
  protected static audioManager?: any;

  constructor(
    type: EntityType,
    subType: string,
    position: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scene?: THREE.Scene,
  ) {
    this.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    this.type = type;
    this.subType = subType;
    this.scene = scene;

    this.position =
      position instanceof THREE.Vector3
        ? position.clone()
        : new THREE.Vector3(position.x, position.y, position.z);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.animationType = AnimationType.IDLE;
    this.animationFrame = 0;

    this.state = EntityState.ACTIVE;
    this.health = 100;
    this.maxHealth = 100;

    this.collisionBounds = { radius: 1.0 };
  }

  public update(deltaTime: number): void {
    if (this.state === EntityState.DEAD) return;

    // Update position based on velocity
    this.position.addScaledVector(this.velocity, deltaTime);

    if (this.mesh) {
      this.mesh.position.copy(this.position);

      // Update rotation based on velocity direction
      if (this.velocity.lengthSq() > 0.001) {
        const forward = this.velocity.clone().normalize();
        this.mesh.lookAt(this.mesh.position.clone().add(forward));
      }
    }

    // Handle death transition
    if (
      this.state === EntityState.DYING &&
      this.animationType === AnimationType.DYING &&
      this.animationFrame > 10
    ) {
      this.state = EntityState.DEAD;
    }

    this.onUpdate(deltaTime);
  }

  public checkCollision(other: IEntity): boolean {
    const thisRadius = this.collisionBounds?.radius || 1.0;
    const otherRadius = other.collisionBounds?.radius || 1.0;
    const combinedRadius = thisRadius + otherRadius;

    return this.position.distanceTo(other.position) < combinedRadius;
  }

  public takeDamage(damage: number): void {
    if (this.state === EntityState.DYING || this.state === EntityState.DEAD) return;

    this.health -= damage;

    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }

    this.onTakeDamage(damage);
  }

  public die(): void {
    if (this.state === EntityState.DEAD) return;

    this.state = EntityState.DYING;
    this.animationType = AnimationType.DYING;
    this.animationFrame = 0;

    this.onDie();
  }

  public destroy(): void {
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);

      if (this.mesh instanceof THREE.Mesh) {
        this.mesh.geometry?.dispose();
        if (Array.isArray(this.mesh.material)) {
          this.mesh.material.forEach(material => material.dispose());
        } else {
          this.mesh.material?.dispose();
        }
      }
    }
  }

  protected updateCollisionBoundsFromMesh(): void {
    if (!this.mesh) return;

    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.5;
    const finalRadius = Math.max(radius, 0.3) * 1.1;

    this.collisionBounds = { radius: finalRadius };
    this.modelCenterOffset = center.clone().sub(this.mesh.position);
  }

  protected abstract onUpdate(deltaTime: number): void;
  public onCollision(_other: IEntity): void {}
  protected onTakeDamage(_damage: number): void {}
  protected onDie(): void {}

  public static setAudioManager(audioManager: any): void {
    BaseEntity.audioManager = audioManager;
  }

  protected getAudioManager(): any {
    return BaseEntity.audioManager;
  }
}
