/**
 * CameraController - Manages different camera modes and positioning
 */

import * as THREE from 'three';
import { CameraMode } from './types';

export class CameraController {
  private camera: THREE.PerspectiveCamera;
  private player?: any;
  private currentMode: CameraMode = CameraMode.FOLLOW;
  private mouseX: number = 0;

  // Camera parameters for different modes
  private readonly cameraParams = {
    [CameraMode.FOLLOW]: {
      distance: 12,
      height: 4,
      lookAtOffset: { x: 0, y: 3, z: 0 },
      useMouse: true,
    },
    [CameraMode.ISOMETRIC]: {
      distance: 20,
      height: 15,
      angle: Math.PI * 0.25, // 45 degrees (right side)
      lookAtOffset: { x: 0, y: 2, z: 0 },
      useMouse: false,
    },
    [CameraMode.OVERHEAD]: {
      distance: 0,
      height: 100,
      angle: 0,
      lookAtOffset: { x: 0, y: 0, z: 0 },
      useMouse: false,
    },
  };

  constructor(camera: THREE.PerspectiveCamera) {
    this.camera = camera;
  }

  public setPlayer(player: any): void {
    this.player = player;
  }

  public setMouseRotation(mouseX: number, _mouseY: number): void {
    this.mouseX = mouseX;
    // mouseY reserved for future vertical camera control
  }

  public setCameraMode(mode: CameraMode): void {
    this.currentMode = mode;
    console.log(`🎥 Camera mode changed to: ${mode}`);
  }

  public getCameraMode(): CameraMode {
    return this.currentMode;
  }

  public update(): void {
    if (!this.player) return;

    const params = this.cameraParams[this.currentMode];
    const playerPos = this.player.position;

    switch (this.currentMode) {
      case CameraMode.FOLLOW:
        this.updateFollowCamera(playerPos, params);
        break;
      case CameraMode.ISOMETRIC:
        this.updateIsometricCamera(playerPos, params);
        break;
      case CameraMode.OVERHEAD:
        this.updateOverheadCamera(playerPos, params);
        break;
    }
  }

  private updateFollowCamera(playerPos: THREE.Vector3, params: any): void {
    // Third-person camera that orbits around player based on mouse rotation
    const cameraX = playerPos.x + Math.sin(this.mouseX) * params.distance;
    const cameraZ = playerPos.z + Math.cos(this.mouseX) * params.distance;
    const cameraY = playerPos.y + params.height;

    this.camera.position.set(cameraX, cameraY, cameraZ);

    // Look at a point above the player to position player lower in viewport
    const lookAtTarget = new THREE.Vector3(
      playerPos.x + params.lookAtOffset.x,
      playerPos.y + params.lookAtOffset.y,
      playerPos.z + params.lookAtOffset.z,
    );
    this.camera.lookAt(lookAtTarget);
  }

  private updateIsometricCamera(playerPos: THREE.Vector3, params: any): void {
    // Fixed isometric angle camera
    const cameraX = playerPos.x + Math.sin(params.angle) * params.distance;
    const cameraZ = playerPos.z + Math.cos(params.angle) * params.distance;
    const cameraY = playerPos.y + params.height;

    this.camera.position.set(cameraX, cameraY, cameraZ);

    // Look at the player with slight offset
    const lookAtTarget = new THREE.Vector3(
      playerPos.x + params.lookAtOffset.x,
      playerPos.y + params.lookAtOffset.y,
      playerPos.z + params.lookAtOffset.z,
    );
    this.camera.lookAt(lookAtTarget);
  }

  private updateOverheadCamera(playerPos: THREE.Vector3, params: any): void {
    // Top-down overhead camera
    this.camera.position.set(playerPos.x, playerPos.y + params.height, playerPos.z);

    // Look straight down at the player
    const lookAtTarget = new THREE.Vector3(
      playerPos.x + params.lookAtOffset.x,
      playerPos.y + params.lookAtOffset.y,
      playerPos.z + params.lookAtOffset.z,
    );
    this.camera.lookAt(lookAtTarget);
  }

  public getMouseControlEnabled(): boolean {
    const params = this.cameraParams[this.currentMode];
    return params.useMouse;
  }

  // Get camera mode display name for UI
  public static getCameraModeDisplayName(mode: CameraMode): string {
    switch (mode) {
      case CameraMode.FOLLOW:
        return 'Follow - Third Person';
      case CameraMode.ISOMETRIC:
        return 'Isometric';
      case CameraMode.OVERHEAD:
        return 'Overhead - Top Down';
      default:
        return 'Unknown';
    }
  }

  // Convert string to CameraMode enum
  public static stringToCameraMode(modeString: string): CameraMode {
    switch (modeString.toLowerCase()) {
      case 'follow':
        return CameraMode.FOLLOW;
      case 'isometric':
        return CameraMode.ISOMETRIC;
      case 'overhead':
        return CameraMode.OVERHEAD;
      default:
        return CameraMode.FOLLOW;
    }
  }
}
