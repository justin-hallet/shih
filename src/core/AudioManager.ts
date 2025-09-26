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

interface QueuedSound {
  actionKey: string;
  position: THREE.Vector3 | undefined;
  priority: number;
  timestamp: number;
}

export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private camera: THREE.Camera | null = null;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 0.9;
  private musicVolume: number = 0.2;
  private isInitialized: boolean = false;
  private hasUserInteracted: boolean = false;

  // Sound instance tracking for limiting concurrent sounds
  private activeInstances: Map<string, number[]> = new Map();

  // Audio queue system
  private soundQueue: QueuedSound[] = [];
  private lastProcessTime: number = 0;
  private processInterval: number = 100; // Process queue every 100ms
  private maxConcurrentSounds: number = 8; // Maximum sounds playing at once
  private currentlyPlaying: Set<string> = new Set(); // Track currently playing sounds

  // Track timeouts for cleanup
  private activeTimeouts: Set<number> = new Set();

  // Sound action mappings with volumes and settings
  private readonly soundActions: Record<string, SoundAction> = {
    // Shooting sounds - low priority, queued processing
    'shoot-bullet': {
      file: '/src/assets/audio/shoot-1.mp3',
      volume: 0.3,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 8,
    },
    'shoot-missile': {
      file: '/src/assets/audio/shoot-2.mp3',
      volume: 0.35,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 8,
    },
    'shoot-laser': {
      file: '/src/assets/audio/shoot-3.mp3',
      volume: 0.32,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 8,
    },
    'shoot-plasma': {
      file: '/src/assets/audio/shoot-4.mp3',
      volume: 0.38,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 8,
    },
    'shoot-fireball': {
      file: '/src/assets/audio/shoot-5.mp3',
      volume: 0.4,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 1,
      maxInstances: 8,
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

    // Enemy hit sounds - medium priority, spatial
    'enemy-hit-1': {
      file: '/src/assets/audio/hit-1.mp3',
      volume: 1.2,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 6,
      maxInstances: 3,
    },
    'enemy-hit-2': {
      file: '/src/assets/audio/hit-2.mp3',
      volume: 1.2,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 6,
      maxInstances: 3,
    },
    'enemy-hit-3': {
      file: '/src/assets/audio/hit-3.mp3',
      volume: 1.2,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 6,
      maxInstances: 3,
    },
    'enemy-hit-4': {
      file: '/src/assets/audio/hit-4.mp3',
      volume: 1.2,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 6,
      maxInstances: 3,
    },

    // Enemy death sound - high priority, always heard
    'enemy-death': {
      file: '/src/assets/audio/death.mp3',
      volume: 1.8,
      spatial: true,
      loop: false,
      category: 'sfx',
      priority: 8,
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
    gameover: {
      file: '/src/assets/audio/game-over.mp3',
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
    } catch {
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

  // Play enemy hit sound (random variation)
  public playEnemyHitSound(position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    // Randomly select one of the 4 hit sounds for variety
    const hitSounds = ['enemy-hit-1', 'enemy-hit-2', 'enemy-hit-3', 'enemy-hit-4'];
    const randomHitSound = hitSounds[Math.floor(Math.random() * hitSounds.length)];
    this.playSound(randomHitSound, position);
  }

  // Play enemy death sound
  public playEnemyDeathSound(position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    this.playSound('enemy-death', position);
  }

  private playAfterInitialized(sound: string): void {
    if (!this.isInitialized) {
      const timeoutId = window.setTimeout(() => this.playAfterInitialized(sound), 500);
      this.activeTimeouts.add(timeoutId);
      return;
    }

    this.playSound(sound);
  }
  // Play background theme
  public playTheme(): void {
    this.playAfterInitialized('theme-music');
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
    this.playAfterInitialized('welcome');
  }

  public playGameover(): void {
    this.playAfterInitialized('gameover');

    // Auto-fade after 2.8 seconds (before 3s animation ends)
    const timeoutId = window.setTimeout(() => {
      const sound = this.sounds.get('gameover');
      if (sound && sound.playing()) {
        sound.fade(sound.volume(), 0, 200);
      }
      this.activeTimeouts.delete(timeoutId);
    }, 2800);
    this.activeTimeouts.add(timeoutId);
  }

  // Add sound to queue for processing
  private playSound(actionKey: string, position?: THREE.Vector3): void {
    const action = this.soundActions[actionKey];
    if (!action) {
      // eslint-disable-next-line no-console
      console.warn(`Sound action not found: ${actionKey}`);
      return;
    }

    // Add to queue with priority and timestamp
    this.soundQueue.push({
      actionKey,
      position: position ? position.clone() : undefined, // Clone to avoid reference issues
      priority: action.priority,
      timestamp: Date.now(),
    });

    // Sort queue by priority (higher priority first), then by timestamp (older first)
    this.soundQueue.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // Higher priority first
      }
      return a.timestamp - b.timestamp; // Older first for same priority
    });

    // Limit queue size to prevent memory issues
    if (this.soundQueue.length > 50) {
      this.soundQueue = this.soundQueue.slice(0, 50);
    }
  }

  // Process the sound queue (called every frame or interval)
  public processAudioQueue(): void {
    const currentTime = Date.now();

    // Only process every processInterval milliseconds
    if (currentTime - this.lastProcessTime < this.processInterval) {
      return;
    }

    this.lastProcessTime = currentTime;

    // Clean up finished sounds from tracking
    this.cleanupFinishedSounds();

    // Process queue while we have room for more sounds
    while (this.soundQueue.length > 0 && this.currentlyPlaying.size < this.maxConcurrentSounds) {
      const queuedSound = this.soundQueue.shift();
      if (queuedSound) {
        this.playQueuedSound(queuedSound);
      }
    }
  }

  // Actually play a sound from the queue
  private playQueuedSound(queuedSound: QueuedSound): void {
    const { actionKey, position } = queuedSound;
    const sound = this.sounds.get(actionKey);
    const action = this.soundActions[actionKey];

    if (!sound || !action) {
      // eslint-disable-next-line no-console
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
            this.currentlyPlaying.delete(`${actionKey}-${oldestId}`);
          }
        } else {
          // Low priority: skip playing this instance
          return;
        }
      }
    }

    const soundId = sound.play();

    // Track this instance globally
    if (typeof soundId === 'number') {
      const trackingKey = `${actionKey}-${soundId}`;
      this.currentlyPlaying.add(trackingKey);

      // Auto-cleanup when sound ends
      sound.once(
        'end',
        () => {
          this.currentlyPlaying.delete(trackingKey);
          if (action.maxInstances) {
            const currentInstances = this.activeInstances.get(actionKey) || [];
            const filteredInstances = currentInstances.filter(id => id !== soundId);
            this.activeInstances.set(actionKey, filteredInstances);
          }
        },
        soundId,
      );
    }

    // Track this instance for maxInstances limit
    if (action.maxInstances && typeof soundId === 'number') {
      const instances = this.activeInstances.get(actionKey) || [];
      instances.push(soundId);
      this.activeInstances.set(actionKey, instances);
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

  // Clean up finished sounds from global tracking
  private cleanupFinishedSounds(): void {
    const toRemove: string[] = [];

    for (const trackingKey of this.currentlyPlaying) {
      const [actionKey, soundIdStr] = trackingKey.split('-');
      const soundId = parseInt(soundIdStr);
      const sound = this.sounds.get(actionKey);

      if (!sound || !sound.playing(soundId)) {
        toRemove.push(trackingKey);
      }
    }

    toRemove.forEach(key => this.currentlyPlaying.delete(key));
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

  // Volume getters
  public getMasterVolume(): number {
    return this.masterVolume;
  }

  public getSFXVolume(): number {
    return this.sfxVolume;
  }

  public getMusicVolume(): number {
    return this.musicVolume;
  }

  // Queue configuration methods
  public setMaxConcurrentSounds(max: number): void {
    this.maxConcurrentSounds = Math.max(1, Math.min(20, max));
  }

  public setProcessInterval(intervalMs: number): void {
    this.processInterval = Math.max(50, Math.min(500, intervalMs));
  }

  // Queue status methods
  public getQueueLength(): number {
    return this.soundQueue.length;
  }

  public getCurrentlyPlayingCount(): number {
    return this.currentlyPlaying.size;
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

  /**
   * Reset audio manager state for game restart
   * Clears timeouts, stops sounds, and resets audio queues
   */
  public reset(): void {
    // Clear all active timeouts
    for (const timeoutId of this.activeTimeouts) {
      clearTimeout(timeoutId);
    }
    this.activeTimeouts.clear();

    // Stop all currently playing sounds
    for (const sound of this.sounds.values()) {
      if (sound.playing()) {
        sound.stop();
      }
    }

    // Clear audio queues and tracking
    this.soundQueue.length = 0;
    this.currentlyPlaying.clear();
    this.activeInstances.clear();

    // Reset processing timer
    this.lastProcessTime = 0;

    // Note: Don't reset volume settings or initialization state
    // as these should persist across game resets
  }

  // Cleanup
  public destroy(): void {
    // Clear timeouts before destroying
    this.reset();

    this.sounds.forEach(sound => {
      sound.unload();
    });
    this.sounds.clear();
    this.isInitialized = false;
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
