/**
 * CombatSystem - Handles projectile spawning, weapon-to-projectile mapping,
 * shot cooldown, audio, and HUD ammo updates.
 *
 * Extracted from main.ts animate() loop (Task 4).
 */

import * as THREE from 'three';
import { ProjectileSubType } from './types';
import { GameState } from './GameState';
import { EntityManager } from './EntityManager';
import { AudioManager } from './AudioManager';

export class CombatSystem {
  private lastShotTime = 0;
  private readonly shotCooldown = 0.1; // 10 shots/sec

  constructor(
    private gameState: GameState,
    private entityManager: EntityManager,
    private audioManager: AudioManager,
  ) {}

  update(player: any): void {
    const currentTime = Date.now() * 0.001;
    if (currentTime - this.lastShotTime < this.shotCooldown) return;

    if (!player.getInputState('fire') || !player.shoot()) return;

    // Use the player's horizontal travel direction (constant Y)
    const forward = new THREE.Vector3(
      this.gameState.lastForwardDir.x,
      0,
      this.gameState.lastForwardDir.z,
    ).normalize();

    // Offset spawn a bit ahead of player and at chest height
    const playerHeight = 7.2; // Approximate height of scaled player model (180 * 0.04)
    const spawnPos = {
      x: player.position.x + forward.x * 0.6,
      y: player.position.y + playerHeight * 0.6, // 60% of player height for chest/weapon level
      z: player.position.z + forward.z * 0.6,
    };

    // Map weapon level to projectile subtype
    const weaponLevel = ((player as any).weaponLevel || 1) as number;
    const projType =
      weaponLevel === 1
        ? ProjectileSubType.BULLET
        : weaponLevel === 2
          ? ProjectileSubType.MISSILE
          : weaponLevel === 3
            ? ProjectileSubType.LASER
            : weaponLevel === 4
              ? ProjectileSubType.PLASMA
              : ProjectileSubType.FIREBALL;

    const proj = this.entityManager.spawnProjectile(projType, 'player', spawnPos, {
      x: forward.x, // Same direction as player movement
      y: 0, // constant height
      z: forward.z, // Same direction as player movement
    });
    // Set projectile to 2x player's current rails speed and 2s lifetime
    const railsSpeed =
      this.gameState.lastRailsSpeed || this.gameState.railsSpeed || 50;
    proj.speed = railsSpeed * 2.2; // ensure clearly faster than player
    proj.lifetime = 2.0;
    proj.velocity.x = forward.x * proj.speed; // Same direction as player movement but faster
    proj.velocity.y = 0; // constant height
    proj.velocity.z = forward.z * proj.speed; // Same direction as player movement but faster
    this.lastShotTime = currentTime;

    // Play shooting sound
    this.audioManager.playShootSound(
      weaponLevel,
      new THREE.Vector3(spawnPos.x, spawnPos.y, spawnPos.z),
    );

    // Reflect ammo change in HUD (ammo may be fractional but HUD shows int)
    this.gameState.hud?.updateAmmo(Math.floor((player as any).ammo || 0));
  }
}
