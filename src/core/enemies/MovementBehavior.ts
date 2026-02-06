/**
 * Movement behavior system for enemies.
 * Each enemy type has a pluggable movement behavior that controls
 * how it moves through the world.
 */

import * as THREE from 'three';

// ─── Interfaces ──────────────────────────────────────────────

export interface MovementContext {
  position: THREE.Vector3;
  playerPosition: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  deltaTime: number;
  elapsedTime: number;
  railsSpeed: number;
}

export interface MovementBehavior {
  update(ctx: MovementContext, velocity: THREE.Vector3): void;
  shouldDespawn(ctx: MovementContext): boolean;
}

// ─── SwooperMovement ─────────────────────────────────────────
// Sine-wave flight from one side. Flies toward player on Z with
// sine-wave lateral motion. Despawns if behind player by 50+ or
// alive > 12s.

export class SwooperMovement implements MovementBehavior {
  private readonly fromRight: boolean;

  constructor(fromRight: boolean) {
    this.fromRight = fromRight;
  }

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    const lateralDir = this.fromRight ? -1 : 1;
    const sineWave = Math.sin(ctx.elapsedTime * 3.0) * 15.0;

    // Fly toward the player on Z
    const toPlayerZ = ctx.playerPosition.z - ctx.position.z;
    velocity.z = Math.sign(toPlayerZ) * 30;

    // Sine-wave lateral movement
    velocity.x = sineWave * lateralDir;

    // Slight vertical oscillation
    velocity.y = Math.cos(ctx.elapsedTime * 2.0) * 5.0;
  }

  shouldDespawn(ctx: MovementContext): boolean {
    // Behind player by 50+ units
    if (ctx.position.z > ctx.playerPosition.z + 50) return true;
    // Alive more than 12 seconds
    if (ctx.elapsedTime > 12) return true;
    return false;
  }
}

// ─── MechMovement ────────────────────────────────────────────
// Walks along ground toward player. Periodically leaps (parabolic
// arc with gravity). Strafes left/right slowly. Despawns if behind
// player by 50+ or alive > 15s.

export class MechMovement implements MovementBehavior {
  private leapTimer: number = 0;
  private leapInterval: number = 4.0;
  public isLeaping: boolean = false;
  private strafeDir: number = 1;
  private strafeSwitchTimer: number = 0;

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    this.leapTimer += ctx.deltaTime;
    this.strafeSwitchTimer += ctx.deltaTime;

    // Switch strafe direction every 2 seconds
    if (this.strafeSwitchTimer > 2.0) {
      this.strafeDir *= -1;
      this.strafeSwitchTimer = 0;
    }

    // Walk toward player on Z
    const toPlayerZ = ctx.playerPosition.z - ctx.position.z;
    velocity.z = Math.sign(toPlayerZ) * 10;

    // Strafe
    velocity.x = this.strafeDir * 5;

    // Leap logic
    if (!this.isLeaping && this.leapTimer >= this.leapInterval) {
      this.isLeaping = true;
      this.leapTimer = 0;
      velocity.y = 25; // upward impulse
    }

    if (this.isLeaping) {
      // Apply gravity — terrain clamping in Enemy.onUpdate() handles landing
      velocity.y -= 40 * ctx.deltaTime;
    } else {
      // On ground — no vertical movement
      velocity.y = 0;
    }
  }

  shouldDespawn(ctx: MovementContext): boolean {
    if (ctx.position.z > ctx.playerPosition.z + 50) return true;
    if (ctx.elapsedTime > 15) return true;
    return false;
  }
}

// ─── OrbMovement ─────────────────────────────────────────────
// 4 phases: approach -> split -> cycle -> retreat.
// In cycle phase, alternates open/close on 3s timer.
// During cycle, velocity.z matches -railsSpeed so orb stays in place.
// Despawns after retreat phase.

type OrbPhase = 'approach' | 'split' | 'cycle' | 'retreat';

export class OrbMovement implements MovementBehavior {
  private phase: OrbPhase = 'approach';
  private phaseTimer: number = 0;
  private cycleTimer: number = 0;
  public isOpen: boolean = false;
  private readonly splitOffset: THREE.Vector3;

  constructor(splitOffset: THREE.Vector3) {
    this.splitOffset = splitOffset.clone();
  }

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    this.phaseTimer += ctx.deltaTime;

