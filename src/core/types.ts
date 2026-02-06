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
  FLOATING = 'floating',
  SPINNING = 'spinning',
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
export enum PowerUpSubType {
  AMMO = 'ammo',
  SHIELD = 'shield',
  WEAPON_UPGRADE = 'weapon_upgrade',
  SPEED = 'speed',
  LIFE = 'life',
} 

// Enemy sub-types
export enum EnemySubType {
  SWOOPER = 'swooper',     // Aerial formation flyer, fires energy balls
  MECH = 'mech',           // Ground walker/leaper, fires missiles
  ORB = 'orb',             // Splits apart, opens to fire, invulnerable when closed
  STRIKER = 'striker',     // Fast dive-bomber, fires missiles on approach
  SERPENT = 'serpent',     // Multi-segment boss, only head takes damage
  GUARDIAN = 'guardian',   // Boss with orbiting shields protecting core
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
}

// Collision bounds
export interface CollisionBounds {
  radius?: number;
  width?: number;
}
