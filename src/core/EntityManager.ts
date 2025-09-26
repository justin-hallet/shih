/**
 * EntityManager - Handles spawning, updating, and removing all game entities
 */

import * as THREE from 'three';
import { IEntity } from './Entity';
import { EntityType, EntityState, EnemySubType, ProjectileSubType, PowerUpSubType } from './types';
import { Player } from './entities/Player';
import { Obstacle } from './entities/Obstacle';
import { Enemy } from './entities/Enemy';
import { Projectile } from './entities/Projectile';
import { PowerUp } from './entities/PowerUp';

export interface EntityManagerOptions {
  scene: THREE.Scene;
  maxEntities?: number;
}

export class EntityManager {
  private entities: Map<string, IEntity>;
  private entitiesByType: Map<EntityType, Set<IEntity>>;
  private scene: THREE.Scene;
  private maxEntities: number;
  private entityCount: number;

  // Player reference for easy access
  public player: Player | null = null;

  constructor(options: EntityManagerOptions) {
    this.entities = new Map();
    this.entitiesByType = new Map();
    this.scene = options.scene;
    this.maxEntities = options.maxEntities || 1000;
    this.entityCount = 0;

    // Initialize entity type collections
    for (const type of Object.values(EntityType)) {
      this.entitiesByType.set(type, new Set());
    }
  }

  // Spawn entity
  public spawn(entity: IEntity): boolean {
    if (this.entityCount >= this.maxEntities) {
      console.warn('EntityManager: Maximum entities reached, cannot spawn more');
      return false;
    }

    // Add to collections
    this.entities.set(entity.id, entity);
    const typeSet = this.entitiesByType.get(entity.type);
    if (typeSet) {
      typeSet.add(entity);
    }

    // Store player reference
    if (entity.type === EntityType.PLAYER && entity instanceof Player) {
      this.player = entity;
    }

    this.entityCount++;
    return true;
  }

  // Remove entity
  public remove(entityId: string): boolean {
    const entity = this.entities.get(entityId);
    if (!entity) return false;

    // Remove from collections
    this.entities.delete(entityId);
    const typeSet = this.entitiesByType.get(entity.type);
    if (typeSet) {
      typeSet.delete(entity);
    }

    // Clear player reference if removing player
    if (entity.type === EntityType.PLAYER) {
      this.player = null;
    }

    // Remove collision debug circle
    const collisionDebugRenderer = (this.scene as any)?.userData?.collisionDebugRenderer;
    if (collisionDebugRenderer) {
      collisionDebugRenderer.removeEntity(entityId);
    }

    // Destroy entity
    entity.destroy();
    this.entityCount--;

    return true;
  }

  // Update all entities
  public update(deltaTime: number): void {
    const deadEntities: string[] = [];

    // Update all entities
    for (const entity of Array.from(this.entities.values())) {
      entity.update(deltaTime);

      // Update collision debug circles
      this.updateCollisionDebug(entity);

      // Mark dead entities for removal
      if (entity.state === EntityState.DEAD) {
        deadEntities.push(entity.id);
      }
    }

    // Remove dead entities
    for (const entityId of deadEntities) {
      this.remove(entityId);
    }

    // Clear collision highlights before checking new collisions
    this.clearCollisionHighlights();

    // Check collisions
    this.checkCollisions();
  }

  // Collision detection between all entities
  private checkCollisions(): void {
    const allEntities = Array.from(this.entities.values());

    for (let i = 0; i < allEntities.length; i++) {
      for (let j = i + 1; j < allEntities.length; j++) {
        const entityA = allEntities[i];
        const entityB = allEntities[j];

        if (this.shouldCheckCollision(entityA, entityB)) {
          if (entityA.checkCollision(entityB)) {
            // Highlight collision in debug renderer
            this.highlightCollision(entityA, entityB);

            entityA.onCollision(entityB);
            entityB.onCollision(entityA);
          }
        }
      }
    }
  }

  // Determine if two entities should check for collision
  private shouldCheckCollision(entityA: IEntity, entityB: IEntity): boolean {
    // Skip if either entity is inactive or dead
    if (
      entityA.state === EntityState.INACTIVE ||
      entityA.state === EntityState.DEAD ||
      entityB.state === EntityState.INACTIVE ||
      entityB.state === EntityState.DEAD
    ) {
      return false;
    }

    // Skip same type collisions (except projectiles)
    if (entityA.type === entityB.type && entityA.type !== EntityType.PROJECTILE) {
      return false;
    }

    return true;
  }

  // Get entity by ID
  public getEntity(id: string): IEntity | undefined {
    return this.entities.get(id);
  }

  // Get entities by type
  public getEntitiesByType(type: EntityType): IEntity[] {
    const typeSet = this.entitiesByType.get(type);
    return typeSet ? Array.from(typeSet) : [];
  }

