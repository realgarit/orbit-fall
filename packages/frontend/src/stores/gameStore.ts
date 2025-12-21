import { create } from 'zustand';
import type { EnemyState, LaserAmmoType, LaserCannonType, RocketType } from '@shared/types';
import { SPARROW_SHIP, PLAYER_STATS } from '@shared/constants';
import { getLevelFromExp } from '@shared/utils/leveling';

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  vx: number;
  vy: number;
}

interface GameState {
  // PixiJS Application state
  fps: number;

  // Ship state
  shipPosition: Position;
  shipVelocity: Velocity;
  shipRotation: number;

  // Player stats
  playerHealth: number;
  playerShield: number | undefined;
  playerMaxShield: number | undefined;
  playerExperience: number;
  playerCredits: number;
  playerHonor: number;
  playerAetherium: number;

  // Derived state
  playerLevel: number;

  // Death state
  isDead: boolean;
  deathPosition: Position | null;
  showDeathWindow: boolean;
  instaShieldActive: boolean;
  instaShieldEndTime: number;

  // Equipment state
  currentLaserCannon: LaserCannonType;
  currentLaserAmmoType: LaserAmmoType;
  currentRocketType: RocketType;
  laserAmmo: Record<LaserAmmoType, number>;
  rocketAmmo: Record<RocketType, number>;

  // Combat state
  selectedEnemyId: string | null;
  inCombat: boolean;
  playerFiring: boolean;
  playerFiringRocket: boolean;

  // Enemy state
  enemies: Map<string, EnemyState>;
  enemyPositions: Map<string, Position>;
  deadEnemies: Set<string>;

  // Repair system state
  isRepairing: boolean;
  repairCooldown: number;
  lastRepairTime: number;

  // Cooldowns
  rocketCooldown: number;
  playerLastRocketFireTime: number;

  // Minimap auto-fly target
  targetPosition: Position | null;

  // Respawn timers (stored separately from React refs)
  enemyRespawnTimers: Map<string, number>;

  // Actions - Ship
  setShipPosition: (position: Position) => void;
  setShipVelocity: (velocity: Velocity) => void;
  setShipRotation: (rotation: number) => void;
  updateShipState: (position: Position, velocity: Velocity, rotation: number) => void;

  // Actions - Player Stats
  setPlayerHealth: (health: number) => void;
  setPlayerShield: (shield: number | undefined) => void;
  setPlayerMaxShield: (maxShield: number | undefined) => void;
  setPlayerExperience: (experience: number) => void;
  addExperience: (amount: number) => void;
  setPlayerCredits: (credits: number) => void;
  addCredits: (amount: number) => void;
  setPlayerHonor: (honor: number) => void;
  addHonor: (amount: number) => void;
  setPlayerAetherium: (aetherium: number) => void;
  addAetherium: (amount: number) => void;

  // Actions - Death
  setIsDead: (isDead: boolean) => void;
  setDeathPosition: (position: Position | null) => void;
  setShowDeathWindow: (show: boolean) => void;
  setInstaShieldActive: (active: boolean) => void;
  setInstaShieldEndTime: (time: number) => void;

  // Actions - Equipment
  setCurrentLaserCannon: (cannon: LaserCannonType) => void;
  setCurrentLaserAmmoType: (ammoType: LaserAmmoType) => void;
  setCurrentRocketType: (rocketType: RocketType) => void;
  consumeLaserAmmo: () => boolean; // Returns true if ammo was consumed
  consumeRocketAmmo: () => boolean; // Returns true if ammo was consumed
  setLaserAmmo: (ammo: Record<LaserAmmoType, number>) => void;
  setRocketAmmo: (ammo: Record<RocketType, number>) => void;

  // Actions - Combat
  setSelectedEnemyId: (id: string | null) => void;
  setInCombat: (inCombat: boolean) => void;
  setPlayerFiring: (firing: boolean) => void;
  setPlayerFiringRocket: (firing: boolean) => void;

  // Actions - Enemies
  setEnemies: (enemies: Map<string, EnemyState>) => void;
  updateEnemy: (id: string, enemy: EnemyState) => void;
  removeEnemy: (id: string) => void;
  setEnemyPositions: (positions: Map<string, Position>) => void;
  updateEnemyPosition: (id: string, position: Position) => void;
  setDeadEnemies: (deadEnemies: Set<string>) => void;
  addDeadEnemy: (id: string) => void;
  removeDeadEnemy: (id: string) => void;

