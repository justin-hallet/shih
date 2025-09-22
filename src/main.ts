/**
 * Space Harrier: Infinite Horizons
 * Main entry point for the game
 */

import * as THREE from 'three';
// import { Howl } from 'howler'; // TODO: Will use for audio in Phase 5
import * as tf from '@tensorflow/tfjs';
import { HUD } from './components/HUD';
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
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x1e3c72); // Space Harrier blue gradient

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

// Create a test cube to verify Three.js is working
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  wireframe: true,
});
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Position camera
camera.position.z = 5;

// Basic animation loop
let frameCount = 0;
function animate() {
  requestAnimationFrame(animate);

  // Rotate the cube
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  // Demo HUD updates (simulate gameplay)
  frameCount++;

  // Update score every 60 frames (roughly 1 second at 60fps)
  if (frameCount % 60 === 0 && hud) {
    gameScore += 1000 + Math.floor(Math.random() * 500);
    hud.updateScore(gameScore);
  }

  // Change stage every 10 seconds
  if (frameCount % 600 === 0 && hud) {
    gameStage++;
    hud.updateStage(gameStage);

    // Add stage transition effect
    const stageElement = document.getElementById('current-stage');
    if (stageElement) {
      stageElement.classList.add('stage-updated');
      setTimeout(() => {
        stageElement.classList.remove('stage-updated');
      }, 1000);
    }
  }

  // Demo: lose a life every 15 seconds (for first 3 lives)
  if (frameCount % 900 === 0 && frameCount <= 2700 && hud) {
    const currentLives = hud.getGameState().lives;
    if (currentLives > 0) {
      hud.updateLives(currentLives - 1);
    }
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
console.log('✅ Three.js scene initialized with rotating test cube');

export {};
