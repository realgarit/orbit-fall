import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { COMBAT_CONFIG, PLAYER_STATS, ENEMY_STATS } from '@shared/constants';
import type { LaserProjectile, EnemyState } from '@shared/types';

interface CombatSystemProps {
  app: Application;
  cameraContainer: Container;
  playerPosition: { x: number; y: number };
  playerVelocity: { vx: number; vy: number };
  playerRotation: number;
  playerHealth: number;
  enemyState: EnemyState | null;
  playerFiring: boolean;
  onPlayerHealthChange: (health: number) => void;
  onEnemyHealthChange: (health: number) => void;
  onLaserHit?: (laser: LaserProjectile) => void;
  isInSafetyZone?: boolean;
  laserAmmo?: number;
  onLaserAmmoConsume?: () => void;
}

interface LaserData {
  graphics: Graphics;
  projectile: LaserProjectile;
}

export function CombatSystem({
  app,
  cameraContainer,
  playerPosition,
  playerVelocity,
  playerRotation,
  playerHealth,
  enemyState,
  playerFiring,
  onPlayerHealthChange,
  onEnemyHealthChange,
  onLaserHit,
  isInSafetyZone = false,
  laserAmmo = 0,
  onLaserAmmoConsume,
}: CombatSystemProps) {
  const lasersRef = useRef<Map<string, LaserData>>(new Map());
  const playerLastFireTimeRef = useRef(0);
  const enemyLastFireTimeRef = useRef(0);
  const laserIdCounterRef = useRef(0);
  
  // Use refs to avoid recreating ticker on every prop change
  const playerPositionRef = useRef(playerPosition);
  const playerVelocityRef = useRef(playerVelocity);
  const playerHealthRef = useRef(playerHealth);
  const enemyStateRef = useRef(enemyState);
  const playerFiringRef = useRef(playerFiring);
  const onPlayerHealthChangeRef = useRef(onPlayerHealthChange);
  const onEnemyHealthChangeRef = useRef(onEnemyHealthChange);
  const onLaserHitRef = useRef(onLaserHit);
  const isInSafetyZoneRef = useRef(isInSafetyZone);
  const laserAmmoRef = useRef(laserAmmo);
  const onLaserAmmoConsumeRef = useRef(onLaserAmmoConsume);

  // Update refs when props change
  useEffect(() => {
    playerPositionRef.current = playerPosition;
  }, [playerPosition]);

  useEffect(() => {
    playerVelocityRef.current = playerVelocity;
  }, [playerVelocity]);

  useEffect(() => {
    playerHealthRef.current = playerHealth;
  }, [playerHealth]);

  useEffect(() => {
    enemyStateRef.current = enemyState;
  }, [enemyState]);

  useEffect(() => {
    playerFiringRef.current = playerFiring;
  }, [playerFiring]);

  useEffect(() => {
    onPlayerHealthChangeRef.current = onPlayerHealthChange;
  }, [onPlayerHealthChange]);

  useEffect(() => {
    onEnemyHealthChangeRef.current = onEnemyHealthChange;
  }, [onEnemyHealthChange]);

  useEffect(() => {
    onLaserHitRef.current = onLaserHit;
  }, [onLaserHit]);

  useEffect(() => {
    isInSafetyZoneRef.current = isInSafetyZone;
  }, [isInSafetyZone]);

  useEffect(() => {
    laserAmmoRef.current = laserAmmo;
  }, [laserAmmo]);

  useEffect(() => {
    onLaserAmmoConsumeRef.current = onLaserAmmoConsume;
  }, [onLaserAmmoConsume]);

  // Initialize enemy fire time when combat starts
  useEffect(() => {
    if (enemyState && enemyState.isEngaged && enemyLastFireTimeRef.current === 0) {
      enemyLastFireTimeRef.current = Date.now();
    }
  }, [enemyState?.isEngaged]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    const lasers = lasersRef.current;

    const createLaserGraphics = (x: number, y: number, angle: number): Graphics => {
      const graphics = new Graphics();
      const length = COMBAT_CONFIG.LASER_LENGTH;
      const width = COMBAT_CONFIG.LASER_WIDTH;
      
      // Draw laser as a rounded rectangle
      graphics.roundRect(-length / 2, -width / 2, length, width, width / 2);
      graphics.fill({ color: COMBAT_CONFIG.LASER_COLOR, alpha: 1.0 });
      
      // Add glow
      graphics.roundRect(-length / 2 - 2, -width / 2 - 2, length + 4, width + 4, (width + 4) / 2);
      graphics.fill({ color: COMBAT_CONFIG.LASER_COLOR, alpha: 0.5 });
      
      graphics.rotation = angle;
      graphics.x = x;
      graphics.y = y;
      
      return graphics;
    };

    /**
     * Predicts where a moving target will be when a laser fired from the source reaches it.
     * Uses iterative approach to solve the intercept problem.
     */
    const predictTargetPosition = (
      fromX: number,
      fromY: number,
      targetX: number,
      targetY: number,
      targetVx: number,
      targetVy: number
    ): { x: number; y: number } => {
      // If target is stationary, return current position
      if (Math.abs(targetVx) < 0.01 && Math.abs(targetVy) < 0.01) {
        return { x: targetX, y: targetY };
      }

      // Iterative prediction: start with current position, refine based on time to intercept
      let predictedX = targetX;
      let predictedY = targetY;
      
      // Use a few iterations to converge on the intercept point
      for (let i = 0; i < 5; i++) {
        const dx = predictedX - fromX;
        const dy = predictedY - fromY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 1) break; // Too close, use current prediction
        
        // Calculate time to reach predicted position (in frames, since LASER_SPEED is per frame)
        const timeToReach = distance / COMBAT_CONFIG.LASER_SPEED;
        
        // Predict where target will be at that time
        predictedX = targetX + targetVx * timeToReach;
        predictedY = targetY + targetVy * timeToReach;
      }
      
      return { x: predictedX, y: predictedY };
    };

    const createLaser = (
      fromX: number,
      fromY: number,
      toX: number,
      toY: number,
      ownerId: string,
      targetId: string,
      damage: number,
      targetVx: number = 0,
      targetVy: number = 0
    ): void => {
      // Predict where target will be when laser arrives
      const predictedTarget = predictTargetPosition(fromX, fromY, toX, toY, targetVx, targetVy);
      
      const dx = predictedTarget.x - fromX;
      const dy = predictedTarget.y - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 1) return; // Don't create laser if target is too close
      
      const angle = Math.atan2(dy, dx);
      
      // Spawn laser at source position
      const spawnX = fromX;
      const spawnY = fromY;

      const projectile: LaserProjectile = {
        id: `laser-${laserIdCounterRef.current++}`,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * COMBAT_CONFIG.LASER_SPEED,
        vy: Math.sin(angle) * COMBAT_CONFIG.LASER_SPEED,
        rotation: angle,
        damage,
        ownerId,
        targetId,
        spawnTime: Date.now(),
      };

      const graphics = createLaserGraphics(spawnX, spawnY, angle);
      cameraContainer.addChild(graphics);
      
      lasers.set(projectile.id, { graphics, projectile });
    };

    const checkLaserHit = (laser: LaserProjectile, targetPos: { x: number; y: number }, targetRadius: number = 20): boolean => {
      const dx = laser.x - targetPos.x;
      const dy = laser.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < targetRadius;
    };

    const tickerCallback = () => {
      const now = Date.now();
      const delta = app.ticker.deltaTime;
      
      const currentPlayerPos = playerPositionRef.current;
      const currentPlayerVel = playerVelocityRef.current;
      const currentPlayerHealth = playerHealthRef.current;
      const currentEnemyState = enemyStateRef.current;
      const currentPlayerFiring = playerFiringRef.current;

      // Player firing (only if ammo available)
      if (currentPlayerFiring && currentEnemyState && currentEnemyState.isEngaged && laserAmmoRef.current > 0) {
        const timeSinceLastFire = (now - playerLastFireTimeRef.current) / 1000;
        if (timeSinceLastFire >= 1 / COMBAT_CONFIG.FIRING_RATE) {
          createLaser(
            currentPlayerPos.x,
            currentPlayerPos.y,
            currentEnemyState.x,
            currentEnemyState.y,
            'player',
            currentEnemyState.id,
            PLAYER_STATS.DAMAGE,
            currentEnemyState.vx,
            currentEnemyState.vy
          );
          // Consume 1 ammo per shot
          onLaserAmmoConsumeRef.current?.();
          playerLastFireTimeRef.current = now;
        }
      }

      // Enemy firing (disabled in safety zone)
      if (currentEnemyState && currentEnemyState.isEngaged && !isInSafetyZoneRef.current) {
        const timeSinceLastFire = (now - enemyLastFireTimeRef.current) / 1000;
        if (timeSinceLastFire >= 1 / COMBAT_CONFIG.FIRING_RATE) {
          createLaser(
            currentEnemyState.x,
            currentEnemyState.y,
            currentPlayerPos.x,
            currentPlayerPos.y,
            currentEnemyState.id,
            'player',
            ENEMY_STATS.DRIFTER.DAMAGE,
            currentPlayerVel.vx,
            currentPlayerVel.vy
          );
          enemyLastFireTimeRef.current = now;
        }
      }

      // Update all lasers
      const lasersToRemove: string[] = [];
      
      lasers.forEach(({ graphics, projectile }, id) => {
        // Update projectile position
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
        
        // Update graphics position
        graphics.x = projectile.x;
        graphics.y = projectile.y;

        // Check timeout
        if (now - projectile.spawnTime > COMBAT_CONFIG.LASER_TIMEOUT) {
          lasersToRemove.push(id);
          return;
        }

        // Check collision - skip on first frame to avoid immediate hit
        const age = now - projectile.spawnTime;
        if (age < 50) {
          return; // Skip collision check for first 50ms
        }

        if (projectile.targetId === 'player') {
          if (checkLaserHit(projectile, currentPlayerPos)) {
            const newHealth = Math.max(0, currentPlayerHealth - projectile.damage);
            onPlayerHealthChangeRef.current?.(newHealth);
            onLaserHitRef.current?.(projectile);
            lasersToRemove.push(id);
          }
        } else if (projectile.targetId === currentEnemyState?.id && currentEnemyState) {
          if (checkLaserHit(projectile, { x: currentEnemyState.x, y: currentEnemyState.y })) {
            const newHealth = Math.max(0, currentEnemyState.health - projectile.damage);
            onEnemyHealthChangeRef.current?.(newHealth);
            onLaserHitRef.current?.(projectile);
            lasersToRemove.push(id);
          }
        }
      });

      // Remove lasers
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
  }, [app, cameraContainer]); // Only depend on app and cameraContainer

  return null;
}
