# Refactor main.ts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Break the 1,516-line god object `src/main.ts` into focused modules with clear responsibilities, replace the typeless `scene.userData` event bus with a typed GameState, and clean up dead code.

**Architecture:** Extract main.ts into: `GameState` (typed shared state replacing scene.userData), `GameEngine` (renderer/scene/post-processing setup), `PlayerController` (movement logic from the animate loop), `CombatSystem` (projectile spawning), `InputController` (keybindings + keyboard listeners), and a slim `main.ts` orchestrator. Each new module is a class or set of functions in its own file. No new dependencies.

**Tech Stack:** TypeScript, Three.js, Vite bundler. No test framework configured — verification is `tsc --noEmit` + `npm run build`.

---

## Constraints

- No test framework exists. Verification for each task: `npx tsc --noEmit` (type-check) and `npm run build` (Vite build succeeds).
- `tsconfig.json` has strict mode, `noUnusedLocals`, `noUnusedParameters`, `exactOptionalPropertyTypes`.
- All imports use ES module syntax (`import`/`export`).
- Path aliases exist (`@/*` -> `src/*`) but current code uses relative paths. Stay with relative paths for consistency.

---

### Task 1: Create GameState — typed replacement for scene.userData

**Why:** `scene.userData` is used as a typeless event bus throughout the codebase. Every access is a string key with casts. A typed class gives autocomplete, catch-at-compile-time errors, and a single source of truth.

**Files:**
- Create: `src/core/GameState.ts`
- Modify: `src/main.ts` — replace all `scene.userData['...']` state accesses with `gameState.*`

**Step 1: Create `src/core/GameState.ts`**

This class holds all the mutable game state that was previously scattered across `scene.userData` string keys and bare `let` variables in main.ts.

```typescript
import * as THREE from 'three';
import type { BiomeType } from './world/types';
import type { EntityManager } from './EntityManager';
import type { CollisionDebugRenderer } from '../utils/CollisionDebugRenderer';
import type { OutlinePass } from '../shaders/OutlinePass';
import type { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import type { HUD } from '../components/HUD';

/**
 * Typed, centralized game state.
 * Replaces the ad-hoc scene.userData string-key bag.
 */
export class GameState {
  // --- Game flags ---
  gameOver = false;
  playerInDeathSequence = false;

  // --- Speed system ---
  readonly baseSpeed: number;
  speedLevel: number;
  railsSpeed: number;
  speedBoostTimeout: ReturnType<typeof setTimeout> | null = null;
  originalSpeedLevel: number | null = null;

  // --- Session tracking ---
  gameStage = 1;
  distanceTraveled = 0;
  frameCount = 0;
  lastBiome: BiomeType | null = null;
  lastPlayerPosition = new THREE.Vector3();

  // --- Player flight ---
  playerDistanceAbove: number;

  // --- Mouse ---
  mouseX = 0;

  // --- Movement ---
  movementStrafe = true;

  // --- Terrain visualization ---
  showWireframe = false;
  showSurface = true;

  // --- Debug flags ---
  debugObstacles = false;
  debugEnemies = false;
  debugPowerups = false;
  collisionDebugEnabled = false;

  // --- Cached direction ---
  lastForwardDir = { x: 0, y: 0, z: -1 };
  lastRailsSpeed = 0;

  // --- References stored for cross-system access ---
  // These were previously on scene.userData for other systems to find.
  hud: HUD | null = null;
  entityManager: EntityManager | null = null;
  camera: THREE.PerspectiveCamera | null = null;
  outlinePass: OutlinePass | null = null;
  ssaoPass: SSAOPass | null = null;
  collisionDebugRenderer: CollisionDebugRenderer | null = null;

  constructor(options: {
    baseSpeed: number;
    startingSpeedLevel: number;
    hoverHeight: number;
  }) {
    this.baseSpeed = options.baseSpeed;
    this.speedLevel = options.startingSpeedLevel;
    this.railsSpeed = this.getSpeedFromLevel(options.startingSpeedLevel);
    this.playerDistanceAbove = options.hoverHeight;
  }

  getSpeedFromLevel(level: number): number {
    return this.baseSpeed * level;
  }

  resetForNewGame(startingSpeedLevel: number, hoverHeight: number, initialPosition: { x: number; y: number; z: number }): void {
    this.gameOver = false;
    this.playerInDeathSequence = false;
    this.speedLevel = startingSpeedLevel;
    this.railsSpeed = this.getSpeedFromLevel(startingSpeedLevel);
    this.gameStage = 1;
    this.distanceTraveled = 0;
    this.frameCount = 0;
    this.lastBiome = null;
    this.lastPlayerPosition.set(initialPosition.x, initialPosition.y, initialPosition.z);
    this.playerDistanceAbove = hoverHeight;
    this.mouseX = 0;
  }
}
```

