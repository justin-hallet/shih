/**
 * Space Harrier: Infinite Horizons
 * Main entry point for the game
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { CellShadingPass } from './shaders/CellShadingPass.js';
import { OutlinePass } from './shaders/OutlinePass.js';
import { VisualEffectPresetPass } from './shaders/VisualEffectPresetPass.js';
import { CollisionDebugRenderer } from './utils/CollisionDebugRenderer';
import { HUD } from './components/HUD';
import { SettingsPanel } from './components/SettingsPanel.js';
import { VirtualController } from './components/VirtualController';
import { EntityManager } from './core/EntityManager';
import { WorldGenerator } from './core/world/WorldGenerator';
import { BiomeManager } from './core/world/BiomeManager';
import { Player } from './core/entities/Player';
import { BaseEntity } from './core/Entity';
import { ProceduralGenerationSettings } from './core/world/types';
import { CameraController } from './core/CameraController';
import { AudioManager } from './core/AudioManager';
import { PowerUp } from './core/entities/PowerUp';
import { Enemy } from './core/entities/Enemy';
import { GameOverlay } from './components/GameOverlay';
import { ScoreManager } from './core/ScoreManager';
import { InputManager } from './core/InputManager';
import { InputController, Action } from './core/InputController';
import { GameState } from './core/GameState';
import { PlayerController } from './core/PlayerController';
import { CombatSystem } from './core/CombatSystem';
import { WaveSpawner } from './core/WaveSpawner';
import './styles/hud.css';
import './styles/overlay.css';

// eslint-disable-next-line no-console
console.log('🚀 Space Harrier: Infinite Horizons - Starting up...');

// Layout settings
let layoutStyle: 'auto' | 'mobile' | 'desktop' = 'auto'; // User override for layout

// Improved mobile/tablet detection
function isMobileDevice(): boolean {
  // Check user agent for mobile/tablet indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = [
    'mobile',
    'android',
    'iphone',
    'ipad',
    'ipod',
    'blackberry',
    'windows phone',
    'opera mini',
    'iemobile',
    'tablet',
  ];

  const hasMobileKeyword = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check if browser is requesting mobile site
  const requestsMobileSite =
    userAgent.includes('mobile') || userAgent.includes('mobi') || window.innerWidth <= 768; // Fallback for width

  // Detect tablets specifically (they often don't include 'mobile' in UA)
  const isTablet =
    userAgent.includes('tablet') ||
    userAgent.includes('ipad') ||
    (userAgent.includes('android') && !userAgent.includes('mobile'));

  return hasMobileKeyword || hasTouch || requestsMobileSite || isTablet;
}

// Determine if we should use mobile layout
function shouldUseMobileLayout(): boolean {
  const isMobile = isMobileDevice();

  switch (layoutStyle) {
    case 'mobile':
      return true;
    case 'desktop':
      return false;
    case 'auto':
    default:
      return isMobile;
  }
}

// Create basic Three.js scene for testing
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000); // Increased far plane

// Add fog to mask world edges at chunk unload distance (calculated later)
const fogColor = 0x1e3c72; // Match clear color for seamless blending
// Fog parameters will be set after procedural settings are defined

// Initialize camera controller
const cameraController = new CameraController(camera);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(fogColor); // Use same color as fog // Space Harrier blue gradient

// Postprocessing: SSAO + Cell shading + Outline + Bloom composer
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
// Ensure fog is rendered in the post-processing pipeline
renderPass.clear = true;
composer.addPass(renderPass);

// SSAO pass for realistic ambient occlusion
const ssaoPass = new SSAOPass(scene, camera, window.innerWidth, window.innerHeight);
ssaoPass.kernelRadius = 16; // Radius of the SSAO kernel
ssaoPass.minDistance = 0.005; // Minimum distance for occlusion
ssaoPass.maxDistance = 0.1; // Maximum distance for occlusion
ssaoPass.output = SSAOPass.OUTPUT.Default; // Default combines SSAO with scene
composer.addPass(ssaoPass);

// Cell shading pass (Borderlands-style)
const cellShadingPass = new CellShadingPass(window.innerWidth, window.innerHeight);
cellShadingPass.enabled = false;
composer.addPass(cellShadingPass);

// Outline pass for silhouette effects
const outlinePass = new OutlinePass(scene, camera, window.innerWidth, window.innerHeight);
composer.addPass(outlinePass);

// Visual Effect Preset pass for special effects
const visualEffectPresetPass = new VisualEffectPresetPass(window.innerWidth, window.innerHeight);
composer.addPass(visualEffectPresetPass);

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.8, // reduced strength to work with cell shading
  0.6, // radius
  0.9, // higher threshold for more selective bloom
);
composer.addPass(bloomPass);

// Add lighting for terrain visibility
const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // Soft ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 1000;
// Widen shadow camera to cover gameplay area
(directionalLight.shadow.camera as THREE.OrthographicCamera).left = -500;
(directionalLight.shadow.camera as THREE.OrthographicCamera).right = 500;
(directionalLight.shadow.camera as THREE.OrthographicCamera).top = 500;
(directionalLight.shadow.camera as THREE.OrthographicCamera).bottom = -500;
directionalLight.shadow.bias = -0.0003;
scene.add(directionalLight);

// Replace the loading div with our Three.js canvas
const appDiv = document.getElementById('app');
if (appDiv) {
  // Remove loading content and add canvas
  appDiv.innerHTML = '';
  appDiv.appendChild(renderer.domElement);

  // Make sure the app div doesn't interfere with rendering
  appDiv.style.display = 'block';
  appDiv.style.width = '100vw';
  appDiv.style.height = '100vh';
  appDiv.style.margin = '0';
  appDiv.style.padding = '0';
}

// Game start function
function startGame() {
  // Reset player position and stats
  const initialTerrainY = worldGenerator.getTerrainHeightAt(tileCenter, tileCenter);
  player.position.set(tileCenter, initialTerrainY + HOVER_HEIGHT, tileCenter);
  player.reset({
    health: startingHealth,
    weaponLevel: startingWeapon,
    ammo: startingAmmo,
    position: {
      x: tileCenter,
      y: initialTerrainY + HOVER_HEIGHT,
      z: tileCenter,
    },
  });

  // Reset HUD
  hud?.updateLives(startingLives);
  hud?.updateShieldSegments(startingHealth);
  hud?.updateWeaponLevel(startingWeapon);
  hud?.updateAmmo(startingAmmo);
  hud?.updateSpeed(startingSpeedLevel);

  // Transition to "start" state (shows "GET READY!" animation)
  gameOverlay.setState('start');

  // Request fullscreen on mobile devices
  if (isMobileDevice()) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn('Fullscreen request failed:', err);
      });
    } else if ((document.documentElement as any).webkitRequestFullscreen) {
      (document.documentElement as any).webkitRequestFullscreen();
    } else if ((document.documentElement as any).mozRequestFullScreen) {
      (document.documentElement as any).mozRequestFullScreen();
    } else if ((document.documentElement as any).msRequestFullscreen) {
      (document.documentElement as any).msRequestFullscreen();
    }
  }

  // Start theme music (welcome sound is triggered by state change event)
  audioManager.playTheme();

  // Any other game initialization can go here
  console.log('🎮 Game started!');
}

// Game over function
function handleGameOver() {
  // Set game over flag
  gameState.gameOver = true;

  // Stop player movement
  gameState.railsSpeed = 0;

  // Transition to game over state
  gameOverlay.setState('gameover');

  audioManager.playGameover();

  console.log('💀 Game Over!');
}

/**
 * Main reset function - orchestrates all component resets with proper separation of concerns
 */
