import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text } from 'pixi.js';
import { MAP_WIDTH, MAP_HEIGHT, ENEMY_STATS } from '@shared/constants';
import type { EnemyState } from '@shared/types';

interface EnemyProps {
  app: Application;
  cameraContainer: Container;
  playerPosition: { x: number; y: number };
  enemyState?: EnemyState | null;
  onStateUpdate?: (state: EnemyState) => void;
  onPositionUpdate?: (position: { x: number; y: number }) => void;
  inCombat?: boolean;
}

export function Enemy({ app, cameraContainer, playerPosition, enemyState: externalState, onStateUpdate, onPositionUpdate, inCombat = false }: EnemyProps) {
  const enemyRef = useRef<Graphics | null>(null);
  const nameTextRef = useRef<Text | null>(null);
  const stateRef = useRef<EnemyState>({
    id: 'drifter-1',
    name: ENEMY_STATS.DRIFTER.NAME,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    health: ENEMY_STATS.DRIFTER.MAX_HEALTH,
    maxHealth: ENEMY_STATS.DRIFTER.MAX_HEALTH,
    rotation: 0,
    isEngaged: false,
    lastFireTime: 0,
  });
  const patrolVelocityRef = useRef({ vx: 0, vy: 0 });
  const lastPatrolChangeRef = useRef(0);
  const spawnedRef = useRef(false);
  const playerPositionRef = useRef(playerPosition);
  const onStateUpdateRef = useRef(onStateUpdate);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const tickerAddedRef = useRef(false);
  const tickerCallbackRef = useRef<((ticker: any) => void) | null>(null);

  // Keep refs updated
  useEffect(() => {
    playerPositionRef.current = playerPosition;
    onStateUpdateRef.current = onStateUpdate;
    onPositionUpdateRef.current = onPositionUpdate;
  }, [playerPosition, onStateUpdate, onPositionUpdate]);

  // Sync external state when provided (for health, engagement status)
  // Don't sync position/velocity as those are managed internally
  useEffect(() => {
    if (externalState) {
      stateRef.current.health = externalState.health;
      stateRef.current.maxHealth = externalState.maxHealth;
      stateRef.current.isEngaged = externalState.isEngaged;
      stateRef.current.lastFireTime = externalState.lastFireTime;
    }
  }, [externalState?.health, externalState?.maxHealth, externalState?.isEngaged, externalState?.lastFireTime]);

  useEffect(() => {
    if (!app) return;

    // Only create Graphics if it doesn't exist
    if (!enemyRef.current) {
      // Spawn enemy near player (200-400px away) - only once
      if (!spawnedRef.current) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 200 + Math.random() * 200;
        const spawnX = playerPosition.x + Math.cos(angle) * distance;
        const spawnY = playerPosition.y + Math.sin(angle) * distance;
        
        // Clamp to map bounds
        stateRef.current.x = Math.max(0, Math.min(MAP_WIDTH, spawnX));
        stateRef.current.y = Math.max(0, Math.min(MAP_HEIGHT, spawnY));
        spawnedRef.current = true;
      }

      // Create enemy ship visual - similar size but weaker appearance
      const enemy = new Graphics();
      
      // Main body (triangle) - similar to player but darker/simpler
      enemy.moveTo(0, -20); // Top point (nose)
      enemy.lineTo(-12, 10); // Bottom left
      enemy.lineTo(0, 5); // Center bottom
      enemy.lineTo(12, 10); // Bottom right
      enemy.lineTo(0, -20); // Close triangle
      enemy.fill(0x2a4a7f); // Darker blue body (weaker appearance)
      
      // Add wings (simpler than player)
      enemy.moveTo(-12, 10);
      enemy.lineTo(-18, 15);
      enemy.lineTo(-12, 13);
      enemy.fill(0x1a3a5f); // Even darker wing
      
      enemy.moveTo(12, 10);
      enemy.lineTo(18, 15);
      enemy.lineTo(12, 13);
      enemy.fill(0x1a3a5f); // Even darker wing
      
      // Add cockpit (darker)
      enemy.circle(0, -8, 4);
      enemy.fill(0x006644); // Darker green cockpit
      
      // Add engine glow (weaker)
      enemy.circle(-6, 7, 2);
      enemy.fill({ color: 0xcc8800, alpha: 0.6 }); // Dimmer orange engine
      enemy.circle(6, 7, 2);
      enemy.fill({ color: 0xcc8800, alpha: 0.6 }); // Dimmer orange engine

      enemy.x = stateRef.current.x;
      enemy.y = stateRef.current.y;

      cameraContainer.addChild(enemy);
      enemyRef.current = enemy;

      // Create name text
      const nameText = new Text({
        text: ENEMY_STATS.DRIFTER.NAME,
        style: {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: 14,
          fontWeight: 'bold',
          fill: 0xff3333, // Bright vibrant red
          align: 'center',
        },
      });
      nameText.anchor.set(0.5, 0);
      nameText.x = stateRef.current.x;
      nameText.y = stateRef.current.y + 45; // Below ship, outside selection circle (radius 30)
      cameraContainer.addChild(nameText);
      nameTextRef.current = nameText;

      // Initialize random patrol velocity
      const randomAngle = Math.random() * Math.PI * 2;
      const patrolSpeed = 0.5; // Slow drift
      patrolVelocityRef.current.vx = Math.cos(randomAngle) * patrolSpeed;
      patrolVelocityRef.current.vy = Math.sin(randomAngle) * patrolSpeed;
      lastPatrolChangeRef.current = Date.now();
    }

    // Animation ticker - only add once and only if enemy exists
    if (!tickerAddedRef.current && enemyRef.current) {
      tickerAddedRef.current = true;
      const tickerCallback = (ticker: any) => {
        // Always get fresh refs in case they changed
        const enemy = enemyRef.current;
        const nameText = nameTextRef.current;
        // Early return if enemy or nameText don't exist
        if (!enemy || !nameText) {
          return;
        }

        const delta = ticker.deltaTime;
        const state = stateRef.current;
        const now = Date.now();

        const currentPlayerPos = playerPositionRef.current;
        const dx = currentPlayerPos.x - state.x;
        const dy = currentPlayerPos.y - state.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (state.isEngaged) {
          // Engaged/aggressive: always chase player and maintain combat distance,
          // regardless of whether the player considers themselves "in combat".
          const COMBAT_DISTANCE = 200; // Preferred combat distance

          if (distance > COMBAT_DISTANCE) {
            // Move toward player
            const followSpeed = 1.5;
            const normalizedDx = dx / distance;
            const normalizedDy = dy / distance;
            state.vx = normalizedDx * followSpeed;
            state.vy = normalizedDy * followSpeed;
          } else {
            // At combat distance, stop closing further
            state.vx = 0;
            state.vy = 0;
          }
        } else {
          // Not engaged yet: pure AI patrol, ignore player position entirely.
          // Change patrol direction periodically (every 3-5 seconds)
          if (now - lastPatrolChangeRef.current > 3000 + Math.random() * 2000) {
            const randomAngle = Math.random() * Math.PI * 2;
            const patrolSpeed = 0.5; // Slow drift
            patrolVelocityRef.current.vx = Math.cos(randomAngle) * patrolSpeed;
            patrolVelocityRef.current.vy = Math.sin(randomAngle) * patrolSpeed;
            lastPatrolChangeRef.current = now;
          }

          // Use patrol velocity (AI movement)
          state.vx = patrolVelocityRef.current.vx;
          state.vy = patrolVelocityRef.current.vy;
        }

        // Update position
        state.x += state.vx * delta;
        state.y += state.vy * delta;

        // Boundary constraints
        state.x = Math.max(0, Math.min(MAP_WIDTH, state.x));
        state.y = Math.max(0, Math.min(MAP_HEIGHT, state.y));

        // Update visuals - enemy and nameText already checked at start
        enemy.x = state.x;
        enemy.y = state.y;
        nameText.x = state.x;
        nameText.y = state.y + 45; // Below ship, outside selection circle (radius 30)

        // Update rotation:
        // - When engaged: always face the player
        // - When not engaged: face patrol movement direction only (never track player)
        if (state.isEngaged) {
          if (distance > 0.01) {
            const targetRotation = Math.atan2(dy, dx) + Math.PI / 2;
            state.rotation = targetRotation;
            enemy.rotation = state.rotation;
          }
        } else if (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01) {
          const targetRotation = Math.atan2(state.vy, state.vx) + Math.PI / 2;
          state.rotation = targetRotation;
          enemy.rotation = state.rotation;
        }

        // Notify parent of state changes
        if (onStateUpdateRef.current) {
          onStateUpdateRef.current({ ...state });
        }
        if (onPositionUpdateRef.current) {
          onPositionUpdateRef.current({ x: state.x, y: state.y });
        }
      };

      tickerCallbackRef.current = tickerCallback;
      app.ticker.add(tickerCallback);
    }

    return () => {
      if (tickerAddedRef.current && tickerCallbackRef.current) {
        app.ticker.remove(tickerCallbackRef.current);
        tickerAddedRef.current = false;
        tickerCallbackRef.current = null;
      }
      if (enemyRef.current) {
        cameraContainer.removeChild(enemyRef.current);
        enemyRef.current.destroy();
        enemyRef.current = null;
      }
      if (nameTextRef.current) {
        cameraContainer.removeChild(nameTextRef.current);
        nameTextRef.current.destroy();
        nameTextRef.current = null;
      }
    };
  }, [app, cameraContainer]);

  // Expose method to update state from parent
  useEffect(() => {
    // This allows parent to update enemy state (e.g., health, engagement)
    return () => {};
  }, []);

  return null;
}
