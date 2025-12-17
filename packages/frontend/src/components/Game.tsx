import { useEffect, useState } from 'react';
import { Application, Container } from 'pixi.js';
import { usePixiApp } from '../hooks/usePixiApp';
import { Starfield } from './Starfield';
import { Ship } from './Ship';
import { WindowManagerProvider } from '../hooks/useWindowManager';
import { TopBar } from './windows/TopBar';
import { StatsWindow } from './windows/StatsWindow';
import { MAP_WIDTH, MAP_HEIGHT, PLAYER_STATS } from '@shared/constants';
import '../styles/windows.css';

export function Game() {
  const [app, setApp] = useState<Application | null>(null);
  const [cameraContainer, setCameraContainer] = useState<Container | null>(null);
  const [shipPosition, setShipPosition] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const [shipVelocity, setShipVelocity] = useState({ vx: 0, vy: 0 });
  const [fps, setFps] = useState(0);
  
  // Game state for Stats Window
  const [playerHealth, setPlayerHealth] = useState(PLAYER_STATS.MAX_HEALTH);
  const [selectedEnemy, setSelectedEnemy] = useState<{
    name: string;
    health?: number;
    maxHealth?: number;
  } | null>(null);
  const [inCombat, setInCombat] = useState(false);
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
            <Ship app={app} cameraContainer={cameraContainer} onStateUpdate={handleShipStateUpdate} />
            <StatsWindow
              playerHealth={playerHealth}
              maxHealth={PLAYER_STATS.MAX_HEALTH}
              shipPosition={shipPosition}
              shipVelocity={shipVelocity}
              fps={fps}
              selectedEnemy={selectedEnemy}
              inCombat={inCombat}
            />
          </>
        )}
      </div>
    </WindowManagerProvider>
  );
}