function resetGame() {
  console.log('🔄 Resetting game...');

  // Calculate initial player position
  const initialTerrainY = worldGenerator.getTerrainHeightAt(tileCenter, tileCenter);
  const initialPosition = {
    x: tileCenter,
    y: initialTerrainY + HOVER_HEIGHT,
    z: tileCenter,
  };

  // 1. Reset EntityManager - remove all entities except player
  if (player) {
    entityManager.reset([player]);
  }

  // 2. Reset Player with starting values and position
  if (player) {
    player.reset({
      health: startingHealth,
      weaponLevel: startingWeapon,
      ammo: startingAmmo,
      position: initialPosition,
    });
  }

  // 3. Reset HUD with starting values
  if (hud) {
    hud.reset({
      lives: startingLives,
      health: startingHealth,
      weaponLevel: startingWeapon,
      ammo: startingAmmo,
      speedLevel: startingSpeedLevel,
      score: 0,
      stage: 1,
    });
  }

  // 4. Reset WorldGenerator - repopulate chunks with fresh entities
  worldGenerator.reset();

  // 5. Reset AudioManager - clear timeouts and stop sounds
  audioManager.reset();

  // 6. Reset ScoreManager
  scoreManager.reset();

  // 7. Reset main game state
  gameState.resetForNewGame(startingSpeedLevel, HOVER_HEIGHT, initialPosition);

  console.log('✅ Game reset complete!');
}

