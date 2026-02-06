/**
 * PlayerController - Manages player movement, altitude, animation states,
 * ammo auto-spawn, and projectile ground-kill logic.
 *
 * Extracted from the animate() loop in main.ts (Task 3).
 */

import * as THREE from 'three';
import { GameState } from './GameState';
import { WorldGenerator } from './world/WorldGenerator';
import { EntityManager } from './EntityManager';
import { CameraController } from './CameraController';
import { EntityType, PowerUpSubType } from './types';

export interface PlayerControllerOptions {
  minFloorClearance: number;
  maxFlightHeight: number;
}

export class PlayerController {
  private gameState: GameState;
  private worldGenerator: WorldGenerator;
  private entityManager: EntityManager;
  private cameraController: CameraController;
  private camera: THREE.PerspectiveCamera;
  private directionalLight: THREE.DirectionalLight;

  private readonly minFloorClearance: number;
  private readonly maxFlightHeight: number;

  constructor(
    gameState: GameState,
    worldGenerator: WorldGenerator,
    entityManager: EntityManager,
    cameraController: CameraController,
    camera: THREE.PerspectiveCamera,
    directionalLight: THREE.DirectionalLight,
    options: PlayerControllerOptions,
  ) {
    this.gameState = gameState;
    this.worldGenerator = worldGenerator;
    this.entityManager = entityManager;
    this.cameraController = cameraController;
    this.camera = camera;
    this.directionalLight = directionalLight;
    this.minFloorClearance = options.minFloorClearance;
    this.maxFlightHeight = options.maxFlightHeight;
  }

  /**
   * Run every frame to handle player movement, animation, altitude,
   * ammo auto-spawn, and projectile ground-kill.
   */
  update(player: any, deltaTime: number): void {
    // Update the shadow rig so shadows follow the camera/player
    this.updateShadowRig(player);

    const turnRate = 2;
    const moveSpeed = 100; // Units per second (strafe)
    const flySpeed = 50; // Vertical movement speed

    // Calculate ground distance for animation logic (used throughout this block)
    const terrainHeight = this.worldGenerator.getTerrainHeightAt(
      player.position.x,
      player.position.z,
    );
    const groundDistance = player.position.y - terrainHeight;

    // Handle left/right movement based on movement style
    let isStrafing = false;
    let strafeDirection: 'left' | 'right' | null = null;
    let isTurning = false;
    let turnDirection: 'left' | 'right' | null = null;

    if (player.getInputState('left_movement')) {
      if (this.gameState.movementStrafe) {
        // Strafe mode - move sideways
        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(this.camera.quaternion);
        left.multiplyScalar(moveSpeed * deltaTime);
        player.position.add(left);
        isStrafing = true;
        strafeDirection = 'left';
      } else if (this.cameraController.getMouseControlEnabled()) {
        // Turn mode - rotate camera (only if camera allows mouse control)
        this.gameState.mouseX += turnRate * deltaTime;
        isTurning = true;
        turnDirection = 'left';
      }
    }

    if (player.getInputState('right_movement')) {
      if (this.gameState.movementStrafe) {
        // Strafe mode - move sideways
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(this.camera.quaternion);
        right.multiplyScalar(moveSpeed * deltaTime);
        player.position.add(right);
        isStrafing = true;
        strafeDirection = 'right';
      } else if (this.cameraController.getMouseControlEnabled()) {
        // Turn mode - rotate camera (only if camera allows mouse control)
        this.gameState.mouseX -= turnRate * deltaTime;
        isTurning = true;
        turnDirection = 'right';
      }
    }

    // Also consider turning as strafing when near ground (for animation)
    if (!isStrafing && groundDistance < 2.0) {
      if (isTurning && turnDirection) {
        isStrafing = true;
        strafeDirection = turnDirection;
      }
    }

    // Track vertical movement for jump animation
    const isAscending = player.getInputState('ascend');
    const isDescending = player.getInputState('descend');

    // Update player animation states
    (player as any).setStrafing(isStrafing, strafeDirection);
    (player as any).setGroundDistance(groundDistance);
    (player as any).setVerticalMovement(isAscending, isDescending);
    (player as any).setTurning(isTurning, turnDirection);

    // Up/down (W/Up and S/Down) - adjust desired distance above terrain
    if (player.getInputState('ascend')) {
      this.gameState.playerDistanceAbove += flySpeed * deltaTime;
      // Cap at max flight height
      const terrainY = this.worldGenerator.getTerrainHeightAt(
        player.position.x,
        player.position.z,
      );
      const maxDistanceAbove = this.maxFlightHeight - terrainY;
      this.gameState.playerDistanceAbove = Math.min(
        this.gameState.playerDistanceAbove,
        maxDistanceAbove,
      );
    }
    if (player.getInputState('descend')) {
      this.gameState.playerDistanceAbove -= flySpeed * deltaTime;
      // Don't go below minimum clearance
      this.gameState.playerDistanceAbove = Math.max(
        this.gameState.playerDistanceAbove,
        this.minFloorClearance,
      );
    }

    // If ammo has reached 0, spawn an ammo power-up ahead of the player
    if ((player as any).ammo <= 0) {
      const fwd = new THREE.Vector3();
      this.camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const spawn = {
        x: player.position.x + fwd.x * 4,
        y: player.position.y,
        z: player.position.z + fwd.z * 4,
      };
      this.entityManager.spawnPowerUp(PowerUpSubType.AMMO, spawn);
      // Give the player enough ammo for several shots so they can continue fighting
      (player as any).ammo = 5.0; // 10 shots worth (0.5 per shot)
    }

    // Every frame: maintain desired distance above terrain
    const terrainY = this.worldGenerator.getTerrainHeightAt(player.position.x, player.position.z);
    player.position.y = terrainY + this.gameState.playerDistanceAbove;

    // Update player's ground distance for animation state
    const distanceFromGround = player.position.y - terrainY;
    player.setGroundDistance(distanceFromGround);

    // Kill projectiles that hit the floor
    const projectiles = this.entityManager.getEntitiesByType(EntityType.PROJECTILE) as any[];
    for (const p of projectiles) {
      const groundY = this.worldGenerator.getTerrainHeightAt(p.position.x, p.position.z);
      if (p.position.y <= groundY + 0.05) {
        p.die?.();
      }
    }
  }

  /**
   * Keep directional light and its shadow frustum centered around the camera/player.
   */
  private updateShadowRig(player: any): void {
    const up = new THREE.Vector3(0, 1, 0);
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();

    // Position light slightly behind and above the camera, offset to one side
    const lightPos = new THREE.Vector3()
      .copy(this.camera.position)
      .addScaledVector(forward, -150)
      .addScaledVector(up, 180)
      .addScaledVector(right, -80);
    this.directionalLight.position.copy(lightPos);

    // Look at player if available, otherwise a point in front of camera
    const targetPos = player
      ? player.position
      : new THREE.Vector3().copy(this.camera.position).addScaledVector(forward, 100);
    this.directionalLight.target.position.copy(targetPos);
    this.directionalLight.target.updateMatrixWorld();

    // Dynamic shadow camera extents based on camera height and speed
    const halfSize = Math.min(800, Math.max(300, this.camera.position.y * 8));
    const ortho = this.directionalLight.shadow.camera as THREE.OrthographicCamera;
    ortho.left = -halfSize;
    ortho.right = halfSize;
    ortho.top = halfSize;
    ortho.bottom = -halfSize;
    ortho.near = 1;
    ortho.far = halfSize * 4;
    ortho.updateProjectionMatrix();
  }
}
