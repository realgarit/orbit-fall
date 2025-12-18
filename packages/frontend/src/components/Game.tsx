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
import { WindowManagerProvider } from '../hooks/useWindowManager';
import { TopBar } from './windows/TopBar';
import { ActionBar } from './windows/ActionBar';
import { StatsWindow } from './windows/StatsWindow';
import { BattleWindow } from './windows/BattleWindow';
import { MinimapWindow } from './windows/MinimapWindow';
import { SettingsWindow } from './windows/SettingsWindow';
import { ShipWindow } from './windows/ShipWindow';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_STATS, BASE_SAFETY_ZONE, ROCKET_CONFIG, ENEMY_STATS } from '@shared/constants';
import type { EnemyState } from '@shared/types';
import '../styles/windows.css';

export function Game() {
  const [app, setApp] = useState<Application | null>(null);
  const [cameraContainer, setCameraContainer] = useState<Container | null>(null);
  const [shipPosition, setShipPosition] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const [shipVelocity, setShipVelocity] = useState({ vx: 0, vy: 0 });
  const [shipRotation, setShipRotation] = useState(0);
  const [fps, setFps] = useState(0);
  
  // Game state for Stats Window
  const [playerHealth, setPlayerHealth] = useState(PLAYER_STATS.MAX_HEALTH);
  
  // Laser ammunition state
  const [laserAmmo, setLaserAmmo] = useState(10000);
  
  // Handle laser ammunition consumption
  const handleLaserAmmoConsume = () => {
    setLaserAmmo((prev) => Math.max(0, prev - 1));
  };
  
  // Rocket ammunition state
  const [rocketAmmo, setRocketAmmo] = useState(100);
  
  // Handle rocket ammunition consumption
  const handleRocketAmmoConsume = () => {
    setRocketAmmo((prev) => Math.max(0, prev - 1));
  };
  
  // Rocket firing state (manual with SPACE key)
  const [playerFiringRocket, setPlayerFiringRocket] = useState(false);
  const playerLastRocketFireTimeRef = useRef(0);
  const [rocketCooldown, setRocketCooldown] = useState(0);
  
  // Enemy state - now supports multiple enemies
  const [enemies, setEnemies] = useState<Map<string, EnemyState>>(new Map());
  const [enemyPositions, setEnemyPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [deadEnemies, setDeadEnemies] = useState<Set<string>>(new Set());
  const [, setEnemyRespawnTimers] = useState<Map<string, number>>(new Map());
  
  // Refs to access latest state in callbacks (avoid stale closures)
  const enemiesRef = useRef(enemies);
  const enemyPositionsRef = useRef(enemyPositions);
  const deadEnemiesRef = useRef(deadEnemies);
  
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
  
  // Exit combat when entering safety zone
  useEffect(() => {
    if (inSafetyZone && inCombat) {
      setInCombat(false);
      setPlayerFiring(false);
      // Don't clear selectedEnemyId - let player keep selection for when they leave
    }
  }, [inSafetyZone, inCombat]);
  
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
    if (!app) return;

    const tickerCallback = () => {
      setFps(app.ticker.FPS);
    };

    app.ticker.add(tickerCallback);
    return () => {
      app.ticker.remove(tickerCallback);
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
        rotation: 0,
        isEngaged: false,
        lastFireTime: 0,
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
      if (existing && existing.isEngaged && !state.isEngaged) {
        // Don't reset isEngaged if it was already engaged
        next.set(enemyId, { ...state, isEngaged: true });
      } else {
        next.set(enemyId, state);
      }
      return next;
    });
    
    // Check if enemy died
    if (state.health <= 0 && !deadEnemies.has(enemyId)) {
      // Get dead enemy's last position before removing it
      const deadEnemyLastPos = enemyPositionsRef.current.get(enemyId);
      
      // Remove position first to ensure enemyPosition prop becomes null immediately
      setEnemyPositions((prev) => {
        const next = new Map(prev);
        next.delete(enemyId);
        return next;
      });
      
      setDeadEnemies((prev) => new Set(prev).add(enemyId));
      
      // Clear enemy's engagement state
      setEnemies((prev) => {
        const next = new Map(prev);
        const enemy = next.get(enemyId);
        if (enemy) {
          next.set(enemyId, { ...enemy, isEngaged: false });
        }
        return next;
      });
      
      // Clear selection and combat if this was the selected enemy
      // Use ref to get latest selectedEnemyId value (avoids stale closure)
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
      setEnemyRespawnTimers((prev) => {
        const next = new Map(prev);
        next.set(enemyId, Date.now() + 3000);
        return next;
      });
    }
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
    setEnemies((prev) => {
      const enemy = prev.get(enemyId);
      if (enemy) {
        const next = new Map(prev);
        next.set(enemyId, { ...enemy, health });
        return next;
      }
      return prev;
    });
  };
  
  // Handle enemy respawn
  useEffect(() => {
    const checkRespawns = () => {
      const now = Date.now();
      setEnemyRespawnTimers((prevTimers) => {
        const next = new Map(prevTimers);
        const toRespawn: string[] = [];
        
        prevTimers.forEach((respawnTime, enemyId) => {
          if (now >= respawnTime) {
            toRespawn.push(enemyId);
            next.delete(enemyId);
          }
        });
        
        if (toRespawn.length > 0) {
          setDeadEnemies((dead) => {
            const nextDead = new Set(dead);
            toRespawn.forEach((id) => nextDead.delete(id));
            return nextDead;
          });
          
          setEnemies((prevEnemies) => {
            const nextEnemies = new Map(prevEnemies);
            toRespawn.forEach((enemyId) => {
              const angle = Math.random() * Math.PI * 2;
              const distance = 200 + Math.random() * 200;
              const spawnX = shipPosition.x + Math.cos(angle) * distance;
              const spawnY = shipPosition.y + Math.sin(angle) * distance;
              
              nextEnemies.set(enemyId, {
                id: enemyId,
                name: ENEMY_STATS.DRIFTER.NAME,
                x: Math.max(0, Math.min(MAP_WIDTH, spawnX)),
                y: Math.max(0, Math.min(MAP_HEIGHT, spawnY)),
                vx: 0,
                vy: 0,
                health: ENEMY_STATS.DRIFTER.MAX_HEALTH,
                maxHealth: ENEMY_STATS.DRIFTER.MAX_HEALTH,
                rotation: 0,
                isEngaged: false,
                lastFireTime: 0,
              });
            });
            return nextEnemies;
          });
        }
        
        return next;
      });
    };
    
    const interval = setInterval(checkRespawns, 100);
    return () => clearInterval(interval);
  }, [shipPosition]);

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
          // Double-click: engage combat (but not if in safety zone)
          if (!isInSafetyZone()) {
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
        if (!inCombatRef.current && timeSinceLastRepair >= 5 && !isRepairing) {
          setIsRepairing(true);
          // Don't update lastRepairTimeRef here - it will be updated when repair completes
        }
      } else if (e.key === '1' || e.key === 'Digit1') {
        // Press "1" to engage combat with selected enemy (same as double-click)
        if (selectedEnemyId && enemies.has(selectedEnemyId) && !isInSafetyZone()) {
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
        if (selectedEnemyId && enemies.has(selectedEnemyId) && !isInSafetyZone()) {
          const enemy = enemies.get(selectedEnemyId);
          if (enemy && !deadEnemies.has(selectedEnemyId)) {
            const now = Date.now();
            const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
            // Check cooldown before allowing fire
            if (rocketAmmo > 0 && timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
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
        if (selectedEnemyId && enemies.has(selectedEnemyId) && !isInSafetyZone()) {
          const enemy = enemies.get(selectedEnemyId);
          if (enemy && !deadEnemies.has(selectedEnemyId)) {
            const now = Date.now();
            const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
            // Check cooldown before allowing fire
            if (rocketAmmo > 0 && timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
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
  }, [selectedEnemyId, enemies, shipPosition, inCombat, rocketAmmo, deadEnemies]);
  
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
  
  // Handle repair completion
  const handleRepairComplete = () => {
    setIsRepairing(false);
    // Update last repair time to now (cooldown starts after repair completes)
    lastRepairTimeRef.current = Date.now();
  };
  
  // Handle gradual healing during repair
  const handleRepairHeal = (amount: number) => {
    setPlayerHealth((prev) => Math.min(PLAYER_STATS.MAX_HEALTH, prev + amount));
  };
  
  // Cancel repair when entering combat
  useEffect(() => {
    if (inCombat && isRepairing) {
      setIsRepairing(false);
      lastRepairTimeRef.current = Date.now();
    }
  }, [inCombat, isRepairing]);
  
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
        }}
      >
        <TopBar />
        <ActionBar 
          laserAmmo={laserAmmo} 
          rocketAmmo={rocketAmmo}
          rocketCooldown={rocketCooldown}
          repairCooldown={repairCooldown}
          isRepairing={isRepairing}
          onRepairClick={() => {
            const now = Date.now();
            const timeSinceLastRepair = (now - lastRepairTimeRef.current) / 1000;
            // Use ref to get latest inCombat value (avoids stale closure)
            if (!inCombatRef.current && timeSinceLastRepair >= 5 && !isRepairing) {
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
              inCombat={inCombat && selectedEnemyId && !deadEnemies.has(selectedEnemyId)}
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
            />
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
              />
            )}
            {/* Player HP Bar */}
            <HPBar
              app={app}
              cameraContainer={cameraContainer}
              position={shipPosition}
              health={playerHealth}
              maxHealth={PLAYER_STATS.MAX_HEALTH}
              visible={true}
            />
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
                    inCombat={inCombat && selectedEnemyId && !deadEnemies.has(selectedEnemyId)}
                  />
                  <HPBar
                    app={app}
                    cameraContainer={cameraContainer}
                    position={enemyPos}
                    health={enemy.health}
                    maxHealth={enemy.maxHealth}
                    visible={true}
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
                  isInSafetyZone={inSafetyZone}
                  laserAmmo={laserAmmo}
                  onLaserAmmoConsume={handleLaserAmmoConsume}
                  rocketAmmo={rocketAmmo}
                  onRocketAmmoConsume={handleRocketAmmoConsume}
                  playerFiringRocket={playerFiringRocket && selectedEnemyId === enemyId}
                  onRocketFired={() => {
                    if (selectedEnemyId === enemyId) {
                      setPlayerFiringRocket(false);
                      playerLastRocketFireTimeRef.current = Date.now();
                    }
                  }}
                />
              ))}
            {/* Safety Zone Message */}
            {inSafetyZone && (
              <div
                style={{
                  position: 'fixed',
                  top: '175px', // Middle between top bar (ends ~42px) and HP bar area (~120px)
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
              maxHealth={PLAYER_STATS.MAX_HEALTH}
            />
            <StatsWindow
              shipPosition={shipPosition}
              shipVelocity={shipVelocity}
              fps={fps}
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
          </>
        )}
      </div>
    </WindowManagerProvider>
  );
}

