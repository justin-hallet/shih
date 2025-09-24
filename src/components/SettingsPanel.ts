/**
 * Settings Panel - Borderlands-style settings controls
 * Modeless popup with cell shading, weapon, and debug controls
 */

export class SettingsPanel {
  private container!: HTMLElement;
  private isVisible: boolean = false;
  private cellShadingPass: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private ssaoPass: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private onWeaponChange?: (weaponType: number) => void;
  private onDebugToggle?: (type: string, enabled: boolean) => void;
  private onDisplayToggle?: (type: string, enabled: boolean) => void;
  private onAudioChange?: (type: string, value: number) => void;
  private player?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private audioManager?: any; // eslint-disable-line @typescript-eslint/no-explicit-any
  private collisionDebugRenderer?: any; // eslint-disable-line @typescript-eslint/no-explicit-any

  constructor() {
    this.createPanel();
  }

  private createPanel(): void {
    // Create main container
    this.container = document.createElement('div');
    this.container.id = 'debug-panel';

    // Check if mobile device
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (isMobile) {
      this.container.style.cssText = `
        position: fixed;
        left: -100vw;
        top: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #2a1810 0%, #1a0f08 100%);
        border: none;
        border-radius: 0;
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #ffcc00;
        z-index: 10000;
        transition: left 0.3s ease-out;
        overflow: hidden;
        backdrop-filter: blur(5px);
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      `;
    } else {
      this.container.style.cssText = `
        position: fixed;
        left: -350px;
        top: 80px;
        bottom: 280px;
        width: 320px;
        height: auto;
        background: linear-gradient(135deg, #2a1810 0%, #1a0f08 100%);
        border: 3px solid #ff6600;
        border-left: none;
        border-radius: 0 15px 15px 0;
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: #ffcc00;
        z-index: 10000;
        transition: left 0.3s ease-out;
        overflow: hidden;
        backdrop-filter: blur(5px);
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      `;
    }

    // Create header
    const header = document.createElement('div');
    header.style.cssText = `
      background: linear-gradient(90deg, #ff6600 0%, #cc4400 100%);
      padding: 8px 15px;
      margin: 0;
      font-weight: bold;
      font-size: 14px;
      color: #ffffff;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8);
      border-bottom: 2px solid #ff6600;
      text-align: center;
      flex-shrink: 0;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    `;

    // Add close button for mobile
    const closeButton = document.createElement('button');
    closeButton.id = 'settings-close-btn';
    closeButton.innerHTML = '✕';
    closeButton.style.cssText = `
      position: absolute;
      right: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid #ff6600;
      border-radius: 50%;
      color: white;
      font-size: 16px;
      font-weight: bold;
      width: 28px;
      height: 28px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;

    closeButton.addEventListener('click', () => {
      this.hide();
    });

    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.background = 'rgba(255, 102, 0, 0.3)';
    });

    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.background = 'rgba(0, 0, 0, 0.3)';
    });

    const headerTitle = document.createElement('span');
    headerTitle.textContent = '⚙ SETTINGS ⚙';

    header.appendChild(headerTitle);
    header.appendChild(closeButton);

    // Create scrollable content area
    const content = document.createElement('div');
    content.id = 'debug-panel-content';
    content.style.cssText = `
      padding: 15px;
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
    `;

    // Add sections
    content.appendChild(this.createCellShadingSection());
    content.appendChild(this.createWeaponSection());
    content.appendChild(this.createAudioSection());
    content.appendChild(this.createDebugSection());
    content.appendChild(this.createDisplaySection());

    this.container.appendChild(header);
    this.container.appendChild(content);

    // Add custom scrollbar styles
    this.addScrollbarStyles();

    // Prevent mouse events from propagating to the game
    this.addEventHandlers();

    document.body.appendChild(this.container);
  }

  private addScrollbarStyles(): void {
    // Create or get existing style element
    let styleElement = document.getElementById('debug-panel-scrollbar-styles') as HTMLStyleElement;
    if (!styleElement) {
      styleElement = document.createElement('style');
      styleElement.id = 'debug-panel-scrollbar-styles';
      document.head.appendChild(styleElement);
    }

    // Add Borderlands-style scrollbar CSS
    styleElement.textContent = `
      #debug-panel-content::-webkit-scrollbar {
        width: 12px;
      }
      
