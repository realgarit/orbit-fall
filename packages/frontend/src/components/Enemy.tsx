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
  isDead?: boolean;
}

export function Enemy({ app, cameraContainer, playerPosition, enemyState: externalState, onStateUpdate, onPositionUpdate, isDead = false }: EnemyProps) {
  const enemyRef = useRef<Graphics | null>(null);
  const nameTextRef = useRef<Text | null>(null);
  const explosionRef = useRef<Graphics | null>(null);
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
  const deathTimeRef = useRef<number | null>(null);
  const explosionTimeRef = useRef<number | null>(null);
  const fadeAlphaRef = useRef(1);
  const previousHealthRef = useRef<number>(ENEMY_STATS.DRIFTER.MAX_HEALTH);

  // Keep refs updated
  useEffect(() => {
    playerPositionRef.current = playerPosition;
    onStateUpdateRef.current = onStateUpdate;
    onPositionUpdateRef.current = onPositionUpdate;
  }, [playerPosition, onStateUpdate, onPositionUpdate]);

  // Sync external state when provided (for health, engagement status)
  // Don't sync position/velocity as those are managed internally
  useEffect(() => {
    // Check for death even when externalState is null (enemy marked as dead in parent)
    // This handles the case where death is detected in parent before externalState becomes null
    if (!externalState) {
      // ExternalState is null - enemy is marked as dead
      // If isDead prop is true and we haven't set deathTimeRef yet, initialize death animation
      if (isDead && previousHealthRef.current > 0 && !deathTimeRef.current) {
        // Death just happened - update health to 0 and initialize death animation
        stateRef.current.health = 0;
        deathTimeRef.current = Date.now();
        explosionTimeRef.current = Date.now();
        // Hide enemy model immediately so explosion looks better
        if (enemyRef.current) {
          enemyRef.current.visible = false;
        }
        if (nameTextRef.current) {
          nameTextRef.current.visible = false;
        }
        // Create explosion
        if (enemyRef.current && !explosionRef.current) {
          const explosion = new Graphics();
          const radius = 30;
          // Outer explosion ring
          explosion.circle(0, 0, radius);
          explosion.fill({ color: 0xff8800, alpha: 0.8 });
          // Middle ring
          explosion.circle(0, 0, radius * 0.7);
          explosion.fill({ color: 0xff0000, alpha: 0.9 });
          // Inner core
          explosion.circle(0, 0, radius * 0.4);
          explosion.fill({ color: 0xffff00, alpha: 1.0 });
          
          explosion.x = stateRef.current.x;
          explosion.y = stateRef.current.y;
          cameraContainer.addChild(explosion);
          explosionRef.current = explosion;
        }
      }
      // Update previous health for next check
      previousHealthRef.current = stateRef.current.health;
      return;
    }
    
    if (externalState) {
      const wasAlive = stateRef.current.health > 0;
      const wasDead = stateRef.current.health <= 0;
      const isNowAlive = externalState.health > 0;
      
      // Update previous health before changing current health
      previousHealthRef.current = stateRef.current.health;
      
      stateRef.current.health = externalState.health;
      stateRef.current.maxHealth = externalState.maxHealth;
      stateRef.current.isEngaged = externalState.isEngaged;
      stateRef.current.lastFireTime = externalState.lastFireTime;
      
      // Check if enemy just died
      if (wasAlive && externalState.health <= 0 && !deathTimeRef.current) {
        deathTimeRef.current = Date.now();
        explosionTimeRef.current = Date.now();
        // Hide enemy model immediately so explosion looks better
        if (enemyRef.current) {
          enemyRef.current.visible = false;
        }
        if (nameTextRef.current) {
          nameTextRef.current.visible = false;
        }
        // Create explosion
        if (enemyRef.current && !explosionRef.current) {
          const explosion = new Graphics();
          const radius = 30;
          // Outer explosion ring
          explosion.circle(0, 0, radius);
          explosion.fill({ color: 0xff8800, alpha: 0.8 });
          // Middle ring
          explosion.circle(0, 0, radius * 0.7);
          explosion.fill({ color: 0xff0000, alpha: 0.9 });
          // Inner core
          explosion.circle(0, 0, radius * 0.4);
          explosion.fill({ color: 0xffff00, alpha: 1.0 });
          
          explosion.x = stateRef.current.x;
          explosion.y = stateRef.current.y;
          cameraContainer.addChild(explosion);
          explosionRef.current = explosion;
        }
      }
      
      // Check if enemy just respawned (was dead, now alive)
      if (wasDead && isNowAlive) {
        // Reset death-related refs
        deathTimeRef.current = null;
        explosionTimeRef.current = null;
        fadeAlphaRef.current = 1;
        
        // Show enemy model again
        if (enemyRef.current) {
          enemyRef.current.visible = true;
          enemyRef.current.alpha = 1;
          // Update position to new spawn location
          enemyRef.current.x = externalState.x;
          enemyRef.current.y = externalState.y;
        }
        if (nameTextRef.current) {
          nameTextRef.current.visible = true;
          nameTextRef.current.alpha = 1;
          // Update position to new spawn location
          nameTextRef.current.x = externalState.x;
          nameTextRef.current.y = externalState.y + 35;
        }
        
        // Clean up any existing explosion
        if (explosionRef.current) {
          if (explosionRef.current.parent) {
            cameraContainer.removeChild(explosionRef.current);
          }
          explosionRef.current.destroy();
          explosionRef.current = null;
        }
        
        // Update internal state position
        stateRef.current.x = externalState.x;
        stateRef.current.y = externalState.y;
        stateRef.current.vx = 0;
        stateRef.current.vy = 0;
        stateRef.current.rotation = 0;
        
        // Force position update to parent immediately after respawn
        if (onPositionUpdateRef.current) {
          onPositionUpdateRef.current({ x: externalState.x, y: externalState.y });
        }
      }
    }
  }, [externalState?.health, externalState?.maxHealth, externalState?.isEngaged, externalState?.lastFireTime, externalState?.x, externalState?.y, isDead, cameraContainer]);

  useEffect(() => {
    if (!app) return;

    // Only create Graphics if it doesn't exist
    if (!enemyRef.current) {
      // Spawn enemy near player (200-400px away) - only once
      if (!spawnedRef.current && externalState) {
        // Use external state position if available
        stateRef.current.x = externalState.x;
        stateRef.current.y = externalState.y;
        stateRef.current.id = externalState.id;
        spawnedRef.current = true;
      } else if (!spawnedRef.current) {
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
      nameText.y = stateRef.current.y + 35; // Below ship, closer to selection circle (radius 30 + gap 5 = 35)
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
        const explosion = explosionRef.current;
        // Early return if enemy or nameText don't exist
        if (!enemy || !nameText) {
          return;
        }

        const delta = ticker.deltaTime;
        const state = stateRef.current;
        const now = Date.now();
        
        // Handle death and explosion
        // Enemy is dead if: health <= 0 OR deathTimeRef is set (death animation in progress)
        // After respawn, health > 0 and deathTimeRef is null, so enemy is alive
        if (state.health <= 0 || deathTimeRef.current !== null) {
          // Update explosion animation
          if (explosion && explosionTimeRef.current) {
            const explosionAge = now - explosionTimeRef.current;
            const explosionDuration = 500; // 500ms explosion
            
            if (explosionAge < explosionDuration) {
              // Expand and fade explosion
              const progress = explosionAge / explosionDuration;
              const scale = 1 + progress * 2; // Expand to 3x size
              const alpha = 1 - progress;
              explosion.scale.set(scale);
              explosion.alpha = alpha;
            } else {
              // Remove explosion after duration
              if (explosion.parent) {
                cameraContainer.removeChild(explosion);
                explosion.destroy();
                explosionRef.current = null;
              }
            }
          }
          
          // Fade out enemy after explosion
          if (deathTimeRef.current) {
            const deathAge = now - deathTimeRef.current;
            const fadeStart = 500; // Start fading after explosion
            const fadeDuration = 1000; // 1 second fade
            
            if (deathAge > fadeStart) {
              const fadeProgress = Math.min(1, (deathAge - fadeStart) / fadeDuration);
              fadeAlphaRef.current = 1 - fadeProgress;
              enemy.alpha = fadeAlphaRef.current;
              nameText.alpha = fadeAlphaRef.current;
            }
          }
          
          // Don't update position or rotation when dead
          return;
        }

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
        nameText.y = state.y + 35; // Below ship, closer to selection circle (radius 30 + gap 5 = 35)

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
      if (explosionRef.current) {
        cameraContainer.removeChild(explosionRef.current);
        explosionRef.current.destroy();
        explosionRef.current = null;
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
