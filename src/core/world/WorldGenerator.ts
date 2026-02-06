/**
 * WorldGenerator - Algorithmic procedural world generation system
 */

import * as THREE from 'three';
import {
  BiomeType,
  WorldChunk,
  TileCoordinate,
  HeightMap,
  ProceduralGenerationSettings,
  StreamingState,
  ContentTemplate,
  DifficultyScaling,
  BiomeConfig,
  BiomeSpawnRules,
} from './types';
import { EntityType } from '../types';
import { BiomeManager } from './BiomeManager';
import { EntityManager } from '../EntityManager';

export class WorldGenerator {
  private biomeManager: BiomeManager;
  private entityManager: EntityManager;
  private scene: THREE.Scene;
  private settings: ProceduralGenerationSettings;
  private streamingState: StreamingState;
  private templates: ContentTemplate[];
  private difficultyScaling: DifficultyScaling;

  // Movement optimization
  private isStrafeModeEnabled: boolean = true;
  private playerForwardDirection: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  private lastCullTime: number = 0;
  private cullCooldown: number = 500; // Cull chunks every 0.5 seconds for smoother streaming

  // Performance tracking
  private generationStats = {
    chunksGenerated: 0,
    totalGenerationTime: 0,
    averageGenerationTime: 0,
  };

  // Global powerup system
  private globalPowerUpConfig = {
    maxPerChunk: 3, // Maximum powerups per chunk
    baseSpawnChance: 0.15, // 15% base chance for powerups in any chunk
    rarityWeights: new Map([
      ['ammo', 50], // Most common (50% of spawns)
      ['shield', 25], // 25% of spawns
      ['weapon_upgrade', 15], // 15% of spawns
      ['speed', 8], // 8% of spawns
      ['life', 2], // Rarest (2% of spawns)
    ]),
    debugOverride: 'auto' as 'auto' | 'ammo' | 'shield' | 'weapon_upgrade' | 'speed' | 'life',
  };

  constructor(
    scene: THREE.Scene,
    entityManager: EntityManager,
    settings: ProceduralGenerationSettings,
  ) {
    this.scene = scene;
    this.entityManager = entityManager;
    this.biomeManager = new BiomeManager();
    this.settings = settings;
    this.templates = [];

    this.streamingState = {
      playerPosition: new THREE.Vector3(0, 0, 0),
      loadedChunks: new Map(),
      loadingQueue: [],
      unloadingQueue: [],
      frameGenerationTime: 0,
      totalChunksGenerated: 0,
      totalChunksLoaded: 0,
    };

    this.difficultyScaling = {
      baseDistance: 1000,
      enemyHealthMultiplier: 1.0,
      enemyDamageMultiplier: 1.0,
      enemySpeedMultiplier: 1.0,
      spawnRateMultiplier: 1.0,
      playerSkillRating: 1.0,
      adaptationRate: 0.1,
    };

    this.initializeContentTemplates();
  }