      #debug-panel-content::-webkit-scrollbar-track {
        background: linear-gradient(180deg, #1a0f08 0%, #2a1810 100%);
        border-radius: 0 8px 8px 0;
        border: 1px solid #ff6600;
        border-left: none;
      }
      
      #debug-panel-content::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, #ff6600 0%, #cc4400 50%, #ff6600 100%);
        border-radius: 0 6px 6px 0;
        border: 1px solid #ff8833;
        border-left: none;
        box-shadow: inset 0 0 3px rgba(255, 255, 255, 0.2);
      }
      
      #debug-panel-content::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(180deg, #ff8833 0%, #ee5500 50%, #ff8833 100%);
        box-shadow: inset 0 0 3px rgba(255, 255, 255, 0.3);
      }
      
      #debug-panel-content::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, #cc4400 0%, #aa3300 50%, #cc4400 100%);
        box-shadow: inset 0 0 3px rgba(0, 0, 0, 0.3);
      }
      
      #debug-panel-content::-webkit-scrollbar-corner {
        background: #1a0f08;
        border-radius: 0 8px 0 0;
      }
      
      /* Firefox scrollbar styles */
      #debug-panel-content {
        scrollbar-width: thin;
        scrollbar-color: #ff6600 #1a0f08;
      }
    `;
  }

  private addEventHandlers(): void {
    // Prevent mouse events from bubbling to the game when interacting with the panel
    this.container.addEventListener('mousedown', e => {
      e.stopPropagation();
    });

    this.container.addEventListener('mouseup', e => {
      e.stopPropagation();
    });

    this.container.addEventListener('mousemove', e => {
      e.stopPropagation();
    });

    this.container.addEventListener('click', e => {
      e.stopPropagation();
    });

    this.container.addEventListener('wheel', e => {
      e.stopPropagation();
    });
  }

  private createCellShadingSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding: 10px;
      background: rgba(255, 102, 0, 0.1);
      border: 1px solid #ff6600;
      border-radius: 8px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 15px 0;
      color: #ff6600;
      font-size: 13px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    title.textContent = '🎨 VISUAL EFFECTS';

    // Cell Shading Sub-section
    const cellShadingGroup = this.createEffectGroup('Cell Shading', 'cellShading', [
      { label: 'Brightness', key: 'brightness', value: 2.5, min: 0.5, max: 5.0, step: 0.1 },
      { label: 'Contrast', key: 'contrast', value: 1.0, min: 0.5, max: 2.0, step: 0.1 },
      {
        label: 'Edge Threshold',
        key: 'edgeThreshold',
        value: 0.2,
        min: 0.05,
        max: 0.5,
        step: 0.05,
      },
      { label: 'Edge Thickness', key: 'edgeThickness', value: 0.4, min: 0.1, max: 1.0, step: 0.1 },
      { label: 'Color Levels', key: 'colorLevels', value: 4, min: 2, max: 8, step: 1 },
    ]);

    // SSAO Sub-section
    const ssaoGroup = this.createEffectGroup('SSAO (Ambient Occlusion)', 'ssao', [
      { label: 'Intensity', key: 'ssaoIntensity', value: 1.0, min: 0.0, max: 2.0, step: 0.1 },
      { label: 'Radius', key: 'ssaoRadius', value: 16, min: 4, max: 32, step: 1 },
      {
        label: 'Min Distance',
        key: 'ssaoMinDistance',
        value: 0.005,
        min: 0.001,
        max: 0.02,
        step: 0.001,
      },
      {
        label: 'Max Distance',
        key: 'ssaoMaxDistance',
        value: 0.1,
        min: 0.05,
        max: 0.3,
        step: 0.01,
      },
    ]);

    section.appendChild(title);
    section.appendChild(cellShadingGroup);
    section.appendChild(ssaoGroup);

    return section;
  }

  private createEffectGroup(
    groupName: string,
    toggleKey: string,
    sliders: Array<{
      label: string;
      key: string;
      value: number;
      min: number;
      max: number;
      step: number;
    }>,
  ): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      margin-bottom: 15px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 102, 0, 0.3);
      border-radius: 6px;
    `;

    // Group header with toggle
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid rgba(255, 102, 0, 0.2);
    `;

    const toggleRow = this.createToggleRow(groupName, toggleKey, true);
    header.appendChild(toggleRow);

    // Sliders container
    const slidersContainer = document.createElement('div');
    slidersContainer.style.cssText = `
      padding-left: 8px;
    `;

    sliders.forEach(slider => {
      const sliderRow = this.createSliderRow(
        slider.label,
        slider.key,
        slider.value,
        slider.min,
        slider.max,
        slider.step,
      );
      slidersContainer.appendChild(sliderRow);
    });

    group.appendChild(header);
    group.appendChild(slidersContainer);

    return group;
  }

  private createWeaponSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding: 10px;
      background: rgba(255, 102, 0, 0.1);
      border: 1px solid #ff6600;
      border-radius: 8px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 10px 0;
      color: #ff6600;
      font-size: 13px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    title.textContent = '🔫 WEAPON SELECTION';

    // Get current weapon level from player
    const currentWeapon = this.player?.weaponLevel?.toString() || '1';

    const selectRow = this.createSelectRow(
      'Player Weapon',
      'weaponType',
      [
        { value: '1', text: '1 - Bullet' },
        { value: '2', text: '2 - Missile' },
        { value: '3', text: '3 - Laser' },
        { value: '4', text: '4 - Plasma' },
        { value: '5', text: '5 - Fireball' },
      ],
      currentWeapon,
    );

    section.appendChild(title);
    section.appendChild(selectRow);

    return section;
  }

  private createAudioSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding: 10px;
      background: rgba(255, 102, 0, 0.1);
      border: 1px solid #ff6600;
      border-radius: 8px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 10px 0;
      color: #ff6600;
      font-size: 13px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    title.textContent = '🔊 AUDIO SETTINGS';

    // Volume sliders
    const masterVolumeRow = this.createSliderRow(
      'Master Volume',
      'masterVolume',
      1.0,
      0.0,
      1.0,
      0.1,
    );
    const sfxVolumeRow = this.createSliderRow('SFX Volume', 'sfxVolume', 0.8, 0.0, 1.0, 0.1);
    const musicVolumeRow = this.createSliderRow('Music Volume', 'musicVolume', 0.6, 0.0, 1.0, 0.1);

    // Welcome sequence button
    const welcomeButtonRow = this.createButtonRow('Start Welcome Sequence', 'startWelcome');

    section.appendChild(title);
    section.appendChild(masterVolumeRow);
    section.appendChild(sfxVolumeRow);
    section.appendChild(musicVolumeRow);
    section.appendChild(welcomeButtonRow);

    return section;
  }

  private createDebugSection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 20px;
      padding: 10px;
      background: rgba(255, 102, 0, 0.1);
      border: 1px solid #ff6600;
      border-radius: 8px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 15px 0;
      color: #ff6600;
      font-size: 13px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    title.textContent = '🐛 DEBUG & HIGHLIGHTING';

    // Entity Highlighting Group
    const entityGroup = this.createDebugGroup('Entity Highlighting', [
      { label: 'Obstacles', key: 'debugObstacles', enabled: false },
      { label: 'Enemies', key: 'debugEnemies', enabled: false },
      { label: 'PowerUps', key: 'debugPowerups', enabled: false },
    ]);

    // Collision Debug Group
    const collisionGroup = this.createDebugGroup('Collision Debug', [
      { label: 'Collision Bounds', key: 'collisionDebug', enabled: false },
    ]);

    section.appendChild(title);
    section.appendChild(entityGroup);
    section.appendChild(collisionGroup);

    return section;
  }

  private createDebugGroup(
    groupName: string,
    toggles: Array<{ label: string; key: string; enabled: boolean }>,
  ): HTMLElement {
    const group = document.createElement('div');
    group.style.cssText = `
      margin-bottom: 12px;
      padding: 8px;
      background: rgba(0, 0, 0, 0.2);
      border: 1px solid rgba(255, 102, 0, 0.3);
      border-radius: 6px;
    `;

    // Group header
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid rgba(255, 102, 0, 0.2);
      color: #ffaa44;
      font-size: 11px;
      font-weight: bold;
      text-transform: uppercase;
    `;
    header.textContent = groupName;

    // Toggles container
    const togglesContainer = document.createElement('div');
    togglesContainer.style.cssText = `
      padding-left: 4px;
    `;

    toggles.forEach(toggle => {
      const toggleRow = this.createToggleRow(toggle.label, toggle.key, toggle.enabled);
      togglesContainer.appendChild(toggleRow);
    });

    group.appendChild(header);
    group.appendChild(togglesContainer);

    return group;
  }

  private createDisplaySection(): HTMLElement {
    const section = document.createElement('div');
    section.style.cssText = `
      margin-bottom: 10px;
      padding: 10px;
      background: rgba(255, 102, 0, 0.1);
      border: 1px solid #ff6600;
      border-radius: 8px;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0 0 10px 0;
      color: #ff6600;
      font-size: 13px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    title.textContent = '👁 DISPLAY OPTIONS';

    const wireframeRow = this.createToggleRow('Wireframe', 'wireframe', true);
    const surfaceRow = this.createToggleRow('Surface', 'surface', true);

    section.appendChild(title);
    section.appendChild(wireframeRow);
    section.appendChild(surfaceRow);

    return section;
  }

  private createToggleRow(label: string, id: string, defaultValue: boolean): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 5px 0;
    `;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      color: #ffcc00;
      font-size: 11px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    labelEl.textContent = label;

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.id = id;
    toggle.checked = defaultValue;
    toggle.style.cssText = `
      transform: scale(1.2);
      accent-color: #ff6600;
      cursor: pointer;
    `;

    toggle.addEventListener('change', e => {
      const target = e.target as HTMLInputElement;
      this.handleToggleChange(id, target.checked);
    });

    row.appendChild(labelEl);
    row.appendChild(toggle);

    return row;
  }

  private createSliderRow(
    label: string,
    id: string,
    defaultValue: number,
    min: number,
    max: number,
    step: number,
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      margin-bottom: 12px;
      padding: 5px 0;
    `;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      display: block;
      color: #ffcc00;
      font-size: 11px;
      margin-bottom: 4px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;

    const valueSpan = document.createElement('span');
    valueSpan.id = `${id}-value`;
    valueSpan.style.cssText = `
      float: right;
      color: #ff6600;
      font-weight: bold;
    `;
    valueSpan.textContent = defaultValue.toString();

    labelEl.textContent = label;
    labelEl.appendChild(valueSpan);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.id = id;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = defaultValue.toString();
    slider.style.cssText = `
      width: 100%;
      height: 6px;
      background: #1a0f08;
      border-radius: 3px;
      outline: none;
      cursor: pointer;
      accent-color: #ff6600;
    `;

    slider.addEventListener('input', e => {
      const target = e.target as HTMLInputElement;
      const value = parseFloat(target.value);
      valueSpan.textContent = value.toString();
      this.handleSliderChange(id, value);
    });

    row.appendChild(labelEl);
    row.appendChild(slider);

    return row;
  }

  private createSelectRow(
    label: string,
    id: string,
    options: Array<{ value: string; text: string }>,
    defaultValue: string,
  ): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      margin-bottom: 8px;
      padding: 5px 0;
    `;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      display: block;
      color: #ffcc00;
      font-size: 11px;
      margin-bottom: 5px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    labelEl.textContent = label;

    const select = document.createElement('select');
    select.id = id;
    select.style.cssText = `
      width: 100%;
      padding: 5px;
      background: #1a0f08;
      color: #ffcc00;
      border: 1px solid #ff6600;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      cursor: pointer;
    `;

    options.forEach(option => {
      const optionEl = document.createElement('option');
      optionEl.value = option.value;
      optionEl.textContent = option.text;
      optionEl.selected = option.value === defaultValue;
      select.appendChild(optionEl);
    });

    select.addEventListener('change', e => {
      const target = e.target as HTMLSelectElement;
      this.handleSelectChange(id, target.value);
    });

    row.appendChild(labelEl);
    row.appendChild(select);

    return row;
  }

  private createButtonRow(label: string, id: string): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding: 5px 0;
    `;

    const labelEl = document.createElement('label');
    labelEl.style.cssText = `
      color: #ffcc00;
      font-size: 11px;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;
    labelEl.textContent = label;

    const button = document.createElement('button');
    button.id = id;
    button.textContent = id === 'startWelcome' ? 'Play' : 'Start';
    button.style.cssText = `
      padding: 4px 12px;
      background: linear-gradient(135deg, #ff6600 0%, #cc4400 100%);
      color: #ffffff;
      border: 1px solid #ff8833;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-size: 10px;
      cursor: pointer;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
    `;

    button.addEventListener('click', e => {
      e.stopPropagation();
      this.handleButtonClick(id);
    });

    row.appendChild(labelEl);
    row.appendChild(button);

    return row;
  }

  private handleButtonClick(id: string): void {
    if (id === 'startWelcome') {
      this.audioManager?.triggerWelcomeSequence();
    } else if (id === 'startTheme') {
      this.audioManager?.forceStartTheme();
    }
  }

  private handleToggleChange(id: string, value: boolean): void {
    switch (id) {
      case 'cellShading':
        if (this.cellShadingPass) {
          this.cellShadingPass.enabled = value;
        }
        break;
      case 'ssao':
        if (this.ssaoPass) {
          this.ssaoPass.enabled = value;
        }
        break;
      case 'debugObstacles':
      case 'debugEnemies':
      case 'debugPowerups':
        this.onDebugToggle?.(id, value);
        break;
      case 'collisionDebug':
        if (this.collisionDebugRenderer) {
          this.collisionDebugRenderer.setEnabled(value);
        }
        break;
      case 'wireframe':
      case 'surface':
        this.onDisplayToggle?.(id, value);
        break;
    }
  }

  private handleSliderChange(id: string, value: number): void {
    // Handle cell shading controls
    if (this.cellShadingPass) {
      switch (id) {
        case 'brightness':
          this.cellShadingPass.setBrightness(value);
          break;
        case 'contrast':
          this.cellShadingPass.setContrast(value);
          break;
        case 'edgeThreshold':
          this.cellShadingPass.setEdgeThreshold(value);
          break;
        case 'edgeThickness':
          this.cellShadingPass.setEdgeThickness(value);
          break;
        case 'colorLevels':
          this.cellShadingPass.setColorLevels(value);
          break;
      }
    }

    // Handle SSAO controls
    if (this.ssaoPass) {
      switch (id) {
        case 'ssaoIntensity':
          this.ssaoPass.intensity = value;
          break;
        case 'ssaoRadius':
          this.ssaoPass.kernelRadius = value;
          break;
        case 'ssaoMinDistance':
          this.ssaoPass.minDistance = value;
          break;
        case 'ssaoMaxDistance':
          this.ssaoPass.maxDistance = value;
          break;
      }
    }

    // Handle audio controls
    if (this.audioManager) {
      switch (id) {
        case 'masterVolume':
          this.audioManager.setMasterVolume(value);
          break;
        case 'sfxVolume':
          this.audioManager.setSFXVolume(value);
          break;
        case 'musicVolume':
          this.audioManager.setMusicVolume(value);
          break;
      }
    }

    // Call audio change callback if available
    this.onAudioChange?.(id, value);
  }

  private handleSelectChange(id: string, value: string): void {
    if (id === 'weaponType') {
      this.onWeaponChange?.(parseInt(value));
    }
  }

  public setCellShadingPass(pass: any): void {
    this.cellShadingPass = pass;
  }

  public setSSAOPass(pass: any): void {
    this.ssaoPass = pass;
  }

  public setCollisionDebugRenderer(renderer: any): void {
    this.collisionDebugRenderer = renderer;
  }

  // Sync panel controls with current state of passes
  private syncControlsWithState(): void {
    // Sync cell shading controls
    if (this.cellShadingPass) {
      this.updateToggleState('cellShading', this.cellShadingPass.enabled);
      // Note: Cell shading pass doesn't expose getter methods for individual properties
      // so we can't sync the sliders without modifying the CellShadingPass class
    }

    // Sync SSAO controls
    if (this.ssaoPass) {
      this.updateToggleState('ssao', this.ssaoPass.enabled);
      this.updateSliderState('ssaoIntensity', this.ssaoPass.intensity || 1.0);
      this.updateSliderState('ssaoRadius', this.ssaoPass.kernelRadius || 16);
      this.updateSliderState('ssaoMinDistance', this.ssaoPass.minDistance || 0.005);
      this.updateSliderState('ssaoMaxDistance', this.ssaoPass.maxDistance || 0.1);
    }

    // Sync collision debug controls
    if (this.collisionDebugRenderer) {
      this.updateToggleState('collisionDebug', this.collisionDebugRenderer.isEnabled());
    }

    // Sync audio controls
    if (this.audioManager) {
      this.updateSliderState('masterVolume', this.audioManager.getMasterVolume?.() || 1.0);
      this.updateSliderState('sfxVolume', this.audioManager.getSFXVolume?.() || 0.9);
      this.updateSliderState('musicVolume', this.audioManager.getMusicVolume?.() || 0.2);
    }
  }

  private updateToggleState(id: string, value: boolean): void {
    const toggle = document.getElementById(id) as HTMLInputElement;
    if (toggle) {
      toggle.checked = value;
    }
  }

  private updateSliderState(id: string, value: number): void {
    const slider = document.getElementById(id) as HTMLInputElement;
    const valueSpan = document.getElementById(`${id}-value`);
    if (slider) {
      slider.value = value.toString();
    }
    if (valueSpan) {
      valueSpan.textContent = value.toString();
    }
  }

  public setWeaponChangeCallback(callback: (weaponType: number) => void): void {
    this.onWeaponChange = callback;
  }

  public setDebugToggleCallback(callback: (type: string, enabled: boolean) => void): void {
    this.onDebugToggle = callback;
  }

  public setDisplayToggleCallback(callback: (type: string, enabled: boolean) => void): void {
    this.onDisplayToggle = callback;
  }

  public setPlayer(player: any): void {
    this.player = player;
  }

  public setAudioManager(audioManager: any): void {
    this.audioManager = audioManager;
  }

  public setAudioChangeCallback(callback: (type: string, value: number) => void): void {
    this.onAudioChange = callback;
  }

  public toggle(): void {
    this.isVisible = !this.isVisible;
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.container.style.left = this.isVisible ? '0px' : isMobile ? '-100vw' : '-350px';

    // Sync controls with current state when showing
    if (this.isVisible) {
      this.syncControlsWithState();
    }
  }

  public hide(): void {
    this.isVisible = false;
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    this.container.style.left = isMobile ? '-100vw' : '-350px';
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.left = '0px';

    // Sync controls with current state when showing
    this.syncControlsWithState();
  }

  public handleResize(): void {
    const isMobile =
      window.innerWidth <= 768 ||
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const closeButton = document.getElementById('settings-close-btn');

    // Always show close button
    if (closeButton) {
      closeButton.style.display = 'flex';
    }

    // Update panel layout for current screen size
    if (isMobile) {
      this.container.style.cssText = `
        position: fixed;
        left: ${this.isVisible ? '0px' : '-100vw'};
        top: 0;
        bottom: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(135deg, #2a1810 0%, #1a0f08 100%);
        border: none;
        border-radius: 0;
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
        font-family: 'Courier New', monospace;
        font-size: 14px;
        color: #ffcc00;
        z-index: 10000;
        transition: left 0.3s ease-out;
        overflow: hidden;
        backdrop-filter: blur(5px);
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      `;
    } else {
      this.container.style.cssText = `
        position: fixed;
        left: ${this.isVisible ? '0px' : '-350px'};
        top: 80px;
        bottom: 280px;
        width: 320px;
        height: auto;
        background: linear-gradient(135deg, #2a1810 0%, #1a0f08 100%);
        border: 3px solid #ff6600;
        border-left: none;
        border-radius: 0 15px 15px 0;
        box-shadow: 0 0 20px rgba(255, 102, 0, 0.3), inset 0 0 20px rgba(0, 0, 0, 0.5);
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: #ffcc00;
        z-index: 10000;
        transition: left 0.3s ease-out;
        overflow: hidden;
        backdrop-filter: blur(5px);
        display: flex;
        flex-direction: column;
        pointer-events: auto;
      `;
    }
  }

  public isOpen(): boolean {
    return this.isVisible;
  }
}
