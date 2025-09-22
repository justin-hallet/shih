import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { PowerUp } from './PowerUp';
import { PowerUpSubType, EntityState, EntityType } from '../types';

describe('PowerUp', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  it('should create ammo power-up with correct properties', () => {
    const powerUp = new PowerUp(PowerUpSubType.AMMO, { x: 1, y: 2, z: 3 }, scene);

    expect(powerUp.powerUpType).toBe(PowerUpSubType.AMMO);
    expect(powerUp.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(powerUp.state).toBe(EntityState.ACTIVE);
    expect(powerUp.value).toBe(50); // 50 ammo
    expect(powerUp.magnetRange).toBe(2.5);
  });

  it('should create shield power-up with correct properties', () => {
    const powerUp = new PowerUp(PowerUpSubType.SHIELD, { x: 0, y: 0, z: 0 }, scene);

    expect(powerUp.powerUpType).toBe(PowerUpSubType.SHIELD);
    expect(powerUp.value).toBe(25); // 25 shield points
    expect(powerUp.magnetRange).toBe(3.0);
  });

  it('should create life power-up with correct properties', () => {
    const powerUp = new PowerUp(PowerUpSubType.LIFE, { x: 0, y: 0, z: 0 }, scene);

    expect(powerUp.powerUpType).toBe(PowerUpSubType.LIFE);
    expect(powerUp.value).toBe(1); // 1 extra life
    expect(powerUp.magnetRange).toBe(4.0); // Lives are more attractive
    expect(powerUp.bobHeight).toBe(0.8);
  });

  it('should detect player in magnet range', () => {
    const powerUp = new PowerUp(PowerUpSubType.AMMO, { x: 0, y: 0, z: 0 }, scene);

    // Player close enough
    expect(powerUp.checkPlayerInRange({ x: 1, y: 0, z: 0 })).toBe(true);
    expect(powerUp.attracted).toBe(true);

    // Reset attraction
    powerUp.attracted = false;

    // Player too far
    expect(powerUp.checkPlayerInRange({ x: 5, y: 0, z: 0 })).toBe(false);
    expect(powerUp.attracted).toBe(false);
  });

  it('should have correct rarity ratings', () => {
    const ammo = new PowerUp(PowerUpSubType.AMMO, { x: 0, y: 0, z: 0 }, scene);
    const speed = new PowerUp(PowerUpSubType.SPEED, { x: 0, y: 0, z: 0 }, scene);
    const shield = new PowerUp(PowerUpSubType.SHIELD, { x: 0, y: 0, z: 0 }, scene);
    const weaponUpgrade = new PowerUp(PowerUpSubType.WEAPON_UPGRADE, { x: 0, y: 0, z: 0 }, scene);
    const life = new PowerUp(PowerUpSubType.LIFE, { x: 0, y: 0, z: 0 }, scene);

    expect(ammo.getRarityRating()).toBe(1); // Common
    expect(speed.getRarityRating()).toBe(2); // Uncommon
    expect(shield.getRarityRating()).toBe(3); // Rare
    expect(weaponUpgrade.getRarityRating()).toBe(4); // Very Rare
    expect(life.getRarityRating()).toBe(5); // Ultra Rare
  });

  it('should apply power-up effects when collected', () => {
    const powerUp = new PowerUp(PowerUpSubType.AMMO, { x: 0, y: 0, z: 0 }, scene);

    const mockPlayer = {
      id: 'player',
      type: EntityType.PLAYER,
      subType: 'harrier',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: -1 },
      velocity: { x: 0, y: 0, z: 0 },
      weight: 1,
      animationType: 'idle' as any,
      animationFrame: 0,
      animationSpeed: 1,
      state: EntityState.ACTIVE,
      health: 100,
      maxHealth: 100,
      collisionBounds: { radius: 1 },
      update: vi.fn(),
      destroy: vi.fn(),
      checkCollision: vi.fn(),
      onCollision: vi.fn(),
      takeDamage: vi.fn(),
    };

    // Mock console.log to verify effect messages
    const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    powerUp.onCollision(mockPlayer);

    // Should log the effect
    expect(consoleLogSpy).toHaveBeenCalledWith('Player gained 50 ammo!');

    // Should transition to dying state after delay
    expect(powerUp.state).toBe(EntityState.ACTIVE); // Still active initially

    consoleLogSpy.mockRestore();
  });

  it('should bob up and down over time', () => {
    const powerUp = new PowerUp(PowerUpSubType.AMMO, { x: 0, y: 0, z: 0 }, scene);

    const initialMeshY = powerUp.mesh?.position.y || 0;

    // Update to trigger bobbing
    powerUp.update(0.5); // 0.5 seconds

    // Mesh Y position should change due to bobbing
    const newMeshY = powerUp.mesh?.position.y || 0;
    expect(newMeshY).not.toBe(initialMeshY);
  });

  it('should rotate based on power-up type', () => {
    const ammo = new PowerUp(PowerUpSubType.AMMO, { x: 0, y: 0, z: 0 }, scene);
    const speed = new PowerUp(PowerUpSubType.SPEED, { x: 0, y: 0, z: 0 }, scene);

    const ammoInitialRotationY = ammo.mesh?.rotation.y || 0;
    const speedInitialRotationZ = speed.mesh?.rotation.z || 0;

    ammo.update(0.1);
    speed.update(0.1);

    // Ammo should rotate around Y axis
    expect(ammo.mesh?.rotation.y).not.toBe(ammoInitialRotationY);

    // Speed should rotate around Z axis (faster)
    expect(speed.mesh?.rotation.z).not.toBe(speedInitialRotationZ);
  });

  it('should not affect non-player entities', () => {
    const powerUp = new PowerUp(PowerUpSubType.SHIELD, { x: 0, y: 0, z: 0 }, scene);

    const mockEnemy = {
      id: 'enemy',
      type: 'enemy' as any,
      subType: 'grunt',
      position: { x: 0, y: 0, z: 0 },
      direction: { x: 0, y: 0, z: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      weight: 1,
      animationType: 'idle' as any,
      animationFrame: 0,
      animationSpeed: 1,
      state: EntityState.ACTIVE,
      health: 100,
      maxHealth: 100,
      collisionBounds: { radius: 1 },
      update: vi.fn(),
      destroy: vi.fn(),
      checkCollision: vi.fn(),
      onCollision: vi.fn(),
      takeDamage: vi.fn(),
    };

    const initialState = powerUp.state;
    powerUp.onCollision(mockEnemy);

    // Should not affect power-up state
    expect(powerUp.state).toBe(initialState);
  });
});
