/**
 * Core game types and enums
 */

// Entity types
export enum EntityType {
  PLAYER = 'player',
  ENEMY = 'enemy',
  OBSTACLE = 'obstacle',
  POWERUP = 'powerup',
  PROJECTILE = 'projectile',
}

// Camera modes for different viewing perspectives
export enum CameraMode {
  FOLLOW = 'follow',
  ISOMETRIC = 'isometric',
  OVERHEAD = 'overhead',
}

// Entity state
export enum EntityState {
  IDLE = 'idle',
  ACTIVE = 'active',
  ATTACKING = 'attacking',
  DYING = 'dying',
  DEAD = 'dead',
}

// Animation types
export enum AnimationType {
  IDLE = 'idle',
  MOVING = 'moving',
  ATTACKING = 'attacking',
  EXPLODING = 'exploding',
  DYING = 'dying',
}

// Projectile sub-types
export enum ProjectileSubType {
  BULLET = 'bullet',
  MISSILE = 'missile',
  LASER = 'laser',
  PLASMA = 'plasma',
  FIREBALL = 'fireball',
}

// PowerUp sub-types
export const PowerUpSubType = {
  AMMO: 'ammo' as const,
  SHIELD: 'shield' as const,
  WEAPON_UPGRADE: 'weapon_upgrade' as const,
  SPEED: 'speed' as const,
  LIFE: 'life' as const,
} as const;

// Enemy sub-types
export enum EnemySubType {
  GRUNT = 'grunt',
  SOLDIER = 'soldier',
  TANK = 'tank',
  FLYER = 'flyer',
  DRAGON = 'dragon',
  BOSS = 'boss',
}

// Obstacle sub-types
export enum ObstacleSubType {
  ROCK = 'rock',
  TREE = 'tree',
  CRYSTAL = 'crystal',
  PILLAR = 'pillar',
  BUILDING = 'building',
  VEHICLE = 'vehicle',
}

// Game states
export enum GameState {
  MENU = 'menu',
  PLAYING = 'playing',
  PAUSED = 'paused',
  GAME_OVER = 'game_over',
  VICTORY = 'victory',
}

// Audio types
export enum AudioType {
  SFX = 'sfx',
  MUSIC = 'music',
  AMBIENT = 'ambient',
}

// Collision bounds
export interface CollisionBounds {
  radius?: number;
  width?: number;
  height?: number;
  depth?: number;
}
