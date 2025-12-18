import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';

interface ShipExplosionProps {
  app: Application;
  cameraContainer: Container;
  position: { x: number; y: number };
  active: boolean;
  onComplete?: () => void;
}

export function ShipExplosion({
  app,
  cameraContainer,
  position,
  active,
  onComplete,
}: ShipExplosionProps) {
  const explosionRef = useRef<Graphics | null>(null);
  const positionRef = useRef(position);
  const activeRef = useRef(active);
  const explosionTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const completedRef = useRef(false);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (active && !explosionTimeRef.current) {
      explosionTimeRef.current = Date.now();
      completedRef.current = false; // Reset completion flag
    } else if (!active) {
      explosionTimeRef.current = null;
      completedRef.current = false;
    }
  }, [active]);

  useEffect(() => {
    if (!app) return;

    const explosion = new Graphics();
    cameraContainer.addChild(explosion);
    explosionRef.current = explosion;

    const updateExplosion = () => {
      const exp = explosionRef.current;
      if (!exp) return;

      const isActive = activeRef.current;
      const expTime = explosionTimeRef.current;

      if (!isActive || !expTime) {
        exp.visible = false;
        return;
      }

      exp.visible = true;

      const now = Date.now();
      const elapsed = now - expTime;
      const duration = 500; // 500ms explosion duration (same as enemy)
      
      if (elapsed > duration) {
        exp.visible = false;
        // Notify that explosion is complete (only once)
        if (!completedRef.current && onCompleteRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
        return;
      }

      const pos = positionRef.current;
      const radius = 30;

      // Position the explosion graphics object (like enemy does)
      exp.x = pos.x;
      exp.y = pos.y;

      // Expand and fade explosion (exactly like enemy)
      const progress = elapsed / duration;
      const scale = 1 + progress * 2; // Expand to 3x size (same as enemy)
      const alpha = 1 - progress; // Fade out (same as enemy)
      
      exp.scale.set(scale);
      exp.alpha = alpha;

      exp.clear();

      // Draw circles at (0, 0) relative to the graphics object (exactly like enemy)
      // Outer explosion ring
      exp.circle(0, 0, radius);
      exp.fill({ color: 0xff8800, alpha: 0.8 });

      // Middle ring
      exp.circle(0, 0, radius * 0.7);
      exp.fill({ color: 0xff0000, alpha: 0.9 });

      // Inner core
      exp.circle(0, 0, radius * 0.4);
      exp.fill({ color: 0xffff00, alpha: 1.0 });
    };

    // Initial render
    updateExplosion();

    // Update on ticker
    const tickerCallback = () => {
      updateExplosion();
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (explosionRef.current) {
        cameraContainer.removeChild(explosionRef.current);
        explosionRef.current.destroy();
      }
    };
  }, [app, cameraContainer]);

  return null;
}
