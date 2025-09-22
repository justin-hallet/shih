/**
 * Obstacle Entity - Trees, rocks, pillars, vehicles, etc.
 */

import * as THREE from 'three';
import { BaseEntity } from '../Entity';
import { EntityType, ObstacleSubType, AnimationType, EntityState } from '../types';

export class Obstacle extends BaseEntity {
  public readonly obstacleType: ObstacleSubType;
  public destructible: boolean;
  public rotationSpeed: number;

  constructor(obstacleType: ObstacleSubType, position = { x: 0, y: 0, z: 0 }, scene?: THREE.Scene) {
    super(EntityType.OBSTACLE, obstacleType, position, scene);

    this.obstacleType = obstacleType;
    this.destructible = this.getDestructibleByType(obstacleType);
    this.rotationSpeed = 0;

    // Set properties based on obstacle type
    this.initializeByType();
    this.createMesh();

    // Obstacles are immediately active
    this.state = EntityState.ACTIVE;
  }

  private getDestructibleByType(type: ObstacleSubType): boolean {
    switch (type) {
      case ObstacleSubType.TREE:
      case ObstacleSubType.VEHICLE:
        return true;
      case ObstacleSubType.ROCK:
      case ObstacleSubType.PILLAR:
      case ObstacleSubType.BUILDING:
        return false;
      case ObstacleSubType.CRYSTAL:
        return true;
      default:
        return false;
    }
  }

  private initializeByType(): void {
    switch (this.obstacleType) {
      case ObstacleSubType.TREE:
        this.health = 50;
        this.maxHealth = 50;
        this.weight = 2.0;
        this.collisionBounds = { radius: 1.2 };
        this.animationType = AnimationType.FLOATING;
        break;

      case ObstacleSubType.ROCK:
        this.health = 1000; // Indestructible
        this.maxHealth = 1000;
        this.weight = 10.0;
        this.collisionBounds = { radius: 2.0 };
        this.animationType = AnimationType.IDLE;
        break;

      case ObstacleSubType.PILLAR:
        this.health = 1000; // Indestructible
        this.maxHealth = 1000;
        this.weight = 20.0;
        this.collisionBounds = {
          radius: 1.0,
          box: { width: 2.0, height: 8.0, depth: 2.0 },
        };
        this.animationType = AnimationType.IDLE;
        break;

      case ObstacleSubType.VEHICLE:
        this.health = 100;
        this.maxHealth = 100;
        this.weight = 5.0;
        this.collisionBounds = { radius: 1.5 };
        this.animationType = AnimationType.MOVING;
        this.velocity.z = -2.0; // Moving toward player
        break;

      case ObstacleSubType.BUILDING:
        this.health = 1000; // Indestructible
        this.maxHealth = 1000;
        this.weight = 50.0;
        this.collisionBounds = {
          radius: 3.0,
          box: { width: 6.0, height: 12.0, depth: 6.0 },
        };
        this.animationType = AnimationType.IDLE;
        break;

      case ObstacleSubType.CRYSTAL:
        this.health = 25;
        this.maxHealth = 25;
        this.weight = 0.5;
        this.collisionBounds = { radius: 0.8 };
        this.animationType = AnimationType.SPINNING;
        this.rotationSpeed = 2.0;
        break;
    }
  }

  private createMesh(): void {
    if (!this.scene) return;

    let geometry: THREE.BufferGeometry;
    let material: THREE.Material;

    switch (this.obstacleType) {
      case ObstacleSubType.TREE:
        // Simple tree representation
        geometry = new THREE.CylinderGeometry(0.2, 0.3, 3, 8);
        material = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
        break;

      case ObstacleSubType.ROCK:
        // Rock representation
        geometry = new THREE.DodecahedronGeometry(1.5);
        material = new THREE.MeshLambertMaterial({ color: 0x808080 });
        break;

      case ObstacleSubType.PILLAR:
        // Pillar representation
        geometry = new THREE.CylinderGeometry(1, 1, 8, 8);
        material = new THREE.MeshLambertMaterial({ color: 0xc0c0c0 });
        break;

      case ObstacleSubType.VEHICLE:
        // Vehicle representation
        geometry = new THREE.BoxGeometry(2, 1, 3);
        material = new THREE.MeshLambertMaterial({ color: 0xff0000 });
        break;

      case ObstacleSubType.BUILDING:
        // Building representation
        geometry = new THREE.BoxGeometry(6, 12, 6);
        material = new THREE.MeshLambertMaterial({ color: 0x404040 });
        break;

      case ObstacleSubType.CRYSTAL:
        // Crystal representation
        geometry = new THREE.OctahedronGeometry(1);
        material = new THREE.MeshLambertMaterial({
          color: 0x00ffff,
          transparent: true,
          opacity: 0.8,
        });
        break;

      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshLambertMaterial({ color: 0x808080 });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.scene.add(this.mesh);
  }

  protected onUpdate(deltaTime: number): void {
    // Handle spinning animation
    if (this.animationType === AnimationType.SPINNING && this.mesh) {
      this.mesh.rotation.y += this.rotationSpeed * deltaTime;
    }

    // Handle floating animation (for trees, crystals)
    if (this.animationType === AnimationType.FLOATING && this.mesh) {
      const time = Date.now() * 0.001;
      this.mesh.position.y += Math.sin(time * 2) * 0.1 * deltaTime;
    }
  }

  protected override onTakeDamage(_damage: number): void {
    if (!this.destructible) return;

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
      }, 100);
    }
  }

  protected override onDie(): void {
    this.animationType = AnimationType.EXPLODING;
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  protected override onDestroy(): void {
    // Obstacle cleanup - could spawn particles, sound effects, etc.
  }
}
