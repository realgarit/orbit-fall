import type { LaserAmmoType, LaserCannonType, RocketType } from '../types';
import { LASER_AMMO, LASER_CANNONS, ROCKETS } from '../constants';

/**
 * Calculates laser damage using the formula:
 * (Base Laser Value + All Bonuses) x Ammo Multiplier x Drones/Ship Slots = Total Damage
 * 
 * @param cannonType - Type of laser cannon (determines base damage)
 * @param ammoType - Type of laser ammo (determines multiplier)
 * @param slots - Number of laser slots (default: 1)
 * @param bonuses - Additional damage bonuses (default: 0)
 * @returns Total damage per shot
 */
export function calculateLaserDamage(
  cannonType: LaserCannonType,
  ammoType: LaserAmmoType,
  slots: number = 1,
  bonuses: number = 0
): number {
  const cannon = LASER_CANNONS[cannonType];
  const ammo = LASER_AMMO[ammoType];
  
  if (!cannon || !ammo) {
    // Fallback to default values if invalid types
    return 10;
  }
  
  // Base laser value (random between 0 and max damage)
  const baseLaserValue = Math.random() * cannon.maxDamage;
  
  // Formula: (Base Laser Value + All Bonuses) x Ammo Multiplier x Slots
  const totalDamage = (baseLaserValue + bonuses) * ammo.multiplier * slots;
  
  return Math.floor(totalDamage);
}

/**
 * Calculates rocket damage
 * @param rocketType - Type of rocket
 * @returns Damage value
 */
export function calculateRocketDamage(rocketType: RocketType): number {
  const rocket = ROCKETS[rocketType];
  
  if (!rocket) {
    // Fallback to default value if invalid type
    return 1000;
  }
  
  return rocket.damage;
}

/**
 * Gets the base damage range for a laser cannon
 * @param cannonType - Type of laser cannon
 * @returns Object with min and max damage (without multipliers)
 */
export function getLaserCannonDamageRange(cannonType: LaserCannonType): { min: number; max: number } {
  const cannon = LASER_CANNONS[cannonType];
  
  if (!cannon) {
    return { min: 0, max: 0 };
  }
  
  return {
    min: 0,
    max: cannon.maxDamage,
  };
}

/**
 * Gets the damage multiplier for laser ammo
 * @param ammoType - Type of laser ammo
 * @returns Multiplier value
 */
export function getLaserAmmoMultiplier(ammoType: LaserAmmoType): number {
  const ammo = LASER_AMMO[ammoType];
  return ammo?.multiplier ?? 1;
}
