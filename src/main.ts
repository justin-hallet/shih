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
import { CollisionDebugRenderer } from './utils/CollisionDebugRenderer';
import { HUD } from './components/HUD';
import { SettingsPanel } from './components/SettingsPanel.js';
import { VirtualController } from './components/VirtualController';
import { EntityManager } from './core/EntityManager';
import { WorldGenerator } from './core/world/WorldGenerator';
import { BiomeManager } from './core/world/BiomeManager';
import { ProceduralGenerationSettings, BiomeType } from './core/world/types';
import { EntityType, PowerUpType, ProjectileSubType } from './core/types';
import { CameraController } from './core/CameraController';
import { AudioManager } from './core/AudioManager';
import { PowerUp } from './core/entities/PowerUp';
import { Enemy } from './core/entities/Enemy';
import { GameOverlay } from './components/GameOverlay';
import './styles/hud.css';
import './styles/overlay.css';

// eslint-disable-next-line no-console
console.log('🚀 Space Harrier: Infinite Horizons - Starting up...');

// Movement settings
let movementStrafe = true; // true = strafe mode, false = turn mode
let invertY = false;

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

// Keep light and its shadow frustum centered around the camera/player
function updateShadowRig(): void {
  const up = new THREE.Vector3(0, 1, 0);
  const forward = new THREE.Vector3();
  camera.getWorldDirection(forward);
  forward.normalize();
  const right = new THREE.Vector3().crossVectors(forward, up).normalize();

  // Position light slightly behind and above the camera, offset to one side
  const lightPos = new THREE.Vector3()
    .copy(camera.position)
    .addScaledVector(forward, -150)
    .addScaledVector(up, 180)
    .addScaledVector(right, -80);
  directionalLight.position.copy(lightPos);

  // Look at player if available, otherwise a point in front of camera
  const targetPos = player
    ? player.position
    : new THREE.Vector3().copy(camera.position).addScaledVector(forward, 100);
  directionalLight.target.position.copy(targetPos);
  directionalLight.target.updateMatrixWorld();

  // Dynamic shadow camera extents based on camera height and speed
  const halfSize = Math.min(800, Math.max(300, camera.position.y * 8));
  const ortho = directionalLight.shadow.camera as THREE.OrthographicCamera;
  ortho.left = -halfSize;
  ortho.right = halfSize;
  ortho.top = halfSize;
  ortho.bottom = -halfSize;
  ortho.near = 1;
  ortho.far = halfSize * 4;
  ortho.updateProjectionMatrix();
}

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
  scene.userData['gameOver'] = true;

  // Stop player movement
  scene.userData['railsSpeed'] = 0;

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

  // 6. Reset main game state
  resetMainGameState(initialPosition);

  console.log('✅ Game reset complete!');
}

/**
 * Reset main.ts specific game state variables
 */
function resetMainGameState(initialPosition: { x: number; y: number; z: number }) {
  // Reset game flags
  scene.userData['gameOver'] = false;
  scene.userData['speedLevel'] = startingSpeedLevel;
  scene.userData['railsSpeed'] = getSpeedFromLevel(startingSpeedLevel);

  // Reset game state tracking
  gameScore = 0;
  gameStage = 1;
  distanceTraveled = 0;
  frameCount = 0;
  lastBiome = null;

  // Reset player tracking position
  lastPlayerPosition.x = initialPosition.x;
  lastPlayerPosition.y = initialPosition.y;
  lastPlayerPosition.z = initialPosition.z;

  // Reset mouse rotation
  mouseX = 0;
}

// Game overlay is already initialized above

// Style the canvas to fill the screen
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';

// Initialize HUD overlay
let hud: HUD | null = null;
let gameScore = 0;
let gameStage = 1;

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

