import { useEffect, useState } from 'react';
import { Application, Container } from 'pixi.js';
import { usePixiApp } from '../hooks/usePixiApp';
import { Starfield } from './Starfield';
import { Ship } from './Ship';
import { WindowManagerProvider } from '../hooks/useWindowManager';
import { TopBar } from './windows/TopBar';
import { StatsWindow } from './windows/StatsWindow';
import { MinimapWindow } from './windows/MinimapWindow';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_STATS } from '@shared/constants';
import '../styles/windows.css';

export function Game() {
  const [app, setApp] = useState<Application | null>(null);
  const [cameraContainer, setCameraContainer] = useState<Container | null>(null);
  const [shipPosition, setShipPosition] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const [shipVelocity, setShipVelocity] = useState({ vx: 0, vy: 0 });
  const [fps, setFps] = useState(0);
  
  // Game state for Stats Window
  const [playerHealth] = useState(PLAYER_STATS.MAX_HEALTH);
  const [selectedEnemy] = useState<{
    name: string;
    health?: number;
    maxHealth?: number;
  } | null>(null);
  const [inCombat] = useState(false);
  // Minimap auto-fly target
  const [targetPosition, setTargetPosition] = useState<{ x: number; y: number } | null>(null);
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
  const handleShipStateUpdate = (position: { x: number; y: number }, velocity: { vx: number; vy: number }) => {
    setShipPosition(position);
    setShipVelocity(velocity);
  };

  // Clear minimap target when ship reports it reached
  const handleTargetReached = () => {
    setTargetPosition(null);
  };

  // Clicking on the main game canvas (outside windows / minimap) cancels auto-fly
  useEffect(() => {
    if (!app) return;

    const handleCanvasClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isWindowClick = target.closest('.game-window') !== null;
      const canvas = app.canvas as HTMLCanvasElement;

      if (canvas && (target === canvas || canvas.contains(target)) && !isWindowClick) {
        setTargetPosition(null);
      }
    };

    window.addEventListener('mousedown', handleCanvasClick, true);
    return () => {
      window.removeEventListener('mousedown', handleCanvasClick, true);
    };
  }, [app]);

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
            />
            <StatsWindow
              playerHealth={playerHealth}
              maxHealth={PLAYER_STATS.MAX_HEALTH}
              shipPosition={shipPosition}
              shipVelocity={shipVelocity}
              fps={fps}
              selectedEnemy={selectedEnemy}
              inCombat={inCombat}
            />
            <MinimapWindow
              playerPosition={shipPosition}
              targetPosition={targetPosition}
              onTargetChange={setTargetPosition}
            />
          </>
        )}
      </div>
    </WindowManagerProvider>
  );
}

