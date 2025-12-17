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

