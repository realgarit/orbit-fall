import type { ShipStats } from '../types';

/**
 * Ship data model - database-ready structure
 */
export interface ShipModel extends ShipStats {
  id: string;
  unlocked: boolean;
  purchased: boolean;
  description?: string;
}

/**
 * Available ships in the game
 */
export const AVAILABLE_SHIPS: ShipModel[] = [
  {
    id: 'sparrow',
    name: 'Sparrow',
    cost: 0,
    baseSpeed: 320,
    cargo: 100,
    laserSlots: 1,
    generatorSlots: 1,
    extrasSlots: 1,
    hitpoints: 4000,
    unlocked: true,
    purchased: true, // Free starter ship
    description: 'Your first ship. A reliable starter vessel.',
  },
  // More ships can be added here later
];

/**
 * Gets a ship model by ID
 */
export function getShipById(id: string): ShipModel | undefined {
  return AVAILABLE_SHIPS.find(ship => ship.id === id);
}
