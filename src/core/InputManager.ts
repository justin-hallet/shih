/**
 * InputManager - Centralized input handling system
 * Manages keyboard, mouse, and virtual controller inputs
 */

import * as THREE from 'three';

export type InputAction =
  | 'left_movement'
  | 'right_movement'
  | 'ascend'
  | 'descend'
  | 'fire'
  | 'switch_model';

export interface InputHandler {
  handleInput(action: InputAction, state: boolean): void;
}

export class InputManager {
  private actionStates: Map<InputAction, boolean> = new Map();
  private handlers: Set<InputHandler> = new Set();
  private invertY: boolean = false;

  constructor() {
    this.initializeActionStates();
  }

  private initializeActionStates(): void {
    // Initialize all actions as false
    this.actionStates.set('left_movement', false);
    this.actionStates.set('right_movement', false);
    this.actionStates.set('ascend', false);
    this.actionStates.set('descend', false);
    this.actionStates.set('fire', false);
    this.actionStates.set('switch_model', false);
  }

  public registerHandler(handler: InputHandler): void {
    this.handlers.add(handler);
  }

  public unregisterHandler(handler: InputHandler): void {
    this.handlers.delete(handler);
  }

  public setInvertY(invert: boolean): void {
    this.invertY = invert;
  }

  public setActionState(action: InputAction, state: boolean): void {
    if (this.actionStates.get(action) !== state) {
      this.actionStates.set(action, state);
      // Notify all handlers of the state change
      this.handlers.forEach(handler => handler.handleInput(action, state));
    }
  }

  public getActionState(action: InputAction): boolean {
    return this.actionStates.get(action) || false;
  }

  public handleVirtualControllerInput(direction: THREE.Vector2, firing: boolean): void {
    const threshold = 0.3; // Dead zone threshold

    // Handle horizontal movement
    if (Math.abs(direction.x) > threshold) {
      this.setActionState('right_movement', direction.x > 0);
      this.setActionState('left_movement', direction.x < 0);
    } else {
      this.setActionState('left_movement', false);
      this.setActionState('right_movement', false);
    }

    // Handle vertical movement with invert Y support
    if (Math.abs(direction.y) > threshold) {
      const yUp = this.invertY ? direction.y > 0 : direction.y < 0;
      this.setActionState('ascend', yUp);
      this.setActionState('descend', !yUp);
    } else {
      this.setActionState('ascend', false);
      this.setActionState('descend', false);
    }

    // Handle firing
    this.setActionState('fire', firing);
  }

}

