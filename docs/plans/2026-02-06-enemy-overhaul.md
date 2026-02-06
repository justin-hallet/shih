# Enemy System Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current placeholder enemy system with 6 distinct enemy types featuring unique procedural meshes, movement AI, and projectile attacks — inspired by the original Space Harrier by Sega.

**Architecture:** Each enemy type is a subclass of Enemy that overrides `createMesh()`, `onUpdate()`, and a new `fireProjectile()` hook. A `MovementBehavior` interface provides pluggable movement patterns (sine-wave, ground-walk, dive-bomb, etc.). A `WaveSpawner` system replaces per-tile random spawning with distance-triggered enemy waves. Enemy projectiles reuse the existing Projectile class with `owner: 'enemy'` and are destroyable by player shots.

**Tech Stack:** Three.js (meshes, materials, geometry), TypeScript strict mode, Vite build

**No test framework** — verification is `npx tsc --noEmit` + `npm run build` + manual gameplay testing.

---

## Context: Current Codebase

- **Enemy base class**: `src/core/entities/Enemy.ts` — single class handles all 6 types via `initializeByType()` switch. Enemies move in straight lines (constant negative Z velocity), no projectiles, primitive geometry meshes.
- **Projectile class**: `src/core/entities/Projectile.ts` — already supports `owner: 'player' | 'enemy'`, 5 subtypes (BULLET, MISSILE, LASER, PLASMA, FIREBALL), damage scaling by owner, lifetime, explosion radius.
- **Entity system**: `src/core/Entity.ts` (BaseEntity) → `src/core/EntityManager.ts` — handles spawn, update, collision detection, removal. Collision skips same-type pairs except PROJECTILE.
- **Types**: `src/core/types.ts` — `EnemySubType` enum (GRUNT, SOLDIER, TANK, FLYER, DRAGON, BOSS), `ProjectileSubType` enum, `EntityState`, `CollisionBounds`.
- **World generation**: `src/core/world/WorldGenerator.ts` — `spawnEnemies()` at line ~711 spawns enemies per-tile based on biome rules with difficulty scaling.
- **Player**: `src/core/entities/Player.ts` — has `onDamage()`, collision with enemies, health/shield system.

---

## Task 1: Update Type System

**Files:**
- Modify: `src/core/types.ts`

