// Game constants
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

// Coordinate display scale
export const COORDINATE_SCALE = 100;

// Starfield configuration
export const STARFIELD_LAYERS = 3;
export const STARS_PER_LAYER = 100;

// Ship configuration
export const SHIP_SPEED = 5;
export const SHIP_ROTATION_SPEED = 0.1;

// Speed conversion constants
export const SPEED_SCALE_FACTOR = 0.01;
export const SPEED_BASE_NORMAL = 320;
export const SPEED_MAX_FAST = 580;

// Laser Ammunition Types (multipliers)
export const LASER_AMMO = {
  'LC-10': { multiplier: 1, name: 'LC-10' },
  'LC-25': { multiplier: 2, name: 'LC-25' },
  'LC-50': { multiplier: 3, name: 'LC-50' },
  'LC-100': { multiplier: 4, name: 'LC-100' },
  'RS-75': { multiplier: 6, name: 'RS-75' },
} as const;

// Laser Cannon/Battery Types (base damage)
export const LASER_CANNONS = {
  'PL-1': { maxDamage: 65, name: 'PL-1' },
  'BL-1': { maxDamage: 70, name: 'BL-1' },
  'PL-2': { maxDamage: 140, name: 'PL-2' },
  'PL-3': { maxDamage: 175, name: 'PL-3' },
} as const;

// Rocket Types (max damage)
export const ROCKETS = {
  'RT-01': { maxDamage: 1000, name: 'RT-01' },
  'RT-02': { maxDamage: 2000, name: 'RT-02' },
  'RT-03': { maxDamage: 4000, name: 'RT-03' },
  'RT-04': { maxDamage: 6000, name: 'RT-04' },
} as const;

// Ship Stats - Sparrow (Player's first ship)
export const SPARROW_SHIP = {
  name: 'Sparrow',
  cost: 0,
  baseSpeed: 320,
  cargo: 100,
  laserSlots: 1,
  generatorSlots: 1,
  extrasSlots: 1,
  hitpoints: 4000,
} as const;

// Player configuration
export const PLAYER_STATS = {
  MAX_HEALTH: SPARROW_SHIP.hitpoints,
  DAMAGE: 10,
  STARTING_LASER_CANNON: 'PL-1' as const,
  STARTING_LASER_AMMO: 'LC-10' as const,
  STARTING_ROCKET: 'RT-01' as const,
};

// Enemy configuration
export const ENEMY_STATS = {
  DRIFTER: {
    MAX_HEALTH: 1000,
    MAX_SHIELD: 600,
    DAMAGE: 20,
    NAME: '-=[ Drifter ]=-',
    BASE_SPEED: 300,
    ATTITUDE: 'defensive' as const,
    REWARD: {
      experience: 400,
      honor: 2,
      credits: 400,
      aetherium: 1,
    },
  },
};

// Combat configuration
export const COMBAT_CONFIG = {
  FIRING_RATE: 1,
  LASER_SPEED: 32,
  LASER_LENGTH: 30,
  LASER_WIDTH: 3,
  LASER_COLOR: 0xff0000,
  LASER_GLOW_ALPHA: 0.8,
  COMBAT_RANGE: 1000,
  PLAYER_RANGE: 600,
  ENEMY_RANGE: 450,
  LASER_TIMEOUT: 5000,
};

// Rocket configuration
export const ROCKET_CONFIG = {
  SPEED: 8,
  DAMAGE: 40,
  FIRING_RATE: 1 / 3,
  LENGTH: 15,
  WIDTH: 6,
  COLOR: 0xff0000,
  TIMEOUT: 10000,
};

// HP Bar configuration
export const HP_BAR_CONFIG = {
  WIDTH: 50,
  HEIGHT: 4,
  OFFSET_Y: -45,
  BORDER_WIDTH: 1,
  GAP: 2,
};

// Shield Bar configuration
export const SHIELD_BAR_CONFIG = {
  WIDTH: 50,
  HEIGHT: 4,
  OFFSET_Y: -39,
  BORDER_WIDTH: 1,
  COLOR: 0x4a9eff,
};