// Game overlay is already initialized above

// Style the canvas to fill the screen
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';

// Initialize HUD overlay
let hud: HUD | null = null;

// Initialize Entity System with higher limits for infinite world
const entityManager = new EntityManager({
  scene,
  maxEntities: 35000, // High limit for safety (49 chunks × ~30 entities = ~1470 max expected)
});

if (appDiv) {
  hud = new HUD(appDiv);
}

// Initialize Audio Manager
const audioManager = new AudioManager();

// Initialize Score Manager
const scoreManager = new ScoreManager();

// Initialize Input Manager
const inputManager = new InputManager();

// Connect score manager to HUD
if (hud) {
  // Set initial top score
  hud.updateScore(0, scoreManager.getTopScore());

  scoreManager.setOnScoreUpdate((score, event) => {
    hud.updateScore(score, scoreManager.getTopScore());

    // Optional: Log scoring events for debugging
    if (event.type === 'enemy_kill' && event.details?.enemyType) {
      console.log(`💀 Enemy kill: ${event.details.enemyType} (+${event.points} points)`);
    }
  });
}

// Set audio manager for Player class
Player.setAudioManager(audioManager);

// Set score manager for Enemy class
Enemy.setScoreManager(scoreManager);

// Set game over callback for Player class
Player.setGameOverCallback(handleGameOver);

// Set death/respawn callbacks for Player class
Player.setOnDeathCallback(() => {
  console.log('🛑 Player death event - stopping rails movement');
  gameState.railsSpeed = 0; // Stop forward movement during death sequence
  gameState.playerInDeathSequence = true; // Prevent rails speed reset
});

Player.setOnRespawnCallback(() => {
  console.log('🚀 Player respawn event - resuming rails movement');
  gameState.playerInDeathSequence = false; // Allow rails speed reset
  gameState.railsSpeed = gameState.getSpeedFromLevel(gameState.speedLevel); // Resume movement
});

// Initialize Game Overlay
const gameOverlay = new GameOverlay({
  onStateChange: (newState, _oldState) => {
    // Update score manager game state
    scoreManager.setGamePlaying(newState === 'playing');

    if (newState === 'start') {
      resetGame();
      // Trigger welcome sound when entering "start" state
      audioManager.playWelcome();
    } else if (newState === 'gameover') {
      // Handle game over logic
      audioManager.stopTheme();
    }
  },
  onPlayButtonClick: () => {
    startGame();
  },
});

// Initialize Settings Panel
// Initialize collision debug renderer
const collisionDebugRenderer = new CollisionDebugRenderer(scene);
collisionDebugRenderer.setCamera(camera);

const settingsPanel = new SettingsPanel();
settingsPanel.setCellShadingPass(cellShadingPass);
settingsPanel.setSSAOPass(ssaoPass);
settingsPanel.setAudioManager(audioManager);
settingsPanel.setCollisionDebugRenderer(collisionDebugRenderer);

// Set up debug panel callbacks (wired after InputController is created below)
// These closures capture `inputController` which is assigned after worldGenerator init.
settingsPanel.setWeaponChangeCallback((weaponType: number) => {
  inputController.handleAction(`set_weapon_${weaponType}` as Action, false);
});

settingsPanel.setDebugToggleCallback((type: string, enabled: boolean) => {
  if (type === 'debugObstacles') {
    if (gameState.debugObstacles !== enabled) {
      inputController.handleAction('toggle_debug_obstacles', false);
    }
  } else if (type === 'debugEnemies') {
    if (gameState.debugEnemies !== enabled) {
      inputController.handleAction('toggle_debug_enemies', false);
    }
  } else if (type === 'debugPowerups') {
    if (gameState.debugPowerups !== enabled) {
      inputController.handleAction('toggle_debug_powerups', false);
    }
  }
});

