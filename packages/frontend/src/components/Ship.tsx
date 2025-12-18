import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { MAP_WIDTH, MAP_HEIGHT, SPARROW_SHIP } from '@shared/constants';
import { convertSpeedToDisplay } from '@shared/utils/speedConversion';

interface ShipProps {
  app: Application;
  cameraContainer: Container;
  onStateUpdate?: (position: { x: number; y: number }, velocity: { vx: number; vy: number }, rotation?: number) => void;
  targetPosition?: { x: number; y: number } | null;
  onTargetReached?: () => void;
  onEnemyClick?: (worldX: number, worldY: number) => boolean;
  inCombat?: boolean;
  enemyPosition?: { x: number; y: number } | null;
  isDead?: boolean;
}

export function Ship({ app, cameraContainer, onStateUpdate, targetPosition, onTargetReached, onEnemyClick, inCombat, enemyPosition, isDead = false }: ShipProps) {
  const shipRef = useRef<Graphics | null>(null);
  const positionRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const rotationRef = useRef(0);
  const isMouseDownRef = useRef(false);
  const mouseWorldPosRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const mouseScreenPosRef = useRef({ x: 0, y: 0 }); // Track screen position for continuous updates
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const onTargetReachedRef = useRef<(() => void) | undefined>(undefined);
  const onEnemyClickRef = useRef<((worldX: number, worldY: number) => boolean) | undefined>(undefined);
  const inCombatRef = useRef(inCombat ?? false);
  const enemyPositionRef = useRef<{ x: number; y: number } | null>(enemyPosition ?? null);
  const isDeadRef = useRef(isDead);
  
  // Store latest prop values to compare against refs in ticker
  const inCombatPropRef = useRef(inCombat ?? false);
  const enemyPositionPropRef = useRef<{ x: number; y: number } | null>(enemyPosition ?? null);

  // Keep refs in sync with latest props without recreating Pixi objects
  useEffect(() => {
    targetPosRef.current = targetPosition ?? null;
  }, [targetPosition]);

  useEffect(() => {
    onTargetReachedRef.current = onTargetReached;
  }, [onTargetReached]);

  useEffect(() => {
    onEnemyClickRef.current = onEnemyClick;
  }, [onEnemyClick]);

  useEffect(() => {
    // Update prop refs to track latest prop values
    inCombatPropRef.current = inCombat ?? false;
    enemyPositionPropRef.current = enemyPosition ?? null;
    
    // Sync refs with props - props are the source of truth
    inCombatRef.current = inCombat ?? false;
    enemyPositionRef.current = enemyPosition ?? null;
  }, [inCombat, enemyPosition]);

  useEffect(() => {
    isDeadRef.current = isDead;
    // When ship dies, immediately stop all movement
    if (isDead) {
      velocityRef.current.vx = 0;
      velocityRef.current.vy = 0;
      isMouseDownRef.current = false;
      targetPosRef.current = null;
      // Hide ship graphics
      if (shipRef.current) {
        shipRef.current.visible = false;
      }
    } else {
      // Show ship when alive
      if (shipRef.current) {
        shipRef.current.visible = true;
      }
    }
  }, [isDead]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    // Store app in local variable to avoid stale closure issues during hot reload
    const currentApp = app;

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
      const canvas = app?.canvas as HTMLCanvasElement | null;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    // Mouse event handlers
    const handleMouseDown = (e: MouseEvent) => {
      // Don't allow movement if ship is dead
      if (isDeadRef.current) {
        return;
      }

      const canvasPos = getCanvasMousePos(e);
      mouseScreenPosRef.current = canvasPos; // Store screen position
      const worldPos = screenToWorld(canvasPos.x, canvasPos.y);
      
      // Check if click is on enemy (prevent ship movement)
      if (onEnemyClickRef.current && onEnemyClickRef.current(worldPos.x, worldPos.y)) {
        return; // Don't start ship movement
      }
      
      isMouseDownRef.current = true;
      mouseWorldPosRef.current = worldPos;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      // Stop movement when mouse is released (unless auto-flying to minimap target)
      if (!targetPosRef.current) {
        velocityRef.current.vx = 0;
        velocityRef.current.vy = 0;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDownRef.current) {
        const canvasPos = getCanvasMousePos(e);
        mouseScreenPosRef.current = canvasPos; // Update screen position
        // World position will be recalculated in ticker using current camera position
      }
    };

    // Store canvas reference for cleanup
    // Double-check currentApp is still valid (handles hot reload stale closures)
    if (!currentApp) return;
    const canvas = (currentApp?.canvas) as HTMLCanvasElement | null;

    // Add event listeners to canvas
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

      // If ship is dead, don't update position or movement
      if (isDeadRef.current) {
        return;
      }

      const delta = ticker.deltaTime;
      const pos = positionRef.current;
      const velocity = velocityRef.current;
      const currentTarget = targetPosRef.current;

      // Priority: combat rotation (turn to enemy when in combat)
      const shouldBeInCombat = inCombatPropRef.current;
      const shouldHaveEnemyPos = enemyPositionPropRef.current;
      const isInCombat = inCombatRef.current;
      const currentEnemyPos = enemyPositionRef.current;
      
      // Clear refs if props say we shouldn't have them (handles stale state)
      if (!shouldBeInCombat) {
        inCombatRef.current = false;
        if (currentEnemyPos) enemyPositionRef.current = null;
      }
      if (!shouldHaveEnemyPos) {
        enemyPositionRef.current = null;
        if (isInCombat) inCombatRef.current = false;
      }
      
      // Get final values after clearing stale refs
      const finalIsInCombat = inCombatRef.current;
      const finalEnemyPos = enemyPositionRef.current;
      
      // Clear target if we're in combat (combat takes priority)
      if (currentTarget && finalIsInCombat) {
        targetPosRef.current = null;
      }
      
      // Only rotate if props and refs both indicate valid combat state
      if (shouldBeInCombat && shouldHaveEnemyPos &&
          finalIsInCombat && finalEnemyPos && 
          typeof finalEnemyPos === 'object' &&
          typeof finalEnemyPos.x === 'number' && 
          typeof finalEnemyPos.y === 'number' &&
          !isNaN(finalEnemyPos.x) &&
          !isNaN(finalEnemyPos.y)) {
        // Valid combat rotation - turn towards enemy
        const dx = finalEnemyPos.x - pos.x;
        const dy = finalEnemyPos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 0.01) {
          const angle = Math.atan2(dy, dx);
          const targetRotation = angle + Math.PI / 2;
          
          // Smoothly interpolate rotation
          const currentRotation = rotationRef.current;
          let rotationDiff = targetRotation - currentRotation;
          
          // Normalize rotation difference to [-PI, PI]
          while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
          while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
          
          // Smooth rotation update
          const rotationSpeed = 0.2;
          const newRotation = currentRotation + rotationDiff * rotationSpeed;
          ship.rotation = newRotation;
          rotationRef.current = newRotation;
        }
      }

      // Priority: direct mouse control
      if (isMouseDownRef.current) {
        // Continuously update mouse world position based on current camera position
        // This ensures the target stays relative to the screen position, not a fixed world position
        const screenPos = mouseScreenPosRef.current;
        const currentWorldPos = screenToWorld(screenPos.x, screenPos.y);
        mouseWorldPosRef.current = currentWorldPos;
        
        // Calculate direction to mouse
        const dx = currentWorldPos.x - pos.x;
        const dy = currentWorldPos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Always move toward mouse while button is held down
        // Use a minimum distance threshold to prevent rotation instability
        const MIN_DISTANCE_FOR_ROTATION = 5.0; // Don't update rotation when closer than this
        const MIN_DISTANCE_FOR_MOVEMENT = 0.5; // Stop movement when closer than this
        
        if (distance > MIN_DISTANCE_FOR_MOVEMENT) {
          // Only update rotation if we're far enough away to prevent spinning
          // But don't override combat rotation if in combat
          if (distance > MIN_DISTANCE_FOR_ROTATION && !isInCombat) {
            // Calculate target rotation
            const angle = Math.atan2(dy, dx);
            const targetRotation = angle + Math.PI / 2;
            
            // Smoothly interpolate rotation to prevent rapid spinning
            const currentRotation = rotationRef.current;
            let rotationDiff = targetRotation - currentRotation;
            
            // Normalize rotation difference to [-PI, PI]
            while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
            while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;
            
            // Smooth rotation update
            const rotationSpeed = 0.2; // Rotation interpolation speed
            const newRotation = currentRotation + rotationDiff * rotationSpeed;
            ship.rotation = newRotation;
            rotationRef.current = newRotation;
          }
          // If close but still moving, keep current rotation (don't update it)

          // Set velocity in direction of mouse (continuous movement)
          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          const shipSpeed = convertSpeedToDisplay(SPARROW_SHIP.baseSpeed);
          velocity.vx = normalizedDx * shipSpeed;
          velocity.vy = normalizedDy * shipSpeed;
        } else {
          // At exact position (or extremely close), maintain current rotation and stop movement
          velocity.vx = 0;
          velocity.vy = 0;
        }
      } else if (currentTarget) {
        // Auto-fly to minimap target
        // But don't rotate if we're supposed to be in combat (combat takes priority)
        if (isInCombat && currentEnemyPos) {
          // Combat rotation takes priority over target movement
          // Don't rotate towards target if in combat
          return;
        }
        
        // If we're in combat, combat rotation takes priority over target movement
        if (inCombatRef.current) {
          return;
        }
        
        const dx = currentTarget.x - pos.x;
        const dy = currentTarget.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Clear target when close enough (10px threshold)
        if (distance <= 10) {
          velocity.vx = 0;
          velocity.vy = 0;
          if (onTargetReachedRef.current) {
            onTargetReachedRef.current();
          }
        } else if (distance > 0.1) {
          const angle = Math.atan2(dy, dx);
          const rotation = angle + Math.PI / 2;
          ship.rotation = rotation;
          rotationRef.current = rotation;

          const normalizedDx = dx / distance;
          const normalizedDy = dy / distance;
          const shipSpeed = convertSpeedToDisplay(SPARROW_SHIP.baseSpeed);
          velocity.vx = normalizedDx * shipSpeed;
          velocity.vy = normalizedDy * shipSpeed;
        }
      } else {
        // No input and no target
        velocity.vx = 0;
        velocity.vy = 0;
      }

      // Update position (ship moves infinitely in direction until mouse is released)
      // Use delta time for frame-rate independent movement
      // Don't update position if ship is dead
      if (!isDeadRef.current) {
        pos.x += velocity.vx * delta;
        pos.y += velocity.vy * delta;
      }

      // Boundary constraints: keep ship within map bounds (0,0) to (MAP_WIDTH, MAP_HEIGHT)
      // 0,0 is at top-left of the invisible border
      pos.x = Math.max(0, Math.min(MAP_WIDTH, pos.x));
      pos.y = Math.max(0, Math.min(MAP_HEIGHT, pos.y));

      // Update ship position in world space
      ship.x = pos.x;
      ship.y = pos.y;

      // Update camera to follow ship (ship always centered on screen)
      if (app?.screen) {
        cameraContainer.x = -pos.x + app.screen.width / 2;
        cameraContainer.y = -pos.y + app.screen.height / 2;
      }

      // Notify parent component of state changes
      if (onStateUpdate) {
        onStateUpdate({ x: pos.x, y: pos.y }, { vx: velocity.vx, vy: velocity.vy }, rotationRef.current);
      }
    };

    if (!app?.ticker) return;

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
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

