import { useEffect, useRef, memo } from 'react';
import { Container, Graphics, Text, TextStyle, Application } from 'pixi.js';

interface RemoteShipProps {
  app: Application | null;
  cameraContainer: Container | null;
  x: number;
  y: number;
  rotation: number;
  username: string;
  isMoving: boolean;
}

export const RemoteShip = memo(({ app, cameraContainer, x, y, rotation, username, isMoving }: RemoteShipProps) => {
  const shipRef = useRef<Container | null>(null);
  const engineGlowRef = useRef<Graphics | null>(null);
  const targetRef = useRef({ x, y, rotation });

  useEffect(() => {
    targetRef.current = { x, y, rotation };
  }, [x, y, rotation]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    const ship = new Container();
    ship.x = x;
    ship.y = y;
    ship.rotation = rotation;

    // Engine Glow
    const engineGlow = new Graphics();
    ship.addChild(engineGlow);
    engineGlowRef.current = engineGlow;

    // Ship Body (Matching Ship.tsx)
    const body = new Graphics();
    const drawShipBody = (g: Graphics) => {
      g.clear();
      // 1. Bottom Wings/Stabilizers
      g.roundRect(-15, 6, 30, 4, 1.5);
      g.fill(0xcccccc);
      g.rect(-12, 7, 7, 2);
      g.fill(0x8b0000);
      g.rect(5, 7, 7, 2);
      g.fill(0x8b0000);
      // 2. Main Hull
      g.ellipse(0, 0, 14, 18);
      g.fill(0x8b0000);
      // 3. Side Panels
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
      // 4. Canopy
      g.ellipse(0, -6, 9, 11);
      g.fill({ color: 0x223344, alpha: 0.85 });
      g.ellipse(-3, -11, 3, 5);
      g.fill({ color: 0xffffff, alpha: 0.15 });
      // 5. Port
      g.circle(0, -17, 4.5);
      g.fill(0x333333);
      g.circle(0, -17, 2.5);
      g.fill(0x666666);
      // 6. Thrusters
      g.rect(-7, 14, 4, 4);
      g.fill(0x222222);
      g.rect(3, 14, 4, 4);
      g.fill(0x222222);
    };
    drawShipBody(body);
    ship.addChild(body);

    cameraContainer.addChild(ship);
    
    // Create name text (as world-space sibling, match Ship.tsx)
    const nameText = new Text({
      text: username || 'Pilot',
      style: {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xffffff,
        align: 'center',
      },
    });
    nameText.anchor.set(0.5, 0);
    cameraContainer.addChild(nameText);

    shipRef.current = ship;

    const tickerCallback = (ticker: any) => {
      if (!shipRef.current) return;

      const lerpFactor = 0.15;
      shipRef.current.x += (targetRef.current.x - shipRef.current.x) * lerpFactor * ticker.deltaTime;
      shipRef.current.y += (targetRef.current.y - shipRef.current.y) * lerpFactor * ticker.deltaTime;

      // Update name tag position
      nameText.x = shipRef.current.x;
      nameText.y = shipRef.current.y + 35;

      let diff = targetRef.current.rotation - shipRef.current.rotation;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      shipRef.current.rotation += diff * lerpFactor * ticker.deltaTime;

      const engineGlow = engineGlowRef.current;
      if (engineGlow) {
        engineGlow.clear();
        if (isMoving) {
          const flicker = Math.random() * 0.4 + 0.6;
          // Left engine flame
          engineGlow.circle(-6, 12, 8 * flicker);
          engineGlow.fill({ color: 0xffaa00, alpha: 0.5 * flicker });
          engineGlow.circle(-6, 12, 8 * 0.6 * flicker);
          engineGlow.fill({ color: 0xffffff, alpha: 0.8 * flicker });
          // Right engine flame
          engineGlow.circle(6, 12, 8 * flicker);
          engineGlow.fill({ color: 0xffaa00, alpha: 0.5 * flicker });
          engineGlow.circle(6, 12, 8 * 0.6 * flicker);
          engineGlow.fill({ color: 0xffffff, alpha: 0.8 * flicker });
        }
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (shipRef.current) {
        cameraContainer.removeChild(shipRef.current);
        shipRef.current.destroy({ children: true });
      }
    };
  }, [app, cameraContainer, username]);

  return null;
});
