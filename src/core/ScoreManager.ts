/**
 * Score Manager - Handles game scoring system
 * - Distance-based scoring: 1 point per unit flown
 * - Enemy kill scoring: 10 * (enemy type multiplier)
 */

import { EnemySubType } from './types';

export interface ScoreEvent {
  type: 'distance' | 'enemy_kill';
  points: number;
  details?: {
    distance?: number;
    enemyType?: EnemySubType;
  };
}

export class ScoreManager {
  private currentScore: number = 0;
  private topScore: number = 0;
  private distanceTraveled: number = 0;
  private enemyKills: Map<EnemySubType, number> = new Map();
  private onScoreUpdateCallback?: (score: number, event: ScoreEvent) => void;
  private isGamePlaying: boolean = false;

  // Enemy type scoring multipliers: 10 * (1-X) where X is enemy difficulty
  private readonly enemyScoreMultipliers: Record<EnemySubType, number> = {
    [EnemySubType.GRUNT]: 10 * 1, // 10 points - basic enemy
    [EnemySubType.SOLDIER]: 10 * 2, // 20 points - tougher enemy
    [EnemySubType.TANK]: 10 * 3, // 30 points - armored enemy
    [EnemySubType.FLYER]: 10 * 4, // 40 points - aerial enemy
    [EnemySubType.DRAGON]: 10 * 5, // 50 points - boss-level enemy
    [EnemySubType.BOSS]: 10 * 6, // 60 points - ultimate boss
  };

  constructor() {
    this.topScore = this.loadTopScore();
    this.reset();
  }

  /**
   * Load top score from persistent storage
   */
  private loadTopScore(): number {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('shih_top_score');
        return stored ? parseInt(stored, 10) : 0; // Default to 0 if no score stored
      }
      return 0;
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load top score from localStorage:', error);
      return 0; // Default fallback
    }
  }

  /**
   * Save top score to persistent storage
   */
  private saveTopScore(score: number): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('shih_top_score', score.toString());
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('Failed to save top score to localStorage:', error);
    }
  }

  /**
   * Set game playing state
   */
  public setGamePlaying(isPlaying: boolean): void {
    this.isGamePlaying = isPlaying;
  }

  /**
   * Check if game is currently in playing state
   */
  public isPlaying(): boolean {
    return this.isGamePlaying;
  }

  /**
   * Reset all scoring data (but preserve top score)
   */
  public reset(): void {
    this.currentScore = 0;
    this.distanceTraveled = 0;
    this.enemyKills.clear();
    this.isGamePlaying = false; // Reset game state
  }

  /**
   * Add distance-based score (1 point per unit)
   */
  public addDistanceScore(distance: number): void {
    // Only accumulate score if game is actively being played
    if (!this.isGamePlaying) {
      return;
    }

    const points = Math.floor(distance);
    if (points > 0) {
      this.distanceTraveled += distance;
      this.currentScore += points;

      // Check for new high score
      this.checkAndUpdateTopScore();

      const event: ScoreEvent = {
        type: 'distance',
        points,
        details: { distance },
      };

      this.onScoreUpdateCallback?.(this.currentScore, event);
    }
  }

  /**
   * Add enemy kill score based on enemy type
   */
  public addEnemyKillScore(enemyType: EnemySubType): void {
    // Only accumulate score if game is actively being played
    if (!this.isGamePlaying) {
      return;
    }

    const points = this.enemyScoreMultipliers[enemyType] || 10;
    this.currentScore += points;

    // Check for new high score
    this.checkAndUpdateTopScore();

    // Track kill count for this enemy type
    const currentKills = this.enemyKills.get(enemyType) || 0;
    this.enemyKills.set(enemyType, currentKills + 1);

    const event: ScoreEvent = {
      type: 'enemy_kill',
      points,
      details: { enemyType },
    };

    this.onScoreUpdateCallback?.(this.currentScore, event);
  }

  /**
   * Check if current score is a new high score and update if needed
   */
  private checkAndUpdateTopScore(): void {
    if (this.currentScore > this.topScore) {
      this.topScore = this.currentScore;
      this.saveTopScore(this.topScore);
    }
  }

  /**
   * Get current total score
   */
  public getCurrentScore(): number {
    return this.currentScore;
  }

  /**
   * Get top score
   */
  public getTopScore(): number {
    return this.topScore;
  }

  /**
   * Get total distance traveled
   */
  public getDistanceTraveled(): number {
    return this.distanceTraveled;
  }

  /**
   * Get enemy kill statistics
   */
  public getEnemyKillStats(): Map<EnemySubType, number> {
    return new Map(this.enemyKills);
  }

  /**
   * Get total enemies killed
   */
  public getTotalEnemiesKilled(): number {
    let total = 0;
    for (const count of this.enemyKills.values()) {
      total += count;
    }
    return total;
  }

  /**
   * Set callback for score updates
   */
  public setOnScoreUpdate(callback: (score: number, event: ScoreEvent) => void): void {
    this.onScoreUpdateCallback = callback;
  }

  /**
   * Get scoring breakdown for display
   */
  public getScoreBreakdown(): {
    total: number;
    distance: number;
    enemyKills: number;
    enemyKillsByType: Record<EnemySubType, { count: number; points: number }>;
  } {
    const distanceScore = Math.floor(this.distanceTraveled);
    let enemyKillScore = 0;
    const enemyKillsByType: Record<EnemySubType, { count: number; points: number }> = {} as Record<
      EnemySubType,
      { count: number; points: number }
    >;

    for (const [enemyType, count] of this.enemyKills) {
      const pointsPerKill = this.enemyScoreMultipliers[enemyType];
      const totalPoints = count * pointsPerKill;
      enemyKillScore += totalPoints;
      enemyKillsByType[enemyType] = { count, points: totalPoints };
    }

    return {
      total: this.currentScore,
      distance: distanceScore,
      enemyKills: enemyKillScore,
      enemyKillsByType,
    };
  }
}