    switch (this.phase) {
      case 'approach':
        // Move toward player position
        velocity.z = -30;
        velocity.x = 0;
        velocity.y = 0;

        // Transition to split after 2s or close enough
        if (this.phaseTimer > 2.0 || ctx.position.distanceTo(ctx.playerPosition) < 80) {
          this.phase = 'split';
          this.phaseTimer = 0;
        }
        break;

      case 'split':
        // Move to split offset position
        velocity.x = this.splitOffset.x * 2;
        velocity.y = this.splitOffset.y * 2;
        velocity.z = -ctx.railsSpeed; // Match rails to stay in place

        // Transition to cycle after 1s
        if (this.phaseTimer > 1.0) {
          this.phase = 'cycle';
          this.phaseTimer = 0;
          this.cycleTimer = 0;
        }
        break;

      case 'cycle':
        // Stay in relative position by matching rails speed
        velocity.z = -ctx.railsSpeed;
        velocity.x = Math.sin(ctx.elapsedTime * 1.5) * 5;
        velocity.y = Math.cos(ctx.elapsedTime * 1.5) * 3;

        // Toggle open/close every 3 seconds
        this.cycleTimer += ctx.deltaTime;
        if (this.cycleTimer >= 3.0) {
          this.isOpen = !this.isOpen;
          this.cycleTimer = 0;
        }

        // After 10 seconds in cycle, retreat
        if (this.phaseTimer > 10.0) {
          this.phase = 'retreat';
          this.phaseTimer = 0;
          this.isOpen = false;
        }
        break;

      case 'retreat':
        // Fly away quickly
        velocity.z = 40;
        velocity.y = 15;
        velocity.x = 0;
        break;
    }
  }

  shouldDespawn(ctx: MovementContext): boolean {
    // Despawn after retreat phase has run for 3 seconds
    if (this.phase === 'retreat' && this.phaseTimer > 3.0) return true;
    // Safety despawn if very far behind
    if (ctx.position.z > ctx.playerPosition.z + 100) return true;
    return false;
  }
}

// ─── StrikerMovement ─────────────────────────────────────────
// 3 phases: approach -> dive -> pullup.
// Fast dive-bomb toward player position. Pulls up and arcs away
// if misses. Despawns after pullup.

type StrikerPhase = 'approach' | 'dive' | 'pullup';

export class StrikerMovement implements MovementBehavior {
  private phase: StrikerPhase = 'approach';
  private phaseTimer: number = 0;
  private diveTarget: THREE.Vector3 = new THREE.Vector3();

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    this.phaseTimer += ctx.deltaTime;

    switch (this.phase) {
      case 'approach':
        // Fly toward player, high altitude
        velocity.z = -40;
        velocity.y = 10;
        velocity.x = 0;

        // Start dive when close enough or after 2s
        if (this.phaseTimer > 2.0 || ctx.position.distanceTo(ctx.playerPosition) < 100) {
          this.phase = 'dive';
          this.phaseTimer = 0;
          this.diveTarget.copy(ctx.playerPosition);
        }
        break;

      case 'dive': {
        // Dive toward the captured target position
        const toDive = new THREE.Vector3()
          .subVectors(this.diveTarget, ctx.position)
          .normalize()
          .multiplyScalar(60);
        velocity.copy(toDive);

        // Transition to pullup after 2s or if past target
        if (this.phaseTimer > 2.0 || ctx.position.z < this.diveTarget.z - 10) {
          this.phase = 'pullup';
          this.phaseTimer = 0;
        }
        break;
      }

      case 'pullup':
        // Arc upward and away
        velocity.z = -20;
        velocity.y = 30;
        velocity.x = Math.sin(ctx.elapsedTime * 2) * 10;
        break;
    }
  }

  shouldDespawn(ctx: MovementContext): boolean {
    // Despawn after pullup for 3s
    if (this.phase === 'pullup' && this.phaseTimer > 3.0) return true;
    // Safety despawn
    if (ctx.position.z > ctx.playerPosition.z + 80) return true;
    return false;
  }
}

// ─── SerpentMovement ─────────────────────────────────────────
// Figure-8 weave pattern. Tracks player Z (stays ~60 ahead).
// Never despawns (must be killed).

export class SerpentMovement implements MovementBehavior {
  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    // Figure-8 pattern using Lissajous curve
    const t = ctx.elapsedTime * 0.8;
    velocity.x = Math.sin(t) * 20;
    velocity.y = Math.sin(t * 2) * 10;

    // Track player Z, staying ~60 units ahead
    const targetZ = ctx.playerPosition.z - 60;
    const zDiff = targetZ - ctx.position.z;
    velocity.z = zDiff * 0.5; // Smooth tracking
  }

  shouldDespawn(_ctx: MovementContext): boolean {
    // Never despawns - must be killed
    return false;
  }
}

// ─── GuardianMovement ────────────────────────────────────────
// Slow circular orbit. Tracks player Z (stays ~50 ahead).
// Pauses every 5s for 2s to fire. Never despawns.

export class GuardianMovement implements MovementBehavior {
  public isPaused: boolean = false;
  private pauseTimer: number = 0;
  private moveTimer: number = 0;

  update(ctx: MovementContext, velocity: THREE.Vector3): void {
    // Handle pause/unpause cycle
    if (this.isPaused) {
      this.pauseTimer += ctx.deltaTime;
      if (this.pauseTimer >= 2.0) {
        this.isPaused = false;
        this.pauseTimer = 0;
        this.moveTimer = 0;
      }
      // While paused, only track Z
      velocity.x = 0;
      velocity.y = 0;
    } else {
      this.moveTimer += ctx.deltaTime;
      if (this.moveTimer >= 5.0) {
        this.isPaused = true;
        this.moveTimer = 0;
      }
      // Slow circular orbit
      const t = ctx.elapsedTime * 0.5;
      velocity.x = Math.cos(t) * 12;
      velocity.y = Math.sin(t) * 8;
    }

    // Track player Z, staying ~50 units ahead
    const targetZ = ctx.playerPosition.z - 50;
    const zDiff = targetZ - ctx.position.z;
    velocity.z = zDiff * 0.3; // Smooth tracking
  }

  shouldDespawn(_ctx: MovementContext): boolean {
    // Never despawns - must be killed
    return false;
  }
}
