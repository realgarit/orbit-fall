import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { Application, Container, Text } from 'pixi.js';
import { DAMAGE_NUMBER_CONFIG } from '@orbit-fall/shared';

interface DamageNumberInstance {
  id: string;
  x: number;
  y: number;
  damage: number;
  color: number;
  spawnTime: number;
  text: Text;
  followPlayer: boolean;
  initialOffsetX: number; // Offset from player position at spawn time
  initialOffsetY: number;
}

interface DamageNumbersProps {
  app: Application;
  cameraContainer: Container;
  playerPosition: { x: number; y: number };
}

export interface DamageNumbersHandle {
  addDamageNumber: (damage: number, position: { x: number; y: number }, isPlayerDamage: boolean) => void;
}

// Easing functions
const easeOutQuad = (t: number): number => 1 - (1 - t) * (1 - t);
const easeInQuad = (t: number): number => t * t;

export const DamageNumbers = forwardRef<DamageNumbersHandle, DamageNumbersProps>(
  ({ app, cameraContainer, playerPosition }, ref) => {
    const instancesRef = useRef<Map<string, DamageNumberInstance>>(new Map());
    const idCounterRef = useRef(0);
    const playerPositionRef = useRef(playerPosition);

    // Update player position ref
    useEffect(() => {
      playerPositionRef.current = playerPosition;
    }, [playerPosition]);

    // Expose method for adding damage numbers
    useImperativeHandle(ref, () => ({
      addDamageNumber: (damage: number, position: { x: number; y: number }, isPlayerDamage: boolean) => {
        const id = `damage-${idCounterRef.current++}`;

        // Round damage to whole number for display
        const roundedDamage = Math.round(damage);

        // Display "MISS" if damage is 0, otherwise show the damage number
        const displayText = roundedDamage === 0 ? 'MISS' : roundedDamage.toString();

        // Create text
        const text = new Text({
          text: displayText,
          style: {
            fontFamily: DAMAGE_NUMBER_CONFIG.FONT_FAMILY,
            fontSize: DAMAGE_NUMBER_CONFIG.FONT_SIZE,
            fontWeight: DAMAGE_NUMBER_CONFIG.FONT_WEIGHT,
            fill: isPlayerDamage
              ? DAMAGE_NUMBER_CONFIG.ENEMY_DAMAGE_COLOR   // Violet when enemy damages player
              : DAMAGE_NUMBER_CONFIG.PLAYER_DAMAGE_COLOR, // Red when player damages enemy
            align: 'center',
            stroke: { color: 0x000000, width: 2 }, // Black outline for visibility
          },
        });

        text.anchor.set(0.5, 0.5); // Center the text

        // Add random horizontal offset to prevent stacking
        const randomOffsetX = (Math.random() - 0.5) * DAMAGE_NUMBER_CONFIG.RANDOM_OFFSET_X * 2;

        // For player damage (enemy damages player), calculate offset from player position
        const followPlayer = isPlayerDamage;
        const initialOffsetX = followPlayer ? randomOffsetX : 0;
        const initialOffsetY = followPlayer ? DAMAGE_NUMBER_CONFIG.OFFSET_Y : 0;

        text.x = position.x + randomOffsetX;
        text.y = position.y + DAMAGE_NUMBER_CONFIG.OFFSET_Y;

        cameraContainer.addChild(text);

        const instance: DamageNumberInstance = {
          id,
          x: position.x + randomOffsetX,
          y: position.y,
          damage: roundedDamage,
          color: isPlayerDamage ? DAMAGE_NUMBER_CONFIG.ENEMY_DAMAGE_COLOR : DAMAGE_NUMBER_CONFIG.PLAYER_DAMAGE_COLOR,
          spawnTime: Date.now(),
          text,
          followPlayer,
          initialOffsetX,
          initialOffsetY,
        };

        instancesRef.current.set(id, instance);
      },
    }));

    // Ticker-based animation loop
    useEffect(() => {
      if (!app?.ticker) return;

      const tickerCallback = () => {
        const now = Date.now();
        const toRemove: string[] = [];

        instancesRef.current.forEach((instance, id) => {
          const elapsed = now - instance.spawnTime;
          const progress = Math.min(1, elapsed / DAMAGE_NUMBER_CONFIG.DURATION);

          if (progress >= 1) {
            toRemove.push(id);
            return;
          }

          // Animation calculations using easing
          const easedProgress = easeOutQuad(progress);

          // Update position
          if (instance.followPlayer) {
            // For player damage: follow the player's current position
            const currentPlayerPos = playerPositionRef.current;
            instance.text.x = currentPlayerPos.x + instance.initialOffsetX;
            instance.text.y = currentPlayerPos.y + instance.initialOffsetY -
                             (DAMAGE_NUMBER_CONFIG.FLOAT_DISTANCE * easedProgress);
          } else {
            // For enemy damage: stay at world position
            instance.text.y = instance.y + DAMAGE_NUMBER_CONFIG.OFFSET_Y -
                             (DAMAGE_NUMBER_CONFIG.FLOAT_DISTANCE * easedProgress);
          }

          // Scale up
          const scale = DAMAGE_NUMBER_CONFIG.START_SCALE +
                       (DAMAGE_NUMBER_CONFIG.END_SCALE - DAMAGE_NUMBER_CONFIG.START_SCALE) * easedProgress;
          instance.text.scale.set(scale);

          // Fade out (use different easing for fade)
          instance.text.alpha = DAMAGE_NUMBER_CONFIG.START_ALPHA -
                               (DAMAGE_NUMBER_CONFIG.START_ALPHA * easeInQuad(progress));
        });

        // Cleanup completed animations
        toRemove.forEach(id => {
          const instance = instancesRef.current.get(id);
          if (instance) {
            cameraContainer.removeChild(instance.text);
            instance.text.destroy();
            instancesRef.current.delete(id);
          }
        });
      };

      app.ticker.add(tickerCallback);

      return () => {
        if (app?.ticker) {
          app.ticker.remove(tickerCallback);
        }
        // Cleanup all remaining instances
        instancesRef.current.forEach(instance => {
          cameraContainer.removeChild(instance.text);
          instance.text.destroy();
        });
        instancesRef.current.clear();
      };
    }, [app, cameraContainer]);

    return null;
  }
);

DamageNumbers.displayName = 'DamageNumbers';
