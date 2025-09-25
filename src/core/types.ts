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
  MOVING = 'moving',
  ATTACKING = 'attacking',
  DAMAGED = 'damaged',
  DYING = 'dying',
  DEAD = 'dead',
}

// Animation types
export enum AnimationType {
  IDLE = 'idle',
  MOVING = 'moving',
  ATTACKING = 'attacking',
  FLOATING = 'floating',
  SPINNING = 'spinning',
  EXPLODING = 'exploding',
  DYING = 'dying',
}

// Weapon types
export enum WeaponType {
  BULLET = 1,
  MISSILE = 2,
  LASER = 3,
  PLASMA = 4,
  FIREBALL = 5,
}

// Projectile sub-types
export enum ProjectileSubType {
  BULLET = 'bullet',
  MISSILE = 'missile',
  LASER = 'laser',
  PLASMA = 'plasma',
  FIREBALL = 'fireball',
}

// PowerUp types
export enum PowerUpType {
  AMMO = 'ammo',
  SHIELD = 'shield',
  WEAPON_UPGRADE = 'weapon_upgrade',
  SPEED = 'speed',
  LIFE = 'life',
}

// PowerUp sub-types (enum for compatibility)
export const PowerUpSubType = {
  AMMO: 'ammo' as const,
  SHIELD: 'shield' as const,
  WEAPON_UPGRADE: 'weapon_upgrade' as const,
  SPEED: 'speed' as const,
  LIFE: 'life' as const,
} as const;

// Enemy types
export enum EnemyType {
  GRUNT = 'grunt',
  SOLDIER = 'soldier',
  TANK = 'tank',
  FLYER = 'flyer',
  DRAGON = 'dragon',
  BOSS = 'boss',
}

// Enemy sub-types (enum for compatibility)
export enum EnemySubType {
  GRUNT = 'grunt',
  SOLDIER = 'soldier',
  TANK = 'tank',
  FLYER = 'flyer',
  DRAGON = 'dragon',
  BOSS = 'boss',
}

// Obstacle types
export enum ObstacleType {
  ROCK = 'rock',
  TREE = 'tree',
  CRYSTAL = 'crystal',
  PILLAR = 'pillar',
  BUILDING = 'building',
  VEHICLE = 'vehicle',
}

// Obstacle sub-types (enum for compatibility)
export enum ObstacleSubType {
  ROCK = 'rock',
  TREE = 'tree',
  CRYSTAL = 'crystal',
  PILLAR = 'pillar',
  BUILDING = 'building',
  VEHICLE = 'vehicle',
}

// Difficulty levels
export enum DifficultyLevel {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  NIGHTMARE = 'nightmare',
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

// Input types
export enum InputType {
  KEYBOARD = 'keyboard',
  MOUSE = 'mouse',
  GAMEPAD = 'gamepad',
  TOUCH = 'touch',
}

// Movement types
export enum MovementType {
  STRAFE = 'strafe',
  TURN = 'turn',
}

// Layout types
export enum LayoutType {
  AUTO = 'auto',
  MOBILE = 'mobile',
  DESKTOP = 'desktop',
}

// Utility types
export interface GameVector3 {
  x: number;
  y: number;
  z: number;
}

export interface CollisionBounds {
  radius?: number;
  width?: number;
  height?: number;
  depth?: number;
}
