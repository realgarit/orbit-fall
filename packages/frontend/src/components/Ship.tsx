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
  const moveAngleRef = useRef(0);
  const isMouseDownRef = useRef(false);
  const mouseScreenPosRef = useRef({ x: 0, y: 0 }); 
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const serverPositionRef = useRef<{ x: number; y: number } | null>(null);
  const onTargetReachedRef = useRef<(() => void) | undefined>(undefined);
  const onEnemyClickRef = useRef<((worldX: number, worldY: number) => boolean) | undefined>(undefined);
  const onBonusBoxClickRef = useRef<((worldX: number, worldY: number) => boolean) | undefined>(undefined);
  const inCombatPropRef = useRef(inCombat ?? false);
  const enemyPositionPropRef = useRef<{ x: number; y: number } | null>(enemyPosition ?? null);
  const isDeadRef = useRef(isDead);

  useEffect(() => {
    serverPositionRef.current = serverPosition ?? null;
  }, [serverPosition]);

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
    inCombatPropRef.current = inCombat ?? false;
    enemyPositionPropRef.current = enemyPosition ?? null;
  }, [inCombat, enemyPosition]);

  useEffect(() => {
    isDeadRef.current = isDead;
    if (isDead) {
      velocityRef.current.vx = 0; velocityRef.current.vy = 0;
      isMouseDownRef.current = false;
      targetPosRef.current = null;
      if (shipRef.current) shipRef.current.visible = false;
    } else {
      if (shipRef.current) shipRef.current.visible = true;
    }
  }, [isDead]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    const ship = new Container();
    const shipBody = new Graphics();
    const engineGlow = new Graphics();

    ship.addChild(engineGlow);
    ship.addChild(shipBody);
    
    const drawShipBody = (g: Graphics) => {
      g.clear();
      g.roundRect(-15, 6, 30, 4, 1.5); g.fill(0xcccccc); 
      g.rect(-12, 7, 7, 2); g.fill(0x8b0000);
      g.rect(5, 7, 7, 2); g.fill(0x8b0000);
      g.ellipse(0, 0, 14, 18); g.fill(0x8b0000); 
      g.moveTo(-10, -5); g.bezierCurveTo(-14, -5, -14, 10, -10, 15); g.lineTo(-6, 15); g.lineTo(-6, -5); g.fill(0x999999);
      g.moveTo(10, -5); g.bezierCurveTo(14, -5, 14, 10, 10, 15); g.lineTo(6, 15); g.lineTo(6, -5); g.fill(0x999999);
      g.ellipse(0, -6, 9, 11); g.fill({ color: 0x223344, alpha: 0.85 });
      g.ellipse(-3, -11, 3, 5); g.fill({ color: 0xffffff, alpha: 0.15 });
      g.circle(0, -17, 4.5); g.fill(0x333333); g.circle(0, -17, 2.5); g.fill(0x666666);
      g.rect(-7, 14, 4, 4); g.fill(0x222222); g.rect(3, 14, 4, 4); g.fill(0x222222);
    };

    drawShipBody(shipBody);
    cameraContainer.addChild(ship);
    
    const nameText = new Text({
      text: username || 'Pilot',
      style: { fontFamily: 'Verdana, Arial, sans-serif', fontSize: 14, fontWeight: 'bold', fill: 0xffffff, align: 'center' },
    });
    nameText.anchor.set(0.5, 0);
    cameraContainer.addChild(nameText);

    shipRef.current = ship;

    const screenToWorld = (screenX: number, screenY: number) => {
      return { x: screenX - cameraContainer.x, y: screenY - cameraContainer.y };
    };

    const getCanvasMousePos = (e: MouseEvent) => {
      const canvas = app?.canvas as HTMLCanvasElement | null;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (isDeadRef.current) return;
      const canvasPos = getCanvasMousePos(e);
      const worldPos = screenToWorld(canvasPos.x, canvasPos.y);
      
      // CRITICAL: Prevent movement if we clicked an interactive object
      if (onEnemyClickRef.current && onEnemyClickRef.current(worldPos.x, worldPos.y)) return;
      if (onBonusBoxClickRef.current && onBonusBoxClickRef.current(worldPos.x, worldPos.y)) return;

      isMouseDownRef.current = true;
      mouseScreenPosRef.current = canvasPos;
    };

    const handleMouseUp = () => {
      isMouseDownRef.current = false;
      if (!targetPosRef.current) { velocityRef.current.vx = 0; velocityRef.current.vy = 0; }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isMouseDownRef.current) { mouseScreenPosRef.current = getCanvasMousePos(e); }
    };

    const canvas = app?.canvas as HTMLCanvasElement | null;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
    }
    window.addEventListener('mouseup', handleMouseUp);

    const tickerCallback = (ticker: any) => {
      if (!shipRef.current) return;
      const delta = ticker.deltaTime;
      const pos = positionRef.current;
      const sPos = serverPositionRef.current;

      if (sPos && !isDeadRef.current) {
        if (!hasInitializedPosRef.current) { pos.x = sPos.x; pos.y = sPos.y; hasInitializedPosRef.current = true; }
        const dx = sPos.x - pos.x; const dy = sPos.y - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > 500) { pos.x = sPos.x; pos.y = sPos.y; }
      }

      const shouldBeInCombat = inCombatPropRef.current;
      const currentEnemyPos = enemyPositionPropRef.current;
      let rotationLockedByCombat = false;

      if (shouldBeInCombat && currentEnemyPos) {
        const dx = currentEnemyPos.x - pos.x; const dy = currentEnemyPos.y - pos.y;
        if (Math.sqrt(dx*dx+dy*dy) > 0.01) {
          const targetRot = Math.atan2(dy, dx) + Math.PI/2;
          let diff = targetRot - rotationRef.current;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          rotationRef.current += diff * 0.2;
          shipRef.current.rotation = rotationRef.current;
          rotationLockedByCombat = true;
        }
      }

      if (isMouseDownRef.current) {
        const targetWPos = screenToWorld(mouseScreenPosRef.current.x, mouseScreenPosRef.current.y);
        const dx = targetWPos.x - pos.x; const dy = targetWPos.y - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        moveAngleRef.current = Math.atan2(dy, dx) + Math.PI/2;
        if (dist > 0.5) {
          if (dist > 5.0 && !rotationLockedByCombat) {
            let diff = moveAngleRef.current - rotationRef.current;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            rotationRef.current += diff * 0.2;
            shipRef.current.rotation = rotationRef.current;
          }
          const speed = convertSpeedToDisplay(SPARROW_SHIP.baseSpeed);
          velocityRef.current.vx = (dx/dist) * speed; velocityRef.current.vy = (dy/dist) * speed;
        } else {
          velocityRef.current.vx = 0; velocityRef.current.vy = 0;
        }
      } else if (targetPosRef.current) {
        const dx = targetPosRef.current.x - pos.x; const dy = targetPosRef.current.y - pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist <= 10) { velocityRef.current.vx = 0; velocityRef.current.vy = 0; onTargetReachedRef.current?.(); }
        else {
          moveAngleRef.current = Math.atan2(dy, dx) + Math.PI/2;
          if (!rotationLockedByCombat) { rotationRef.current = moveAngleRef.current; shipRef.current.rotation = moveAngleRef.current; }
          const speed = convertSpeedToDisplay(SPARROW_SHIP.baseSpeed);
          velocityRef.current.vx = (dx/dist) * speed; velocityRef.current.vy = (dy/dist) * speed;
        }
      } else {
        velocityRef.current.vx = 0; velocityRef.current.vy = 0;
      }

      if (!isDeadRef.current) { pos.x += velocityRef.current.vx * delta; pos.y += velocityRef.current.vy * delta; }
      pos.x = Math.max(0, Math.min(MAP_WIDTH, pos.x)); pos.y = Math.max(0, Math.min(MAP_HEIGHT, pos.y));
      shipRef.current.x = pos.x; shipRef.current.y = pos.y;
      nameText.x = pos.x; nameText.y = pos.y + 35;
      nameText.visible = shipRef.current.visible && !isDeadRef.current;

      if (app?.screen) { cameraContainer.x = -pos.x + app.screen.width/2; cameraContainer.y = -pos.y + app.screen.height/2; }
      if (onStateUpdate) { onStateUpdate({ x: pos.x, y: pos.y }, velocityRef.current, moveAngleRef.current, (Math.abs(velocityRef.current.vx) > 0.1 || Math.abs(velocityRef.current.vy) > 0.1), targetPosRef.current); }
    };

    app.ticker.add(tickerCallback);
    return () => {
      app.ticker.remove(tickerCallback);
      canvas?.removeEventListener('mousedown', handleMouseDown);
      canvas?.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      cameraContainer.removeChild(ship);
      cameraContainer.removeChild(nameText);
    };
  }, [app, cameraContainer, username]);

  return null;
});
