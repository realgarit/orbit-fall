import { create } from 'zustand';
import type { EnemyState, LaserAmmoType, LaserCannonType, RocketType, BonusBoxState, OreState, OreType } from '@shared/types';
import { SPARROW_SHIP, PLAYER_STATS, ORE_CONFIG, ORE_REFINING_RECIPES } from '@shared/constants';
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
  playerCargo: Record<OreType, number>;
  playerMaxCargo: number;

  // Derived state
  playerLevel: number;

  // Level up animation state
  showLevelUpAnimation: boolean;
  levelUpNewLevel: number | null;

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

  // Bonus Box state
  bonusBoxes: Map<string, BonusBoxState>;
  bonusBoxRespawnTimers: Map<string, number>;
  targetBonusBoxId: string | null;

  // Ore state
  ores: Map<string, OreState>;
  targetOreId: string | null;

  // Actions - Ship
  setShipPosition: (position: Position) => void;
  setShipVelocity: (velocity: Velocity) => void;
  setShipRotation: (rotation: number) => void;
  updateShipState: (position: Position, velocity: Velocity, rotation: number) => void;

  // Actions - Player Stats
  setPlayerHealth: (health: number) => void;
  setPlayerShield: (shield: number | undefined) => void;
  setPlayerLevel: (level: number) => void;
  setPlayerMaxShield: (maxShield: number | undefined) => void;
  setPlayerExperience: (experience: number) => void;
  setPlayerCredits: (credits: number) => void;
  setPlayerHonor: (honor: number) => void;
  setPlayerAetherium: (aetherium: number) => void;
  addExperience: (amount: number) => void;
  addCredits: (amount: number) => void;
  addHonor: (amount: number) => void;
  addAetherium: (amount: number) => void;
  setPlayerCargo: (cargo: Record<OreType, number>) => void;
  addOreToCargo: (type: OreType, amount: number) => boolean; // Returns true if it fit
  setPlayerMaxCargo: (maxCargo: number) => void;

  // Actions - Level Up
  setShowLevelUpAnimation: (show: boolean, newLevel?: number | null) => void;

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

  // Actions - Bonus Boxes
  setBonusBoxes: (boxes: Map<string, BonusBoxState>) => void;
  addBonusBox: (box: BonusBoxState) => void;
  removeBonusBox: (id: string) => void;
  setBonusBoxRespawnTimer: (id: string, time: number) => void;
  removeBonusBoxRespawnTimer: (id: string) => void;
  setTargetBonusBoxId: (id: string | null) => void;

  // Actions - Ores
  setOres: (ores: Map<string, OreState>) => void;
  addOre: (ore: OreState) => void;
  removeOre: (id: string) => void;
  setTargetOreId: (id: string | null) => void;
  collectOre: (id: string) => boolean;
  sellOre: (type: OreType, amount: number) => void;
  sellAllOres: () => void;
  refineOre: (targetType: OreType) => boolean;
  addAmmo: (type: LaserAmmoType, amount: number) => void;

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
  playerCargo: {
    Pyrite: 0,
    Beryl: 0,
    Citrine: 0,
    Roseon: 0,
    Veridian: 0,
    Aurum: 0,
    Umbra: 0,
    Argent: 0,
  },
  playerMaxCargo: SPARROW_SHIP.cargo,

  // Derived state
  playerLevel: 1,

  // Level up animation state
  showLevelUpAnimation: false,
  levelUpNewLevel: null,

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

  // Bonus Box state
  bonusBoxes: new Map(),
  bonusBoxRespawnTimers: new Map(),
  targetBonusBoxId: null,

  // Ore state
  ores: new Map(),
  targetOreId: null,

  // Actions - Ship
  setShipPosition: (position) => set({ shipPosition: position }),
  setShipVelocity: (velocity) => set({ shipVelocity: velocity }),
  setShipRotation: (rotation) => set({ shipRotation: rotation }),
  updateShipState: (position, velocity, rotation) =>
    set({ shipPosition: position, shipVelocity: velocity, shipRotation: rotation }),

  // Actions - Player Stats
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setPlayerShield: (shield) => set({ playerShield: shield }),
  setPlayerLevel: (level) => set({ playerLevel: level }),
  setPlayerMaxShield: (maxShield) => set({ playerMaxShield: maxShield }),
  setPlayerExperience: (experience) => set({ playerExperience: experience, playerLevel: getLevelFromExp(experience) }),
  setPlayerCredits: (credits) => set({ playerCredits: credits }),
  setPlayerHonor: (honor) => set({ playerHonor: honor }),
  setPlayerAetherium: (aetherium) => set({ playerAetherium: aetherium }),
  addExperience: (amount) => {
    const newExperience = get().playerExperience + amount;
    set({
      playerExperience: newExperience,
      playerLevel: getLevelFromExp(newExperience),
    });
  },
  addCredits: (amount) => set({ playerCredits: get().playerCredits + amount }),
  addHonor: (amount) => set({ playerHonor: get().playerHonor + amount }),
  addAetherium: (amount) => set({ playerAetherium: get().playerAetherium + amount }),
  setPlayerCargo: (cargo) => set({ playerCargo: cargo }),
  addOreToCargo: (type, amount) => {
    const state = get();
    const currentCargoAmount = (Object.entries(state.playerCargo) as [OreType, number][]).reduce((sum, [t, count]) => {
      const config = ORE_CONFIG[t.toUpperCase() as keyof typeof ORE_CONFIG];
      const space = config?.cargoSpace || 1;
      return sum + count * space;
    }, 0);
    const config = ORE_CONFIG[type.toUpperCase() as keyof typeof ORE_CONFIG];
    const addedSpace = config?.cargoSpace || 1;

    if (currentCargoAmount + addedSpace * amount > state.playerMaxCargo) {
      return false;
    }

    set({
      playerCargo: {
        ...state.playerCargo,
        [type]: (state.playerCargo[type] || 0) + amount,
      },
    });
    return true;
  },
  setPlayerMaxCargo: (maxCargo) => set({ playerMaxCargo: maxCargo }),

  // Actions - Level Up
  setShowLevelUpAnimation: (show, newLevel = null) =>
    set({ showLevelUpAnimation: show, levelUpNewLevel: newLevel }),

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

  // Actions - Bonus Boxes
  setBonusBoxes: (boxes) => set({ bonusBoxes: boxes }),
  addBonusBox: (box) => {
    const boxes = new Map(get().bonusBoxes);
    boxes.set(box.id, box);
    set({ bonusBoxes: boxes });
  },
  removeBonusBox: (id) => {
    const boxes = new Map(get().bonusBoxes);
    boxes.delete(id);
    set({ bonusBoxes: boxes });
  },
  setBonusBoxRespawnTimer: (id, time) => {
    const timers = new Map(get().bonusBoxRespawnTimers);
    timers.set(id, time);
    set({ bonusBoxRespawnTimers: timers });
  },
  removeBonusBoxRespawnTimer: (id) => {
    const timers = new Map(get().bonusBoxRespawnTimers);
    timers.delete(id);
    set({ bonusBoxRespawnTimers: timers });
  },
  setTargetBonusBoxId: (id) => set({ targetBonusBoxId: id }),

  // Actions - Ores
  setOres: (ores) => set({ ores }),
  addOre: (ore) => {
    const ores = new Map(get().ores);
    ores.set(ore.id, ore);
    set({ ores });
  },
  removeOre: (id) => {
    const ores = new Map(get().ores);
    ores.delete(id);
    set({ ores });
  },
  setTargetOreId: (id) => set({ targetOreId: id }),
  collectOre: (id) => {
    const state = get();
    const ore = state.ores.get(id);
    if (!ore) return false;

    if (state.addOreToCargo(ore.type, 1)) {
      state.removeOre(id);
      if (state.targetOreId === id) {
        state.setTargetOreId(null);
      }
      return true;
    }
    return false;
  },
  sellOre: (type, amount) => {
    const state = get();
    const currentAmount = state.playerCargo[type] || 0;
    const amountToSell = Math.min(amount, currentAmount);

    if (amountToSell <= 0) return;

    const config = ORE_CONFIG[type.toUpperCase() as keyof typeof ORE_CONFIG];
    const resaleValue = (config as any)?.resaleValue || 0;
    const creditsToGain = amountToSell * resaleValue;

    set({
      playerCargo: {
        ...state.playerCargo,
        [type]: currentAmount - amountToSell,
      },
      playerCredits: state.playerCredits + creditsToGain,
    });
  },
  sellAllOres: () => {
    const state = get();
    let totalCredits = 0;
    const nextCargo = { ...state.playerCargo };

    (Object.entries(state.playerCargo) as [OreType, number][]).forEach(([type, amount]) => {
      const config = ORE_CONFIG[type.toUpperCase() as keyof typeof ORE_CONFIG];
      const resaleValue = (config as any)?.resaleValue || 0;
      totalCredits += amount * resaleValue;
      nextCargo[type as OreType] = 0;
    });

    set({
      playerCargo: nextCargo,
      playerCredits: state.playerCredits + totalCredits,
    });
  },
  refineOre: (targetType) => {
    const state = get();
    const recipe = ORE_REFINING_RECIPES[targetType.toUpperCase() as keyof typeof ORE_REFINING_RECIPES];

    if (!recipe) return false;

    // Check ingredients
    const currentCargo = { ...state.playerCargo };
    for (const [ingredientName, requiredAmount] of Object.entries(recipe.ingredients)) {
      const ingredientType = ingredientName.charAt(0) + ingredientName.toLowerCase().slice(1) as OreType;
      const currentAmount = currentCargo[ingredientType] || 0;
      if (currentAmount < requiredAmount) {
        return false;
      }
    }

    // Subtract ingredients
    for (const [ingredientName, requiredAmount] of Object.entries(recipe.ingredients)) {
      const ingredientType = ingredientName.charAt(0) + ingredientName.toLowerCase().slice(1) as OreType;
      currentCargo[ingredientType] -= requiredAmount;
    }

    // Add target ore (using addOreToCargo to reuse cargo limit logic)
    // Temporarily update cargo to check if target fits
    // This is a bit tricky since addOreToCargo uses get().
    // Let's just manually check space.

    set({ playerCargo: currentCargo });
    if (get().addOreToCargo(targetType, 1)) {
      return true;
    } else {
      // Rollback if didn't fit
      set({ playerCargo: state.playerCargo });
      return false;
    }
  },
  addAmmo: (type, amount) => {
    const state = get();
    set({
      laserAmmo: {
        ...state.laserAmmo,
        [type]: (state.laserAmmo[type] || 0) + amount,
      },
    });
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
export const selectCurrentCargoUsage = (state: GameState) =>
  (Object.entries(state.playerCargo) as [OreType, number][]).reduce((sum, [type, amount]) => {
    const config = ORE_CONFIG[type.toUpperCase() as keyof typeof ORE_CONFIG];
    const space = config?.cargoSpace || 1;
    return sum + amount * space;
  }, 0);