**What:** Replace the old `EnemySubType` enum values with the new 6 enemy types. Add an `EnemyProjectileType` to distinguish enemy projectile behavior (we'll reuse `ProjectileSubType` values but need a mapping).

**Step 1: Update EnemySubType enum**

Replace lines 60-67 in `src/core/types.ts`:

```typescript
// Enemy sub-types
export enum EnemySubType {
  SWOOPER = 'swooper',     // Aerial formation flyer, fires energy balls
  MECH = 'mech',           // Ground walker/leaper, fires missiles
  ORB = 'orb',             // Splits apart, opens to fire, invulnerable when closed
  STRIKER = 'striker',     // Fast dive-bomber, fires missiles on approach
  SERPENT = 'serpent',     // Multi-segment boss, only head takes damage
  GUARDIAN = 'guardian',   // Boss with orbiting shields protecting core
}
```

**Step 2: Verify types pass**

Run: `npx tsc --noEmit 2>&1`

This will produce errors everywhere the old enum values are used (Enemy.ts, WorldGenerator.ts, BiomeManager, etc.). That's expected — we'll fix those in subsequent tasks.

**Step 3: Find and update all references to old enum values**

Search for: `EnemySubType.GRUNT`, `EnemySubType.SOLDIER`, `EnemySubType.TANK`, `EnemySubType.FLYER`, `EnemySubType.DRAGON`, `EnemySubType.BOSS` and string literals `'grunt'`, `'soldier'`, `'tank'`, `'flyer'`, `'dragon'`, `'boss'` used in enemy contexts.

Update all biome configs in `src/core/world/BiomeManager.ts` to use the new types. Map roughly:
- GRUNT → SWOOPER (aerial, common)
- SOLDIER → MECH (ground, medium)
- TANK → MECH (ground, heavy — can reuse with different spawn params)
- FLYER → STRIKER (fast aerial)
- DRAGON → SERPENT (boss)
- BOSS → GUARDIAN (boss)

Update content templates in `WorldGenerator.ts` (~lines 92-226) similarly.

Update the `ScoreManager` if it references old enemy type strings for scoring.

**Step 4: Update Enemy.initializeByType() temporarily**

In `src/core/entities/Enemy.ts`, update `initializeByType()` to handle the new enum values with placeholder stats (we'll replace the whole method in later tasks):

```typescript
private initializeByType(): void {
  switch (this.enemyType) {
    case EnemySubType.SWOOPER:
      this.health = this.maxHealth = 60;
      this.attackDamage = 0.3;
      this.velocity.z = -4.0;
      break;
    case EnemySubType.MECH:
      this.health = this.maxHealth = 150;
      this.attackDamage = 0.5;
      this.velocity.z = -2.0;
      break;
    case EnemySubType.ORB:
      this.health = this.maxHealth = 40;
      this.attackDamage = 0.3;
      this.velocity.z = -3.0;
      break;
    case EnemySubType.STRIKER:
      this.health = this.maxHealth = 50;
      this.attackDamage = 0.4;
      this.velocity.z = -6.0;
      break;
    case EnemySubType.SERPENT:
      this.health = this.maxHealth = 800;
      this.attackDamage = 1.5;
      this.velocity.z = -1.5;
      break;
    case EnemySubType.GUARDIAN:
      this.health = this.maxHealth = 600;
      this.attackDamage = 1.0;
      this.velocity.z = -1.0;
      break;
  }
}
```

**Step 5: Update Enemy.createMesh() temporarily**

Update the switch in `createMesh()` to handle new enum values with simple placeholder geometries (same pattern as before, just different colors/shapes). Each type gets a distinct color so you can visually distinguish them during testing:

- SWOOPER: OctahedronGeometry, magenta (0xFF00FF)
- MECH: BoxGeometry, gray (0x888888)
- ORB: SphereGeometry, cyan (0x00FFFF)
- STRIKER: ConeGeometry, white (0xFFFFFF)
- SERPENT: DodecahedronGeometry, green (0x00FF88)
- GUARDIAN: IcosahedronGeometry, dark red (0x880000)

**Step 6: Update Enemy.updateSpecialEffects() temporarily**

Replace the old FLYER/DRAGON/BOSS checks with new types. SWOOPER and STRIKER get the floating sin-wave, SERPENT and GUARDIAN get the pulsing scale.

**Step 7: Verify and commit**

Run: `npx tsc --noEmit && npm run build`
Expected: Clean build, no errors.

```bash
git add -A
git commit -m "feat: update EnemySubType enum to new 6-type system (swooper, mech, orb, striker, serpent, guardian)"
```

---

## Task 2: Enemy Projectile Firing Infrastructure

**Files:**
- Modify: `src/core/entities/Enemy.ts`
- Modify: `src/core/entities/Projectile.ts` (if needed for enemy-specific behavior)
- Modify: `src/core/EntityManager.ts`

**What:** Give enemies the ability to fire projectiles. Add a `fireProjectile()` method to Enemy that spawns a Projectile with `owner: 'enemy'`. Add firing cooldown tracking. Ensure enemy projectiles can be destroyed by player projectiles (this should already work via existing collision logic since Projectile `shouldHandleCollision` allows PROJECTILE-PROJECTILE collisions).

**Step 1: Add firing properties to Enemy**

Add to `src/core/entities/Enemy.ts` class properties:

```typescript
// Firing system
protected fireCooldown: number = 2.0;        // Seconds between shots
protected fireCooldownTimer: number = 0;      // Time since last shot
protected canFire: boolean = true;            // Whether this enemy type fires
protected projectileType: ProjectileSubType = ProjectileSubType.BULLET;
protected projectilesPerShot: number = 1;     // Number of projectiles per firing
protected spreadAngle: number = 0;            // Spread angle in radians for multi-shot
```

**Step 2: Add fireProjectile() method to Enemy**

```typescript
protected fireProjectile(targetPosition: THREE.Vector3): void {
  if (this.fireCooldownTimer < this.fireCooldown || !this.canFire) return;
  if (this.state !== EntityState.ACTIVE) return;
  if (!this.scene || !this.mesh) return;

  this.fireCooldownTimer = 0;

  const entityManager = (this.scene as any)?.userData?.entityManager;
  if (!entityManager) return;

  for (let i = 0; i < this.projectilesPerShot; i++) {
    // Calculate direction toward target
    const direction = new THREE.Vector3()
      .subVectors(targetPosition, this.position)
      .normalize();

    // Apply spread for multi-shot
    if (this.projectilesPerShot > 1 && this.spreadAngle > 0) {
      const angleOffset = this.spreadAngle * ((i / (this.projectilesPerShot - 1)) - 0.5);
      const axis = new THREE.Vector3(0, 1, 0);
      direction.applyAxisAngle(axis, angleOffset);
    }

    const projectile = entityManager.spawnProjectile(
      this.projectileType,
      'enemy',
      { x: this.position.x, y: this.position.y, z: this.position.z },
      { x: direction.x, y: direction.y, z: direction.z },
    );

    // Apply outline effect for enemy projectiles
    if (projectile?.mesh) {
      projectile.createOutlineEffect(new THREE.Color(0xff3333));
    }
  }
}
```

**Step 3: Add spawnProjectile() to EntityManager if missing**

Check if `EntityManager` already has a `spawnProjectile()` method. If not, add one:

```typescript
public spawnProjectile(
  projectileType: ProjectileSubType,
  owner: 'player' | 'enemy',
  position: { x: number; y: number; z: number },
  direction: { x: number; y: number; z: number },
): Projectile {
  const projectile = new Projectile(
    projectileType,
    owner,
    position,
    direction,
    this.scene,
  );
  this.spawn(projectile);
  return projectile;
}
```

**Step 4: Update firing cooldown in Enemy.onUpdate()**

Add to the `onUpdate()` method:

```typescript
// Update firing cooldown
this.fireCooldownTimer += deltaTime;

// Attempt to fire at player if in range
if (this.canFire && this.fireCooldownTimer >= this.fireCooldown) {
  const player = (this.scene as any)?.userData?.entityManager?.player;
  if (player && player.state === EntityState.ACTIVE) {
    const distToPlayer = this.position.distanceTo(player.position);
    if (distToPlayer < 150) { // Only fire within range
      this.fireProjectile(player.position.clone());
    }
  }
}
```

**Step 5: Set firing parameters per enemy type in initializeByType()**

Update the switch cases:

```typescript
case EnemySubType.SWOOPER:
  this.canFire = true;
  this.projectileType = ProjectileSubType.PLASMA;  // energy ball
  this.fireCooldown = 3.0;
  this.projectilesPerShot = 1;
  break;
case EnemySubType.MECH:
  this.canFire = true;
  this.projectileType = ProjectileSubType.MISSILE;
  this.fireCooldown = 4.0;
  this.projectilesPerShot = 2;
  this.spreadAngle = 0.2;
  break;
case EnemySubType.ORB:
  this.canFire = true;
  this.projectileType = ProjectileSubType.PLASMA;
  this.fireCooldown = 5.0;
  this.projectilesPerShot = 3;
  this.spreadAngle = 0.4;
  break;
case EnemySubType.STRIKER:
  this.canFire = true;
  this.projectileType = ProjectileSubType.MISSILE;
  this.fireCooldown = 2.5;
  this.projectilesPerShot = 2;
  this.spreadAngle = 0.15;
  break;
case EnemySubType.SERPENT:
  this.canFire = true;
  this.projectileType = ProjectileSubType.FIREBALL;
  this.fireCooldown = 3.0;
  this.projectilesPerShot = 5;
  this.spreadAngle = 0.6;
  break;
case EnemySubType.GUARDIAN:
  this.canFire = true;
  this.projectileType = ProjectileSubType.PLASMA;
  this.fireCooldown = 4.0;
  this.projectilesPerShot = 8;
  this.spreadAngle = Math.PI * 2; // Full circle burst
  break;
```

**Step 6: Verify enemy projectiles are destroyable by player**

Check `EntityManager.shouldHandleCollision()` — it returns `true` for PROJECTILE-PROJECTILE collisions (same type, exception for projectiles). Then check `Projectile.onCollisionResponse()` — it should handle collisions between enemy and player projectiles. If it skips same-type, we need to ensure it checks `owner` instead.

In `Projectile.onCollisionResponse()`, verify it handles enemy-vs-player projectile collisions:
- If `other` is a Projectile with different `owner`, both should take damage/die.
- If this logic is missing, add it.

**Step 7: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add enemy projectile firing system with cooldowns and spread patterns"
```

---

## Task 3: Movement Behavior System

**Files:**
- Create: `src/core/enemies/MovementBehavior.ts`
- Modify: `src/core/entities/Enemy.ts`

**What:** Create a pluggable movement behavior interface so each enemy type can have distinct movement AI. The behavior receives the enemy's position, the player's position, deltaTime, and elapsed time, and returns a velocity/position update.

**Step 1: Create MovementBehavior interface and implementations**

Create `src/core/enemies/MovementBehavior.ts`:

```typescript
import * as THREE from 'three';

export interface MovementContext {
  position: THREE.Vector3;         // Enemy's current position
  playerPosition: THREE.Vector3;   // Player's current position
  spawnPosition: THREE.Vector3;    // Where enemy was spawned
  deltaTime: number;
  elapsedTime: number;             // Time since spawn
  railsSpeed: number;              // Current world scroll speed
}

export interface MovementBehavior {
  /** Update enemy position/velocity. Called every frame. */
  update(ctx: MovementContext, velocity: THREE.Vector3): void;
  /** Whether this enemy should be despawned (flew off screen, etc.) */
  shouldDespawn(ctx: MovementContext): boolean;
}

/**
 * SwooperMovement: Sine-wave flight from one side, swoops across screen.
 * Spawns offset to left or right, flies in sine-wave toward player Z,
 * then continues past and despawns.
 */
export class SwooperMovement implements MovementBehavior {
  private amplitude: number;
  private frequency: number;
  private approachSpeed: number;
  private lateralSpeed: number;
  private fromRight: boolean;

  constructor(fromRight: boolean = false) {
    this.amplitude = 3.0 + Math.random() * 4.0;
    this.frequency = 1.5 + Math.random() * 1.0;
    this.approachSpeed = 40 + Math.random() * 20;
    this.lateralSpeed = 15 + Math.random() * 10;
    this.fromRight = fromRight;
  }

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    // Move toward player on Z
    const dirZ = ctx.playerPosition.z - ctx.position.z;
    velocity.z = Math.sign(dirZ) * this.approachSpeed;

    // Sine-wave lateral motion
    const lateralDir = this.fromRight ? -1 : 1;
    velocity.x = lateralDir * this.lateralSpeed +
      Math.sin(ctx.elapsedTime * this.frequency) * this.amplitude * 3;

    // Gentle vertical wave
    velocity.y = Math.sin(ctx.elapsedTime * this.frequency * 0.7) * this.amplitude;
  }

  shouldDespawn(ctx: MovementContext): boolean {
    // Despawn if behind player by more than 50 units or alive > 12 seconds
    return ctx.position.z > ctx.playerPosition.z + 50 || ctx.elapsedTime > 12;
  }
}

/**
 * MechMovement: Walks along ground toward player, periodically leaps.
 */
export class MechMovement implements MovementBehavior {
  private walkSpeed: number;
  private leapInterval: number;
  private leapTimer: number = 0;
  private isLeaping: boolean = false;
  private leapVelocityY: number = 0;
  private groundY: number = 0;
  private strafeDir: number;

  constructor() {
    this.walkSpeed = 20 + Math.random() * 10;
    this.leapInterval = 3.0 + Math.random() * 2.0;
    this.strafeDir = Math.random() > 0.5 ? 1 : -1;
  }

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    this.leapTimer += ctx.deltaTime;

    // Approach player on Z
    velocity.z = -this.walkSpeed;

    // Strafe left/right slowly
    velocity.x = this.strafeDir * 5 * Math.sin(ctx.elapsedTime * 0.8);

    // Leap logic
    if (!this.isLeaping && this.leapTimer >= this.leapInterval) {
      this.isLeaping = true;
      this.leapTimer = 0;
      this.leapVelocityY = 30;
      this.groundY = ctx.position.y;
    }

    if (this.isLeaping) {
      this.leapVelocityY -= 60 * ctx.deltaTime; // Gravity
      velocity.y = this.leapVelocityY;
      if (ctx.position.y <= this.groundY && this.leapVelocityY < 0) {
        velocity.y = 0;
        ctx.position.y = this.groundY;
        this.isLeaping = false;
      }
    } else {
      velocity.y = 0;
    }
  }

  shouldDespawn(ctx: MovementContext): boolean {
    return ctx.position.z > ctx.playerPosition.z + 50 || ctx.elapsedTime > 15;
  }
}

