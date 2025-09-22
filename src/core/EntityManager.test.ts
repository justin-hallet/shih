import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { EntityManager } from './EntityManager';
import { Player } from './entities/Player';
import { Obstacle } from './entities/Obstacle';
import { EntityType, ObstacleSubType, EntityState } from './types';

describe('EntityManager', () => {
  let scene: THREE.Scene;
  let entityManager: EntityManager;

  beforeEach(() => {
    scene = new THREE.Scene();
    entityManager = new EntityManager({ scene, maxEntities: 10 });
  });

  afterEach(() => {
    entityManager.clear();
  });

  it('should create with empty state', () => {
    expect(entityManager.getEntityCount()).toBe(0);
    expect(entityManager.getAllEntities()).toHaveLength(0);
    expect(entityManager.player).toBeNull();
  });

  it('should spawn player', () => {
    const player = entityManager.spawnPlayer({ x: 1, y: 2, z: 3 });
    
    expect(entityManager.getEntityCount()).toBe(1);
    expect(entityManager.player).toBe(player);
    expect(player.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(player.type).toBe(EntityType.PLAYER);
  });

  it('should spawn obstacle', () => {
    const obstacle = entityManager.spawnObstacle(
      ObstacleSubType.TREE,
      { x: 5, y: 0, z: -10 }
    );
    
    expect(entityManager.getEntityCount()).toBe(1);
    expect(obstacle.position).toEqual({ x: 5, y: 0, z: -10 });
    expect(obstacle.type).toBe(EntityType.OBSTACLE);
    expect(obstacle.obstacleType).toBe(ObstacleSubType.TREE);
  });

  it('should get entities by type', () => {
    entityManager.spawnPlayer();
    entityManager.spawnObstacle(ObstacleSubType.ROCK);
    entityManager.spawnObstacle(ObstacleSubType.TREE);
    
    const players = entityManager.getEntitiesByType(EntityType.PLAYER);
    const obstacles = entityManager.getEntitiesByType(EntityType.OBSTACLE);
    
    expect(players).toHaveLength(1);
    expect(obstacles).toHaveLength(2);
  });

  it('should remove entity', () => {
    const player = entityManager.spawnPlayer();
    expect(entityManager.getEntityCount()).toBe(1);
    
    const removed = entityManager.remove(player.id);
    expect(removed).toBe(true);
    expect(entityManager.getEntityCount()).toBe(0);
    expect(entityManager.player).toBeNull();
  });

  it('should update all entities', () => {
    const player = entityManager.spawnPlayer();
    const obstacle = entityManager.spawnObstacle(ObstacleSubType.TREE);
    
    // Mock update methods
    const playerUpdateSpy = vi.spyOn(player, 'update');
    const obstacleUpdateSpy = vi.spyOn(obstacle, 'update');
    
    entityManager.update(0.016);
    
    expect(playerUpdateSpy).toHaveBeenCalledWith(0.016);
    expect(obstacleUpdateSpy).toHaveBeenCalledWith(0.016);
  });

  it('should remove dead entities during update', () => {
    const player = entityManager.spawnPlayer();
    
    // Kill the player
    player.die();
    player.state = EntityState.DEAD;
    
    expect(entityManager.getEntityCount()).toBe(1);
    
    entityManager.update(0.016);
    
    expect(entityManager.getEntityCount()).toBe(0);
  });

  it('should respect max entities limit', () => {
    // Fill up to max
    for (let i = 0; i < 10; i++) {
      entityManager.spawnObstacle(ObstacleSubType.ROCK);
    }
    
    expect(entityManager.getEntityCount()).toBe(10);
    
    // Try to spawn one more
    const result = entityManager.spawnObstacle(ObstacleSubType.TREE);
    expect(entityManager.getEntityCount()).toBe(10);
    // The last obstacle should still be created but not added to manager
  });

  it('should find nearest entity', () => {
    const player = entityManager.spawnPlayer({ x: 0, y: 0, z: 0 });
    const obstacle1 = entityManager.spawnObstacle(ObstacleSubType.ROCK, { x: 5, y: 0, z: 0 });
    const obstacle2 = entityManager.spawnObstacle(ObstacleSubType.TREE, { x: 2, y: 0, z: 0 });
    
    const nearest = entityManager.findNearestEntity(
      { x: 0, y: 0, z: 0 },
      EntityType.OBSTACLE
    );
    
    expect(nearest).toBe(obstacle2); // Tree is closer (distance 2 vs 5)
  });

  it('should get entities in radius', () => {
    const player = entityManager.spawnPlayer({ x: 0, y: 0, z: 0 });
    entityManager.spawnObstacle(ObstacleSubType.ROCK, { x: 2, y: 0, z: 0 }); // Distance 2
    entityManager.spawnObstacle(ObstacleSubType.TREE, { x: 5, y: 0, z: 0 }); // Distance 5
    entityManager.spawnObstacle(ObstacleSubType.PILLAR, { x: 1, y: 1, z: 0 }); // Distance ~1.4
    
    const entitiesInRadius = entityManager.getEntitiesInRadius(
      { x: 0, y: 0, z: 0 },
      3,
      EntityType.OBSTACLE
    );
    
    expect(entitiesInRadius).toHaveLength(2); // Rock and Pillar are within radius 3
  });

  it('should clear all entities', () => {
    entityManager.spawnPlayer();
    entityManager.spawnObstacle(ObstacleSubType.ROCK);
    entityManager.spawnObstacle(ObstacleSubType.TREE);
    
    expect(entityManager.getEntityCount()).toBe(3);
    
    entityManager.clear();
    
    expect(entityManager.getEntityCount()).toBe(0);
    expect(entityManager.getAllEntities()).toHaveLength(0);
    expect(entityManager.player).toBeNull();
  });
});
