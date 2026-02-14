import { LEVELING_CONFIG } from '../constants.js';
import type { LevelInfo } from '../types.js';

/**
 * Calculates the experience required for a given level
 * Formula: 10000 * 2^(x-2) where x is the player level
 * @param level - Player level
 * @returns Experience points required to reach this level
 */
export function getExpForLevel(level: number): number {
  if (level <= 1) {
    return 0;
  }
  
  return LEVELING_CONFIG.BASE_EXP * Math.pow(LEVELING_CONFIG.EXP_MULTIPLIER, level - 2);
}

/**
 * Calculates the level from experience points
 * Formula: log2(x/10000) + 2 where x is experience
 * @param exp - Experience points
 * @returns Player level
 */
export function getLevelFromExp(exp: number): number {
  if (exp < LEVELING_CONFIG.BASE_EXP) {
    return 1;
  }
  
  const level = Math.floor(Math.log2(exp / LEVELING_CONFIG.BASE_EXP) + 2);
  
  // Clamp to valid level range
  return Math.max(1, Math.min(level, LEVELING_CONFIG.MAX_LEVEL));
}

/**
 * Gets level information including requirements and unlocks
 * @param level - Player level
 * @returns Level info object
 */
export function getLevelInfo(level: number): LevelInfo | null {
  if (level < 1 || level > LEVELING_CONFIG.MAX_LEVEL) {
    return null;
  }
  
  return {
    level,
    expRequired: getExpForLevel(level),
  };
}

/**
 * Gets the experience required for the next level
 * @param currentLevel - Current player level
 * @returns Experience required for next level, or null if max level
 */
export function getExpForNextLevel(currentLevel: number): number | null {
  if (currentLevel >= LEVELING_CONFIG.MAX_LEVEL) {
    return null;
  }
  
  return getExpForLevel(currentLevel + 1);
}

/**
 * Gets the progress percentage towards the next level
 * @param currentExp - Current experience points
 * @param currentLevel - Current player level
 * @returns Progress percentage (0-100), or 100 if max level
 */
export function getLevelProgress(currentExp: number, currentLevel: number): number {
  if (currentLevel >= LEVELING_CONFIG.MAX_LEVEL) {
    return 100;
  }
  
  const expForCurrentLevel = getExpForLevel(currentLevel);
  const expForNextLevel = getExpForLevel(currentLevel + 1);
  
  const expInCurrentLevel = currentExp - expForCurrentLevel;
  const expNeededForNextLevel = expForNextLevel - expForCurrentLevel;
  
  if (expNeededForNextLevel <= 0) {
    return 100;
  }
  
  return Math.min(100, Math.max(0, (expInCurrentLevel / expNeededForNextLevel) * 100));
}