/**
 * OrbMovement: Flies in as cluster, splits into triangle, cycles open/close.
 */
export class OrbMovement implements MovementBehavior {
  private phase: 'approach' | 'split' | 'cycle' | 'retreat' = 'approach';
  private cycleCount: number = 0;
  private maxCycles: number = 3;
  private phaseTimer: number = 0;
  private splitOffset: THREE.Vector3;
  private targetPosition: THREE.Vector3 = new THREE.Vector3();
  public isOpen: boolean = false;

  constructor(splitOffset: THREE.Vector3) {
    this.splitOffset = splitOffset;
  }

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    this.phaseTimer += ctx.deltaTime;

    switch (this.phase) {
      case 'approach':
        // Fly toward a position near the player
        this.targetPosition.copy(ctx.playerPosition).add(new THREE.Vector3(0, 0, -40));
        const dirApproach = this.targetPosition.clone().sub(ctx.position);
        if (dirApproach.length() < 5) {
          this.phase = 'split';
          this.phaseTimer = 0;
        }
        velocity.copy(dirApproach.normalize().multiplyScalar(50));
        break;

      case 'split':
        // Move to split position
        this.targetPosition.copy(ctx.playerPosition)
          .add(new THREE.Vector3(0, 0, -30))
          .add(this.splitOffset);
        const dirSplit = this.targetPosition.clone().sub(ctx.position);
        velocity.copy(dirSplit.normalize().multiplyScalar(30));
        if (this.phaseTimer > 1.5) {
          this.phase = 'cycle';
          this.phaseTimer = 0;
        }
        break;

      case 'cycle':
        // Hold position, alternate open/close
        velocity.set(0, 0, 0);
        // Match player Z movement so orb doesn't fall behind
        velocity.z = -ctx.railsSpeed;

        const cycleTime = this.phaseTimer % 3.0;
        this.isOpen = cycleTime > 1.0 && cycleTime < 2.5; // Open for 1.5s, closed for 1.5s

        if (this.phaseTimer > 3.0) {
          this.cycleCount++;
          this.phaseTimer = 0;
          if (this.cycleCount >= this.maxCycles) {
            this.phase = 'retreat';
          }
        }
        break;

      case 'retreat':
        velocity.set(0, 5, 30); // Fly up and away
        break;
    }
  }

  shouldDespawn(ctx: MovementContext): boolean {
    return this.phase === 'retreat' && this.phaseTimer > 3.0;
  }
}

/**
 * StrikerMovement: Fast dive-bomb from distance toward player.
 */
export class StrikerMovement implements MovementBehavior {
  private phase: 'approach' | 'dive' | 'pullup' = 'approach';
  private diveSpeed: number;
  private phaseTimer: number = 0;

  constructor() {
    this.diveSpeed = 80 + Math.random() * 30;
  }

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    this.phaseTimer += ctx.deltaTime;

    switch (this.phase) {
      case 'approach':
        // Fly toward player from distance
        const dir = ctx.playerPosition.clone().sub(ctx.position).normalize();
        velocity.copy(dir.multiplyScalar(this.diveSpeed * 0.5));
        if (ctx.position.distanceTo(ctx.playerPosition) < 60) {
          this.phase = 'dive';
          this.phaseTimer = 0;
        }
        break;

      case 'dive':
        // Full speed dive at player's current position
        const diveDir = ctx.playerPosition.clone().sub(ctx.position).normalize();
        velocity.copy(diveDir.multiplyScalar(this.diveSpeed));
        // Transition to pullup if close to player or past them
        if (ctx.position.z > ctx.playerPosition.z - 5 || this.phaseTimer > 3) {
          this.phase = 'pullup';
          this.phaseTimer = 0;
        }
        break;

      case 'pullup':
        // Arc upward and away
        velocity.set(velocity.x * 0.95, 40, 30);
        break;
    }
  }

  shouldDespawn(ctx: MovementContext): boolean {
    return this.phase === 'pullup' && this.phaseTimer > 3.0;
  }
}