  private initializeContentTemplates(): void {
    // Create content templates for procedural structures
    this.templates = [
      // Ancient ruins template
      {
        id: 'desert_ruins',
        type: 'structure',
        biomes: [BiomeType.DESERT],
        rarity: 0.1,
        size: { width: 50, depth: 50, height: 20 },
        obstacles: [
          {
            type: 'pillar',
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 2, 1),
          },
          {
            type: 'pillar',
            position: new THREE.Vector3(20, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(1, 1.5, 1),
          },
          {
            type: 'rock',
            position: new THREE.Vector3(10, 0, 15),
            rotation: new THREE.Euler(0, Math.PI / 4, 0),
            scale: new THREE.Vector3(1.5, 1, 1.5),
          },
        ],
        enemies: [
          {
            type: 'swooper',
            position: new THREE.Vector3(5, 0, 10),
          },
          {
            type: 'mech',
            position: new THREE.Vector3(-10, 0, 5),
          },
        ],
        powerUps: [
          {
            type: 'weapon_upgrade',
            position: new THREE.Vector3(0, 5, 0),
            hidden: true,
          },
        ],
      },

      // Crystal formation
      {
        id: 'crystal_formation',
        type: 'formation',
        biomes: [BiomeType.CRYSTAL_CAVES, BiomeType.FOREST],
        rarity: 0.15,
        size: { width: 30, depth: 30, height: 15 },
        obstacles: [
          {
            type: 'crystal',
            position: new THREE.Vector3(0, 0, 0),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(2, 3, 2),
          },
          {
            type: 'crystal',
            position: new THREE.Vector3(8, 0, 8),
            rotation: new THREE.Euler(0, Math.PI / 3, 0),
            scale: new THREE.Vector3(1.5, 2, 1.5),
          },
          {
            type: 'crystal',
            position: new THREE.Vector3(-8, 0, 8),
            rotation: new THREE.Euler(0, -Math.PI / 3, 0),
            scale: new THREE.Vector3(1.2, 1.8, 1.2),
          },
        ],
        enemies: [
          {
            type: 'striker',
            position: new THREE.Vector3(0, 10, 0),
          },
        ],
        powerUps: [
          {
            type: 'shield',
            position: new THREE.Vector3(0, 0, 0),
            hidden: false,
          },
        ],
      },

      // Enemy ambush encounter
      {
        id: 'tank_ambush',
        type: 'encounter',
        biomes: [BiomeType.DESERT, BiomeType.CYBERPUNK_CITY],
        rarity: 0.08,
        size: { width: 80, depth: 80, height: 10 },
        obstacles: [
          {
            type: 'rock',
            position: new THREE.Vector3(25, 0, 25),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(2, 1, 2),
          },
          {
            type: 'rock',
            position: new THREE.Vector3(-25, 0, 25),
            rotation: new THREE.Euler(0, 0, 0),
            scale: new THREE.Vector3(2, 1, 2),
          },
        ],
        enemies: [
          {
            type: 'mech',
            position: new THREE.Vector3(0, 0, 30),
          },
          {
            type: 'mech',
            position: new THREE.Vector3(15, 0, 20),
          },
          {
            type: 'mech',
            position: new THREE.Vector3(-15, 0, 20),
          },
        ],
        powerUps: [
          {
            type: 'ammo',
            position: new THREE.Vector3(0, 0, -20),
            hidden: false,
          },
        ],
      },
    ];
  }

  public updatePlayerPosition(position: THREE.Vector3): void {
    this.streamingState.playerPosition.copy(position);

    // Update difficulty scaling based on distance from origin
    const distance = position.length();
    if (distance > this.difficultyScaling.baseDistance) {
      const scaleFactor = distance / this.difficultyScaling.baseDistance;
      this.difficultyScaling.enemyHealthMultiplier = 1.0 + (scaleFactor - 1.0) * 0.5;
      this.difficultyScaling.enemyDamageMultiplier = 1.0 + (scaleFactor - 1.0) * 0.3;
      this.difficultyScaling.spawnRateMultiplier = Math.min(2.0, 1.0 + (scaleFactor - 1.0) * 0.4);
    }
  }

  /**
   * Update movement mode for chunk culling optimization
   */
  public setMovementMode(isStrafeModeEnabled: boolean): void {
    this.isStrafeModeEnabled = isStrafeModeEnabled;
  }

  /**
   * Set powerup debug override (affects new chunks only)
   */
  public setPowerUpDebugOverride(
    type: 'auto' | 'ammo' | 'shield' | 'weapon_upgrade' | 'speed' | 'life',
  ): void {
    this.globalPowerUpConfig.debugOverride = type;
    console.log(
      `🎮 PowerUp Debug Override: ${type === 'auto' ? 'Random (Auto)' : type.toUpperCase()}`,
    );
  }

  /**
   * Get current powerup debug override
   */
  public getPowerUpDebugOverride(): string {
    return this.globalPowerUpConfig.debugOverride;
  }

  /**
   * Disable directional chunk culling optimization (for debugging performance issues)
   */
  public disableDirectionalCulling(): void {
    this.isStrafeModeEnabled = false;
  }

  /**
   * Update player forward direction for chunk culling optimization
   */
  public setPlayerForwardDirection(direction: THREE.Vector3): void {
    this.playerForwardDirection.copy(direction).normalize();
  }

  public update(): void {
    const startTime = Date.now();

    // Update streaming based on player position
    this.updateStreaming();

    // Process loading queue
    this.processLoadingQueue();

    // Process unloading queue
    this.processUnloadingQueue();

    // Track performance
    this.streamingState.frameGenerationTime = Date.now() - startTime;
  }