// Base safety zone configuration
export const BASE_SAFETY_ZONE = {
  RADIUS: 300,
  POSITION: { x: 200, y: 200 },
};

// Experience and Leveling
export const LEVELING_CONFIG = {
  BASE_EXP: 10000,
  EXP_MULTIPLIER: 2,
  STARTING_LEVEL: 1,
  MAX_LEVEL: 44,
} as const;

// Damage Numbers configuration
export const DAMAGE_NUMBER_CONFIG = {
  DURATION: 1500,
  FLOAT_DISTANCE: 40,
  START_SCALE: 1.0,
  END_SCALE: 1.5,
  START_ALPHA: 1.0,
  END_ALPHA: 0.0,
  FONT_SIZE: 18,
  FONT_FAMILY: 'Arial, sans-serif',
  FONT_WEIGHT: 'bold',
  PLAYER_DAMAGE_COLOR: 0xff0000,
  ENEMY_DAMAGE_COLOR: 0xff00ff,
  OFFSET_Y: -30,
  RANDOM_OFFSET_X: 10,
} as const;

// Bonus Box configuration
export const BONUS_BOX_CONFIG = {
  COUNT: 5,
  RESPAWN_TIME: 5000,
  CLICK_RADIUS: 30,
  REWARDS: [
    { type: 'credits', amounts: [200, 500, 1000], weight: 40 },
    { type: 'aetherium', amounts: [20, 50, 100], weight: 20 },
    { type: 'ammo', ammoType: 'LC-10', amounts: [10, 20, 50], weight: 20 },
    { type: 'ammo', ammoType: 'LC-25', amounts: [5, 10, 20], weight: 10 },
    { type: 'ammo', ammoType: 'LC-50', amounts: [5, 10, 20], weight: 10 },
  ],
} as const;

// Ore configuration
export const ORE_CONFIG = {
  PYRITE: {
    type: 'Pyrite' as const,
    color: 0xff4444,
    clusterSize: { min: 10, max: 20 },
    spawnRate: 0.8,
    cargoSpace: 1,
    size: 'small' as const,
    resaleValue: 10,
  },
  BERYL: {
    type: 'Beryl' as const,
    color: 0x4444ff,
    spawnRate: 0.2,
    cargoSpace: 1,
    size: 'small' as const,
    resaleValue: 15,
  },
  CITRINE: {
    type: 'Citrine' as const,
    color: 0xffff44,
    spawnRate: 0,
    cargoSpace: 1,
    size: 'small' as const,
    resaleValue: 30,
  },
  ROSEON: {
    type: 'Roseon' as const,
    color: 0xff66cc,
    cargoSpace: 1,
    size: 'large' as const,
    resaleValue: 200,
  },
  VERIDIAN: {
    type: 'Veridian' as const,
    color: 0x44ff44,
    cargoSpace: 1,
    size: 'large' as const,
    resaleValue: 200,
  },
  AURUM: {
    type: 'Aurum' as const,
    color: 0xffd700,
    cargoSpace: 1,
    size: 'large' as const,
    resaleValue: 1000,
  },
  UMBRA: {
    type: 'Umbra' as const,
    color: 0x8b00ff,
    cargoSpace: 1,
    size: 'small' as const,
  },
  ARGENT: {
    type: 'Argent' as const,
    color: 0xffffff,
    cargoSpace: 1,
    size: 'small' as const,
  },
} as const;

export const ORE_REFINING_RECIPES = {
  ROSEON: {
    ingredients: { PYRITE: 20, BERYL: 10 } as Record<string, number>,
    result: 'Roseon' as const,
  },
  VERIDIAN: {
    ingredients: { BERYL: 10, CITRINE: 20 } as Record<string, number>,
    result: 'Veridian' as const,
  },
  AURUM: {
    ingredients: { ROSEON: 10, VERIDIAN: 10, ARGENT: 1 } as Record<string, number>,
    result: 'Aurum' as const,
  },
} as const;