/**
 * SerpentMovement: Multi-segment weaving. This controls the HEAD only.
 * Body segments are handled separately by following the head.
 */
export class SerpentMovement implements MovementBehavior {
  private weaveAmplitudeX: number = 25;
  private weaveAmplitudeY: number = 12;
  private weaveFrequencyX: number = 0.4;
  private weaveFrequencyY: number = 0.6;
  private baseZ: number = 0;
  private initialized: boolean = false;

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    if (!this.initialized) {
      this.baseZ = ctx.playerPosition.z - 60;
      this.initialized = true;
    }

    // Track player Z position (boss stays at fixed distance ahead)
    this.baseZ = ctx.playerPosition.z - 60;

    // Weave in figure-8 pattern
    const targetX = Math.sin(ctx.elapsedTime * this.weaveFrequencyX) * this.weaveAmplitudeX;
    const targetY = Math.sin(ctx.elapsedTime * this.weaveFrequencyY) * this.weaveAmplitudeY + 10;
    const targetZ = this.baseZ + Math.sin(ctx.elapsedTime * 0.3) * 15;

    // Smooth movement toward target
    velocity.x = (targetX - ctx.position.x) * 2.0;
    velocity.y = (targetY - ctx.position.y) * 2.0;
    velocity.z = (targetZ - ctx.position.z) * 2.0;
  }

  shouldDespawn(): boolean {
    return false; // Boss never despawns — must be killed
  }
}

/**
 * GuardianMovement: Slow circular orbit. Pauses periodically to fire.
 */
export class GuardianMovement implements MovementBehavior {
  private orbitRadius: number = 20;
  private orbitSpeed: number = 0.3;
  private baseZ: number = 0;
  private initialized: boolean = false;
  public isPaused: boolean = false;
  private pauseTimer: number = 0;
  private pauseInterval: number = 5.0;
  private pauseDuration: number = 2.0;

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    if (!this.initialized) {
      this.baseZ = ctx.playerPosition.z - 50;
      this.initialized = true;
    }

    // Track player Z
    this.baseZ = ctx.playerPosition.z - 50;

    this.pauseTimer += ctx.deltaTime;

    if (this.isPaused) {
      // Hold position, match rails
      velocity.set(0, 0, 0);
      velocity.z = (this.baseZ - ctx.position.z) * 1.0;
      if (this.pauseTimer > this.pauseDuration) {
        this.isPaused = false;
        this.pauseTimer = 0;
      }
    } else {
      // Circular orbit
      const targetX = Math.cos(ctx.elapsedTime * this.orbitSpeed) * this.orbitRadius;
      const targetY = Math.sin(ctx.elapsedTime * this.orbitSpeed) * this.orbitRadius * 0.5 + 10;
      const targetZ = this.baseZ;

      velocity.x = (targetX - ctx.position.x) * 2.0;
      velocity.y = (targetY - ctx.position.y) * 2.0;
      velocity.z = (targetZ - ctx.position.z) * 2.0;

      if (this.pauseTimer > this.pauseInterval) {
        this.isPaused = true;
        this.pauseTimer = 0;
      }
    }
  }

  shouldDespawn(): boolean {
    return false; // Boss never despawns
  }
}
```

**Step 2: Integrate MovementBehavior into Enemy**

Add to `src/core/entities/Enemy.ts`:

```typescript
import { MovementBehavior, MovementContext, SwooperMovement, MechMovement,
         OrbMovement, StrikerMovement, SerpentMovement, GuardianMovement
       } from '../enemies/MovementBehavior';
```

Add class properties:

```typescript
protected movementBehavior: MovementBehavior | null = null;
protected spawnPosition: THREE.Vector3 = new THREE.Vector3();
protected elapsedTime: number = 0;
```

In constructor, after `initializeByType()`:
```typescript
this.spawnPosition.copy(this.position);
this.initializeMovement();
```

Add method:
```typescript
protected initializeMovement(): void {
  switch (this.enemyType) {
    case EnemySubType.SWOOPER:
      this.movementBehavior = new SwooperMovement(Math.random() > 0.5);
      break;
    case EnemySubType.MECH:
      this.movementBehavior = new MechMovement();
      break;
    case EnemySubType.ORB:
      // Orb split offset is set externally by the spawner
      this.movementBehavior = new OrbMovement(new THREE.Vector3());
      break;
    case EnemySubType.STRIKER:
      this.movementBehavior = new StrikerMovement();
      break;
    case EnemySubType.SERPENT:
      this.movementBehavior = new SerpentMovement();
      break;
    case EnemySubType.GUARDIAN:
      this.movementBehavior = new GuardianMovement();
      break;
  }
}
```

**Step 3: Use MovementBehavior in onUpdate()**

Replace the constant-velocity movement. In `onUpdate()`, before the existing health bar updates:

```typescript
this.elapsedTime += deltaTime;

if (this.movementBehavior) {
  const player = (this.scene as any)?.userData?.entityManager?.player;
  const gameState = (this.scene as any)?.userData?.gameState;
  const ctx: MovementContext = {
    position: this.position,
    playerPosition: player?.position || new THREE.Vector3(),
    spawnPosition: this.spawnPosition,
    deltaTime,
    elapsedTime: this.elapsedTime,
    railsSpeed: gameState?.railsSpeed || 50,
  };
  this.movementBehavior.update(ctx, this.velocity);

  // Check despawn
  if (this.movementBehavior.shouldDespawn(ctx)) {
    this.state = EntityState.DEAD;
    return;
  }
}
```

**Step 4: Allow MovementBehavior to be set externally**

Add a public setter so the wave spawner can configure movement (e.g., set Orb split offsets):

```typescript
public setMovementBehavior(behavior: MovementBehavior): void {
  this.movementBehavior = behavior;
}
```

**Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add pluggable movement behavior system with 6 movement patterns"
```

---

## Task 4: Swooper — Procedural Mesh

**Files:**
- Modify: `src/core/entities/Enemy.ts` (createMesh switch case)

**What:** Build the Swooper mesh as a THREE.Group: flattened ellipsoid body + two swept-back wings. Magenta emissive accents.

**Step 1: Implement Swooper mesh in createMesh()**

In the `SWOOPER` case of `createMesh()`:

