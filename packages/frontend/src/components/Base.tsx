import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text } from 'pixi.js';

interface BaseProps {
  app: Application;
  cameraContainer: Container;
  position?: { x: number; y: number };
}

export function Base({ app, cameraContainer, position = { x: 0, y: 0 } }: BaseProps) {
  const baseRef = useRef<Container | null>(null);
  const nameTextRef = useRef<Text | null>(null);
  const timeRef = useRef(0);

  useEffect(() => {
    if (!app) return;

    const currentPosition = position || { x: 0, y: 0 };

    // Only create if it doesn't exist
    if (!baseRef.current) {
      const base = new Container();
      const stationBody = new Graphics();
      const rotatingRing = new Graphics();
      const glowLayer = new Graphics();

      base.addChild(glowLayer);
      base.addChild(rotatingRing);
      base.addChild(stationBody);

      const drawStation = (g: Graphics) => {
        g.clear();

        // 1. Structural Hub (Metallic Silver/Blue)
        g.circle(0, 0, 35);
        g.fill(0x1e293b); // Deep dark blue base
        g.stroke({ width: 2, color: 0x4a9eff });

        // Inner mechanical details
        g.circle(0, 0, 25);
        g.fill(0x334155);

        // 2. Docking Pylons (North, East, South, West)
        const drawPylon = (angle: number) => {
          const x = Math.cos(angle);
          const y = Math.sin(angle);

          g.moveTo(x * 35, y * 35);
          g.lineTo(x * 60, y * 60);
          g.stroke({ width: 6, color: 0x475569 });

          // Pylon Head
          const posX = x * 65;
          const posY = y * 65;
          g.rect(posX - 8, posY - 8, 16, 16);
          g.fill(0x1e293b);
          g.stroke({ width: 1.5, color: 0x4a9eff });

          // Signal Lights on Pylons
          g.circle(posX, posY, 3);
          g.fill(0x00ff88);
        };

        drawPylon(0);
        drawPylon(Math.PI / 2);
        drawPylon(Math.PI);
        drawPylon(3 * Math.PI / 2);

        // 3. Central Command Dome
        g.ellipse(0, 0, 15, 15);
        g.fill({ color: 0x0ea5e9, alpha: 0.6 });

        // Glass shine
        g.ellipse(-4, -4, 5, 5);
        g.fill({ color: 0xffffff, alpha: 0.2 });
      };

      const drawRotatingRing = (g: Graphics) => {
        g.clear();
        // Solar Array Ring (Floating)
        g.circle(0, 0, 50);
        g.stroke({ width: 4, color: 0x22d3ee, alpha: 0.3 });

        // Solar Panels on the ring
        const panelCount = 4;
        for (let i = 0; i < panelCount; i++) {
          const angle = (i / panelCount) * Math.PI * 2;
          const x = Math.cos(angle) * 50;
          const y = Math.sin(angle) * 50;

          g.rect(x - 10, y - 5, 20, 10);
          g.fill(0x0f172a);
          g.stroke({ width: 1, color: 0x22d3ee });
        }
      };

      drawStation(stationBody);
      drawRotatingRing(rotatingRing);

      base.x = currentPosition.x;
      base.y = currentPosition.y;

      cameraContainer.addChild(base);
      baseRef.current = base;

      // Create name text
      const nameText = new Text({
        text: 'Home Base',
        style: {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: 14,
          fontWeight: 'bold',
          fill: 0x4a9eff, // Blue text
          align: 'center',
        },
      });
      nameText.anchor.set(0.5, 0);
      nameText.x = currentPosition.x;
      const radius = 65;
      nameText.y = currentPosition.y + radius + 15; // Below base
      cameraContainer.addChild(nameText);
      nameTextRef.current = nameText;
    } else {
      // Update position if base already exists
      if (baseRef.current) {
        baseRef.current.x = currentPosition.x;
        baseRef.current.y = currentPosition.y;
      }
      if (nameTextRef.current) {
        const radius = 65;
        nameTextRef.current.x = currentPosition.x;
        nameTextRef.current.y = currentPosition.y + radius + 15;
      }
    }

    // Animation Ticker
    const tickerCallback = (ticker: any) => {
      const base = baseRef.current;
      if (!base) return;

      const delta = ticker.deltaTime;
      timeRef.current += 0.02 * delta;

      const glowLayer = base.children[0] as Graphics;
      const rotatingRing = base.children[1] as Graphics;

      // Rotate the solar ring
      rotatingRing.rotation += 0.005 * delta;

      // Pulse the glow layer
      if (glowLayer) {
        glowLayer.clear();
        const pulse = Math.sin(timeRef.current) * 10 + 40;

        // Center Core Glow
        glowLayer.circle(0, 0, pulse);
        glowLayer.fill({ color: 0x0ea5e9, alpha: 0.2 });

        // Periodic light pulses on pylons
        const pylonPulse = Math.abs(Math.sin(timeRef.current * 2));
        glowLayer.circle(65, 0, 5 * pylonPulse);
        glowLayer.fill({ color: 0x00ff88, alpha: 0.5 * pylonPulse });
        glowLayer.circle(-65, 0, 5 * pylonPulse);
        glowLayer.fill({ color: 0x00ff88, alpha: 0.5 * pylonPulse });
        glowLayer.circle(0, 65, 5 * pylonPulse);
        glowLayer.fill({ color: 0x00ff88, alpha: 0.5 * pylonPulse });
        glowLayer.circle(0, -65, 5 * pylonPulse);
        glowLayer.fill({ color: 0x00ff88, alpha: 0.5 * pylonPulse });
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
      if (baseRef.current) {
        cameraContainer.removeChild(baseRef.current);
        baseRef.current.destroy();
        baseRef.current = null;
      }
      if (nameTextRef.current) {
        cameraContainer.removeChild(nameTextRef.current);
        nameTextRef.current.destroy();
        nameTextRef.current = null;
      }
    };
  }, [app, cameraContainer, position?.x, position?.y]);

  return null;
}

