/**
 * InputController - Keyboard bindings, key event listeners, and debug/config action handling.
 * Extracted from main.ts to encapsulate the input layer.
 */

import * as THREE from 'three';
import { EntityType, PowerUpSubType } from './types';
import type { GameState } from './GameState';
import type { InputManager, InputAction } from './InputManager';
import type { CellShadingPass } from '../shaders/CellShadingPass';
import type { SettingsPanel } from '../components/SettingsPanel';
import type { CollisionDebugRenderer } from '../utils/CollisionDebugRenderer';
import type { OutlinePass } from '../shaders/OutlinePass';
import type { WorldGenerator } from './world/WorldGenerator';
import type { HUD } from '../components/HUD';
import type { GameOverlay } from '../components/GameOverlay';

// Action type union for all keyboard-triggered actions
export type Action =
  | 'ascend'
  | 'descend'
  | 'left_movement'
  | 'right_movement'
  | 'fire'
  | 'speed_up'
  | 'speed_down'
  | 'toggle_wireframe'
  | 'toggle_surface'
  | 'set_weapon_1'
  | 'set_weapon_2'
  | 'set_weapon_3'
  | 'set_weapon_4'
  | 'set_weapon_5'
  | 'toggle_debug_obstacles'
  | 'toggle_debug_enemies'
  | 'toggle_debug_powerups'
  | 'switch_model'
  | 'toggle_cell_shading'
  | 'adjust_edge_threshold'
  | 'adjust_color_levels'
  | 'toggle_debug_panel'
  | 'toggle_collision_debug'
  | 'cycle_powerup_debug'
  | 'debug_hurt'
  | 'debug_kill';

// Key-to-action mapping
const KeyBindings: Record<string, Action> = {
  // Movement
  KeyW: 'ascend',
  ArrowUp: 'ascend',
  Numpad8: 'ascend',
  KeyS: 'descend',
  ArrowDown: 'descend',
  Numpad2: 'descend',
  KeyA: 'left_movement',
  ArrowLeft: 'left_movement',
  Numpad4: 'left_movement',
  KeyD: 'right_movement',
  ArrowRight: 'right_movement',
  Numpad6: 'right_movement',
  // Fire
  Space: 'fire',
  Enter: 'fire',
  ShiftLeft: 'fire',
  ShiftRight: 'fire',
  Numpad5: 'fire',
  // Speed adjust
  Equal: 'speed_up', // '+' (requires Shift on US keyboards)
  NumpadAdd: 'speed_up',
  Minus: 'speed_down',
  NumpadSubtract: 'speed_down',
  // Visualization toggles
  KeyO: 'toggle_wireframe',
  KeyF: 'toggle_surface',
  // Debug weapon level
  Digit1: 'set_weapon_1',
  Digit2: 'set_weapon_2',
  Digit3: 'set_weapon_3',
  Digit4: 'set_weapon_4',
  Digit5: 'set_weapon_5',
  // Debug bloom overrides
  Digit6: 'toggle_debug_obstacles',
  Digit7: 'toggle_debug_enemies',
  Digit8: 'toggle_debug_powerups',
  Digit9: 'toggle_collision_debug',
  // Model switching
  KeyM: 'switch_model',
  // Cell shading controls
  KeyC: 'toggle_cell_shading',
  KeyV: 'adjust_edge_threshold',
  KeyB: 'adjust_color_levels',
  // Debug panel
  Backquote: 'toggle_debug_panel', // ~ key
  // PowerUp debug
  KeyP: 'cycle_powerup_debug', // P key
  // Debug damage/life
  KeyH: 'debug_hurt', // H key - apply random damage
  KeyK: 'debug_kill', // K key - remove a life
};

export interface InputControllerOptions {
  gameState: GameState;
  inputManager: InputManager;
  cellShadingPass: CellShadingPass;
  settingsPanel: SettingsPanel;
  collisionDebugRenderer: CollisionDebugRenderer;
  outlinePass: OutlinePass;
  worldGenerator: WorldGenerator;
  scene: THREE.Scene;
  hud: HUD | null;
  gameOverlay: GameOverlay;
  isMobileDevice: () => boolean;
}