```typescript
case EnemySubType.SWOOPER: {
  const group = new THREE.Group();

  // Body: flattened ellipsoid
  const bodyGeo = new THREE.SphereGeometry(0.5, 12, 8);
  bodyGeo.scale(1.5, 0.6, 2.0); // Wide and flat
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0xcc44cc });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // Left wing
  const wingGeo = new THREE.BoxGeometry(2.0, 0.08, 0.8);
  const wingMat = new THREE.MeshLambertMaterial({ color: 0x993399 });
  const leftWing = new THREE.Mesh(wingGeo, wingMat);
  leftWing.position.set(-1.2, 0, 0.2);
  leftWing.rotation.z = 0.15; // Slight sweep
  leftWing.rotation.y = -0.3; // Swept back
  group.add(leftWing);

  // Right wing
  const rightWing = new THREE.Mesh(wingGeo.clone(), wingMat.clone());
  rightWing.position.set(1.2, 0, 0.2);
  rightWing.rotation.z = -0.15;
  rightWing.rotation.y = 0.3;
  group.add(rightWing);

  // Wing tip accents (emissive)
  const tipGeo = new THREE.SphereGeometry(0.12, 6, 6);
  const tipMat = new THREE.MeshLambertMaterial({ color: 0xff00ff, emissive: 0xff00ff, emissiveIntensity: 0.8 });
  const leftTip = new THREE.Mesh(tipGeo, tipMat);
  leftTip.position.set(-2.2, 0, 0.2);
  group.add(leftTip);
  const rightTip = new THREE.Mesh(tipGeo.clone(), tipMat.clone());
  rightTip.position.set(2.2, 0, 0.2);
  group.add(rightTip);

  this.mesh = group;
  break;
}
```

**Step 2: Add rotation toward movement direction**

In the Swooper section of `updateSpecialEffects()`:
```typescript
case EnemySubType.SWOOPER:
  // Bank into turns
  if (this.mesh && this.velocity.length() > 0.1) {
    this.mesh.rotation.z = -this.velocity.x * 0.03; // Bank angle
    this.mesh.rotation.x = this.velocity.y * 0.02;  // Pitch
  }
  break;
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add Swooper procedural mesh with body, wings, and emissive tips"
```

---

## Task 5: Mech — Procedural Mesh with Walk Animation

**Files:**
- Modify: `src/core/entities/Enemy.ts`

**Step 1: Implement Mech mesh**

```typescript
case EnemySubType.MECH: {
  const group = new THREE.Group();

  // Torso
  const torsoGeo = new THREE.BoxGeometry(1.2, 1.0, 0.8);
  const torsoMat = new THREE.MeshLambertMaterial({ color: 0x777777 });
  const torso = new THREE.Mesh(torsoGeo, torsoMat);
  torso.position.y = 1.2;
  torso.name = 'torso';
  group.add(torso);

  // Head (dome)
  const headGeo = new THREE.SphereGeometry(0.35, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const headMat = new THREE.MeshLambertMaterial({ color: 0x999999 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.9;
  group.add(head);

  // Visor (red stripe)
  const visorGeo = new THREE.BoxGeometry(0.5, 0.1, 0.4);
  const visorMat = new THREE.MeshLambertMaterial({ color: 0xff0000, emissive: 0xff0000, emissiveIntensity: 0.6 });
  const visor = new THREE.Mesh(visorGeo, visorMat);
  visor.position.set(0, 1.75, 0.25);
  group.add(visor);

  // Shoulder cannon
  const cannonGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
  const cannonMat = new THREE.MeshLambertMaterial({ color: 0x555555 });
  const cannon = new THREE.Mesh(cannonGeo, cannonMat);
  cannon.rotation.x = Math.PI / 2;
  cannon.position.set(0.5, 1.6, -0.2);
  group.add(cannon);

  // Left leg
  const legGeo = new THREE.CylinderGeometry(0.15, 0.2, 1.0, 6);
  const legMat = new THREE.MeshLambertMaterial({ color: 0x666666 });
  const leftLeg = new THREE.Mesh(legGeo, legMat);
  leftLeg.position.set(-0.35, 0.5, 0);
  leftLeg.name = 'leftLeg';
  group.add(leftLeg);

  // Right leg
  const rightLeg = new THREE.Mesh(legGeo.clone(), legMat.clone());
  rightLeg.position.set(0.35, 0.5, 0);
  rightLeg.name = 'rightLeg';
  group.add(rightLeg);

  this.mesh = group;
  break;
}
```

**Step 2: Add walk animation in updateSpecialEffects()**

```typescript
case EnemySubType.MECH: {
  if (!this.mesh) break;
  const leftLeg = this.mesh.getObjectByName('leftLeg');
  const rightLeg = this.mesh.getObjectByName('rightLeg');
  if (leftLeg && rightLeg) {
    const walkCycle = Math.sin(this.elapsedTime * 6.0) * 0.4;
    leftLeg.rotation.x = walkCycle;
    rightLeg.rotation.x = -walkCycle;
  }
  // Slight body bob
  const torso = this.mesh.getObjectByName('torso');
  if (torso) {
    torso.position.y = 1.2 + Math.abs(Math.sin(this.elapsedTime * 6.0)) * 0.1;
  }
  break;
}
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add Mech procedural mesh with walking leg animation"
```

---

## Task 6: Orb — Procedural Mesh with Open/Close

**Files:**
- Modify: `src/core/entities/Enemy.ts`

**What:** Two hemispheres that separate when "open", revealing a glowing inner core. Only vulnerable when open.

**Step 1: Implement Orb mesh**

```typescript
case EnemySubType.ORB: {
  const group = new THREE.Group();

  // Top hemisphere
  const hemiGeo = new THREE.SphereGeometry(0.6, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
  const hemiMat = new THREE.MeshLambertMaterial({ color: 0x334444, metalness: 0.8 });
  const topHalf = new THREE.Mesh(hemiGeo, hemiMat);
  topHalf.name = 'topHalf';
  group.add(topHalf);

  // Bottom hemisphere (flipped)
  const bottomHalf = new THREE.Mesh(hemiGeo.clone(), hemiMat.clone());
  bottomHalf.rotation.x = Math.PI;
  bottomHalf.name = 'bottomHalf';
  group.add(bottomHalf);

  // Inner core (only visible when open)
  const coreGeo = new THREE.IcosahedronGeometry(0.3, 1);
  const coreMat = new THREE.MeshLambertMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1.0,
  });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'core';
  core.visible = false;
  group.add(core);

  this.mesh = group;
  break;
}
```

**Step 2: Add open/close animation in updateSpecialEffects()**

```typescript
case EnemySubType.ORB: {
  if (!this.mesh) break;
  const behavior = this.movementBehavior as OrbMovement | null;
  const isOpen = behavior?.isOpen ?? false;
  const topHalf = this.mesh.getObjectByName('topHalf');
  const bottomHalf = this.mesh.getObjectByName('bottomHalf');
  const core = this.mesh.getObjectByName('core');

  // Animate separation
  const targetSep = isOpen ? 0.5 : 0;
  if (topHalf) {
    topHalf.position.y += (targetSep - topHalf.position.y) * 0.1;
  }
  if (bottomHalf) {
    bottomHalf.position.y += (-targetSep - bottomHalf.position.y) * 0.1;
  }
  if (core) {
    core.visible = isOpen;
    core.rotation.y += 0.05;
    core.rotation.x += 0.03;
  }
  break;
}
```

**Step 3: Override onDamage for invulnerability when closed**

Add to Enemy class or override in onUpdate:

