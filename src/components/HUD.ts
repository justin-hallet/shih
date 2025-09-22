/**
 * HUD (Heads-Up Display) Component
 * Classic Space Harrier arcade-style UI overlay
 */

export interface GameState {
  topScore: number;
  currentScore: number;
  lives: number;
  stage: number;
}

export class HUD {
  private hudElement: HTMLElement;
  private gameState: GameState;

  constructor(parentElement: HTMLElement) {
    this.gameState = {
      topScore: 1710570, // Classic high score from the image
      currentScore: 0,
      lives: 3,
      stage: 1,
    };

    this.hudElement = this.createHUD();
    parentElement.appendChild(this.hudElement);
    this.updateDisplay();
  }

  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.className = 'game-hud';

    hud.innerHTML = `
      <!-- Top HUD Elements -->
      <div class="hud-top">
        <div class="hud-element hud-top-left">
          <span class="hud-label">TOP</span>
          <span class="hud-value" id="top-score">1710570</span>
        </div>
        <div class="hud-element hud-top-right">
          <span class="hud-label">SCORE</span>
          <span class="hud-value" id="current-score">0</span>
        </div>
      </div>

      <!-- Bottom HUD Elements -->
      <div class="hud-bottom">
        <div class="hud-element hud-bottom-left">
          <div class="lives-display" id="lives-display">
            <span class="hud-life">♦</span>
            <span class="hud-life">♦</span>
            <span class="hud-life">♦</span>
          </div>
        </div>
        <div class="hud-element hud-bottom-right">
          <span class="hud-label">STAGE</span>
          <span class="hud-value" id="current-stage">1</span>
        </div>
      </div>
    `;

    return hud;
  }

  // Update the HUD display with current game state
  public updateDisplay(): void {
    const topScoreEl = document.getElementById('top-score');
    const currentScoreEl = document.getElementById('current-score');
    const currentStageEl = document.getElementById('current-stage');
    const livesDisplayEl = document.getElementById('lives-display');

    if (topScoreEl) topScoreEl.textContent = this.gameState.topScore.toString();
    if (currentScoreEl) currentScoreEl.textContent = this.gameState.currentScore.toString();
    if (currentStageEl) currentStageEl.textContent = this.gameState.stage.toString();

    // Update lives display
    if (livesDisplayEl) {
      livesDisplayEl.innerHTML = '';
      for (let i = 0; i < this.gameState.lives; i++) {
        const life = document.createElement('span');
        life.className = 'hud-life';
        life.textContent = '♦';
        livesDisplayEl.appendChild(life);
      }
    }
  }

  // Update game state methods
  public updateScore(score: number): void {
    this.gameState.currentScore = score;
    if (score > this.gameState.topScore) {
      this.gameState.topScore = score;
    }
    this.updateDisplay();
  }

  public updateLives(lives: number): void {
    this.gameState.lives = Math.max(0, lives);
    this.updateDisplay();
  }

  public updateStage(stage: number): void {
    this.gameState.stage = stage;
    this.updateDisplay();
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public destroy(): void {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }
}
