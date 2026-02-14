import { useEffect, useRef, memo } from 'react';
import { Container, Graphics, Text, Application } from 'pixi.js';

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
  const nameTextRef = useRef<Text | null>(null);
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

    // Ship Body
    const body = new Graphics();
    const drawShipBody = (g: Graphics) => {
      g.clear();
      g.roundRect(-15, 6, 30, 4, 1.5);
      g.fill(0xcccccc);
      g.rect(-12, 7, 7, 2);
      g.fill(0x8b0000);
      g.rect(5, 7, 7, 2);
      g.fill(0x8b0000);
      g.ellipse(0, 0, 14, 18);
      g.fill(0x8b0000);
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
      g.ellipse(0, -6, 9, 11);
      g.fill({ color: 0x223344, alpha: 0.85 });
      g.ellipse(-3, -11, 3, 5);
      g.fill({ color: 0xffffff, alpha: 0.15 });
      g.circle(0, -17, 4.5);
      g.fill(0x333333);
      g.circle(0, -17, 2.5);
      g.fill(0x666666);
      g.rect(-7, 14, 4, 4);
      g.fill(0x222222);
      g.rect(3, 14, 4, 4);
      g.fill(0x222222);
    };
    drawShipBody(body);
    ship.addChild(body);
    cameraContainer.addChild(ship);
    shipRef.current = ship;

    // Name Tag
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
    nameTextRef.current = nameText;

    const tickerCallback = (ticker: any) => {
      if (!shipRef.current || !nameTextRef.current) return;

      const lerpFactor = 0.15;
      shipRef.current.x += (targetRef.current.x - shipRef.current.x) * lerpFactor * ticker.deltaTime;
      shipRef.current.y += (targetRef.current.y - shipRef.current.y) * lerpFactor * ticker.deltaTime;

      // Sync name tag
      nameTextRef.current.x = shipRef.current.x;
      nameTextRef.current.y = shipRef.current.y + 35;

      let diff = targetRef.current.rotation - shipRef.current.rotation;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      shipRef.current.rotation += diff * lerpFactor * ticker.deltaTime;

      const eg = engineGlowRef.current;
      if (eg) {
        eg.clear();
        if (isMoving) {
          const flicker = Math.random() * 0.4 + 0.6;
          eg.circle(-6, 12, 8 * flicker);
          eg.fill({ color: 0xffaa00, alpha: 0.5 * flicker });
          eg.circle(-6, 12, 8 * 0.6 * flicker);
          eg.fill({ color: 0xffffff, alpha: 0.8 * flicker });
          eg.circle(6, 12, 8 * flicker);
          eg.fill({ color: 0xffaa00, alpha: 0.5 * flicker });
          eg.circle(6, 12, 8 * 0.6 * flicker);
          eg.fill({ color: 0xffffff, alpha: 0.8 * flicker });
        }
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (shipRef.current) cameraContainer.removeChild(shipRef.current);
      if (nameTextRef.current) cameraContainer.removeChild(nameTextRef.current);
    };
  }, [app, cameraContainer, username, isMoving, x, y, rotation]);

  return null;
});