settingsPanel.setDisplayToggleCallback((type: string, enabled: boolean) => {
  if (type === 'wireframe') {
    if (gameState.showWireframe !== enabled) {
      inputController.handleAction('toggle_wireframe', false);
    }
  } else if (type === 'surface') {
    if (gameState.showSurface !== enabled) {
      inputController.handleAction('toggle_surface', false);
    }
  }
});

settingsPanel.setCameraModeChangeCallback((mode: string) => {
  const cameraMode = CameraController.stringToCameraMode(mode);
  cameraController.setCameraMode(cameraMode);
  console.log(
    `🎥 Camera mode changed to: ${CameraController.getCameraModeDisplayName(cameraMode)}`,
  );
});

settingsPanel.setVisualEffectPresetChangeCallback((preset: string) => {
  // Convert dropdown value to preset type
  const presetLower = preset.toLowerCase().replace(/\s+/g, '_');

  if (presetLower === 'none') {
    visualEffectPresetPass.setPreset('none');
  } else if (presetLower === '90s') {
    visualEffectPresetPass.setPreset('90s');
  } else if (presetLower === 'pixelate') {
    visualEffectPresetPass.setPreset('pixelate');
  } else if (presetLower === 'black_&_white') {
    visualEffectPresetPass.setPreset('bw');
  } else if (presetLower === 'black_&_white_&_red') {
    visualEffectPresetPass.setPreset('bw_red');
  } else if (presetLower === 'vhs') {
    visualEffectPresetPass.setPreset('vhs');
  } else if (presetLower === 'crt') {
    visualEffectPresetPass.setPreset('crt');
  } else if (presetLower === 'snow') {
    // Snow shader effect
    visualEffectPresetPass.setPreset('snow');
  } else if (presetLower === 'rain') {
    // Rain shader effect
    visualEffectPresetPass.setPreset('rain');
  }

  console.log(`🎨 Visual effect preset changed to: ${preset}`);
});

// Set outline pass on BaseEntity so entities can create/remove outline effects
BaseEntity.setOutlinePass(outlinePass);

// Expose references on scene.userData for entity-layer code that reads them
// (Player.ts reads hud, EntityManager.ts reads collisionDebugRenderer)
scene.userData['hud'] = hud;
scene.userData['entityManager'] = entityManager;
scene.userData['camera'] = camera;
scene.userData['collisionDebugRenderer'] = collisionDebugRenderer;

// Configure procedural generation settings
const CHUNK_GRID_SIZE = 7; //  grid of chunks around player for better coverage
const TILE_SIZE = 200; // Size of each tile in world units
const proceduralSettings: ProceduralGenerationSettings = {
  worldRadius: 5000, // 5km radius world
  tileSize: TILE_SIZE, // Larger 200-unit tiles for proper screen coverage

  biomeNoiseParams: {
    seed: 12345,
    octaves: 4,
    frequency: 0.001,
    amplitude: 1.0,
    persistence: 0.5,
    lacunarity: 2.0,
  },
  biomeBlendDistance: 64,

  lodSettings: {
    high: 200, // High detail within 200 units
    medium: 500, // Medium detail within 500 units
    low: 1000, // Low detail within 1000 units
    cull: 1500, // Remove beyond 1500 units
  },

  // All chunk loading parameters calculated from grid size with extra buffer
  preloadDistance: Math.floor(CHUNK_GRID_SIZE / 2) * TILE_SIZE, // Grid radius * tileSize = 5 * 200 = 1000
  unloadDistance: Math.floor(CHUNK_GRID_SIZE / 2) * TILE_SIZE + 3 * TILE_SIZE, // Preload + 3 tile buffer = 1600
  maxLoadedChunks: CHUNK_GRID_SIZE * CHUNK_GRID_SIZE, // 11 * 11 = 121 chunks

  terrainResolution: 65, // 65x65 heightmap per tile (for 64x64 subdivisions)
  detailDensity: 1.0, // Normal detail density

  varietyLevel: 0.7, // High variety
  contentDensity: 1.2, // 20% more content

  generateAsync: true,
  maxGenerationTime: 50, // Balanced generation time for smooth 60fps performance
};