export class InputController {
  private gameState: GameState;
  private inputManager: InputManager;
  private cellShadingPass: CellShadingPass;
  private settingsPanel: SettingsPanel;
  private collisionDebugRenderer: CollisionDebugRenderer;
  private outlinePass: OutlinePass;
  private worldGenerator: WorldGenerator;
  private scene: THREE.Scene;
  private hud: HUD | null;
  private gameOverlay: GameOverlay;
  private isMobileDevice: () => boolean;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private player: any = null;

  constructor(options: InputControllerOptions) {
    this.gameState = options.gameState;
    this.inputManager = options.inputManager;
    this.cellShadingPass = options.cellShadingPass;
    this.settingsPanel = options.settingsPanel;
    this.collisionDebugRenderer = options.collisionDebugRenderer;
    this.outlinePass = options.outlinePass;
    this.worldGenerator = options.worldGenerator;
    this.scene = options.scene;
    this.hud = options.hud;
    this.gameOverlay = options.gameOverlay;
    this.isMobileDevice = options.isMobileDevice;

    this.registerKeyboardListeners();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public setPlayer(player: any): void {
    this.player = player;
  }

  /**
   * Handle debug/config actions triggered by keyboard or settings panel callbacks.
   * Movement actions (left_movement, right_movement, ascend, descend, fire, switch_model)
   * are routed through InputManager instead.
   */
  public handleAction(action: Action, isDown: boolean): void {
    // One-shot on keyup for toggles
    if (!isDown) {
      if (action === 'toggle_wireframe') {
        this.gameState.showWireframe = !this.gameState.showWireframe;
        this.toggleTerrainVisualization();
        this.scene.userData['showWireframe'] = this.gameState.showWireframe;
      } else if (action === 'toggle_surface') {
        this.gameState.showSurface = !this.gameState.showSurface;
        this.toggleTerrainVisualization();
        this.scene.userData['showSurface'] = this.gameState.showSurface;
      } else if (action.startsWith('set_weapon_')) {
        const level = parseInt(action.split('_')[2] || '1', 10);
        if (this.player) {
          this.player.weaponLevel = level;
          this.hud?.updateWeaponLevel(level);
        }
      } else if (action === 'toggle_debug_obstacles') {
        this.gameState.debugObstacles = !this.gameState.debugObstacles;
        this.applyDebugBloomOverride(EntityType.OBSTACLE, this.gameState.debugObstacles, 0xff00ff, true); // bright pink
      } else if (action === 'toggle_debug_enemies') {
        this.gameState.debugEnemies = !this.gameState.debugEnemies;
        this.applyDebugBloomOverride(EntityType.ENEMY, this.gameState.debugEnemies, 0xff0000, true); // bright red
      } else if (action === 'toggle_debug_powerups') {
        this.gameState.debugPowerups = !this.gameState.debugPowerups;
        this.applyDebugBloomOverride(EntityType.POWERUP, this.gameState.debugPowerups, 0x00ff00, false); // bright green
      } else if (action === 'switch_model') {
        if (this.player) {
          this.player.switchToNextModel();
        }
      } else if (action === 'toggle_cell_shading') {
        // Toggle cell shading pass enabled/disabled
        this.cellShadingPass.enabled = !this.cellShadingPass.enabled;
      } else if (action === 'adjust_edge_threshold') {
        // Cycle through edge threshold values
        const currentThreshold = this.cellShadingPass.getEdgeThreshold();
        const thresholds = [0.05, 0.1, 0.15, 0.2, 0.3];
        const currentIndex = thresholds.indexOf(currentThreshold);
        const nextIndex = (currentIndex + 1) % thresholds.length;
        this.cellShadingPass.setEdgeThreshold(thresholds[nextIndex]);
      } else if (action === 'adjust_color_levels') {
        // Cycle through color quantization levels
        const currentLevels = this.cellShadingPass.getColorLevels();
        const levels = [3, 4, 5, 6, 8];
        const currentIndex = levels.indexOf(currentLevels);
        const nextIndex = (currentIndex + 1) % levels.length;
        this.cellShadingPass.setColorLevels(levels[nextIndex]);
      } else if (action === 'toggle_debug_panel') {
        this.settingsPanel.toggle();
      } else if (action === 'toggle_collision_debug') {
        this.gameState.collisionDebugEnabled = !this.collisionDebugRenderer.isEnabled();
        this.collisionDebugRenderer.setEnabled(this.gameState.collisionDebugEnabled);
      } else if (action === 'cycle_powerup_debug') {
        // Cycle through powerup debug modes
        const modes = ['auto', 'ammo', 'shield', 'weapon_upgrade', 'speed', 'life'] as const;
        const current = this.worldGenerator.getPowerUpDebugOverride();
        const currentIndex = modes.indexOf(current as (typeof modes)[number]);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.worldGenerator.setPowerUpDebugOverride(modes[nextIndex]);
      } else if (action === 'debug_hurt') {
        // Apply random damage to player (0.5 to 2.0 damage)
        if (this.player) {
          const randomDamage = 0.5 + Math.random() * 1.5;
          console.log(`\u{1F6A9} Debug: Applying ${randomDamage.toFixed(2)} damage to player`);
          this.player.onDamage(randomDamage);
        }
      } else if (action === 'debug_kill') {
        // Trigger proper death sequence (with animation)
        if (this.player && !this.gameState.playerInDeathSequence) {
          console.log('\u{1F480} Debug: Triggering player death sequence');
          this.player.die();
        } else if (this.gameState.playerInDeathSequence) {
          console.log('\u{26A0}\u{FE0F} Debug: Death sequence already in progress, ignoring K press');
        }
      }
    }
  }

  /**
   * Apply/restore outline effect for a whole entity type using the outline pass.
   */
  private applyDebugBloomOverride(
    type: EntityType,
    enable: boolean,
    emissiveHex: number,
    _forceDisableBloomOnRestore: boolean,
  ): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ents = this.gameState.entityManager?.getEntitiesByType(type) as any[] | undefined;
    if (!ents) return;

    const outlineColor = new THREE.Color(emissiveHex);

    for (const e of ents) {
      const meshObject = e.mesh as THREE.Object3D | undefined;
      if (!meshObject) continue;

      if (enable) {
        // Add object to outline pass with the specified debug color
        this.outlinePass.addOutlineObject(meshObject, outlineColor);
      } else {
        // For PowerUps, restore their original outline color instead of removing entirely
        if (type === EntityType.POWERUP) {
          // Get the PowerUp's original outline color based on its type
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const powerUpType = (e as any).powerUpType;
          const originalColor = this.getPowerUpOutlineColor(powerUpType);
          if (originalColor) {
            this.outlinePass.addOutlineObject(meshObject, originalColor);
          }
        } else {
          // For other entities (Obstacles, Enemies), remove outline entirely
          this.outlinePass.removeOutlineObject(meshObject);
        }
      }
    }
  }

