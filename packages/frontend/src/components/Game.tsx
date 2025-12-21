import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Application, Container } from 'pixi.js';
import { usePixiApp } from '../hooks/usePixiApp';
import { Starfield } from './Starfield';
import { MarsBackground } from './MarsBackground';
import { Ship } from './Ship';
import { Enemy } from './Enemy';
import { Base } from './Base';
import { RepairRobot } from './RepairRobot';
import { HPBar } from './HPBar';
import { SelectionCircle } from './SelectionCircle';
import { CombatSystem } from './CombatSystem';
import { Shield } from './Shield';
import { ShipExplosion } from './ShipExplosion';
import { DamageNumbers } from './DamageNumbers';
import { BonusBox } from './BonusBox';
import type { DamageNumbersHandle } from './DamageNumbers';
import { useMessageStore } from '../stores/messageStore';
import { TopBar } from './windows/TopBar';
import { ActionBar } from './windows/ActionBar';
import { StatsWindow } from './windows/StatsWindow';
import { BattleWindow } from './windows/BattleWindow';
import { MinimapWindow } from './windows/MinimapWindow';
import { SettingsWindow } from './windows/SettingsWindow';
import { ShipWindow } from './windows/ShipWindow';
import { DeathWindow } from './windows/DeathWindow';
import { MessageSystem } from './MessageSystem';
import { LevelUpAnimation } from './LevelUpAnimation';
import { useGameStore } from '../stores/gameStore';
import { MAP_WIDTH, MAP_HEIGHT, BASE_SAFETY_ZONE, ROCKET_CONFIG, ENEMY_STATS, SPARROW_SHIP, BONUS_BOX_CONFIG } from '@shared/constants';
import type { EnemyState, BonusBoxState } from '@shared/types';
import { getLevelFromExp } from '@shared/utils/leveling';
import '../styles/windows.css';

