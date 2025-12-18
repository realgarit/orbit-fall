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
}

export function Enemy({ app, cameraContainer, playerPosition, enemyState: externalState, onStateUpdate, onPositionUpdate }: EnemyProps) {
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
        fontFamily: 'Arial',
        fontSize: 14,
        fill: 0xff0000, // Red
        align: 'center',
      },
    });
    nameText.anchor.set(0.5, 0);
    nameText.x = stateRef.current.x;
    nameText.y = stateRef.current.y + 25; // Below ship
    cameraContainer.addChild(nameText);
    nameTextRef.current = nameText;

    // Initialize random patrol velocity
    const randomAngle = Math.random() * Math.PI * 2;
    const patrolSpeed = 0.5; // Slow drift
    patrolVelocityRef.current.vx = Math.cos(randomAngle) * patrolSpeed;
    patrolVelocityRef.current.vy = Math.sin(randomAngle) * patrolSpeed;
    lastPatrolChangeRef.current = Date.now();

    // Animation ticker
    const tickerCallback = (ticker: any) => {
      const enemy = enemyRef.current;
      const nameText = nameTextRef.current;
      if (!enemy || !nameText) return;

      const delta = ticker.deltaTime;
      const state = stateRef.current;
      const now = Date.now();

      // Patrol behavior when not engaged
      if (!state.isEngaged) {
        // Change patrol direction every 2-4 seconds
        if (now - lastPatrolChangeRef.current > 2000 + Math.random() * 2000) {
          const randomAngle = Math.random() * Math.PI * 2;
          const patrolSpeed = 0.5;
          patrolVelocityRef.current.vx = Math.cos(randomAngle) * patrolSpeed;
          patrolVelocityRef.current.vy = Math.sin(randomAngle) * patrolSpeed;
          lastPatrolChangeRef.current = now;
        }

        // Apply patrol velocity
        state.vx = patrolVelocityRef.current.vx;
        state.vy = patrolVelocityRef.current.vy;
      } else {
        // Stop patrolling when engaged
        state.vx = 0;
        state.vy = 0;
      }

      // Update position
      state.x += state.vx * delta;
      state.y += state.vy * delta;

      // Boundary constraints
      state.x = Math.max(0, Math.min(MAP_WIDTH, state.x));
      state.y = Math.max(0, Math.min(MAP_HEIGHT, state.y));

      // Update visuals
      enemy.x = state.x;
      enemy.y = state.y;
      nameText.x = state.x;
      nameText.y = state.y + 25;

      // Update rotation to face movement direction when patrolling
      if (!state.isEngaged && (Math.abs(state.vx) > 0.01 || Math.abs(state.vy) > 0.01)) {
        state.rotation = Math.atan2(state.vy, state.vx) + Math.PI / 2;
        enemy.rotation = state.rotation;
      }

      // Notify parent of state changes
      if (onStateUpdate) {
        onStateUpdate({ ...state });
      }
      if (onPositionUpdate) {
        onPositionUpdate({ x: state.x, y: state.y });
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (enemyRef.current) {
        cameraContainer.removeChild(enemyRef.current);
        enemyRef.current.destroy();
      }
      if (nameTextRef.current) {
        cameraContainer.removeChild(nameTextRef.current);
        nameTextRef.current.destroy();
      }
    };
  }, [app, cameraContainer, playerPosition, onStateUpdate, onPositionUpdate]);

  // Expose method to update state from parent
  useEffect(() => {
    // This allows parent to update enemy state (e.g., health, engagement)
    return () => {};
  }, []);

  return null;
}