  private updateStreaming(): void {
    const playerTile = this.worldPositionToTile(this.streamingState.playerPosition);
    const preloadRadius = Math.ceil(this.settings.preloadDistance / this.settings.tileSize);
    const unloadRadius = Math.ceil(this.settings.unloadDistance / this.settings.tileSize);

    // Add tiles to loading queue (streamlined - no verbose logging)
    for (let x = playerTile.x - preloadRadius; x <= playerTile.x + preloadRadius; x++) {
      for (let z = playerTile.z - preloadRadius; z <= playerTile.z + preloadRadius; z++) {
        const tileCoord: TileCoordinate = { x, z, size: this.settings.tileSize };
        const chunkId = this.tileCoordinateToId(tileCoord);

        if (
          !this.streamingState.loadedChunks.has(chunkId) &&
          !this.streamingState.loadingQueue.some(
            coord => this.tileCoordinateToId(coord) === chunkId,
          )
        ) {
          this.streamingState.loadingQueue.push(tileCoord);
        }
      }
    }

    // Add chunks to unloading queue
    for (const [chunkId, chunk] of this.streamingState.loadedChunks) {
      const distance = Math.sqrt(
        Math.pow(chunk.coordinate.x - playerTile.x, 2) +
          Math.pow(chunk.coordinate.z - playerTile.z, 2),
      );

      let shouldUnload = distance > unloadRadius;

      // Strafe mode optimization: cull chunks behind the player (with throttling)
      if (this.isStrafeModeEnabled && !shouldUnload) {
        const currentTime = Date.now();

        // Only perform directional culling periodically to prevent thrashing
        if (currentTime - this.lastCullTime > this.cullCooldown) {
          // Calculate chunk center in world coordinates
          const chunkWorldX =
            chunk.coordinate.x * this.settings.tileSize + this.settings.tileSize / 2;
          const chunkWorldZ =
            chunk.coordinate.z * this.settings.tileSize + this.settings.tileSize / 2;

          // Vector from player to chunk center
          const toChunk = new THREE.Vector3(
            chunkWorldX - this.streamingState.playerPosition.x,
            0,
            chunkWorldZ - this.streamingState.playerPosition.z,
          );

          // Check if chunk is behind the player (dot product < 0)
          const dotProduct = toChunk.dot(this.playerForwardDirection);

          // More conservative culling: only cull chunks that are very far behind (3+ tiles)
          // and ensure they're also outside the normal preload radius
          if (dotProduct < -this.settings.tileSize * 3 && distance > preloadRadius * 0.8) {
            shouldUnload = true;
            // Update cull time only when we actually cull something
            this.lastCullTime = currentTime;
          }
        }
      }

      if (shouldUnload) {
        this.streamingState.unloadingQueue.push(chunkId);
      }
    }
  }

  private processLoadingQueue(): void {
    if (this.streamingState.loadingQueue.length === 0) return;
    if (this.streamingState.loadedChunks.size >= this.settings.maxLoadedChunks) return;

    const maxTime = this.settings.maxGenerationTime;
    const maxChunksPerFrame = 3; // Limit chunks per frame for smoother generation
    const startTime = Date.now();
    let chunksProcessed = 0;

    while (
      this.streamingState.loadingQueue.length > 0 &&
      Date.now() - startTime < maxTime &&
      chunksProcessed < maxChunksPerFrame
    ) {
      const coordinate = this.streamingState.loadingQueue.shift();
      if (!coordinate) break;
      const chunk = this.generateChunk(coordinate);

      const chunkId = this.tileCoordinateToId(coordinate);
      this.streamingState.loadedChunks.set(chunkId, chunk);
      this.streamingState.totalChunksLoaded++;
      chunksProcessed++;
    }
  }

  private processUnloadingQueue(): void {
    while (this.streamingState.unloadingQueue.length > 0) {
      const chunkId = this.streamingState.unloadingQueue.shift();
      if (!chunkId) break;
      const chunk = this.streamingState.loadedChunks.get(chunkId);

      if (chunk) {
        this.unloadChunk(chunk);
        this.streamingState.loadedChunks.delete(chunkId);

        // Fix counter display - decrement when chunks are actually unloaded
        this.streamingState.totalChunksGenerated--;
        this.generationStats.chunksGenerated--;
      }
    }
  }

