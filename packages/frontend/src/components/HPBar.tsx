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
  const healthRef = useRef(health);
  const maxHealthRef = useRef(maxHealth);
  const visibleRef = useRef(visible);
  const positionRef = useRef(position);
  const targetGraphicsRef = useRef<Graphics | null>(null);

  // Update refs when props change
  useEffect(() => {
    positionRef.current = position;
    healthRef.current = health;
    maxHealthRef.current = maxHealth;
    visibleRef.current = visible;
  }, [position, health, maxHealth, visible]);

  useEffect(() => {
    if (!app) return;

    const bar = new Graphics();
    cameraContainer.addChild(bar);
    barRef.current = bar;

    // Find the ship/enemy Graphics object to read position directly
    // This avoids React state timing delays
    const findTargetGraphics = (): Graphics | null => {
      const barIndex = cameraContainer.getChildIndex(bar);
      // Look for Graphics objects before the HPBar
      // The ship/enemy should be added before the HPBar
      for (let i = 0; i < barIndex; i++) {
        const child = cameraContainer.children[i];
        if (child instanceof Graphics && child !== bar) {
          // Check if this Graphics is near our expected position (within 100px)
          // This helps identify the correct Graphics object
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

    const updateBar = () => {
      const bar = barRef.current;
      if (!bar) return;

      if (!visibleRef.current) {
        bar.visible = false;
        return;
      }

      bar.visible = true;

      // Try to read position directly from ship/enemy Graphics object
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

      const hp = healthRef.current;
      const maxHp = maxHealthRef.current;
      const percentage = Math.max(0, Math.min(1, hp / maxHp));

      // Position the Graphics object at the ship/enemy position
      // This ensures smooth movement without sub-pixel rendering issues
      bar.x = pos.x;
      bar.y = pos.y;

      // Redraw the bar (health may have changed)
      bar.clear();

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

      // Draw relative to (0,0) since bar position is set above
      // This matches the pattern used by Ship and Enemy components
      // Background (dark bar)
      bar.rect(
        -barWidth / 2,
        offsetY,
        barWidth,
        barHeight
      );
      bar.fill({ color: 0x000000, alpha: 0.7 });

      // Health bar
      const healthWidth = barWidth * percentage;
      bar.rect(
        -barWidth / 2,
        offsetY,
        healthWidth,
        barHeight
      );
      bar.fill(color);

      // Border
      bar.rect(
        -barWidth / 2,
        offsetY,
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
