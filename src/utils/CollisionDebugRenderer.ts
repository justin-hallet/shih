/**
 * CollisionDebugRenderer - Renders debug circles around entities to visualize collision bounds
 */

import * as THREE from 'three';
import { EntityType } from '../core/types';

export interface CollisionDebugConfig {
  enabled: boolean;
  showPlayer: boolean;
  showObstacles: boolean;
  showEnemies: boolean;
  showPowerUps: boolean;
  showProjectiles: boolean;
}

export interface DebugCircle {
  entityId: string;
  position: THREE.Vector3;
  radius: number;
  color: THREE.Color;
  isColliding: boolean;
}

export class CollisionDebugRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera | null = null;
  private circles: Map<string, THREE.Mesh> = new Map();
  private config: CollisionDebugConfig;
  private collidingEntities: Set<string> = new Set();

  // Entity type colors
  private readonly entityColors = {
    [EntityType.PLAYER]: new THREE.Color(0xffffff), // White
    [EntityType.OBSTACLE]: new THREE.Color(0x0066ff), // Blue
    [EntityType.POWERUP]: new THREE.Color(0x00ff00), // Green
    [EntityType.ENEMY]: new THREE.Color(0xff00ff), // Pink/Magenta
    [EntityType.PROJECTILE]: new THREE.Color(0xffff00), // Yellow
  };

  private readonly collisionColor = new THREE.Color(0xff0000); // Red for collisions

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.config = {
      enabled: false,
      showPlayer: true,
      showObstacles: true,
      showEnemies: true,
      showPowerUps: true,
      showProjectiles: true,
    };
  }

  public setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    if (!enabled) {
      this.clearAllCircles();
    }
  }

  public isEnabled(): boolean {
    return this.config.enabled;
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public setEntityTypeVisible(entityType: EntityType, visible: boolean): void {
    switch (entityType) {
      case EntityType.PLAYER:
        this.config.showPlayer = visible;
        break;
      case EntityType.OBSTACLE:
        this.config.showObstacles = visible;
        break;
      case EntityType.ENEMY:
        this.config.showEnemies = visible;
        break;
      case EntityType.POWERUP:
        this.config.showPowerUps = visible;
        break;
      case EntityType.PROJECTILE:
        this.config.showProjectiles = visible;
        break;
    }
  }

  public updateEntity(
    entityId: string,
    entityType: EntityType,
    position: THREE.Vector3,
    radius: number,
  ): void {
    if (!this.config.enabled) return;
    if (!this.shouldShowEntityType(entityType)) return;

    const isColliding = this.collidingEntities.has(entityId);
    const color = isColliding ? this.collisionColor : this.entityColors[entityType];

    let circle = this.circles.get(entityId);

    if (!circle) {
      circle = this.createCircle(radius, color);
      this.circles.set(entityId, circle);
      this.scene.add(circle);
    } else {
      // Update existing circle
      this.updateCircle(circle, radius, color);
    }

    // Update position
    circle.position.copy(position);
    circle.position.y += 0.1; // Slightly above ground to avoid z-fighting

    // Orient circle to face camera (billboard effect)
    if (this.camera) {
      circle.lookAt(this.camera.position);
    }
  }

  public removeEntity(entityId: string): void {
    const circle = this.circles.get(entityId);
    if (circle) {
      this.scene.remove(circle);
      circle.geometry.dispose();
      if (Array.isArray(circle.material)) {
        circle.material.forEach(mat => mat.dispose());
      } else {
        circle.material.dispose();
      }
      this.circles.delete(entityId);
    }
    this.collidingEntities.delete(entityId);
  }

  public setEntityColliding(entityId: string, isColliding: boolean): void {
    if (isColliding) {
      this.collidingEntities.add(entityId);
    } else {
      this.collidingEntities.delete(entityId);
    }
  }

  public clearCollisions(): void {
    this.collidingEntities.clear();
  }

  private shouldShowEntityType(entityType: EntityType): boolean {
    switch (entityType) {
      case EntityType.PLAYER:
        return this.config.showPlayer;
      case EntityType.OBSTACLE:
        return this.config.showObstacles;
      case EntityType.ENEMY:
        return this.config.showEnemies;
      case EntityType.POWERUP:
        return this.config.showPowerUps;
      case EntityType.PROJECTILE:
        return this.config.showProjectiles;
      default:
        return false;
    }
  }

  private createCircle(radius: number, color: THREE.Color): THREE.Mesh {
    // Make thicker ring: inner radius at 0.8 instead of 0.9 for more thickness
    const geometry = new THREE.RingGeometry(radius * 0.8, radius, 32);
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.9, // Much brighter: 0.9 instead of 0.6
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const circle = new THREE.Mesh(geometry, material);
    // Don't rotate - will be oriented toward camera via lookAt
    return circle;
  }

  private updateCircle(circle: THREE.Mesh, radius: number, color: THREE.Color): void {
    // Update geometry if radius changed
    const currentGeometry = circle.geometry as THREE.RingGeometry;
    if (currentGeometry.parameters.outerRadius !== radius) {
      currentGeometry.dispose();
      // Use same thicker geometry: inner radius at 0.8 for consistency
      circle.geometry = new THREE.RingGeometry(radius * 0.8, radius, 32);
    }

    // Update material color
    const material = circle.material as THREE.MeshBasicMaterial;
    material.color.copy(color);
  }

  private clearAllCircles(): void {
    for (const [, circle] of this.circles) {
      this.scene.remove(circle);
      circle.geometry.dispose();
      if (Array.isArray(circle.material)) {
        circle.material.forEach(mat => mat.dispose());
      } else {
        circle.material.dispose();
      }
    }
    this.circles.clear();
    this.collidingEntities.clear();
  }

  public dispose(): void {
    this.clearAllCircles();
  }
}