  private generateChunk(coordinate: TileCoordinate): WorldChunk {
    const startTime = Date.now();

    // Determine biome for this chunk (use consistent tileSize)
    const worldX = coordinate.x * this.settings.tileSize;
    const worldZ = coordinate.z * this.settings.tileSize;
    const biome = this.biomeManager.getBiomeAt(worldX, worldZ);
    const biomeConfig = this.biomeManager.getBiome(biome);
    if (!biomeConfig) {
      throw new Error(`Biome config not found for: ${biome}`);
    }

    // Generate height map
    const heightMap = this.generateHeightMap(coordinate, biomeConfig.heightNoise);

    // Create terrain mesh with proper positioning
    const { mesh, heightGrid } = this.createTerrainMesh(heightMap, biomeConfig, coordinate);

    // Create chunk
    const chunk: WorldChunk = {
      id: this.tileCoordinateToId(coordinate),
      coordinate,
      biome,
      loaded: true,
      generated: true,
      heightMap,
      mesh,
      lodLevel: 0,
      heightGrid, // Store the height grid for edge constraints
      seed: this.generateSeed(coordinate),
      generationVersion: 1,
      lastAccessed: Date.now(),
    };

    // Generate content
    this.populateChunk(chunk, biomeConfig);

    // Add to scene
    if (mesh) {
      this.scene.add(mesh);
    } else {
      console.error('❌ Failed to create terrain mesh!');
    }

    // Update stats
    const generationTime = Date.now() - startTime;
    this.generationStats.chunksGenerated++;
    this.generationStats.totalGenerationTime += generationTime;
    this.generationStats.averageGenerationTime =
      this.generationStats.totalGenerationTime / this.generationStats.chunksGenerated;

    return chunk;
  }

  private generateHeightMap(coordinate: TileCoordinate, _noiseParams: any): HeightMap {
    const resolution = this.settings.terrainResolution;
    const data = new Float32Array(resolution * resolution);

    // Calculate world offset for this tile (use consistent tileSize)
    const worldOffsetX = coordinate.x * this.settings.tileSize;
    const worldOffsetZ = coordinate.z * this.settings.tileSize;
    const tileSize = this.settings.tileSize;

    // Generate height data using continuous world-space coordinates
    for (let z = 0; z < resolution; z++) {
      for (let x = 0; x < resolution; x++) {
        // Calculate exact world position for this vertex
        const localX = (x / (resolution - 1)) * tileSize - tileSize * 0.5;
        const localZ = (z / (resolution - 1)) * tileSize - tileSize * 0.5;
        const worldX = worldOffsetX + localX;
        const worldZ = worldOffsetZ + localZ;

        // Sample continuous height function at exact world coordinates
        const height = this.getContinuousHeightAt(worldX, worldZ);

        // Normalize height to [0, 1] range for heightmap - expanded range for more dramatic terrain
        data[z * resolution + x] = Math.max(0, Math.min(1, (height + 50) / 100));
      }
    }

    return {
      width: resolution,
      height: resolution,
      data,
      scale: 50, // Increased from 20 for taller peaks and deeper valleys
      offset: 0,
    };
  }

  private createTerrainMesh(
    _heightMap: HeightMap,
    biomeConfig: BiomeConfig,
    coordinate: TileCoordinate,
  ): { mesh: THREE.Mesh; heightGrid: number[][] } {
    // Create geometry manually to ensure perfect tile alignment
    const segments = 64; // 64x64 subdivisions
    const vertices: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];

    // Create height grid to store heights for future tile constraints
    const heightGrid: number[][] = [];
    const gridSize = segments + 1; // 64x64 subdivisions = 65x65 vertices

    // Initialize height grid
    for (let i = 0; i < gridSize; i++) {
      heightGrid[i] = new Array(gridSize);
    }

    // Calculate world offset for this tile
    const worldOffsetX = coordinate.x * this.settings.tileSize;
    const worldOffsetZ = coordinate.z * this.settings.tileSize;

    // Generate vertices with exact positioning to ensure tile alignment
    for (let z = 0; z <= segments; z++) {
      for (let x = 0; x <= segments; x++) {
        // Calculate exact local position within tile (-tileSize/2 to +tileSize/2)
        const localX = (x / segments) * this.settings.tileSize - this.settings.tileSize * 0.5;
        const localZ = (z / segments) * this.settings.tileSize - this.settings.tileSize * 0.5;

        // Calculate exact world coordinates
        const worldX = worldOffsetX + localX;
        const worldZ = worldOffsetZ + localZ;

        // Sample height at exact world coordinates
        const height = this.getContinuousHeightAt(worldX, worldZ);

        // Store vertex (in Three.js world coordinates: X right, Y up, Z forward)
        vertices.push(worldX, height, worldZ);

        // Store height in grid for reference
        heightGrid[x][z] = height;

        // Generate UV coordinates
        uvs.push(x / segments, z / segments);

        // Vertex color based on biome diffuse color modulated by height
        const base = biomeConfig.materialProperties.diffuseColor;
        const tmp = base.clone();
        const hNorm = THREE.MathUtils.clamp((height + 20) / 40, 0, 1); // normalize
        const hsl = { h: 0, s: 0, l: 0 } as any;
        tmp.getHSL(hsl);
        // Adjust lightness with height to create variation
        const lightness = THREE.MathUtils.clamp(hsl.l * (0.75 + hNorm * 0.5), 0, 1);
        tmp.setHSL(hsl.h, hsl.s, lightness);
        colors.push(tmp.r, tmp.g, tmp.b);
      }
    }

