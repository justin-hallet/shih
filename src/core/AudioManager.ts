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

export class AudioManager {
  private sounds: Map<string, Howl> = new Map();
  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private camera: THREE.Camera | null = null;
  private masterVolume: number = 1.0;
  private sfxVolume: number = 0.8;
  private musicVolume: number = 0.6;
  private isInitialized: boolean = false;
  private hasUserInteracted: boolean = false;

  // Audio file mappings
  private readonly audioFiles = {
    // Shooting sounds
    'shoot-1': '/src/assets/audio/shoot-1.mp3',
    'shoot-2': '/src/assets/audio/shoot-2.mp3',
    'shoot-3': '/src/assets/audio/shoot-3.mp3',
    'shoot-4': '/src/assets/audio/shoot-4.mp3',
    'shoot-5': '/src/assets/audio/shoot-5.mp3',

    // Power-up collection sounds
    'power-up-1': '/src/assets/audio/power-up-1.mp3', // ammo
    'power-up-3': '/src/assets/audio/power-up-3.mp3', // shield/armor
    'power-up-4': '/src/assets/audio/power-up-4.mp3', // weapon upgrade
    'power-up-5': '/src/assets/audio/power-up-5.mp3', // speed upgrade

    // Damage sounds
    'damage-1': '/src/assets/audio/damage-1.mp3', // obstacle collision
    'damage-2': '/src/assets/audio/damage-2.mp3', // enemy/projectile collision

    // Special sounds
    credit: '/src/assets/audio/credit.mp3', // life collected
    theme: '/src/assets/audio/theme.mp3', // background music
    welcome: '/src/assets/audio/welcome.mp3', // welcome sound
  };

  constructor() {
    this.initializeAudio();
    this.setupUserInteractionListener();
  }

  private setupUserInteractionListener(): void {
    const handleFirstInteraction = () => {
      this.hasUserInteracted = true;
      console.log('User interaction detected, enabling audio...');

      // Try to start theme music now that we have user interaction
      if (this.isInitialized) {
        this.playTheme();
      }

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
      const loadPromises = Object.entries(this.audioFiles).map(([key, path]) => {
        return this.loadSound(key, path);
      });

      await Promise.all(loadPromises);
      this.isInitialized = true;
    } catch (error) {
      // Silent initialization failure - audio will be disabled
      this.isInitialized = false;
    }
  }

  private loadSound(key: string, path: string): Promise<void> {
    return new Promise(resolve => {
      const config: AudioConfig = {
        volume: key === 'theme' ? this.musicVolume : this.sfxVolume,
        loop: key === 'theme', // Only theme music loops
        spatial: key !== 'theme', // All sounds except theme use spatial audio
        maxDistance: 50,
        rolloffFactor: 1,
      };

      const howl = new Howl({
        src: [path],
        volume: config.volume,
        loop: config.loop || false,
        html5: false, // Use Web Audio API for better performance
        preload: true,
        onload: () => {
          this.sounds.set(key, howl);
          if (key === 'theme') {
            console.log('Theme music loaded successfully');
          }
          resolve();
        },
        onloaderror: (id, error) => {
          console.warn(`Failed to load audio: ${key}`, error);
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

    const soundKey = `shoot-${Math.min(weaponLevel, 5)}`;
    this.playSound(soundKey, position);
  }

  // Play power-up collection sound
  public playPowerUpSound(powerUpType: PowerUpSubType, position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    let soundKey: string;
    switch (powerUpType) {
      case PowerUpSubType.AMMO:
        soundKey = 'power-up-1';
        break;
      case PowerUpSubType.SHIELD:
        soundKey = 'power-up-3';
        break;
      case PowerUpSubType.WEAPON_UPGRADE:
        soundKey = 'power-up-4';
        break;
      case PowerUpSubType.SPEED:
        soundKey = 'power-up-5';
        break;
      case PowerUpSubType.LIFE:
        soundKey = 'credit';
        break;
      default:
        soundKey = 'power-up-1';
    }

    this.playSound(soundKey, position);
  }

  // Play damage sound
  public playDamageSound(damageType: 'obstacle' | 'enemy', position?: THREE.Vector3): void {
    if (!this.isInitialized) return;

    const soundKey = damageType === 'obstacle' ? 'damage-1' : 'damage-2';
    this.playSound(soundKey, position);
  }

  // Play background theme
  public playTheme(): void {
    if (!this.isInitialized) {
      console.log('AudioManager not initialized yet, retrying theme music...');
      // If not initialized yet, try again in a short while
      setTimeout(() => this.playTheme(), 500);
      return;
    }

    if (!this.hasUserInteracted) {
      console.log('Waiting for user interaction to start theme music...');
      return;
    }

    const theme = this.sounds.get('theme');
    if (theme) {
      if (!theme.playing()) {
        console.log('Starting theme music...');
        const playResult = theme.play();

        // Handle play promise for browsers that return one
        if (playResult && typeof playResult.catch === 'function') {
          playResult.catch((error: any) => {
            console.warn('Theme music play failed:', error);
          });
        }
      } else {
        console.log('Theme music already playing');
      }
    } else {
      console.warn('Theme music not found in sounds map');
    }
  }

  // Stop background theme
  public stopTheme(): void {
    const theme = this.sounds.get('theme');
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

  // Generic sound playing method with spatial audio
  private playSound(soundKey: string, position?: THREE.Vector3): void {
    const sound = this.sounds.get(soundKey);
    if (!sound) return;

    const soundId = sound.play();

    // Apply spatial audio if position is provided and sound supports it
    if (position && soundKey !== 'theme') {
      sound.pos(position.x, position.y, position.z, soundId);
    }
  }

  // Volume controls
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    Howler.volume(this.masterVolume);
  }

  public setSFXVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));

    // Update all non-music sounds
    this.sounds.forEach((sound, key) => {
      if (key !== 'theme') {
        sound.volume(this.sfxVolume);
      }
    });
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));

    const theme = this.sounds.get('theme');
    if (theme) {
      theme.volume(this.musicVolume);
    }
  }

  // Mute/unmute controls
  public muteAll(): void {
    Howler.mute(true);
  }

  public unmuteAll(): void {
    Howler.mute(false);
  }

  public muteSFX(): void {
    this.sounds.forEach((sound, key) => {
      if (key !== 'theme') {
        sound.mute(true);
      }
    });
  }

  public unmuteSFX(): void {
    this.sounds.forEach((sound, key) => {
      if (key !== 'theme') {
        sound.mute(false);
      }
    });
  }

  public muteMusic(): void {
    const theme = this.sounds.get('theme');
    if (theme) {
      theme.mute(true);
    }
  }

  public unmuteMusic(): void {
    const theme = this.sounds.get('theme');
    if (theme) {
      theme.mute(false);
    }
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
}
