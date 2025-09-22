import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Projectile } from './Projectile';
import { ProjectileSubType, EntityState } from '../types';

describe('Projectile', () => {
  let scene: THREE.Scene;

  beforeEach(() => {
    scene = new THREE.Scene();
  });

  it('should create bullet with correct properties', () => {
    const projectile = new Projectile(
      ProjectileSubType.BULLET,
      'player',
      { x: 1, y: 2, z: 3 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    expect(projectile.projectileType).toBe(ProjectileSubType.BULLET);
    expect(projectile.owner).toBe('player');
    expect(projectile.position).toEqual({ x: 1, y: 2, z: 3 });
    expect(projectile.direction).toEqual({ x: 0, y: 0, z: -1 });
    expect(projectile.state).toBe(EntityState.ACTIVE);
    expect(projectile.damage).toBe(15); // Player bullet damage
    expect(projectile.speed).toBe(20.0);
  });

  it('should create missile with correct properties', () => {
    const projectile = new Projectile(
      ProjectileSubType.MISSILE,
      'enemy',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      scene,
    );

    expect(projectile.projectileType).toBe(ProjectileSubType.MISSILE);
    expect(projectile.owner).toBe('enemy');
    expect(projectile.damage).toBe(30); // Enemy missile damage
    expect(projectile.explosive).toBe(true);
    expect(projectile.explosionRadius).toBe(2.0);
    expect(projectile.homingStrength).toBe(2.0);
  });

  it('should move according to velocity', () => {
    const projectile = new Projectile(
      ProjectileSubType.LASER,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    const initialZ = projectile.position.z;
    projectile.update(0.1); // 0.1 seconds

    // Should move forward (negative Z)
    expect(projectile.position.z).toBeLessThan(initialZ);
    expect(projectile.position.z).toBe(initialZ - 3.0); // 30 speed * 0.1s
  });

  it('should die after lifetime', () => {
    const projectile = new Projectile(
      ProjectileSubType.BULLET,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    expect(projectile.state).toBe(EntityState.ACTIVE);

    // Age the projectile beyond its lifetime (3.0 seconds for bullets)
    projectile.update(3.5);

    expect(projectile.state).toBe(EntityState.DYING);
  });

  it('should have correct velocity based on direction and speed', () => {
    const projectile = new Projectile(
      ProjectileSubType.BULLET,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 }, // Right direction
      scene,
    );

    expect(projectile.velocity.x).toBe(20.0); // Speed of 20 in X direction
    expect(projectile.velocity.y).toBe(0);
    expect(projectile.velocity.z).toBe(0);
  });

  it('should set homing target', () => {
    const projectile = new Projectile(
      ProjectileSubType.MISSILE,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    const mockTarget = {
      id: 'test',
      type: 'enemy' as any,
      subType: 'grunt',
      position: { x: 5, y: 0, z: -10 },
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

    projectile.setHomingTarget(mockTarget);
    expect(projectile.homingTarget).toBe(mockTarget);
  });

  it('should determine damage capability correctly', () => {
    const playerProjectile = new Projectile(
      ProjectileSubType.BULLET,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    const enemyProjectile = new Projectile(
      ProjectileSubType.BULLET,
      'enemy',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    // Player projectiles can damage enemies and obstacles
    expect(playerProjectile.canDamage('enemy' as any)).toBe(true);
    expect(playerProjectile.canDamage('obstacle' as any)).toBe(true);
    expect(playerProjectile.canDamage('player' as any)).toBe(false);

    // Enemy projectiles can damage player
    expect(enemyProjectile.canDamage('player' as any)).toBe(true);
    expect(enemyProjectile.canDamage('enemy' as any)).toBe(false);
    expect(enemyProjectile.canDamage('obstacle' as any)).toBe(false);
  });

  it('should have piercing property for laser', () => {
    const laser = new Projectile(
      ProjectileSubType.LASER,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    expect(laser.piercing).toBe(true);
  });

  it('should have explosive property for missiles and plasma', () => {
    const missile = new Projectile(
      ProjectileSubType.MISSILE,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    const plasma = new Projectile(
      ProjectileSubType.PLASMA,
      'player',
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: -1 },
      scene,
    );

    expect(missile.explosive).toBe(true);
    expect(plasma.explosive).toBe(true);
  });
});