```typescript
// In handleDamage or a new method, check if Orb is closed:
if (this.enemyType === EnemySubType.ORB) {
  const behavior = this.movementBehavior as OrbMovement | null;
  if (!behavior?.isOpen) {
    // Reflect damage — orb is invulnerable when closed
    this.health = Math.min(this.maxHealth, this.health + damage);
    return;
  }
}
```

Actually, it's cleaner to override `onDamage()` in Enemy:

In `handleDamage()` method, add at the top:
```typescript
// Orbs are invulnerable when closed
if (this.enemyType === EnemySubType.ORB) {
  const behavior = this.movementBehavior as OrbMovement | null;
  if (behavior && !behavior.isOpen) {
    // Restore health — damage was already applied by BaseEntity.onDamage()
    this.health = Math.min(this.maxHealth, this.health + damage);
    return;
  }
}
```

**Step 4: Only fire when open**

In `onUpdate()`, modify the firing condition for Orbs:
```typescript
if (this.enemyType === EnemySubType.ORB) {
  const behavior = this.movementBehavior as OrbMovement | null;
  if (!behavior?.isOpen) {
    // Don't fire when closed
    this.fireCooldownTimer = 0; // Reset so it fires immediately when opening
  }
}
```

**Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add Orb procedural mesh with open/close animation and invulnerability"
```

---

## Task 7: Striker — Procedural Mesh

**Files:**
- Modify: `src/core/entities/Enemy.ts`

**Step 1: Implement Striker mesh**

```typescript
case EnemySubType.STRIKER: {
  const group = new THREE.Group();

  // Fuselage (elongated cone)
  const fuselageGeo = new THREE.ConeGeometry(0.25, 2.0, 6);
  const fuselageMat = new THREE.MeshLambertMaterial({ color: 0xddddff });
  const fuselage = new THREE.Mesh(fuselageGeo, fuselageMat);
  fuselage.rotation.x = Math.PI / 2; // Point forward
  group.add(fuselage);

  // Delta wings
  const wingGeo = new THREE.BoxGeometry(1.8, 0.05, 0.6);
  const wingMat = new THREE.MeshLambertMaterial({ color: 0xaaaaee });
  const wings = new THREE.Mesh(wingGeo, wingMat);
  wings.position.z = 0.3;
  group.add(wings);

  // Tail fin
  const tailGeo = new THREE.BoxGeometry(0.05, 0.5, 0.3);
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xaaaaee });
  const tail = new THREE.Mesh(tailGeo, tailMat);
  tail.position.set(0, 0.25, 0.7);
  group.add(tail);

  // Exhaust glow
  const exhaustGeo = new THREE.SphereGeometry(0.15, 6, 6);
  const exhaustMat = new THREE.MeshLambertMaterial({
    color: 0xff6600,
    emissive: 0xff6600,
    emissiveIntensity: 1.0,
  });
  const exhaust = new THREE.Mesh(exhaustGeo, exhaustMat);
  exhaust.position.z = 1.0;
  exhaust.name = 'exhaust';
  group.add(exhaust);

  this.mesh = group;
  break;
}
```

**Step 2: Add dive tilt animation**

```typescript
case EnemySubType.STRIKER: {
  if (!this.mesh) break;
  // Tilt toward movement direction
  if (this.velocity.length() > 1) {
    const dir = this.velocity.clone().normalize();
    this.mesh.rotation.x = -dir.y * 0.5;
    this.mesh.rotation.z = -dir.x * 0.3;
  }
  // Flickering exhaust
  const exhaust = this.mesh.getObjectByName('exhaust');
  if (exhaust) {
    exhaust.scale.setScalar(0.8 + Math.random() * 0.4);
  }
  break;
}
```

**Step 3: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add Striker procedural mesh with dive tilt and exhaust effect"
```

---

## Task 8: Serpent Boss — Multi-Segment Procedural Mesh

**Files:**
- Modify: `src/core/entities/Enemy.ts`

**What:** The Serpent is a multi-segment boss. The head is the main entity; body segments are child meshes that trail behind using position history. Only the head takes damage (collision bounds are on the head only).

**Step 1: Add segment tracking properties**

Add to Enemy class:

```typescript
// Serpent-specific: body segment tracking
private bodySegments: THREE.Mesh[] = [];
private positionHistory: THREE.Vector3[] = [];
private historyInterval: number = 4; // Record position every N frames
private historyFrameCount: number = 0;
private segmentCount: number = 10;
```

**Step 2: Implement Serpent mesh**

```typescript
case EnemySubType.SERPENT: {
  const group = new THREE.Group();

  // Head
  const headGeo = new THREE.DodecahedronGeometry(1.2, 1);
  const headMat = new THREE.MeshLambertMaterial({ color: 0x44dd66 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.name = 'head';
  group.add(head);

  // Jaw (two halves for open/close)
  const jawGeo = new THREE.BoxGeometry(0.8, 0.3, 0.6);
  const jawMat = new THREE.MeshLambertMaterial({ color: 0x33bb55 });
  const upperJaw = new THREE.Mesh(jawGeo, jawMat);
  upperJaw.position.set(0, 0.2, -0.8);
  upperJaw.name = 'upperJaw';
  group.add(upperJaw);
  const lowerJaw = new THREE.Mesh(jawGeo.clone(), jawMat.clone());
  lowerJaw.position.set(0, -0.2, -0.8);
  lowerJaw.name = 'lowerJaw';
  group.add(lowerJaw);

  // Eye accents
  const eyeGeo = new THREE.SphereGeometry(0.2, 6, 6);
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.8 });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.5, 0.4, -0.5);
  group.add(leftEye);
  const rightEye = new THREE.Mesh(eyeGeo.clone(), eyeMat.clone());
  rightEye.position.set(0.5, 0.4, -0.5);
  group.add(rightEye);

  // Body segments (added to scene directly, not to group, so they trail independently)
  this.bodySegments = [];
  this.positionHistory = [];
  for (let i = 0; i < this.segmentCount; i++) {
    const scale = 1.0 - (i / this.segmentCount) * 0.6; // Taper from 1.0 to 0.4
    const segGeo = new THREE.SphereGeometry(0.8 * scale, 8, 6);
    const hue = 0.33 + (i / this.segmentCount) * 0.1; // Green gradient
    const segColor = new THREE.Color().setHSL(hue, 0.8, 0.4);
    const segMat = new THREE.MeshLambertMaterial({ color: segColor });
    const segment = new THREE.Mesh(segGeo, segMat);
    segment.position.copy(this.position);
    segment.castShadow = true;
    this.bodySegments.push(segment);
  }

  this.mesh = group;
  break;
}
```

**Step 3: Add segments to scene after mesh is added**

In `onUpdate()`, add a one-time segment scene add:

```typescript
// Serpent: add body segments to scene if not yet added
if (this.enemyType === EnemySubType.SERPENT && this.bodySegments.length > 0) {
  for (const seg of this.bodySegments) {
    if (!seg.parent && this.scene) {
      this.scene.add(seg);
    }
  }
}
```

**Step 4: Update body segments in updateSpecialEffects()**

