/**
 * GameOverlay Component
 * Manages fullscreen overlay states for game flow
 */

export type OverlayState = 'new' | 'start' | 'playing' | 'gameover';

export interface GameOverlayEvents {
  onStateChange?: (newState: OverlayState, oldState: OverlayState) => void;
  onPlayButtonClick?: () => void;
}

export class GameOverlay {
  private currentState: OverlayState = 'new';
  private overlayElement: HTMLElement;
  private events: GameOverlayEvents;
  private animationTimeout: number | null = null;

  constructor(events: GameOverlayEvents = {}) {
    this.events = events;
    this.overlayElement = this.createElement();
    this.attachToDOM();
    this.setupEventListeners();
    this.updateDisplay();
  }

  private createElement(): HTMLElement {
    const overlay = document.createElement('div');
    overlay.id = 'game-overlay';
    overlay.className = 'game-overlay';
    return overlay;
  }

  private attachToDOM(): void {
    document.body.appendChild(this.overlayElement);
  }

  private setupEventListeners(): void {
    // Handle play button clicks (event delegation)
    this.overlayElement.addEventListener('click', event => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('play-button')) {
        event.preventDefault();
        event.stopPropagation();
        this.handlePlayButtonClick();
      }
    });

    // Handle touch events for mobile
    this.overlayElement.addEventListener('touchend', event => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('play-button')) {
        event.preventDefault();
        event.stopPropagation();
        this.handlePlayButtonClick();
      }
    });
  }

  private handlePlayButtonClick(): void {
    if (this.currentState === 'new') {
      this.events.onPlayButtonClick?.();
    }
  }

  private updateDisplay(): void {
    // Clear any existing animation timeout
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    // Update CSS class for current state
    this.overlayElement.className = `game-overlay state-${this.currentState}`;

    // Generate content based on current state
    switch (this.currentState) {
      case 'new':
        this.showPlayButton();
        break;
      case 'start':
        this.showGetReady();
        break;
      case 'playing':
        this.showNothing();
        break;
      case 'gameover':
        this.showGameOver();
        break;
    }
  }

  private showPlayButton(): void {
    this.overlayElement.innerHTML = `
      <button class="play-button">PLAY ▶</button>
    `;
  }

  private showGetReady(): void {
    this.overlayElement.innerHTML = `
      <div class="get-ready-message">GET READY!</div>
    `;

    // Auto-transition to playing state after animation completes
    this.animationTimeout = window.setTimeout(() => {
      this.setState('playing');
    }, 2000);
  }

  private showGameOver(): void {
    this.overlayElement.innerHTML = `
      <div class="game-over-message">GAME OVER!</div>
    `;

    // Auto-transition back to new game state after message
    this.animationTimeout = window.setTimeout(() => {
      this.setState('new');
    }, 3000);
  }

  private showNothing(): void {
    this.overlayElement.innerHTML = '';
  }

  public setState(newState: OverlayState): void {
    if (newState === this.currentState) {
      return; // No change needed
    }

    const oldState = this.currentState;
    this.currentState = newState;

    // Update display first
    this.updateDisplay();

    // Trigger state change event
    this.events.onStateChange?.(newState, oldState);
  }

  public getState(): OverlayState {
    return this.currentState;
  }

  public show(): void {
    this.overlayElement.style.display = 'flex';
  }

  public hide(): void {
    this.overlayElement.style.display = 'none';
  }

  public setEvents(events: Partial<GameOverlayEvents>): void {
    this.events = { ...this.events, ...events };
  }

  public destroy(): void {
    // Clear any pending timeouts
    if (this.animationTimeout) {
      clearTimeout(this.animationTimeout);
      this.animationTimeout = null;
    }

    // Remove from DOM
    if (this.overlayElement && this.overlayElement.parentNode) {
      this.overlayElement.parentNode.removeChild(this.overlayElement);
    }
  }

  // Utility methods for external control
  public startGame(): void {
    this.setState('start');
  }

  public endGame(): void {
    this.setState('gameover');
  }

  public resumeGame(): void {
    this.setState('playing');
  }

  public newGame(): void {
    this.setState('new');
  }

  // Check if overlay is currently blocking game interaction
  public isBlocking(): boolean {
    return this.currentState !== 'playing';
  }

  // Check if overlay is visible
  public isVisible(): boolean {
    return this.currentState !== 'playing' && this.overlayElement.style.display !== 'none';
  }

  // Public method to trigger play button functionality (for keyboard shortcuts)
  public triggerPlay(): void {
    this.handlePlayButtonClick();
  }
}
