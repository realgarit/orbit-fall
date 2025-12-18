import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { COMBAT_CONFIG, PLAYER_STATS, ENEMY_STATS } from '@shared/constants';
import type { LaserProjectile, EnemyState } from '@shared/types';

interface CombatSystemProps {
  app: Application;
  cameraContainer: Container;
  playerPosition: { x: number; y: number };
  playerRotation: number;
  playerHealth: number;
  enemyState: EnemyState | null;
  playerFiring: boolean;
  onPlayerHealthChange: (health: number) => void;
  onEnemyHealthChange: (health: number) => void;
  onLaserHit?: (laser: LaserProjectile) => void;
}

export function CombatSystem({
  app,
  cameraContainer,
  playerPosition,
  playerRotation,
  playerHealth,
  enemyState,
  playerFiring,
  onPlayerHealthChange,
  onEnemyHealthChange,
  onLaserHit,
}: CombatSystemProps) {
  const lasersRef = useRef<Map<string, { graphics: Graphics; data: LaserProjectile }>>(new Map());
  const playerLastFireTimeRef = useRef(0);
  const enemyLastFireTimeRef = useRef(0);
  const laserIdCounterRef = useRef(0);
  
  // Initialize enemy fire time when combat starts
  useEffect(() => {
    if (enemyState && enemyState.isEngaged && enemyLastFireTimeRef.current === 0) {
      enemyLastFireTimeRef.current = Date.now();
    }
  }, [enemyState?.isEngaged]);

  useEffect(() => {
    if (!app) return;

    const lasers = lasersRef.current;

    const createLaser = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      ownerId: string,
      targetId: string,
      damage: number
    ): LaserProjectile => {
      const dx = toX - fromX;
      const dy = toY - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx);

      const laser: LaserProjectile = {
        id: `laser-${laserIdCounterRef.current++}`,
        x: fromX,
        y: fromY,
        vx: Math.cos(angle) * COMBAT_CONFIG.LASER_SPEED,
        vy: Math.sin(angle) * COMBAT_CONFIG.LASER_SPEED,
        rotation: angle,
        damage,
        ownerId,
        targetId,
        spawnTime: Date.now(),
      };

      // Create visual
      const laserGraphics = new Graphics();
      
      // Create glowing red laser with rounded edges
      const length = COMBAT_CONFIG.LASER_LENGTH;
      const width = COMBAT_CONFIG.LASER_WIDTH;
      
      // Main laser body (rounded rectangle)
      laserGraphics.roundRect(-length / 2, -width / 2, length, width, width / 2);
      laserGraphics.fill({ color: COMBAT_CONFIG.LASER_COLOR, alpha: COMBAT_CONFIG.LASER_GLOW_ALPHA });
      
      // Glow effect (outer glow)
      laserGraphics.roundRect(-length / 2 - 2, -width / 2 - 2, length + 4, width + 4, (width + 4) / 2);
      laserGraphics.fill({ color: COMBAT_CONFIG.LASER_COLOR, alpha: 0.3 });

      laserGraphics.rotation = angle;
      laserGraphics.x = fromX;
      laserGraphics.y = fromY;

      cameraContainer.addChild(laserGraphics);
      lasers.set(laser.id, { graphics: laserGraphics, data: laser });

      return laser;
    };

    const checkLaserHit = (laser: LaserProjectile, targetPos: { x: number; y: number }, targetRadius: number = 20): boolean => {
      const dx = laser.x - targetPos.x;
      const dy = laser.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < targetRadius;
    };

    const tickerCallback = (ticker: any) => {
      const now = Date.now();
      const delta = ticker.deltaTime;

      // Player firing
      if (playerFiring && enemyState && enemyState.isEngaged) {
        const timeSinceLastFire = (now - playerLastFireTimeRef.current) / 1000;
        if (timeSinceLastFire >= 1 / COMBAT_CONFIG.FIRING_RATE) {
          createLaser(
            playerPosition.x,
            playerPosition.y,
            enemyState.x,
            enemyState.y,
            'player',
            enemyState.id,
            PLAYER_STATS.DAMAGE
          );
          playerLastFireTimeRef.current = now;
        }
      }

      // Enemy firing (only when engaged)
      if (enemyState && enemyState.isEngaged) {
        const timeSinceLastFire = (now - enemyLastFireTimeRef.current) / 1000;
        if (timeSinceLastFire >= 1 / COMBAT_CONFIG.FIRING_RATE) {
          createLaser(
            enemyState.x,
            enemyState.y,
            playerPosition.x,
            playerPosition.y,
            enemyState.id,
            'player',
            ENEMY_STATS.DRIFTER.DAMAGE
          );
          enemyLastFireTimeRef.current = now;
        }
      }

      // Update and check lasers
      const lasersToRemove: string[] = [];
      lasers.forEach(({ graphics, data: laser }, id) => {
        // Update position
        laser.x += laser.vx * delta;
        laser.y += laser.vy * delta;
        graphics.x = laser.x;
        graphics.y = laser.y;

        // Check timeout
        if (now - laser.spawnTime > COMBAT_CONFIG.LASER_TIMEOUT) {
          lasersToRemove.push(id);
          return;
        }

        // Check collision
        if (laser.targetId === 'player') {
          if (checkLaserHit(laser, playerPosition)) {
            // Hit player
            const newHealth = Math.max(0, playerHealth - laser.damage);
            onPlayerHealthChange(newHealth);
            if (onLaserHit) {
              onLaserHit(laser);
            }
            lasersToRemove.push(id);
          }
        } else if (laser.targetId === enemyState?.id && enemyState) {
          if (checkLaserHit(laser, { x: enemyState.x, y: enemyState.y })) {
            // Hit enemy
            const newHealth = Math.max(0, enemyState.health - laser.damage);
            onEnemyHealthChange(newHealth);
            if (onLaserHit) {
              onLaserHit(laser);
            }
            lasersToRemove.push(id);
          }
        }
      });

      // Remove hit/timed out lasers
      lasersToRemove.forEach((id) => {
        const laserData = lasers.get(id);
        if (laserData) {
          cameraContainer.removeChild(laserData.graphics);
          laserData.graphics.destroy();
          lasers.delete(id);
        }
      });
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      lasers.forEach(({ graphics }) => {
        cameraContainer.removeChild(graphics);
        graphics.destroy();
      });
      lasers.clear();
    };
  }, [
    app,
    cameraContainer,
    playerPosition,
    playerRotation,
    playerHealth,
    enemyState,
    playerFiring,
    onPlayerHealthChange,
    onEnemyHealthChange,
    onLaserHit,
  ]);

  return null;
}
