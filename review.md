# Entity System Review & Action Items

## Phase 1: Immediate Code Cleanup

These tasks are low-risk, high-impact improvements that can be done incrementally.

### 1.1 Remove Redundant Code ✅

- [x] Move AudioManager to BaseEntity
  - Added protected static audioManager property
  - Added setAudioManager method to base class
  - Added protected getAudioManager accessor
  - Ready to remove from Player, Enemy, and PowerUp

- [ ] Consolidate Visual Effects Code
  - Added protected hasOutlineEffect property
  - Added createOutlineEffect and removeOutlineEffect methods
  - Ready to remove duplicate code from Player/Enemy

- [ ] Unify Collision Handling
  - Added updateCollisionBoundsFromMesh to BaseEntity
  - Added handleCollision and abstract onCollisionResponse
  - Ready to update derived classes to use new methods

Implementation Notes:

- Created new interfaces.ts file for type definitions
- Added proper type safety for AudioManager and OutlinePass
- Removed duplicate interface definitions
- Added abstract methods for specific collision behavior
- Updated Enemy.ts to use base class functionality:
  - Removed duplicate AudioManager code
  - Using base class outline effects
  - Implemented abstract onCollisionResponse
  - Fixed type safety issues
- Ready to update Player.ts and PowerUp.ts

### 1.2 Standardize Naming Conventions

- [ ] Method Names
  - [ ] Audit and standardize 'on' prefix usage (events only)
  - [ ] Fix inconsistent method names (onTakeDamage vs takeDamage)
  - [ ] Document naming convention in comments

- [ ] Property Names
  - [ ] Convert any snake_case to camelCase
  - [ ] Add 'is' prefix to boolean properties
  - [ ] Standardize type suffix usage

## Phase 2: Architectural Improvements

These tasks require more planning but provide better maintainability.

### 2.1 Component System Implementation

- [ ] Create Base Components

  ```typescript
  -HealthComponent - MovementComponent - CollisionComponent - AnimationComponent;
  ```

- [ ] Extract Common Logic
  - [ ] Move animation code to AnimationComponent
  - [ ] Move health/damage code to HealthComponent
  - [ ] Move movement code to MovementComponent

- [ ] Update Entity Classes
  - [ ] Modify BaseEntity to use component system
  - [ ] Update derived classes to use components
  - [ ] Add component registration system

### 2.2 Resource Management

- [ ] Create Resource Managers

  ```typescript
  -ModelManager(loading / caching) - MaterialManager - AudioManager - EffectsManager;
  ```

- [ ] Implement Service Locator
  - [ ] Create service registry
  - [ ] Add type-safe service access
  - [ ] Convert static references to service locator

### 2.3 State Management

- [ ] Implement State Pattern

  ```typescript
  - EntityState (Idle, Active, Attacking, etc.)
  - AnimationState
  - PowerUpState
  ```

- [ ] Create Event System
  - [ ] Define event types and handlers
  - [ ] Implement event bus
  - [ ] Convert direct callbacks to events

## Phase 3: Long-term Improvements

These are larger changes that should be planned carefully.

### 3.1 Testing Infrastructure

- [ ] Set Up Test Framework
  - [ ] Add Jest/Vitest configuration
  - [ ] Create test utilities
  - [ ] Add mock implementations

- [ ] Add Unit Tests
  - [ ] BaseEntity and components
  - [ ] Resource managers
  - [ ] State management
  - [ ] Event system

### 3.2 Performance Optimization

- [ ] Implement Object Pooling
  - [ ] Create object pool for frequently created entities
  - [ ] Add pool manager
  - [ ] Convert entity creation to use pools

- [ ] Optimize Collision Detection
  - [ ] Add spatial partitioning
  - [ ] Implement broad-phase collision detection
  - [ ] Add collision layers/masks

### 3.3 Configuration System

- [ ] Create Config System

  ```typescript
  -GameConfig - EntityConfig - AudioConfig;
  ```

- [ ] Extract Constants
  - [ ] Move magic numbers to config
  - [ ] Add type-safe config access
  - [ ] Add config validation

## Notes

- Each task should be completed in a separate branch
- Add tests for new functionality
- Update documentation as changes are made
- Consider backwards compatibility
- Validate changes in development environment before merging

## Priority Order

1. Phase 1.1 - Remove immediate code duplication
2. Phase 1.2 - Clean up naming conventions
3. Phase 2.1 - Implement component system
4. Phase 2.2 - Add resource management
5. Phase 2.3 - Improve state management
6. Phase 3 - Long-term improvements as needed
