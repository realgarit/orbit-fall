// Game constants
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

// Coordinate display scale - coordinates are displayed divided by this value
// This makes coordinates change more slowly, similar to DarkOrbit (e.g., 260/120)
// Internal system still uses pixels, but displayed coordinates are in "map units"
// Higher value = slower coordinate changes (1 click should move ~1 coordinate point)
export const COORDINATE_SCALE = 100; // 1 coordinate unit = 100 pixels

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
  LASER_LENGTH: 30, // pixels (shortened)
  LASER_WIDTH: 3, // pixels
  LASER_COLOR: 0xff0000, // red
  LASER_GLOW_ALPHA: 0.8,
  COMBAT_RANGE: 1000, // max distance for combat
  LASER_TIMEOUT: 5000, // milliseconds before laser despawns
};

// Rocket configuration
export const ROCKET_CONFIG = {
  SPEED: 8, // pixels per frame (quarter of laser speed: 32/4)
  DAMAGE: 40, // 4x laser damage: 10*4
  FIRING_RATE: 1 / 3, // shots per second (3 second cooldown)
  LENGTH: 15, // rocket visual length (shortened)
  WIDTH: 6, // rocket visual width
  COLOR: 0xff0000, // red color for rockets
  TIMEOUT: 10000, // milliseconds before rocket despawns (longer since rockets are slower)
};

// HP Bar configuration
export const HP_BAR_CONFIG = {
  WIDTH: 50,
  HEIGHT: 4,
  OFFSET_Y: -45, // pixels above ship
  BORDER_WIDTH: 1,
};

// Base safety zone configuration
export const BASE_SAFETY_ZONE = {
  RADIUS: 300, // pixels - safety zone radius around base
  POSITION: { x: 200, y: 200 }, // base position
};