  // Get all entities
  public getAllEntities(): IEntity[] {
    return Array.from(this.entities.values());
  }

  // Get entity count
  public getEntityCount(): number {
    return this.entityCount;
  }

  // Get entity count by type
  public getEntityCountByType(type: EntityType): number {
    const typeSet = this.entitiesByType.get(type);
    return typeSet ? typeSet.size : 0;
  }

  // Clear all entities
  public clear(): void {
    // Destroy all entities
    for (const entity of this.entities.values()) {
      entity.destroy();
    }

    // Clear collections
    this.entities.clear();
    for (const typeSet of this.entitiesByType.values()) {
      typeSet.clear();
    }

    this.player = null;
    this.entityCount = 0;
  }

  /**
   * Reset entity manager by removing all entities except specified ones
   */
  public reset(preserveEntities: IEntity[] = []): void {
    const preserveIds = new Set(preserveEntities.map(e => e.id));

    // Remove all entities except preserved ones
    const allEntities = Array.from(this.entities.values());
    for (const entity of allEntities) {
      if (!preserveIds.has(entity.id)) {
        this.remove(entity.id);
      }
    }
  }

  // Find nearest entity of type to position
  public findNearestEntity(
    position: { x: number; y: number; z: number },
    type: EntityType,
    maxDistance?: number,
  ): IEntity | null {
    const entities = this.getEntitiesByType(type);
    let nearest: IEntity | null = null;
    let nearestDistance = maxDistance || Infinity;

    for (const entity of entities) {
      const dx = entity.position.x - position.x;
      const dy = entity.position.y - position.y;
      const dz = entity.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < nearestDistance) {
        nearest = entity;
        nearestDistance = distance;
      }
    }

    return nearest;
  }

  // Get entities within radius
  public getEntitiesInRadius(
    position: { x: number; y: number; z: number },
    radius: number,
    type?: EntityType,
  ): IEntity[] {
    const entities = type ? this.getEntitiesByType(type) : this.getAllEntities();
    const result: IEntity[] = [];

    for (const entity of entities) {
      const dx = entity.position.x - position.x;
      const dy = entity.position.y - position.y;
      const dz = entity.position.z - position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance <= radius) {
        result.push(entity);
      }
    }

    return result;
  }

  // Spawn convenience methods
  public spawnPlayer(position?: { x: number; y: number; z: number }): Player {
    const player = new Player(position, this.scene);
    this.spawn(player);
    return player;
  }

  public spawnObstacle(
    obstacleType: string,
    position?: { x: number; y: number; z: number },
  ): Obstacle {
    const obstacle = new Obstacle(obstacleType as any, position, this.scene);
    this.spawn(obstacle);
    return obstacle;
  }

  public spawnEnemy(
    enemyType: EnemySubType,
    position?: { x: number; y: number; z: number },
  ): Enemy {
    const enemy = new Enemy(enemyType, position, this.scene);
    this.spawn(enemy);
    return enemy;
  }

  public spawnProjectile(
    projectileType: ProjectileSubType,
    owner: 'player' | 'enemy',
    position?: { x: number; y: number; z: number },
    direction?: THREE.Vector3 | { x: number; y: number; z: number },
  ): Projectile {
    const projectile = new Projectile(projectileType, owner, position, direction, this.scene);
    this.spawn(projectile);
    return projectile;
  }

  public spawnPowerUp(
    powerUpType: PowerUpSubType,
    position?: { x: number; y: number; z: number },
  ): PowerUp {
    const powerUp = new PowerUp(powerUpType, position, this.scene);
    this.spawn(powerUp);
    return powerUp;
  }

  // Collision debug methods
  private updateCollisionDebug(entity: IEntity): void {
    const collisionDebugRenderer = (this.scene as any)?.userData?.collisionDebugRenderer;
    if (!collisionDebugRenderer) return;

    const radius = entity.collisionBounds?.radius || 1.0;
    const position = new THREE.Vector3(entity.position.x, entity.position.y, entity.position.z);

    // Apply model center offset if the entity has one
    if (entity.modelCenterOffset) {
      position.add(entity.modelCenterOffset);
    }

    collisionDebugRenderer.updateEntity(entity.id, entity.type, position, radius);
  }

  private clearCollisionHighlights(): void {
    const collisionDebugRenderer = (this.scene as any)?.userData?.collisionDebugRenderer;
    if (collisionDebugRenderer) {
      collisionDebugRenderer.clearCollisions();
    }
  }

  private highlightCollision(entity1: IEntity, entity2: IEntity): void {
    const collisionDebugRenderer = (this.scene as any)?.userData?.collisionDebugRenderer;
    if (collisionDebugRenderer) {
      collisionDebugRenderer.setEntityColliding(entity1.id, true);
      collisionDebugRenderer.setEntityColliding(entity2.id, true);
    }
  }
}
