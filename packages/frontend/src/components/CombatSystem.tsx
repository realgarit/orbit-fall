import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { COMBAT_CONFIG, ROCKET_CONFIG, PLAYER_STATS, ENEMY_STATS } from '@shared/constants';
import type { LaserProjectile, RocketProjectile, EnemyState } from '@shared/types';

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
  rocketAmmo?: number;
  onRocketAmmoConsume?: () => void;
  playerFiringRocket?: boolean;
  onRocketFired?: () => void;
  instaShieldActive?: boolean;
}

interface LaserData {
  graphics: Graphics;
  projectile: LaserProjectile;
  prevX: number; // Previous position for line-segment collision detection
  prevY: number;
}

interface RocketData {
  graphics: Graphics;
  projectile: RocketProjectile;
  prevX: number; // Previous position for line-segment collision detection
  prevY: number;
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
  rocketAmmo = 0,
  onRocketAmmoConsume,
  playerFiringRocket = false,
  onRocketFired,
  instaShieldActive = false,
}: CombatSystemProps) {
  const lasersRef = useRef<Map<string, LaserData>>(new Map());
  const rocketsRef = useRef<Map<string, RocketData>>(new Map());
  const playerLastFireTimeRef = useRef(0);
  const playerLastRocketFireTimeRef = useRef(0);
  const enemyLastFireTimeRef = useRef(0);
  const laserIdCounterRef = useRef(0);
  const rocketIdCounterRef = useRef(0);
  
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
  const rocketAmmoRef = useRef(rocketAmmo);
  const onRocketAmmoConsumeRef = useRef(onRocketAmmoConsume);
  const playerFiringRocketRef = useRef(playerFiringRocket);
  const onRocketFiredRef = useRef(onRocketFired);
  const instaShieldActiveRef = useRef(instaShieldActive);

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

  useEffect(() => {
    rocketAmmoRef.current = rocketAmmo;
  }, [rocketAmmo]);

  useEffect(() => {
    onRocketAmmoConsumeRef.current = onRocketAmmoConsume;
  }, [onRocketAmmoConsume]);

  useEffect(() => {
    playerFiringRocketRef.current = playerFiringRocket;
  }, [playerFiringRocket]);

  useEffect(() => {
    onRocketFiredRef.current = onRocketFired;
  }, [onRocketFired]);

  useEffect(() => {
    instaShieldActiveRef.current = instaShieldActive;
  }, [instaShieldActive]);

  // Initialize enemy fire time when combat starts
  useEffect(() => {
    if (enemyState && enemyState.isEngaged && enemyLastFireTimeRef.current === 0) {
      enemyLastFireTimeRef.current = Date.now();
    }
  }, [enemyState?.isEngaged]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    const lasers = lasersRef.current;
    const rockets = rocketsRef.current;

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

    const createRocketGraphics = (x: number, y: number, angle: number): Graphics => {
      const graphics = new Graphics();
      const length = ROCKET_CONFIG.LENGTH;
      const width = ROCKET_CONFIG.WIDTH;
      
      // Add glow first (behind everything)
      graphics.roundRect(-length / 2 - 2, -width / 2 - 2, length + 4, width + 4, (width + 4) / 2);
      graphics.fill({ color: ROCKET_CONFIG.COLOR, alpha: 0.3 });
      
      // Exhaust flame at the back (drawn first so it's behind the rocket)
      const exhaustLength = length * 0.4;
      const exhaustWidth = width * 0.8;
      // Outer flame (orange/yellow)
      graphics.moveTo(-length / 2, -exhaustWidth / 2);
      graphics.lineTo(-length / 2 - exhaustLength, 0);
      graphics.lineTo(-length / 2, exhaustWidth / 2);
      graphics.lineTo(-length / 2, -exhaustWidth / 2);
      graphics.fill({ color: 0xff8800, alpha: 0.9 }); // Orange exhaust
      
      // Inner flame (yellow/white)
      graphics.moveTo(-length / 2, -exhaustWidth / 3);
      graphics.lineTo(-length / 2 - exhaustLength * 0.6, 0);
      graphics.lineTo(-length / 2, exhaustWidth / 3);
      graphics.lineTo(-length / 2, -exhaustWidth / 3);
      graphics.fill({ color: 0xffff00, alpha: 0.8 }); // Yellow inner flame
      
      // Rocket body - elongated and tapered (not a canister!)
      const bodyStartX = -length / 2;
      const bodyEndX = length / 2 - length * 0.25; // Leave room for nose cone
      const bodyWidthStart = width;
      const bodyWidthEnd = width * 0.85; // Slightly tapered
      
      // Main body shape (trapezoid for tapered effect)
      graphics.moveTo(bodyStartX, -bodyWidthStart / 2);
      graphics.lineTo(bodyEndX, -bodyWidthEnd / 2);
      graphics.lineTo(bodyEndX, bodyWidthEnd / 2);
      graphics.lineTo(bodyStartX, bodyWidthStart / 2);
      graphics.lineTo(bodyStartX, -bodyWidthStart / 2);
      graphics.fill({ color: ROCKET_CONFIG.COLOR, alpha: 1.0 });
      
      // Body detail - add a ring/segment near the middle for realism
      const ringX = bodyStartX + (bodyEndX - bodyStartX) * 0.6;
      graphics.rect(ringX - 1, -bodyWidthStart / 2 - 0.5, 2, bodyWidthStart + 1);
      graphics.fill({ color: 0xcc0000, alpha: 1.0 }); // Darker red ring
      
      // Rocket nose cone - more prominent and pointed
      const noseLength = length * 0.25;
      const noseBaseX = bodyEndX;
      const noseTipX = length / 2;
      
      graphics.moveTo(noseBaseX, -bodyWidthEnd / 2);
      graphics.lineTo(noseTipX, 0); // Pointed tip
      graphics.lineTo(noseBaseX, bodyWidthEnd / 2);
      graphics.lineTo(noseBaseX, -bodyWidthEnd / 2);
      graphics.fill({ color: 0xff3333, alpha: 1.0 }); // Slightly brighter red for nose
      
      // Rocket fins - more visible and properly shaped
      const finSize = width * 0.6;
      const finOffset = length * 0.15;
      
      // Top fin (left side when facing right)
      graphics.moveTo(bodyStartX, -bodyWidthStart / 2);
      graphics.lineTo(bodyStartX - finSize, -bodyWidthStart / 2 - finSize * 0.8);
      graphics.lineTo(bodyStartX - finOffset, -bodyWidthStart / 2);
      graphics.lineTo(bodyStartX, -bodyWidthStart / 2);
      graphics.fill({ color: 0xaa0000, alpha: 1.0 }); // Darker red for fins
      
      // Bottom fin
      graphics.moveTo(bodyStartX, bodyWidthStart / 2);
      graphics.lineTo(bodyStartX - finSize, bodyWidthStart / 2 + finSize * 0.8);
      graphics.lineTo(bodyStartX - finOffset, bodyWidthStart / 2);
      graphics.lineTo(bodyStartX, bodyWidthStart / 2);
      graphics.fill({ color: 0xaa0000, alpha: 1.0 }); // Darker red for fins
      
      // Add a highlight on the body for 3D effect
      graphics.rect(bodyStartX + 1, -bodyWidthStart / 2 + 1, (bodyEndX - bodyStartX) * 0.5, 1);
      graphics.fill({ color: 0xff6666, alpha: 0.6 }); // Light red highlight
      
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
      
      // Allow firing even at very close range (minimum distance check removed)
      // The line-segment collision detection will handle close-range hits properly
      
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
      
      lasers.set(projectile.id, { 
        graphics, 
        projectile,
        prevX: spawnX,
        prevY: spawnY
      });
    };

    const createRocket = (
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
      // Predict where target will be when rocket arrives (using same logic as lasers)
      const predictedTarget = predictTargetPosition(fromX, fromY, toX, toY, targetVx, targetVy);
      
      const dx = predictedTarget.x - fromX;
      const dy = predictedTarget.y - fromY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Allow firing even at very close range (minimum distance check removed)
      // The line-segment collision detection will handle close-range hits properly
      
      const angle = Math.atan2(dy, dx);
      
      // Spawn rocket at source position
      const spawnX = fromX;
      const spawnY = fromY;

      const projectile: RocketProjectile = {
        id: `rocket-${rocketIdCounterRef.current++}`,
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * ROCKET_CONFIG.SPEED,
        vy: Math.sin(angle) * ROCKET_CONFIG.SPEED,
        rotation: angle,
        damage,
        ownerId,
        targetId,
        spawnTime: Date.now(),
      };

      const graphics = createRocketGraphics(spawnX, spawnY, angle);
      cameraContainer.addChild(graphics);
      
      rockets.set(projectile.id, { 
        graphics, 
        projectile,
        prevX: spawnX,
        prevY: spawnY
      });
    };

    /**
     * Checks if a line segment (from prevPos to currentPos) intersects with a circle (target).
     * This prevents lasers from passing through enemies when moving fast.
     */
    const checkLaserHitLineSegment = (
      prevX: number,
      prevY: number,
      currentX: number,
      currentY: number,
      targetX: number,
      targetY: number,
      targetRadius: number = 20
    ): boolean => {
      // Check if current position is within radius (fast path for slow-moving lasers)
      const dx = currentX - targetX;
      const dy = currentY - targetY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      if (currentDist < targetRadius) {
        return true;
      }
      
      // Check if previous position was within radius (laser might have started inside)
      const prevDx = prevX - targetX;
      const prevDy = prevY - targetY;
      const prevDist = Math.sqrt(prevDx * prevDx + prevDy * prevDy);
      if (prevDist < targetRadius) {
        return true;
      }
      
      // Line-segment to circle collision: check if the line segment intersects the circle
      // Vector from start to end of line segment
      const segDx = currentX - prevX;
      const segDy = currentY - prevY;
      const segLengthSq = segDx * segDx + segDy * segDy;
      
      // If segment has zero length, just check point distance
      if (segLengthSq < 0.0001) {
        return currentDist < targetRadius;
      }
      
      // Vector from segment start to circle center
      const toCircleDx = targetX - prevX;
      const toCircleDy = targetY - prevY;
      
      // Project circle center onto line segment
      const t = Math.max(0, Math.min(1, (toCircleDx * segDx + toCircleDy * segDy) / segLengthSq));
      
      // Closest point on line segment to circle center
      const closestX = prevX + t * segDx;
      const closestY = prevY + t * segDy;
      
      // Distance from closest point to circle center
      const closestDx = closestX - targetX;
      const closestDy = closestY - targetY;
      const closestDist = Math.sqrt(closestDx * closestDx + closestDy * closestDy);
      
      return closestDist < targetRadius;
    };
    
    // Keep the old function name for backward compatibility with rockets
    const checkLaserHit = (laser: LaserProjectile, targetPos: { x: number; y: number }, targetRadius: number = 20): boolean => {
      const dx = laser.x - targetPos.x;
      const dy = laser.y - targetPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < targetRadius;
    };

    const checkRocketHit = (rocket: RocketProjectile, targetPos: { x: number; y: number }, targetRadius: number = 20): boolean => {
      const dx = rocket.x - targetPos.x;
      const dy = rocket.y - targetPos.y;
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

      // Player firing lasers (only if ammo available and enemy is alive)
      if (currentPlayerFiring && currentEnemyState && currentEnemyState.isEngaged && currentEnemyState.health > 0 && laserAmmoRef.current > 0) {
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

      // Player firing rockets (manual with SPACE key, only if ammo available and enemy is alive)
      if (playerFiringRocketRef.current && currentEnemyState && currentEnemyState.isEngaged && currentEnemyState.health > 0 && rocketAmmoRef.current > 0) {
        const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
        if (timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
          createRocket(
            currentPlayerPos.x,
            currentPlayerPos.y,
            currentEnemyState.x,
            currentEnemyState.y,
            'player',
            currentEnemyState.id,
            ROCKET_CONFIG.DAMAGE,
            currentEnemyState.vx,
            currentEnemyState.vy
          );
          // Consume 1 ammo per shot
          onRocketAmmoConsumeRef.current?.();
          playerLastRocketFireTimeRef.current = now;
          // Reset firing flag after rocket is fired
          onRocketFiredRef.current?.();
        }
      }

      // Enemy firing (disabled in safety zone, if enemy is dead, or if Insta-shield is active)
      if (currentEnemyState && currentEnemyState.isEngaged && currentEnemyState.health > 0 && !isInSafetyZoneRef.current && !instaShieldActiveRef.current) {
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
      
      lasers.forEach((laserData, id) => {
        const { graphics, projectile, prevX, prevY } = laserData;
        
        // Store previous position before updating
        const oldX = projectile.x;
        const oldY = projectile.y;
        
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

        // Check collision - use line-segment detection for accurate close-range hits
        // Reduced delay for close-range combat (only 16ms = ~1 frame at 60fps)
        const age = now - projectile.spawnTime;
        const minAge = 16; // Reduced from 50ms to allow immediate close-range detection
        if (age < minAge) {
          // Still update previous position even during delay
          laserData.prevX = oldX;
          laserData.prevY = oldY;
          return;
        }

        // Use line-segment collision detection for accurate hits
        if (projectile.targetId === 'player') {
          if (checkLaserHitLineSegment(prevX, prevY, projectile.x, projectile.y, currentPlayerPos.x, currentPlayerPos.y)) {
            // Check if Insta-shield is active - if so, block damage
            if (!instaShieldActiveRef.current) {
              const newHealth = Math.max(0, currentPlayerHealth - projectile.damage);
              onPlayerHealthChangeRef.current?.(newHealth);
            }
            // Always remove laser on hit (shield blocks damage but laser still hits)
            onLaserHitRef.current?.(projectile);
            lasersToRemove.push(id);
          } else {
            // Update previous position for next frame
            laserData.prevX = oldX;
            laserData.prevY = oldY;
          }
        } else if (projectile.targetId === currentEnemyState?.id && currentEnemyState) {
          if (checkLaserHitLineSegment(prevX, prevY, projectile.x, projectile.y, currentEnemyState.x, currentEnemyState.y)) {
            const newHealth = Math.max(0, currentEnemyState.health - projectile.damage);
            onEnemyHealthChangeRef.current?.(newHealth);
            onLaserHitRef.current?.(projectile);
            lasersToRemove.push(id);
          } else {
            // Update previous position for next frame
            laserData.prevX = oldX;
            laserData.prevY = oldY;
          }
        } else {
          // Update previous position for next frame
          laserData.prevX = oldX;
          laserData.prevY = oldY;
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

      // Update all rockets
      const rocketsToRemove: string[] = [];
      
      rockets.forEach((rocketData, id) => {
        const { graphics, projectile, prevX, prevY } = rocketData;
        
        // Store previous position before updating
        const oldX = projectile.x;
        const oldY = projectile.y;
        
        // Update projectile position
        projectile.x += projectile.vx * delta;
        projectile.y += projectile.vy * delta;
        
        // Update graphics position and rotation
        graphics.x = projectile.x;
        graphics.y = projectile.y;
        graphics.rotation = projectile.rotation;

        // Check timeout
        if (now - projectile.spawnTime > ROCKET_CONFIG.TIMEOUT) {
          rocketsToRemove.push(id);
          return;
        }

        // Check collision - use line-segment detection for accurate close-range hits
        // Reduced delay for close-range combat (only 16ms = ~1 frame at 60fps)
        const age = now - projectile.spawnTime;
        const minAge = 16; // Reduced from 50ms to allow immediate close-range detection
        if (age < minAge) {
          // Still update previous position even during delay
          rocketData.prevX = oldX;
          rocketData.prevY = oldY;
          return;
        }

        // Use line-segment collision detection for accurate hits
        if (projectile.targetId === 'player') {
          if (checkLaserHitLineSegment(prevX, prevY, projectile.x, projectile.y, currentPlayerPos.x, currentPlayerPos.y)) {
            // Check if Insta-shield is active - if so, block damage
            if (!instaShieldActiveRef.current) {
              const newHealth = Math.max(0, currentPlayerHealth - projectile.damage);
              onPlayerHealthChangeRef.current?.(newHealth);
            }
            // Always remove rocket on hit (shield blocks damage but rocket still hits)
            rocketsToRemove.push(id);
          } else {
            // Update previous position for next frame
            rocketData.prevX = oldX;
            rocketData.prevY = oldY;
          }
        } else if (projectile.targetId === currentEnemyState?.id && currentEnemyState) {
          if (checkLaserHitLineSegment(prevX, prevY, projectile.x, projectile.y, currentEnemyState.x, currentEnemyState.y)) {
            const newHealth = Math.max(0, currentEnemyState.health - projectile.damage);
            onEnemyHealthChangeRef.current?.(newHealth);
            rocketsToRemove.push(id);
          } else {
            // Update previous position for next frame
            rocketData.prevX = oldX;
            rocketData.prevY = oldY;
          }
        } else {
          // Update previous position for next frame
          rocketData.prevX = oldX;
          rocketData.prevY = oldY;
        }
      });

      // Remove rockets
      rocketsToRemove.forEach((id) => {
        const rocketData = rockets.get(id);
        if (rocketData) {
          cameraContainer.removeChild(rocketData.graphics);
          rocketData.graphics.destroy();
          rockets.delete(id);
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
      rockets.forEach(({ graphics }) => {
        cameraContainer.removeChild(graphics);
        graphics.destroy();
      });
      rockets.clear();
    };
  }, [app, cameraContainer]); // Only depend on app and cameraContainer

  return null;
}
