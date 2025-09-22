## Level Concept Overview
**Level Structure:** Time- and distance-based progression in an open-world, procedurally generated environment.  
**Core Objective:** Navigate infinite, dynamic alien landscapes, engage enemies, defeat bosses, and reach an exit point to complete the level.  
**Gameplay Style:** Fast-paced, 3D rail-shooter mechanics with full 360-degree flight freedom, blending classic *Space Harrier* elements with open-world exploration.  
**Setting:** Alien planets with varied biomes (e.g., crystalline plains, volcanic canyons, neon jungles), generated on-the-fly for unique playthroughs.

Each level in *Space Harrier: Infinite Horizons* is a thrilling journey through a procedurally generated world, where players start on foot, take flight with a rocket pack, battle enemies, and face escalating boss encounters. The level ends with a climactic showdown and a landing to exit, preserving the arcade spirit while embracing open-world freedom.

## Level Progression
### Starting Point
- **Environment:** Player spawns on the ground in a procedurally generated biome (e.g., glowing grasslands or rocky mesas). The terrain includes classic *Space Harrier* obstacles like stone pillars and floating trees, scaled for 3D navigation.
- **Mechanics:** 
  - Begin running forward automatically (classic arcade-style momentum).
  - Press a key/touch input to activate the rocket pack, transitioning to full 3D flight with 360-degree movement (up, down, left, right, roll).
  - Players can stay grounded for strategic cover or take off to explore freely in any direction within the open-world boundaries.
- **Objective:** Build momentum, avoid initial obstacles, and prepare for enemy encounters.

### Main Journey
- **Duration/Distance:** Levels are structured around a hybrid time- and distance-based progression, tracked internally (e.g., ~5-7 minutes or ~10,000 in-game units for the main phase, adjustable for difficulty).
- **Enemies:** 
  - Waves of enemies (inspired by original *Space Harrier* designs, e.g., floating drones, biomechanical creatures) spawn procedurally and zoom past the player from multiple angles.
  - Players can shoot (using customizable weapons like lasers or missiles) or evade by dodging in 3D space.
  - Enemy patterns vary: some charge directly, others flank or orbit, with AI adapting to player speed and position.
  - Obstacles (pillars, trees, floating rocks) persist, requiring precise navigation at high speeds.
- **Exploration Elements:** Scattered power-ups (e.g., weapon upgrades, shield boosts) and lore artifacts encourage exploration off the "main path." Players can veer to discover hidden areas, but a subtle guiding wind (visual/audio cues) nudges toward progression.
- **Dynamic Events:** Procedural triggers spawn events like meteor showers, enemy ambushes, or environmental shifts (e.g., a forest igniting), keeping each run unpredictable.

### Mini-Boss Encounter
- **Trigger:** After ~5 minutes or ~10,000 units of travel, a mini-boss spawns, signaled by a dramatic environmental shift (e.g., sky darkening, ground tremors).
- **Mechanics:** 
  - Mini-boss follows the "rule of three" design: three distinct phases or "breaks" to defeat (e.g., destroy three weak points, deplete three health bars, or survive three attack patterns).
  - Example: A giant robotic wyrm that burrows through terrain, exposing its core in three stages—each break increases attack speed and complexity.
  - Players can circle the boss in 3D space, dodging projectiles and targeting vulnerabilities.
- **Outcome:** Defeating the mini-boss grants a temporary power-up (e.g., speed boost, enhanced weapon) and opens the next phase of the level.

### Continued Journey
- **Duration/Distance:** Post-mini-boss, players continue for another ~5-7 minutes or ~15,000 units, facing increased enemy density and environmental hazards.
- **Gameplay:** Similar to the main journey but with heightened intensity—more frequent enemy waves, denser obstacle fields, and occasional "elite" enemies with mini-boss-like traits.
- **Exploration:** Additional secrets (e.g., rare upgrades, hidden biomes) reward players who stray from the critical path, balanced to maintain pacing.

### Final Boss Encounter
- **Trigger:** After ~10-14 minutes total or ~25,000 units, a major boss appears, heralded by a cinematic shift (e.g., a rift opens, spawning a colossal enemy).
- **Mechanics:** 
  - The final boss is larger, with greater health and shields, following the "rule of three" breaks (e.g., three phases: shield destruction, armor breach, core exposure).
  - Example: A towering, multi-limbed mech that warps terrain, firing homing missiles, laser grids, and summoning minions. Each break shifts its attack style and arena layout.
  - Players must leverage full 3D mobility to dodge complex patterns and target weak points, with optional environmental interactions (e.g., collapsing pillars onto the boss).
- **Challenge:** Higher difficulty than the mini-boss, requiring mastery of flight and combat skills. Visual and audio cues (e.g., glowing weak points, distinct sound effects) guide players.

### Level Exit
- **Completion:** Defeating the final boss spawns a landing zone (e.g., a glowing portal or platform) where players can descend and exit the level.
- **Mechanics:** Landing is a deliberate action (hold input to descend), accompanied by a cinematic slowdown and classic *Space Harrier* sound effects (e.g., triumphant chime).
- **Rewards:** Players earn points, upgrades, or unlockables (e.g., new weapons, cosmetic skins) based on performance (enemies defeated, secrets found, time taken). Data is saved locally via IndexedDB for offline progression.
- **Transition:** Players can choose to replay the level with a new seed for a different experience or advance to the next level with a fresh biome and challenges.

## Design Notes
- **Procedural Integration:** Levels are generated client-side using AI-driven algorithms (via TensorFlow.js) and procedural techniques (Perlin noise, Voronoi). Each run uses a unique seed, ensuring no two levels are identical, with biomes, enemy placements, and events varying dynamically.
- **Balancing Freedom and Guidance:** While players can fly anywhere, subtle cues (e.g., glowing paths, directional audio) guide toward bosses to prevent aimless wandering, preserving arcade pacing in an open world.
- **Classic Elements:** Retains *Space Harrier* staples—pillars, trees, high-speed movement, iconic sounds (jetpack whoosh, laser zaps)—reimagined in 3D with cell-shaded visuals and modern effects.
- **Scalability:** Level duration/distance and difficulty scale with player progression (e.g., shorter levels for casual mode, longer for hardcore). Offline caching ensures all assets load instantly.

This level design delivers a thrilling, replayable experience that blends *Space Harrier*’s arcade roots with infinite, open-world chaos, culminating in epic boss battles and satisfying exits.