// Initialize Game Overlay
const gameOverlay = new GameOverlay({
  onStateChange: (newState, oldState) => {
    if (newState === 'start') {
      resetGame();
      // Trigger welcome sound when entering "start" state
      audioManager.playWelcome();
    } else if (newState === 'gameover') {
      // Handle game over logic
      audioManager.stopTheme();
    }
    // Note: oldState parameter is available but not currently used
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

// Set up debug panel callbacks
settingsPanel.setWeaponChangeCallback((weaponType: number) => {
  handleAction(`set_weapon_${weaponType}` as Action, false);
});

settingsPanel.setDebugToggleCallback((type: string, enabled: boolean) => {
  if (type === 'debugObstacles') {
    const currentFlag = scene.userData['debugObstacles'] || false;
    if (currentFlag !== enabled) {
      handleAction('toggle_debug_obstacles', false);
    }
  } else if (type === 'debugEnemies') {
    const currentFlag = scene.userData['debugEnemies'] || false;
    if (currentFlag !== enabled) {
      handleAction('toggle_debug_enemies', false);
    }
  } else if (type === 'debugPowerups') {
    const currentFlag = scene.userData['debugPowerups'] || false;
    if (currentFlag !== enabled) {
      handleAction('toggle_debug_powerups', false);
    }
  }
});

settingsPanel.setDisplayToggleCallback((type: string, enabled: boolean) => {
  if (type === 'wireframe') {
    if (showWireframe !== enabled) {
      // showWireframe = enabled;
      handleAction('toggle_wireframe', false);
    }
  } else if (type === 'surface') {
    if (showSurface !== enabled) {
      // showSurface = enabled;
      handleAction('toggle_surface', false);
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
// Ensure userData exists
(scene as any).userData = (scene as any).userData || {};
(scene as any).userData['hud'] = hud;
(scene as any).userData['entityManager'] = entityManager;
(scene as any).userData['camera'] = camera;
(scene as any).userData['outlinePass'] = outlinePass;
(scene as any).userData['ssaoPass'] = ssaoPass;
(scene as any).userData['collisionDebugRenderer'] = collisionDebugRenderer;

// Configure procedural generation settings
const CHUNK_GRID_SIZE = 11; // 11x11 grid of chunks around player for better coverage
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

// Temporarily disable directional culling if it's causing performance issues
// worldGenerator.disableDirectionalCulling();

// Spawn player at origin above ground
// Spawn player at center of world - start at tile (0,0) center
const tileCenter = 100; // Half of tileSize (200/2) to center in first tile
const HOVER_HEIGHT = 2.0; // desired constant height above terrain when not flying vertically
const MIN_FLOOR_CLEARANCE = 0.5; // minimal clearance when flying down toward the floor
const initialTerrainY = worldGenerator.getTerrainHeightAt(tileCenter, tileCenter);
const player = entityManager.spawnPlayer({
  x: tileCenter,
  y: initialTerrainY + HOVER_HEIGHT,
  z: tileCenter,
});

// Set player in camera controller
cameraController.setPlayer(player);

// Set player reference in debug panel now that it's created
settingsPanel.setPlayer(player);

// Connect mobile settings button to settings panel
if (hud) {
  hud.setSettingsCallback(() => {
    settingsPanel.toggle();
  });
}

// Initialize Virtual Controller for mobile touch input
const virtualController = new VirtualController({
  onMove: direction => {
    // Map joystick input to movement actions
    const threshold = 0.3; // Dead zone threshold

    // Handle horizontal movement (strafe or turn based on setting)
    if (Math.abs(direction.x) > threshold) {
      if (direction.x > 0) {
        handleAction('right_movement', true);
        handleAction('left_movement', false);
      } else {
        handleAction('left_movement', true);
        handleAction('right_movement', false);
      }
    } else {
      handleAction('left_movement', false);
      handleAction('right_movement', false);
    }

    // Handle vertical movement (ascend/descend with invert Y support)
    if (Math.abs(direction.y) > threshold) {
      const yUp = invertY ? direction.y > 0 : direction.y < 0;
      if (yUp) {
        handleAction('ascend', true);
        handleAction('descend', false);
      } else {
        handleAction('descend', true);
        handleAction('ascend', false);
      }
    } else {
      handleAction('ascend', false);
      handleAction('descend', false);
    }
  },
  onMoveEnd: () => {
    // Stop all movement when joystick is released
    handleAction('left_movement', false);
    handleAction('right_movement', false);
    handleAction('ascend', false);
    handleAction('descend', false);
  },
  onFire: pressed => {
    // Handle fire button
    handleAction('fire', pressed);
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
    movementStrafe = value as boolean;
  } else if (type === 'invertY') {
    invertY = value as boolean;
  } else if (type === 'layoutStyle') {
    layoutStyle = value as 'auto' | 'mobile' | 'desktop';
    // Trigger layout update
    updateLayoutAndController();
  }
});

// Set up audio manager
audioManager.setCamera(camera);
audioManager.setPlayerPosition(player.position);
(player as any).setAudioManager(audioManager);
PowerUp.setAudioManager(audioManager);
Enemy.setAudioManager(audioManager);

// Theme music will start automatically on first user interaction

// Initialize world generation around player
worldGenerator.updatePlayerPosition(new THREE.Vector3(tileCenter, 2, tileCenter));

// Manual Player Controls - configurable key → action mapping
type Action =
  | 'ascend'
  | 'descend'
  | 'left_movement'
  | 'right_movement'
  | 'turn_left'
  | 'turn_right'
  | 'strafe_left'
  | 'strafe_right'
  | 'fire'
  | 'speed_up'
  | 'speed_down'
  | 'toggle_wireframe'
  | 'toggle_surface'
  | 'set_weapon_1'
  | 'set_weapon_2'
  | 'set_weapon_3'
  | 'set_weapon_4'
  | 'set_weapon_5'
  | 'toggle_debug_obstacles'
  | 'toggle_debug_enemies'
  | 'toggle_debug_powerups'
  | 'switch_model'
  | 'toggle_cell_shading'
  | 'adjust_edge_threshold'
  | 'adjust_color_levels'
  | 'toggle_debug_panel'
  | 'toggle_collision_debug'
  | 'cycle_powerup_debug'
  | 'debug_hurt'
  | 'debug_kill';

const KeyBindings: Record<string, Action> = {
  // Movement
  KeyW: 'ascend',
  ArrowUp: 'ascend',
  Numpad8: 'ascend',
  KeyS: 'descend',
  ArrowDown: 'descend',
  Numpad2: 'descend',
  KeyA: 'left_movement',
  ArrowLeft: 'left_movement',
  Numpad4: 'left_movement',
  KeyD: 'right_movement',
  ArrowRight: 'right_movement',
  Numpad6: 'right_movement',
  // Fire
  Space: 'fire',
  Enter: 'fire',
  ShiftLeft: 'fire',
  ShiftRight: 'fire',
  Numpad5: 'fire',
  // Speed adjust
  Equal: 'speed_up', // '+' (requires Shift on US keyboards)
  NumpadAdd: 'speed_up',
  Minus: 'speed_down',
  NumpadSubtract: 'speed_down',
  // Visualization toggles
  KeyO: 'toggle_wireframe',
  KeyF: 'toggle_surface',
  // Debug weapon level
  Digit1: 'set_weapon_1',
  Digit2: 'set_weapon_2',
  Digit3: 'set_weapon_3',
  Digit4: 'set_weapon_4',
  Digit5: 'set_weapon_5',
  // Debug bloom overrides
  Digit6: 'toggle_debug_obstacles',
  Digit7: 'toggle_debug_enemies',
  Digit8: 'toggle_debug_powerups',
  Digit9: 'toggle_collision_debug',
  // Model switching
  KeyM: 'switch_model',
  // Cell shading controls
  KeyC: 'toggle_cell_shading',
  KeyV: 'adjust_edge_threshold',
  KeyB: 'adjust_color_levels',
  // Debug panel
  Backquote: 'toggle_debug_panel', // ~ key
  // PowerUp debug
  KeyP: 'cycle_powerup_debug', // P key
  // Debug damage/life
  KeyH: 'debug_hurt', // H key - apply random damage
  KeyK: 'debug_kill', // K key - remove a life
};

const actionDown: Partial<Record<Action, boolean>> = {};

// Terrain visualization state
let showWireframe = false;
let showSurface = true;

// Persist visualization flags on scene so new tiles can read them
scene.userData['showWireframe'] = showWireframe;
scene.userData['showSurface'] = showSurface;
// Apply initial state to any already-added terrain
function applyVisualizationToScene() {
  scene.traverse(child => {
    if (child instanceof THREE.Mesh && child.userData['isTerrain']) {
      child.visible = !!showSurface;
      for (const sub of child.children) {
        if (sub instanceof THREE.LineSegments && sub.userData['isTerrainWireframe']) {
          sub.visible = !!showWireframe;
          sub.renderOrder = 1;
        }
      }
    }
  });
}
applyVisualizationToScene();

let mouseX = 0;
const mouseY = 0;

// Keyboard event listeners using bindings
function handleAction(action: Action, isDown: boolean) {
  actionDown[action] = isDown;
  // One-shot on keyup for toggles
  if (!isDown) {
    if (action === 'toggle_wireframe') {
      showWireframe = !showWireframe;
      toggleTerrainVisualization();
      scene.userData['showWireframe'] = showWireframe;
    } else if (action === 'toggle_surface') {
      showSurface = !showSurface;
      toggleTerrainVisualization();
      scene.userData['showSurface'] = showSurface;
    } else if (action.startsWith('set_weapon_')) {
      const level = parseInt(action.split('_')[2] || '1', 10);
      if (player) {
        (player as any).weaponLevel = level;
        hud?.updateWeaponLevel(level);
      }
    } else if (action === 'toggle_debug_obstacles') {
      const flag = !(scene.userData['debugObstacles'] || false);
      scene.userData['debugObstacles'] = flag;
      applyDebugBloomOverride(EntityType.OBSTACLE, flag, 0xff00ff, true); // bright pink
    } else if (action === 'toggle_debug_enemies') {
      const flag = !(scene.userData['debugEnemies'] || false);
      scene.userData['debugEnemies'] = flag;
      applyDebugBloomOverride(EntityType.ENEMY, flag, 0xff0000, true); // bright red
    } else if (action === 'toggle_debug_powerups') {
      const flag = !(scene.userData['debugPowerups'] || false);
      scene.userData['debugPowerups'] = flag;
      applyDebugBloomOverride(EntityType.POWERUP, flag, 0x00ff00, false); // bright green
    } else if (action === 'switch_model') {
      if (player) {
        (player as any).switchToNextModel();
      }
    } else if (action === 'toggle_cell_shading') {
      // Toggle cell shading pass enabled/disabled
      cellShadingPass.enabled = !cellShadingPass.enabled;
    } else if (action === 'adjust_edge_threshold') {
      // Cycle through edge threshold values
      const currentThreshold = cellShadingPass.getEdgeThreshold();
      const thresholds = [0.05, 0.1, 0.15, 0.2, 0.3];
      const currentIndex = thresholds.indexOf(currentThreshold);
      const nextIndex = (currentIndex + 1) % thresholds.length;
      cellShadingPass.setEdgeThreshold(thresholds[nextIndex]);
    } else if (action === 'adjust_color_levels') {
      // Cycle through color quantization levels
      const currentLevels = cellShadingPass.getColorLevels();
      const levels = [3, 4, 5, 6, 8];
      const currentIndex = levels.indexOf(currentLevels);
      const nextIndex = (currentIndex + 1) % levels.length;
      cellShadingPass.setColorLevels(levels[nextIndex]);
    } else if (action === 'toggle_debug_panel') {
      settingsPanel.toggle();
    } else if (action === 'toggle_collision_debug') {
      const enabled = !collisionDebugRenderer.isEnabled();
      collisionDebugRenderer.setEnabled(enabled);
      scene.userData['collisionDebugEnabled'] = enabled;
    } else if (action === 'cycle_powerup_debug') {
      // Cycle through powerup debug modes
      const modes = ['auto', 'ammo', 'shield', 'weapon_upgrade', 'speed', 'life'] as const;
      const current = worldGenerator.getPowerUpDebugOverride();
      const currentIndex = modes.indexOf(current as any);
      const nextIndex = (currentIndex + 1) % modes.length;
      worldGenerator.setPowerUpDebugOverride(modes[nextIndex]);
    } else if (action === 'debug_hurt') {
      // Apply random damage to player (0.5 to 2.0 damage)
      if (player) {
        const randomDamage = 0.5 + Math.random() * 1.5;
        console.log(`🩸 Debug: Applying ${randomDamage.toFixed(2)} damage to player`);
        player.takeDamage(randomDamage);
      }
    } else if (action === 'debug_kill') {
      // Remove a life from player (simulate death without going through damage)
      if (player) {
        const hud = (scene as any)?.userData?.hud;
        if (hud) {
          const currentLives = hud.getGameState?.().lives ?? 0;
          if (currentLives > 0) {
            const newLives = currentLives - 1;
            hud.updateLives?.(newLives);
            console.log(`💀 Debug: Removed a life. Lives remaining: ${newLives}`);

            // If no lives left, trigger game over
            if (newLives <= 0) {
              console.log('💀 Debug: No lives remaining - triggering game over');
              // Set player health to 0 and trigger death
              player.health = 0;
              player.die();
              handleGameOver();
            }
          } else {
            console.log('💀 Debug: No lives to remove');
          }
        }
      }
    }
  }
}

// Apply/restore outline effect for a whole entity type using the new outline pass
function applyDebugBloomOverride(
  type: EntityType,
  enable: boolean,
  emissiveHex: number,
  _forceDisableBloomOnRestore: boolean,
): void {
  const ents = (scene.userData['entityManager'] as any)?.getEntitiesByType(type) as
    | any[]
    | undefined;
  if (!ents) return;

  const outlineColor = new THREE.Color(emissiveHex);

  for (const e of ents) {
    const meshObject = e.mesh as THREE.Object3D | undefined;
    if (!meshObject) continue;

    if (enable) {
      // Add object to outline pass with the specified debug color
      outlinePass.addOutlineObject(meshObject, outlineColor);
    } else {
      // For PowerUps, restore their original outline color instead of removing entirely
      if (type === EntityType.POWERUP) {
        // Get the PowerUp's original outline color based on its type
        const powerUpType = (e as any).powerUpType;
        const originalColor = getPowerUpOutlineColor(powerUpType);
        if (originalColor) {
          outlinePass.addOutlineObject(meshObject, originalColor);
        }
      } else {
        // For other entities (Obstacles, Enemies), remove outline entirely
        outlinePass.removeOutlineObject(meshObject);
      }
    }
  }
}

// Helper function to get PowerUp's original outline color
function getPowerUpOutlineColor(powerUpType: PowerUpType): THREE.Color | null {
  // These colors should match the ones in PowerUp.ts applyBloomMaterial method
  const bloomColors: Record<PowerUpType, number> = {
    [PowerUpType.AMMO]: 0xffee66, // bright yellow
    [PowerUpType.SHIELD]: 0x66ccff, // blue
    [PowerUpType.LIFE]: 0xff3333, // red
    [PowerUpType.SPEED]: 0x33ff33, // green
    [PowerUpType.WEAPON_UPGRADE]: 0xffaa44, // orange
  };

  const colorHex = bloomColors[powerUpType];
  return colorHex ? new THREE.Color(colorHex) : null;
}

window.addEventListener('keydown', event => {
  // Check if we're on desktop and the game overlay is in 'new' state (showing play button)
  if (!isMobileDevice() && gameOverlay.getState() === 'new') {
    // Any keypress should trigger the play button on desktop
    gameOverlay.triggerPlay();
    event.preventDefault();
    return;
  }

  const action = KeyBindings[event.code];
  if (action) {
    handleAction(action, true);
    if (
      action === 'fire' ||
      action === 'ascend' ||
      action === 'descend' ||
      action.startsWith('turn') ||
      action.startsWith('strafe')
    ) {
      event.preventDefault();
    }
  }
});

window.addEventListener('keyup', event => {
  const action = KeyBindings[event.code];
  if (action) {
    handleAction(action, false);
    if (action === 'speed_up') {
      // Cancel any active speed boost when manually adjusting speed
      if (scene.userData['speedBoostTimeout']) {
        clearTimeout(scene.userData['speedBoostTimeout']);
        scene.userData['speedBoostTimeout'] = null;
        scene.userData['originalSpeedLevel'] = null;
      }

      const currentLevel = scene.userData['speedLevel'] || 1;
      const newLevel = Math.min(5, currentLevel + 1);
      scene.userData['speedLevel'] = newLevel;
      scene.userData['railsSpeed'] = getSpeedFromLevel(newLevel);
      hud?.updateSpeed(newLevel);
    } else if (action === 'speed_down') {
      // Cancel any active speed boost when manually adjusting speed
      if (scene.userData['speedBoostTimeout']) {
        clearTimeout(scene.userData['speedBoostTimeout']);
        scene.userData['speedBoostTimeout'] = null;
        scene.userData['originalSpeedLevel'] = null;
      }

      const currentLevel = scene.userData['speedLevel'] || 1;
      const newLevel = Math.max(1, currentLevel - 1);
      scene.userData['speedLevel'] = newLevel;
      scene.userData['railsSpeed'] = getSpeedFromLevel(newLevel);
      hud?.updateSpeed(newLevel);
    }
    event.preventDefault();
  }
});

// Prevent context menu on right click
window.addEventListener('contextmenu', event => {
  event.preventDefault();
});

// Demo: Player shooting projectiles
let lastShotTime = 0;
const shotCooldown = 0.1; // 10 bullets per second

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
(scene as any).userData['speedLevel'] = startingSpeedLevel;
(scene as any).userData['baseSpeed'] = baseSpeed;

// Calculate actual speed from level
function getSpeedFromLevel(level: number): number {
  return baseSpeed * level;
}

// Initialize actual speed
const startingSpeed = getSpeedFromLevel(startingSpeedLevel);
(scene as any).userData['railsSpeed'] = startingSpeed;

player.health = startingHealth;
player.weaponLevel = startingWeapon;
player.ammo = startingAmmo;
hud?.updateLives(startingLives);
hud?.updateShieldSegments(startingHealth); // Health displayed as shield segments
hud?.updateWeaponLevel(startingWeapon);
hud?.updateAmmo(startingAmmo);
hud?.updateSpeed(startingSpeedLevel);

// Game state tracking
let frameCount = 0;
let lastBiome: BiomeType | null = null;
let distanceTraveled = 0;
const lastPlayerPosition = new THREE.Vector3(0, 5, 0);

const clock = new THREE.Clock();
let fpsAccumulator = 0;
let fpsFrames = 0;
let fpsLastReport = 0;

// Function to toggle terrain visualization
function toggleTerrainVisualization() {
  // Update scene-level flags so future tiles inherit current settings
  scene.userData['showWireframe'] = showWireframe;
  scene.userData['showSurface'] = showSurface;
  scene.traverse(child => {
    if (child instanceof THREE.Mesh && child.userData['isTerrain']) {
      // Control base surface visibility
      child.visible = !!showSurface;

      // Control wireframe overlay visibility
      for (const sub of child.children) {
        if (sub instanceof THREE.LineSegments && sub.userData['isTerrainWireframe']) {
          sub.visible = !!showWireframe;
          sub.renderOrder = 1;
        }
      }
    }
  });
}

function animate() {
  requestAnimationFrame(animate);

  const deltaTime = clock.getDelta();
  frameCount++;
  fpsAccumulator += deltaTime;
  fpsFrames++;

  // Update all entities
  entityManager.update(deltaTime);

  // Update procedural world generation
  if (player) {
    // Update audio manager with current player position
    audioManager.setPlayerPosition(player.position);

    // Process audio queue
    audioManager.processAudioQueue();

    // Rails shooter constant forward motion parallel to the floor (yaw only)
    const forwardDir = new THREE.Vector3(-Math.sin(mouseX), 0, -Math.cos(mouseX)).normalize();

    // Don't reset rails speed if game is over
    if (!scene.userData['gameOver'] && !(scene.userData['railsSpeed'] > 0)) {
      scene.userData['railsSpeed'] = 50;
    }
    const currentSpeed = scene.userData['railsSpeed'] || 0;

    // Set player velocity instead of directly modifying position for smooth movement
    // Only move if game is not over
    if (!scene.userData['gameOver']) {
      player.velocity.x = forwardDir.x * currentSpeed;
      player.velocity.z = forwardDir.z * currentSpeed;
    }
    // Keep existing Y velocity for vertical movement

    // Update player rotation to match movement direction
    (player as any).setRotation(mouseX);
    // Cache the last travel direction and speed for consistent projectile emission
    scene.userData['lastForwardDir'] = { x: forwardDir.x, y: 0, z: forwardDir.z };
    scene.userData['lastRailsSpeed'] = currentSpeed;
    // Space Harrier perspective: Allow manual altitude control
    // (Removed fixed altitude - now controlled by Q/E keys)

    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
    worldGenerator.updatePlayerPosition(playerPos);

    // Update world generator with movement mode and forward direction for chunk culling optimization
    worldGenerator.setMovementMode(movementStrafe);
    worldGenerator.setPlayerForwardDirection(forwardDir);

    // Track distance traveled for scoring
    distanceTraveled += playerPos.distanceTo(lastPlayerPosition);
    lastPlayerPosition.copy(playerPos);

    // Update camera controller with mouse input and let it handle positioning
    cameraController.setMouseRotation(mouseX, mouseY);
    cameraController.update();

    // Check for biome changes
    const currentBiome = biomeManager.getBiomeAt(player.position.x, player.position.z);
    if (lastBiome !== currentBiome) {
      lastBiome = currentBiome;
      const biomeConfig = biomeManager.getBiome(currentBiome);

      // Update stage based on biome exploration
      if (hud && biomeConfig) {
        gameStage++;
        hud.updateStage(gameStage);
      }
    }
  }

  // Update world generation system
  worldGenerator.update();

  // MANUAL PLAYER CONTROLS
  if (player) {
    // Update the shadow rig so shadows follow the camera/player
    updateShadowRig();
    const turnRate = 2;
    const moveSpeed = 100; // Units per second (strafe)
    const flySpeed = 50; // Vertical movement speed

    // Calculate ground distance for animation logic (used throughout this block)
    const terrainHeight = worldGenerator.getTerrainHeightAt(player.position.x, player.position.z);
    const groundDistance = player.position.y - terrainHeight;

    // Handle left/right movement based on movement style
    let isStrafing = false;
    let strafeDirection: 'left' | 'right' | null = null;
    let isTurning = false;
    let turnDirection: 'left' | 'right' | null = null;

    if (actionDown['left_movement']) {
      if (movementStrafe) {
        // Strafe mode - move sideways
        const left = new THREE.Vector3(-1, 0, 0);
        left.applyQuaternion(camera.quaternion);
        left.multiplyScalar(moveSpeed * deltaTime);
        player.position.add(left);
        isStrafing = true;
        strafeDirection = 'left';
      } else if (cameraController.getMouseControlEnabled()) {
        // Turn mode - rotate camera (only if camera allows mouse control)
        mouseX += turnRate * deltaTime;
        isTurning = true;
        turnDirection = 'left';
      }
    }

    if (actionDown['right_movement']) {
      if (movementStrafe) {
        // Strafe mode - move sideways
        const right = new THREE.Vector3(1, 0, 0);
        right.applyQuaternion(camera.quaternion);
        right.multiplyScalar(moveSpeed * deltaTime);
        player.position.add(right);
        isStrafing = true;
        strafeDirection = 'right';
      } else if (cameraController.getMouseControlEnabled()) {
        // Turn mode - rotate camera (only if camera allows mouse control)
        mouseX -= turnRate * deltaTime;
        isTurning = true;
        turnDirection = 'right';
      }
    }

    // Legacy turn/strafe actions (for compatibility)
    if (actionDown['turn_left'] && cameraController.getMouseControlEnabled()) {
      mouseX += turnRate * deltaTime;
      isTurning = true;
      turnDirection = 'left';
    }
    if (actionDown['turn_right'] && cameraController.getMouseControlEnabled()) {
      mouseX -= turnRate * deltaTime;
      isTurning = true;
      turnDirection = 'right';
    }
    if (actionDown['strafe_left']) {
      const left = new THREE.Vector3(-1, 0, 0);
      left.applyQuaternion(camera.quaternion);
      left.multiplyScalar(moveSpeed * deltaTime);
      player.position.add(left);
      isStrafing = true;
      strafeDirection = 'left';
    }
    if (actionDown['strafe_right']) {
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera.quaternion);
      right.multiplyScalar(moveSpeed * deltaTime);
      player.position.add(right);
      isStrafing = true;
      strafeDirection = 'right';
    }

    // Also consider turning as strafing when near ground (for animation)
    if (!isStrafing && groundDistance < 2.0) {
      if (isTurning && turnDirection) {
        isStrafing = true;
        strafeDirection = turnDirection;
      }
    }

    // Track vertical movement for jump animation
    const isAscending = actionDown['ascend'] || false;
    const isDescending = actionDown['descend'] || false;

    // Use the isTurning and turnDirection from movement handling above

    // Update player animation states
    (player as any).setStrafing(isStrafing, strafeDirection);
    (player as any).setGroundDistance(groundDistance);
    (player as any).setVerticalMovement(isAscending, isDescending);
    (player as any).setTurning(isTurning, turnDirection);

    // Up/down (W/Up and S/Down)
    if (actionDown['ascend']) {
      player.position.y += flySpeed * deltaTime;
    }
    if (actionDown['descend']) {
      const terrainYForDescend = worldGenerator.getTerrainHeightAt(
        player.position.x,
        player.position.z,
      );
      const minAllowedY = terrainYForDescend + MIN_FLOOR_CLEARANCE;
      const nextY = player.position.y - flySpeed * deltaTime;
      player.position.y = Math.max(nextY, minAllowedY);
    }

    // If ammo has reached 0, spawn an ammo power-up ahead of the player
    if ((player as any).ammo <= 0) {
      const fwd = new THREE.Vector3();
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      const spawn = {
        x: player.position.x + fwd.x * 4,
        y: player.position.y,
        z: player.position.z + fwd.z * 4,
      };
      entityManager.spawnPowerUp(PowerUpType.AMMO, spawn);
      // Give the player enough ammo for several shots so they can continue fighting
      (player as any).ammo = 5.0; // 10 shots worth (0.5 per shot)
    }

    // Enforce ground collision / constant hover height unless actively flying down
    const terrainY = worldGenerator.getTerrainHeightAt(player.position.x, player.position.z);
    const desiredY = terrainY + HOVER_HEIGHT;
    const isPressingDown = !!actionDown['descend'];
    // Never allow below floor clearance
    const minClearanceY = terrainY + MIN_FLOOR_CLEARANCE;
    if (player.position.y < minClearanceY) {
      player.position.y = minClearanceY;
    }

    // If not actively flying down, maintain hover height
    if (!isPressingDown && player.position.y < desiredY) {
      player.position.y = desiredY;
    }

    // Kill projectiles that hit the floor
    const projectiles = entityManager.getEntitiesByType(EntityType.PROJECTILE) as any[];
    for (const p of projectiles) {
      const groundY = worldGenerator.getTerrainHeightAt(p.position.x, p.position.z);
      if (p.position.y <= groundY + 0.05) {
        p.die?.();
      }
    }

    // Log player position for debugging
    const playerTileX = Math.floor(player.position.x / 200);
    const playerTileZ = Math.floor(player.position.z / 200);

    // UPDATE HUD WITH MANUAL CONTROL INFO
    const stageElement = document.getElementById('stage');
    if (stageElement) {
      const currentModel = (player as any).getCurrentModelName();
      stageElement.innerHTML = `
        MANUAL FLIGHT<br>
        POS: (${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)})<br>
        TILE: (${playerTileX}, ${playerTileZ})<br>
        MODEL: ${currentModel.toUpperCase()}<br>
        CONTROLS: WASD + Q/E or Space/Shift + M=Model ~=Debug<br>
        DISPLAY: O=Wireframe(${showWireframe ? 'ON' : 'OFF'}) F=Surface(${showSurface ? 'ON' : 'OFF'})<br>
        CELL SHADING: C=Toggle(${cellShadingPass.enabled ? 'ON' : 'OFF'}) V=Edges B=Colors
      `;
    }
  }

  // Demo: Player automatically shoots
  const currentTime = Date.now() * 0.001;
  if (player && currentTime - lastShotTime >= shotCooldown) {
    if (actionDown['fire'] && player.shoot()) {
      // Spawn projectile from player position
      // Use the player's horizontal travel direction (constant Y)
      const lastDirObj = scene.userData['lastForwardDir'] || { x: 0, y: 0, z: -1 };
      const forward = new THREE.Vector3(lastDirObj.x, 0, lastDirObj.z).normalize();

      // Offset spawn a bit ahead of player and at chest height
      const playerHeight = 7.2; // Approximate height of scaled player model (180 * 0.04)
      const spawnPos = {
        x: player.position.x + forward.x * 0.6,
        y: player.position.y + playerHeight * 0.6, // 60% of player height for chest/weapon level
        z: player.position.z + forward.z * 0.6,
      };

      // Map weapon level to projectile subtype
      const weaponLevel = ((player as any).weaponLevel || 1) as number;
      const projType =
        weaponLevel === 1
          ? ProjectileSubType.BULLET
          : weaponLevel === 2
            ? ProjectileSubType.MISSILE
            : weaponLevel === 3
              ? ProjectileSubType.LASER
              : weaponLevel === 4
                ? ProjectileSubType.PLASMA
                : ProjectileSubType.FIREBALL;

      const proj = entityManager.spawnProjectile(projType, 'player', spawnPos, {
        x: forward.x,
        y: 0, // constant height
        z: forward.z,
      });
      // Set projectile to 2x player's current rails speed and 2s lifetime
      const railsSpeed = (scene.userData['lastRailsSpeed'] ||
        scene.userData['railsSpeed'] ||
        50) as number;
      proj.speed = railsSpeed * 2.2; // ensure clearly faster than player
      proj.lifetime = 2.0;
      proj.velocity.x = forward.x * proj.speed;
      proj.velocity.y = 0; // constant height
      proj.velocity.z = forward.z * proj.speed;
      lastShotTime = currentTime;

      // Play shooting sound
      audioManager.playShootSound(
        weaponLevel,
        new THREE.Vector3(spawnPos.x, spawnPos.y, spawnPos.z),
      );

      // Reflect ammo change in HUD (ammo may be fractional but HUD shows int)
      hud?.updateAmmo(Math.floor((player as any).ammo || 0));
    }
  }

  // Update HUD based on actual gameplay events
  if (hud) {
    // Update score based on distance traveled and biome exploration
    if (frameCount % 60 === 0) {
      const distanceScore = Math.floor(distanceTraveled * 10);
      const explorationBonus = gameStage * 500; // Bonus for discovering new biomes
      gameScore = distanceScore + explorationBonus;
      hud.updateScore(gameScore);
    }

    // FPS update roughly once per second
    if (fpsAccumulator - fpsLastReport >= 1.0) {
      const fps = Math.max(1, Math.round(fpsFrames / (fpsAccumulator - fpsLastReport)));
      hud.updateFPS(fps);
      fpsLastReport = fpsAccumulator;
      fpsFrames = 0;
    }

    // Add stage transition effect when entering new biomes
    if (lastBiome && frameCount % 10 === 0) {
      const stageElement = document.getElementById('current-stage');
      if (stageElement && stageElement.classList.contains('stage-updated')) {
        stageElement.classList.remove('stage-updated');
      }
    }
  }

  // Log world generation stats periodically
  if (frameCount % 300 === 0) {
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
    hud?.updateSpeed((scene.userData['speedLevel'] || 1) as number);
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
      `🌍 Terrain below: ${terrainHeight.toFixed(1)}m, Biome: ${lastBiome}, Distance: ${distanceTraveled.toFixed(1)}m`,
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
