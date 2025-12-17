import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { SHIP_SPEED } from '@shared/constants';

interface ShipProps {
  app: Application;
}

export function Ship({ app }: ShipProps) {
  const shipRef = useRef<Graphics | null>(null);
  const positionRef = useRef({ x: 0, y: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const keysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!app) return;

    // Create ship as a triangle (drawn relative to Graphics origin)
    const ship = new Graphics();
    ship.moveTo(0, -15); // Top point
    ship.lineTo(-10, 10); // Bottom left
    ship.lineTo(10, 10); // Bottom right
    ship.lineTo(0, -15); // Close triangle
    ship.fill(0x00ff00);

    // Position the ship at center
    ship.x = app.screen.width / 2;
    ship.y = app.screen.height / 2;

    positionRef.current = {
      x: app.screen.width / 2,
      y: app.screen.height / 2,
    };

    app.stage.addChild(ship);
    shipRef.current = ship;

    // Keyboard event handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation ticker
    const tickerCallback = (ticker: any) => {
      const delta = ticker.deltaTime;
      const ship = shipRef.current;
      if (!ship) return; // Guard against null reference

      const keys = keysRef.current;
      const velocity = velocityRef.current;

      // Reset velocity
      velocity.vx = 0;
      velocity.vy = 0;

      // Update velocity based on keys
      if (keys.has('ArrowUp') || keys.has('KeyW')) {
        velocity.vy = -SHIP_SPEED;
      }
      if (keys.has('ArrowDown') || keys.has('KeyS')) {
        velocity.vy = SHIP_SPEED;
      }
      if (keys.has('ArrowLeft') || keys.has('KeyA')) {
        velocity.vx = -SHIP_SPEED;
      }
      if (keys.has('ArrowRight') || keys.has('KeyD')) {
        velocity.vx = SHIP_SPEED;
      }

      // Update position
      const pos = positionRef.current;
      pos.x += velocity.vx * delta;
      pos.y += velocity.vy * delta;

      // Keep ship within bounds
      pos.x = Math.max(0, Math.min(app.screen.width, pos.x));
      pos.y = Math.max(0, Math.min(app.screen.height, pos.y));

      // Update ship position
      ship.x = pos.x;
      ship.y = pos.y;

      // Rotate ship based on movement direction
      if (velocity.vx !== 0 || velocity.vy !== 0) {
        const angle = Math.atan2(velocity.vy, velocity.vx) + Math.PI / 2;
        ship.rotation = angle;
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (shipRef.current) {
        app.stage.removeChild(shipRef.current);
        shipRef.current.destroy();
      }
    };
  }, [app]);

  return null;
}