export function Game() {
  const addMessage = useMessageStore((state) => state.addMessage);
  const [app, setApp] = useState<Application | null>(null);
  const [cameraContainer, setCameraContainer] = useState<Container | null>(null);

  // Double-click detection (keep as local state - UI only)
  const lastClickTimeRef = useRef(0);
  const lastClickEnemyIdRef = useRef<string | null>(null);
  const lastOutsideClickTimeRef = useRef(0);

  // Track previous state for messages (keep as local refs - UI only)
  const prevSafetyZoneRef = useRef(false);
  const prevInCombatRef = useRef(false);

  // Debounce ref for click handling
  const lastClickProcessedTimeRef = useRef(0);
  const prevIsRepairingRef = useRef(false);

  // Damage numbers ref
  const damageNumbersRef = useRef<DamageNumbersHandle>(null);

  // Subscribe to state for rendering
  const shipPosition = useGameStore((state) => state.shipPosition);
  const shipVelocity = useGameStore((state) => state.shipVelocity);
  const shipRotation = useGameStore((state) => state.shipRotation);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const playerShield = useGameStore((state) => state.playerShield);
  const playerMaxShield = useGameStore((state) => state.playerMaxShield);
  const enemies = useGameStore((state) => state.enemies);
  const enemyPositions = useGameStore((state) => state.enemyPositions);
  const deadEnemies = useGameStore((state) => state.deadEnemies);
  const selectedEnemyId = useGameStore((state) => state.selectedEnemyId);
  const inCombat = useGameStore((state) => state.inCombat);
  const playerFiring = useGameStore((state) => state.playerFiring);
  const playerFiringRocket = useGameStore((state) => state.playerFiringRocket);
  const isRepairing = useGameStore((state) => state.isRepairing);
  const isDead = useGameStore((state) => state.isDead);
  const deathPosition = useGameStore((state) => state.deathPosition);
  const showDeathWindow = useGameStore((state) => state.showDeathWindow);
  const instaShieldActive = useGameStore((state) => state.instaShieldActive);
  const targetPosition = useGameStore((state) => state.targetPosition);
  const bonusBoxes = useGameStore((state) => state.bonusBoxes);
  const targetBonusBoxId = useGameStore((state) => state.targetBonusBoxId);
  const currentLaserCannon = useGameStore((state) => state.currentLaserCannon);
  const currentLaserAmmoType = useGameStore((state) => state.currentLaserAmmoType);
  const currentRocketType = useGameStore((state) => state.currentRocketType);
  const rocketCooldown = useGameStore((state) => state.rocketCooldown);
  const repairCooldown = useGameStore((state) => state.repairCooldown);

  // Memoize entity lists to avoid re-calculating every frame
  const enemyList = useMemo(() => Array.from(enemies.entries()), [enemies]);
  const bonusBoxList = useMemo(() => Array.from(bonusBoxes.values()), [bonusBoxes]);
  const engagedEnemyList = useMemo(() =>
    enemyList.filter(([enemyId, enemy]) =>
      !deadEnemies.has(enemyId) && enemy.health > 0 && enemy.isEngaged
    ), [enemyList, deadEnemies]);

  const { containerRef } = usePixiApp({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    onAppReady: (app) => {
      setApp(app);
      const worldContainer = new Container();
      app.stage.addChild(worldContainer);
      setCameraContainer(worldContainer);
    },
  });

  // Base position
  const basePosition = { x: 200, y: 200 };

  // Check if player is in safety zone
  const isInSafetyZone = () => {
    const state = useGameStore.getState();
    const dx = state.shipPosition.x - basePosition.x;
    const dy = state.shipPosition.y - basePosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < BASE_SAFETY_ZONE.RADIUS;
  };

  // Check if any enemy is engaged/aggressive
  const hasAggressiveEnemies = () => {
    const state = useGameStore.getState();
    return Array.from(state.enemies.values()).some(
      (enemy) => enemy.health > 0 && enemy.isEngaged && !state.deadEnemies.has(enemy.id)
    );
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (app) {
        app.renderer.resize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [app]);

  // Track FPS
  useEffect(() => {
    if (!app?.ticker) return;

    const tickerCallback = () => {
      if (app?.ticker) {
        useGameStore.getState().setFps(app.ticker.FPS);
      }
    };

    app.ticker.add(tickerCallback);
    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
    };
  }, [app]);

  // Initialize 4 enemies on mount
  useEffect(() => {
    const state = useGameStore.getState();
    const initialEnemies = new Map<string, EnemyState>();
    for (let i = 1; i <= 4; i++) {
      const enemyId = `drifter-${i}`;
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 200;
      const spawnX = state.shipPosition.x + Math.cos(angle) * distance;
      const spawnY = state.shipPosition.y + Math.sin(angle) * distance;

      initialEnemies.set(enemyId, {
        id: enemyId,
        name: ENEMY_STATS.DRIFTER.NAME,
        x: Math.max(0, Math.min(MAP_WIDTH, spawnX)),
        y: Math.max(0, Math.min(MAP_HEIGHT, spawnY)),
        vx: 0,
        vy: 0,
        health: ENEMY_STATS.DRIFTER.MAX_HEALTH,
        maxHealth: ENEMY_STATS.DRIFTER.MAX_HEALTH,
        shield: ENEMY_STATS.DRIFTER.MAX_SHIELD,
        maxShield: ENEMY_STATS.DRIFTER.MAX_SHIELD,
        rotation: 0,
        isEngaged: false,
        lastFireTime: 0,
        attitude: ENEMY_STATS.DRIFTER.ATTITUDE,
      });
    }
    state.setEnemies(initialEnemies);

    // Initialize Bonus Boxes
    const initialBoxes = new Map<string, BonusBoxState>();
    for (let i = 1; i <= BONUS_BOX_CONFIG.COUNT; i++) {
      const boxId = `box-${i}`;
      initialBoxes.set(boxId, {
        id: boxId,
        type: 'standard',
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
      });
    }
    state.setBonusBoxes(initialBoxes);
  }, []); // Only run once on mount

  // Handle ship state updates
  const handleShipStateUpdate = useCallback((position: { x: number; y: number }, velocity: { vx: number; vy: number }, rotation?: number) => {
    const state = useGameStore.getState();
    state.setShipPosition(position);
    state.setShipVelocity(velocity);
    if (rotation !== undefined) {
      state.setShipRotation(rotation);
    }
  }, []);

  // Handle enemy state updates
  const handleEnemyStateUpdate = useCallback((enemyId: string, enemyState: EnemyState) => {
    const state = useGameStore.getState();
    const existing = state.enemies.get(enemyId);

    // Preserve isEngaged state if it was already set to true
    if (existing && existing.isEngaged && !enemyState.isEngaged) {
      state.updateEnemy(enemyId, {
        ...enemyState,
        isEngaged: true,
        shield: enemyState.shield ?? existing.shield,
        maxShield: enemyState.maxShield ?? existing.maxShield,
      });
    } else {
      state.updateEnemy(enemyId, {
        ...enemyState,
        shield: enemyState.shield ?? existing?.shield,
        maxShield: enemyState.maxShield ?? existing?.maxShield,
      });
    }
  }, []);

  // Handle enemy position updates
  const handleEnemyPositionUpdate = useCallback((enemyId: string, position: { x: number; y: number }) => {
    const state = useGameStore.getState();
    if (state.deadEnemies.has(enemyId)) {
      // Enemy is dead, remove position
      const positions = new Map(state.enemyPositions);
      positions.delete(enemyId);
      state.setEnemyPositions(positions);
      return;
    }
    state.updateEnemyPosition(enemyId, position);
  }, []);

  // Handle enemy health change
  const handleEnemyHealthChange = useCallback((enemyId: string, health: number) => {
    const state = useGameStore.getState();
    const enemy = state.enemies.get(enemyId);
    if (!enemy) return;

    const enemyDied = health <= 0 && !state.deadEnemies.has(enemyId);

    // Update enemy health
    if (enemyDied) {
      state.updateEnemy(enemyId, { ...enemy, health, isEngaged: false });
    } else {
      state.updateEnemy(enemyId, { ...enemy, health });
    }

    // Handle enemy death rewards and cleanup
    if (enemyDied) {
      const deadEnemyLastPos = state.enemyPositions.get(enemyId);

      // Award rewards
      const reward = ENEMY_STATS.DRIFTER.REWARD;
      const prevExp = state.playerExperience;
      const newExp = prevExp + reward.experience;
      const oldLevel = getLevelFromExp(prevExp);
      const newLevel = getLevelFromExp(newExp);

      state.addExperience(reward.experience);
      state.addCredits(reward.credits);
      state.addHonor(reward.honor);
      state.addAetherium(reward.aetherium);

      if (newLevel > oldLevel) {
        // Trigger level-up animation
        state.setShowLevelUpAnimation(true, newLevel);
        queueMicrotask(() => addMessage(`Level up! You are now level ${newLevel}!`, 'success'));
      }

      queueMicrotask(() => addMessage(
        `Enemy destroyed! +${reward.experience} Exp, +${reward.credits} Credits, +${reward.honor} Honor, +${reward.aetherium} Aetherium`,
        'combat'
      ));

      // Remove position
      const positions = new Map(state.enemyPositions);
      positions.delete(enemyId);
      state.setEnemyPositions(positions);

      state.addDeadEnemy(enemyId);

      // Clear selection and combat if this was the selected enemy
      if (state.selectedEnemyId === enemyId) {
        state.setInCombat(false);
        state.setPlayerFiring(false);
        state.setPlayerFiringRocket(false);
        state.setSelectedEnemyId(null);
        state.setTargetPosition(null);
      }

      // Clear targetPosition if it's near where the dead enemy was
      if (deadEnemyLastPos && state.targetPosition) {
        const dx = state.targetPosition.x - deadEnemyLastPos.x;
        const dy = state.targetPosition.y - deadEnemyLastPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < 100) {
          state.setTargetPosition(null);
        }
      }

      // Schedule respawn after 3 seconds
      const respawnTime = Date.now() + 3000;
      state.setEnemyRespawnTimer(enemyId, respawnTime);
    }
  }, [addMessage]);

  // Handle damage events for floating numbers
  const handlePlayerDamage = useCallback((event: { damage: number; position: { x: number; y: number } }) => {
    damageNumbersRef.current?.addDamageNumber(
      event.damage,
      event.position,
      true // isPlayerDamage = true (enemy damages player)
    );
  }, []);

  const handleEnemyDamage = useCallback((event: { damage: number; position: { x: number; y: number } }) => {
    damageNumbersRef.current?.addDamageNumber(
      event.damage,
      event.position,
      false // isPlayerDamage = false (player damages enemy)
    );
  }, []);

  // Handle enemy respawn
  useEffect(() => {
    const checkRespawns = () => {
      const state = useGameStore.getState();
      const now = Date.now();
      const toRespawn: string[] = [];

      state.enemyRespawnTimers.forEach((respawnTime, enemyId) => {
        if (now >= respawnTime) {
          toRespawn.push(enemyId);
        }
      });

      if (toRespawn.length > 0) {
        addMessage(`${toRespawn.length} Drifter${toRespawn.length > 1 ? 's' : ''} respawned`, 'warning');

        toRespawn.forEach((enemyId) => {
          state.removeDeadEnemy(enemyId);
          state.removeEnemyRespawnTimer(enemyId);

          const angle = Math.random() * Math.PI * 2;
          const distance = 200 + Math.random() * 200;
          const spawnX = state.shipPosition.x + Math.cos(angle) * distance;
          const spawnY = state.shipPosition.y + Math.sin(angle) * distance;

          const newEnemyState: EnemyState = {
            id: enemyId,
            name: ENEMY_STATS.DRIFTER.NAME,
            x: Math.max(0, Math.min(MAP_WIDTH, spawnX)),
            y: Math.max(0, Math.min(MAP_HEIGHT, spawnY)),
            vx: 0,
            vy: 0,
            health: ENEMY_STATS.DRIFTER.MAX_HEALTH,
            maxHealth: ENEMY_STATS.DRIFTER.MAX_HEALTH,
            shield: ENEMY_STATS.DRIFTER.MAX_SHIELD,
            maxShield: ENEMY_STATS.DRIFTER.MAX_SHIELD,
            rotation: 0,
            isEngaged: false,
            lastFireTime: 0,
            attitude: ENEMY_STATS.DRIFTER.ATTITUDE,
          };

          state.updateEnemy(enemyId, newEnemyState);
          state.updateEnemyPosition(enemyId, { x: newEnemyState.x, y: newEnemyState.y });
        });
      }
    };

    const interval = setInterval(checkRespawns, 100);
    return () => clearInterval(interval);
  }, [addMessage]);

  // Handle bonus box collection and respawn
  useEffect(() => {
    const checkCollections = () => {
      const state = useGameStore.getState();
      const shipPos = state.shipPosition;
      const now = Date.now();

      // Check for collection
      state.bonusBoxes.forEach((box) => {
        if (state.targetBonusBoxId !== box.id) return;

        const dx = shipPos.x - box.x;
        const dy = shipPos.y - box.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 50) { // Collection range (increased to account for offset and ship stop threshold)
          // Trigger reward
          const rewardRoll = Math.random() * 100;
          let currentWeight = 0;
          let selectedReward: any = BONUS_BOX_CONFIG.REWARDS[0];

          for (const reward of BONUS_BOX_CONFIG.REWARDS) {
            currentWeight += reward.weight;
            if (rewardRoll <= currentWeight) {
              selectedReward = reward;
              break;
            }
          }

          const amount = selectedReward.amounts[Math.floor(Math.random() * selectedReward.amounts.length)];

          if (selectedReward.type === 'credits') {
            state.addCredits(amount);
            addMessage(`Bonus Box: +${amount} Credits`, 'success');
          } else if (selectedReward.type === 'aetherium') {
            state.addAetherium(amount);
            addMessage(`Bonus Box: +${amount} Aetherium`, 'success');
          } else if (selectedReward.type === 'ammo' && selectedReward.ammoType) {
            state.addAmmo(selectedReward.ammoType, amount);
            addMessage(`Bonus Box: +${amount} ${selectedReward.ammoType} Ammo`, 'success');
          }

          // Remove box and set respawn timer
          state.removeBonusBox(box.id);
          state.setTargetBonusBoxId(null);
          state.setBonusBoxRespawnTimer(box.id, now + BONUS_BOX_CONFIG.RESPAWN_TIME);
        }
      });

      // Check for respawns
      state.bonusBoxRespawnTimers.forEach((respawnTime, boxId) => {
        if (now >= respawnTime) {
          state.removeBonusBoxRespawnTimer(boxId);
          state.addBonusBox({
            id: boxId,
            type: 'standard',
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
          });
        }
      });
    };

    const interval = setInterval(checkCollections, 100);
    return () => clearInterval(interval);
  }, [addMessage]);

  // Handle enemy click detection
  const handleEnemyClick = useCallback((worldX: number, worldY: number): boolean => {
    const state = useGameStore.getState();

    for (const [enemyId, enemyPos] of state.enemyPositions.entries()) {
      if (state.deadEnemies.has(enemyId)) continue;

      const dx = worldX - enemyPos.x;
      const dy = worldY - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clickRadius = 30;

      if (distance < clickRadius) {
        const enemy = state.enemies.get(enemyId);
        if (!enemy || enemy.health <= 0) continue;

        const now = Date.now();

        // Prevent duplicate events (Ship.tsx and Game.tsx both triggering)
        if (now - lastClickProcessedTimeRef.current < 50) {
          return true; // Consider it handled
        }
        lastClickProcessedTimeRef.current = now;

        const isDoubleClick =
          now - lastClickTimeRef.current < 300 &&
          lastClickEnemyIdRef.current === enemyId;

        if (isDoubleClick) {
          // Double-click: engage combat (but not if in safety zone or Insta-shield active)
          if (!isInSafetyZone() && !state.instaShieldActive) {
            state.setInCombat(true);
            state.setPlayerFiring(true);
            state.setSelectedEnemyId(enemyId);
            state.updateEnemy(enemyId, { ...enemy, isEngaged: true });
          }
          lastClickTimeRef.current = 0;
          lastClickEnemyIdRef.current = null;
        } else {
          // Single click: select enemy
          state.setSelectedEnemyId(enemyId);
          lastClickTimeRef.current = now;
          lastClickEnemyIdRef.current = enemyId;
        }
        return true;
      }
    }
    return false;
  }, []);

  // Handle bonus box click detection
  const handleBonusBoxClick = useCallback((worldX: number, worldY: number): boolean => {
    const state = useGameStore.getState();

    for (const box of state.bonusBoxes.values()) {
      const dx = worldX - box.x;
      const dy = worldY - box.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < BONUS_BOX_CONFIG.CLICK_RADIUS) {
        // Set ship target position (slightly above the box)
        state.setTargetPosition({ x: box.x, y: box.y - 25 });
        state.setTargetBonusBoxId(box.id);
        return true;
      }
    }
    return false;
  }, []);

  // Clear minimap target when ship reports it reached
  const handleTargetReached = useCallback(() => {
    useGameStore.getState().setTargetPosition(null);
  }, []);

  // Clicking on the main game canvas
  useEffect(() => {
    if (!app) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const state = useGameStore.getState();
      const target = e.target as HTMLElement;
      const isWindowClick = target.closest('.game-window') !== null;
      const canvas = app.canvas as HTMLCanvasElement;

      if (canvas && (target === canvas || canvas.contains(target)) && !isWindowClick) {
        state.setTargetPosition(null);

        // Convert screen to world coordinates
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        const cameraX = -state.shipPosition.x + app.screen.width / 2;
        const cameraY = -state.shipPosition.y + app.screen.height / 2;
        const worldX = clickX - cameraX;
        const worldY = clickY - cameraY;

        // Check if click is on any enemy
        if (handleEnemyClick(worldX, worldY)) {
          return;
        }

        // Check if click is on any bonus box
        if (handleBonusBoxClick(worldX, worldY)) {
          return;
        }

        // Clicked outside - clear box target
        state.setTargetBonusBoxId(null);

        // Clicked outside enemy or box - check for double-click
        const now = Date.now();
        const isDoubleClick = now - lastOutsideClickTimeRef.current < 300;

        if (isDoubleClick) {
          state.setSelectedEnemyId(null);
          state.setInCombat(false);
          state.setPlayerFiring(false);
          lastOutsideClickTimeRef.current = 0;
        } else {
          lastOutsideClickTimeRef.current = now;
        }
      }
    };

    window.addEventListener('mousedown', handleCanvasClick);
    return () => {
      window.removeEventListener('mousedown', handleCanvasClick);
    };
  }, [app, handleEnemyClick, handleBonusBoxClick]);

  // Keyboard handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();

      if (state.isDead) return;

      if (e.key === 'Escape') {
        state.setPlayerFiring(false);
        state.setInCombat(false);
        state.setSelectedEnemyId(null);
        state.setPlayerFiringRocket(false);
        state.setTargetBonusBoxId(null);
      } else if (e.key === '0' || e.key === 'Digit0') {
        const now = Date.now();
        const timeSinceLastRepair = (now - state.lastRepairTime) / 1000;
        if (!state.inCombat && !hasAggressiveEnemies() && timeSinceLastRepair >= 5 && !state.isRepairing) {
          state.setIsRepairing(true);
        }
      } else if (e.key === '1' || e.key === 'Digit1') {
        if (state.selectedEnemyId && state.enemies.has(state.selectedEnemyId) && !isInSafetyZone() && !state.instaShieldActive) {
          const enemy = state.enemies.get(state.selectedEnemyId);
          if (enemy && !state.deadEnemies.has(state.selectedEnemyId)) {
            state.setInCombat(true);
            state.setPlayerFiring(true);
            state.setSelectedEnemyId(state.selectedEnemyId);
            state.updateEnemy(state.selectedEnemyId, { ...enemy, isEngaged: true });
          }
        }
      } else if (e.key === '2' || e.key === 'Digit2') {
        if (state.selectedEnemyId && state.enemies.has(state.selectedEnemyId) && !isInSafetyZone() && !state.instaShieldActive) {
          const enemy = state.enemies.get(state.selectedEnemyId);
          if (enemy && !state.deadEnemies.has(state.selectedEnemyId)) {
            const now = Date.now();
            const timeSinceLastRocketFire = (now - state.playerLastRocketFireTime) / 1000;
            const currentRocketAmmo = state.rocketAmmo[state.currentRocketType];
            if (currentRocketAmmo > 0 && timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
              state.setInCombat(true);
              state.setSelectedEnemyId(state.selectedEnemyId);
              state.updateEnemy(state.selectedEnemyId, { ...enemy, isEngaged: true });
              state.setPlayerFiringRocket(true);
            }
          }
        }
      } else if (e.key === ' ' || e.key === 'Space') {
        e.preventDefault();
        if (state.selectedEnemyId && state.enemies.has(state.selectedEnemyId) && !isInSafetyZone() && !state.instaShieldActive) {
          const enemy = state.enemies.get(state.selectedEnemyId);
          if (enemy && !state.deadEnemies.has(state.selectedEnemyId)) {
            const now = Date.now();
            const timeSinceLastRocketFire = (now - state.playerLastRocketFireTime) / 1000;
            const currentRocketAmmo = state.rocketAmmo[state.currentRocketType];
            if (currentRocketAmmo > 0 && timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
              if (!state.inCombat) {
                state.setInCombat(true);
                state.setSelectedEnemyId(state.selectedEnemyId);
                state.updateEnemy(state.selectedEnemyId, { ...enemy, isEngaged: true });
                state.setPlayerFiringRocket(true);
              } else {
                state.setPlayerFiringRocket(true);
              }
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Update repair cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const now = Date.now();
      const timeSinceLastRepair = (now - state.lastRepairTime) / 1000;
      state.setRepairCooldown(Math.max(0, 5 - timeSinceLastRepair));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Update rocket cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useGameStore.getState();
      const now = Date.now();
      const timeSinceLastRocketFire = (now - state.playerLastRocketFireTime) / 1000;
      const cooldownDuration = 1 / ROCKET_CONFIG.FIRING_RATE;
      state.setRocketCooldown(Math.max(0, cooldownDuration - timeSinceLastRocketFire));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  // Safety zone messages and combat exit
  useEffect(() => {
    const state = useGameStore.getState();
    const inSafetyZone = isInSafetyZone();

    if (inSafetyZone && state.inCombat) {
      state.setInCombat(false);
      state.setPlayerFiring(false);
    }

    if (inSafetyZone && !prevSafetyZoneRef.current) {
      addMessage('Entered safety zone', 'success');
    } else if (!inSafetyZone && prevSafetyZoneRef.current) {
      addMessage('Left safety zone', 'warning');
    }
    prevSafetyZoneRef.current = inSafetyZone;
  });

  // Combat messages
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.inCombat && !prevInCombatRef.current) {
      addMessage('Combat engaged!', 'combat');
    }
    prevInCombatRef.current = state.inCombat;
  });

  // Repair messages
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.isRepairing && !prevIsRepairingRef.current) {
      addMessage('Repair robot activated', 'info');
    }
    prevIsRepairingRef.current = state.isRepairing;
  });

  // Handle repair completion
  const handleRepairComplete = useCallback(() => {
    const state = useGameStore.getState();
    state.setIsRepairing(false);
    state.setLastRepairTime(Date.now());
    addMessage('Repair completed', 'success');
  }, [addMessage]);

  // Handle gradual healing during repair
  const handleRepairHeal = useCallback((amount: number) => {
    const state = useGameStore.getState();
    state.setPlayerHealth(Math.min(SPARROW_SHIP.hitpoints, state.playerHealth + amount));
  }, []);

  // Detect when player dies
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.playerHealth <= 0 && !state.isDead) {
      state.setIsDead(true);
      state.setDeathPosition({ x: state.shipPosition.x, y: state.shipPosition.y });
      state.setShowDeathWindow(false);
      addMessage('Ship destroyed!', 'error');
      state.setInCombat(false);
      state.setPlayerFiring(false);
      state.setPlayerFiringRocket(false);
      state.setTargetPosition(null);
      state.setSelectedEnemyId(null);
      state.setShipVelocity({ vx: 0, vy: 0 });
    }
  });

  // Handle explosion completion
  const handleExplosionComplete = useCallback(() => {
    setTimeout(() => {
      useGameStore.getState().setShowDeathWindow(true);
    }, 1000);
  }, []);

  // Handle repair on the spot
  const handleRepairOnSpot = useCallback(() => {
    const state = useGameStore.getState();
    if (state.deathPosition) {
      const restoredHealth = Math.floor(SPARROW_SHIP.hitpoints * 0.1);
      state.setPlayerHealth(restoredHealth);
      state.setIsDead(false);
      state.setShowDeathWindow(false);
      addMessage('Ship repaired on the spot', 'success');

      const shieldDuration = 10000;
      const endTime = Date.now() + shieldDuration;
      state.setInstaShieldEndTime(endTime);
      state.setInstaShieldActive(true);
      addMessage('Insta-shield activated for 10 seconds', 'success');

      // Clear all aggressions
      state.enemies.forEach((enemy, enemyId) => {
        if (enemy.health > 0 && !state.deadEnemies.has(enemyId)) {
          state.updateEnemy(enemyId, { ...enemy, isEngaged: false });
        }
      });

      state.setInCombat(false);
      state.setPlayerFiring(false);
      state.setPlayerFiringRocket(false);
      state.setSelectedEnemyId(null);
      state.setTargetPosition(state.deathPosition);
      state.setDeathPosition(null);
    }
  }, [addMessage]);

  // Handle Insta-shield expiration
  useEffect(() => {
    const state = useGameStore.getState();
    if (!state.instaShieldActive) return;

    const checkShield = () => {
      const now = Date.now();
      const currentState = useGameStore.getState();
      if (now >= currentState.instaShieldEndTime) {
        useGameStore.getState().setInstaShieldActive(false);
        addMessage('Insta-shield expired', 'warning');
      }
    };

    const interval = setInterval(checkShield, 100);
    return () => clearInterval(interval);
  }, [addMessage, instaShieldActive]);

  // Cancel repair when entering combat or when any enemy becomes aggressive
  useEffect(() => {
    const state = useGameStore.getState();
    if ((state.inCombat || hasAggressiveEnemies()) && state.isRepairing) {
      state.setIsRepairing(false);
      state.setLastRepairTime(Date.now());
      addMessage('Repair cancelled - combat detected', 'warning');
    }
  });

  // Clear combat state if no engaged enemies remain
  useEffect(() => {
    const state = useGameStore.getState();
    if (state.inCombat) {
      const hasEngagedEnemies = Array.from(state.enemies.values()).some(
        (enemy) => enemy.health > 0 && enemy.isEngaged && !state.deadEnemies.has(enemy.id)
      );
      if (!hasEngagedEnemies) {
        state.setInCombat(false);
        state.setPlayerFiring(false);
        state.setPlayerFiringRocket(false);
      }
    }
  });

  // Helper to consume laser ammo with messages
  const handleLaserAmmoConsume = useCallback(() => {
    const state = useGameStore.getState();
    const currentType = state.currentLaserAmmoType;
    const currentQuantity = state.laserAmmo[currentType];

    if (state.consumeLaserAmmo()) {
      if (currentQuantity === 1) {
        queueMicrotask(() => addMessage(`Laser ammunition ${currentType} depleted!`, 'warning'));
      }
    }
  }, [addMessage]);

  // Helper to consume rocket ammo with messages
  const handleRocketAmmoConsume = useCallback(() => {
    const state = useGameStore.getState();
    const currentType = state.currentRocketType;
    const currentQuantity = state.rocketAmmo[currentType];

    if (state.consumeRocketAmmo()) {
      if (currentQuantity === 1) {
        queueMicrotask(() => addMessage(`Rocket ammunition ${currentType} depleted!`, 'warning'));
      }
    }
  }, [addMessage]);


  const inSafetyZone = isInSafetyZone();
  const currentLaserAmmoQuantity = useGameStore((state) => state.laserAmmo[currentLaserAmmoType]);
  const currentRocketAmmoQuantity = useGameStore((state) => state.rocketAmmo[currentRocketType]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        margin: 0,
        padding: 0,
        position: 'relative',
      }}
    >
      {isDead && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            zIndex: 5000,
            pointerEvents: 'auto',
          }}
        />
      )}
      <TopBar />
      <MessageSystem />
      <ActionBar
        laserAmmo={currentLaserAmmoQuantity}
        rocketAmmo={currentRocketAmmoQuantity}
        rocketCooldown={rocketCooldown}
        repairCooldown={repairCooldown}
        isRepairing={isRepairing}
        onRepairClick={() => {
          const state = useGameStore.getState();
          const now = Date.now();
          const timeSinceLastRepair = (now - state.lastRepairTime) / 1000;
          if (!state.inCombat && !hasAggressiveEnemies() && timeSinceLastRepair >= 5 && !state.isRepairing) {
            state.setIsRepairing(true);
          }
        }}
      />
      {app && cameraContainer && (
        <>
          <Starfield app={app} cameraContainer={cameraContainer} />
          <MarsBackground app={app} cameraContainer={cameraContainer} />
          <Base
            app={app}
            cameraContainer={cameraContainer}
            position={basePosition}
          />
          {enemyList.map(([enemyId, enemyState]) => (
            <Enemy
              key={enemyId}
              app={app}
              cameraContainer={cameraContainer}
              playerPosition={shipPosition}
              enemyState={deadEnemies.has(enemyId) ? null : enemyState}
              onStateUpdate={(state) => handleEnemyStateUpdate(enemyId, state)}
              onPositionUpdate={(pos) => handleEnemyPositionUpdate(enemyId, pos)}
              isDead={deadEnemies.has(enemyId)}
            />
          ))}
          {bonusBoxList.map((box) => (
            <BonusBox
              key={box.id}
              app={app}
              cameraContainer={cameraContainer}
              boxState={box}
              isCollecting={targetBonusBoxId === box.id && Math.sqrt(Math.pow(shipPosition.x - box.x, 2) + Math.pow(shipPosition.y - box.y, 2)) < 50}
            />
          ))}
          <Ship
            app={app}
            cameraContainer={cameraContainer}
            onStateUpdate={handleShipStateUpdate}
            targetPosition={targetPosition}
            onTargetReached={handleTargetReached}
            onEnemyClick={handleEnemyClick}
            onBonusBoxClick={handleBonusBoxClick}
            inCombat={!!(inCombat && selectedEnemyId && !deadEnemies.has(selectedEnemyId))}
            enemyPosition={(() => {
              if (!selectedEnemyId || deadEnemies.has(selectedEnemyId)) {
                return null;
              }
              const enemy = enemies.get(selectedEnemyId);
              if (!enemy || enemy.health <= 0) {
                return null;
              }
              return enemyPositions.get(selectedEnemyId) || null;
            })()}
            isDead={isDead}
          />
          {isDead && deathPosition && (
            <ShipExplosion
              app={app}
              cameraContainer={cameraContainer}
              position={deathPosition}
              active={isDead}
              onComplete={handleExplosionComplete}
            />
          )}
          {isRepairing && app && cameraContainer && (
            <RepairRobot
              app={app}
              cameraContainer={cameraContainer}
              shipPosition={shipPosition}
              onRepairComplete={handleRepairComplete}
              onHealTick={handleRepairHeal}
              playerHealth={playerHealth}
              maxHealth={SPARROW_SHIP.hitpoints}
            />
          )}
          <HPBar
            app={app}
            cameraContainer={cameraContainer}
            position={shipPosition}
            health={playerHealth}
            maxHealth={SPARROW_SHIP.hitpoints}
            visible={true}
            shield={playerShield ?? 0}
            maxShield={playerMaxShield ?? 0}
          />
          {instaShieldActive && (
            <Shield
              app={app}
              cameraContainer={cameraContainer}
              position={shipPosition}
              active={instaShieldActive}
            />
          )}
          {selectedEnemyId && enemies.has(selectedEnemyId) && !deadEnemies.has(selectedEnemyId) && enemyPositions.has(selectedEnemyId) && (() => {
            const enemy = enemies.get(selectedEnemyId);
            const enemyPos = enemyPositions.get(selectedEnemyId);
            if (!enemy || !enemyPos || enemy.health <= 0) return null;
            return (
              <>
                <SelectionCircle
                  key={`selection-${selectedEnemyId}`}
                  app={app}
                  cameraContainer={cameraContainer}
                  position={enemyPos}
                  selected={true}
                  inCombat={!!(inCombat && selectedEnemyId && !deadEnemies.has(selectedEnemyId))}
                />
                <HPBar
                  app={app}
                  cameraContainer={cameraContainer}
                  position={enemyPos}
                  health={enemy.health}
                  maxHealth={enemy.maxHealth}
                  visible={true}
                  shield={enemy.shield ?? 0}
                  maxShield={enemy.maxShield ?? 0}
                />
              </>
            );
          })()}
          {engagedEnemyList.map(([enemyId, enemy]) => (
            <CombatSystem
              key={enemyId}
              app={app}
              cameraContainer={cameraContainer}
              playerPosition={shipPosition}
              playerVelocity={shipVelocity}
              playerRotation={shipRotation}
              playerHealth={playerHealth}
              enemyState={enemy}
              playerFiring={playerFiring && selectedEnemyId === enemyId}
              onPlayerHealthChange={(health) => useGameStore.getState().setPlayerHealth(health)}
              onEnemyHealthChange={(health) => handleEnemyHealthChange(enemyId, health)}
              onEnemyShieldChange={(shield) => {
                const state = useGameStore.getState();
                const enemy = state.enemies.get(enemyId);
                if (enemy) {
                  state.updateEnemy(enemyId, { ...enemy, shield });
                }
              }}
              isInSafetyZone={inSafetyZone}
              laserAmmo={currentLaserAmmoQuantity}
              currentLaserCannon={currentLaserCannon}
              currentLaserAmmoType={currentLaserAmmoType}
              onLaserAmmoConsume={handleLaserAmmoConsume}
              rocketAmmo={currentRocketAmmoQuantity}
              currentRocketType={currentRocketType}
              onRocketAmmoConsume={handleRocketAmmoConsume}
              playerShield={playerShield}
              playerMaxShield={playerMaxShield}
              onPlayerShieldChange={(shield) => useGameStore.getState().setPlayerShield(shield)}
              playerFiringRocket={playerFiringRocket && selectedEnemyId === enemyId}
              onRocketFired={() => {
                if (selectedEnemyId === enemyId) {
                  const state = useGameStore.getState();
                  state.setPlayerFiringRocket(false);
                  state.setPlayerLastRocketFireTime(Date.now());
                }
              }}
              instaShieldActive={instaShieldActive}
              onPlayerDamage={handlePlayerDamage}
              onEnemyDamage={handleEnemyDamage}
              onOutOfRange={(weaponType) => {
                const weaponName = weaponType === 'laser' ? 'Laser' : 'Rocket';
                addMessage(`${weaponName} out of range!`, 'warning');
              }}
            />
          ))}
          {app && cameraContainer && (
            <DamageNumbers
              ref={damageNumbersRef}
              app={app}
              cameraContainer={cameraContainer}
              playerPosition={shipPosition}
            />
          )}
          {inSafetyZone && (
            <div
              style={{
                position: 'fixed',
                top: '190px',
                left: '50%',
                transform: 'translateX(-50%)',
                color: '#ffffff',
                fontFamily: 'monospace',
                fontSize: '16px',
                fontWeight: 'bold',
                zIndex: 1000,
                pointerEvents: 'none',
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
              }}
            >
              Safety Zone - Combat Disabled
            </div>
          )}
          <ShipWindow />
          <StatsWindow />
          <BattleWindow />
          <MinimapWindow
            key={`minimap-${Array.from(deadEnemies).join(',')}`}
            onTargetChange={(pos) => useGameStore.getState().setTargetPosition(pos)}
          />
          <SettingsWindow />
          {isDead && showDeathWindow && (
            <DeathWindow
              onRepairOnSpot={handleRepairOnSpot}
            />
          )}
          <LevelUpAnimation />
        </>
      )}
    </div>
  );
}
