/**
 * Space Harrier: Infinite Horizons
 * Main entry point for the game
 */

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CellShadingPass } from './shaders/CellShadingPass.js';
import { HUD } from './components/HUD';
import { DebugPanel } from './components/DebugPanel.js';
import { EntityManager } from './core/EntityManager';
import { WorldGenerator } from './core/world/WorldGenerator';
import { BiomeManager } from './core/world/BiomeManager';
import { ProceduralGenerationSettings, BiomeType } from './core/world/types';
import { ProjectileSubType, EntityType, PowerUpSubType } from './core/types';
import './styles/hud.css';

// eslint-disable-next-line no-console
console.log('🚀 Space Harrier: Infinite Horizons - Starting up...');

// Create basic Three.js scene for testing
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000); // Increased far plane
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1e3c72); // Space Harrier blue gradient

// Postprocessing: Cell shading + Bloom composer
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

// Cell shading pass (Borderlands-style)
const cellShadingPass = new CellShadingPass(window.innerWidth, window.innerHeight);
cellShadingPass.enabled = false;
composer.addPass(cellShadingPass);

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
  maxEntities: 35000, // Increased for expanded terrain coverage (1089 chunks × ~30 entities each)
});

if (appDiv) {
  hud = new HUD(appDiv);
}

// Initialize Debug Panel
const debugPanel = new DebugPanel();
debugPanel.setCellShadingPass(cellShadingPass);

// Set up debug panel callbacks
debugPanel.setWeaponChangeCallback((weaponType: number) => {
  handleAction(`set_weapon_${weaponType}` as Action, false);
});

debugPanel.setDebugToggleCallback((type: string, enabled: boolean) => {
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
    const currentFlag = scene.userData['debugPowerUps'] || false;
    if (currentFlag !== enabled) {
      handleAction('toggle_debug_powerups', false);
    }
  }
});

debugPanel.setDisplayToggleCallback((type: string, enabled: boolean) => {
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
// Ensure userData exists
(scene as any).userData = (scene as any).userData || {};
(scene as any).userData['hud'] = hud;
(scene as any).userData['entityManager'] = entityManager;
(scene as any).userData['camera'] = camera;

// Configure procedural generation settings
const proceduralSettings: ProceduralGenerationSettings = {
  worldRadius: 5000, // 5km radius world
  tileSize: 200, // Larger 200-unit tiles for proper screen coverage

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

  preloadDistance: 1000, // 1000 ÷ 200 = 5 tile radius for proper coverage
  unloadDistance: 1500, // Unload chunks 1500 units away
  maxLoadedChunks: 121, // (5×2+1)² = 11×11 = 121 chunks for complete coverage

  terrainResolution: 65, // 65x65 heightmap per tile (for 64x64 subdivisions)
  detailDensity: 1.0, // Normal detail density

  varietyLevel: 0.7, // High variety
  contentDensity: 1.2, // 20% more content

  generateAsync: true,
  maxGenerationTime: 32, // Allow 32ms per frame for faster terrain generation
};

// Initialize Procedural World Generation System
const biomeManager = new BiomeManager();
const worldGenerator = new WorldGenerator(scene, entityManager, proceduralSettings);

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

// Set player reference in debug panel now that it's created
debugPanel.setPlayer(player);

// Initialize world generation around player
worldGenerator.updatePlayerPosition(new THREE.Vector3(tileCenter, 2, tileCenter));

// Manual Player Controls - configurable key → action mapping
type Action =
  | 'ascend'
  | 'descend'
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
  | 'toggle_debug_panel';

const KeyBindings: Record<string, Action> = {
  // Movement
  KeyW: 'ascend',
  ArrowUp: 'ascend',
  KeyS: 'descend',
  ArrowDown: 'descend',
  KeyA: 'turn_left',
  ArrowLeft: 'turn_left',
  KeyD: 'turn_right',
  ArrowRight: 'turn_right',
  KeyQ: 'strafe_left',
  KeyE: 'strafe_right',
  // Fire
  Space: 'fire',
  Enter: 'fire',
  ShiftLeft: 'fire',
  ShiftRight: 'fire',
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
  // Model switching
  KeyM: 'switch_model',
  // Cell shading controls
  KeyC: 'toggle_cell_shading',
  KeyV: 'adjust_edge_threshold',
  KeyB: 'adjust_color_levels',
  // Debug panel
  Backquote: 'toggle_debug_panel', // ~ key
};

const actionDown: Partial<Record<Action, boolean>> = {};

// Terrain visualization state
let showWireframe = true;
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
let isMouseDragging = false;
let lastMouseX = 0;

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
      const flag = !(scene.userData['debugPowerUps'] || false);
      scene.userData['debugPowerUps'] = flag;
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
      debugPanel.toggle();
    }
  }
}

// Apply/restore bright bloom material override for a whole entity type
function applyDebugBloomOverride(
  type: EntityType,
  enable: boolean,
  emissiveHex: number,
  forceDisableBloomOnRestore: boolean,
): void {
  const ents = (scene.userData['entityManager'] as any)?.getEntitiesByType(type) as
    | any[]
    | undefined;
  if (!ents) return;
  for (const e of ents) {
    const m = e.mesh as THREE.Mesh | undefined;
    if (!m) continue;
    if (enable) {
      if (!m.userData.originalMaterial) {
        m.userData.originalMaterial = m.material;
      }
      m.material = new THREE.MeshLambertMaterial({
        color: 0x000000,
        emissive: new THREE.Color(emissiveHex),
        emissiveIntensity: 3.0,
        transparent: true,
        opacity: 0.98,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      m.layers.enable(1);
    } else {
      if (m.userData.originalMaterial) {
        m.material = m.userData.originalMaterial;
        delete m.userData.originalMaterial;
      }
      if (forceDisableBloomOnRestore) {
        m.layers.disable(1);
      }
    }
  }
}

window.addEventListener('keydown', event => {
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
      scene.userData['railsSpeed'] = Math.min(500, (scene.userData['railsSpeed'] || 50) + 5);
    } else if (action === 'speed_down') {
      scene.userData['railsSpeed'] = Math.max(5, (scene.userData['railsSpeed'] || 50) - 5);
    }
    event.preventDefault();
  }
});

