/**
 * Player Entity - The main protagonist (Space Harrier)
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { BaseEntity } from '../Entity';
import { EntityType, AnimationType, EntityState } from '../types';

export class Player extends BaseEntity {
  // Player-specific properties
  public ammo!: number;
  public maxAmmo!: number;
  public weaponLevel!: number;
  public invulnerableTime!: number;

  private static gameOverCallback?: () => void;
  private static onDeathCallback?: () => void;
  private static onRespawnCallback?: () => void;

  // Visual effects
  private hasOutlineEffect: boolean = false;

  // Movement constraints
  public maxSpeed!: number;
  public acceleration!: number;
  public deceleration!: number;

  // Animation properties
  private mixer?: THREE.AnimationMixer;
  private animations: Map<string, THREE.AnimationAction> = new Map();
  private currentAnimation: string = 'running';
  private isModelLoaded: boolean = false;

  // Rotation tracking
  private currentRotationY: number = 0;

  // Animation state tracking
  private isNearGround: boolean = true;
  private isStrafing: boolean = false;
  private strafeDirection: 'left' | 'right' | null = null;
  private lastGroundState: boolean = true;
  private transitionTimer: number = 0;
  private isAscending: boolean = false;
  private isDescending: boolean = false;
  private isTurning: boolean = false;
  private turnDirection: 'left' | 'right' | null = null;

  // Banking/leaning for flight dynamics
  private targetBankAngle: number = 0;
  private currentBankAngle: number = 0;
  private targetPitchAngle: number = 0;
  private currentPitchAngle: number = 0;

  // Model switching
  private availableModels: string[] = ['bot', 'female', 'racer', 'mouse', 'machine'];
  private currentModelIndex: number = 0;

  // Death sequence control
  private isInDeathSequence: boolean = false;

  constructor(position = new THREE.Vector3(0, 0, 0), scene?: THREE.Scene) {
    super(EntityType.PLAYER, 'harrier', position, scene);

    // Initialize with default values
    this.reset();
    this.createMesh();
  }

  // Static method to set game over callback
  public static setGameOverCallback(callback: () => void): void {
    Player.gameOverCallback = callback;
  }

  // Static method to set death callback
  public static setOnDeathCallback(callback: () => void): void {
    Player.onDeathCallback = callback;
  }

  // Static method to set respawn callback
  public static setOnRespawnCallback(callback: () => void): void {
    Player.onRespawnCallback = callback;
  }

  /**
   * Reset player to initial state
   * Used both in constructor and when restarting the game
   */
  public reset(initialValues?: {
    health?: number;
    weaponLevel?: number;
    ammo?: number;
    position?: { x: number; y: number; z: number };
  }): void {
    // Player stats - health is now 0-8 scale (displayed as shield segments)
    this.maxHealth = 8;
    this.health = initialValues?.health ?? this.maxHealth;
    this.maxAmmo = 250; // Reduced from 999 to match HUD max
    this.ammo = initialValues?.ammo ?? 0;
    this.weaponLevel = initialValues?.weaponLevel ?? 1;
    this.invulnerableTime = 0;

    // Movement properties - increased to accommodate speed levels 1-5 (50-250 units/sec)
    this.maxSpeed = 300.0; // Allow for speed boosts beyond level 5
    this.acceleration = 20.0;
    this.deceleration = 15.0;

    // Collision
    this.collisionBounds = { radius: 0.8 };

    // Reset BaseEntity properties
    this.velocity.set(0, 0, 0); // Stop all movement
    this.animationType = AnimationType.IDLE;
    this.animationFrame = 0;
    this.state = EntityState.ACTIVE;

    // Reset Player-specific animation state
    this.currentRotationY = 0;
    this.isNearGround = true;
    this.isStrafing = false;
    this.strafeDirection = null;
    this.lastGroundState = true;
    this.transitionTimer = 0;
    this.isAscending = false;
    this.isDescending = false;
    this.isTurning = false;
    this.turnDirection = null;

    // Reset banking/flight dynamics
    this.targetBankAngle = 0;
    this.currentBankAngle = 0;
    this.targetPitchAngle = 0;
    this.currentPitchAngle = 0;

    // Reset visual effects
    this.hasOutlineEffect = false;

    // Reset current animation to default
    this.currentAnimation = 'running';

    // Set position if provided
    if (initialValues?.position) {
      this.position.x = initialValues.position.x;
      this.position.y = initialValues.position.y;
      this.position.z = initialValues.position.z;
    }

    // Note: Model switching state (currentModelIndex) is intentionally NOT reset
    // to preserve player's model choice across game sessions
  }

  private createMesh(): void {
    if (!this.scene) return;

    // Load all animation models
    this.loadAnimationModels();
  }

  private async loadAnimationModels(): Promise<void> {
    const loader = new FBXLoader();

    // Base model with skin (T-pose) - use current selected model
    const currentModel = this.availableModels[this.currentModelIndex];
    const baseModelFile = `/src/assets/models/${currentModel}.fbx`;

    // Animation files (no skin, animations only)
    const animationFiles = [
      { name: 'running', file: '/src/assets/models/running.fbx' },
      { name: 'jump', file: '/src/assets/models/jump.fbx' },
      { name: 'flying', file: '/src/assets/models/flying.fbx' },
      { name: 'strafe_left', file: '/src/assets/models/strafe-left.fbx' },
      { name: 'strafe_right', file: '/src/assets/models/strafe-right.fbx' },
      { name: 'death', file: '/src/assets/models/death.fbx' },
    ];

    try {
      // Load the base T-pose model with skin
      const baseFbx = await this.loadFBXModel(loader, baseModelFile);
      this.setupBaseMesh(baseFbx);

      // Load all animations from separate files
      for (const animFile of animationFiles) {
        try {
          const fbx = await this.loadFBXModel(loader, animFile.file);
          if (fbx.animations && fbx.animations.length > 0) {
            // Fix bone naming mismatch between base model and animations
            const fixedClip = this.fixAnimationBoneNames(fbx.animations[0], baseFbx);

            // Create animation action using the base mesh's mixer
            const action = this.mixer!.clipAction(fixedClip);
            this.animations.set(animFile.name, action);
          }
        } catch (error) {
          // Silently continue if animation fails to load
        }
      }

      // Start with running animation if available, otherwise stay in T-pose
      if (this.animations.has('running')) {
        this.playAnimation('running');
      }
      this.isModelLoaded = true;
    } catch {
      this.createFallbackMesh();
    }
  }

  private loadFBXModel(loader: FBXLoader, path: string): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      loader.load(
        path,
        fbx => resolve(fbx),
        () => {
          // Loading progress - no logging needed
        },
        error => reject(error),
      );
    });
  }

  private setupBaseMesh(fbx: THREE.Group): void {
    // Scale the model to fit the scene
    fbx.scale.setScalar(0.04);

    // Orient the model so we see the back (character runs forward)
    // Initial rotation to face away from camera
    fbx.rotation.y = Math.PI;

    // Position the model correctly
    fbx.position.set(0, 0, 0);

    // Enable shadows
    fbx.traverse(child => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = false;
      }
    });

    // Set up animation mixer
    this.mixer = new THREE.AnimationMixer(fbx);

    this.mesh = fbx;
    this.scene!.add(this.mesh);

    // Calculate proper collision bounds from the FBX model
    this.updateCollisionBoundsFromModel();
  }

  private updateCollisionBoundsFromModel(): void {
    if (!this.mesh || !this.mixer) return;

    // Get the current animation state
    const currentAction = this.animations.get(this.currentAnimation);
    if (!currentAction) return;

    // Calculate bounding box of the mesh in its current animated state
    const box = new THREE.Box3();
    this.mesh.traverse(child => {
      if (child instanceof THREE.Mesh) {
        // Update the mesh's world matrix to get current animated state
        child.updateWorldMatrix(true, false);
        // Expand box to include this mesh's bounds
        box.expandByObject(child);
      }
    });

    // Get size and center in world space
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // Calculate radius from actual mesh bounds
    const flying = this.currentAnimation === 'flying';

    // Use the largest horizontal dimension for radius
    const radius = Math.max(Math.max(size.x, size.y), size.z) * (flying ? 0.2 : 0.5);

    // Add a small padding for gameplay
    const finalRadius = radius + 0.5;

    // Update collision bounds
    this.collisionBounds = { radius: finalRadius };

    // Update center offset in world space
    this.modelCenterOffset = center.clone().sub(this.mesh.position);
  }

  private fixAnimationBoneNames(
    sourceClip: THREE.AnimationClip,
    targetModel: THREE.Group,
  ): THREE.AnimationClip {
    // Create a mapping of available bones in the target model
    const targetBones = new Set<string>();
    targetModel.traverse(child => {
      if (child.type === 'Bone' || child.name.includes('mixamorig')) {
        targetBones.add(child.name);
      }
    });

    // Create new tracks with corrected bone names
    const newTracks: THREE.KeyframeTrack[] = [];

    for (const track of sourceClip.tracks) {
      const trackName = track.name;
      const parts = trackName.split('.');
      const boneName = parts[0];
      const property = parts.slice(1).join('.');

      let targetBoneName = boneName;

      // Try to find matching bone in target model
      if (!targetBones.has(boneName)) {
        // Try common naming variations
        const variations = [
          boneName.replace('mixamorig1', 'mixamorig'),
          boneName.replace('mixamorig', 'mixamorig1'),
          boneName.replace('mixamorig1', 'mixamorig6'), // Handle mixamorig6 (racer model)
          boneName.replace('mixamorig6', 'mixamorig1'), // Handle mixamorig1 to mixamorig6
          boneName.replace('1', '6'), // Replace 1 with 6
          boneName.replace('6', '1'), // Replace 6 with 1
          boneName.replace('1', ''), // Remove trailing numbers
          boneName + '1', // Add trailing number
          boneName + '6', // Add trailing number 6
        ];

        for (const variation of variations) {
          if (targetBones.has(variation)) {
            targetBoneName = variation;
            break;
          }
        }
      }

      // Create new track with corrected name
      const newTrackName = `${targetBoneName}.${property}`;
      const TrackConstructor = track.constructor as any;
      const newTrack = new TrackConstructor(newTrackName, track.times, track.values);
      newTracks.push(newTrack);
    }

    return new THREE.AnimationClip(sourceClip.name + '_fixed', sourceClip.duration, newTracks);
  }

  private createFallbackMesh(): void {
    if (!this.scene) return;

    // Create a simple Harrier representation as fallback
    const geometry = new THREE.ConeGeometry(0.3, 1.2, 8);
    const material = new THREE.MeshLambertMaterial({
      color: 0x00ff00,
    });

    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;
    this.mesh.rotation.x = Math.PI / 2; // Point forward
    this.scene.add(this.mesh);
  }

  // Player-specific update logic
  protected onUpdate(deltaTime: number): void {
    // Update animation mixer
    if (this.mixer) {
      this.mixer.update(deltaTime);
    }

    // Update animation state based on current conditions
    this.updateAnimationState(deltaTime);

    // Calculate proper collision bounds from the FBX model
    this.updateCollisionBoundsFromModel();

    // Update banking/leaning for flight dynamics
    this.updateFlightDynamics(deltaTime);

    // Handle invulnerability
    if (this.invulnerableTime > 0) {
      this.invulnerableTime -= deltaTime;

      // Create glowing outline effect during invulnerability
      if (!this.hasOutlineEffect) {
        this.createInvulnerabilityOutline();
      }
    } else {
      // Remove outline when invulnerability ends
      if (this.hasOutlineEffect) {
        this.removeInvulnerabilityOutline();
      }
    }

    // Apply deceleration if no input
    this.applyDeceleration(deltaTime);

    // Clamp velocity to max speed
    const speed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2);

    if (speed > this.maxSpeed) {
      const scale = this.maxSpeed / speed;
      this.velocity.x *= scale;
      this.velocity.y *= scale;
      this.velocity.z *= scale;
    }
  }

  private applyDeceleration(deltaTime: number): void {
    const decel = this.deceleration * deltaTime;

    this.velocity.x = this.lerp(this.velocity.x, 0, decel);
    this.velocity.y = this.lerp(this.velocity.y, 0, decel);
    this.velocity.z = this.lerp(this.velocity.z, 0, decel);
  }

  private lerp(start: number, end: number, factor: number): number {
    return start + (end - start) * Math.min(factor, 1);
  }

  // Movement input methods
  public moveLeft(intensity = 1.0): void {
    this.velocity.x -= this.acceleration * intensity;
  }

  public moveRight(intensity = 1.0): void {
    this.velocity.x += this.acceleration * intensity;
  }

  public moveUp(intensity = 1.0): void {
    this.velocity.y += this.acceleration * intensity;
  }

  public moveDown(intensity = 1.0): void {
    this.velocity.y -= this.acceleration * intensity;
  }

  // Set player rotation to match movement direction
  public setRotation(rotationY: number): void {
    this.currentRotationY = rotationY;
    this.updateMeshRotation();
  }

  // Update mesh rotation including banking and pitch
  private updateMeshRotation(): void {
    if (this.mesh) {
      // Player should counter-rotate to stay aligned with direction of travel
      // Math.PI makes model face away from camera, +currentRotationY counter-rotates
      this.mesh.rotation.y = Math.PI + this.currentRotationY;

      // Apply banking (roll) and pitch for flight dynamics
      this.mesh.rotation.z = this.currentBankAngle;
      this.mesh.rotation.x = this.currentPitchAngle;
    }
  }

  // Update flight dynamics (banking and pitching)
  private updateFlightDynamics(deltaTime: number): void {
    const lerpSpeed = 8.0; // How quickly to interpolate to target angles

    // Calculate target bank angle based on strafing/turning (only when flying)
    if (!this.isNearGround) {
      const maxBankAngle = Math.PI / 6; // 30 degrees max bank
      let bankDirection: 'left' | 'right' | null = null;

      // Check for strafing first (Q/E keys)
      if (this.isStrafing && this.strafeDirection) {
        bankDirection = this.strafeDirection;
      }
      // Check for turning (A/D keys)
      else if (this.isTurning && this.turnDirection) {
        bankDirection = this.turnDirection;
      }

      if (bankDirection) {
        // Invert banking: left = lean left (negative Z), right = lean right (positive Z)
        this.targetBankAngle = bankDirection === 'left' ? -maxBankAngle : maxBankAngle;
      } else {
        this.targetBankAngle = 0;
      }
    } else {
      this.targetBankAngle = 0;
    }

    // Calculate target pitch angle based on vertical movement (only when flying)
    if (!this.isNearGround && (this.isAscending || this.isDescending)) {
      const maxPitchAngle = Math.PI / 8; // 22.5 degrees max pitch
      if (this.isAscending) {
        this.targetPitchAngle = maxPitchAngle; // Nose up
      } else if (this.isDescending) {
        this.targetPitchAngle = -maxPitchAngle; // Nose down
      }
    } else {
      this.targetPitchAngle = 0;
    }

    // Smoothly interpolate to target angles
    this.currentBankAngle = this.lerp(
      this.currentBankAngle,
      this.targetBankAngle,
      lerpSpeed * deltaTime,
    );
    this.currentPitchAngle = this.lerp(
      this.currentPitchAngle,
      this.targetPitchAngle,
      lerpSpeed * deltaTime,
    );

    // Update mesh rotation
    this.updateMeshRotation();
  }

  // Animation control methods
  private playAnimation(animationName: string): void {
    if (!this.mixer || !this.animations.has(animationName)) return;

    // Stop current animation
    const currentAction = this.animations.get(this.currentAnimation);
    if (currentAction && currentAction !== this.animations.get(animationName)) {
      currentAction.fadeOut(0.2);
    }

    // Start new animation
    const newAction = this.animations.get(animationName)!;
    newAction.reset().fadeIn(0.2).play();

    this.currentAnimation = animationName;
  }

  // Update animation state based on player conditions
  private updateAnimationState(deltaTime: number): void {
    if (!this.isModelLoaded) return;

    // Don't override animations during death sequence
    if (this.isInDeathSequence) return;

    // Update transition timer
    if (this.transitionTimer > 0) {
      this.transitionTimer -= deltaTime;
    }

    // Check for ground state changes
    const groundStateChanged = this.lastGroundState !== this.isNearGround;
    if (groundStateChanged) {
      this.lastGroundState = this.isNearGround;
      // Trigger jump animation when leaving ground or landing
      this.transitionTimer = 0.6; // Jump animation duration for transitions
    }

    // Determine appropriate animation
    let targetAnimation = 'running';

    // Animation sequence: Running/Strafing -> Jump -> Flying
    if (this.isNearGround) {
      // Player is on or near ground - use ground-based animations
      if (this.isStrafing && this.strafeDirection) {
        targetAnimation = this.strafeDirection === 'left' ? 'strafe_left' : 'strafe_right';
      } else {
        targetAnimation = 'running';
      }
    } else {
      // Player is in the air
      if (this.transitionTimer > 0) {
        // Use jump animation only during takeoff/landing transitions
        targetAnimation = 'jump';
      } else {
        // Use flying animation for all air movement (pitch handles up/down visually)
        targetAnimation = 'flying';
      }
    }

    // Switch animation if needed
    if (targetAnimation !== this.currentAnimation) {
      this.playAnimation(targetAnimation);
    }
  }

  // Public method to set ground distance (called from main.ts)
  public setGroundDistance(distance: number): void {
    // Update internal state for animation decisions
    // Increased threshold - only consider "near ground" when very close
    this.isNearGround = distance < 1;
  }

  // Public method to set strafe state (called from main.ts)
  public setStrafing(isStrafing: boolean, direction: 'left' | 'right' | null = null): void {
    this.isStrafing = isStrafing;
    this.strafeDirection = direction;
  }

  // Public method to set vertical movement state (called from main.ts)
  public setVerticalMovement(isAscending: boolean, isDescending: boolean): void {
    this.isAscending = isAscending;
    this.isDescending = isDescending;
  }

  // Public method to set turning state (called from main.ts)
  public setTurning(isTurning: boolean, direction: 'left' | 'right' | null = null): void {
    this.isTurning = isTurning;
    this.turnDirection = direction;
  }

  // Public method to switch to next model (called from main.ts)
  public switchToNextModel(): void {
    // Move to next model (circular)
    this.currentModelIndex = (this.currentModelIndex + 1) % this.availableModels.length;

    // Remove current mesh from scene
    if (this.mesh && this.scene) {
      this.scene.remove(this.mesh);
    }

    // Clear current animations
    this.animations.clear();
    this.mixer = undefined as any;
    this.isModelLoaded = false;

    // Reset banking angles
    this.targetBankAngle = 0;
    this.currentBankAngle = 0;
    this.targetPitchAngle = 0;
    this.currentPitchAngle = 0;

    // Reload with new model
    this.loadAnimationModels();
  }

  // Public method to get current model name
  public getCurrentModelName(): string {
    return this.availableModels[this.currentModelIndex];
  }

  // Combat methods
  public shoot(): boolean {
    if (this.ammo <= 0 || this.state !== EntityState.ACTIVE) return false;

    // Deplete 0.5 ammo per shot, clamped at 0
    this.ammo = Math.max(0, this.ammo - 0.5);
    this.animationType = AnimationType.ATTACKING;
    this.animationFrame = 0;

    return true;
  }

  public addAmmo(amount: number): void {
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
  }

  public upgradeWeapon(): void {
    this.weaponLevel = Math.min(5, this.weaponLevel + 1);
  }

  // Calculate projectile damage based on player's weapon level
  public getProjectileDamage(projectileType: string): number {
    switch (projectileType) {
      case 'bullet':
        return 15; // Base bullet damage
      case 'missile':
        return 40; // Base missile damage
      case 'laser':
        return 25; // Base laser damage
      case 'plasma':
        return 35; // Base plasma damage
      case 'fireball':
        return 50; // Base fireball damage
      default:
        return 10; // Default damage
    }
  }

  // Centralized power-up handling - all power-up logic should be here
  // Supports both positive and negative amounts
  public powerUp(type: string, amount: number = 1): void {
    // Get HUD reference from scene
    const sceneUser = (this.scene as any)?.userData || {};
    const hud = sceneUser.hud as any;

    switch (type) {
      case 'ammo':
        this.ammo = Math.max(0, Math.min(this.maxAmmo, this.ammo + amount));
        hud?.updateAmmo(this.ammo);
        break;

      case 'health': // Previously called 'shield' but now it's health
        this.health = Math.max(0, Math.min(this.maxHealth, this.health + amount));
        hud?.updateShieldSegments(this.health);

        // If health reaches 0, trigger death
        if (this.health <= 0) {
          this.die();
        }
        break;

      case 'life':
        const currentLives = hud?.getGameState?.().lives || 0;
        const newLives = Math.max(0, Math.min(8, currentLives + amount));
        hud?.updateLives(newLives);

        // If losing a life (negative amount), play death sound and check for game over
        if (amount < 0) {
          // Play player death sound
          const audioManager = this.getAudioManager();
          if (audioManager) {
            audioManager.playPlayerDeathSound(this.position);
          }

          console.log(`💀 Lost a life! Lives remaining: ${newLives}`);

          // If no lives left, trigger game over
          if (newLives <= 0) {
            console.log('💀 Game Over! No lives remaining - triggering game over...');
            this.triggerGameOver();
          }
        }
        break;

      case 'speed':
        // Only handle positive speed boosts for now
        if (amount > 0) {
          // Cancel any existing speed boost timeout
          if (sceneUser.speedBoostTimeout) {
            clearTimeout(sceneUser.speedBoostTimeout);
          }

          // Store original speed level if not already boosted
          if (!sceneUser.originalSpeedLevel) {
            sceneUser.originalSpeedLevel = sceneUser.speedLevel || 1;
          }

          // Apply speed boost: always +1 from original level (not current)
          const originalLevel = sceneUser.originalSpeedLevel;
          const boostedLevel = Math.min(5, originalLevel + amount);

          sceneUser.speedLevel = boostedLevel;
          const baseSpeed = sceneUser.baseSpeed || 50;
          sceneUser.railsSpeed = baseSpeed * boostedLevel;
          hud?.updateSpeed(boostedLevel);

          // Random duration between 5-10 seconds
          const duration = 5000 + Math.random() * 5000;
          sceneUser.speedBoostTimeout = setTimeout(() => {
            // Restore original speed level
            sceneUser.speedLevel = originalLevel;
            sceneUser.railsSpeed = baseSpeed * originalLevel;
            hud?.updateSpeed(originalLevel);

            // Clear boost state
            sceneUser.speedBoostTimeout = null;
            sceneUser.originalSpeedLevel = null;
          }, duration);
        }
        break;

      case 'weapon':
        if (amount > 0) {
          // Cycle levels 1→5, then wrap to 1
          const nextLevel = (this.weaponLevel % 5) + 1;
          this.weaponLevel = nextLevel;
          hud?.updateWeaponLevel(nextLevel);
        } else {
          // For negative amounts, decrease weapon level
          this.weaponLevel = Math.max(1, this.weaponLevel + amount);
          hud?.updateWeaponLevel(this.weaponLevel);
        }
        break;

      default:
        console.warn(`Unknown power-up type: ${type}`);
    }
  }

  // Override damage to work directly with health (0-8 scale)
  public override takeDamage(damage: number): void {
    if (this.invulnerableTime > 0) return;

    // Play enemy/projectile damage sound
    this.getAudioManager()?.playDamageSound('enemy', this.position);

    // Damage directly reduces health (clamped to 0-8 range)
    this.health = Math.max(0, this.health - damage);

    // Update HUD to show health as shield segments
    const sceneUser = (this.scene as any)?.userData || {};
    const hud = sceneUser.hud as any;
    hud?.updateShieldSegments?.(this.health);

    // Grant brief invulnerability
    this.invulnerableTime = 1.5;

    // Check if health reached 0
    if (this.health <= 0) {
      this.die();
    }
  }

  protected override onDie(): void {
    this.animationType = AnimationType.DYING;
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;

    // Handle player respawn logic
    this.handlePlayerDeath();
  }

  private handlePlayerDeath(): void {
    // Prevent double death sequence
    if (this.isInDeathSequence) {
      console.log('⚠️ Death sequence already in progress, skipping...');
      return;
    }

    // Use centralized powerUp system to handle life loss
    this.powerUp('life', -1);

    // If player still has lives, play death animation sequence
    const sceneUser = (this.scene as any)?.userData || {};
    const hud = sceneUser.hud as any;
    const remainingLives = hud?.getGameState?.().lives ?? 0;

    if (remainingLives > 0) {
      // Player has lives left - play death animation and fall to floor
      this.playDeathSequence();
    }
    // Game over logic is now handled in powerUp('life', -1)
  }

  private playDeathSequence(): void {
    // Set flag to prevent animation overrides
    this.isInDeathSequence = true;

    // Trigger death event (stops rails movement, etc.)
    if (Player.onDeathCallback) {
      Player.onDeathCallback();
    }

    // Play death animation
    this.playAnimation('death');

    // Stop horizontal movement but allow falling
    this.velocity.x = 0;
    this.velocity.z = 0;

    // Wait for death animation to complete before falling
    const deathAnimationDuration = 1.5; // 2 seconds for death animation

    setTimeout(() => {
      this.startFallingToFloor();
    }, deathAnimationDuration);
  }

  private startFallingToFloor(): void {
    // Get terrain height and fall to floor
    const terrainY =
      this.scene?.userData?.['worldGenerator']?.getTerrainHeightAt?.(
        this.position.x,
        this.position.z,
      ) || 0;
    const targetY = terrainY + 0.1; // Just above ground

    // Animate falling to floor over 1 second
    const fallDuration = 1000;
    const startY = this.position.y;
    const startTime = Date.now();

    const fallAnimation = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / fallDuration, 1);

      // Ease-in falling motion
      const easedProgress = progress * progress;
      this.position.y = startY + (targetY - startY) * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(fallAnimation);
      } else {
        // After falling, wait a moment then respawn
        setTimeout(() => {
          this.respawnPlayer();
        }, 500); // Brief pause on ground
      }
    };

    fallAnimation();
  }

  private triggerGameOver(): void {
    // Stop rails movement
    const sceneUser = (this.scene as any)?.userData || {};
    sceneUser.railsSpeed = 0;
    sceneUser.gameOver = true;

    // Stop player movement
    this.velocity.x = 0;
    this.velocity.y = 0;
    this.velocity.z = 0;

    // Keep player in DEAD state (don't respawn)
    // Call the main game over function
    if (Player.gameOverCallback) {
      Player.gameOverCallback();
    }

    console.log('🛑 Rails stopped - Game Over!');
  }

  private respawnPlayer(): void {
    // Clear death sequence flag
    this.isInDeathSequence = false;

    // Trigger respawn event (resumes rails movement, etc.)
    if (Player.onRespawnCallback) {
      Player.onRespawnCallback();
    }

    // Reset player state
    this.state = EntityState.ACTIVE;
    this.animationType = AnimationType.IDLE;
    this.health = this.maxHealth; // Reset to full health (8 segments)
    this.invulnerableTime = 3.0; // 3 seconds of invulnerability after respawn

    // Start with running animation
    this.playAnimation('running');

    // Update HUD to show full health as shield segments
    const sceneUser = (this.scene as any)?.userData || {};
    const hud = sceneUser.hud as any;
    hud?.updateShieldSegments?.(this.health);

    console.log('🔄 Player respawned with running animation!');
  }

  public override destroy(): void {
    // Call parent destroy first
    super.destroy();

    // Player-specific cleanup
    if (this.mixer) {
      this.mixer.stopAllAction();
    }
  }

  // Collisions
  public override onCollision(other: BaseEntity): void {
    if (this.state !== EntityState.ACTIVE) return;

    // Colliding with obstacles reduces health directly
    if (other.type === EntityType.OBSTACLE) {
      if (this.invulnerableTime > 0) return; // brief i-frames

      // Take 1 damage from obstacle collision
      this.takeDamage(1);
    }
  }

  private createInvulnerabilityOutline(): void {
    if (!this.mesh || !this.scene) return;

    // Get the outline pass from scene userData
    const outlinePass = (this.scene as any)?.userData?.outlinePass;
    if (outlinePass) {
      // Add player mesh to outline pass with red color
      outlinePass.addOutlineObject(this.mesh, new THREE.Color(0xff3333));
      this.hasOutlineEffect = true;
    }
  }

  private removeInvulnerabilityOutline(): void {
    if (!this.mesh || !this.scene) return;

    // Get the outline pass from scene userData
    const outlinePass = (this.scene as any)?.userData?.outlinePass;
    if (outlinePass) {
      // Remove player mesh from outline pass
      outlinePass.removeOutlineObject(this.mesh);
      this.hasOutlineEffect = false;
    }
  }
}
