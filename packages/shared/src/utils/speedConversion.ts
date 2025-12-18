import { SPEED_SCALE_FACTOR, SPEED_BASE_NORMAL } from '../constants';

/**
 * Converts base speed (from ship stats) to display speed (pixels per frame)
 * Base speed 320 = normal movement, scale so 540-580 feels very fast
 * @param baseSpeed - Base speed from ship stats (e.g., 320 for Sparrow)
 * @returns Display speed in pixels per frame
 */
export function convertSpeedToDisplay(baseSpeed: number): number {
  return baseSpeed * SPEED_SCALE_FACTOR;
}

/**
 * Converts display speed back to base speed
 * @param displaySpeed - Display speed in pixels per frame
 * @returns Base speed value
 */
export function convertDisplayToSpeed(displaySpeed: number): number {
  return displaySpeed / SPEED_SCALE_FACTOR;
}

/**
 * Gets the normalized speed factor (0-1) where 0 = stopped, 1 = max speed
 * @param baseSpeed - Base speed from ship stats
 * @param maxSpeed - Maximum speed (e.g., 580)
 * @returns Normalized speed factor (0-1)
 */
export function getNormalizedSpeed(baseSpeed: number, maxSpeed: number = 580): number {
  return Math.min(1, baseSpeed / maxSpeed);
}
