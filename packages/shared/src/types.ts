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
  rotation: number;
  isEngaged: boolean;
  lastFireTime: number;
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