**Step 2: Wire GameState into main.ts**

Replace every `scene.userData['gameOver']` with `gameState.gameOver`, etc. Instantiate `gameState` near the top of main.ts and pass it where needed.

Key replacements (not exhaustive, apply throughout the file):
- `scene.userData['gameOver']` → `gameState.gameOver`
- `scene.userData['playerInDeathSequence']` → `gameState.playerInDeathSequence`
- `scene.userData['railsSpeed']` → `gameState.railsSpeed`
- `scene.userData['speedLevel']` → `gameState.speedLevel`
- `scene.userData['baseSpeed']` → `gameState.baseSpeed`
- `scene.userData['speedBoostTimeout']` → `gameState.speedBoostTimeout`
- `scene.userData['originalSpeedLevel']` → `gameState.originalSpeedLevel`
- `scene.userData['lastForwardDir']` → `gameState.lastForwardDir`
- `scene.userData['lastRailsSpeed']` → `gameState.lastRailsSpeed`
- `scene.userData['showWireframe']` → `gameState.showWireframe`
- `scene.userData['showSurface']` → `gameState.showSurface`
- `scene.userData['debugObstacles']` → `gameState.debugObstacles`
- `scene.userData['debugEnemies']` → `gameState.debugEnemies`
- `scene.userData['debugPowerups']` → `gameState.debugPowerups`
- `scene.userData['collisionDebugEnabled']` → `gameState.collisionDebugEnabled`
- `scene.userData['hud']` → `gameState.hud`
- `scene.userData['entityManager']` → `gameState.entityManager`
- `scene.userData['camera']` → `gameState.camera`
- `scene.userData['outlinePass']` → `gameState.outlinePass`
- `scene.userData['ssaoPass']` → `gameState.ssaoPass`
- `scene.userData['collisionDebugRenderer']` → `gameState.collisionDebugRenderer`
- bare `let mouseX`, `let playerDistanceAbove`, `let movementStrafe`, `let showWireframe`, `let showSurface`, `let gameStage`, `let distanceTraveled`, `let frameCount`, `let lastBiome`, `const lastPlayerPosition` → use `gameState.*` equivalents
- `resetMainGameState()` → `gameState.resetForNewGame()`
- `getSpeedFromLevel()` → `gameState.getSpeedFromLevel()`

Also propagate `gameState` into any other files that currently read `scene.userData` for these keys. Grep the codebase for `scene.userData` to find all consumers — some are in Entity.ts, EntityManager.ts, WorldGenerator.ts, etc. For the object references (hud, entityManager, etc.), those files should receive direct references instead of fishing them out of scene.userData.

**Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add src/core/GameState.ts src/main.ts [any other modified files]
git commit -m "refactor: add typed GameState, replace scene.userData string keys"
```

---

### Task 2: Extract InputController — keybindings + keyboard listeners

**Why:** main.ts lines 705-1025 define keybindings, the `Action` type, `handleAction()`, and keyboard event listeners. This is a self-contained input layer.

**Files:**
- Create: `src/core/InputController.ts`
- Modify: `src/main.ts` — remove extracted code, import and wire InputController

**Step 1: Create `src/core/InputController.ts`**

Move from main.ts:
- The `Action` type (lines 706-732)
- `KeyBindings` map (lines 734-786)
- `handleAction()` function (lines 817-897) — this becomes a method
- `applyDebugBloomOverride()` function (lines 900-935) — becomes a method
- `getPowerUpOutlineColor()` function (lines 938-950) — becomes a method or private helper
- The two `window.addEventListener('keydown'/'keyup', ...)` blocks (lines 952-1025)
- `toggleTerrainVisualization()` and `applyVisualizationToScene()` functions

The class constructor takes references to everything handleAction needs:
- `gameState: GameState`
- `inputManager: InputManager`
- `cellShadingPass: CellShadingPass`
- `settingsPanel: SettingsPanel`
- `collisionDebugRenderer: CollisionDebugRenderer`
- `outlinePass: OutlinePass`
- `worldGenerator: WorldGenerator`
- `scene: THREE.Scene`
- `hud: HUD | null`
- `player: any`
- `gameOverlay: GameOverlay`
- `audioManager: AudioManager`

The constructor also calls `window.addEventListener` for keydown/keyup to register the listeners.

Provide a `dispose()` method to remove the event listeners if needed.

**Step 2: Remove from main.ts, import and instantiate InputController**

Replace the extracted code with:
```typescript
import { InputController } from './core/InputController';

