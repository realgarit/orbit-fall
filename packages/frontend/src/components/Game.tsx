import { useEffect, useState, useRef } from 'react';
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
import { WindowManagerProvider } from '../hooks/useWindowManager';
import { useMessageSystem } from '../hooks/useMessageSystem';
import { TopBar } from './windows/TopBar';
import { ActionBar } from './windows/ActionBar';
import { StatsWindow } from './windows/StatsWindow';
import { BattleWindow } from './windows/BattleWindow';
import { MinimapWindow } from './windows/MinimapWindow';
import { SettingsWindow } from './windows/SettingsWindow';
import { ShipWindow } from './windows/ShipWindow';
import { DeathWindow } from './windows/DeathWindow';
import { MessageSystem } from './MessageSystem';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_STATS, BASE_SAFETY_ZONE, ROCKET_CONFIG, ENEMY_STATS, SPARROW_SHIP } from '@shared/constants';
import type { EnemyState, LaserAmmoType, LaserCannonType, RocketType } from '@shared/types';
import { getLevelFromExp } from '@shared/utils/leveling';
import '../styles/windows.css';

export function Game() {
  const { addMessage } = useMessageSystem();
  const [app, setApp] = useState<Application | null>(null);
  const [cameraContainer, setCameraContainer] = useState<Container | null>(null);
  const [shipPosition, setShipPosition] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const [shipVelocity, setShipVelocity] = useState({ vx: 0, vy: 0 });
  const [shipRotation, setShipRotation] = useState(0);
  const [fps, setFps] = useState(0);
  
  // Game state for Stats Window
  const [playerHealth, setPlayerHealth] = useState<number>(SPARROW_SHIP.hitpoints);
  const [playerShield, setPlayerShield] = useState<number | undefined>(undefined);
  const [playerMaxShield, _setPlayerMaxShield] = useState<number | undefined>(undefined);
  
  // Player progression stats
  const [playerExperience, setPlayerExperience] = useState(0);
  const playerLevel = getLevelFromExp(playerExperience);
  const [playerCredits, setPlayerCredits] = useState(0);
  const [playerHonor, setPlayerHonor] = useState(0);
  const [playerAetherium, setPlayerAetherium] = useState(0);
  
  // Update level when experience changes
  useEffect(() => {
    const newLevel = getLevelFromExp(playerExperience);
    if (newLevel > 1 && newLevel !== getLevelFromExp(playerExperience - 1)) {
      // Level up detected (handled in reward logic)
    }
  }, [playerExperience]);
  
  // Death state
  const [isDead, setIsDead] = useState(false);
  const [deathPosition, setDeathPosition] = useState<{ x: number; y: number } | null>(null);
  const [showDeathWindow, setShowDeathWindow] = useState(false); // Delay window until explosion completes
  
  // Insta-shield protection after revive
  const [instaShieldActive, setInstaShieldActive] = useState(false);
  const instaShieldEndTimeRef = useRef(0);
  
  // Equipment state
  const [currentLaserCannon, _setCurrentLaserCannon] = useState<LaserCannonType>(PLAYER_STATS.STARTING_LASER_CANNON);
  const [currentLaserAmmoType, _setCurrentLaserAmmoType] = useState<LaserAmmoType>(PLAYER_STATS.STARTING_LASER_AMMO);
  const [currentRocketType, _setCurrentRocketType] = useState<RocketType>(PLAYER_STATS.STARTING_ROCKET);
  
  // Laser ammunition state (by type)
  const [laserAmmo, setLaserAmmo] = useState<Record<LaserAmmoType, number>>({
    'LC-10': 10000,
    'LC-25': 0,
    'LC-50': 0,
    'LC-100': 0,
    'RS-75': 0,
  });
  
  // Handle laser ammunition consumption
  const handleLaserAmmoConsume = () => {
    setLaserAmmo((prev) => {
      const currentType = currentLaserAmmoType;
      const currentQuantity = prev[currentType];
      const newQuantity = Math.max(0, currentQuantity - 1);
      
      if (newQuantity === 0 && currentQuantity > 0) {
        // Defer message to avoid updating state during render
        queueMicrotask(() => addMessage(`Laser ammunition ${currentType} depleted!`, 'warning'));
      }
      
      return {
        ...prev,
        [currentType]: newQuantity,
      };
    });
  };
  
  // Rocket ammunition state (by type)
  const [rocketAmmo, setRocketAmmo] = useState<Record<RocketType, number>>({
    'RT-01': 100,
    'RT-02': 0,
    'RT-03': 0,
    'RT-04': 0,
  });
  
  // Handle rocket ammunition consumption
  const handleRocketAmmoConsume = () => {
    setRocketAmmo((prev) => {
      const currentType = currentRocketType;
      const currentQuantity = prev[currentType];
      const newQuantity = Math.max(0, currentQuantity - 1);
      
      if (newQuantity === 0 && currentQuantity > 0) {
        // Defer message to avoid updating state during render
        queueMicrotask(() => addMessage(`Rocket ammunition ${currentType} depleted!`, 'warning'));
      }
      
      return {
        ...prev,
        [currentType]: newQuantity,
      };
    });
  };
  
  // Get current ammo quantities for display
  const currentLaserAmmoQuantity = laserAmmo[currentLaserAmmoType];
  const currentRocketAmmoQuantity = rocketAmmo[currentRocketType];
  
  // Rocket firing state (manual with SPACE key)
  const [playerFiringRocket, setPlayerFiringRocket] = useState(false);
  const playerLastRocketFireTimeRef = useRef(0);
  const [rocketCooldown, setRocketCooldown] = useState(0);
  
  // Enemy state - now supports multiple enemies
  const [enemies, setEnemies] = useState<Map<string, EnemyState>>(new Map());
  const [enemyPositions, setEnemyPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [deadEnemies, setDeadEnemies] = useState<Set<string>>(new Set());
  
  // Refs to access latest state in callbacks (avoid stale closures)
  const enemiesRef = useRef(enemies);
  const enemyPositionsRef = useRef(enemyPositions);
  const deadEnemiesRef = useRef(deadEnemies);
  const enemyRespawnTimersRef = useRef<Map<string, number>>(new Map());
  const shipPositionRef = useRef(shipPosition);
  
  // Keep refs in sync with state
  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);
  
  useEffect(() => {
    enemyPositionsRef.current = enemyPositions;
  }, [enemyPositions]);
  
  useEffect(() => {
    deadEnemiesRef.current = deadEnemies;
  }, [deadEnemies]);
  
  useEffect(() => {
    shipPositionRef.current = shipPosition;
  }, [shipPosition]);
  
  // Selection and combat state
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [inCombat, setInCombat] = useState(false);
  const [playerFiring, setPlayerFiring] = useState(false);
  
  // Refs to track state for immediate updates in callbacks (avoid stale closures)
  const inCombatRef = useRef(false);
  const selectedEnemyIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    inCombatRef.current = inCombat;
  }, [inCombat]);
  
  useEffect(() => {
    selectedEnemyIdRef.current = selectedEnemyId;
  }, [selectedEnemyId]);
  
  // Repair system state
  const [isRepairing, setIsRepairing] = useState(false);
  const [repairCooldown, setRepairCooldown] = useState(0);
  const lastRepairTimeRef = useRef(0);
  
  // Minimap auto-fly target
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Base position (top left of map)
  const basePosition = { x: 200, y: 200 };
  
  // Check if player is in safety zone
  const isInSafetyZone = () => {
    const dx = shipPosition.x - basePosition.x;
    const dy = shipPosition.y - basePosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < BASE_SAFETY_ZONE.RADIUS;
  };
  
  const inSafetyZone = isInSafetyZone();

  // Check if any enemy is engaged/aggressive
  const hasAggressiveEnemies = () => {
    return Array.from(enemies.values()).some(
      (enemy) => enemy.health > 0 && enemy.isEngaged && !deadEnemies.has(enemy.id)
    );
  };
  
  // Track previous safety zone state for messages
  const prevSafetyZoneRef = useRef(inSafetyZone);
  
  // Exit combat when entering safety zone
  useEffect(() => {
    if (inSafetyZone && inCombat) {
      setInCombat(false);
      setPlayerFiring(false);
      // Don't clear selectedEnemyId - let player keep selection for when they leave
    }
    
    // Safety zone entry/exit messages
    if (inSafetyZone && !prevSafetyZoneRef.current) {
      addMessage('Entered safety zone', 'success');
    } else if (!inSafetyZone && prevSafetyZoneRef.current) {
      addMessage('Left safety zone', 'warning');
    }
    prevSafetyZoneRef.current = inSafetyZone;
  }, [inSafetyZone, inCombat, addMessage]);
  
  // Track previous combat state for messages
  const prevInCombatRef = useRef(inCombat);
  
  // Combat start message
  useEffect(() => {
    if (inCombat && !prevInCombatRef.current) {
      addMessage('Combat engaged!', 'combat');
    }
    prevInCombatRef.current = inCombat;
  }, [inCombat, addMessage]);
  
  // Double-click detection
  const lastClickTimeRef = useRef(0);
  const lastClickEnemyIdRef = useRef<string | null>(null);
  const lastOutsideClickTimeRef = useRef(0);
  const { containerRef } = usePixiApp({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    onAppReady: (app) => {
      setApp(app);
      // Create camera container for world space
      const worldContainer = new Container();
      app.stage.addChild(worldContainer);
      setCameraContainer(worldContainer);
    },
  });

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
        setFps(app.ticker.FPS);
      }
    };

    app.ticker.add(tickerCallback);
    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
    };
  }, [app]);

  // Handle ship state updates
  const handleShipStateUpdate = (position: { x: number; y: number }, velocity: { vx: number; vy: number }, rotation?: number) => {
    setShipPosition(position);
    setShipVelocity(velocity);
    if (rotation !== undefined) {
      setShipRotation(rotation);
    }
  };

  // Initialize 4 enemies on mount
  useEffect(() => {
    const initialEnemies = new Map<string, EnemyState>();
    for (let i = 1; i <= 4; i++) {
      const enemyId = `drifter-${i}`;
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 200;
      const spawnX = shipPosition.x + Math.cos(angle) * distance;
      const spawnY = shipPosition.y + Math.sin(angle) * distance;
      
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
    setEnemies(initialEnemies);
  }, []); // Only run once on mount

  // Handle enemy state updates
  const handleEnemyStateUpdate = (enemyId: string, state: EnemyState) => {
    setEnemies((prev) => {
      const next = new Map(prev);
      const existing = prev.get(enemyId);
      // Preserve isEngaged state if it was already set to true
      // Also preserve shield values if they exist in existing state
      if (existing && existing.isEngaged && !state.isEngaged) {
        // Don't reset isEngaged if it was already engaged
        // Preserve shield values from existing state if not provided in new state
        next.set(enemyId, { 
          ...state, 
          isEngaged: true,
          shield: state.shield ?? existing.shield,
          maxShield: state.maxShield ?? existing.maxShield,
        });
      } else {
        // Preserve shield values from existing state if not provided in new state
        next.set(enemyId, {
          ...state,
          shield: state.shield ?? existing?.shield,
          maxShield: state.maxShield ?? existing?.maxShield,
        });
      }
      return next;
    });
  };

  const handleEnemyPositionUpdate = (enemyId: string, position: { x: number; y: number }) => {
    // Use ref to check latest deadEnemies state (avoids stale closure)
    if (deadEnemiesRef.current.has(enemyId)) {
      // Enemy is dead, ensure position is removed (defensive cleanup)
      setEnemyPositions((prev) => {
        if (!prev.has(enemyId)) return prev; // Already removed
        const next = new Map(prev);
        next.delete(enemyId);
        return next;
      });
      return; // Don't update position for dead enemies
    }
    // Enemy is alive, update position
    setEnemyPositions((prev) => {
      const next = new Map(prev);
      next.set(enemyId, position);
      return next;
    });
  };

  // Handle enemy health change
  const handleEnemyHealthChange = (enemyId: string, health: number) => {
    // Check if enemy died before updating state
    const enemyDied = health <= 0 && !deadEnemiesRef.current.has(enemyId);
    
    setEnemies((prev) => {
      const enemy = prev.get(enemyId);
      if (enemy) {
        const next = new Map(prev);
        const updatedEnemy = { ...enemy, health };
        next.set(enemyId, updatedEnemy);
        
        // If enemy died, clear engagement state
        if (enemyDied) {
          next.set(enemyId, { ...updatedEnemy, isEngaged: false });
        }
        
        return next;
      }
      return prev;
    });
    
    // Handle enemy death rewards and cleanup outside of setEnemies callback
    if (enemyDied) {
      // Mark as dead immediately to prevent duplicate messages if called multiple times
      deadEnemiesRef.current.add(enemyId);
      
      // Get dead enemy's last position before removing it
      const deadEnemyLastPos = enemyPositionsRef.current.get(enemyId);
      
      // Award rewards - moved outside setEnemies to ensure proper state updates
      const reward = ENEMY_STATS.DRIFTER.REWARD;
      setPlayerExperience((prevExp) => {
        const newExp = prevExp + reward.experience;
        // Check for level up
        const oldLevel = getLevelFromExp(prevExp);
        const newLevel = getLevelFromExp(newExp);
        if (newLevel > oldLevel) {
          queueMicrotask(() => addMessage(`Level up! You are now level ${newLevel}!`, 'success'));
        }
        return newExp;
      });
      setPlayerCredits((prev) => prev + reward.credits);
      setPlayerHonor((prev) => prev + reward.honor);
      setPlayerAetherium((prev) => prev + reward.aetherium);
      
      // Defer message to avoid updating state during render
      queueMicrotask(() => addMessage(
        `Enemy destroyed! +${reward.experience} Exp, +${reward.credits} Credits, +${reward.honor} Honor, +${reward.aetherium} Aetherium`,
        'combat'
      ));
      
      // Remove position first to ensure enemyPosition prop becomes null immediately
      setEnemyPositions((prevPos) => {
        const nextPos = new Map(prevPos);
        nextPos.delete(enemyId);
        return nextPos;
      });
      
      setDeadEnemies((prevDead) => new Set(prevDead).add(enemyId));
      
      // Clear selection and combat if this was the selected enemy
      if (selectedEnemyIdRef.current === enemyId) {
        setInCombat(false);
        setPlayerFiring(false);
        setPlayerFiringRocket(false);
        inCombatRef.current = false;
        setSelectedEnemyId(null);
        setTargetPosition(null);
      }
      
      // Clear targetPosition if it's near where the dead enemy was
      if (deadEnemyLastPos) {
        setTargetPosition((currentTarget) => {
          if (!currentTarget) return null;
          const dx = currentTarget.x - deadEnemyLastPos.x;
          const dy = currentTarget.y - deadEnemyLastPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          return distance < 100 ? null : currentTarget;
        });
      }
      
      // Schedule respawn after 3 seconds
      const respawnTime = Date.now() + 3000;
      enemyRespawnTimersRef.current.set(enemyId, respawnTime);
    }
  };
  
  // Handle enemy respawn
  useEffect(() => {
    const checkRespawns = () => {
      const now = Date.now();
      const timers = enemyRespawnTimersRef.current;
      const toRespawn: string[] = [];
      
      timers.forEach((respawnTime, enemyId) => {
        if (now >= respawnTime) {
          toRespawn.push(enemyId);
          timers.delete(enemyId);
        }
      });
      
      if (toRespawn.length > 0) {
        addMessage(`${toRespawn.length} Drifter${toRespawn.length > 1 ? 's' : ''} respawned`, 'warning');
        
        // Remove from deadEnemies and update ref immediately
        setDeadEnemies((dead) => {
          const nextDead = new Set(dead);
          toRespawn.forEach((id) => nextDead.delete(id));
          return nextDead;
        });
        // Update ref immediately so handleEnemyPositionUpdate works right away
        toRespawn.forEach((id) => {
          deadEnemiesRef.current.delete(id);
        });
        
        setEnemies((prevEnemies) => {
          const nextEnemies = new Map(prevEnemies);
          toRespawn.forEach((enemyId) => {
            const angle = Math.random() * Math.PI * 2;
            const distance = 200 + Math.random() * 200;
            const currentShipPos = shipPositionRef.current;
            const spawnX = currentShipPos.x + Math.cos(angle) * distance;
            const spawnY = currentShipPos.y + Math.sin(angle) * distance;
            
            const newEnemyState = {
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
            nextEnemies.set(enemyId, newEnemyState);
            
            // Also update position immediately so Enemy component can use it
            setEnemyPositions((prev) => {
              const next = new Map(prev);
              next.set(enemyId, { x: newEnemyState.x, y: newEnemyState.y });
              return next;
            });
          });
          return nextEnemies;
        });
      }
    };
    
    const interval = setInterval(checkRespawns, 100);
    return () => clearInterval(interval);
  }, [addMessage]);

  // Handle enemy click detection (called from Ship component)
  // Use refs to access latest state and avoid stale closures
  const handleEnemyClick = (worldX: number, worldY: number): boolean => {
    // Use refs to get latest state (avoids stale closure issues)
    const currentPositions = enemyPositionsRef.current;
    const currentDead = deadEnemiesRef.current;
    const currentEnemies = enemiesRef.current;
    
    // Check all enemies for click
    for (const [enemyId, enemyPos] of currentPositions.entries()) {
      // Skip dead enemies - use ref to get latest state
      if (currentDead.has(enemyId)) continue;
      
      const dx = worldX - enemyPos.x;
      const dy = worldY - enemyPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const clickRadius = 30; // Click detection radius
      
      if (distance < clickRadius) {
        const enemy = currentEnemies.get(enemyId);
        // Double-check enemy exists and is alive
        if (!enemy || enemy.health <= 0) continue;
        
        const now = Date.now();
        const isDoubleClick = 
          now - lastClickTimeRef.current < 300 && 
          lastClickEnemyIdRef.current === enemyId;
        
        if (isDoubleClick) {
          // Double-click: engage combat (but not if in safety zone or Insta-shield active)
          if (!isInSafetyZone() && !instaShieldActive) {
            setInCombat(true);
            setPlayerFiring(true);
            setSelectedEnemyId(enemyId);
            setEnemies((prev) => {
              const next = new Map(prev);
              const updated = next.get(enemyId);
              if (updated) {
                next.set(enemyId, { ...updated, isEngaged: true });
              }
              return next;
            });
          }
          lastClickTimeRef.current = 0; // Reset
          lastClickEnemyIdRef.current = null;
        } else {
          // Single click: select enemy
          setSelectedEnemyId(enemyId);
          lastClickTimeRef.current = now;
          lastClickEnemyIdRef.current = enemyId;
        }
        return true; // Click was on enemy, prevent ship movement
      }
    }
    return false;
  };

  // Clear minimap target when ship reports it reached
  const handleTargetReached = () => {
    setTargetPosition(null);
  };

  // Clicking on the main game canvas (outside windows / minimap) cancels auto-fly
  // Only double-click outside clears selection/combat, single click does nothing
  useEffect(() => {
    if (!app) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isWindowClick = target.closest('.game-window') !== null;
      const canvas = app.canvas as HTMLCanvasElement;

      if (canvas && (target === canvas || canvas.contains(target)) && !isWindowClick) {
        setTargetPosition(null);
        
        // Check if clicking on empty space (not on enemy)
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        // Convert screen to world coordinates
        const cameraX = -shipPosition.x + app.screen.width / 2;
        const cameraY = -shipPosition.y + app.screen.height / 2;
        const worldX = clickX - cameraX;
        const worldY = clickY - cameraY;
        
        // Check if click is on any enemy (use refs for latest state)
        for (const [enemyId, enemyPos] of enemyPositionsRef.current.entries()) {
          if (deadEnemiesRef.current.has(enemyId)) continue;
          const dx = worldX - enemyPos.x;
          const dy = worldY - enemyPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 30) {
            // Clicked on enemy, don't clear selection
            return;
          }
        }
        
        // Clicked outside enemy - check for double-click
        const now = Date.now();
        const isDoubleClick = now - lastOutsideClickTimeRef.current < 300;
        
        if (isDoubleClick) {
          // Double-click outside: clear selection and player combat state
          // Enemy remains engaged/aggressive if it was already engaged - don't clear isEngaged
          setSelectedEnemyId(null);
          setInCombat(false);
          setPlayerFiring(false);
          lastOutsideClickTimeRef.current = 0;
        } else {
          // Single click outside: do nothing (selection persists)
          lastOutsideClickTimeRef.current = now;
        }
      }
    };

    // Use normal phase (not capture) so enemy clicks are handled first
    window.addEventListener('mousedown', handleCanvasClick);
    return () => {
      window.removeEventListener('mousedown', handleCanvasClick);
    };
  }, [app, shipPosition, enemyPositions, enemies, deadEnemies]);

  // Keyboard handler for ESC, "1" key, "2" key, and SPACE key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block all keyboard input when dead
      if (isDead) {
        return;
      }
      
      if (e.key === 'Escape') {
        // ESC exits player combat state but does not pacify the enemy.
        // Enemy remains engaged and will continue firing
        setPlayerFiring(false);
        setInCombat(false);
        setSelectedEnemyId(null);
        setPlayerFiringRocket(false);
      } else if (e.key === '0' || e.key === 'Digit0') {
        // Press "0" to activate repair
        const now = Date.now();
        const timeSinceLastRepair = (now - lastRepairTimeRef.current) / 1000;
        // Use ref to get latest inCombat value (avoids stale closure)
        // Also check if any enemy is engaged/aggressive - can't repair if enemy is aggressive
        if (!inCombatRef.current && !hasAggressiveEnemies() && timeSinceLastRepair >= 5 && !isRepairing) {
          setIsRepairing(true);
          // Don't update lastRepairTimeRef here - it will be updated when repair completes
        }
      } else if (e.key === '1' || e.key === 'Digit1') {
        // Press "1" to engage combat with selected enemy (same as double-click)
        if (selectedEnemyId && enemies.has(selectedEnemyId) && !isInSafetyZone() && !instaShieldActive) {
          const enemy = enemies.get(selectedEnemyId);
          if (enemy && !deadEnemies.has(selectedEnemyId)) {
            setInCombat(true);
            setPlayerFiring(true);
            setSelectedEnemyId(selectedEnemyId);
            setEnemies((prev) => {
              const next = new Map(prev);
              const updated = next.get(selectedEnemyId);
              if (updated) {
                next.set(selectedEnemyId, { ...updated, isEngaged: true });
              }
              return next;
            });
          }
        }
      } else if (e.key === '2' || e.key === 'Digit2') {
        // Press "2" to engage combat and fire rockets with selected enemy
        if (selectedEnemyId && enemies.has(selectedEnemyId) && !isInSafetyZone() && !instaShieldActive) {
          const enemy = enemies.get(selectedEnemyId);
          if (enemy && !deadEnemies.has(selectedEnemyId)) {
            const now = Date.now();
            const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
            // Check cooldown before allowing fire
            if (currentRocketAmmoQuantity > 0 && timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
              setInCombat(true);
              setSelectedEnemyId(selectedEnemyId);
              setEnemies((prev) => {
                const next = new Map(prev);
                const updated = next.get(selectedEnemyId);
                if (updated) {
                  next.set(selectedEnemyId, { ...updated, isEngaged: true });
                }
                return next;
              });
              setPlayerFiringRocket(true);
            }
          }
        }
      } else if (e.key === ' ' || e.key === 'Space') {
        // SPACE key: engage combat and fire rocket immediately (if not in combat) or fire rocket (if already in combat)
        e.preventDefault(); // Prevent page scroll
        if (selectedEnemyId && enemies.has(selectedEnemyId) && !isInSafetyZone() && !instaShieldActive) {
          const enemy = enemies.get(selectedEnemyId);
          if (enemy && !deadEnemies.has(selectedEnemyId)) {
            const now = Date.now();
            const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
            // Check cooldown before allowing fire
            if (currentRocketAmmoQuantity > 0 && timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
              if (!inCombat) {
                // Not in combat: engage combat and fire rocket immediately
                setInCombat(true);
                setSelectedEnemyId(selectedEnemyId);
                setEnemies((prev) => {
                  const next = new Map(prev);
                  const updated = next.get(selectedEnemyId);
                  if (updated) {
                    next.set(selectedEnemyId, { ...updated, isEngaged: true });
                  }
                  return next;
                });
                setPlayerFiringRocket(true);
              } else {
                // Already in combat: fire rockets manually
                setPlayerFiringRocket(true);
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
  }, [selectedEnemyId, enemies, shipPosition, inCombat, currentRocketAmmoQuantity, deadEnemies, isDead, instaShieldActive]);
  
  // Update repair cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastRepair = (now - lastRepairTimeRef.current) / 1000;
      setRepairCooldown(Math.max(0, 5 - timeSinceLastRepair));
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  // Update rocket cooldown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
      const cooldownDuration = 1 / ROCKET_CONFIG.FIRING_RATE; // 3 seconds
      setRocketCooldown(Math.max(0, cooldownDuration - timeSinceLastRocketFire));
    }, 100);
    return () => clearInterval(interval);
  }, []);
  
  // Track previous repair state for messages
  const prevIsRepairingRef = useRef(isRepairing);
  
  // Repair start message
  useEffect(() => {
    if (isRepairing && !prevIsRepairingRef.current) {
      addMessage('Repair robot activated', 'info');
    }
    prevIsRepairingRef.current = isRepairing;
  }, [isRepairing, addMessage]);
  
  // Handle repair completion
  const handleRepairComplete = () => {
    setIsRepairing(false);
    addMessage('Repair completed', 'success');
    // Update last repair time to now (cooldown starts after repair completes)
    lastRepairTimeRef.current = Date.now();
  };
  
  // Handle gradual healing during repair
  const handleRepairHeal = (amount: number) => {
    setPlayerHealth((prev) => Math.min(SPARROW_SHIP.hitpoints, prev + amount));
  };
  
  // Detect when player dies
  useEffect(() => {
    if (playerHealth <= 0 && !isDead) {
      setIsDead(true);
      setDeathPosition({ x: shipPosition.x, y: shipPosition.y });
      setShowDeathWindow(false); // Don't show window yet - wait for explosion
      addMessage('Ship destroyed!', 'error');
      // Stop all combat and movement immediately
      setInCombat(false);
      setPlayerFiring(false);
      setPlayerFiringRocket(false);
      setTargetPosition(null);
      // Clear any selected enemy
      setSelectedEnemyId(null);
      // Stop ship velocity immediately
      setShipVelocity({ vx: 0, vy: 0 });
    }
  }, [playerHealth, isDead, shipPosition, addMessage]);
  
  // Handle explosion completion - show death window after a short delay
  const handleExplosionComplete = () => {
    // Wait 1 second before showing the death window after explosion completes
    setTimeout(() => {
      setShowDeathWindow(true);
    }, 1000);
  };
  
  // Handle repair on the spot
  const handleRepairOnSpot = () => {
    if (deathPosition) {
      // Restore 10% of base HP
      const restoredHealth = Math.floor(SPARROW_SHIP.hitpoints * 0.1);
      setPlayerHealth(restoredHealth);
      setIsDead(false);
      setShowDeathWindow(false); // Hide death window
      addMessage('Ship repaired on the spot', 'success');
      
      // Activate Insta-shield for 10 seconds
      const shieldDuration = 10000; // 10 seconds in milliseconds
      const endTime = Date.now() + shieldDuration;
      instaShieldEndTimeRef.current = endTime;
      setInstaShieldActive(true);
      addMessage('Insta-shield activated for 10 seconds', 'success');
      
      // Clear all aggressions - set all enemies to not engaged
      setEnemies((prev) => {
        const next = new Map(prev);
        prev.forEach((enemy, enemyId) => {
          if (enemy.health > 0 && !deadEnemies.has(enemyId)) {
            next.set(enemyId, { ...enemy, isEngaged: false });
          }
        });
        return next;
      });
      
      // Clear all combat states
      setInCombat(false);
      setPlayerFiring(false);
      setPlayerFiringRocket(false);
      setSelectedEnemyId(null);
      inCombatRef.current = false;
      
      // Return to death position
      // Note: We can't directly set ship position, but we can set a target
      // The ship will auto-fly there
      setTargetPosition(deathPosition);
      setDeathPosition(null);
    }
  };
  
  // Handle Insta-shield expiration
  useEffect(() => {
    if (!instaShieldActive) return;
    
    const checkShield = () => {
      const now = Date.now();
      if (now >= instaShieldEndTimeRef.current) {
        setInstaShieldActive(false);
        addMessage('Insta-shield expired', 'warning');
      }
    };
    
    const interval = setInterval(checkShield, 100);
    return () => clearInterval(interval);
  }, [instaShieldActive, addMessage]);
  
  // Cancel repair when entering combat or when any enemy becomes aggressive
  useEffect(() => {
    if ((inCombat || hasAggressiveEnemies()) && isRepairing) {
      setIsRepairing(false);
      addMessage('Repair cancelled - combat detected', 'warning');
      lastRepairTimeRef.current = Date.now();
    }
  }, [inCombat, isRepairing, enemies, deadEnemies, addMessage]);
  
  // Clear combat state if no engaged enemies remain
  useEffect(() => {
    if (inCombat) {
      const hasEngagedEnemies = Array.from(enemies.values()).some(
        (enemy) => enemy.health > 0 && enemy.isEngaged && !deadEnemies.has(enemy.id)
      );
      if (!hasEngagedEnemies) {
        // No engaged enemies left, clear combat state
        setInCombat(false);
        setPlayerFiring(false);
        setPlayerFiringRocket(false);
        inCombatRef.current = false;
      }
    }
  }, [enemies, deadEnemies, inCombat]);

  return (
    <WindowManagerProvider>
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
        {/* Death Overlay - darkened screen that blocks interactions */}
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
            const now = Date.now();
            const timeSinceLastRepair = (now - lastRepairTimeRef.current) / 1000;
            // Use ref to get latest inCombat value (avoids stale closure)
            // Also check if any enemy is engaged/aggressive - can't repair if enemy is aggressive
            if (!inCombatRef.current && !hasAggressiveEnemies() && timeSinceLastRepair >= 5 && !isRepairing) {
              setIsRepairing(true);
              // Don't update lastRepairTimeRef here - it will be updated when repair completes
            }
          }}
        />
        {app && cameraContainer && (
          <>
            <MarsBackground app={app} cameraContainer={cameraContainer} />
            <Starfield app={app} cameraContainer={cameraContainer} />
            <Base
              app={app}
              cameraContainer={cameraContainer}
              position={basePosition}
            />
            <Ship
              app={app}
              cameraContainer={cameraContainer}
              onStateUpdate={handleShipStateUpdate}
              targetPosition={targetPosition}
              onTargetReached={handleTargetReached}
              onEnemyClick={handleEnemyClick}
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
            {/* Ship Explosion */}
            {isDead && deathPosition && (
              <ShipExplosion
                app={app}
                cameraContainer={cameraContainer}
                position={deathPosition}
                active={isDead}
                onComplete={handleExplosionComplete}
              />
            )}
            {/* Render all enemies */}
            {Array.from(enemies.entries()).map(([enemyId, enemyState]) => (
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
            {/* Repair Robot */}
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
            {/* Player HP Bar */}
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
            {/* Insta-Shield Visual Effect */}
            {instaShieldActive && (
              <Shield
                app={app}
                cameraContainer={cameraContainer}
                position={shipPosition}
                active={instaShieldActive}
              />
            )}
            {/* Enemy Selection Circle and HP Bar (HP bar must be after circle for z-order) */}
            {selectedEnemyId && enemies.has(selectedEnemyId) && !deadEnemies.has(selectedEnemyId) && enemyPositions.has(selectedEnemyId) && (() => {
              const enemy = enemies.get(selectedEnemyId);
              const enemyPos = enemyPositions.get(selectedEnemyId);
              // Double-check enemy is alive and position exists
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
            {/* Combat System - for all engaged enemies (not just selected) */}
            {Array.from(enemies.entries())
              .filter(([enemyId, enemy]) => 
                !deadEnemies.has(enemyId) && 
                enemy.health > 0 && 
                enemy.isEngaged
              )
              .map(([enemyId, enemy]) => (
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
                  onPlayerHealthChange={setPlayerHealth}
                  onEnemyHealthChange={(health) => handleEnemyHealthChange(enemyId, health)}
                  onEnemyShieldChange={(shield) => {
                    setEnemies((prev) => {
                      const enemy = prev.get(enemyId);
                      if (enemy) {
                        const next = new Map(prev);
                        next.set(enemyId, { ...enemy, shield });
                        return next;
                      }
                      return prev;
                    });
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
                  onPlayerShieldChange={setPlayerShield}
                  playerFiringRocket={playerFiringRocket && selectedEnemyId === enemyId}
                  onRocketFired={() => {
                    if (selectedEnemyId === enemyId) {
                      setPlayerFiringRocket(false);
                      playerLastRocketFireTimeRef.current = Date.now();
                    }
                  }}
                  instaShieldActive={instaShieldActive}
                />
              ))}
            {/* Safety Zone Message */}
            {inSafetyZone && (
              <div
                style={{
                  position: 'fixed',
                  top: '190px', // Middle between top bar (ends ~42px) and HP bar area (~120px)
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
            <ShipWindow
              playerHealth={playerHealth}
              maxHealth={SPARROW_SHIP.hitpoints}
              playerShield={playerShield}
              playerMaxShield={playerMaxShield}
              currentLaserCannon={currentLaserCannon}
              currentLaserAmmo={currentLaserAmmoType}
              currentRocket={currentRocketType}
            />
            <StatsWindow
              shipPosition={shipPosition}
              shipVelocity={shipVelocity}
              fps={fps}
              playerLevel={playerLevel}
              playerExperience={playerExperience}
              playerCredits={playerCredits}
              playerHonor={playerHonor}
              playerAetherium={playerAetherium}
            />
            <BattleWindow
              selectedEnemy={selectedEnemyId && enemies.has(selectedEnemyId) && !deadEnemies.has(selectedEnemyId) ? (() => {
                const enemy = enemies.get(selectedEnemyId);
                // Double-check enemy exists and is alive
                if (!enemy || enemy.health <= 0) return null;
                return {
                  name: enemy.name,
                  health: enemy.health,
                  maxHealth: enemy.maxHealth,
                  shield: enemy.shield,
                  maxShield: enemy.maxShield,
                };
              })() : null}
              inCombat={(() => {
                // Only show in combat if we have a selected enemy that is alive
                if (!selectedEnemyId || !enemies.has(selectedEnemyId) || deadEnemies.has(selectedEnemyId)) {
                  return false;
                }
                const enemy = enemies.get(selectedEnemyId);
                return inCombat && enemy !== undefined && enemy.health > 0;
              })()}
            />
            <MinimapWindow
              key={`minimap-${Array.from(deadEnemies).join(',')}`}
              playerPosition={shipPosition}
              targetPosition={targetPosition}
              onTargetChange={setTargetPosition}
              enemyPositions={(() => {
                // Filter out dead enemies and ensure positions are valid
                // Create a new array each time to ensure React detects changes
                const alivePositions: { x: number; y: number }[] = [];
                for (const [enemyId, position] of enemyPositions.entries()) {
                  if (!deadEnemies.has(enemyId) && enemies.has(enemyId)) {
                    const enemy = enemies.get(enemyId);
                    // Double-check enemy is alive
                    if (enemy && enemy.health > 0 && position) {
                      alivePositions.push({ ...position }); // Create new object to ensure reference change
                    }
                  }
                }
                return alivePositions;
              })()}
              basePosition={basePosition}
            />
            <SettingsWindow />
            {/* Death Window - shown when player is dead and explosion is complete */}
            {isDead && showDeathWindow && (
              <DeathWindow
                onRepairOnSpot={handleRepairOnSpot}
              />
            )}
          </>
        )}
      </div>
    </WindowManagerProvider>
  );
}

