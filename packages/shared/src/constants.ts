// Game constants
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

// Starfield configuration
export const STARFIELD_LAYERS = 3;
export const STARS_PER_LAYER = 100;

// Ship configuration
export const SHIP_SPEED = 5;
export const SHIP_ROTATION_SPEED = 0.1;

// Player configuration
export const PLAYER_STATS = {
  MAX_HEALTH: 100,
  DAMAGE: 10,
};

// Enemy configuration
export const ENEMY_STATS = {
  DRIFTER: {
    MAX_HEALTH: 50,
    DAMAGE: 5,
    NAME: '-=[ Drifter ]=-',
  },
};

// Combat configuration
export const COMBAT_CONFIG = {
  FIRING_RATE: 1, // shots per second
  LASER_SPEED: 32, // pixels per frame (at 60fps) - ~480 pixels/second for fast travel
  LASER_LENGTH: 40, // pixels
  LASER_WIDTH: 3, // pixels
  LASER_COLOR: 0xff0000, // red
  LASER_GLOW_ALPHA: 0.8,
  COMBAT_RANGE: 1000, // max distance for combat
  LASER_TIMEOUT: 5000, // milliseconds before laser despawns
};

// HP Bar configuration
export const HP_BAR_CONFIG = {
  WIDTH: 50,
  HEIGHT: 4,
  OFFSET_Y: -45, // pixels above ship
  BORDER_WIDTH: 1,
};