  /**
   * Helper function to get PowerUp's original outline color.
   */
  private getPowerUpOutlineColor(powerUpType: keyof typeof PowerUpSubType): THREE.Color | null {
    // These colors should match the ones in PowerUp.ts applyBloomMaterial method
    const bloomColors: Record<keyof typeof PowerUpSubType, number> = {
      AMMO: 0xffee66, // bright yellow
      SHIELD: 0x66ccff, // blue
      LIFE: 0xff3333, // red
      SPEED: 0x33ff33, // green
      WEAPON_UPGRADE: 0xffaa44, // orange
    };

    const colorHex = bloomColors[powerUpType];
    return colorHex ? new THREE.Color(colorHex) : null;
  }

  /**
   * Toggle terrain wireframe / surface visibility and persist to scene.userData.
   */
  public toggleTerrainVisualization(): void {
    // Update scene-level flags so future tiles inherit current settings
    this.scene.userData['showWireframe'] = this.gameState.showWireframe;
    this.scene.userData['showSurface'] = this.gameState.showSurface;
    this.scene.traverse(child => {
      // Handle surface mesh visibility
      if (child instanceof THREE.Mesh && child.userData['isTerrain']) {
        child.visible = this.gameState.showSurface;
      }
      // Handle wireframe visibility (now a sibling, not a child)
      if (child instanceof THREE.LineSegments && child.userData['isTerrainWireframe']) {
        child.visible = this.gameState.showWireframe;
        child.renderOrder = 1;
      }
    });
  }

