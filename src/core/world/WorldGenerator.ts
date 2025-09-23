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

  // Performance tracking
  private generationStats = {
    chunksGenerated: 0,
    totalGenerationTime: 0,
    averageGenerationTime: 0,
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
            type: 'grunt',
            position: new THREE.Vector3(5, 0, 10),
          },
          {
            type: 'soldier',
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
            type: 'flyer',
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
            type: 'tank',
            position: new THREE.Vector3(0, 0, 30),
          },
          {
            type: 'soldier',
            position: new THREE.Vector3(15, 0, 20),
          },
          {
            type: 'soldier',
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

      if (distance > unloadRadius) {
        this.streamingState.unloadingQueue.push(chunkId);
      }
    }
  }

  private processLoadingQueue(): void {
    if (this.streamingState.loadingQueue.length === 0) return;
    if (this.streamingState.loadedChunks.size >= this.settings.maxLoadedChunks) return;

    const maxTime = this.settings.maxGenerationTime;
    const startTime = Date.now();

    while (this.streamingState.loadingQueue.length > 0 && Date.now() - startTime < maxTime) {
      const coordinate = this.streamingState.loadingQueue.shift();
      if (!coordinate) break;
      const chunk = this.generateChunk(coordinate);

      const chunkId = this.tileCoordinateToId(coordinate);
      this.streamingState.loadedChunks.set(chunkId, chunk);
      this.streamingState.totalChunksLoaded++;
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
      entities: new Set(),
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

        // Normalize height to [0, 1] range for heightmap
        data[z * resolution + x] = Math.max(0, Math.min(1, (height + 20) / 40));
      }
    }

    return {
      width: resolution,
      height: resolution,
      data,
      scale: 20, // Reasonable height scale
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

    // Create wireframe overlay as a separate child for independent visibility
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
    surfaceMesh.add(wireframe);

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
    const chunkCenter = new THREE.Vector3(
      chunk.coordinate.x * this.settings.tileSize,
      0,
      chunk.coordinate.z * this.settings.tileSize,
    );

    // Apply difficulty scaling
    const distance = chunkCenter.length();
    const difficultyMultiplier = Math.max(1.0, distance / this.difficultyScaling.baseDistance);

    // Spawn obstacles
    this.spawnObstacles(chunk, spawnRules);

    // Spawn enemies (with difficulty scaling)
    this.spawnEnemies(chunk, spawnRules, chunkCenter, difficultyMultiplier);

    // Spawn power-ups
    this.spawnPowerUps(chunk, spawnRules);

    // Apply content templates
    this.applyContentTemplates(chunk);
  }

  private spawnObstacles(chunk: WorldChunk, spawnRules: BiomeSpawnRules): void {
    for (const rule of spawnRules.obstacleRules) {
      const count =
        Math.floor(Math.random() * (rule.groupSize.max - rule.groupSize.min + 1)) +
        rule.groupSize.min;

      for (let i = 0; i < count; i++) {
        if (Math.random() < rule.probability) {
          const position = this.getRandomPositionInChunk(chunk.coordinate, chunk.heightMap);

          if (position.y >= rule.heightRange.min && position.y <= rule.heightRange.max) {
            const clampedY = this.clampAboveTerrain(position.x, position.z, position.y, 0.0);
            const obstacle = this.entityManager.spawnObstacle(rule.type, {
              x: position.x,
              y: clampedY,
              z: position.z,
            });
            chunk.entities.add(obstacle.id);
          }
        }
      }
    }
  }

  private spawnEnemies(
    chunk: WorldChunk,
    spawnRules: BiomeSpawnRules,
    _chunkCenter: THREE.Vector3,
    difficultyMultiplier: number,
  ): void {
    for (const rule of spawnRules.enemyRules) {
      const maxCount = Math.floor(rule.maxPerTile * difficultyMultiplier);
      const actualCount = Math.floor(Math.random() * maxCount);

      for (let i = 0; i < actualCount; i++) {
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

          chunk.entities.add(enemy.id);
        }
      }
    }
  }

  private spawnPowerUps(chunk: WorldChunk, spawnRules: BiomeSpawnRules): void {
    for (const rule of spawnRules.powerUpRules) {
      if (Math.random() < rule.probability) {
        const position = this.getRandomPositionInChunk(chunk.coordinate, chunk.heightMap);

        const clampedY = this.clampAboveTerrain(position.x, position.z, position.y + 0.5, 0.25);
        const powerUp = this.entityManager.spawnPowerUp(rule.type as any, {
          x: position.x,
          y: clampedY, // slightly above ground
          z: position.z,
        });

        chunk.entities.add(powerUp.id);
      }
    }
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
    chunk: WorldChunk,
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
      const obstacle = this.entityManager.spawnObstacle(obstacleData.type, {
        x: worldPos.x,
        y: obstacleY,
        z: worldPos.z,
      });
      chunk.entities.add(obstacle.id);
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
      const enemy = this.entityManager.spawnEnemy(enemyData.type as any, {
        x: worldPos.x,
        y: enemyY,
        z: worldPos.z,
      });
      chunk.entities.add(enemy.id);
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
      const powerUp = this.entityManager.spawnPowerUp(powerUpData.type as any, {
        x: worldPos.x,
        y: puY,
        z: worldPos.z,
      });
      chunk.entities.add(powerUp.id);
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

    // Remove all entities that belong to this chunk
    for (const entityId of chunk.entities) {
      this.entityManager.remove(entityId);
    }
    chunk.entities.clear();

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

  // Get edge height constraints from adjacent tiles
  private _getEdgeConstraintsFromAdjacentTiles(coordinate: TileCoordinate) {
    const constraints = {
      north: null as number[] | null, // Heights along north edge (z = -100)
      south: null as number[] | null, // Heights along south edge (z = +100)
      east: null as number[] | null, // Heights along east edge (x = +100)
      west: null as number[] | null, // Heights along west edge (x = -100)
    };

    // Check north neighbor (z - 1)
    const northTileId = this.tileCoordinateToId({
      x: coordinate.x,
      z: coordinate.z - 1,
      size: coordinate.size,
    });
    const northTile = this.streamingState.loadedChunks.get(northTileId);
    if (northTile) {
      constraints.north = this.extractSouthEdgeHeights(northTile);
    } else {
    }

    // Check south neighbor (z + 1)
    const southTileId = this.tileCoordinateToId({
      x: coordinate.x,
      z: coordinate.z + 1,
      size: coordinate.size,
    });
    const southTile = this.streamingState.loadedChunks.get(southTileId);
    if (southTile) {
      constraints.south = this.extractNorthEdgeHeights(southTile);
    } else {
    }

    // Check east neighbor (x + 1)
    const eastTileId = this.tileCoordinateToId({
      x: coordinate.x + 1,
      z: coordinate.z,
      size: coordinate.size,
    });
    const eastTile = this.streamingState.loadedChunks.get(eastTileId);
    if (eastTile) {
      constraints.east = this.extractWestEdgeHeights(eastTile);
    } else {
    }

    // Check west neighbor (x - 1)
    const westTileId = this.tileCoordinateToId({
      x: coordinate.x - 1,
      z: coordinate.z,
      size: coordinate.size,
    });
    const westTile = this.streamingState.loadedChunks.get(westTileId);
    if (westTile) {
      constraints.west = this.extractEastEdgeHeights(westTile);
    } else {
    }

    const _constraintCount = [
      constraints.north?.length || 0,
      constraints.south?.length || 0,
      constraints.east?.length || 0,
      constraints.west?.length || 0,
    ];

    return constraints;
  }

  // Extract edge heights using stored height grid
  private extractNorthEdgeHeights(chunk: WorldChunk): number[] {
    if (!chunk.heightGrid) return [];

    const heights: number[] = [];
    const gridSize = chunk.heightGrid.length;

    // North edge is at gridZ = 0 (z = -100)
    for (let gridX = 0; gridX < gridSize; gridX++) {
      heights.push(chunk.heightGrid[gridX][0]);
    }

    return heights;
  }

  private extractSouthEdgeHeights(chunk: WorldChunk): number[] {
    if (!chunk.heightGrid) return [];

    const heights: number[] = [];
    const gridSize = chunk.heightGrid.length;

    // South edge is at gridZ = gridSize-1 (z = +100)
    for (let gridX = 0; gridX < gridSize; gridX++) {
      heights.push(chunk.heightGrid[gridX][gridSize - 1]);
    }

    return heights;
  }

  private extractEastEdgeHeights(chunk: WorldChunk): number[] {
    if (!chunk.heightGrid) return [];

    const heights: number[] = [];
    const gridSize = chunk.heightGrid.length;

    // East edge is at gridX = gridSize-1 (x = +100)
    for (let gridZ = 0; gridZ < gridSize; gridZ++) {
      heights.push(chunk.heightGrid[gridSize - 1][gridZ]);
    }

    return heights;
  }

  private extractWestEdgeHeights(chunk: WorldChunk): number[] {
    if (!chunk.heightGrid) return [];

    const heights: number[] = [];
    const gridSize = chunk.heightGrid.length;

    // West edge is at gridX = 0 (x = -100)
    for (let gridZ = 0; gridZ < gridSize; gridZ++) {
      heights.push(chunk.heightGrid[0][gridZ]);
    }

    return heights;
  }

  // Check if vertex has a constraint height from adjacent tiles
  private _getConstraintHeight(localX: number, localY: number, constraints: any): number | null {
    const tolerance = 1.0; // Increased tolerance - vertices might not be exactly at -100/+100

    // Check if on north edge (Y = +100 before rotation, becomes Z = +100 after rotation) and we have north constraint
    if (Math.abs(localY - 100) < tolerance && constraints.north) {
      const index = Math.round((localX + 100) / (200 / (constraints.north.length - 1)));
      const height = constraints.north[Math.min(index, constraints.north.length - 1)];
      return height;
    }

    // Check if on south edge (Y = -100 before rotation, becomes Z = -100 after rotation) and we have south constraint
    if (Math.abs(localY + 100) < tolerance && constraints.south) {
      const index = Math.round((localX + 100) / (200 / (constraints.south.length - 1)));
      const height = constraints.south[Math.min(index, constraints.south.length - 1)];
      return height;
    }

    // Check if on east edge (x = +100) and we have east constraint
    if (Math.abs(localX - 100) < tolerance && constraints.east) {
      const index = Math.round((localY + 100) / (200 / (constraints.east.length - 1)));
      const height = constraints.east[Math.min(index, constraints.east.length - 1)];
      return height;
    }

    // Check if on west edge (x = -100) and we have west constraint
    if (Math.abs(localX + 100) < tolerance && constraints.west) {
      const index = Math.round((localY + 100) / (200 / (constraints.west.length - 1)));
      const height = constraints.west[Math.min(index, constraints.west.length - 1)];
      return height;
    }

    return null; // No constraint
  }

  // Global height function for interior vertices
  private getGlobalHeightAt(worldX: number, worldZ: number): number {
    // This single function ensures ALL tile edges match perfectly
    let height = 0;
    let amplitude = 3; // Base amplitude
    let frequency = 0.005; // Base frequency

    // Generate smooth terrain with 2 octaves
    for (let octave = 0; octave < 2; octave++) {
      height += amplitude * Math.sin(worldX * frequency) * Math.cos(worldZ * frequency);
      amplitude *= 0.6; // Gentler amplitude reduction
      frequency *= 1.8; // Gentler frequency increase
    }

    // Add deterministic variation - same world position always gives same result
    const seedX = Math.sin(worldX * 0.01) * 10000;
    const seedZ = Math.sin(worldZ * 0.01) * 10000;
    const pseudoRandom = (seedX - Math.floor(seedX) + seedZ - Math.floor(seedZ)) * 0.5 - 0.5;
    height += pseudoRandom * 0.5;

    return height;
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
    let amplitude = 10.0;
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

    // Add large-scale features
    height += this.continuousNoise(worldX * 0.0015, worldZ * 0.0015) * 25;

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
}