// Configure fog to mask world edges at chunk boundaries
const fogNear = proceduralSettings.preloadDistance * 0.9; // Start fog at 90% of preload distance (900)
const fogFar = proceduralSettings.unloadDistance; // Full fog at chunk unload distance (1600)
scene.fog = new THREE.Fog(fogColor, fogNear, fogFar);

// Debug chunk loading parameters
console.log(`🗺️ Chunk Config: Grid=${CHUNK_GRID_SIZE}x${CHUNK_GRID_SIZE}, TileSize=${TILE_SIZE}`);
console.log(
  `📏 Preload: ${proceduralSettings.preloadDistance} units (${Math.ceil(proceduralSettings.preloadDistance / TILE_SIZE)} tiles)`,
);
console.log(
  `📤 Unload: ${proceduralSettings.unloadDistance} units (${Math.ceil(proceduralSettings.unloadDistance / TILE_SIZE)} tiles)`,
);
console.log(`📦 Max chunks: ${proceduralSettings.maxLoadedChunks}`);

// Initialize Procedural World Generation System
const biomeManager = new BiomeManager();
const worldGenerator = new WorldGenerator(scene, entityManager, proceduralSettings);
scene.userData['worldGenerator'] = worldGenerator; // Player.ts reads this for death sequence terrain lookup

// Temporarily disable directional culling if it's causing performance issues
// worldGenerator.disableDirectionalCulling();

// Spawn player at origin above ground
// Spawn player at center of world - start at tile (0,0) center
const tileCenter = 100; // Half of tileSize (200/2) to center in first tile
const HOVER_HEIGHT = 2.0; // default hover height above terrain
const MIN_FLOOR_CLEARANCE = 0.5; // minimal clearance when flying down toward the floor
const MAX_FLIGHT_HEIGHT = 150; // maximum height player can fly (absolute world height)

let player: any; // Will be initialized in startGame()

// Connect mobile settings button to settings panel
if (hud) {
  hud.setSettingsCallback(() => {
    settingsPanel.toggle();
  });
}

// Initialize Virtual Controller for mobile touch input
let virtualControllerFiring = false; // Track firing state for InputManager

const virtualController = new VirtualController({
  onMove: direction => {
    // Use InputManager's built-in virtual controller handler
    // It handles dead zone, horizontal/vertical movement, and invert Y
    const dirVector = new THREE.Vector2(direction.x, direction.y);
    inputManager.handleVirtualControllerInput(dirVector, virtualControllerFiring);
  },
  onMoveEnd: () => {
    // Stop all movement when joystick is released
    inputManager.handleVirtualControllerInput(new THREE.Vector2(0, 0), virtualControllerFiring);
  },
  onFire: pressed => {
    // Update firing state and notify InputManager
    virtualControllerFiring = pressed;
    inputManager.setActionState('fire', pressed);
  },
});

// Function to update layout and controller based on current settings
function updateLayoutAndController() {
  const useMobile = shouldUseMobileLayout();

  // Update virtual controller mode
  virtualController.setEnabled(true);
  virtualController.setMode(!useMobile); // Desktop mode = true, Mobile mode = false

  // Update HUD layout (CSS will handle the responsive changes)
  const hudElement = document.getElementById('game-hud');
  if (hudElement) {
    if (useMobile) {
      hudElement.classList.add('mobile-layout');
      hudElement.classList.remove('desktop-layout');
    } else {
      hudElement.classList.add('desktop-layout');
      hudElement.classList.remove('mobile-layout');
    }
  }
}

// Initial setup
updateLayoutAndController();

// Force re-initialization after page is fully loaded to ensure proper mobile detection
// This fixes the issue where the dynamic virtual joystick doesn't appear on desktop clean loads
window.addEventListener('load', () => {
  setTimeout(() => {
    updateLayoutAndController();
  }, 100); // Small delay to ensure window dimensions are stable
});

