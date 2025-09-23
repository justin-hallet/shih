/**
 * BiomeManager - Manages different biome types and their characteristics
 */

import * as THREE from 'three';
import {
  BiomeType,
  BiomeConfig,
  TerrainType,
  MaterialType,
  WeatherType,
  BiomeSpawnRules,
  MaterialProperties,
} from './types';
import { EntityType } from '../types';

export class BiomeManager {
  private biomes: Map<BiomeType, BiomeConfig>;

  constructor() {
    this.biomes = new Map();
    this.initializeBiomes();
  }

  private initializeBiomes(): void {
    // Desert Biome
    this.biomes.set(BiomeType.DESERT, {
      type: BiomeType.DESERT,
      name: 'Scorching Desert',
      description: 'Vast sandy wastelands with ancient ruins and sand worms',

      terrainType: TerrainType.HILLS,
      heightNoise: {
        seed: 12345,
        octaves: 4,
        frequency: 0.01,
        amplitude: 0.3,
        persistence: 0.5,
        lacunarity: 2.0,
      },
      materialType: MaterialType.SAND,

      skyColor: new THREE.Color(0xffd89b),
      fogColor: new THREE.Color(0xffb347),
      fogDensity: 0.001,
      ambientLight: new THREE.Color(0xffffcc),

      weatherChances: new Map([
        [WeatherType.CLEAR, 0.6],
        [WeatherType.SANDSTORM, 0.3],
        [WeatherType.CLOUDY, 0.1],
      ]),

      spawnRules: this.createDesertSpawnRules(),
      materialProperties: this.createSandMaterial(),
    });

    // Forest Biome
    this.biomes.set(BiomeType.FOREST, {
      type: BiomeType.FOREST,
      name: 'Mystic Forest',
      description: 'Dense alien forests with bioluminescent plants and tree spirits',

      terrainType: TerrainType.VALLEYS,
      heightNoise: {
        seed: 54321,
        octaves: 6,
        frequency: 0.008,
        amplitude: 0.4,
        persistence: 0.6,
        lacunarity: 1.8,
      },
      materialType: MaterialType.ALIEN_MOSS,

      skyColor: new THREE.Color(0x87ceeb),
      fogColor: new THREE.Color(0x9fdf9f),
      fogDensity: 0.003,
      ambientLight: new THREE.Color(0xccffcc),

      weatherChances: new Map([
        [WeatherType.CLOUDY, 0.4],
        [WeatherType.RAIN, 0.3],
        [WeatherType.CLEAR, 0.2],
        [WeatherType.FOG, 0.1],
      ]),

      spawnRules: this.createForestSpawnRules(),
      materialProperties: this.createMossMaterial(),
    });

    // Crystal Caves
    this.biomes.set(BiomeType.CRYSTAL_CAVES, {
      type: BiomeType.CRYSTAL_CAVES,
      name: 'Crystalline Caverns',
      description: 'Underground crystal formations with energy nodes and cave dragons',

      terrainType: TerrainType.CANYONS,
      heightNoise: {
        seed: 98765,
        octaves: 8,
        frequency: 0.015,
        amplitude: 0.6,
        persistence: 0.4,
        lacunarity: 2.5,
      },
      materialType: MaterialType.CRYSTAL,

      skyColor: new THREE.Color(0x1a1a2e),
      fogColor: new THREE.Color(0x16213e),
      fogDensity: 0.005,
      ambientLight: new THREE.Color(0x8855ff),

      weatherChances: new Map([
        [WeatherType.CLEAR, 0.8],
        [WeatherType.PLASMA_STORM, 0.2],
      ]),

      spawnRules: this.createCrystalSpawnRules(),
      materialProperties: this.createCrystalMaterial(),
    });

    // Cyberpunk City
    this.biomes.set(BiomeType.CYBERPUNK_CITY, {
      type: BiomeType.CYBERPUNK_CITY,
      name: 'Neo Tokyo',
      description: 'Futuristic cityscape with neon lights and flying vehicles',

      terrainType: TerrainType.FLAT,
      heightNoise: {
        seed: 11111,
        octaves: 3,
        frequency: 0.02,
        amplitude: 0.1,
        persistence: 0.3,
        lacunarity: 2.0,
      },
      materialType: MaterialType.CONCRETE,

      skyColor: new THREE.Color(0x0f0f23),
      fogColor: new THREE.Color(0xff00ff),
      fogDensity: 0.002,
      ambientLight: new THREE.Color(0xff88ff),

      weatherChances: new Map([
        [WeatherType.CLOUDY, 0.5],
        [WeatherType.ACID_RAIN, 0.3],
        [WeatherType.CLEAR, 0.2],
      ]),

      spawnRules: this.createCitySpawnRules(),
      materialProperties: this.createConcreteMaterial(),
    });

    // Ice Plains
    this.biomes.set(BiomeType.ICE_PLAINS, {
      type: BiomeType.ICE_PLAINS,
      name: 'Frozen Wasteland',
      description: 'Endless icy plains with ice beasts and aurora phenomena',

      terrainType: TerrainType.PLATEAUS,
      heightNoise: {
        seed: 22222,
        octaves: 5,
        frequency: 0.005,
        amplitude: 0.2,
        persistence: 0.5,
        lacunarity: 2.0,
      },
      materialType: MaterialType.ICE,

      skyColor: new THREE.Color(0xcce7ff),
      fogColor: new THREE.Color(0xe6f3ff),
      fogDensity: 0.001,
      ambientLight: new THREE.Color(0xccddff),

      weatherChances: new Map([
        [WeatherType.CLEAR, 0.4],
        [WeatherType.BLIZZARD, 0.4],
        [WeatherType.CLOUDY, 0.2],
      ]),

      spawnRules: this.createIceSpawnRules(),
      materialProperties: this.createIceMaterial(),
    });

    // Lava Fields Biome
    this.biomes.set(BiomeType.LAVA_FIELDS, {
      type: BiomeType.LAVA_FIELDS,
      name: 'Molten Lava Fields',
      description: 'Scorching volcanic landscape with lava flows and fire demons',

      terrainType: TerrainType.MOUNTAINS,
      heightNoise: {
        seed: 98765,
        octaves: 5,
        frequency: 0.012,
        amplitude: 0.6,
        persistence: 0.7,
        lacunarity: 2.2,
      },
      materialType: MaterialType.ROCK,

      skyColor: new THREE.Color(0xff4500),
      fogColor: new THREE.Color(0x8b0000),
      fogDensity: 0.003,
      ambientLight: new THREE.Color(0xff6600),

      weatherChances: new Map([
        [WeatherType.CLEAR, 0.4],
        [WeatherType.PLASMA_STORM, 0.4],
        [WeatherType.ACID_RAIN, 0.2],
      ]),

      spawnRules: this.createLavaFieldsSpawnRules(),
      materialProperties: this.createLavaMaterial(),
    });

    // Space Station Biome
    this.biomes.set(BiomeType.SPACE_STATION, {
      type: BiomeType.SPACE_STATION,
      name: 'Derelict Space Station',
      description: 'Abandoned orbital facility with zero-g sectors and alien parasites',

      terrainType: TerrainType.FLAT,
      heightNoise: {
        seed: 11111,
        octaves: 2,
        frequency: 0.005,
        amplitude: 0.1,
        persistence: 0.3,
        lacunarity: 2.0,
      },
      materialType: MaterialType.CONCRETE,

      skyColor: new THREE.Color(0x000020),
      fogColor: new THREE.Color(0x111144),
      fogDensity: 0.0005,
      ambientLight: new THREE.Color(0x4444ff),

      weatherChances: new Map([
        [WeatherType.CLEAR, 0.8],
        [WeatherType.FOG, 0.2],
      ]),

      spawnRules: this.createSpaceStationSpawnRules(),
      materialProperties: this.createMetalMaterial(),
    });

    // Alien Jungle Biome
    this.biomes.set(BiomeType.ALIEN_JUNGLE, {
      type: BiomeType.ALIEN_JUNGLE,
      name: 'Exotic Alien Jungle',
      description: 'Dense alien vegetation with predatory plants and strange creatures',

      terrainType: TerrainType.VALLEYS,
      heightNoise: {
        seed: 33333,
        octaves: 7,
        frequency: 0.007,
        amplitude: 0.5,
        persistence: 0.6,
        lacunarity: 1.9,
      },
      materialType: MaterialType.ALIEN_MOSS,

      skyColor: new THREE.Color(0x228b22),
      fogColor: new THREE.Color(0x006400),
      fogDensity: 0.002,
      ambientLight: new THREE.Color(0x90ee90),

      weatherChances: new Map([
        [WeatherType.RAIN, 0.5],
        [WeatherType.FOG, 0.3],
        [WeatherType.CLEAR, 0.2],
      ]),

      spawnRules: this.createAlienJungleSpawnRules(),
      materialProperties: this.createAlienMossMaterial(),
    });

    // Mountains Biome
    this.biomes.set(BiomeType.MOUNTAINS, {
      type: BiomeType.MOUNTAINS,
      name: 'Towering Peaks',
      description: 'Massive mountain ranges with ancient temples and sky dragons',

      terrainType: TerrainType.MOUNTAINS,
      heightNoise: {
        seed: 77777,
        octaves: 8,
        frequency: 0.006,
        amplitude: 0.8,
        persistence: 0.8,
        lacunarity: 2.5,
      },
      materialType: MaterialType.ROCK,

      skyColor: new THREE.Color(0x87ceeb),
      fogColor: new THREE.Color(0xb0c4de),
      fogDensity: 0.0015,
      ambientLight: new THREE.Color(0xe6e6fa),

      weatherChances: new Map([
        [WeatherType.CLEAR, 0.5],
        [WeatherType.CLOUDY, 0.3],
        [WeatherType.BLIZZARD, 0.2],
      ]),

      spawnRules: this.createMountainsSpawnRules(),
      materialProperties: this.createRockMaterial(),
    });
  }

