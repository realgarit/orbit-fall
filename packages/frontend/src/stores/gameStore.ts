import { create } from 'zustand';
import type { EnemyState, LaserAmmoType, LaserCannonType, RocketType, BonusBoxState, OreState, OreType } from '@shared/types';
import { SPARROW_SHIP, PLAYER_STATS, ORE_CONFIG } from '@shared/constants';
import { getLevelFromExp } from '@shared/utils/leveling';

interface Position { x: number; y: number; }
interface Velocity { vx: number; vy: number; }

interface GameState {
  fps: number;
  shipPosition: Position;
  shipVelocity: Velocity;
  shipRotation: number;
  playerHealth: number;
  playerShield: number | undefined;
  playerMaxShield: number | undefined;
  playerExperience: number;
  playerCredits: number;
  playerHonor: number;
  playerAetherium: number;
  playerCargo: Record<OreType, number>;
  playerMaxCargo: number;
  playerLevel: number;
  showLevelUpAnimation: boolean;
  levelUpNewLevel: number | null;
  isDead: boolean;
  deathPosition: Position | null;
  showDeathWindow: boolean;
  instaShieldActive: boolean;
  instaShieldEndTime: number;
  currentLaserCannon: LaserCannonType;
  currentLaserAmmoType: LaserAmmoType;
  currentRocketType: RocketType;
  laserAmmo: Record<LaserAmmoType, number>;
  rocketAmmo: Record<RocketType, number>;
  selectedEnemyId: string | null;
  inCombat: boolean;
  playerFiring: boolean;
  playerFiringRocket: boolean;
  enemies: Map<string, EnemyState>;
  enemyPositions: Map<string, Position>;
  deadEnemies: Set<string>;
  isRepairing: boolean;
  repairCooldown: number;
  lastRepairTime: number;
  rocketCooldown: number;
  playerLastRocketFireTime: number;
  targetPosition: Position | null;
  enemyRespawnTimers: Map<string, number>;
  bonusBoxes: Map<string, BonusBoxState>;
  bonusBoxRespawnTimers: Map<string, number>;
  targetBonusBoxId: string | null;
  ores: Map<string, OreState>;
  targetOreId: string | null;

