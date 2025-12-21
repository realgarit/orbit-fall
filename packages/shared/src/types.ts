// Game entity types
export interface Position {
  x: number;
  y: number;
}

export interface Velocity {
  vx: number;
  vy: number;
}

export interface ShipState extends Position, Velocity {
  rotation: number;
  id: string;
}

export interface Star {
  x: number;
  y: number;
  z: number; // Depth for parallax effect
  size: number;
}

// Enemy types
export interface EnemyState extends Position, Velocity {
  id: string;
  name: string;
  health: number;
  maxHealth: number;
  shield?: number;
  maxShield?: number;
  rotation: number;
  isEngaged: boolean;
  lastFireTime: number;
  attitude?: 'defensive' | 'aggressive';
}

export interface BonusBoxState extends Position {
  id: string;
  type: 'standard';
}

// Combat types
export interface CombatState {
  engagedEnemyId: string | null;
  playerFiring: boolean;
  enemyFiring: { [enemyId: string]: boolean };
}

// Laser projectile types
export interface LaserProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  damage: number;
  ownerId: string; // 'player' or enemy id
  targetId: string; // 'player' or enemy id
  spawnTime: number;
}

// Rocket projectile types
export interface RocketProjectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  damage: number;
  ownerId: string; // 'player' or enemy id
  targetId: string; // 'player' or enemy id
  spawnTime: number;
}

// Ammo and Equipment Types
export type LaserAmmoType = 'LC-10' | 'LC-25' | 'LC-50' | 'LC-100' | 'RS-75';
export type LaserCannonType = 'PL-1' | 'BL-1' | 'PL-2' | 'PL-3';
export type RocketType = 'RT-01' | 'RT-02' | 'RT-03' | 'RT-04';

// Ship Stats
export interface ShipStats {
  name: string;
  cost: number; // Credits
  baseSpeed: number;
  cargo: number;
  laserSlots: number;
  generatorSlots: number;
  extrasSlots: number;
  hitpoints: number;
}

// Enemy Reward
export interface EnemyReward {
  experience: number;
  honor: number;
  credits: number;
  aetherium: number;
}

// Level Info
export interface LevelInfo {
  level: number;
  expRequired: number;
  unlocks?: string[];
}

