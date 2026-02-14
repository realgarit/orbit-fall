import { useEffect, useRef, memo } from 'react';
import { Application, Graphics, Container, Text } from 'pixi.js';
import { MAP_WIDTH, MAP_HEIGHT, SPARROW_SHIP } from '@shared/constants';
import { convertSpeedToDisplay } from '@shared/utils/speedConversion';

interface ShipProps {
  app: Application;
  cameraContainer: Container;
  onStateUpdate?: (position: { x: number; y: number }, velocity: { vx: number; vy: number }, rotation: number, thrust: boolean, targetPosition: { x: number; y: number } | null) => void;
  targetPosition?: { x: number; y: number } | null;
  onTargetReached?: () => void;
  onEnemyClick?: (worldX: number, worldY: number) => boolean;
  onBonusBoxClick?: (worldX: number, worldY: number) => boolean;
  inCombat?: boolean;
  enemyPosition?: { x: number; y: number } | null;
  isDead?: boolean;
  serverPosition?: { x: number; y: number } | null;
  username?: string;
}

export const Ship = memo(function Ship({ app, cameraContainer, onStateUpdate, targetPosition, onTargetReached, onEnemyClick, onBonusBoxClick, inCombat, enemyPosition, isDead = false, serverPosition, username }: ShipProps) {
  const shipRef = useRef<Container | null>(null);
  const positionRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const hasInitializedPosRef = useRef(false);
  const rotationRef = useRef(0);
  const isMouseDownRef = useRef(false);
  const mouseWorldPosRef = useRef({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });
  const mouseScreenPosRef = useRef({ x: 0, y: 0 }); // Track screen position for continuous updates
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const serverPositionRef = useRef<{ x: number; y: number } | null>(null);
  const onTargetReachedRef = useRef<(() => void) | undefined>(undefined);
  const onEnemyClickRef = useRef<((worldX: number, worldY: number) => boolean) | undefined>(undefined);
  const onBonusBoxClickRef = useRef<((worldX: number, worldY: number) => boolean) | undefined>(undefined);
  const inCombatRef = useRef(inCombat ?? false);
  const enemyPositionRef = useRef<{ x: number; y: number } | null>(enemyPosition ?? null);
  const isDeadRef = useRef(isDead);

  // Store latest prop values to compare against refs in ticker
  const inCombatPropRef = useRef(inCombat ?? false);
  const enemyPositionPropRef = useRef<{ x: number; y: number } | null>(enemyPosition ?? null);

  useEffect(() => {
    serverPositionRef.current = serverPosition ?? null;
  }, [serverPosition]);

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
    onBonusBoxClickRef.current = onBonusBoxClick;
  }, [onBonusBoxClick]);

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

    // Create ship container to hold body and engine effects
    const ship = new Container();
    const shipBody = new Graphics();
    const engineGlow = new Graphics();
    const serverGhost = new Graphics(); // Add debug ghost

    ship.addChild(engineGlow);
    ship.addChild(shipBody);
    
    // Setup debug ghost (faint circle)
    serverGhost.circle(0, 0, 20);
    serverGhost.stroke({ color: 0xffffff, width: 1, alpha: 0.3 });
    serverGhost.visible = false;
    cameraContainer.addChild(serverGhost);

    const drawShipBody = (g: Graphics) => {
      g.clear();

      // 1. Bottom Wings/Stabilizers (Silver/Red)
      g.roundRect(-15, 6, 30, 4, 1.5);
      g.fill(0xcccccc); // Metallic silver

      // Wing details (red stripes)
      g.rect(-12, 7, 7, 2);
      g.fill(0x8b0000);
      g.rect(5, 7, 7, 2);
      g.fill(0x8b0000);

      // 2. Main Rounded Hull (Dark Red)
      g.ellipse(0, 0, 14, 18);
      g.fill(0x8b0000); // Phoenix Red

      // 3. Metallic Side Panels (Silver)
      g.moveTo(-10, -5);
      g.bezierCurveTo(-14, -5, -14, 10, -10, 15);
      g.lineTo(-6, 15);
      g.lineTo(-6, -5);
      g.fill(0x999999);

      g.moveTo(10, -5);
      g.bezierCurveTo(14, -5, 14, 10, 10, 15);
      g.lineTo(6, 15);
      g.lineTo(6, -5);
      g.fill(0x999999);

      // 4. Large Cockpit Canopy (Dark Glass)
      g.ellipse(0, -6, 9, 11);
      g.fill({ color: 0x223344, alpha: 0.85 });

      // Canopy glare
      g.ellipse(-3, -11, 3, 5);
      g.fill({ color: 0xffffff, alpha: 0.15 });

      // 5. Front Circular Port (Signature Phoenix feature)
      g.circle(0, -17, 4.5);
      g.fill(0x333333);
      g.circle(0, -17, 2.5);
      g.fill(0x666666);

      // 6. Rear Thruster Housings
      g.rect(-7, 14, 4, 4);
      g.fill(0x222222);
      g.rect(3, 14, 4, 4);
      g.fill(0x222222);
    };

    drawShipBody(shipBody);

    // Position ship in world space (center of map)
    ship.x = positionRef.current.x;
    ship.y = positionRef.current.y;

    cameraContainer.addChild(ship);
    
    // Create name text (as world-space sibling, not child, to match Enemy.tsx logic)
    const nameText = new Text({
      text: username || 'Pilot',
      style: {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xffffff, // White for player/friendly
        align: 'center',
      },
    });
    nameText.anchor.set(0.5, 0);
    nameText.x = ship.x;
    nameText.y = ship.y + 35; // Position below ship, matching Drifter
    cameraContainer.addChild(nameText);

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

      // Check if click is on bonus box (prevent ship movement)
      if (onBonusBoxClickRef.current && onBonusBoxClickRef.current(worldPos.x, worldPos.y)) {
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

      // Update name tag position to follow ship
      nameText.x = ship.x;
      nameText.y = ship.y + 35;
      nameText.visible = ship.visible && !isDeadRef.current;

      const engineGlow = ship.children[0] as Graphics;
      const velocity = velocityRef.current;
      if (engineGlow && !isDeadRef.current) {
        engineGlow.clear();
        const flicker = Math.random() * 0.4 + 0.6;
        const isMoving = Math.abs(velocity.vx) > 0.1 || Math.abs(velocity.vy) > 0.1;
        const size = isMoving ? 8 : 4;

        // Left engine flame
        engineGlow.circle(-6, 12, size * flicker);
        engineGlow.fill({ color: 0xffaa00, alpha: 0.5 * flicker });
        engineGlow.circle(-6, 12, size * 0.6 * flicker);
        engineGlow.fill({ color: 0xffffff, alpha: 0.8 * flicker });

        // Right engine flame
        engineGlow.circle(6, 12, size * flicker);
        engineGlow.fill({ color: 0xffaa00, alpha: 0.5 * flicker });
        engineGlow.circle(6, 12, size * 0.6 * flicker);
        engineGlow.fill({ color: 0xffffff, alpha: 0.8 * flicker });
      }

      // If ship is dead, don't update position or movement
      if (isDeadRef.current) {
        return;
      }

      const delta = ticker.deltaTime;
      // Server reconciliation - be gentle to avoid fighting local movement
      const sPos = serverPositionRef.current;
      if (sPos && !isDeadRef.current) {
        // Initial spawn sync
        if (!hasInitializedPosRef.current) {
          positionRef.current.x = sPos.x;
          positionRef.current.y = sPos.y;
          hasInitializedPosRef.current = true;
        }

        const dx = sPos.x - positionRef.current.x;
        const dy = sPos.y - positionRef.current.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        
        // Show server ghost if desync is > 50px
        serverGhost.x = sPos.x;
        serverGhost.y = sPos.y;
        serverGhost.visible = dist > 50;

        // If we are way off (> 500px), snap immediately
        if (dist > 500) {
          positionRef.current.x = sPos.x;
          positionRef.current.y = sPos.y;
        }
      }
      const pos = positionRef.current;
      const currentTarget = targetPosRef.current;

      // --- ROTATION LOGIC ---
      // PRIORITY 1: Combat (Look at enemy)
      const shouldBeInCombat = inCombatPropRef.current;
      const shouldHaveEnemyPos = enemyPositionPropRef.current;
      const isInCombat = inCombatRef.current;
      const currentEnemyPos = enemyPositionRef.current;

      // Clear refs if props say we shouldn't have them
      if (!shouldBeInCombat) {
        inCombatRef.current = false;
        if (currentEnemyPos) enemyPositionRef.current = null;
      }
      if (!shouldHaveEnemyPos) {
        enemyPositionRef.current = null;
        if (isInCombat) inCombatRef.current = false;
      }

      const finalIsInCombat = inCombatRef.current;
      const finalEnemyPos = enemyPositionRef.current;

      let rotationLockedByCombat = false;

      if (shouldBeInCombat && shouldHaveEnemyPos && finalIsInCombat && finalEnemyPos) {
        const dx = finalEnemyPos.x - pos.x;
        const dy = finalEnemyPos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.01) {
          const angle = Math.atan2(dy, dx);
          const targetRotation = angle + Math.PI / 2;

          const currentRotation = rotationRef.current;
          let rotationDiff = targetRotation - currentRotation;
          while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
          while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

          const rotationSpeed = 0.2;
          const newRotation = currentRotation + rotationDiff * rotationSpeed;
          ship.rotation = newRotation;
          rotationRef.current = newRotation;
          rotationLockedByCombat = true; // Block other rotations
        }
      }

      // --- MOVEMENT & SECONDARY ROTATION ---
      if (isMouseDownRef.current) {
        const screenPos = mouseScreenPosRef.current;
        const currentWorldPos = screenToWorld(screenPos.x, screenPos.y);
        mouseWorldPosRef.current = currentWorldPos;

        const dx = currentWorldPos.x - pos.x;
        const dy = currentWorldPos.y - pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0.5) {
          // Only update rotation if NOT locked by combat
          if (distance > 5.0 && !rotationLockedByCombat) {
            const angle = Math.atan2(dy, dx);
            const targetRotation = angle + Math.PI / 2;

            const currentRotation = rotationRef.current;
            let rotationDiff = targetRotation - currentRotation;
            while (rotationDiff > Math.PI) rotationDiff -= 2 * Math.PI;
            while (rotationDiff < -Math.PI) rotationDiff += 2 * Math.PI;

            const rotationSpeed = 0.2;
            const newRotation = currentRotation + rotationDiff * rotationSpeed;
            ship.rotation = newRotation;
            rotationRef.current = newRotation;
          }

          const shipSpeed = convertSpeedToDisplay(SPARROW_SHIP.baseSpeed);
          velocity.vx = (dx / distance) * shipSpeed;
          velocity.vy = (dy / distance) * shipSpeed;
        } else {
          velocity.vx = 0;
          velocity.vy = 0;
        }
      } else if (currentTarget) {
        // Auto-fly to minimap target
        // Allow movement during combat, but combat rotation takes priority
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
          // Only update rotation if not in combat (combat rotation takes priority)
          if (!isInCombat && !inCombatRef.current) {
            const angle = Math.atan2(dy, dx);
            const rotation = angle + Math.PI / 2;
            ship.rotation = rotation;
            rotationRef.current = rotation;
          }
          // Always allow movement toward target, even during combat
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
        onStateUpdate({ x: pos.x, y: pos.y }, { vx: velocity.vx, vy: velocity.vy }, rotationRef.current, Math.abs(velocity.vx) > 0.1 || Math.abs(velocity.vy) > 0.1, currentTarget);
      }

      // Final Name Tag Sync (ensures it matches the latest ship.x/y)
      if (nameText) {
        nameText.x = ship.x;
        nameText.y = ship.y + 35;
        nameText.visible = ship.visible && !isDeadRef.current;
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
});