const inputController = new InputController({
  gameState, inputManager, cellShadingPass, settingsPanel,
  collisionDebugRenderer, outlinePass, worldGenerator, scene,
  hud, player, gameOverlay, audioManager,
});
```

Any remaining main.ts code that called `handleAction()` directly (e.g. settings panel callbacks at lines 464, 471-483, 490-496) should call `inputController.handleAction()` instead.

**Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add src/core/InputController.ts src/main.ts
git commit -m "refactor: extract InputController from main.ts"
```

---

### Task 3: Extract PlayerController — movement logic from animate loop

**Why:** main.ts lines 1214-1332 contain player movement logic (strafing, turning, altitude, ground collision, ammo auto-spawn, projectile ground-kill). This doesn't belong in the render loop.

**Files:**
- Create: `src/core/PlayerController.ts`
- Modify: `src/main.ts` — remove extracted code, call `playerController.update(deltaTime)`

**Step 1: Create `src/core/PlayerController.ts`**

```typescript
import * as THREE from 'three';
import type { GameState } from './GameState';
import type { WorldGenerator } from './world/WorldGenerator';
import type { EntityManager } from './EntityManager';
import type { CameraController } from './CameraController';
import { EntityType, PowerUpSubType } from './types';

export class PlayerController {
  private readonly HOVER_HEIGHT: number;
  private readonly MIN_FLOOR_CLEARANCE: number;
  private readonly MAX_FLIGHT_HEIGHT: number;

  constructor(
    private gameState: GameState,
    private worldGenerator: WorldGenerator,
    private entityManager: EntityManager,
    private cameraController: CameraController,
    private camera: THREE.PerspectiveCamera,
    options: {
      hoverHeight: number;
      minFloorClearance: number;
      maxFlightHeight: number;
    },
  ) {
    this.HOVER_HEIGHT = options.hoverHeight;
    this.MIN_FLOOR_CLEARANCE = options.minFloorClearance;
    this.MAX_FLIGHT_HEIGHT = options.maxFlightHeight;
  }

  update(player: any, deltaTime: number): void {
    // ... all the code from main.ts lines 1214-1332 goes here,
    // reading from this.gameState instead of scene.userData,
    // using this.worldGenerator, this.entityManager, etc.
  }
}
```

The `update()` method contains:
- Shadow rig update call
- Strafe/turn movement (reading from `player.getInputState(...)`)
- Animation state updates (setStrafing, setGroundDistance, setVerticalMovement, setTurning)
- Altitude (ascend/descend) with clamping
- Auto-spawn ammo when empty
- Terrain follow (maintain playerDistanceAbove)
- Kill ground-hitting projectiles

**Step 2: In main.ts, replace lines 1214-1332 with:**

```typescript
playerController.update(player, deltaTime);
```

Move `updateShadowRig()` into PlayerController or keep it in main.ts and have PlayerController call it via a callback — whichever is cleaner. Since it uses `camera`, `directionalLight`, and `player`, it fits as a method on PlayerController (pass directionalLight to the constructor).

**Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add src/core/PlayerController.ts src/main.ts
git commit -m "refactor: extract PlayerController from main.ts"
```

---

### Task 4: Extract CombatSystem — projectile spawning

**Why:** main.ts lines 1033-1389 handle shot cooldown, projectile creation, weapon-to-projectile mapping, velocity calculation, and audio. This is a distinct system.

**Files:**
- Create: `src/core/CombatSystem.ts`
- Modify: `src/main.ts` — remove extracted code, call `combatSystem.update(deltaTime)`

**Step 1: Create `src/core/CombatSystem.ts`**

```typescript
import * as THREE from 'three';
import type { GameState } from './GameState';
import type { EntityManager } from './EntityManager';
import type { AudioManager } from './AudioManager';
import type { HUD } from '../components/HUD';
import { ProjectileSubType } from './types';