    // Generate indices for triangles (two triangles per quad)
    for (let z = 0; z < segments; z++) {
      for (let x = 0; x < segments; x++) {
        const a = x + z * (segments + 1);
        const b = x + 1 + z * (segments + 1);
        const c = x + (z + 1) * (segments + 1);
        const d = x + 1 + (z + 1) * (segments + 1);

        // Two triangles per quad
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }

    // Create geometry with manual vertex data
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();

    // Create surface material using vertex colors
    const surfaceMaterial = new THREE.MeshLambertMaterial({
      vertexColors: true,
      wireframe: false,
      side: THREE.DoubleSide,
    });

    const surfaceMesh = new THREE.Mesh(geometry, surfaceMaterial);
    surfaceMesh.receiveShadow = true;
    // Explicitly keep terrain out of bloom layer
    surfaceMesh.layers.disable(1);
    surfaceMesh.userData['isTerrain'] = true;
    surfaceMesh.userData['isTerrainSurface'] = true;

    // Create wireframe overlay as a separate sibling (not child) for true independent visibility
    const wireGeom = new THREE.WireframeGeometry(geometry);
    const wireMat = new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 0.5, // Make wireframe lines thinner (limited browser support)
      opacity: 0.6, // Make lines more transparent for thinner appearance
      transparent: true,
    });
    const wireframe = new THREE.LineSegments(wireGeom, wireMat);
    wireframe.renderOrder = 1; // draw after surface
    wireframe.userData['isTerrainWireframe'] = true;

    // Position wireframe at same position as surface mesh
    wireframe.position.copy(surfaceMesh.position);
    wireframe.rotation.copy(surfaceMesh.rotation);
    wireframe.scale.copy(surfaceMesh.scale);

    // Add both meshes to scene
    this.scene.add(wireframe);

    // Respect current visualization flags stored on the scene (if present)
    const parentScene = this.scene as any;
    if (parentScene && parentScene.userData) {
      const surfaceVisible = parentScene.userData['showSurface'];
      const wireVisible = parentScene.userData['showWireframe'];
      if (typeof surfaceVisible === 'boolean') {
        surfaceMesh.visible = surfaceVisible;
      }
      if (typeof wireVisible === 'boolean') {
        wireframe.visible = wireVisible;
      }
    }

    return { mesh: surfaceMesh, heightGrid };
  }

  private populateChunk(chunk: WorldChunk, biomeConfig: BiomeConfig): void {
    const spawnRules = biomeConfig.spawnRules;
    // chunkCenter and difficultyMultiplier removed — were used by old per-tile enemy spawning (now in WaveSpawner)

    // Track total entities spawned in this chunk
    let totalEntitiesSpawned = 0;
    const maxEntities = spawnRules.maxEntitiesPerTile;

    // Spawn obstacles (with limits)
    totalEntitiesSpawned += this.spawnObstacles(
      chunk,
      spawnRules,
      maxEntities - totalEntitiesSpawned,
    );

    // Old per-tile enemy spawning — replaced by WaveSpawner
    // totalEntitiesSpawned += this.spawnEnemies(
    //   chunk,
    //   spawnRules,
    //   chunkCenter,
    //   difficultyMultiplier,
    //   maxEntities - totalEntitiesSpawned,
    // );

    // Spawn power-ups (with remaining limit)
    totalEntitiesSpawned += this.spawnPowerUps(
      chunk,
      spawnRules,
      maxEntities - totalEntitiesSpawned,
    );

    // Apply content templates
    this.applyContentTemplates(chunk);
  }

  private spawnObstacles(
    chunk: WorldChunk,
    spawnRules: BiomeSpawnRules,
    maxRemaining: number,
  ): number {
    let spawned = 0;

    for (const rule of spawnRules.obstacleRules) {
      if (spawned >= maxRemaining) break;

      const count = Math.min(
        Math.floor(Math.random() * (rule.groupSize.max - rule.groupSize.min + 1)) +
          rule.groupSize.min,
        maxRemaining - spawned,
      );

      for (let i = 0; i < count && spawned < maxRemaining; i++) {
        if (Math.random() < rule.probability) {
          const position = this.getRandomPositionInChunk(chunk.coordinate, chunk.heightMap);

          if (position.y >= rule.heightRange.min && position.y <= rule.heightRange.max) {
            const clampedY = this.clampAboveTerrain(position.x, position.z, position.y, 0.0);
            this.entityManager.spawnObstacle(rule.type, {
              x: position.x,
              y: clampedY,
              z: position.z,
            });
            spawned++;
            // No need to track entity in chunk - we'll find it by position when needed
          }
        }
      }
    }

    return spawned;
  }

  // Old per-tile enemy spawning — kept for reference, replaced by WaveSpawner
  // @ts-ignore: Method retained for reference; call site disabled in favor of WaveSpawner
  private spawnEnemies(
    chunk: WorldChunk,
    spawnRules: BiomeSpawnRules,
    _chunkCenter: THREE.Vector3,
    difficultyMultiplier: number,
    maxRemaining: number,
  ): number {
    let spawned = 0;

    for (const rule of spawnRules.enemyRules) {
      if (spawned >= maxRemaining) break;

      const maxCount = Math.min(
        Math.floor(rule.maxPerTile * difficultyMultiplier),
        maxRemaining - spawned,
      );
      const actualCount = Math.floor(Math.random() * maxCount);

      for (let i = 0; i < actualCount && spawned < maxRemaining; i++) {
        if (Math.random() < rule.probability) {
          const position = this.getRandomPositionInChunk(chunk.coordinate, chunk.heightMap);

          const clampedY = this.clampAboveTerrain(position.x, position.z, position.y + 1, 0.25);
          const enemy = this.entityManager.spawnEnemy(rule.type as any, {
            x: position.x,
            y: clampedY, // ensure above ground
            z: position.z,
          });

          // Apply difficulty scaling
          enemy.health = Math.floor(enemy.health * this.difficultyScaling.enemyHealthMultiplier);
          enemy.maxHealth = enemy.health;

          spawned++;
          // No need to track entity in chunk - we'll find it by position when needed
        }
      }
    }

    return spawned;
  }

  private spawnPowerUps(
    chunk: WorldChunk,
    _spawnRules: BiomeSpawnRules,
    maxRemaining: number,
  ): number {
    let spawned = 0;

    // Use global powerup system instead of biome-specific rules
    const config = this.globalPowerUpConfig;

    // First check: Should we spawn ANY PowerUps in this chunk?
    if (Math.random() > config.baseSpawnChance || maxRemaining <= 0) {
      return 0; // No PowerUps for this chunk
    }

    // Determine how many powerups to spawn (1 to maxPerChunk)
    const maxToSpawn = Math.min(config.maxPerChunk, maxRemaining);
    const numToSpawn = Math.floor(Math.random() * maxToSpawn) + 1;

    for (let i = 0; i < numToSpawn; i++) {
      const powerUpType = this.selectPowerUpType();
      const position = this.getRandomPositionInChunk(chunk.coordinate, chunk.heightMap);

      const clampedY = this.clampAboveTerrain(position.x, position.z, position.y + 0.5, 0.25);
      this.entityManager.spawnPowerUp(powerUpType as any, {
        x: position.x,
        y: clampedY, // slightly above ground
        z: position.z,
      });

      spawned++;
    }

    return spawned;
  }

  // Select powerup type based on rarity weights or debug override
  private selectPowerUpType(): string {
    const config = this.globalPowerUpConfig;

    // Check for debug override
    if (config.debugOverride !== 'auto') {
      return config.debugOverride;
    }

    // Use weighted random selection based on rarity
    const totalWeight = Array.from(config.rarityWeights.values()).reduce(
      (sum, weight) => sum + weight,
      0,
    );
    let randomValue = Math.random() * totalWeight;

    for (const [type, weight] of config.rarityWeights.entries()) {
      randomValue -= weight;
      if (randomValue <= 0) {
        return type;
      }
    }

    // Fallback to ammo if something goes wrong
    return 'ammo';
  }

  private applyContentTemplates(chunk: WorldChunk): void {
    const biomeConfig = this.biomeManager.getBiome(chunk.biome);
    if (!biomeConfig) return;

    // Find applicable templates for this biome
    const applicableTemplates = this.templates.filter(template =>
      template.biomes.includes(chunk.biome),
    );

    for (const template of applicableTemplates) {
      if (Math.random() < template.rarity) {
        const position = this.getRandomPositionInChunk(chunk.coordinate, chunk.heightMap);

        this.instantiateTemplate(template, position, position.y, chunk);
      }
    }
  }

  private instantiateTemplate(
    template: ContentTemplate,
    basePosition: THREE.Vector3,
    height: number,
    _chunk: WorldChunk,
  ): void {
    // Spawn obstacles from template
    for (const obstacleData of template.obstacles) {
      const worldPos = basePosition.clone().add(obstacleData['position']);
      const obstacleY = this.clampAboveTerrain(
        worldPos.x,
        worldPos.z,
        height + obstacleData['position'].y,
        0.0,
      );
      this.entityManager.spawnObstacle(obstacleData.type, {
        x: worldPos.x,
        y: obstacleY,
        z: worldPos.z,
      });
      // No need to track entity in chunk - we'll find it by position when needed
    }

    // Spawn enemies from template
    for (const enemyData of template.enemies) {
      const worldPos = basePosition.clone().add(enemyData['position']);
      const enemyY = this.clampAboveTerrain(
        worldPos.x,
        worldPos.z,
        height + enemyData['position'].y,
        0.25,
      );
      this.entityManager.spawnEnemy(enemyData.type as any, {
        x: worldPos.x,
        y: enemyY,
        z: worldPos.z,
      });
      // No need to track entity in chunk - we'll find it by position when needed
    }

    // Spawn power-ups from template
    for (const powerUpData of template.powerUps) {
      const worldPos = basePosition.clone().add(powerUpData['position']);
      const puY = this.clampAboveTerrain(
        worldPos.x,
        worldPos.z,
        height + powerUpData['position'].y,
        0.25,
      );
      this.entityManager.spawnPowerUp(powerUpData.type as any, {
        x: worldPos.x,
        y: puY,
        z: worldPos.z,
      });
      // No need to track entity in chunk - we'll find it by position when needed
    }
  }

  // Ensure Y is at least terrain height + clearance at (x, z)
  private clampAboveTerrain(x: number, z: number, y: number, clearance = 0.25): number {
    const terrainY = this.getTerrainHeightAt(x, z);
    return Math.max(y, terrainY + clearance);
  }

  private unloadChunk(chunk: WorldChunk): void {
    // Remove terrain mesh
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      if (chunk.mesh.material instanceof THREE.Material) {
        chunk.mesh.material.dispose();
      }
    }

    // Find and remove all entities in this chunk by checking their current positions
    const entitiesToRemove: string[] = [];
    const allEntities = this.entityManager
      .getEntitiesByType(EntityType.OBSTACLE)
      .concat(this.entityManager.getEntitiesByType(EntityType.ENEMY))
      .concat(this.entityManager.getEntitiesByType(EntityType.POWERUP))
      .concat(this.entityManager.getEntitiesByType(EntityType.PROJECTILE));

    for (const entity of allEntities) {
      const entityChunk = this.worldPositionToTile(entity.position);
      if (entityChunk.x === chunk.coordinate.x && entityChunk.z === chunk.coordinate.z) {
        entitiesToRemove.push(entity.id);
      }
    }

    // Remove all entities found in this chunk
    for (const entityId of entitiesToRemove) {
      this.entityManager.remove(entityId);
    }

    chunk.loaded = false;
  }

  // Utility methods
  private worldPositionToTile(position: THREE.Vector3): TileCoordinate {
    const tileX = Math.floor(position.x / this.settings.tileSize);
    const tileZ = Math.floor(position.z / this.settings.tileSize);
    return {
      x: tileX,
      z: tileZ,
      size: this.settings.tileSize,
    };
  }

  private tileCoordinateToId(coordinate: TileCoordinate): string {
    return `${coordinate.x}_${coordinate.z}`;
  }

  private generateSeed(coordinate: TileCoordinate): number {
    // Generate deterministic seed based on coordinates
    return coordinate.x * 1000 + coordinate.z;
  }

  private getRandomPositionInChunk(
    coordinate: TileCoordinate,
    heightMap: HeightMap,
  ): THREE.Vector3 {
    const chunkSize = this.settings.tileSize;
    const margin = chunkSize * 0.1; // 10% margin from edges

    const position = new THREE.Vector3(
      coordinate.x * chunkSize + (Math.random() - 0.5) * (chunkSize - margin * 2),
      0, // Temporary, will be set below
      coordinate.z * chunkSize + (Math.random() - 0.5) * (chunkSize - margin * 2),
    );

    // Get actual terrain height at this position and place EXACTLY on the floor
    const terrainHeight = this.getHeightAtPosition(heightMap, position, coordinate);
    position.y = terrainHeight;

    return position;
  }

  private getHeightAtPosition(
    heightMap: HeightMap,
    position: THREE.Vector3,
    coordinate: TileCoordinate,
  ): number {
    // Convert world position to heightmap coordinates
    const localX =
      ((position.x - coordinate.x * this.settings.tileSize) / this.settings.tileSize + 0.5) *
      heightMap.width;
    const localZ =
      ((position.z - coordinate.z * this.settings.tileSize) / this.settings.tileSize + 0.5) *
      heightMap.height;

    const x = Math.floor(Math.max(0, Math.min(heightMap.width - 1, localX)));
    const z = Math.floor(Math.max(0, Math.min(heightMap.height - 1, localZ)));

    const heightValue = heightMap.data[x + z * heightMap.width];
    return heightValue * heightMap.scale + heightMap.offset;
  }

  // Public API
  public getGenerationStats() {
    return { ...this.generationStats };
  }

  public getStreamingState() {
    return { ...this.streamingState };
  }

  public getDifficultyScaling() {
    return { ...this.difficultyScaling };
  }

  /**
   * Get terrain height at a specific world position
   */
  public getTerrainHeightAt(worldX: number, worldZ: number): number {
    // Find the chunk containing this position
    const chunkX = Math.floor(worldX / this.settings.tileSize);
    const chunkZ = Math.floor(worldZ / this.settings.tileSize);
    const chunkKey = `${chunkX},${chunkZ}`;

    const chunk = this.streamingState.loadedChunks.get(chunkKey);
    if (!chunk) {
      // If chunk not loaded, return a basic height based on noise
      return this.generateBasicHeightAt(worldX, worldZ);
    }

    const position = new THREE.Vector3(worldX, 0, worldZ);
    return this.getHeightAtPosition(chunk.heightMap, position, chunk.coordinate);
  }

  /**
   * Continuous height function - produces seamless terrain across all tile boundaries
   */
  private getContinuousHeightAt(worldX: number, worldZ: number): number {
    // Multi-octave noise for varied terrain
    let height = 0;
    let amplitude = 25.0; // Increased from 10.0 for more dramatic height variation
    let frequency = 0.008;
    const octaves = 4;
    const persistence = 0.55;
    const lacunarity = 2.1;

    // Base terrain with multiple octaves
    for (let octave = 0; octave < octaves; octave++) {
      const noiseValue = this.continuousNoise(worldX * frequency, worldZ * frequency);
      height += noiseValue * amplitude;

      amplitude *= persistence;
      frequency *= lacunarity;
    }

    // Add large-scale features for dramatic landscape variations
    height += this.continuousNoise(worldX * 0.0015, worldZ * 0.0015) * 60;

    // Add fine detail
    height += this.continuousNoise(worldX * 0.04, worldZ * 0.04) * 2;

    return height;
  }

  /**
   * Improved continuous noise function using trigonometric functions
   * This ensures perfect continuity across all coordinates
   */
  private continuousNoise(x: number, z: number): number {
    // Multiple sine/cosine waves for smooth, continuous noise
    const n1 = Math.sin(x * 1.2345 + z * 0.6789);
    const n2 = Math.cos(x * 0.8901 + z * 1.3456);
    const n3 = Math.sin(x * 2.1098 + z * 0.4321);
    const n4 = Math.cos(x * 0.5432 + z * 2.3456);
    const n5 = Math.sin(x * 3.7777 + z * 1.8888);

    // Combine and normalize to [-1, 1] range
    return (n1 + n2 + n3 + n4 + n5) / 5.0;
  }

  /**
   * Generate basic height when chunk is not loaded (fallback)
   * Uses same continuous function to ensure consistency
   */
  private generateBasicHeightAt(x: number, z: number): number {
    return this.getContinuousHeightAt(x, z);
  }

  /**
   * Reset world generator by repopulating existing chunks with fresh entities
   * Keeps terrain but regenerates all entities in loaded chunks
   */
  public reset(): void {
    // Get all currently loaded chunks
    const loadedChunks = Array.from(this.streamingState.loadedChunks.values());

    // For each loaded chunk, repopulate with entities
    for (const chunk of loadedChunks) {
      if (chunk.loaded && chunk.generated) {
        // Get biome configuration for this chunk
        const biomeConfig = this.biomeManager.getBiome(chunk.biome);

        // Repopulate the chunk with fresh entities (only if biome config exists)
        if (biomeConfig) {
          this.populateChunk(chunk, biomeConfig);
        }
      }
    }

    // Reset generation stats
    this.generationStats.chunksGenerated = loadedChunks.length;
    this.generationStats.totalGenerationTime = 0;
    this.generationStats.averageGenerationTime = 0;
  }
}