  // Actions - Repair
  setIsRepairing: (isRepairing: boolean) => void;
  setRepairCooldown: (cooldown: number) => void;
  setLastRepairTime: (time: number) => void;

  // Actions - Cooldowns
  setRocketCooldown: (cooldown: number) => void;
  setPlayerLastRocketFireTime: (time: number) => void;

  // Actions - Minimap
  setTargetPosition: (position: Position | null) => void;

  // Actions - Respawn
  setEnemyRespawnTimer: (id: string, time: number) => void;
  removeEnemyRespawnTimer: (id: string) => void;

  // Actions - Utility
  setFps: (fps: number) => void;
  resetPlayer: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  // Initial state
  fps: 0,

  // Ship state
  shipPosition: { x: 600, y: 400 }, // MAP_WIDTH/2, MAP_HEIGHT/2
  shipVelocity: { vx: 0, vy: 0 },
  shipRotation: 0,

  // Player stats
  playerHealth: SPARROW_SHIP.hitpoints,
  playerShield: undefined,
  playerMaxShield: undefined,
  playerExperience: 9700,
  playerCredits: 0,
  playerHonor: 0,
  playerAetherium: 0,

  // Derived state
  playerLevel: 1,

  // Death state
  isDead: false,
  deathPosition: null,
  showDeathWindow: false,
  instaShieldActive: false,
  instaShieldEndTime: 0,

  // Equipment state
  currentLaserCannon: PLAYER_STATS.STARTING_LASER_CANNON,
  currentLaserAmmoType: PLAYER_STATS.STARTING_LASER_AMMO,
  currentRocketType: PLAYER_STATS.STARTING_ROCKET,
  laserAmmo: {
    'LC-10': 10000,
    'LC-25': 0,
    'LC-50': 0,
    'LC-100': 0,
    'RS-75': 0,
  },
  rocketAmmo: {
    'RT-01': 100,
    'RT-02': 0,
    'RT-03': 0,
    'RT-04': 0,
  },

  // Combat state
  selectedEnemyId: null,
  inCombat: false,
  playerFiring: false,
  playerFiringRocket: false,

  // Enemy state
  enemies: new Map(),
  enemyPositions: new Map(),
  deadEnemies: new Set(),

  // Repair system state
  isRepairing: false,
  repairCooldown: 0,
  lastRepairTime: 0,

  // Cooldowns
  rocketCooldown: 0,
  playerLastRocketFireTime: 0,

  // Minimap auto-fly target
  targetPosition: null,

  // Respawn timers
  enemyRespawnTimers: new Map(),

  // Actions - Ship
  setShipPosition: (position) => set({ shipPosition: position }),
  setShipVelocity: (velocity) => set({ shipVelocity: velocity }),
  setShipRotation: (rotation) => set({ shipRotation: rotation }),
  updateShipState: (position, velocity, rotation) =>
    set({ shipPosition: position, shipVelocity: velocity, shipRotation: rotation }),

  // Actions - Player Stats
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setPlayerShield: (shield) => set({ playerShield: shield }),
  setPlayerMaxShield: (maxShield) => set({ playerMaxShield: maxShield }),
  setPlayerExperience: (experience) =>
    set({
      playerExperience: experience,
      playerLevel: getLevelFromExp(experience),
    }),
  addExperience: (amount) => {
    const newExperience = get().playerExperience + amount;
    set({
      playerExperience: newExperience,
      playerLevel: getLevelFromExp(newExperience),
    });
  },
  setPlayerCredits: (credits) => set({ playerCredits: credits }),
  addCredits: (amount) => set({ playerCredits: get().playerCredits + amount }),
  setPlayerHonor: (honor) => set({ playerHonor: honor }),
  addHonor: (amount) => set({ playerHonor: get().playerHonor + amount }),
  setPlayerAetherium: (aetherium) => set({ playerAetherium: aetherium }),
  addAetherium: (amount) => set({ playerAetherium: get().playerAetherium + amount }),

  // Actions - Death
  setIsDead: (isDead) => set({ isDead }),
  setDeathPosition: (position) => set({ deathPosition: position }),
  setShowDeathWindow: (show) => set({ showDeathWindow: show }),
  setInstaShieldActive: (active) => set({ instaShieldActive: active }),
  setInstaShieldEndTime: (time) => set({ instaShieldEndTime: time }),

