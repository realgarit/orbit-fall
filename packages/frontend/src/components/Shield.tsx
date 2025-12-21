import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';

interface ShieldProps {
  app: Application;
  cameraContainer: Container;
  position: { x: number; y: number };
  active: boolean;
  radius?: number;
}

export function Shield({
  app,
  cameraContainer,
  position,
  active,
  radius = 35,
}: ShieldProps) {
  const shieldRef = useRef<Graphics | null>(null);
  const positionRef = useRef(position);
  const activeRef = useRef(active);
  const timeRef = useRef(0);
  const targetGraphicsRef = useRef<Container | null>(null);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    if (!app) return;

    const shield = new Graphics();
    cameraContainer.addChild(shield);
    shieldRef.current = shield;

    // Find the ship Graphics object to read position directly
    // This avoids React state timing delays
    const findTargetGraphics = (): Container | null => {
      const shieldIndex = cameraContainer.getChildIndex(shield);
      // Look for Graphics objects before the Shield
      // The ship should be added before the Shield
      for (let i = 0; i < shieldIndex; i++) {
        const child = cameraContainer.children[i];
        if ((child instanceof Container) && child !== shield) {
          // Check if this Graphics is near our expected position (within 100px)
          // This helps identify the ship Graphics object
          const expectedPos = positionRef.current;
          const dx = Math.abs(child.x - expectedPos.x);
          const dy = Math.abs(child.y - expectedPos.y);
          if (dx < 100 && dy < 100) {
            return child;
          }
        }
      }
      return null;
    };

    // Try to find target Graphics on first render
    targetGraphicsRef.current = findTargetGraphics();

    const updateShield = (ticker?: any) => {
      const shield = shieldRef.current;
      if (!shield) return;

      shield.clear();

      const isActive = activeRef.current;

      // Try to read position directly from ship Graphics object
      // This ensures frame-accurate positioning without React state delays
      let pos: { x: number; y: number };
      if (targetGraphicsRef.current && targetGraphicsRef.current.visible) {
        pos = { x: targetGraphicsRef.current.x, y: targetGraphicsRef.current.y };
      } else {
        // Fallback to prop if Graphics not found yet
        pos = positionRef.current;
        // Try to find it again
        targetGraphicsRef.current = findTargetGraphics();
      }

      if (!isActive) {
        shield.visible = false;
        return;
      }

      shield.visible = true;

      // Update time for animation
      if (ticker) {
        timeRef.current += ticker.deltaTime;
      }

      const time = timeRef.current;
      const pulseSpeed = 0.1; // Animation speed
      const pulseAmount = 0.15; // How much the shield pulses (15% size variation)

      // Calculate pulsing radius
      const pulse = Math.sin(time * pulseSpeed) * pulseAmount;
      const currentRadius = radius * (1 + pulse);

      // Outer glow (largest, most transparent)
      shield.circle(pos.x, pos.y, currentRadius + 8);
      shield.stroke({ color: 0x06b6d4, width: 2, alpha: 0.3 });

      // Middle ring (medium, semi-transparent)
      shield.circle(pos.x, pos.y, currentRadius + 4);
      shield.stroke({ color: 0x0ea5e9, width: 2, alpha: 0.5 });

      // Main shield circle (bright, solid)
      shield.circle(pos.x, pos.y, currentRadius);
      shield.stroke({ color: 0x06b6d4, width: 3, alpha: 0.9 });

      // Inner glow (smallest, bright)
      shield.circle(pos.x, pos.y, currentRadius - 3);
      shield.stroke({ color: 0x0ea5e9, width: 1, alpha: 0.6 });

      // Add some sparkle effect with rotating dots
      const sparkleCount = 8;
      for (let i = 0; i < sparkleCount; i++) {
        const angle = (time * 0.05) + (i * (Math.PI * 2 / sparkleCount));
        const sparkleRadius = currentRadius - 2;
        const sparkleX = pos.x + Math.cos(angle) * sparkleRadius;
        const sparkleY = pos.y + Math.sin(angle) * sparkleRadius;
        shield.circle(sparkleX, sparkleY, 2);
        shield.fill({ color: 0x06b6d4, alpha: 0.8 });
      }
    };

    // Initial render
    updateShield();

    // Update on ticker for animation
    const tickerCallback = (ticker: any) => {
      updateShield(ticker);
    };

    if (!app?.ticker) return;

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
      if (shieldRef.current) {
        cameraContainer.removeChild(shieldRef.current);
        shieldRef.current.destroy();
      }
    };
  }, [app, cameraContainer, radius]);

  return null;
}
