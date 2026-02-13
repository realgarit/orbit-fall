// Game constants
export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

// Coordinate display scale - coordinates are displayed divided by this value
// This makes coordinates change more slowly (e.g., 260/120)
// Internal system still uses pixels, but displayed coordinates are in "map units"
// Higher value = slower coordinate changes (1 click should move ~1 coordinate point)
export const COORDINATE_SCALE = 100; // 1 coordinate unit = 100 pixels

// Starfield configuration
export const STARFIELD_LAYERS = 3;
export const STARS_PER_LAYER = 100;

// Ship configuration
export const SHIP_SPEED = 5;
export const SHIP_ROTATION_SPEED = 0.1;

// Speed conversion constants
// Base speed 320 = normal movement, scale so 540-580 feels very fast
export const SPEED_SCALE_FACTOR = 0.01; // 320 * 0.01 = 3.2 (current normal speed)
export const SPEED_BASE_NORMAL = 320; // Base speed that feels normal
export const SPEED_MAX_FAST = 580; // Max speed that should feel very fast

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
  cost: 0, // Credits
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
  DAMAGE: 10, // Will be calculated using new formula
  // Starting equipment
  STARTING_LASER_CANNON: 'PL-1' as const,
  STARTING_LASER_AMMO: 'LC-10' as const,
  STARTING_ROCKET: 'RT-01' as const,
};

// Enemy configuration
export const ENEMY_STATS = {
  DRIFTER: {
    MAX_HEALTH: 1000,
    MAX_SHIELD: 600,
    DAMAGE: 20, // Will be calculated using new formula
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
  FIRING_RATE: 1, // shots per second
  LASER_SPEED: 32, // pixels per frame (at 60fps) - ~480 pixels/second for fast travel
  LASER_LENGTH: 30, // pixels (shortened)
  LASER_WIDTH: 3, // pixels
  LASER_COLOR: 0xff0000, // red
  LASER_GLOW_ALPHA: 0.8,
  COMBAT_RANGE: 1000, // max distance for combat (deprecated - use PLAYER_RANGE or ENEMY_RANGE)
  PLAYER_RANGE: 600, // 6 coordinate units = 600 pixels (allows close combat, prevents cross-map firing)
  ENEMY_RANGE: 450, // 4.5 coordinate units = 450 pixels (slightly shorter than player)
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
  OFFSET_Y: -45, // pixels above ship (top of HP bar)
  BORDER_WIDTH: 1,
  GAP: 2, // Gap between HP and shield bar
};

// Shield Bar configuration
export const SHIELD_BAR_CONFIG = {
  WIDTH: 50,
  HEIGHT: 4,
  // Shield bar goes BELOW HP bar: HP bar bottom + gap
  // HP bar bottom = OFFSET_Y + HEIGHT = -45 + 4 = -41
  // Shield bar top = -41 + GAP = -39
  OFFSET_Y: HP_BAR_CONFIG.OFFSET_Y + HP_BAR_CONFIG.HEIGHT + HP_BAR_CONFIG.GAP,
  BORDER_WIDTH: 1,
  COLOR: 0x4a9eff, // Blue color for shield
};

// Base safety zone configuration
export const BASE_SAFETY_ZONE = {
  RADIUS: 300, // pixels - safety zone radius around base
  POSITION: { x: 200, y: 200 }, // base position
};

// Experience and Leveling
// Formula: 10000 * 2^(x-2) where x is the player level
export const LEVELING_CONFIG = {
  BASE_EXP: 10000,
  EXP_MULTIPLIER: 2,
  STARTING_LEVEL: 1,
  MAX_LEVEL: 44,
} as const;

// Damage Numbers configuration
export const DAMAGE_NUMBER_CONFIG = {
  DURATION: 1500, // Animation duration in milliseconds (1.5 seconds)
  FLOAT_DISTANCE: 40, // Pixels to float upward
  START_SCALE: 1.0, // Initial scale
  END_SCALE: 1.5, // Final scale (50% larger)
  START_ALPHA: 1.0, // Initial opacity
  END_ALPHA: 0.0, // Final opacity (fully transparent)
  FONT_SIZE: 18, // Base font size
  FONT_FAMILY: 'Arial, sans-serif',
  FONT_WEIGHT: 'bold',
  PLAYER_DAMAGE_COLOR: 0xff0000, // Red when player damages enemy
  ENEMY_DAMAGE_COLOR: 0xff00ff, // Violet/pink when enemy damages player
  OFFSET_Y: -30, // Initial offset above hit position
  RANDOM_OFFSET_X: 10, // Random horizontal spread to prevent stacking
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
    color: 0xff4444, // Reddish
    clusterSize: { min: 10, max: 20 },
    spawnRate: 0.8,
    cargoSpace: 1,
    size: 'small' as const,
    resaleValue: 10,
  },
  BERYL: {
    type: 'Beryl' as const,
    color: 0x4444ff, // Blueish
    spawnRate: 0.2,
    cargoSpace: 1,
    size: 'small' as const,
    resaleValue: 15,
  },
  CITRINE: {
    type: 'Citrine' as const,
    color: 0xffff44, // Yellowish
    spawnRate: 0, // Later map
    cargoSpace: 1,
    size: 'small' as const,
    resaleValue: 30,
  },
  ROSEON: {
    type: 'Roseon' as const,
    color: 0xff66cc, // Pinkish
    cargoSpace: 1,
    size: 'large' as const,
    resaleValue: 200,
  },
  VERIDIAN: {
    type: 'Veridian' as const,
    color: 0x44ff44, // Greenish
    cargoSpace: 1,
    size: 'large' as const,
    resaleValue: 200,
  },
  AURUM: {
    type: 'Aurum' as const,
    color: 0xffd700, // Goldish
    cargoSpace: 1,
    size: 'large' as const,
    resaleValue: 1000,
  },
  UMBRA: {
    type: 'Umbra' as const,
    color: 0x8b00ff, // Violet/Blacklight
    cargoSpace: 1,
    size: 'small' as const,
  },
  ARGENT: {
    type: 'Argent' as const,
    color: 0xffffff, // White
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
