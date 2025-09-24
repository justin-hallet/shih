/**
 * AudioManager - Handles all game audio using Howler.js
 * Manages spatial audio, sound effects, and background music
 */

import { Howl, Howler } from 'howler';
import * as THREE from 'three';
import { PowerUpSubType } from './types';

export interface AudioConfig {
  volume?: number;
  loop?: boolean;
  spatial?: boolean;
  maxDistance?: number;
  rolloffFactor?: number;
}

export interface SoundAction {
  file: string;
  volume: number;
  spatial: boolean;
  loop: boolean;
  category: 'sfx' | 'music';
  priority: number; // Higher number = higher priority
  maxInstances?: number; // Limit concurrent instances
}

export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private camera: THREE.Camera | null = null;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.4;
  private isInitialized: boolean = false;
  private hasUserInteracted: boolean = false;

  // Sound instance tracking for limiting concurrent sounds
  private activeInstances: Map<string, number[]> = new Map();

  // Sound action mappings with volumes and settings
  private readonly soundActions: Record<string, SoundAction> = {
    // Shooting sounds - reduced volume, limited instances
    'shoot-bullet': {
      file: '/src/assets/audio/shoot-1.mp3',
      volume: 0.4,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 12,
    },
    'shoot-missile': {
      file: '/src/assets/audio/shoot-2.mp3',
      volume: 0.5,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 12,
    },
    'shoot-laser': {
      file: '/src/assets/audio/shoot-3.mp3',
      volume: 0.45,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 12,
    },
    'shoot-plasma': {
      file: '/src/assets/audio/shoot-4.mp3',
      volume: 0.55,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 12,
    },
    'shoot-fireball': {
      file: '/src/assets/audio/shoot-5.mp3',
      volume: 0.6,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 12,
    },

    // Damage sounds - high priority, always audible
    'damage-obstacle': {
      file: '/src/assets/audio/damage-1.mp3',
      volume: 5.0,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 10,
      maxInstances: 2,
    },
    'damage-enemy': {
      file: '/src/assets/audio/damage-2.mp3',
      volume: 5.0,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 10,
      maxInstances: 2,
    },

    // Power-up collection sounds - medium priority, always heard
    'collect-ammo': {
      file: '/src/assets/audio/power-up-1.mp3',
      volume: 1.5,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 5,
      maxInstances: 1,
    },
    'collect-shield': {
      file: '/src/assets/audio/power-up-3.mp3',
      volume: 1.5,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 5,
      maxInstances: 1,
    },
    'collect-weapon': {
      file: '/src/assets/audio/power-up-4.mp3',
      volume: 1.4,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 7,
      maxInstances: 1,
    },
    'collect-speed': {
      file: '/src/assets/audio/power-up-5.mp3',
      volume: 1.7,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 5,
      maxInstances: 1,
    },
    'collect-life': {
      file: '/src/assets/audio/credit.mp3',
      volume: 3.0,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 8,
      maxInstances: 1,
    },

    // Background and UI sounds
    'theme-music': {
      file: '/src/assets/audio/theme.mp3',
      volume: 0.6,
      spatial: false,
      loop: true,
      category: 'music',
      priority: 0,
      maxInstances: 1,
    },
    welcome: {
      file: '/src/assets/audio/welcome.mp3',
      volume: 0.8,
      spatial: false,
      loop: false,
      category: 'sfx',
      priority: 9,
      maxInstances: 1,
    },
  };

  constructor() {
    this.initializeAudio();
    this.setupUserInteractionListener();
  }

  private setupUserInteractionListener(): void {
    const handleFirstInteraction = () => {
      this.hasUserInteracted = true;
      // User interaction detected, starting welcome sequence

      // Start the welcome sequence
      this.startWelcomeSequence();

      // Remove the listeners since we only need this once
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };

    // Listen for any user interaction
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
  }

  private startWelcomeSequence(): void {
    if (!this.isInitialized) {
      // If not initialized yet, try again in a short while
      setTimeout(() => this.startWelcomeSequence(), 100);
      return;
    }

    // Start theme music
    this.playTheme();

    // Play welcome sound overlayed
    this.playWelcome();

    // Show "Get Ready!" message
    this.showGetReadyMessage();
  }

  private showGetReadyMessage(): void {
    // Create the "Get Ready!" overlay
    const overlay = document.createElement('div');
    overlay.id = 'get-ready-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 20000;
      pointer-events: none;
      font-family: 'Courier New', monospace;
      font-size: 6rem;
      font-weight: bold;
      color: #00ccff;
      text-shadow: 
        -2px -2px 0 #000000,
        2px -2px 0 #000000,
        -2px 2px 0 #000000,
        2px 2px 0 #000000,
        0 0 10px #00ccff,
        0 0 20px #00ccff;
      text-align: center;
      animation: getReadyPulse 2s ease-in-out;
    `;

    overlay.textContent = 'GET READY!';

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes getReadyPulse {
        0% { 
          opacity: 0; 
          transform: scale(0.5); 
        }
        50% { 
          opacity: 1; 
          transform: scale(1.1); 
        }
        100% { 
          opacity: 0; 
          transform: scale(1); 
        }
      }
    `;
    document.head.appendChild(style);

    document.body.appendChild(overlay);

    // Remove the overlay after animation
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
    }, 2000);
  }

  private async initializeAudio(): Promise<void> {
    try {
      // Set global Howler settings
      Howler.volume(this.masterVolume);

      // Preload all audio files
      const loadPromises = Object.entries(this.soundActions).map(([actionKey, action]) => {
        return this.loadSound(actionKey, action);
      });

      await Promise.all(loadPromises);
      this.isInitialized = true;

      // Set initial volumes correctly
      this.refreshAllVolumes();
    } catch (error) {
      // Silent initialization failure - audio will be disabled
      this.isInitialized = false;
    }
  }

  private loadSound(actionKey: string, action: SoundAction): Promise<void> {
    return new Promise(resolve => {
      const baseVolume = action.category === 'music' ? this.musicVolume : this.sfxVolume;
      const finalVolume = baseVolume * action.volume;

      const howl = new Howl({
        src: [action.file],
        volume: finalVolume,
        loop: action.loop,
        html5: false, // Use Web Audio API for better performance
        preload: true,
        onload: () => {
          this.sounds.set(actionKey, howl);
          resolve();
        },
        onloaderror: () => {
          // Silent failure - resolve to allow other sounds to load
          resolve();
        },
      });
    });
  }

  public setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }

  public setPlayerPosition(position: THREE.Vector3): void {
    this.playerPosition.copy(position);
    this.updateListenerPosition();
  }

  private updateListenerPosition(): void {
    if (!this.camera) return;

    // Update Howler's listener position for spatial audio
    Howler.pos(this.playerPosition.x, this.playerPosition.y, this.playerPosition.z);

    // Update listener orientation based on camera
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    const up = this.camera.up;

    Howler.orientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }

  // Play shooting sound based on weapon level
  public playShootSound(weaponLevel: number, position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    const weaponSounds = [
      'shoot-bullet',
      'shoot-missile',
      'shoot-laser',
      'shoot-plasma',
      'shoot-fireball',
    ];
    const soundAction = weaponSounds[Math.min(weaponLevel - 1, 4)];
    this.playSound(soundAction, position);
  }

  // Play power-up collection sound
  public playPowerUpSound(powerUpType: PowerUpSubType, position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    let soundAction: string;
    switch (powerUpType) {
      case PowerUpSubType.AMMO:
        soundAction = 'collect-ammo';
        break;
      case PowerUpSubType.SHIELD:
        soundAction = 'collect-shield';
        break;
      case PowerUpSubType.WEAPON_UPGRADE:
        soundAction = 'collect-weapon';
        break;
      case PowerUpSubType.SPEED:
        soundAction = 'collect-speed';
        break;
      case PowerUpSubType.LIFE:
        soundAction = 'collect-life';
        break;
      default:
        soundAction = 'collect-ammo';
    }

    this.playSound(soundAction, position);
  }

  // Play damage sound
  public playDamageSound(damageType: 'obstacle' | 'enemy', position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    const soundAction = damageType === 'obstacle' ? 'damage-obstacle' : 'damage-enemy';
    this.playSound(soundAction, position);
  }

  // Play background theme
  public playTheme(): void {
    if (!this.isInitialized) {
      setTimeout(() => this.playTheme(), 500);
      return;
    }

    if (!this.hasUserInteracted) return;

    this.playSound('theme-music');
  }

  // Stop background theme
  public stopTheme(): void {
    const theme = this.sounds.get('theme-music');
    if (theme) {
      theme.stop();
    }
  }

  // Play welcome sound
  public playWelcome(): void {
    if (!this.isInitialized) return;
    this.playSound('welcome');
  }

  // Force start theme music (useful for manual triggers)
  public forceStartTheme(): void {
    this.hasUserInteracted = true;
    this.playTheme();
  }

  // Manually trigger the welcome sequence
  public triggerWelcomeSequence(): void {
    this.hasUserInteracted = true;
    this.startWelcomeSequence();
  }

  // Smart sound playing with instance limiting and priority management
  private playSound(actionKey: string, position?: THREE.Vector3): void {
    const sound = this.sounds.get(actionKey);
    const action = this.soundActions[actionKey];

    if (!sound || !action) {
      console.warn(`Sound action not found: ${actionKey}`);
      return;
    }

    // Check instance limits
    if (action.maxInstances) {
      const currentInstances = this.activeInstances.get(actionKey) || [];

      // Clean up finished instances
      const activeIds = currentInstances.filter(id => sound.playing(id));
      this.activeInstances.set(actionKey, activeIds);

      // If at max instances, stop the oldest one for high priority sounds
      if (activeIds.length >= action.maxInstances) {
        if (action.priority >= 5) {
          // High priority: stop oldest instance
          const oldestId = activeIds.shift();
          if (oldestId !== undefined) {
            sound.stop(oldestId);
          }
        } else {
          // Low priority: skip playing this instance
          return;
        }
      }
    }

    const soundId = sound.play();

    // Track this instance
    if (action.maxInstances && typeof soundId === 'number') {
      const instances = this.activeInstances.get(actionKey) || [];
      instances.push(soundId);
      this.activeInstances.set(actionKey, instances);

      // Auto-cleanup when sound ends
      sound.once(
        'end',
        () => {
          const currentInstances = this.activeInstances.get(actionKey) || [];
          const filteredInstances = currentInstances.filter(id => id !== soundId);
          this.activeInstances.set(actionKey, filteredInstances);
        },
        soundId,
      );
    }

    // Apply spatial audio if configured and position provided
    if (action.spatial && position && typeof soundId === 'number') {
      sound.pos(position.x, position.y, position.z, soundId);
    }

    // Handle play promise for browsers that return one
    if (typeof soundId === 'object' && soundId && 'catch' in soundId) {
      (soundId as Promise<unknown>).catch(() => {
        // Silent handling of play failures
      });
    }
  }

  // Volume controls
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));

    // Update all SFX sounds with their action-based volumes
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      if (action.category === 'sfx') {
        const sound = this.sounds.get(actionKey);
        if (sound) {
          const finalVolume = this.sfxVolume * action.volume;
          sound.volume(finalVolume);
        }
      }
    });
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    // Update all music sounds with their action-based volumes
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      if (action.category === 'music') {
        const sound = this.sounds.get(actionKey);
        if (sound) {
          const finalVolume = this.musicVolume * action.volume;
          sound.volume(finalVolume);
        }
      }
    });
  }

  // Mute/unmute controls
  public muteAll(): void {
    Howler.mute(true);
  }

  public unmuteAll(): void {
    Howler.mute(false);
  }

  public muteSFX(): void {
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      if (action.category === 'sfx') {
        const sound = this.sounds.get(actionKey);
        if (sound) {
          sound.mute(true);
        }
      }
    });
  }

  public unmuteSFX(): void {
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      if (action.category === 'sfx') {
        const sound = this.sounds.get(actionKey);
        if (sound) {
          sound.mute(false);
        }
      }
    });
  }

  public muteMusic(): void {
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      if (action.category === 'music') {
        const sound = this.sounds.get(actionKey);
        if (sound) {
          sound.mute(true);
        }
      }
    });
  }

  public unmuteMusic(): void {
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      if (action.category === 'music') {
        const sound = this.sounds.get(actionKey);
        if (sound) {
          sound.mute(false);
        }
      }
    });
  }

  // Cleanup
  public destroy(): void {
    this.sounds.forEach(sound => {
      sound.unload();
    });
    this.sounds.clear();
    this.isInitialized = false;
  }

  // Getters for current settings
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getSFXVolume(): number {
    return this.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  // Refresh all sound volumes based on current settings
  private refreshAllVolumes(): void {
    Object.entries(this.soundActions).forEach(([actionKey, action]) => {
      const sound = this.sounds.get(actionKey);
      if (sound) {
        const baseVolume = action.category === 'music' ? this.musicVolume : this.sfxVolume;
        const finalVolume = baseVolume * action.volume;
        sound.volume(finalVolume);
      }
    });
  }
}
