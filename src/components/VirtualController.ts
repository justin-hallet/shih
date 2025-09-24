import nipplejs from 'nipplejs';

export interface VirtualControllerEvents {
  onMove?: (direction: { x: number; y: number; angle: number; force: number }) => void;
  onMoveEnd?: () => void;
  onFire?: (pressed: boolean) => void;
}

export class VirtualController {
  private joystickManager: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private fireButton!: HTMLElement;
  private container!: HTMLElement;
  private events: VirtualControllerEvents;
  private isEnabled: boolean = false;
  private isLeftHanded: boolean = false;
  private isFirePressed: boolean = false;

  constructor(events: VirtualControllerEvents) {
    this.events = events;
    this.createContainer();
    this.createJoystick();
    this.createFireButton();
    this.setupEventListeners();
  }

  private createContainer(): void {
    this.container = document.createElement('div');
    this.container.id = 'virtual-controller';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      pointer-events: none;
      z-index: 1000;
      display: none;
    `;
    document.body.appendChild(this.container);
  }

  private createJoystick(): void {
    const joystickZone = document.createElement('div');
    joystickZone.id = 'joystick-zone';
    joystickZone.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 20px;
      width: 120px;
      height: 120px;
      pointer-events: auto;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 102, 0, 0.3);
      backdrop-filter: blur(10px);
      transition: all 0.2s ease;
    `;

    this.container.appendChild(joystickZone);

    // Create NippleJS joystick
    this.joystickManager = nipplejs.create({
      zone: joystickZone,
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: '#ff6600',
      size: 80,
      threshold: 0.1,
      fadeTime: 250,
      multitouch: false,
      maxNumberOfNipples: 1,
      dataOnly: false,
      restJoystick: true,
      restOpacity: 0.6,
      lockX: false,
      lockY: false,
    });

    // Handle joystick events
    this.joystickManager.on('start', () => {
      joystickZone.style.background = 'rgba(255, 102, 0, 0.2)';
      joystickZone.style.borderColor = 'rgba(255, 102, 0, 0.6)';
    });

    this.joystickManager.on('move', (_evt: any, data: any) => {
      if (this.events.onMove) {
        // Convert nipple data to normalized coordinates
        const angle = data.angle.radian;
        const force = Math.min(data.force, 1.0); // Clamp force to max 1.0
        const x = Math.cos(angle) * force;
        const y = Math.sin(angle) * force;

        this.events.onMove({
          x: x,
          y: -y, // Invert Y for game coordinates (up is negative)
          angle: data.angle.degree,
          force: force,
        });
      }
    });

    this.joystickManager.on('end', () => {
      joystickZone.style.background = 'rgba(255, 255, 255, 0.1)';
      joystickZone.style.borderColor = 'rgba(255, 102, 0, 0.3)';
      if (this.events.onMoveEnd) {
        this.events.onMoveEnd();
      }
    });
  }

  private createFireButton(): void {
    this.fireButton = document.createElement('button');
    this.fireButton.id = 'fire-button';
    this.fireButton.innerHTML = '🔥';
    this.fireButton.style.cssText = `
      position: absolute;
      bottom: 20px;
      right: 20px;
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6600 0%, #ff4400 100%);
      border: 3px solid rgba(255, 255, 255, 0.3);
      color: white;
      font-size: 24px;
      font-weight: bold;
      cursor: pointer;
      pointer-events: auto;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: all 0.1s ease;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    this.container.appendChild(this.fireButton);
  }

  private setupEventListeners(): void {
    // Fire button events
    const handleFireStart = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.isFirePressed) {
        this.isFirePressed = true;
        this.fireButton.style.transform = 'scale(0.9)';
        this.fireButton.style.background = 'linear-gradient(135deg, #ff4400 0%, #cc3300 100%)';
        this.fireButton.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.4)';
        if (this.events.onFire) {
          this.events.onFire(true);
        }
      }
    };

    const handleFireEnd = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.isFirePressed) {
        this.isFirePressed = false;
        this.fireButton.style.transform = 'scale(1)';
        this.fireButton.style.background = 'linear-gradient(135deg, #ff6600 0%, #ff4400 100%)';
        this.fireButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.3)';
        if (this.events.onFire) {
          this.events.onFire(false);
        }
      }
    };

    // Touch events
    this.fireButton.addEventListener('touchstart', handleFireStart, { passive: false });
    this.fireButton.addEventListener('touchend', handleFireEnd, { passive: false });
    this.fireButton.addEventListener('touchcancel', handleFireEnd, { passive: false });

    // Mouse events (for desktop testing)
    this.fireButton.addEventListener('mousedown', handleFireStart);
    this.fireButton.addEventListener('mouseup', handleFireEnd);
    this.fireButton.addEventListener('mouseleave', handleFireEnd);

    // Prevent context menu
    this.fireButton.addEventListener('contextmenu', e => {
      e.preventDefault();
    });
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.container.style.display = enabled ? 'block' : 'none';

    // Auto-enable on mobile devices
    if (enabled) {
      const isMobile =
        window.innerWidth <= 768 ||
        /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (isMobile) {
        this.container.style.display = 'block';
      }
    }
  }

  public setLeftHanded(leftHanded: boolean): void {
    this.isLeftHanded = leftHanded;
    this.updateLayout();
  }

  private updateLayout(): void {
    const joystickZone = document.getElementById('joystick-zone');
    if (!joystickZone) return;

    if (this.isLeftHanded) {
      // Left-handed: joystick on right, fire button on left
      joystickZone.style.left = 'auto';
      joystickZone.style.right = '20px';
      this.fireButton.style.right = 'auto';
      this.fireButton.style.left = '20px';
    } else {
      // Right-handed (default): joystick on left, fire button on right
      joystickZone.style.right = 'auto';
      joystickZone.style.left = '20px';
      this.fireButton.style.left = 'auto';
      this.fireButton.style.right = '20px';
    }
  }

  public handleResize(): void {
    // Update layout on orientation change
    this.updateLayout();

    // Auto-show/hide based on screen size
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (this.isEnabled && isMobile) {
      this.container.style.display = 'block';
    } else if (!this.isEnabled) {
      this.container.style.display = 'none';
    }
  }

  public destroy(): void {
    if (this.joystickManager) {
      this.joystickManager.destroy();
    }
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }

  public isControllerEnabled(): boolean {
    return this.isEnabled;
  }

  public isControllerLeftHanded(): boolean {
    return this.isLeftHanded;
  }
}