  /**
   * Apply current visualization flags to all terrain already in the scene.
   */
  public applyVisualizationToScene(): void {
    this.scene.traverse(child => {
      if (child instanceof THREE.Mesh && child.userData['isTerrain']) {
        child.visible = !!this.gameState.showSurface;
        for (const sub of child.children) {
          if (sub instanceof THREE.LineSegments && sub.userData['isTerrainWireframe']) {
            sub.visible = !!this.gameState.showWireframe;
            sub.renderOrder = 1;
          }
        }
      }
    });
  }

  /**
   * Register window-level keydown and keyup listeners.
   */
  private registerKeyboardListeners(): void {
    window.addEventListener('keydown', event => {
      // Check if we're on desktop and the game overlay is in 'new' state (showing play button)
      if (!this.isMobileDevice() && this.gameOverlay.getState() === 'new') {
        // Any keypress should trigger the play button on desktop
        this.gameOverlay.triggerPlay();
        event.preventDefault();
        return;
      }

      const action = KeyBindings[event.code];
      if (action) {
        // Route movement/fire actions to InputManager
        const inputActions: string[] = [
          'left_movement',
          'right_movement',
          'ascend',
          'descend',
          'fire',
          'switch_model',
        ];
        if (inputActions.includes(action)) {
          this.inputManager.setActionState(action as InputAction, true);
        } else {
          // Keep debug/config actions in handleAction
          this.handleAction(action, true);
        }

        if (
          action === 'fire' ||
          action === 'ascend' ||
          action === 'descend' ||
          action.startsWith('turn') ||
          action.startsWith('strafe')
        ) {
          event.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', event => {
      const action = KeyBindings[event.code];
      if (action) {
        // Route movement/fire actions to InputManager
        const inputActions: string[] = [
          'left_movement',
          'right_movement',
          'ascend',
          'descend',
          'fire',
          'switch_model',
        ];
        if (inputActions.includes(action)) {
          this.inputManager.setActionState(action as InputAction, false);
        } else {
          // Keep debug/config actions in handleAction
          this.handleAction(action, false);
        }

        if (action === 'speed_up') {
          // Cancel any active speed boost when manually adjusting speed
          if (this.gameState.speedBoostTimeout) {
            clearTimeout(this.gameState.speedBoostTimeout);
            this.gameState.speedBoostTimeout = null;
            this.gameState.originalSpeedLevel = null;
          }

          const newLevel = Math.min(5, this.gameState.speedLevel + 1);
          this.gameState.speedLevel = newLevel;
          this.gameState.railsSpeed = this.gameState.getSpeedFromLevel(newLevel);
          this.hud?.updateSpeed(newLevel);
        } else if (action === 'speed_down') {
          // Cancel any active speed boost when manually adjusting speed
          if (this.gameState.speedBoostTimeout) {
            clearTimeout(this.gameState.speedBoostTimeout);
            this.gameState.speedBoostTimeout = null;
            this.gameState.originalSpeedLevel = null;
          }

          const newLevel = Math.max(1, this.gameState.speedLevel - 1);
          this.gameState.speedLevel = newLevel;
          this.gameState.railsSpeed = this.gameState.getSpeedFromLevel(newLevel);
          this.hud?.updateSpeed(newLevel);
        }
        event.preventDefault();
      }
    });
  }
}