// Mouse drag controls for camera rotation
window.addEventListener('mousedown', event => {
  if (event.button === 0) {
    // Left mouse button
    isMouseDragging = true;
    lastMouseX = event.clientX;
    event.preventDefault();
  }
});

window.addEventListener('mouseup', event => {
  if (event.button === 0) {
    // Left mouse button
    isMouseDragging = false;
  }
});

window.addEventListener('mousemove', event => {
  if (isMouseDragging) {
    const deltaX = event.clientX - lastMouseX;

    mouseX += deltaX * 0.005; // Horizontal rotation sensitivity

    lastMouseX = event.clientX;
  }
});

// Prevent context menu on right click
window.addEventListener('contextmenu', event => {
  event.preventDefault();
});

// Demo: Player shooting projectiles
let lastShotTime = 0;
const shotCooldown = 0.1; // 10 bullets per second

// Position camera to follow behind player (elevated for world view)
camera.position.set(0, 8, 12);
camera.lookAt(0, 0, 0);

// Initialize player stats and HUD (Borderlands-style bottom-left)
const startingShield = 4; // 0-8
const startingLives = 3; // 1-8
const startingWeapon = 1; // 1-5 (default 1)
const startingAmmo = 150; // 0-250
const startingSpeed = (scene.userData['railsSpeed'] || 50) as number; // current rails speed
(scene as any).userData['baseRailsSpeed'] = startingSpeed;

player.shield = startingShield;
player.maxShield = 8;
player.weaponLevel = startingWeapon;
player.ammo = startingAmmo;
hud?.updateLives(startingLives);
hud?.updateShieldSegments(startingShield);
hud?.updateWeaponLevel(startingWeapon);
hud?.updateAmmo(startingAmmo);
hud?.updateSpeed(startingSpeed);

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
    // Rails shooter constant forward motion parallel to the floor (yaw only)
    const forwardDir = new THREE.Vector3(-Math.sin(mouseX), 0, -Math.cos(mouseX)).normalize();
    if (!(scene.userData['railsSpeed'] > 0)) scene.userData['railsSpeed'] = 50;
    const currentSpeed = scene.userData['railsSpeed'];
    player.position.addScaledVector(forwardDir, currentSpeed * deltaTime);

    // Update player rotation to match movement direction
    (player as any).setRotation(mouseX);
    // Cache the last travel direction and speed for consistent projectile emission
    scene.userData['lastForwardDir'] = { x: forwardDir.x, y: 0, z: forwardDir.z };
    scene.userData['lastRailsSpeed'] = currentSpeed;
    // Space Harrier perspective: Allow manual altitude control
    // (Removed fixed altitude - now controlled by Q/E keys)

    const playerPos = new THREE.Vector3(player.position.x, player.position.y, player.position.z);
    worldGenerator.updatePlayerPosition(playerPos);

    // Track distance traveled for scoring
    distanceTraveled += playerPos.distanceTo(lastPlayerPosition);
    lastPlayerPosition.copy(playerPos);

    // Manual camera controls with mouse drag rotation
    // Third-person camera that orbits around player
    const cameraDistance = 25;
    const cameraHeight = 10;

    // Calculate camera position based on mouse rotation
    const cameraX = player.position.x + Math.sin(mouseX) * cameraDistance;
    const cameraZ = player.position.z + Math.cos(mouseX) * cameraDistance;
    const cameraY = player.position.y + cameraHeight; // keep camera above, pitch not used for motion

    camera.position.set(cameraX, cameraY, cameraZ);
    camera.lookAt(player.position.x, player.position.y, player.position.z);

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

    // Immediate turning left/right (A/Left, D/Right) by adjusting orbit angle (same path as mouse)
    if (actionDown['turn_left']) {
      mouseX += turnRate * deltaTime;
    }
    if (actionDown['turn_right']) {
      mouseX -= turnRate * deltaTime;
    }

    // Strafe (Q/E) and update animation state
    let isStrafing = false;
    let strafeDirection: 'left' | 'right' | null = null;

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

    // Also consider turning as strafing when near ground
    if (!isStrafing && groundDistance < 2.0) {
      if (actionDown['turn_left']) {
        isStrafing = true;
        strafeDirection = 'left';
      } else if (actionDown['turn_right']) {
        isStrafing = true;
        strafeDirection = 'right';
      }
    }

    // Track vertical movement for jump animation
    const isAscending = actionDown['ascend'] || false;
    const isDescending = actionDown['descend'] || false;

    // Track turning for banking animation
    const isTurning = actionDown['turn_left'] || actionDown['turn_right'] || false;
    const turnDirection = actionDown['turn_left']
      ? 'left'
      : actionDown['turn_right']
        ? 'right'
        : null;

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
      entityManager.spawnPowerUp(PowerUpSubType.AMMO, spawn);
      // Give the player a tiny reserve so we don't spawn every frame until pickup
      (player as any).ammo = 0.5;
      hud?.updateAmmo(Math.floor((player as any).ammo));
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
    hud?.updateSpeed((scene.userData['railsSpeed'] || 50) as number);
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

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Keep composer in sync with viewport
  composer.setSize(window.innerWidth, window.innerHeight);
  // Update cell shading pass resolution
  cellShadingPass.setSize(window.innerWidth, window.innerHeight);
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
