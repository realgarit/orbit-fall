import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { HP_BAR_CONFIG, SHIELD_BAR_CONFIG } from '@shared/constants';

interface HPBarProps {
  app: Application;
  cameraContainer: Container;
  position: { x: number; y: number };
  health: number;
  maxHealth: number;
  visible: boolean;
  shield?: number;
  maxShield?: number;
}

export function HPBar({ app, cameraContainer, position, health, maxHealth, visible, shield, maxShield }: HPBarProps) {
  const barRef = useRef<Graphics | null>(null);
  const healthRef = useRef(health);
  const maxHealthRef = useRef(maxHealth);
  const shieldRef = useRef(shield ?? 0);
  const maxShieldRef = useRef(maxShield ?? 0);
  const maxShieldProvidedRef = useRef(maxShield !== undefined); // Track if maxShield prop was provided
  const visibleRef = useRef(visible);
  const positionRef = useRef(position);
  const targetGraphicsRef = useRef<Graphics | null>(null);

  // Update refs when props change
  useEffect(() => {
    // If position changes significantly, reset target Graphics to force re-discovery
    const posChanged = 
      Math.abs(positionRef.current.x - position.x) > 10 ||
      Math.abs(positionRef.current.y - position.y) > 10;
    
    if (posChanged) {
      targetGraphicsRef.current = null; // Force re-discovery of target Graphics
    }
    
    positionRef.current = position;
    healthRef.current = health;
    maxHealthRef.current = maxHealth;
    // Store shield values - use 0 if undefined, but keep track if maxShield was provided
    shieldRef.current = shield ?? 0;
    maxShieldRef.current = maxShield ?? 0;
    maxShieldProvidedRef.current = maxShield !== undefined;
    visibleRef.current = visible;
  }, [position, health, maxHealth, visible, shield, maxShield]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    const bar = new Graphics();
    cameraContainer.addChild(bar);
    barRef.current = bar;

    // Find the ship/enemy Graphics object to read position directly
    // This avoids React state timing delays
    const findTargetGraphics = (): Graphics | null => {
      if (!cameraContainer) return null;
      const barIndex = cameraContainer.getChildIndex(bar);
      const expectedPos = positionRef.current;
      if (!expectedPos) return null;
      
      let closestGraphics: Graphics | null = null;
      let closestDistance = Infinity;
      const maxTolerance = 50; // Maximum distance to consider (reduced from 100px)
      
      // Look for Graphics objects before the HPBar
      // The ship/enemy should be added before the HPBar
      for (let i = 0; i < barIndex; i++) {
        const child = cameraContainer.children[i];
        if (child instanceof Graphics && child !== bar) {
          // Calculate distance to expected position
          const dx = child.x - expectedPos.x;
          const dy = child.y - expectedPos.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Find the closest Graphics object within tolerance
          if (distance < maxTolerance && distance < closestDistance) {
            closestGraphics = child;
            closestDistance = distance;
          }
        }
      }
      return closestGraphics;
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
      const currentPosition = positionRef.current;
      
      // If no position available, hide bar and return
      if (!currentPosition) {
        bar.visible = false;
        return;
      }
      
      if (targetGraphicsRef.current && targetGraphicsRef.current.visible) {
        // Verify the Graphics is still close to expected position (enemies may have moved)
        // Double-check currentPosition is still valid (handles hot reload stale closures)
        if (!currentPosition) {
          bar.visible = false;
          return;
        }
        // Double-check targetGraphicsRef is still valid (handles hot reload stale closures)
        const targetGraphics = targetGraphicsRef.current;
        if (!targetGraphics) {
          bar.visible = false;
          return;
        }
        const expectedPos = currentPosition;
        const dx = targetGraphics.x - expectedPos.x;
        const dy = targetGraphics.y - expectedPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If Graphics has moved too far from expected position, re-find it
        if (distance > 50) {
          targetGraphicsRef.current = findTargetGraphics();
        }
        
        // Use Graphics position if still valid, otherwise fallback
        // Re-check targetGraphicsRef after potential re-find
        const updatedTargetGraphics = targetGraphicsRef.current;
        if (updatedTargetGraphics && updatedTargetGraphics.visible) {
          pos = { x: updatedTargetGraphics.x, y: updatedTargetGraphics.y };
        } else {
          pos = currentPosition;
        }
      } else {
        // Fallback to prop if Graphics not found yet
        pos = currentPosition;
        // Try to find it again
        targetGraphicsRef.current = findTargetGraphics();
      }

      const hp = healthRef.current;
      const maxHp = maxHealthRef.current;
      const currentShield = shieldRef.current ?? 0;
      const maxSh = maxShieldRef.current ?? 0;
      const hpPercentage = Math.max(0, Math.min(1, hp / maxHp));
      // Always show shield bar if maxShield prop was provided (even if 0)
      // This allows showing shield bar even when shield is 0/0
      const hasShield = maxShieldProvidedRef.current;
      const shieldPercentage = hasShield && maxSh > 0 ? Math.max(0, Math.min(1, currentShield / maxSh)) : 0;

      // Position the Graphics object at the ship/enemy position
      // This ensures smooth movement without sub-pixel rendering issues
      bar.x = pos.x;
      bar.y = pos.y;

      // Redraw the bar (health and shield may have changed)
      bar.clear();

      const barWidth = HP_BAR_CONFIG.WIDTH;
      const barHeight = HP_BAR_CONFIG.HEIGHT;
      const shieldBarHeight = SHIELD_BAR_CONFIG.HEIGHT;
      const hpOffsetY = HP_BAR_CONFIG.OFFSET_Y;
      const shieldOffsetY = SHIELD_BAR_CONFIG.OFFSET_Y;

      // Draw shield bar first (if exists) - it goes below HP bar
      // Shield bar should be BELOW HP bar (more positive Y = lower on screen)
      // Always show shield bar if maxShield is defined (even if 0)
      if (hasShield) {
        // Shield background (dark bar)
        bar.rect(
          -barWidth / 2,
          shieldOffsetY,
          barWidth,
          shieldBarHeight
        );
        bar.fill({ color: 0x000000, alpha: 0.7 });

        // Shield bar (blue) - draw fill if shield > 0
        if (currentShield > 0 && maxSh > 0) {
          const shieldWidth = barWidth * shieldPercentage;
          bar.rect(
            -barWidth / 2,
            shieldOffsetY,
            shieldWidth,
            shieldBarHeight
          );
          bar.fill({ color: SHIELD_BAR_CONFIG.COLOR, alpha: 1.0 });
        }

        // Shield border
        bar.rect(
          -barWidth / 2,
          shieldOffsetY,
          barWidth,
          shieldBarHeight
        );
        bar.stroke({ color: 0xffffff, width: SHIELD_BAR_CONFIG.BORDER_WIDTH });
      }

      // Calculate color based on health percentage
      let hpColor: number;
      if (hpPercentage > 0.6) {
        hpColor = 0x33ff33; // More visible standard green
      } else if (hpPercentage > 0.3) {
        hpColor = 0xffff00; // Yellow
      } else {
        hpColor = 0xff0000; // Red
      }

      // Draw HP bar (above shield bar)
      // Background (dark bar)
      bar.rect(
        -barWidth / 2,
        hpOffsetY,
        barWidth,
        barHeight
      );
      bar.fill({ color: 0x000000, alpha: 0.7 });

      // Health bar
      const healthWidth = barWidth * hpPercentage;
      bar.rect(
        -barWidth / 2,
        hpOffsetY,
        healthWidth,
        barHeight
      );
      bar.fill(hpColor);

      // HP Border
      bar.rect(
        -barWidth / 2,
        hpOffsetY,
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

    if (!app?.ticker) return;

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
      if (barRef.current) {
        cameraContainer.removeChild(barRef.current);
        barRef.current.destroy();
      }
    };
  }, [app, cameraContainer]);

  return null;
}