  setShipPosition: (position: Position) => void;
  setShipVelocity: (velocity: Velocity) => void;
  setShipRotation: (rotation: number) => void;
  updateShipState: (position: Position, velocity: Velocity, rotation: number) => void;
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
  addOreToCargo: (type: OreType, amount: number) => boolean;
  setPlayerMaxCargo: (maxCargo: number) => void;
  setShowLevelUpAnimation: (show: boolean, newLevel?: number | null) => void;
  setIsDead: (isDead: boolean) => void;
  setDeathPosition: (position: Position | null) => void;
  setShowDeathWindow: (show: boolean) => void;
  setInstaShieldActive: (active: boolean) => void;
  setInstaShieldEndTime: (time: number) => void;
  setCurrentLaserCannon: (cannon: LaserCannonType) => void;
  setCurrentLaserAmmoType: (ammoType: LaserAmmoType) => void;
  setCurrentRocketType: (rocketType: RocketType) => void;
  consumeLaserAmmo: () => boolean;
  consumeRocketAmmo: () => boolean;
  setLaserAmmo: (ammo: Record<LaserAmmoType, number>) => void;
  setRocketAmmo: (ammo: Record<RocketType, number>) => void;
  setSelectedEnemyId: (id: string | null) => void;
  setInCombat: (inCombat: boolean) => void;
  setPlayerFiring: (firing: boolean) => void;
  setPlayerFiringRocket: (firing: boolean) => void;
  setEnemies: (enemies: Map<string, EnemyState>) => void;
  updateEnemy: (id: string, enemy: EnemyState) => void;
  removeEnemy: (id: string) => void;
  setEnemyPositions: (positions: Map<string, Position>) => void;
  updateEnemyPosition: (id: string, position: Position) => void;
  setDeadEnemies: (deadEnemies: Set<string>) => void;
  addDeadEnemy: (id: string) => void;
  removeDeadEnemy: (id: string) => void;
  setIsRepairing: (isRepairing: boolean) => void;
  setRepairCooldown: (cooldown: number) => void;
  setLastRepairTime: (time: number) => void;
  setRocketCooldown: (cooldown: number) => void;
  setPlayerLastRocketFireTime: (time: number) => void;
  setTargetPosition: (position: Position | null) => void;
  setEnemyRespawnTimer: (id: string, time: number) => void;
  removeEnemyRespawnTimer: (id: string) => void;
  setBonusBoxes: (boxes: Map<string, BonusBoxState>) => void;
  addBonusBox: (box: BonusBoxState) => void;
  removeBonusBox: (id: string) => void;
  setBonusBoxRespawnTimer: (id: string, time: number) => void;
  removeBonusBoxRespawnTimer: (id: string) => void;
  setTargetBonusBoxId: (id: string | null) => void;
  setOres: (ores: Map<string, OreState>) => void;
  addOre: (ore: OreState) => void;
  removeOre: (id: string) => void;
  setTargetOreId: (id: string | null) => void;
  collectOre: (id: string) => boolean;
  sellOre: (type: OreType, amount: number, socket: any) => void;
  sellAllOres: (socket: any) => void;
  refineOre: (targetType: OreType, socket: any) => void;
  addAmmo: (type: LaserAmmoType, amount: number) => void;
  setFps: (fps: number) => void;
  resetPlayer: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  fps: 0,
  shipPosition: { x: 600, y: 400 },
  shipVelocity: { vx: 0, vy: 0 },
  shipRotation: 0,
  playerHealth: SPARROW_SHIP.hitpoints,
  playerShield: undefined,
  playerMaxShield: undefined,
  playerExperience: 0,
  playerCredits: 0,
  playerHonor: 0,
  playerAetherium: 0,
  playerCargo: { Pyrite: 0, Beryl: 0, Citrine: 0, Roseon: 0, Veridian: 0, Aurum: 0, Umbra: 0, Argent: 0 },
  playerMaxCargo: SPARROW_SHIP.cargo,
  playerLevel: 1,
  showLevelUpAnimation: false,
  levelUpNewLevel: null,
  isDead: false,
  deathPosition: null,
  showDeathWindow: false,
  instaShieldActive: false,
  instaShieldEndTime: 0,
  currentLaserCannon: PLAYER_STATS.STARTING_LASER_CANNON,
  currentLaserAmmoType: PLAYER_STATS.STARTING_LASER_AMMO,
  currentRocketType: PLAYER_STATS.STARTING_ROCKET,
  laserAmmo: { 'LC-10': 10000, 'LC-25': 0, 'LC-50': 0, 'LC-100': 0, 'RS-75': 0 },
  rocketAmmo: { 'RT-01': 100, 'RT-02': 0, 'RT-03': 0, 'RT-04': 0 },
  selectedEnemyId: null,
  inCombat: false,
  playerFiring: false,
  playerFiringRocket: false,
  enemies: new Map(),
  enemyPositions: new Map(),
  deadEnemies: new Set(),
  isRepairing: false,
  repairCooldown: 0,
  lastRepairTime: 0,
  rocketCooldown: 0,
  playerLastRocketFireTime: 0,
  targetPosition: null,
  enemyRespawnTimers: new Map(),
  bonusBoxes: new Map(),
  bonusBoxRespawnTimers: new Map(),
  targetBonusBoxId: null,
  ores: new Map(),
  targetOreId: null,