// Connect virtual controller to settings panel
settingsPanel.setVirtualController(virtualController);
settingsPanel.setControlsChangeCallback((type: string, value: boolean | string) => {
  if (type === 'leftHandedControls') {
    virtualController.setLeftHanded(value as boolean);
  } else if (type === 'movementStrafe') {
    gameState.movementStrafe = value as boolean;
  } else if (type === 'invertY') {
    // Propagate invert Y setting to input manager
    inputManager.setInvertY(value as boolean);
  } else if (type === 'layoutStyle') {
    layoutStyle = value as 'auto' | 'mobile' | 'desktop';
    // Trigger layout update
    updateLayoutAndController();
  }
});

// Set up audio manager
audioManager.setCamera(camera);
PowerUp.setAudioManager(audioManager);
Enemy.setAudioManager(audioManager);

// Theme music will start automatically on first user interaction

// Initialize world generation around player
worldGenerator.updatePlayerPosition(new THREE.Vector3(tileCenter, 2, tileCenter));

// Prevent context menu on right click
window.addEventListener('contextmenu', event => {
  event.preventDefault();
});

// Position camera to follow behind player (much closer, player lower in frame)
camera.position.set(0, 3, 5);
camera.lookAt(0, 3, 0); // Look above origin to position player lower in viewport

// Initialize player stats and HUD (Borderlands-style bottom-left)
const startingHealth = 8; // 0-8 (displayed as shield segments)
const startingLives = 3; // 1-8
const startingWeapon = 1; // 1-5 (default 1)
const startingAmmo = 150; // 0-250

// New simplified speed system: 5 levels (1-5)
// Level 1 = current default speed (50), levels 2-5 are multipliers
const baseSpeed = 50; // Base speed for level 1
const startingSpeedLevel = 1; // Default to level 1 (minimum)

// Initialize typed game state (replaces scene.userData string keys)
const gameState = new GameState({
  baseSpeed,
  startingSpeedLevel,
  hoverHeight: HOVER_HEIGHT,
});

// Set cross-system references on gameState
gameState.hud = hud;
gameState.entityManager = entityManager;
gameState.camera = camera;
gameState.outlinePass = outlinePass;
gameState.ssaoPass = ssaoPass;
gameState.collisionDebugRenderer = collisionDebugRenderer;

// Expose gameState on scene.userData so entity-layer code (Player.ts) can access it
scene.userData['gameState'] = gameState;

// Persist visualization flags on scene so new tiles can read them
scene.userData['showWireframe'] = gameState.showWireframe;
scene.userData['showSurface'] = gameState.showSurface;

// Initialize WaveSpawner for distance-triggered enemy waves
const waveSpawner = new WaveSpawner(entityManager, gameState);

// Initialize InputController (keyboard bindings, key listeners, debug/config actions)
const inputController = new InputController({
  gameState,
  inputManager,
  cellShadingPass,
  settingsPanel,
  collisionDebugRenderer,
  outlinePass,
  worldGenerator,
  scene,
  hud,
  gameOverlay,
  isMobileDevice,
});

// Apply initial visualization state to any already-added terrain
inputController.applyVisualizationToScene();

// Initialize demo player
const initialTerrainY = worldGenerator.getTerrainHeightAt(tileCenter, tileCenter);
player = entityManager.spawnPlayer({
  x: tileCenter,
  y: initialTerrainY + HOVER_HEIGHT,
  z: tileCenter,
});

// Set player in camera controller
cameraController.setPlayer(player);

// Set player reference in debug panel
settingsPanel.setPlayer(player);

// Register player with input manager
inputManager.registerHandler(player);

// Set up player audio
audioManager.setPlayerPosition(player.position);
BaseEntity.setAudioManager(audioManager);

// Initialize demo player stats
player.health = startingHealth;
player.weaponLevel = startingWeapon;
player.ammo = startingAmmo;

// Initialize HUD for demo mode
hud?.updateLives(startingLives);
hud?.updateShieldSegments(startingHealth);
hud?.updateWeaponLevel(startingWeapon);
hud?.updateAmmo(startingAmmo);
hud?.updateSpeed(startingSpeedLevel);

// Initialize PlayerController (movement, altitude, animation, ammo auto-spawn, projectile ground-kill)
const playerController = new PlayerController(
  gameState,
  worldGenerator,
  entityManager,
  cameraController,
  camera,
  directionalLight,
  {
    minFloorClearance: MIN_FLOOR_CLEARANCE,
    maxFlightHeight: MAX_FLIGHT_HEIGHT,
  },
);

