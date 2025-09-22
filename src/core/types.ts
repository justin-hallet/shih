/**
 * Core type definitions for Space Harrier game
 */

// Entity Types
export enum EntityType {
  PLAYER = 'player',
  ENEMY = 'enemy',
  OBSTACLE = 'obstacle',
  PROJECTILE = 'projectile',
  POWERUP = 'powerup',
}

// Obstacle Subtypes
export enum ObstacleSubType {
  TREE = 'tree',
  ROCK = 'rock',
  PILLAR = 'pillar',
  VEHICLE = 'vehicle',
  BUILDING = 'building',
  CRYSTAL = 'crystal',
}

// Enemy Subtypes
export enum EnemySubType {
  GRUNT = 'grunt',
  SOLDIER = 'soldier',
  FLYER = 'flyer',
  TANK = 'tank',
  BOSS = 'boss',
  DRAGON = 'dragon',
}

// Projectile Subtypes
export enum ProjectileSubType {
  BULLET = 'bullet',
  MISSILE = 'missile',
  LASER = 'laser',
  PLASMA = 'plasma',
  FIREBALL = 'fireball',
}

// PowerUp Subtypes
export enum PowerUpSubType {
  AMMO = 'ammo',
  SHIELD = 'shield',
  LIFE = 'life',
  SPEED = 'speed',
  WEAPON_UPGRADE = 'weapon_upgrade',
}

// Animation Types
export enum AnimationType {
  IDLE = 'idle',
  MOVING = 'moving',
  ATTACKING = 'attacking',
  DYING = 'dying',
  EXPLODING = 'exploding',
  SPINNING = 'spinning',
  FLOATING = 'floating',
}

import * as THREE from 'three';

// Game Vector3 - use THREE.Vector3 for proper Three.js integration with all Vector3 methods
export type GameVector3 = THREE.Vector3;

// Entity State
export enum EntityState {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DYING = 'dying',
  DEAD = 'dead',
  SPAWNING = 'spawning',
}

// Collision Bounds
export interface CollisionBounds {
  radius: number; // For sphere collision
  box?: {
    width: number;
    height: number;
    depth: number;
  };
}
