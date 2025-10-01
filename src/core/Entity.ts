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
  onDamage(damage: number): void;
  onCollisionCheck(other: IEntity): boolean;
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

  public onCollisionCheck(other: IEntity): boolean {
    const thisRadius = this.collisionBounds?.radius || 1.0;
    const otherRadius = other.collisionBounds?.radius || 1.0;
    const combinedRadius = thisRadius + otherRadius;

    return this.position.distanceTo(other.position) < combinedRadius;
  }

  public onCollision(other: IEntity): void {
    if (this.onCollisionCheck(other)) {
      this.onCollisionResponse(other);
    }
  }

  public onDamage(damage: number): void {
    if (this.state === EntityState.DYING || this.state === EntityState.DEAD) return;

    this.health -= damage;

    if (this.health <= 0) {
      this.health = 0;
      this.onDeath();
    }

    this.handleDamage(damage);
  }

  public onDeath(): void {
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

  protected updateCollisionBoundsFromMesh(scale: number = 1.0): void {
    if (!this.mesh) return;

    const box = new THREE.Box3().setFromObject(this.mesh);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const radius = Math.max(size.x, Math.max(size.y, size.z)) * 0.5;
    const finalRadius = Math.max(radius, 0.3) * 1.1;

    this.collisionBounds = { radius: finalRadius * scale };
    this.modelCenterOffset = center.clone().sub(this.mesh.position);
  }

  protected abstract onUpdate(deltaTime: number): void;
  protected abstract onCollisionResponse(other: IEntity): void;
  protected handleDamage(_damage: number): void {}
  protected onDie(): void {}

  public static setAudioManager(audioManager: any): void {
    BaseEntity.audioManager = audioManager;
  }

  protected getAudioManager(): any {
    return BaseEntity.audioManager;
  }

  protected hasOutlineEffect: boolean = false;

  protected applyEmissiveMaterial(emissiveColor: THREE.Color): void {
    // Brighten the original materials while preserving textures
    this.mesh?.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // Store original material if needed
        if (!this.originalMaterial && child.material) {
          this.originalMaterial = child.material;
        }

        // Brighten the original material while preserving textures
        const originalMaterial = child.material;
        const brightenedMaterial = originalMaterial.clone();

        // Increase the overall brightness without washing out textures
        if (brightenedMaterial.color) {
          brightenedMaterial.color.multiplyScalar(1.5); // Make colors 50% brighter
        }

        // Add a subtle emissive tint that matches the outline color
        brightenedMaterial.emissive = emissiveColor.clone().multiplyScalar(0.1);
        brightenedMaterial.emissiveIntensity = 0.3;

        child.material = brightenedMaterial;
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });
  }

  protected createOutlineEffect(color: THREE.Color): void {
    if (!this.hasOutlineEffect && this.scene && this.mesh) {
      const outlinePass = this.scene.userData?.outlinePass;
      if (outlinePass) {
        outlinePass.addOutlineObject(this.mesh, color);
        this.hasOutlineEffect = true;
      }
    }
  }

  protected removeOutlineEffect(): void {
    if (this.hasOutlineEffect && this.scene && this.mesh) {
      const outlinePass = this.scene.userData?.outlinePass;
      if (outlinePass) {
        outlinePass.removeOutlineObject(this.mesh);
        this.hasOutlineEffect = false;
      }
    }
  }
}