  private createDesertSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 15,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.7],
        [EntityType.ENEMY, 0.6],
        [EntityType.POWERUP, 0.1],
      ]),
      densityMultiplier: 0.8,

      obstacleRules: [
        {
          type: 'rock',
          probability: 0.5,
          minDistance: 10,
          heightRange: { min: 0, max: 50 },
          groupSize: { min: 1, max: 3 },
        },
        {
          type: 'pillar',
          probability: 0.3,
          minDistance: 20,
          heightRange: { min: 10, max: 100 },
          groupSize: { min: 1, max: 1 },
        },
      ],

      enemyRules: [
        {
          type: 'grunt',
          probability: 0.6,
          maxPerTile: 8,
          difficultyScaling: true,
          patrolRoutes: false,
        },
        {
          type: 'tank',
          probability: 0.2,
          maxPerTile: 2,
          difficultyScaling: true,
          patrolRoutes: true,
        },
      ],

      powerUpRules: [
        {
          type: 'ammo',
          probability: 0.7,
          respawnTime: 30,
          hiddenChance: 0.2,
        },
        {
          type: 'shield',
          probability: 0.3,
          respawnTime: 60,
          hiddenChance: 0.4,
        },
      ],
    };
  }

  private createForestSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 25,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.9],
        [EntityType.ENEMY, 0.5],
        [EntityType.POWERUP, 0.15],
      ]),
      densityMultiplier: 1.2,

      obstacleRules: [
        {
          type: 'tree',
          probability: 0.8,
          minDistance: 5,
          heightRange: { min: 0, max: 30 },
          groupSize: { min: 3, max: 8 },
        },
        {
          type: 'crystal',
          probability: 0.2,
          minDistance: 15,
          heightRange: { min: 5, max: 25 },
          groupSize: { min: 1, max: 2 },
        },
      ],

      enemyRules: [
        {
          type: 'flyer',
          probability: 0.5,
          maxPerTile: 6,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'soldier',
          probability: 0.4,
          maxPerTile: 4,
          difficultyScaling: true,
          patrolRoutes: false,
        },
      ],

      powerUpRules: [
        {
          type: 'life',
          probability: 0.1,
          respawnTime: 120,
          hiddenChance: 0.8,
        },
        {
          type: 'weapon_upgrade',
          probability: 0.2,
          respawnTime: 90,
          hiddenChance: 0.6,
        },
      ],
    };
  }

  private createCrystalSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 20,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.8],
        [EntityType.ENEMY, 0.7],
        [EntityType.POWERUP, 0.2],
      ]),
      densityMultiplier: 1.0,

      obstacleRules: [
        {
          type: 'crystal',
          probability: 0.9,
          minDistance: 8,
          heightRange: { min: 0, max: 80 },
          groupSize: { min: 2, max: 6 },
        },
      ],

      enemyRules: [
        {
          type: 'dragon',
          probability: 0.3,
          maxPerTile: 2,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'flyer',
          probability: 0.6,
          maxPerTile: 8,
          difficultyScaling: true,
          patrolRoutes: false,
        },
      ],

      powerUpRules: [
        {
          type: 'shield',
          probability: 0.6,
          respawnTime: 45,
          hiddenChance: 0.3,
        },
        {
          type: 'weapon_upgrade',
          probability: 0.4,
          respawnTime: 75,
          hiddenChance: 0.5,
        },
      ],
    };
  }

  private createCitySpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 30,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.6],
        [EntityType.ENEMY, 0.8],
        [EntityType.POWERUP, 0.12],
      ]),
      densityMultiplier: 1.1,

      obstacleRules: [
        {
          type: 'building',
          probability: 0.4,
          minDistance: 25,
          heightRange: { min: 0, max: 20 },
          groupSize: { min: 1, max: 3 },
        },
        {
          type: 'vehicle',
          probability: 0.6,
          minDistance: 12,
          heightRange: { min: 0, max: 5 },
          groupSize: { min: 1, max: 2 },
        },
      ],

      enemyRules: [
        {
          type: 'soldier',
          probability: 0.7,
          maxPerTile: 12,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'tank',
          probability: 0.4,
          maxPerTile: 3,
          difficultyScaling: true,
          patrolRoutes: true,
        },
      ],

      powerUpRules: [
        // Common → Rare: Ammo, Shield, Weapon, Speed, Life
        { type: 'ammo', probability: 0.75, respawnTime: 20, hiddenChance: 0.1 },
        { type: 'shield', probability: 0.45, respawnTime: 40, hiddenChance: 0.2 },
        { type: 'weapon_upgrade', probability: 0.25, respawnTime: 55, hiddenChance: 0.25 },
        { type: 'speed', probability: 0.2, respawnTime: 50, hiddenChance: 0.2 },
        { type: 'life', probability: 0.05, respawnTime: 150, hiddenChance: 0.7 },
      ],
    };
  }

  private createIceSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 12,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.5],
        [EntityType.ENEMY, 0.4],
        [EntityType.POWERUP, 0.08],
      ]),
      densityMultiplier: 0.7,

      obstacleRules: [
        {
          type: 'rock',
          probability: 0.6,
          minDistance: 15,
          heightRange: { min: 0, max: 40 },
          groupSize: { min: 1, max: 2 },
        },
        {
          type: 'crystal',
          probability: 0.4,
          minDistance: 20,
          heightRange: { min: 5, max: 30 },
          groupSize: { min: 1, max: 3 },
        },
      ],

      enemyRules: [
        {
          type: 'grunt',
          probability: 0.5,
          maxPerTile: 4,
          difficultyScaling: true,
          patrolRoutes: false,
        },
        {
          type: 'boss',
          probability: 0.05,
          maxPerTile: 1,
          difficultyScaling: true,
          patrolRoutes: false,
        },
      ],

      powerUpRules: [
        {
          type: 'life',
          probability: 0.2,
          respawnTime: 180,
          hiddenChance: 0.9,
        },
      ],
    };
  }

  private createLavaFieldsSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 18,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.6],
        [EntityType.ENEMY, 0.8],
        [EntityType.POWERUP, 0.15],
      ]),
      densityMultiplier: 1.2,

      obstacleRules: [
        {
          type: 'rock',
          probability: 0.7,
          minDistance: 8,
          heightRange: { min: 0, max: 100 },
          groupSize: { min: 1, max: 4 },
        },
      ],

      enemyRules: [
        {
          type: 'dragon',
          probability: 0.3,
          maxPerTile: 2,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'grunt',
          probability: 0.6,
          maxPerTile: 5,
          difficultyScaling: true,
          patrolRoutes: false,
        },
      ],

      powerUpRules: [
        {
          type: 'weapon_upgrade',
          probability: 0.3,
          respawnTime: 120,
          hiddenChance: 0.7,
        },
      ],
    };
  }

  private createSpaceStationSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 12,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.5],
        [EntityType.ENEMY, 0.7],
        [EntityType.POWERUP, 0.2],
      ]),
      densityMultiplier: 0.9,

      obstacleRules: [
        {
          type: 'building',
          probability: 0.8,
          minDistance: 15,
          heightRange: { min: 0, max: 20 },
          groupSize: { min: 1, max: 2 },
        },
      ],

      enemyRules: [
        {
          type: 'soldier',
          probability: 0.7,
          maxPerTile: 4,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'tank',
          probability: 0.2,
          maxPerTile: 1,
          difficultyScaling: true,
          patrolRoutes: false,
        },
      ],

      powerUpRules: [
        {
          type: 'shield',
          probability: 0.4,
          respawnTime: 90,
          hiddenChance: 0.5,
        },
      ],
    };
  }

  private createAlienJungleSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 20,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.9],
        [EntityType.ENEMY, 0.6],
        [EntityType.POWERUP, 0.25],
      ]),
      densityMultiplier: 1.5,

      obstacleRules: [
        {
          type: 'tree',
          probability: 0.9,
          minDistance: 5,
          heightRange: { min: 0, max: 60 },
          groupSize: { min: 2, max: 6 },
        },
      ],

      enemyRules: [
        {
          type: 'flyer',
          probability: 0.6,
          maxPerTile: 6,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'grunt',
          probability: 0.4,
          maxPerTile: 3,
          difficultyScaling: true,
          patrolRoutes: false,
        },
      ],

      powerUpRules: [
        {
          type: 'ammo',
          probability: 0.5,
          respawnTime: 60,
          hiddenChance: 0.8,
        },
        {
          type: 'speed',
          probability: 0.3,
          respawnTime: 150,
          hiddenChance: 0.6,
        },
      ],
    };
  }

  private createMountainsSpawnRules(): BiomeSpawnRules {
    return {
      maxEntitiesPerTile: 14,
      spawnProbabilities: new Map([
        [EntityType.OBSTACLE, 0.8],
        [EntityType.ENEMY, 0.5],
        [EntityType.POWERUP, 0.1],
      ]),
      densityMultiplier: 1.0,

      obstacleRules: [
        {
          type: 'rock',
          probability: 0.6,
          minDistance: 12,
          heightRange: { min: 20, max: 120 },
          groupSize: { min: 1, max: 3 },
        },
        {
          type: 'pillar',
          probability: 0.4,
          minDistance: 20,
          heightRange: { min: 10, max: 80 },
          groupSize: { min: 1, max: 2 },
        },
      ],

      enemyRules: [
        {
          type: 'dragon',
          probability: 0.4,
          maxPerTile: 2,
          difficultyScaling: true,
          patrolRoutes: true,
        },
        {
          type: 'flyer',
          probability: 0.5,
          maxPerTile: 4,
          difficultyScaling: true,
          patrolRoutes: true,
        },
      ],

      powerUpRules: [
        {
          type: 'life',
          probability: 0.15,
          respawnTime: 300,
          hiddenChance: 0.9,
        },
      ],
    };
  }

  // Material creation methods
  private createSandMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0xffd89b),
      specularColor: new THREE.Color(0xffffff),
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0x000000),
      normalScale: 0.5,
      textureRepeat: { x: 16, y: 16 },
    };
  }

  private createMossMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0x6a9c69), // Brighter forest green
      specularColor: new THREE.Color(0x88ffaa),
      roughness: 0.8,
      metalness: 0.0,
      emissive: new THREE.Color(0x002200), // Slightly brighter moss glow
      normalScale: 0.8,
      textureRepeat: { x: 8, y: 8 },
    };
  }

  private createCrystalMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0x8855ff),
      specularColor: new THREE.Color(0xffffff),
      roughness: 0.1,
      metalness: 0.0,
      emissive: new THREE.Color(0x2211aa),
      normalScale: 1.2,
      textureRepeat: { x: 4, y: 4 },
    };
  }

  private createConcreteMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0x999999), // Lighter concrete color
      specularColor: new THREE.Color(0xbbbbbb),
      roughness: 0.9,
      metalness: 0.1,
      emissive: new THREE.Color(0x220044), // Slight purple glow for cyberpunk feel
      normalScale: 0.6,
      textureRepeat: { x: 12, y: 12 },
    };
  }

  private createIceMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0xcce7ff),
      specularColor: new THREE.Color(0xffffff),
      roughness: 0.2,
      metalness: 0.0,
      emissive: new THREE.Color(0x001122),
      normalScale: 0.4,
      textureRepeat: { x: 6, y: 6 },
    };
  }

  private createLavaMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0xff4500),
      specularColor: new THREE.Color(0xffa500),
      roughness: 0.7,
      metalness: 0.0,
      emissive: new THREE.Color(0x8b0000),
      normalScale: 1.0,
      textureRepeat: { x: 4, y: 4 },
    };
  }

  private createMetalMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0x708090),
      specularColor: new THREE.Color(0xc0c0c0),
      roughness: 0.3,
      metalness: 0.8,
      emissive: new THREE.Color(0x000044),
      normalScale: 0.5,
      textureRepeat: { x: 8, y: 8 },
    };
  }

  private createAlienMossMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0x32cd32),
      specularColor: new THREE.Color(0x00ff7f),
      roughness: 0.9,
      metalness: 0.0,
      emissive: new THREE.Color(0x003300),
      normalScale: 0.8,
      textureRepeat: { x: 12, y: 12 },
    };
  }

  private createRockMaterial(): MaterialProperties {
    return {
      diffuseColor: new THREE.Color(0x696969),
      specularColor: new THREE.Color(0x808080),
      roughness: 0.95,
      metalness: 0.0,
      emissive: new THREE.Color(0x000000),
      normalScale: 1.0,
      textureRepeat: { x: 6, y: 6 },
    };
  }

  // Public API
  public getBiome(type: BiomeType): BiomeConfig | undefined {
    return this.biomes.get(type);
  }

  public getAllBiomes(): BiomeConfig[] {
    return Array.from(this.biomes.values());
  }

  public getBiomeAt(worldX: number, worldZ: number): BiomeType {
    // Use noise to determine biome based on world position
    // This is a simplified version - real implementation would use proper noise
    const distance = Math.sqrt(worldX * worldX + worldZ * worldZ);
    const angle = Math.atan2(worldZ, worldX);

    // Create biome zones based on distance and angle
    if (distance < 500) {
      return BiomeType.FOREST; // Safe starting area
    } else if (distance < 1000) {
      const sector = Math.floor(((angle + Math.PI) / (Math.PI * 2)) * 4);
      switch (sector) {
        case 0:
          return BiomeType.DESERT;
        case 1:
          return BiomeType.ICE_PLAINS;
        case 2:
          return BiomeType.CRYSTAL_CAVES;
        default:
          return BiomeType.CYBERPUNK_CITY;
      }
    } else {
      // Outer zones - more dangerous biomes
      return Math.random() < 0.5 ? BiomeType.LAVA_FIELDS : BiomeType.SPACE_STATION;
    }
  }

  public blendBiomes(biomeA: BiomeType, biomeB: BiomeType, factor: number): Partial<BiomeConfig> {
    // Blend two biomes together for smooth transitions
    const configA = this.getBiome(biomeA);
    const configB = this.getBiome(biomeB);

    if (!configA || !configB) return {};

    return {
      skyColor: new THREE.Color().lerpColors(configA.skyColor, configB.skyColor, factor),
      fogColor: new THREE.Color().lerpColors(configA.fogColor, configB.fogColor, factor),
      fogDensity: THREE.MathUtils.lerp(configA.fogDensity, configB.fogDensity, factor),
      ambientLight: new THREE.Color().lerpColors(
        configA.ambientLight,
        configB.ambientLight,
        factor,
      ),
    };
  }
}