// Initialize CombatSystem (projectile spawning, cooldown, weapon mapping, audio)
const combatSystem = new CombatSystem(gameState, entityManager, audioManager);

const clock = new THREE.Clock();
let fpsAccumulator = 0;
let fpsFrames = 0;
let fpsLastReport = 0;


function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  gameState.frameCount++;
  fpsAccumulator += deltaTime;
  fpsFrames++;

  // Update visual effect preset pass (for animated effects like VHS, CRT, Snow, Rain)
  visualEffectPresetPass.update(deltaTime);

  // Update all entities
  entityManager.update(deltaTime);

  // Update wave spawner for distance-triggered enemy waves
  waveSpawner.update();

  // Update procedural world generation
  if (player) {
    // Update audio manager with current player position
    audioManager.setPlayerPosition(player.position);

    // Process audio queue
    audioManager.processAudioQueue();

    // Rails shooter constant forward motion parallel to the floor (yaw only)
    const forwardDir = new THREE.Vector3(-Math.sin(gameState.mouseX), 0, -Math.cos(gameState.mouseX)).normalize();

    // Don't reset rails speed if game is over or player is in death sequence
    if (
      !gameState.gameOver &&
      !gameState.playerInDeathSequence &&
      !(gameState.railsSpeed > 0)
    ) {
      gameState.railsSpeed = 50;
    }
    const currentSpeed = gameState.railsSpeed;

    // Set player velocity instead of directly modifying position for smooth movement
    // Only move if game is not over
    if (!gameState.gameOver) {
      player.velocity.x = forwardDir.x * currentSpeed;
      player.velocity.z = forwardDir.z * currentSpeed;
    }
    // Keep existing Y velocity for vertical movement

    // Update player rotation to match movement direction
    (player as any).setRotation(gameState.mouseX);
    // Cache the last travel direction and speed for consistent projectile emission
    gameState.lastForwardDir = { x: forwardDir.x, y: 0, z: forwardDir.z };
    gameState.lastRailsSpeed = currentSpeed;
    // Space Harrier perspective: Allow manual altitude control
    // (Removed fixed altitude - now controlled by Q/E keys)

    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
    worldGenerator.updatePlayerPosition(playerPos);

    // Update world generator with movement mode and forward direction for chunk culling optimization
    worldGenerator.setMovementMode(gameState.movementStrafe);
    worldGenerator.setPlayerForwardDirection(forwardDir);

    // Track distance traveled for scoring
    const frameDistance = playerPos.distanceTo(gameState.lastPlayerPosition);
    gameState.distanceTraveled += frameDistance;

    // Add distance-based score (1 point per unit)
    if (frameDistance > 0) {
      scoreManager.addDistanceScore(frameDistance);
    }

    gameState.lastPlayerPosition.copy(playerPos);

    // Update camera controller with mouse input and let it handle positioning
    cameraController.setMouseRotation(gameState.mouseX, 0);
    cameraController.update();

    // Check for biome changes
    const currentBiome = biomeManager.getBiomeAt(player.position.x, player.position.z);
    if (gameState.lastBiome !== currentBiome) {
      gameState.lastBiome = currentBiome;
      const biomeConfig = biomeManager.getBiome(currentBiome);

      // Update stage based on biome exploration
      if (hud && biomeConfig) {
        gameState.gameStage++;
        hud.updateStage(gameState.gameStage);
      }
    }
  }

  // Update world generation system
  worldGenerator.update();

  // Player movement, animation, altitude, ammo auto-spawn, projectile ground-kill
  if (player) {
    playerController.update(player, deltaTime);
  }

  // Combat: projectile spawning, cooldown, audio, HUD ammo
  if (player) {
    combatSystem.update(player);
  }

  // Update HUD based on actual gameplay events
  if (hud) {
    // Score is now managed by ScoreManager and updated automatically via callbacks

    // FPS update roughly once per second
    if (fpsAccumulator - fpsLastReport >= 1.0) {
      const fps = Math.max(1, Math.round(fpsFrames / (fpsAccumulator - fpsLastReport)));
      hud.updateFPS(fps);
      fpsLastReport = fpsAccumulator;
      fpsFrames = 0;
    }

    // Add stage transition effect when entering new biomes
    if (gameState.lastBiome && gameState.frameCount % 10 === 0) {
      const stageElement = document.getElementById('current-stage');
      if (stageElement && stageElement.classList.contains('stage-updated')) {
        stageElement.classList.remove('stage-updated');
      }
    }
  }

  // Log world generation stats periodically
  if (gameState.frameCount % 300 === 0) {
    // Less frequent logging to reduce console spam
    const stats = worldGenerator.getGenerationStats();
    const streamingState = worldGenerator.getStreamingState();
    // Calculate expected chunks around player
    const preloadRadius = Math.ceil(1000 / 200); // 5 tiles
    const expectedChunks = Math.pow(preloadRadius * 2 + 1, 2); // 11×11 = 121
    const loadedChunks = streamingState.loadedChunks.size;
    const coverage = ((loadedChunks / expectedChunks) * 100).toFixed(1);

    // eslint-disable-next-line no-console
    console.log(
      `📊 World Coverage: ${loadedChunks}/${expectedChunks} chunks (${coverage}%), ${stats.chunksGenerated} total generated`,
    );

    // Update HUD speed readout with current rails speed
    hud?.updateSpeed(gameState.speedLevel);
    // eslint-disable-next-line no-console
    console.log(`🎯 Entities: ${entityManager.getEntityCount()} total`);
    // eslint-disable-next-line no-console
    console.log(
      `✈️  Flying at: (${player?.position.x.toFixed(1)}, ${player?.position.y.toFixed(1)}, ${player?.position.z.toFixed(1)})`,
    );
    // eslint-disable-next-line no-console
    console.log(`🎬 Scene objects: ${scene.children.length} total`);
    const terrainHeight = worldGenerator.getTerrainHeightAt(
      player?.position.x || 0,
      player?.position.z || 0,
    );
    // eslint-disable-next-line no-console
    console.log(
      `🌍 Terrain below: ${terrainHeight.toFixed(1)}m, Biome: ${gameState.lastBiome}, Distance: ${gameState.distanceTraveled.toFixed(1)}m`,
    );
    // eslint-disable-next-line no-console
    console.log(
      `📐 Camera Distance: ${camera.position.distanceTo(player.position).toFixed(1)} units`,
    );
  }

  // Use postprocessing pipeline so bloom is applied
  composer.render();
}

