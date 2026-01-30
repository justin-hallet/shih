/**
 * Obstacle Entity - Trees, rocks, pillars, vehicles, etc.
 */

import * as THREE from 'three';
import { BaseEntity, IEntity } from '../Entity';
import { EntityType, ObstacleSubType, AnimationType, EntityState } from '../types';

export class Obstacle extends BaseEntity {
  public readonly obstacleType: ObstacleSubType;

  constructor(
    obstacleType: ObstacleSubType,
    position: THREE.Vector3 | { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 },
    scene?: THREE.Scene,
  ) {
    const pos =
      position instanceof THREE.Vector3
        ? position
        : new THREE.Vector3(position.x, position.y, position.z);
    super(EntityType.OBSTACLE, obstacleType, pos, scene);

    this.obstacleType = obstacleType;

    // Set properties based on obstacle type
    this.initializeByType();
    this.createMesh();

    // Obstacles are immediately active
    this.state = EntityState.ACTIVE;
  }

  private initializeByType(): void {
    switch (this.obstacleType) {
      case ObstacleSubType.TREE:
        this.health = 50;
        this.maxHealth = 50;
        this.animationType = AnimationType.FLOATING;
        break;

      case ObstacleSubType.ROCK:
      case ObstacleSubType.PILLAR:
      case ObstacleSubType.BUILDING:
        this.health = 1000; // Indestructible
        this.maxHealth = 1000;
        this.animationType = AnimationType.IDLE;
        break;

      case ObstacleSubType.VEHICLE:
        this.health = 100;
        this.maxHealth = 100;
        this.animationType = AnimationType.MOVING;
        this.velocity.z = -2.0; // Moving toward player
        break;

      case ObstacleSubType.CRYSTAL:
        this.health = 25;
        this.maxHealth = 25;
        this.animationType = AnimationType.SPINNING;
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
        material = new THREE.MeshLambertMaterial({
          color: 0x00cc66, // bright green
          emissive: new THREE.Color(0x008844),
          emissiveIntensity: 0.4,
        });
        break;

      case ObstacleSubType.ROCK:
        // Rock representation
        geometry = new THREE.DodecahedronGeometry(1.5);
        material = new THREE.MeshLambertMaterial({
          color: 0x3399ff, // bright blue
          emissive: new THREE.Color(0x1a4d80),
          emissiveIntensity: 0.45,
        });
        break;

      case ObstacleSubType.PILLAR:
        // Pillar representation
        geometry = new THREE.CylinderGeometry(1, 1, 8, 8);
        material = new THREE.MeshLambertMaterial({
          color: 0xaa66ff, // bright purple
          emissive: new THREE.Color(0x6b2fbf),
          emissiveIntensity: 0.45,
        });
        break;

      case ObstacleSubType.VEHICLE:
        // Vehicle representation
        geometry = new THREE.BoxGeometry(2, 1, 3);
        material = new THREE.MeshLambertMaterial({
          color: 0xff5533, // brighter red-orange
          emissive: new THREE.Color(0xaa2200),
          emissiveIntensity: 0.45,
        });
        break;

      case ObstacleSubType.BUILDING:
        // Building representation
        geometry = new THREE.BoxGeometry(6, 12, 6);
        material = new THREE.MeshLambertMaterial({
          color: 0x00e5ff, // bright cyan
          emissive: new THREE.Color(0x0088aa),
          emissiveIntensity: 0.5,
        });
        break;

      case ObstacleSubType.CRYSTAL:
        // Crystal representation
        geometry = new THREE.OctahedronGeometry(1);
        material = new THREE.MeshLambertMaterial({
          color: 0xff66ff, // hot pink
          emissive: new THREE.Color(0xff99ff),
          emissiveIntensity: 1.0,
          transparent: true,
          opacity: 0.85,
        });
        break;

      default:
        geometry = new THREE.BoxGeometry(1, 1, 1);
        material = new THREE.MeshLambertMaterial({
          color: 0xffaa00, // bright orange
          emissive: new THREE.Color(0xcc6600),
          emissiveIntensity: 0.45,
        });
    }

    this.mesh = new THREE.Mesh(geometry, material);
    // Make obstacles twice as big (uniform scale)
    this.mesh.scale.multiplyScalar(2);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.scene.add(this.mesh);

    // Calculate collision bounds from the actual scaled mesh
    this.updateCollisionBoundsFromMesh();
  }

  protected onUpdate(deltaTime: number): void {
    // Handle spinning animation
    if (this.animationType === AnimationType.SPINNING && this.mesh) {
      this.mesh.rotation.y += 2.0 * deltaTime; // Fixed rotation speed for crystals
    }

    // Handle floating animation (for trees, crystals)
    if (this.animationType === AnimationType.FLOATING && this.mesh) {
      const time = Date.now() * 0.001;
      this.mesh.position.y += Math.sin(time * 2) * 0.1 * deltaTime;
    }

    const terrainY = this.scene?.userData?.['worldGenerator']?.getTerrainHeightAt?.(
      this.position.x,
      this.position.z,
    ) || 0;
    if (terrainY > 0 && this.collisionBounds?.radius) {
      this.position.y = terrainY - this.collisionBounds.radius;
    }
  }

  protected override onDie(): void {
    this.animationType = AnimationType.EXPLODING;
    this.velocity.set(0, 0, 0);

    // Immediately mark as DEAD so EntityManager removes the obstacle
    this.state = EntityState.DEAD;
  }

  protected override onCollisionResponse(_other: IEntity): void {
    // Obstacles don't need to respond to collisions - they just exist as barriers
  }
}
