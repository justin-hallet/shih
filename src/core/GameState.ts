import * as THREE from 'three';
import type { BiomeType } from './world/types';
import type { EntityManager } from './EntityManager';
import type { CollisionDebugRenderer } from '../utils/CollisionDebugRenderer';
import type { OutlinePass } from '../shaders/OutlinePass';
import type { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import type { HUD } from '../components/HUD';

/**
 * Typed, centralized game state.
 * Replaces the ad-hoc scene.userData string-key bag.
 */
export class GameState {
  // --- Game flags ---
  gameOver = false;
  playerInDeathSequence = false;

  // --- Speed system ---
  readonly baseSpeed: number;
  speedLevel: number;
  railsSpeed: number;
  speedBoostTimeout: ReturnType<typeof setTimeout> | null = null;
  originalSpeedLevel: number | null = null;

  // --- Session tracking ---
  gameStage = 1;
  distanceTraveled = 0;
  frameCount = 0;
  lastBiome: BiomeType | null = null;
  lastPlayerPosition = new THREE.Vector3();

  // --- Player flight ---
  playerDistanceAbove: number;

  // --- Mouse ---
  mouseX = 0;

  // --- Movement ---
  movementStrafe = true;

  // --- Terrain visualization ---
  showWireframe = false;
  showSurface = true;

  // --- Debug flags ---
  debugObstacles = false;
  debugEnemies = false;
  debugPowerups = false;
  collisionDebugEnabled = false;

  // --- Cached direction ---
  lastForwardDir = { x: 0, y: 0, z: -1 };
  lastRailsSpeed = 0;

  // --- References stored for cross-system access ---
  // These were previously on scene.userData for other systems to find.
  hud: HUD | null = null;
  entityManager: EntityManager | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  outlinePass: OutlinePass | null = null;
  ssaoPass: SSAOPass | null = null;
  collisionDebugRenderer: CollisionDebugRenderer | null = null;

  constructor(options: {
    baseSpeed: number;
    startingSpeedLevel: number;
    hoverHeight: number;
  }) {
    this.baseSpeed = options.baseSpeed;
    this.speedLevel = options.startingSpeedLevel;
    this.railsSpeed = this.getSpeedFromLevel(options.startingSpeedLevel);
    this.playerDistanceAbove = options.hoverHeight;
  }

  getSpeedFromLevel(level: number): number {
    return this.baseSpeed * level;
  }

  resetForNewGame(
    startingSpeedLevel: number,
    hoverHeight: number,
    initialPosition: { x: number; y: number; z: number },
  ): void {
    this.gameOver = false;
    this.playerInDeathSequence = false;
    if (this.speedBoostTimeout) {
      clearTimeout(this.speedBoostTimeout);
      this.speedBoostTimeout = null;
    }
    this.originalSpeedLevel = null;
    this.speedLevel = startingSpeedLevel;
    this.railsSpeed = this.getSpeedFromLevel(startingSpeedLevel);
    this.gameStage = 1;
    this.distanceTraveled = 0;
    this.frameCount = 0;
    this.lastBiome = null;
    this.lastPlayerPosition.set(initialPosition.x, initialPosition.y, initialPosition.z);
    this.playerDistanceAbove = hoverHeight;
    this.mouseX = 0;
  }
}