  // Actions - Equipment
  setCurrentLaserCannon: (cannon) => set({ currentLaserCannon: cannon }),
  setCurrentLaserAmmoType: (ammoType) => set({ currentLaserAmmoType: ammoType }),
  setCurrentRocketType: (rocketType) => set({ currentRocketType: rocketType }),
  consumeLaserAmmo: () => {
    const state = get();
    const currentType = state.currentLaserAmmoType;
    const currentQuantity = state.laserAmmo[currentType];

    if (currentQuantity <= 0) {
      return false;
    }

    set({
      laserAmmo: {
        ...state.laserAmmo,
        [currentType]: currentQuantity - 1,
      },
    });

    return true;
  },
  consumeRocketAmmo: () => {
    const state = get();
    const currentType = state.currentRocketType;
    const currentQuantity = state.rocketAmmo[currentType];

    if (currentQuantity <= 0) {
      return false;
    }

    set({
      rocketAmmo: {
        ...state.rocketAmmo,
        [currentType]: currentQuantity - 1,
      },
    });

    return true;
  },
  setLaserAmmo: (ammo) => set({ laserAmmo: ammo }),
  setRocketAmmo: (ammo) => set({ rocketAmmo: ammo }),

  // Actions - Combat
  setSelectedEnemyId: (id) => set({ selectedEnemyId: id }),
  setInCombat: (inCombat) => set({ inCombat }),
  setPlayerFiring: (firing) => set({ playerFiring: firing }),
  setPlayerFiringRocket: (firing) => set({ playerFiringRocket: firing }),

  // Actions - Enemies
  setEnemies: (enemies) => set({ enemies }),
  updateEnemy: (id, enemy) => {
    const enemies = new Map(get().enemies);
    enemies.set(id, enemy);
    set({ enemies });
  },
  removeEnemy: (id) => {
    const enemies = new Map(get().enemies);
    enemies.delete(id);
    set({ enemies });
  },
  setEnemyPositions: (positions) => set({ enemyPositions: positions }),
  updateEnemyPosition: (id, position) => {
    const positions = new Map(get().enemyPositions);
    positions.set(id, position);
    set({ enemyPositions: positions });
  },
  setDeadEnemies: (deadEnemies) => set({ deadEnemies }),
  addDeadEnemy: (id) => {
    const deadEnemies = new Set(get().deadEnemies);
    deadEnemies.add(id);
    set({ deadEnemies });
  },
  removeDeadEnemy: (id) => {
    const deadEnemies = new Set(get().deadEnemies);
    deadEnemies.delete(id);
    set({ deadEnemies });
  },

  // Actions - Repair
  setIsRepairing: (isRepairing) => set({ isRepairing }),
  setRepairCooldown: (cooldown) => set({ repairCooldown: cooldown }),
  setLastRepairTime: (time) => set({ lastRepairTime: time }),

  // Actions - Cooldowns
  setRocketCooldown: (cooldown) => set({ rocketCooldown: cooldown }),
  setPlayerLastRocketFireTime: (time) => set({ playerLastRocketFireTime: time }),

  // Actions - Minimap
  setTargetPosition: (position) => set({ targetPosition: position }),

  // Actions - Respawn
  setEnemyRespawnTimer: (id, time) => {
    const timers = new Map(get().enemyRespawnTimers);
    timers.set(id, time);
    set({ enemyRespawnTimers: timers });
  },
  removeEnemyRespawnTimer: (id) => {
    const timers = new Map(get().enemyRespawnTimers);
    timers.delete(id);
    set({ enemyRespawnTimers: timers });
  },

  // Actions - Utility
  setFps: (fps) => set({ fps }),
  resetPlayer: () =>
    set({
      isDead: false,
      playerHealth: SPARROW_SHIP.hitpoints,
      playerShield: undefined,
      inCombat: false,
      playerFiring: false,
      playerFiringRocket: false,
      selectedEnemyId: null,
      isRepairing: false,
      showDeathWindow: false,
    }),
}));

// Selectors for commonly accessed computed values
export const selectPlayerLevel = (state: GameState) => state.playerLevel;
export const selectCurrentLaserAmmoQuantity = (state: GameState) =>
  state.laserAmmo[state.currentLaserAmmoType];
export const selectCurrentRocketAmmoQuantity = (state: GameState) =>
  state.rocketAmmo[state.currentRocketType];
export const selectAliveEnemies = (state: GameState) =>
  Array.from(state.enemies.values()).filter(
    (enemy) => !state.deadEnemies.has(enemy.id) && enemy.health > 0
  );