```typescript
case EnemySubType.SERPENT: {
  if (!this.mesh) break;

  // Record position history
  this.historyFrameCount++;
  if (this.historyFrameCount % this.historyInterval === 0) {
    this.positionHistory.unshift(this.position.clone());
    if (this.positionHistory.length > this.segmentCount * 3) {
      this.positionHistory.pop();
    }
  }

  // Update body segments to follow position history
  for (let i = 0; i < this.bodySegments.length; i++) {
    const historyIndex = (i + 1) * 2;
    if (historyIndex < this.positionHistory.length) {
      const target = this.positionHistory[historyIndex];
      this.bodySegments[i].position.lerp(target, 0.15);
    }
  }

  // Jaw animation: open when about to fire
  const upperJaw = this.mesh.getObjectByName('upperJaw');
  const lowerJaw = this.mesh.getObjectByName('lowerJaw');
  const aboutToFire = this.fireCooldownTimer > this.fireCooldown * 0.8;
  if (upperJaw && lowerJaw) {
    const jawOpen = aboutToFire ? 0.4 : 0;
    upperJaw.position.y += (0.2 + jawOpen - upperJaw.position.y) * 0.1;
    lowerJaw.position.y += (-0.2 - jawOpen - lowerJaw.position.y) * 0.1;
  }
  break;
}
```

**Step 5: Clean up segments on destroy**

Override `destroy()` or add to existing destroy logic:

```typescript
// In destroy(), remove body segments from scene
if (this.enemyType === EnemySubType.SERPENT) {
  for (const seg of this.bodySegments) {
    if (seg.parent) {
      seg.parent.remove(seg);
    }
    seg.geometry.dispose();
    if (seg.material instanceof THREE.Material) {
      seg.material.dispose();
    }
  }
  this.bodySegments = [];
}
```

**Step 6: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add Serpent boss with multi-segment trailing body and jaw animation"
```

---

## Task 9: Guardian Boss — Core with Orbiting Shields

**Files:**
- Modify: `src/core/entities/Enemy.ts`
- May modify: `src/core/EntityManager.ts` (for shield entities)

**What:** Central core with 5 orbiting shield pieces. Shields must be destroyed before core takes damage. Shields are separate entities (spawned as ENEMY type with a new shield behavior) or managed as child meshes with individual health.

For simplicity, shields are child meshes of the Guardian group with tracked health. The Guardian overrides `handleDamage()` to redirect damage to shields first.

**Step 1: Add shield tracking properties**

```typescript
// Guardian-specific
private shieldMeshes: THREE.Mesh[] = [];
private shieldHealth: number[] = [];
private shieldMaxHealth: number = 80;
private shieldsDestroyed: number = 0;
private totalShields: number = 5;
```

**Step 2: Implement Guardian mesh**

```typescript
case EnemySubType.GUARDIAN: {
  const group = new THREE.Group();

  // Core: large octahedron
  const coreGeo = new THREE.OctahedronGeometry(1.5, 1);
  const coreMat = new THREE.MeshLambertMaterial({ color: 0x880000 });
  const core = new THREE.Mesh(coreGeo, coreMat);
  core.name = 'core';
  group.add(core);

  // Core inner glow
  const innerGeo = new THREE.IcosahedronGeometry(0.8, 1);
  const innerMat = new THREE.MeshLambertMaterial({
    color: 0xff2200,
    emissive: 0xff2200,
    emissiveIntensity: 0.5,
  });
  const inner = new THREE.Mesh(innerGeo, innerMat);
  inner.name = 'coreInner';
  group.add(inner);

  // Orbiting shields
  this.shieldMeshes = [];
  this.shieldHealth = [];
  for (let i = 0; i < this.totalShields; i++) {
    const shieldGeo = new THREE.RingGeometry(1.5, 2.2, 6);
    const shieldMat = new THREE.MeshLambertMaterial({
      color: 0x4488ff,
      emissive: 0x2244aa,
      emissiveIntensity: 0.6,
      side: THREE.DoubleSide,
    });
    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.name = `shield_${i}`;
    shield.userData['shieldIndex'] = i;
    group.add(shield);
    this.shieldMeshes.push(shield);
    this.shieldHealth.push(this.shieldMaxHealth);
  }

  this.mesh = group;
  break;
}
```

**Step 3: Animate shields in updateSpecialEffects()**

```typescript
case EnemySubType.GUARDIAN: {
  if (!this.mesh) break;

  // Rotate core
  const core = this.mesh.getObjectByName('core');
  const coreInner = this.mesh.getObjectByName('coreInner');
  if (core) {
    core.rotation.y += 0.01;
    core.rotation.x += 0.005;
  }
  if (coreInner) {
    coreInner.rotation.y -= 0.02;

    // Pulse faster when shields are gone
    const exposedRatio = this.shieldsDestroyed / this.totalShields;
    const pulseSpeed = 2.0 + exposedRatio * 4.0;
    const pulseAmount = 0.1 + exposedRatio * 0.15;
    coreInner.scale.setScalar(1.0 + Math.sin(this.elapsedTime * pulseSpeed) * pulseAmount);
  }

  // Orbit shields at different tilts
  for (let i = 0; i < this.shieldMeshes.length; i++) {
    const shield = this.shieldMeshes[i];
    if (this.shieldHealth[i] <= 0) {
      shield.visible = false;
      continue;
    }
    const orbitAngle = this.elapsedTime * (0.5 + i * 0.1) + (i * Math.PI * 2 / this.totalShields);
    const orbitTilt = (i / this.totalShields) * Math.PI;
    const radius = 3.5;
    shield.position.set(
      Math.cos(orbitAngle) * radius,
      Math.sin(orbitAngle + orbitTilt) * radius * 0.5,
      Math.sin(orbitAngle) * radius,
    );
    shield.lookAt(0, 0, 0); // Face center
    shield.rotation.z += 0.02; // Spin

    // Flash when damaged (low health)
    const healthPct = this.shieldHealth[i] / this.shieldMaxHealth;
    if (healthPct < 0.3) {
      shield.visible = Math.sin(this.elapsedTime * 10) > 0;
    }
  }
  break;
}
```

**Step 4: Override handleDamage() for shield redirection**

In the `handleDamage()` method, add Guardian logic:

```typescript
// Guardian: redirect damage to shields first
if (this.enemyType === EnemySubType.GUARDIAN && this.shieldsDestroyed < this.totalShields) {
  // Find the shield closest to the damage source (approximate: pick a random alive shield)
  const aliveShields = this.shieldHealth
    .map((h, i) => ({ health: h, index: i }))
    .filter(s => s.health > 0);
  if (aliveShields.length > 0) {
    const target = aliveShields[Math.floor(Math.random() * aliveShields.length)];
    this.shieldHealth[target.index] -= damage;
    if (this.shieldHealth[target.index] <= 0) {
      this.shieldHealth[target.index] = 0;
      this.shieldsDestroyed++;
    }
    // Restore the health that BaseEntity.onDamage already subtracted from core
    this.health = Math.min(this.maxHealth, this.health + damage);
    return;
  }
}
```

**Step 5: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add Guardian boss with orbiting shields and shield-first damage redirection"
```

