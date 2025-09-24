/**
 * HUD (Heads-Up Display) Component
 * Classic Space Harrier arcade-style UI overlay
 */

export interface GameState {
  topScore: number;
  currentScore: number;
  lives: number;
  stage: number;
  shieldSegments: number; // 0-8
  weaponLevel: number; // 0-5
  ammo: number; // 0-250
  speed: number; // 5-500
}

export class HUD {
  private hudElement: HTMLElement;
  private gameState: GameState;
  private settingsCallback?: () => void;

  constructor(parentElement: HTMLElement) {
    this.gameState = {
      topScore: 1710570, // Classic high score from the image
      currentScore: 0,
      lives: 3,
      stage: 1,
      shieldSegments: 0,
      weaponLevel: 0,
      ammo: 0,
      speed: 0,
    };

    this.hudElement = this.createHUD();
    parentElement.appendChild(this.hudElement);
    this.updateDisplay();
    this.setupMobileControls();
  }

  private createHUD(): HTMLElement {
    const hud = document.createElement('div');
    hud.id = 'game-hud';
    hud.className = 'game-hud';

    hud.innerHTML = `
      <!-- Top HUD Elements -->
      <div class="hud-top">
        <div class="hud-element hud-top-left" style="flex-direction: row; align-items: center; gap: 12px;">
          <button id="mobile-settings-btn" class="mobile-settings-button" style="
            display: block;
            background: linear-gradient(135deg, #ff6600 0%, #cc4400 100%);
            border: 2px solid #ffaa44;
            border-radius: 8px;
            color: white;
            font-family: 'Orbitron', monospace;
            font-size: 12px;
            font-weight: bold;
            padding: 6px 10px;
            cursor: pointer;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            transition: all 0.2s ease;
            pointer-events: auto;
            z-index: 1001;
          ">⚙</button>
          <div style="display: flex; flex-direction: column; align-items: flex-start;">
            <span class="hud-label">TOP</span>
            <span class="hud-value" id="top-score">1710570</span>
          </div>
        </div>
        <div class="hud-element hud-top-right">
          <span class="hud-label">SCORE</span>
          <span class="hud-value" id="current-score">0</span>
        </div>
      </div>

      <!-- Bottom HUD Elements -->
      <div class="hud-bottom">
        <div class="hud-element hud-bottom-left">
          <div id="stats-bottom-left" style="display:flex; flex-direction:column; gap:10px; align-items:flex-start;">
            <div class="stat" id="stat-ammo" style="display:flex; flex-direction:column; gap:4px; min-width:90px;">
              <span class="hud-label" style="font-size:10px; opacity:0.8;">AMMO</span>
              <span class="hud-value" id="ammo-value">0</span>
            </div>
            <div class="stat" id="stat-weapon" style="display:flex; flex-direction:column; gap:4px;">
              <span class="hud-label" style="font-size:10px; opacity:0.8;">WEAPON</span>
              <div id="weapon-segments" style="display:flex; gap:3px;"></div>
            </div>
            <div class="stat" id="stat-shield" style="display:flex; flex-direction:column; gap:4px;">
              <span class="hud-label" style="font-size:10px; opacity:0.8;">SHIELD</span>
              <div id="shield-segments" style="display:flex; gap:3px;"></div>
            </div>
            <div class="stat" id="stat-lives" style="display:flex; flex-direction:column; gap:4px;">
              <span class="hud-label" style="font-size:10px; opacity:0.8;">LIVES</span>
              <div class="lives-display" id="lives-display"></div>
            </div>
            <div class="stat" id="stat-speed" style="display:flex; flex-direction:column; gap:4px; min-width:90px;">
              <span class="hud-label" style="font-size:10px; opacity:0.8;">SPEED</span>
              <div id="speed-segments" style="display:flex; gap:3px;"></div>
            </div>
          </div>
        </div>
        <div class="hud-element hud-bottom-right">
          <div class="hud-fps" style="display:flex; flex-direction:column; align-items:flex-end; gap:4px; margin-bottom:6px;">
            <span class="hud-label" style="font-size:10px; opacity:0.8;">FPS</span>
            <span class="hud-value" id="fps-value">0</span>
          </div>
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
    const shieldSegsEl = document.getElementById('shield-segments');
    const weaponSegsEl = document.getElementById('weapon-segments');
    const ammoValueEl = document.getElementById('ammo-value');
    const speedSegsEl = document.getElementById('speed-segments');

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

    // Update shield segments (0-8)
    if (shieldSegsEl) {
      shieldSegsEl.innerHTML = '';
      for (let i = 0; i < 8; i++) {
        const seg = document.createElement('span');
        const active = i < this.gameState.shieldSegments;
        seg.style.display = 'inline-block';
        seg.style.width = '10px';
        seg.style.height = '6px';
        seg.style.border = '1px solid rgba(255,255,255,0.6)';
        seg.style.background = active ? 'linear-gradient(180deg, #35f7ff, #0aa1b2)' : 'transparent';
        seg.style.boxShadow = active ? '0 0 6px rgba(53,247,255,0.6)' : 'none';
        shieldSegsEl.appendChild(seg);
      }
    }

    // Update weapon segments (0-5)
    if (weaponSegsEl) {
      weaponSegsEl.innerHTML = '';
      for (let i = 0; i < 5; i++) {
        const seg = document.createElement('span');
        const active = i < this.gameState.weaponLevel;
        seg.style.display = 'inline-block';
        seg.style.width = '8px';
        seg.style.height = '8px';
        seg.style.transform = 'skewX(-20deg)';
        seg.style.border = '1px solid rgba(255,255,255,0.6)';
        seg.style.background = active ? 'linear-gradient(180deg, #ffea00, #ff9900)' : 'transparent';
        seg.style.boxShadow = active ? '0 0 6px rgba(255,220,0,0.6)' : 'none';
        weaponSegsEl.appendChild(seg);
      }
    }

    if (ammoValueEl) ammoValueEl.textContent = `${this.gameState.ammo}`;
    // Update speed segments (0-5)
    if (speedSegsEl) {
      speedSegsEl.innerHTML = '';
      const segments = 5;
      const filled = Math.max(
        0,
        Math.min(segments, Math.round((this.gameState.speed / 500) * segments)),
      );
      for (let i = 0; i < segments; i++) {
        const seg = document.createElement('span');
        const active = i < filled;
        seg.style.display = 'inline-block';
        seg.style.width = '16px';
        seg.style.height = '6px';
        seg.style.border = '1px solid rgba(255,255,255,0.6)';
        seg.style.background = active ? 'linear-gradient(180deg, #7dff76, #2dbf24)' : 'transparent';
        seg.style.boxShadow = active ? '0 0 6px rgba(125,255,118,0.6)' : 'none';
        speedSegsEl.appendChild(seg);
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

  public updateShieldSegments(segments: number): void {
    this.gameState.shieldSegments = Math.max(0, Math.min(8, Math.floor(segments)));
    this.updateDisplay();
  }

  public updateWeaponLevel(level: number): void {
    this.gameState.weaponLevel = Math.max(0, Math.min(5, Math.floor(level)));
    this.updateDisplay();
  }

  public updateAmmo(ammo: number): void {
    this.gameState.ammo = Math.max(0, Math.min(250, Math.floor(ammo)));
    this.updateDisplay();
  }

  public updateSpeed(speed: number): void {
    this.gameState.speed = Math.max(5, Math.min(500, speed));
    this.updateDisplay();
  }

  public updateStage(stage: number): void {
    this.gameState.stage = stage;
    this.updateDisplay();
  }

  public getGameState(): GameState {
    return { ...this.gameState };
  }

  public updateFPS(fps: number): void {
    const fpsEl = document.getElementById('fps-value');
    if (fpsEl) fpsEl.textContent = fps.toString();
  }

  private setupMobileControls(): void {
    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (mobileSettingsBtn) {
      // Always show the button now
      mobileSettingsBtn.style.display = 'block';

      // Add click handler
      mobileSettingsBtn.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        if (this.settingsCallback) {
          this.settingsCallback();
        }
      });

      // Add hover effects
      mobileSettingsBtn.addEventListener('mousedown', () => {
        mobileSettingsBtn.style.transform = 'scale(0.95)';
        mobileSettingsBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.5)';
      });

      mobileSettingsBtn.addEventListener('mouseup', () => {
        mobileSettingsBtn.style.transform = 'scale(1)';
        mobileSettingsBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      });

      // Touch events for mobile
      mobileSettingsBtn.addEventListener('touchstart', e => {
        e.preventDefault();
        mobileSettingsBtn.style.transform = 'scale(0.95)';
        mobileSettingsBtn.style.boxShadow = '0 1px 2px rgba(0,0,0,0.5)';
      });

      mobileSettingsBtn.addEventListener('touchend', e => {
        e.preventDefault();
        mobileSettingsBtn.style.transform = 'scale(1)';
        mobileSettingsBtn.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        if (this.settingsCallback) {
          this.settingsCallback();
        }
      });
    }
  }

  public setSettingsCallback(callback: () => void): void {
    this.settingsCallback = callback;
  }

  public handleResize(): void {
    // Re-setup mobile controls on resize/rotation
    const mobileSettingsBtn = document.getElementById('mobile-settings-btn');
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (mobileSettingsBtn) {
      // Show/hide button based on current screen size
      mobileSettingsBtn.style.display = isMobile ? 'block' : 'block'; // Always show now
    }
  }

  public destroy(): void {
    if (this.hudElement && this.hudElement.parentNode) {
      this.hudElement.parentNode.removeChild(this.hudElement);
    }
  }
}
