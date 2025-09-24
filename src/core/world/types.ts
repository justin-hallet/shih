/**
 * World generation types for procedural open world Space Harrier
 */

import * as THREE from 'three';
import { EntityType } from '../types';

// Biome Types
export enum BiomeType {
  DESERT = 'desert',
  FOREST = 'forest',
  MOUNTAINS = 'mountains',
  CRYSTAL_CAVES = 'crystal_caves',
  LAVA_FIELDS = 'lava_fields',
  ICE_PLAINS = 'ice_plains',
  ALIEN_JUNGLE = 'alien_jungle',
  CYBERPUNK_CITY = 'cyberpunk_city',
  SPACE_STATION = 'space_station',
}

// Terrain Types
export enum TerrainType {
  FLAT = 'flat',
  HILLS = 'hills',
  MOUNTAINS = 'mountains',
  VALLEYS = 'valleys',
  CANYONS = 'canyons',
  PLATEAUS = 'plateaus',
}

// Weather Types
export enum WeatherType {
  CLEAR = 'clear',
  CLOUDY = 'cloudy',
  RAIN = 'rain',
  STORM = 'storm',
  FOG = 'fog',
  SANDSTORM = 'sandstorm',
  BLIZZARD = 'blizzard',
  ACID_RAIN = 'acid_rain',
  PLASMA_STORM = 'plasma_storm',
}

// Material Types for different surfaces
export enum MaterialType {
  GRASS = 'grass',
  DIRT = 'dirt',
  ROCK = 'rock',
  SAND = 'sand',
  SNOW = 'snow',
  ICE = 'ice',
  LAVA = 'lava',
  METAL = 'metal',
  CRYSTAL = 'crystal',
  WATER = 'water',
  ALIEN_MOSS = 'alien_moss',
  CONCRETE = 'concrete',
}

// Level of Detail settings
export interface LODSettings {
  high: number; // Distance for highest detail
  medium: number; // Distance for medium detail
  low: number; // Distance for low detail
  cull: number; // Distance to completely remove
}

// Tile coordinate system
export interface TileCoordinate {
  x: number;
  z: number;
  size: number; // Size of the tile (e.g., 64, 128, 256 units)
}

// Height map data
export interface HeightMap {
  width: number;
  height: number;
  data: Float32Array; // Height values (0-1 range)
  scale: number; // Vertical scale multiplier
  offset: number; // Base height offset
}

// Noise parameters for procedural generation
export interface NoiseParameters {
  seed: number;
  octaves: number;
  frequency: number;
  amplitude: number;
  persistence: number;
  lacunarity: number;
}

// Biome configuration
export interface BiomeConfig {
  type: BiomeType;
  name: string;
  description: string;

  // Terrain generation
  terrainType: TerrainType;
  heightNoise: NoiseParameters;
  materialType: MaterialType;

  // Environmental settings
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  ambientLight: THREE.Color;

  // Weather probabilities
  weatherChances: Map<WeatherType, number>;

  // Entity spawn rules
  spawnRules: BiomeSpawnRules;

  // Visual settings
  materialProperties: MaterialProperties;
}

// Material visual properties
export interface MaterialProperties {
  diffuseColor: THREE.Color;
  specularColor: THREE.Color;
  roughness: number;
  metalness: number;
  emissive: THREE.Color;
  normalScale: number;
  textureRepeat: { x: number; y: number };
}

// Spawn rules for entities in biomes
export interface BiomeSpawnRules {
  maxEntitiesPerTile: number;
  spawnProbabilities: Map<EntityType, number>;
  densityMultiplier: number; // Overall spawn density

  // Specific rules for different entity types
  obstacleRules: ObstacleSpawnRule[];
  enemyRules: EnemySpawnRule[];
  powerUpRules: PowerUpSpawnRule[];
}

export interface ObstacleSpawnRule {
  type: string; // ObstacleSubType
  probability: number;
  minDistance: number; // Minimum distance between same obstacles
  heightRange: { min: number; max: number }; // Height range where this can spawn
  groupSize: { min: number; max: number }; // How many spawn together
}

