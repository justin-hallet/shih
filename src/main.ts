/**
 * Space Harrier: Infinite Horizons
 * Main entry point for the game
 */

import * as THREE from 'three';
// import { Howl } from 'howler'; // TODO: Will use for audio in Phase 5
import * as tf from '@tensorflow/tfjs';
import { HUD } from './components/HUD';
import { EntityManager } from './core/EntityManager';
import { WorldGenerator } from './core/world/WorldGenerator';
import { BiomeManager } from './core/world/BiomeManager';
import { ProceduralGenerationSettings, BiomeType } from './core/world/types';
import { ProjectileSubType, EntityType } from './core/types';
import './styles/hud.css';

// eslint-disable-next-line no-console
console.log('🚀 Space Harrier: Infinite Horizons - Starting up...');

// Initialize TensorFlow.js
tf.ready().then(() => {
  // eslint-disable-next-line no-console
  console.log('✅ TensorFlow.js ready');
});

// Create basic Three.js scene for testing
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10000); // Increased far plane
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1e3c72); // Space Harrier blue gradient

// Add lighting for terrain visibility
const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // Soft ambient light
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
directionalLight.castShadow = true;
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

// Style the canvas to fill the screen
renderer.domElement.style.display = 'block';
renderer.domElement.style.width = '100vw';
renderer.domElement.style.height = '100vh';

// Initialize HUD overlay
let hud: HUD | null = null;
let gameScore = 0;
let gameStage = 1;

if (appDiv) {
  hud = new HUD(appDiv);
}

// Initialize Entity System with higher limits for infinite world
const entityManager = new EntityManager({
  scene,
  maxEntities: 35000, // Increased for expanded terrain coverage (1089 chunks × ~30 entities each)
});

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
  | 'toggle_surface';

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

// Game state tracking
let frameCount = 0;
let lastBiome: BiomeType | null = null;
let distanceTraveled = 0;
const lastPlayerPosition = new THREE.Vector3(0, 5, 0);

const clock = new THREE.Clock();

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

  // Update all entities
  entityManager.update(deltaTime);

  // Update procedural world generation
  if (player) {
    // Rails shooter constant forward motion parallel to the floor (yaw only)
    const forwardDir = new THREE.Vector3(-Math.sin(mouseX), 0, -Math.cos(mouseX)).normalize();
    if (!(scene.userData['railsSpeed'] > 0)) scene.userData['railsSpeed'] = 50;
    const currentSpeed = scene.userData['railsSpeed'];
    player.position.addScaledVector(forwardDir, currentSpeed * deltaTime);
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
      // eslint-disable-next-line no-console
      console.log(`🌍 Entered ${biomeConfig?.name || currentBiome}!`);

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
    const turnRate = 2;
    const moveSpeed = 100; // Units per second (strafe)
    const flySpeed = 50; // Vertical movement speed

    // Immediate turning left/right (A/Left, D/Right) by adjusting orbit angle (same path as mouse)
    if (actionDown['turn_left']) {
      mouseX += turnRate * deltaTime;
    }
    if (actionDown['turn_right']) {
      mouseX -= turnRate * deltaTime;
    }

    // Strafe (Q/E)
    if (actionDown['strafe_left']) {
      const left = new THREE.Vector3(-1, 0, 0);
      left.applyQuaternion(camera.quaternion);
      left.multiplyScalar(moveSpeed * deltaTime);
      player.position.add(left);
    }
    if (actionDown['strafe_right']) {
      const right = new THREE.Vector3(1, 0, 0);
      right.applyQuaternion(camera.quaternion);
      right.multiplyScalar(moveSpeed * deltaTime);
      player.position.add(right);
    }

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
      stageElement.innerHTML = `
        MANUAL FLIGHT<br>
        POS: (${player.position.x.toFixed(1)}, ${player.position.y.toFixed(1)}, ${player.position.z.toFixed(1)})<br>
        TILE: (${playerTileX}, ${playerTileZ})<br>
        CONTROLS: WASD + Q/E or Space/Shift<br>
        DISPLAY: O=Wireframe(${showWireframe ? 'ON' : 'OFF'}) F=Surface(${showSurface ? 'ON' : 'OFF'})
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

      // Offset spawn a bit ahead of player
      const spawnPos = {
        x: player.position.x + forward.x * 0.6,
        y: player.position.y, // constant height
        z: player.position.z + forward.z * 0.6,
      };

      const proj = entityManager.spawnProjectile(ProjectileSubType.BULLET, 'player', spawnPos, {
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

    // UPDATE HUD WITH TERRAIN DEBUGGING INFO
    const scoreElement = document.getElementById('score');
    if (scoreElement) {
      const playerTileX = Math.floor((player?.position.x || 0) / 200);
      const playerTileZ = Math.floor((player?.position.z || 0) / 200);
      const speed = Math.sqrt(
        Math.pow(player?.velocity.x || 0, 2) + Math.pow(player?.velocity.z || 0, 2),
      ).toFixed(1);

      scoreElement.innerHTML = `
        <div>TERRAIN DEBUG</div>
        <div>Coverage: ${coverage}% (${loadedChunks}/${expectedChunks})</div>
        <div>Player Tile: (${playerTileX}, ${playerTileZ})</div>
        <div>Speed: ${speed} u/s</div>
        <div>Chunks Generated: ${stats.chunksGenerated}</div>
        <div>Scene Objects: ${scene.children.length}</div>
      `;
    }
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

  renderer.render(scene, camera);
}

// Handle window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
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
