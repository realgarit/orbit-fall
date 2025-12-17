import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { SHIP_SPEED, MAP_WIDTH, MAP_HEIGHT } from '@shared/constants';

interface ShipProps {
  app: Application;
  cameraContainer: Container;
  onStateUpdate?: (position: { x: number; y: number }, velocity: { vx: number; vy: number }) => void;
}

export function Ship({ app, cameraContainer, onStateUpdate }: ShipProps) {
  const shipRef = useRef<Graphics | null>(null);
  const positionRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const isMouseDownRef = useRef(false);
  const mouseWorldPosRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const velocityRef = useRef({ vx: 0, vy: 0 });

  useEffect(() => {
    if (!app) return;

    // Create ship visual - simple space ship design
    // Draw centered at origin (0,0) for proper rotation
    const ship = new Graphics();
    
    // Main body (triangle) - centered at origin
    // Ship points upward (toward negative Y in screen coordinates)
    ship.moveTo(0, -20); // Top point (nose)
    ship.lineTo(-12, 10); // Bottom left
    ship.lineTo(0, 5); // Center bottom
    ship.lineTo(12, 10); // Bottom right
    ship.lineTo(0, -20); // Close triangle
    ship.fill(0x4a9eff); // Blue body
    
    // Add wings
    ship.moveTo(-12, 10);
    ship.lineTo(-18, 15);
    ship.lineTo(-12, 13);
    ship.fill(0x2d7dd2); // Darker blue wing
    
    ship.moveTo(12, 10);
    ship.lineTo(18, 15);
    ship.lineTo(12, 13);
    ship.fill(0x2d7dd2); // Darker blue wing
    
    // Add cockpit
    ship.circle(0, -8, 4);
    ship.fill(0x00ff88); // Green cockpit
    
    // Add engine glow
    ship.circle(-6, 7, 2);
    ship.fill({ color: 0xffaa00, alpha: 0.8 }); // Orange engine
    ship.circle(6, 7, 2);
    ship.fill({ color: 0xffaa00, alpha: 0.8 }); // Orange engine

    // Position ship in world space (center of map)
    // Graphics rotation happens around (0,0) of the Graphics object
    ship.x = positionRef.current.x;
    ship.y = positionRef.current.y;

    cameraContainer.addChild(ship);
    shipRef.current = ship;

    // Convert screen coordinates to world coordinates
    // Camera container is at (-ship.x + screenWidth/2, -ship.y + screenHeight/2)
    // So world position = screen position - camera position
    const screenToWorld = (screenX: number, screenY: number) => {
      const cameraX = cameraContainer.x;
      const cameraY = cameraContainer.y;
      return {
        x: screenX - cameraX,
        y: screenY - cameraY,
      };
    };

    // Get canvas bounds for mouse position calculation
    const getCanvasMousePos = (e: MouseEvent) => {
      const canvas = app.canvas as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
      const canvasPos = getCanvasMousePos(e);
      const worldPos = screenToWorld(canvasPos.x, canvasPos.y);
      mouseWorldPosRef.current = worldPos;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      // Stop movement when mouse is released
      velocityRef.current.vx = 0;
      velocityRef.current.vy = 0;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDownRef.current) {
        const canvasPos = getCanvasMousePos(e);
        const worldPos = screenToWorld(canvasPos.x, canvasPos.y);
        mouseWorldPosRef.current = worldPos;
      }
    };

    // Add event listeners to canvas
    const canvas = app.canvas as HTMLCanvasElement;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', handleMouseUp);
    }

    // Animation ticker
    const tickerCallback = (ticker: any) => {
      const ship = shipRef.current;
      if (!ship) return;

      const delta = ticker.deltaTime;
      const pos = positionRef.current;
      const mousePos = mouseWorldPosRef.current;
      const velocity = velocityRef.current;

      if (isMouseDownRef.current) {
        // Calculate direction to mouse
        const dx = mousePos.x - pos.x;
        const dy = mousePos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.1) {
          // Point ship toward mouse
          const angle = Math.atan2(dy, dx);
          ship.rotation = angle + Math.PI / 2; // Adjust for top-down view

          // Set velocity in direction of mouse (instant acceleration)
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          velocity.vx = normalizedDx * SHIP_SPEED;
          velocity.vy = normalizedDy * SHIP_SPEED;
        } else {
          // Very close to target, stop
          velocity.vx = 0;
          velocity.vy = 0;
        }
      }

      // Update position (ship moves infinitely in direction until mouse is released)
      // Use delta time for frame-rate independent movement
      pos.x += velocity.vx * delta;
      pos.y += velocity.vy * delta;

      // No boundary constraints - ship can move freely in world space
      // But we can optionally wrap around or keep it within map bounds
      // For now, allow free movement

      // Update ship position in world space
      ship.x = pos.x;
      ship.y = pos.y;

      // Update camera to follow ship (ship always centered on screen)
      cameraContainer.x = -pos.x + app.screen.width / 2;
      cameraContainer.y = -pos.y + app.screen.height / 2;

      // Notify parent component of state changes
      if (onStateUpdate) {
        onStateUpdate({ x: pos.x, y: pos.y }, { vx: velocity.vx, vy: velocity.vy });
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      const canvas = app.canvas as HTMLCanvasElement;
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('mouseup', handleMouseUp);
      }
      if (shipRef.current) {
        cameraContainer.removeChild(shipRef.current);
        shipRef.current.destroy();
      }
    };
  }, [app, cameraContainer]);

  return null;
}