export interface EnemySpawnRule {
  type: string; // EnemySubType
  probability: number;
  maxPerTile: number;
  difficultyScaling: boolean; // Whether spawn rate increases with distance
  patrolRoutes: boolean; // Whether enemies have patrol paths
}

export interface PowerUpSpawnRule {
  type: string; // PowerUpSubType
  probability: number;
  respawnTime: number; // How long until it respawns after being collected
  hiddenChance: number; // Chance to be hidden/require discovery
}

// World chunk (collection of tiles)
export interface WorldChunk {
  id: string;
  coordinate: TileCoordinate;
  biome: BiomeType;
  loaded: boolean;
  generated: boolean;

  // Terrain data
  heightMap: HeightMap;
  mesh?: THREE.Mesh;
  heightGrid: number[][];
  lodLevel: number;

  // Generation metadata
  seed: number;
  generationVersion: number;
  lastAccessed: number;
}

// Procedural Generation parameters
export interface ProceduralGenerationSettings {
  // World size
  worldRadius: number; // How far the world extends from origin
  tileSize: number; // Size of each tile in world units

  // Biome distribution
  biomeNoiseParams: NoiseParameters;
  biomeBlendDistance: number; // Distance over which biomes blend

  // LOD settings
  lodSettings: LODSettings;

  // Streaming settings
  preloadDistance: number; // Distance to start loading chunks
  unloadDistance: number; // Distance to unload chunks
  maxLoadedChunks: number;

  // Generation quality
  terrainResolution: number; // Heightmap resolution per tile
  detailDensity: number; // How many detail objects to place

  // Generation variety settings
  varietyLevel: number; // 0-1, how varied vs consistent
  contentDensity: number; // Multiplier for content density

  // Performance settings
  generateAsync: boolean;
  maxGenerationTime: number; // Max time to spend generating per frame (ms)
}

// Streaming system state
export interface StreamingState {
  playerPosition: THREE.Vector3;
  loadedChunks: Map<string, WorldChunk>;
  loadingQueue: TileCoordinate[];
  unloadingQueue: string[]; // Chunk IDs

  // Performance tracking
  frameGenerationTime: number;
  totalChunksGenerated: number;
  totalChunksLoaded: number;
}

// Weather system
export interface WeatherSystem {
  currentWeather: WeatherType;
  intensity: number; // 0-1
  transitionTime: number;
  targetWeather: WeatherType;

  // Visual effects
  particleSystem?: THREE.Points;
  fogSettings: {
    color: THREE.Color;
    density: number;
    near: number;
    far: number;
  };
}

// Procedural content templates
export interface ContentTemplate {
  id: string;
  type: 'structure' | 'formation' | 'encounter';
  biomes: BiomeType[]; // Which biomes this can appear in
  rarity: number; // How rare this template is
  size: { width: number; depth: number; height: number };

  // Template data
  obstacles: Array<{
    type: string;
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
  }>;

  enemies: Array<{
    type: string;
    position: THREE.Vector3;
    aiSettings?: any;
  }>;

  powerUps: Array<{
    type: string;
    position: THREE.Vector3;
    hidden: boolean;
  }>;
}

// Dynamic difficulty adjustment
export interface DifficultyScaling {
  baseDistance: number; // Distance where scaling starts
  enemyHealthMultiplier: number;
  enemyDamageMultiplier: number;
  enemySpeedMultiplier: number;
  spawnRateMultiplier: number;

  // Player skill adaptation
  playerSkillRating: number; // Calculated based on performance
  adaptationRate: number; // How quickly difficulty adjusts
}

// World generation events
export interface WorldEvent {
  id: string;
  type: 'boss_spawn' | 'weather_change' | 'biome_transition' | 'discovery';
  position: THREE.Vector3;
  radius: number; // Area of effect
  duration: number; // How long the event lasts
  data: any; // Event-specific data
}
