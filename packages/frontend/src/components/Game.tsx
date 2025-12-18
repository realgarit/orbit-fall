import { useEffect, useState, useRef } from 'react';
import { Application, Container } from 'pixi.js';
import { usePixiApp } from '../hooks/usePixiApp';
import { Starfield } from './Starfield';
import { Ship } from './Ship';
import { Enemy } from './Enemy';
import { HPBar } from './HPBar';
import { SelectionCircle } from './SelectionCircle';
import { CombatSystem } from './CombatSystem';
import { WindowManagerProvider } from '../hooks/useWindowManager';
import { TopBar } from './windows/TopBar';
import { StatsWindow } from './windows/StatsWindow';
import { MinimapWindow } from './windows/MinimapWindow';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_STATS } from '@shared/constants';
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
  
  // Enemy state
  const [enemyState, setEnemyState] = useState<EnemyState | null>(null);
  const [enemyPosition, setEnemyPosition] = useState<{ x: number; y: number } | null>(null);
  
  // Selection and combat state
  const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);
  const [inCombat, setInCombat] = useState(false);
  const [playerFiring, setPlayerFiring] = useState(false);
  
  // Minimap auto-fly target
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
  
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

  // Handle enemy state updates
  const handleEnemyStateUpdate = (state: EnemyState) => {
    setEnemyState(state);
  };

  const handleEnemyPositionUpdate = (position: { x: number; y: number }) => {
    setEnemyPosition(position);
  };

  // Handle enemy health change
  const handleEnemyHealthChange = (health: number) => {
    if (enemyState) {
      setEnemyState({ ...enemyState, health });
    }
  };

  // Handle enemy click detection (called from Ship component)
  const handleEnemyClick = (worldX: number, worldY: number): boolean => {
    if (!enemyPosition) return false;
    
    const dx = worldX - enemyPosition.x;
    const dy = worldY - enemyPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clickRadius = 30; // Click detection radius
    
    if (distance < clickRadius && enemyState) {
      const now = Date.now();
      const isDoubleClick = 
        now - lastClickTimeRef.current < 300 && 
        lastClickEnemyIdRef.current === enemyState.id;
      
      if (isDoubleClick) {
        // Double-click: engage combat
        setInCombat(true);
        setPlayerFiring(true);
        setSelectedEnemyId(enemyState.id);
        if (enemyState) {
          setEnemyState({ ...enemyState, isEngaged: true });
        }
        lastClickTimeRef.current = 0; // Reset
        lastClickEnemyIdRef.current = null;
      } else {
        // Single click: select enemy
        setSelectedEnemyId(enemyState.id);
        lastClickTimeRef.current = now;
        lastClickEnemyIdRef.current = enemyState.id;
      }
      return true; // Click was on enemy, prevent ship movement
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
        
        // Check if click is on enemy
        if (enemyPosition) {
          const dx = worldX - enemyPosition.x;
          const dy = worldY - enemyPosition.y;
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
          // Enemy remains engaged/aggressive if it was already engaged.
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
  }, [app, shipPosition, enemyPosition, enemyState]);

  // ESC key handler to clear combat state and red circle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // ESC exits player combat state but does not pacify the enemy.
        setPlayerFiring(false);
        setInCombat(false);
        setSelectedEnemyId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enemyState]);

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
        {app && cameraContainer && (
          <>
            <Starfield app={app} cameraContainer={cameraContainer} />
            <Ship
              app={app}
              cameraContainer={cameraContainer}
              onStateUpdate={handleShipStateUpdate}
              targetPosition={targetPosition}
              onTargetReached={handleTargetReached}
              onEnemyClick={handleEnemyClick}
              inCombat={inCombat}
              enemyPosition={enemyPosition}
            />
            <Enemy
              app={app}
              cameraContainer={cameraContainer}
              playerPosition={shipPosition}
              enemyState={enemyState}
              onStateUpdate={handleEnemyStateUpdate}
              onPositionUpdate={handleEnemyPositionUpdate}
              inCombat={inCombat}
            />
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
            {enemyPosition && enemyState && (
              <>
                <SelectionCircle
                  app={app}
                  cameraContainer={cameraContainer}
                  position={enemyPosition}
                  selected={selectedEnemyId === enemyState.id}
                  inCombat={inCombat && selectedEnemyId === enemyState.id}
                />
                <HPBar
                  app={app}
                  cameraContainer={cameraContainer}
                  position={enemyPosition}
                  health={enemyState.health}
                  maxHealth={enemyState.maxHealth}
                  visible={inCombat}
                />
              </>
            )}
            {/* Combat System */}
            {enemyState && (
              <CombatSystem
                app={app}
                cameraContainer={cameraContainer}
                playerPosition={shipPosition}
                playerVelocity={shipVelocity}
                playerRotation={shipRotation}
                playerHealth={playerHealth}
                enemyState={enemyState}
                playerFiring={playerFiring}
                onPlayerHealthChange={setPlayerHealth}
                onEnemyHealthChange={handleEnemyHealthChange}
              />
            )}
            <StatsWindow
              playerHealth={playerHealth}
              maxHealth={PLAYER_STATS.MAX_HEALTH}
              shipPosition={shipPosition}
              shipVelocity={shipVelocity}
              fps={fps}
              selectedEnemy={enemyState && selectedEnemyId === enemyState.id ? {
                name: enemyState.name,
                health: enemyState.health,
                maxHealth: enemyState.maxHealth,
              } : null}
              inCombat={inCombat}
            />
            <MinimapWindow
              playerPosition={shipPosition}
              targetPosition={targetPosition}
              onTargetChange={setTargetPosition}
              enemyPosition={enemyPosition}
            />
          </>
        )}
      </div>
    </WindowManagerProvider>
  );
}