// Enhanced resize handler for mobile rotation support
function handleResize() {
  const width = window.innerWidth;
  const height = window.innerHeight;

  // Update camera
  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(width, height);
  // Keep composer in sync with viewport
  composer.setSize(width, height);
  // Update SSAO pass resolution
  ssaoPass.setSize(width, height);
  // Update cell shading pass resolution
  cellShadingPass.setSize(width, height);
  // Update outline pass resolution
  outlinePass.setSize(width, height);
  // Update visual effect preset pass resolution
  visualEffectPresetPass.setSize(width, height);

  // Update HUD for mobile rotation
  if (hud) {
    hud.handleResize();
  }

  // Update settings panel for mobile rotation
  settingsPanel.handleResize();

  // Update virtual controller for mobile rotation
  virtualController.handleResize();

  // Update layout based on new screen size
  updateLayoutAndController();
}

// Handle window resize and orientation changes
window.addEventListener('resize', handleResize);
window.addEventListener('orientationchange', () => {
  // Delay to allow orientation change to complete
  setTimeout(handleResize, 100);
});

// Start the animation loop
animate();

// eslint-disable-next-line no-console
console.log('✅ Space Harrier: Infinite Horizons fully initialized!');
// eslint-disable-next-line no-console
console.log('🌍 Procedural World Generation System: ACTIVE');
// eslint-disable-next-line no-console
console.log('🎯 Entity Management System: ACTIVE');
// eslint-disable-next-line no-console
console.log(`📊 Initial entities: ${entityManager.getEntityCount()}`);
// eslint-disable-next-line no-console
console.log(`🌟 Available biomes: ${biomeManager.getAllBiomes().length}`);
// eslint-disable-next-line no-console
console.log('🚀 Ready for infinite flight exploration!');

export {};
