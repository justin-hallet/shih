import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HUD } from './HUD';

// Mock DOM environment
describe('HUD Component', () => {
  let mockParent: HTMLElement;
  let hud: HUD;

  beforeEach(() => {
    // Create a mock parent element
    mockParent = document.createElement('div');
    document.body.appendChild(mockParent);

    // Create HUD instance
    hud = new HUD(mockParent);
  });

  afterEach(() => {
    hud.destroy();
    document.body.innerHTML = '';
  });

  it('should create HUD elements correctly', () => {
    const hudElement = mockParent.querySelector('.game-hud');
    expect(hudElement).toBeTruthy();

    const topSection = hudElement?.querySelector('.hud-top');
    const bottomSection = hudElement?.querySelector('.hud-bottom');
    expect(topSection).toBeTruthy();
    expect(bottomSection).toBeTruthy();
  });

  it('should display initial game state correctly', () => {
    const topScore = document.getElementById('top-score');
    const currentScore = document.getElementById('current-score');
    const currentStage = document.getElementById('current-stage');
    const livesDisplay = document.getElementById('lives-display');

    expect(topScore?.textContent).toBe('1710570');
    expect(currentScore?.textContent).toBe('0');
    expect(currentStage?.textContent).toBe('1');
    expect(livesDisplay?.children).toHaveLength(3);
  });

  it('should update score correctly', () => {
    hud.updateScore(5000);

    const currentScore = document.getElementById('current-score');
    expect(currentScore?.textContent).toBe('5000');
    expect(hud.getGameState().currentScore).toBe(5000);
  });

  it('should update top score when current score exceeds it', () => {
    hud.updateScore(2000000);

    const topScore = document.getElementById('top-score');
    const currentScore = document.getElementById('current-score');

    expect(topScore?.textContent).toBe('2000000');
    expect(currentScore?.textContent).toBe('2000000');
  });

  it('should update lives correctly', () => {
    hud.updateLives(2);

    const livesDisplay = document.getElementById('lives-display');
    expect(livesDisplay?.children).toHaveLength(2);
    expect(hud.getGameState().lives).toBe(2);
  });

  it('should handle zero lives', () => {
    hud.updateLives(0);

    const livesDisplay = document.getElementById('lives-display');
    expect(livesDisplay?.children).toHaveLength(0);
    expect(hud.getGameState().lives).toBe(0);
  });

  it('should not allow negative lives', () => {
    hud.updateLives(-1);

    const livesDisplay = document.getElementById('lives-display');
    expect(livesDisplay?.children).toHaveLength(0);
    expect(hud.getGameState().lives).toBe(0);
  });

  it('should update stage correctly', () => {
    hud.updateStage(5);

    const currentStage = document.getElementById('current-stage');
    expect(currentStage?.textContent).toBe('5');
    expect(hud.getGameState().stage).toBe(5);
  });

  it('should return correct game state', () => {
    hud.updateScore(15000);
    hud.updateLives(2);
    hud.updateStage(3);

    const gameState = hud.getGameState();
    expect(gameState).toEqual({
      topScore: 1710570, // Should remain the initial high score
      currentScore: 15000,
      lives: 2,
      stage: 3,
    });
  });

  it('should destroy correctly', () => {
    const hudElement = mockParent.querySelector('.game-hud');
    expect(hudElement).toBeTruthy();

    hud.destroy();

    const hudElementAfter = mockParent.querySelector('.game-hud');
    expect(hudElementAfter).toBeFalsy();
  });
});