  setShipPosition: (position) => set({ shipPosition: position }),
  setShipVelocity: (velocity) => set({ shipVelocity: velocity }),
  setShipRotation: (rotation) => set({ shipRotation: rotation }),
  updateShipState: (position, velocity, rotation) => set({ shipPosition: position, shipVelocity: velocity, shipRotation: rotation }),
  setPlayerHealth: (health) => set({ playerHealth: health }),
  setPlayerShield: (shield) => set({ playerShield: shield }),
  setPlayerLevel: (level) => set({ playerLevel: level }),
  setPlayerMaxShield: (maxShield) => set({ playerMaxShield: maxShield }),
  setPlayerExperience: (experience) => set({ playerExperience: experience, playerLevel: getLevelFromExp(experience) }),
  setPlayerCredits: (credits) => set({ playerCredits: credits }),
  setPlayerHonor: (honor) => set({ playerHonor: honor }),
  setPlayerAetherium: (aetherium) => set({ playerAetherium: aetherium }),
  addExperience: (amount) => {
    const nextExp = get().playerExperience + amount;
    set({ playerExperience: nextExp, playerLevel: getLevelFromExp(nextExp) });
  },
  addCredits: (amount) => set({ playerCredits: get().playerCredits + amount }),
  addHonor: (amount) => set({ playerHonor: get().playerHonor + amount }),
  addAetherium: (amount) => set({ playerAetherium: get().playerAetherium + amount }),
  setPlayerCargo: (cargo) => set({ playerCargo: cargo }),
  addOreToCargo: (type, amount) => {
    const state = get();
    const usage = (Object.entries(state.playerCargo) as [OreType, number][]).reduce((sum, [t, count]) => {
      const config = ORE_CONFIG[t.toUpperCase() as keyof typeof ORE_CONFIG];
      return sum + count * (config?.cargoSpace || 1);
    }, 0);
    const config = ORE_CONFIG[type.toUpperCase() as keyof typeof ORE_CONFIG];
    if (usage + (config?.cargoSpace || 1) * amount > state.playerMaxCargo) return false;
    set({ playerCargo: { ...state.playerCargo, [type]: (state.playerCargo[type] || 0) + amount } });
    return true;
  },
  setPlayerMaxCargo: (maxCargo) => set({ playerMaxCargo: maxCargo }),
  setShowLevelUpAnimation: (show, newLevel = null) => set({ showLevelUpAnimation: show, levelUpNewLevel: newLevel }),
  setIsDead: (isDead) => set({ isDead }),
  setDeathPosition: (position) => set({ deathPosition: position }),
  setShowDeathWindow: (show) => set({ showDeathWindow: show }),
  setInstaShieldActive: (active) => set({ instaShieldActive: active }),
  setInstaShieldEndTime: (time) => set({ instaShieldEndTime: time }),
  setCurrentLaserCannon: (cannon) => set({ currentLaserCannon: cannon }),
  setCurrentLaserAmmoType: (ammoType) => set({ currentLaserAmmoType: ammoType }),
  setCurrentRocketType: (rocketType) => set({ currentRocketType: rocketType }),
  consumeLaserAmmo: () => {
    const qty = get().laserAmmo[get().currentLaserAmmoType];
    if (qty <= 0) return false;
    set({ laserAmmo: { ...get().laserAmmo, [get().currentLaserAmmoType]: qty - 1 } });
    return true;
  },
  consumeRocketAmmo: () => {
    const qty = get().rocketAmmo[get().currentRocketType];
    if (qty <= 0) return false;
    set({ rocketAmmo: { ...get().rocketAmmo, [get().currentRocketType]: qty - 1 } });
    return true;
  },
  setLaserAmmo: (ammo) => set({ laserAmmo: ammo }),
  setRocketAmmo: (ammo) => set({ rocketAmmo: ammo }),
  setSelectedEnemyId: (id) => set({ selectedEnemyId: id }),
  setInCombat: (inCombat) => set({ inCombat }),
  setPlayerFiring: (firing) => set({ playerFiring: firing }),
  setPlayerFiringRocket: (firing) => set({ playerFiringRocket: firing }),
  setEnemies: (enemies) => set({ enemies }),
  updateEnemy: (id, enemy) => {
    const emap = new Map(get().enemies); emap.set(id, enemy); set({ enemies: emap });
  },
  removeEnemy: (id) => {
    const emap = new Map(get().enemies); emap.delete(id); set({ enemies: emap });
  },
  setEnemyPositions: (positions) => set({ enemyPositions: positions }),
  updateEnemyPosition: (id, position) => {
    const pmap = new Map(get().enemyPositions); pmap.set(id, position); set({ enemyPositions: pmap });
  },
  setDeadEnemies: (deadEnemies) => set({ deadEnemies }),
  addDeadEnemy: (id) => {
    const dset = new Set(get().deadEnemies); dset.add(id); set({ deadEnemies: dset });
  },
  removeDeadEnemy: (id) => {
    const dset = new Set(get().deadEnemies); dset.delete(id); set({ deadEnemies: dset });
  },
  setIsRepairing: (isRepairing) => set({ isRepairing }),
  setRepairCooldown: (cooldown) => set({ repairCooldown: cooldown }),
  setLastRepairTime: (time) => set({ lastRepairTime: time }),
  setRocketCooldown: (cooldown) => set({ rocketCooldown: cooldown }),
  setPlayerLastRocketFireTime: (time) => set({ playerLastRocketFireTime: time }),
  setTargetPosition: (position) => set({ targetPosition: position }),
  setEnemyRespawnTimer: (id, time) => {
    const tmap = new Map(get().enemyRespawnTimers); tmap.set(id, time); set({ enemyRespawnTimers: tmap });
  },
  removeEnemyRespawnTimer: (id) => {
    const tmap = new Map(get().enemyRespawnTimers); tmap.delete(id); set({ enemyRespawnTimers: tmap });
  },
  setBonusBoxes: (boxes) => set({ bonusBoxes: boxes }),
  addBonusBox: (box) => {
    const bmap = new Map(get().bonusBoxes); bmap.set(box.id, box); set({ bonusBoxes: bmap });
  },
  removeBonusBox: (id) => {
    const bmap = new Map(get().bonusBoxes); bmap.delete(id); set({ bonusBoxes: bmap });
  },
  setBonusBoxRespawnTimer: (id, time) => {
    const tmap = new Map(get().bonusBoxRespawnTimers); tmap.set(id, time); set({ bonusBoxRespawnTimers: tmap });
  },
  removeBonusBoxRespawnTimer: (id) => {
    const tmap = new Map(get().bonusBoxRespawnTimers); tmap.delete(id); set({ bonusBoxRespawnTimers: tmap });
  },
  setTargetBonusBoxId: (id) => set({ targetBonusBoxId: id }),
  setOres: (ores) => set({ ores }),
  addOre: (ore) => {
    const omap = new Map(get().ores); omap.set(ore.id, ore); set({ ores: omap });
  },
  removeOre: (id) => {
    const omap = new Map(get().ores); omap.delete(id); set({ ores: omap });
  },
  setTargetOreId: (id) => set({ targetOreId: id }),
  collectOre: (id) => {
    const ore = get().ores.get(id);
    if (!ore) return false;
    const usage = (Object.entries(get().playerCargo) as [OreType, number][]).reduce((sum, [t, count]) => {
      const config = ORE_CONFIG[t.toUpperCase() as keyof typeof ORE_CONFIG];
      return sum + count * (config?.cargoSpace || 1);
    }, 0);
    const config = ORE_CONFIG[ore.type.toUpperCase() as keyof typeof ORE_CONFIG];
    if (usage + (config?.cargoSpace || 1) > get().playerMaxCargo) return false;
    return true;
  },
  sellOre: (type, amount, socket) => {
    socket.emit('sell_ore', { type, amount });
  },
  sellAllOres: (socket) => {
    (Object.entries(get().playerCargo) as [OreType, number][]).forEach(([type, amount]) => {
      if (amount > 0) socket.emit('sell_ore', { type, amount });
    });
  },
  refineOre: (targetType, socket) => {
    socket.emit('refine_ore', { targetType });
  },
  addAmmo: (type, amount) => {
    set({ laserAmmo: { ...get().laserAmmo, [type]: (get().laserAmmo[type] || 0) + amount } });
  },
  setFps: (fps) => set({ fps }),
  resetPlayer: () => set({ isDead: false, playerHealth: SPARROW_SHIP.hitpoints, playerShield: undefined, inCombat: false, playerFiring: false, playerFiringRocket: false, selectedEnemyId: null, isRepairing: false, showDeathWindow: false }),
}));

export const selectCurrentCargoUsage = (state: GameState) => 
  (Object.entries(state.playerCargo) as [OreType, number][]).reduce((sum, [type, amount]) => {
    const config = ORE_CONFIG[type.toUpperCase() as keyof typeof ORE_CONFIG];
    const space = config?.cargoSpace || 1;
    return sum + amount * space;
  }, 0);