export class CombatSystem {
  private lastShotTime = 0;
  private readonly shotCooldown = 0.1; // 10 shots/sec

  constructor(
    private gameState: GameState,
    private entityManager: EntityManager,
    private audioManager: AudioManager,
    private camera: THREE.PerspectiveCamera,
    private hud: HUD | null,
  ) {}

  update(player: any, deltaTime: number): void {
    // ... code from main.ts lines 1335-1389
    // weapon-level-to-ProjectileSubType mapping
    // spawn projectile, set velocity, play sound, update HUD ammo
  }
}
```

**Step 2: In main.ts, replace lines 1033-1389 with:**

```typescript
combatSystem.update(player, deltaTime);
```

(Keep `lastShotTime` and `shotCooldown` as private state inside CombatSystem.)

**Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add src/core/CombatSystem.ts src/main.ts
git commit -m "refactor: extract CombatSystem from main.ts"
```

---

### Task 5: Propagate GameState to files that read scene.userData

**Why:** Other files besides main.ts read `scene.userData`. They need to receive typed references instead.

**Step 1: Grep for all remaining scene.userData accesses**

```bash
grep -rn 'scene\.userData' src/ --include='*.ts'
```

Known consumers from the exploration:
- `Entity.ts` — reads `scene.userData['hud']`, `scene.userData['outlinePass']`, etc.
- `EntityManager.ts` — may read entity manager or debug flags
- `WorldGenerator.ts` — reads visualization flags for new terrain chunks
- `PowerUp.ts` — reads outline pass for bloom
- `Enemy.ts` — reads scene references

For each consumer:
- If it reads a **reference** (hud, entityManager, outlinePass, etc.), pass that reference directly via constructor or setter instead of fishing it from scene.userData.
- If it reads a **state flag** (showWireframe, showSurface, debugObstacles), pass `gameState` or just the needed value.

This may require adding constructor parameters or setter methods to several classes. Keep changes minimal — only replace the scene.userData access, don't refactor the whole class.

**Step 2: Remove scene.userData assignments from main.ts**

Delete lines like:
```typescript
(scene as any).userData['hud'] = hud;
(scene as any).userData['entityManager'] = entityManager;
// etc.
```

**Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add -u src/
git commit -m "refactor: propagate typed GameState to all scene.userData consumers"
```

---

### Task 6: Clean up dead code

**Why:** Remove unused code identified in the audit.

**Files to modify:**
- `src/utils/math.ts` — remove `degToRad()` and `radToDeg()` if truly unused (verify with grep first)
- `src/core/InputManager.ts` — remove `reset()` if unused
- `src/core/CameraController.ts` — remove `getCameraDistance()` and `getCameraHeight()` if unused

**Step 1: Verify each function is truly unused**

```bash
grep -rn 'degToRad\|radToDeg' src/ --include='*.ts'
grep -rn 'inputManager\.reset\|InputManager.*reset' src/ --include='*.ts'
grep -rn 'getCameraDistance\|getCameraHeight' src/ --include='*.ts'
```

**Step 2: Remove confirmed dead code**

Only remove functions that have zero callers.

**Step 3: Verify**

```bash
npx tsc --noEmit && npm run build
```

**Step 4: Commit**

```bash
git add -u src/
git commit -m "chore: remove dead code (unused math utils, unused methods)"
```

---

### Task 7: Final verification and build

**Step 1: Type-check and build**

```bash
npx tsc --noEmit && npm run build
```

**Step 2: Run lint**

```bash
npm run lint
```

Fix any lint errors introduced by the refactor.

**Step 3: Verify main.ts line count**

After extraction, main.ts should be roughly 400-600 lines — just orchestration, setup, and the animate loop skeleton. If it's still over 700 lines, identify what else can be extracted.

**Step 4: Final commit if lint fixes were needed**

```bash
git add -u src/
git commit -m "chore: fix lint issues from refactor"
```

---

## Summary of new files

| File | Responsibility | Approx lines |
|------|---------------|-------------|
| `src/core/GameState.ts` | Typed shared state | ~80 |
| `src/core/InputController.ts` | Keybindings, keyboard listeners, handleAction | ~250 |
| `src/core/PlayerController.ts` | Player movement, flight, ground collision | ~150 |
| `src/core/CombatSystem.ts` | Projectile spawning, weapon mapping | ~80 |

**main.ts after refactor:** ~500 lines (setup + animate loop skeleton + wiring)
