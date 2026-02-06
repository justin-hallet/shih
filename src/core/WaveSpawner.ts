import * as THREE from 'three';
import { EnemySubType, EntityType, EntityState } from './types';
import type { EntityManager } from './EntityManager';
import type { GameState } from './GameState';
import { OrbMovement } from './enemies/MovementBehavior';

interface WaveDefinition {
  enemies: { type: EnemySubType; count: number }[];
  spawnPattern: 'sides' | 'ahead' | 'ground' | 'formation';
}

const REGULAR_WAVES: WaveDefinition[] = [
  // Swooper waves
  { enemies: [{ type: EnemySubType.SWOOPER, count: 3 }], spawnPattern: 'sides' },
  { enemies: [{ type: EnemySubType.SWOOPER, count: 5 }], spawnPattern: 'sides' },
  // Mech waves
  { enemies: [{ type: EnemySubType.MECH, count: 2 }], spawnPattern: 'ground' },
  { enemies: [{ type: EnemySubType.MECH, count: 3 }], spawnPattern: 'ground' },
  // Striker waves
  { enemies: [{ type: EnemySubType.STRIKER, count: 2 }], spawnPattern: 'ahead' },
  { enemies: [{ type: EnemySubType.STRIKER, count: 3 }], spawnPattern: 'ahead' },
  // Orb encounter
  { enemies: [{ type: EnemySubType.ORB, count: 3 }], spawnPattern: 'formation' },
  // Mixed waves
  { enemies: [
    { type: EnemySubType.SWOOPER, count: 3 },
    { type: EnemySubType.MECH, count: 2 },
  ], spawnPattern: 'sides' },
  { enemies: [
    { type: EnemySubType.STRIKER, count: 2 },
    { type: EnemySubType.SWOOPER, count: 2 },
  ], spawnPattern: 'ahead' },
];

const BOSS_WAVES: WaveDefinition[] = [
  { enemies: [{ type: EnemySubType.SERPENT, count: 1 }], spawnPattern: 'ahead' },
  { enemies: [{ type: EnemySubType.GUARDIAN, count: 1 }], spawnPattern: 'ahead' },
];

export class WaveSpawner {
  private entityManager: EntityManager;
  private gameState: GameState;

  private lastWaveDistance: number = 0;
  private waveInterval: number = 300;
  private minWaveInterval: number = 150;
  private bossInterval: number = 3000;
  private lastBossDistance: number = 0;
  private bossActive: boolean = false;

  constructor(entityManager: EntityManager, gameState: GameState) {
    this.entityManager = entityManager;
    this.gameState = gameState;
  }

  public update(): void {
    if (this.gameState.gameOver) return;

    const distance = this.gameState.distanceTraveled;

    // Check if boss was defeated
    if (this.bossActive) {
      const enemies = this.entityManager.getEntitiesByType(EntityType.ENEMY);
      const bossAlive = enemies.some(e =>
        (e.subType === EnemySubType.SERPENT || e.subType === EnemySubType.GUARDIAN)
        && e.state !== EntityState.DEAD
      );
      if (!bossAlive) {
        this.bossActive = false;
      }
    }

    // Check boss spawn
    if (!this.bossActive && distance - this.lastBossDistance >= this.bossInterval && distance > 2000) {
      this.spawnBossWave();
      this.lastBossDistance = distance;
      return;
    }

    // Check regular wave spawn
    const scaledInterval = Math.max(
      this.minWaveInterval,
      this.waveInterval - (distance / 100) * 5,
    );

    if (!this.bossActive && distance - this.lastWaveDistance >= scaledInterval) {
      this.spawnRegularWave(distance);
      this.lastWaveDistance = distance;
    }
  }

  private spawnRegularWave(distance: number): void {
    const maxWaveIndex = Math.min(
      REGULAR_WAVES.length,
      Math.floor(distance / 500) + 3,
    );
    const waveIndex = Math.floor(Math.random() * maxWaveIndex);
    const wave = REGULAR_WAVES[waveIndex];
    if (!wave) return;
    this.spawnWave(wave);
  }

  private spawnBossWave(): void {
    const bossIndex = Math.floor(Math.random() * BOSS_WAVES.length);
    const wave = BOSS_WAVES[bossIndex];
    if (!wave) return;
    this.bossActive = true;
    this.spawnWave(wave);
  }

  private spawnWave(wave: WaveDefinition): void {
    const playerPos = this.entityManager.player?.position;
    if (!playerPos) return;

    for (const group of wave.enemies) {
      for (let i = 0; i < group.count; i++) {
        const pos = this.getSpawnPosition(wave.spawnPattern, playerPos, i, group.count, group.type);
        const enemy = this.entityManager.spawnEnemy(group.type, pos);

        // Set Orb split offsets
        if (group.type === EnemySubType.ORB) {
          const angle = (i / group.count) * Math.PI * 2;
          const offset = new THREE.Vector3(
            Math.cos(angle) * 8,
            Math.sin(angle) * 4,
            0,
          );
          enemy.setMovementBehavior(new OrbMovement(offset));
        }

        // Apply difficulty scaling
        const scaleFactor = 1.0 + (this.gameState.distanceTraveled / 5000);
        enemy.health = Math.floor(enemy.health * scaleFactor);
        enemy.maxHealth = enemy.health;
      }
    }
  }

  private getSpawnPosition(
    pattern: string,
    playerPos: THREE.Vector3,
    index: number,
    total: number,
    type: EnemySubType,
  ): { x: number; y: number; z: number } {
    const ahead = playerPos.z - 120;
    const spread = 30;

    switch (pattern) {
      case 'sides': {
        const side = index % 2 === 0 ? -1 : 1;
        return {
          x: playerPos.x + side * (20 + Math.random() * spread),
          y: 5 + Math.random() * 15,
          z: ahead - Math.random() * 30,
        };
      }
      case 'ahead':
        return {
          x: playerPos.x + (index - total / 2) * 10,
          y: type === EnemySubType.SERPENT || type === EnemySubType.GUARDIAN ? 12 : 5 + Math.random() * 10,
          z: ahead - index * 15,
        };
      case 'ground':
        return {
          x: playerPos.x + (index - total / 2) * 12 + (Math.random() - 0.5) * 8,
          y: 0,
          z: ahead - Math.random() * 20,
        };
      case 'formation':
        return {
          x: playerPos.x + (index - total / 2) * 5,
          y: 8 + Math.random() * 4,
          z: ahead,
        };
      default:
        return { x: playerPos.x, y: 5, z: ahead };
    }
  }
}