---

## Task 10: Wave Spawner System

**Files:**
- Create: `src/core/WaveSpawner.ts`
- Modify: `src/main.ts` (integrate into game loop)
- Modify: `src/core/world/WorldGenerator.ts` (disable old inline enemy spawning)

**What:** Replace per-tile random spawning with a distance-triggered wave system. The WaveSpawner tracks distance traveled and spawns enemy waves based on configurable rules.

**Step 1: Create WaveSpawner**

Create `src/core/WaveSpawner.ts`:

```typescript
import * as THREE from 'three';
import { EnemySubType } from './types';
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
  // Mixed waves (appear later with difficulty)
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
  private scene: THREE.Scene;

  private lastWaveDistance: number = 0;
  private waveInterval: number = 300;       // Distance units between waves
  private minWaveInterval: number = 150;    // Minimum after scaling
  private bossInterval: number = 3000;      // Distance between boss encounters
  private lastBossDistance: number = 0;
  private bossActive: boolean = false;
  private waveCount: number = 0;

  constructor(entityManager: EntityManager, gameState: GameState, scene: THREE.Scene) {
    this.entityManager = entityManager;
    this.gameState = gameState;
    this.scene = scene;
  }

  public update(): void {
    if (this.gameState.gameOver) return;

    const distance = this.gameState.distanceTraveled;

    // Check boss spawn
    if (!this.bossActive && distance - this.lastBossDistance >= this.bossInterval && distance > 2000) {
      this.spawnBossWave(distance);
      this.lastBossDistance = distance;
      return; // Don't spawn regular wave on same tick
    }

    // Check regular wave spawn
    const scaledInterval = Math.max(
      this.minWaveInterval,
      this.waveInterval - (distance / 100) * 5, // Gets tighter over time
    );

    if (!this.bossActive && distance - this.lastWaveDistance >= scaledInterval) {
      this.spawnRegularWave(distance);
      this.lastWaveDistance = distance;
    }

    // Check if boss was defeated
    if (this.bossActive) {
      const enemies = this.entityManager.getEntitiesByType(
        // Need to import EntityType
      );
      // Check if any boss-type enemies remain
      const bossAlive = enemies?.some(e =>
        (e.subType === EnemySubType.SERPENT || e.subType === EnemySubType.GUARDIAN)
        && e.state !== 'dead'
      );
      if (!bossAlive) {
        this.bossActive = false;
      }
    }
  }

  private spawnRegularWave(distance: number): void {
    // Pick wave based on difficulty
    const maxWaveIndex = Math.min(
      REGULAR_WAVES.length,
      Math.floor(distance / 500) + 3, // Unlock more wave types as distance increases
    );
    const waveIndex = Math.floor(Math.random() * maxWaveIndex);
    const wave = REGULAR_WAVES[waveIndex];
    if (!wave) return;

    this.spawnWave(wave, distance);
    this.waveCount++;
  }

  private spawnBossWave(distance: number): void {
    const bossIndex = Math.floor(Math.random() * BOSS_WAVES.length);
    const wave = BOSS_WAVES[bossIndex];
    if (!wave) return;

    this.bossActive = true;
    this.spawnWave(wave, distance);
  }

  private spawnWave(wave: WaveDefinition, _distance: number): void {
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
    const ahead = playerPos.z - 120; // Spawn distance ahead of player
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
```

**Step 2: Integrate WaveSpawner into main.ts**

In `src/main.ts`, after the game loop setup:

```typescript
import { WaveSpawner } from './core/WaveSpawner';

// After entityManager and gameState are created:
const waveSpawner = new WaveSpawner(entityManager, gameState, scene);
```

In the animate loop, add:
```typescript
waveSpawner.update();
```

**Step 3: Disable old per-tile enemy spawning in WorldGenerator**

In `src/core/world/WorldGenerator.ts`, in the `populateChunk()` method (around lines 654-661), comment out or remove the `spawnEnemies()` call:

```typescript
// Old per-tile enemy spawning — replaced by WaveSpawner
// this.spawnEnemies(chunk, spawnRules, difficultyMultiplier);
```

Keep the method itself in case it's useful for reference, but it's no longer called.

**Step 4: Verify and commit**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: add WaveSpawner for distance-triggered enemy waves, replace per-tile spawning"
```

---

## Task 11: Final Integration, Polish, and Difficulty Tuning

**Files:**
- Modify: Various files for tuning
- Verify: `npx tsc --noEmit && npm run build`

**What:** Final pass to ensure everything works together. Tune health values, firing rates, movement speeds. Test each enemy type spawns and behaves correctly.

**Step 1: Verify all enemy types spawn correctly**

Run the game and check:
- [ ] Swoopers appear from sides in sine-wave patterns
- [ ] Mechs walk along ground and leap
- [ ] Orbs fly in as cluster, split, open/close/fire, retreat
- [ ] Strikers dive-bomb from distance
- [ ] Serpent boss weaves with trailing segments
- [ ] Guardian boss orbits with shields

**Step 2: Tune combat balance**

Adjust in `Enemy.initializeByType()`:
- Health values feel right for weapon levels 1-5
- Firing rates aren't overwhelming or trivial
- Boss health takes a reasonable amount of time to deplete

**Step 3: Tune movement speeds**

Adjust in `MovementBehavior.ts`:
- Enemies don't outrun the player's ability to dodge
- Bosses stay visible on screen
- Swoopers don't fly off too fast

**Step 4: Verify enemy projectiles**

- [ ] Enemy projectiles damage player
- [ ] Player can shoot down enemy projectiles
- [ ] Spread patterns look correct
- [ ] Cooldowns feel right

**Step 5: Verify despawning**

- [ ] Regular enemies despawn when behind camera
- [ ] Bosses stay alive until defeated
- [ ] Orbs retreat after cycles
- [ ] No entity leaks (check entity count stays reasonable)

**Step 6: Final build**

Run: `npx tsc --noEmit && npm run build`

```bash
git add -A
git commit -m "feat: enemy system overhaul complete — 6 types with movement AI, projectiles, procedural meshes"
```

---

## Summary of All Files

| File | Action | Purpose |
|------|--------|---------|
| `src/core/types.ts` | Modify | Update EnemySubType enum |
| `src/core/entities/Enemy.ts` | Modify | Firing system, movement integration, 6 procedural meshes, per-type behaviors |
| `src/core/enemies/MovementBehavior.ts` | Create | 6 movement behavior classes |
| `src/core/WaveSpawner.ts` | Create | Distance-triggered wave spawning system |
| `src/core/EntityManager.ts` | Modify | Add spawnProjectile() if missing |
| `src/core/entities/Projectile.ts` | Modify | Ensure enemy-vs-player projectile collision works |
| `src/core/world/WorldGenerator.ts` | Modify | Disable old per-tile enemy spawning |
| `src/core/world/BiomeManager.ts` | Modify | Update biome enemy rules to new types |
| `src/main.ts` | Modify | Integrate WaveSpawner |
