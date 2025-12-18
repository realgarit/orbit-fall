import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { HP_BAR_CONFIG } from '@shared/constants';

interface HPBarProps {
  app: Application;
  cameraContainer: Container;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  visible: boolean;
}

export function HPBar({ app, cameraContainer, position, health, maxHealth, visible }: HPBarProps) {
  const barRef = useRef<Graphics | null>(null);
  const shipGraphicsRef = useRef<Graphics | null>(null);
  const healthRef = useRef(health);
  const maxHealthRef = useRef(maxHealth);
  const visibleRef = useRef(visible);
  const fallbackPositionRef = useRef(position);

  // Update fallback position and other refs
  useEffect(() => {
    fallbackPositionRef.current = position;
    healthRef.current = health;
    maxHealthRef.current = maxHealth;
    visibleRef.current = visible;
  }, [position, health, maxHealth, visible]);

  useEffect(() => {
    if (!app) return;

    const bar = new Graphics();
    cameraContainer.addChild(bar);
    barRef.current = bar;

    // Find the ship graphics object - it's added before the HP bar
    // Look for the first Graphics object that's not the HP bar itself
    const findShipGraphics = (): Graphics | null => {
      const barIndex = cameraContainer.getChildIndex(bar);
      for (let i = 0; i < barIndex; i++) {
        const child = cameraContainer.children[i];
        if (child instanceof Graphics) {
          return child;
        }
      }
      return null;
    };

    // Try to find ship graphics
    shipGraphicsRef.current = findShipGraphics();

    const updateBar = () => {
      const bar = barRef.current;
      if (!bar) return;

      bar.clear();

      if (!visibleRef.current) {
        bar.visible = false;
        return;
      }

      bar.visible = true;

      // Try to find ship graphics if we don't have it yet
      if (!shipGraphicsRef.current) {
        shipGraphicsRef.current = findShipGraphics();
      }

      // Read position directly from ship graphics object (synchronously updated)
      // This avoids React state timing issues
      let pos: { x: number; y: number };
      if (shipGraphicsRef.current) {
        pos = { x: shipGraphicsRef.current.x, y: shipGraphicsRef.current.y };
      } else {
        // Fallback to prop if ship not found yet
        pos = fallbackPositionRef.current;
      }
      const hp = healthRef.current;
      const maxHp = maxHealthRef.current;
      const percentage = Math.max(0, Math.min(1, hp / maxHp));

      // Calculate color based on health percentage
      let color: number;
      if (percentage > 0.6) {
        color = 0x33ff33; // More visible standard green
      } else if (percentage > 0.3) {
        color = 0xffff00; // Yellow
      } else {
        color = 0xff0000; // Red
      }

      const barWidth = HP_BAR_CONFIG.WIDTH;
      const barHeight = HP_BAR_CONFIG.HEIGHT;
      const offsetY = HP_BAR_CONFIG.OFFSET_Y;

      // Background (dark bar)
      bar.rect(
        pos.x - barWidth / 2,
        pos.y + offsetY,
        barWidth,
        barHeight
      );
      bar.fill({ color: 0x000000, alpha: 0.7 });

      // Health bar
      const healthWidth = barWidth * percentage;
      bar.rect(
        pos.x - barWidth / 2,
        pos.y + offsetY,
        healthWidth,
        barHeight
      );
      bar.fill(color);

      // Border
      bar.rect(
        pos.x - barWidth / 2,
        pos.y + offsetY,
        barWidth,
        barHeight
      );
      bar.stroke({ color: 0xffffff, width: HP_BAR_CONFIG.BORDER_WIDTH });
    };

    // Initial render
    updateBar();

    // Update on ticker
    const tickerCallback = () => {
      updateBar();
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (barRef.current) {
        cameraContainer.removeChild(barRef.current);
        barRef.current.destroy();
      }
    };
  }, [app, cameraContainer]);

  return null;
}
