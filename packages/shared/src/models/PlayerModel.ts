import type { LaserAmmoType, LaserCannonType, RocketType, ShipStats } from '../types';

/**
 * Player data model - database-ready structure
 * All fields are serializable for database storage
 */
export interface PlayerModel {
  // Identity
  id: string;
  name?: string;
  
  // Progression
  level: number;
  experience: number;
  
  // Currency
  credits: number;
  honor: number;
  uridium: number;
  
  // Ship
  shipType: string; // e.g., 'Sparrow'
  shipStats: ShipStats;
  
  // Equipment
  currentLaserCannon: LaserCannonType;
  currentLaserAmmo: LaserAmmoType;
  currentRocket: RocketType;
  
  // Ammo quantities
  laserAmmoQuantity: number;
  rocketAmmoQuantity: number;
  
  // Health and Shield
  health: number;
  maxHealth: number;
  shield?: number;
  maxShield?: number;
  
  // Position (for respawn/state)
  lastPosition?: {
    x: number;
    y: number;
  };
  
  // Timestamps
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

/**
 * Default player model (starting state)
 */
export function createDefaultPlayerModel(): PlayerModel {
  return {
    id: '',
    level: 1,
    experience: 0,
    credits: 0,
    honor: 0,
    uridium: 0,
    shipType: 'Sparrow',
    shipStats: {
      name: 'Sparrow',
      cost: 0,
      baseSpeed: 320,
      cargo: 100,
      laserSlots: 1,
      generatorSlots: 1,
      extrasSlots: 1,
      hitpoints: 4000,
    },
    currentLaserCannon: 'PL-1',
    currentLaserAmmo: 'LC-10',
    currentRocket: 'RT-01',
    laserAmmoQuantity: 10000, // Starting ammo
    rocketAmmoQuantity: 100, // Starting rockets
    health: 4000,
    maxHealth: 4000,
    // No shield at start
  };
}
