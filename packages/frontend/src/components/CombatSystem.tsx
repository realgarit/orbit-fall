import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { COMBAT_CONFIG, ROCKET_CONFIG, ENEMY_STATS, SPARROW_SHIP, PLAYER_STATS } from '@shared/constants';
import type { LaserProjectile, RocketProjectile, EnemyState, LaserCannonType, LaserAmmoType, RocketType } from '@shared/types';
import { calculateLaserDamage, calculateRocketDamage } from '@shared/utils/damageCalculation';

interface CombatSystemProps {
  app: Application;
  cameraContainer: Container;
  playerPosition: { x: number; y: number };
  playerVelocity: { vx: number; vy: number };
  playerRotation: number;
  playerHealth: number;
  playerShield?: number;
  playerMaxShield?: number;
  enemyState: EnemyState | null;
  playerFiring: boolean;
  onPlayerHealthChange: (health: number) => void;
  onPlayerShieldChange?: (shield: number) => void;
  onEnemyHealthChange: (health: number) => void;
  onEnemyShieldChange?: (shield: number) => void;
  onLaserHit?: (laser: LaserProjectile) => void;
  isInSafetyZone?: boolean;
  laserAmmo?: number;
  currentLaserCannon?: LaserCannonType;
  currentLaserAmmoType?: LaserAmmoType;
  onLaserAmmoConsume?: () => void;
  rocketAmmo?: number;
  currentRocketType?: RocketType;
  onRocketAmmoConsume?: () => void;
  playerFiringRocket?: boolean;
  onRocketFired?: () => void;
  instaShieldActive?: boolean;
  onPlayerDamage?: (event: { damage: number; position: { x: number; y: number } }) => void;
  onEnemyDamage?: (event: { damage: number; position: { x: number; y: number } }) => void;
  onOutOfRange?: (weaponType: 'laser' | 'rocket') => void;
}

interface LaserData {
  graphics: Graphics;
  projectile: LaserProjectile;
  prevX: number; // Previous position for line-segment collision detection
  prevY: number;
}

interface RocketData {
  graphics: Container; // Pixi Container to hold body and animated exhaust
  exhaust: Graphics;   // Reference to exhaust for animation
  projectile: RocketProjectile;
  prevX: number; // Previous position for line-segment collision detection
  prevY: number;
}

export function CombatSystem({
  app,
  cameraContainer,
  playerPosition,
  playerVelocity,
  playerRotation: _playerRotation,
  playerHealth,
  playerShield,
  playerMaxShield,
  enemyState,
  playerFiring,
  onPlayerHealthChange,
  onPlayerShieldChange,
  onEnemyHealthChange,
  onEnemyShieldChange,
  onLaserHit,
  isInSafetyZone = false,
  laserAmmo = 0,
  currentLaserCannon = PLAYER_STATS.STARTING_LASER_CANNON,
  currentLaserAmmoType = PLAYER_STATS.STARTING_LASER_AMMO,
  onLaserAmmoConsume,
  rocketAmmo = 0,
  currentRocketType = PLAYER_STATS.STARTING_ROCKET,
  onRocketAmmoConsume,
  playerFiringRocket = false,
  onRocketFired,
  instaShieldActive = false,
  onPlayerDamage,
  onEnemyDamage,
  onOutOfRange,
}: CombatSystemProps) {
  const lasersRef = useRef<Map<string, LaserData>>(new Map());
  const rocketsRef = useRef<Map<string, RocketData>>(new Map());
  const playerLastFireTimeRef = useRef(0);
  const playerLastRocketFireTimeRef = useRef(0);
  const enemyLastFireTimeRef = useRef(0);
  const laserIdCounterRef = useRef(0);
  const rocketIdCounterRef = useRef(0);
  const lastOutOfRangeMessageTimeRef = useRef(0);

  // Use refs to avoid recreating ticker on every prop change
  const playerPositionRef = useRef(playerPosition);
  const playerVelocityRef = useRef(playerVelocity);
  const playerHealthRef = useRef(playerHealth);
  const playerShieldRef = useRef(playerShield ?? 0);
  const playerMaxShieldRef = useRef(playerMaxShield ?? 0);
  const enemyStateRef = useRef(enemyState);
  const playerFiringRef = useRef(playerFiring);
  const onPlayerHealthChangeRef = useRef(onPlayerHealthChange);
  const onPlayerShieldChangeRef = useRef(onPlayerShieldChange);
  const onEnemyHealthChangeRef = useRef(onEnemyHealthChange);
  const onEnemyShieldChangeRef = useRef(onEnemyShieldChange);
  const onLaserHitRef = useRef(onLaserHit);
  const isInSafetyZoneRef = useRef(isInSafetyZone);
  const laserAmmoRef = useRef(laserAmmo);
  const currentLaserCannonRef = useRef(currentLaserCannon);
  const currentLaserAmmoTypeRef = useRef(currentLaserAmmoType);
  const onLaserAmmoConsumeRef = useRef(onLaserAmmoConsume);
  const rocketAmmoRef = useRef(rocketAmmo);
  const currentRocketTypeRef = useRef(currentRocketType);
  const onRocketAmmoConsumeRef = useRef(onRocketAmmoConsume);
  const playerFiringRocketRef = useRef(playerFiringRocket);
  const onRocketFiredRef = useRef(onRocketFired);
  const instaShieldActiveRef = useRef(instaShieldActive);
  const onPlayerDamageRef = useRef(onPlayerDamage);
  const onEnemyDamageRef = useRef(onEnemyDamage);
  const onOutOfRangeRef = useRef(onOutOfRange);

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
    playerShieldRef.current = playerShield ?? 0;
  }, [playerShield]);

  useEffect(() => {
    playerMaxShieldRef.current = playerMaxShield ?? 0;
  }, [playerMaxShield]);

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
    currentLaserCannonRef.current = currentLaserCannon;
  }, [currentLaserCannon]);

  useEffect(() => {
    currentLaserAmmoTypeRef.current = currentLaserAmmoType;
  }, [currentLaserAmmoType]);

  useEffect(() => {
    onLaserAmmoConsumeRef.current = onLaserAmmoConsume;
  }, [onLaserAmmoConsume]);

  useEffect(() => {
    rocketAmmoRef.current = rocketAmmo;
  }, [rocketAmmo]);

  useEffect(() => {
    currentRocketTypeRef.current = currentRocketType;
  }, [currentRocketType]);

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

  useEffect(() => {
    onPlayerShieldChangeRef.current = onPlayerShieldChange;
  }, [onPlayerShieldChange]);

  useEffect(() => {
    onEnemyShieldChangeRef.current = onEnemyShieldChange;
  }, [onEnemyShieldChange]);

  useEffect(() => {
    onPlayerDamageRef.current = onPlayerDamage;
  }, [onPlayerDamage]);

  useEffect(() => {
    onEnemyDamageRef.current = onEnemyDamage;
  }, [onEnemyDamage]);

  useEffect(() => {
    onOutOfRangeRef.current = onOutOfRange;
  }, [onOutOfRange]);

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

    const createRocketGraphics = (x: number, y: number, angle: number): { container: Container; exhaust: Graphics } => {
      const container = new Container();
      const body = new Graphics();
      const exhaust = new Graphics();

      container.addChild(exhaust);
      container.addChild(body);

      const length = ROCKET_CONFIG.LENGTH * 1.5; // Slightly larger for better detail
      const width = ROCKET_CONFIG.WIDTH * 1.2;

      // 1. Rocket Body (Metallic / High-tech)
      body.clear();

      // Main cylindrical body (Phoenix Red)
      body.rect(-length / 2, -width / 2, length * 0.7, width);
      body.fill(0xc0392b);

      // Body highlight (Top edge)
      body.rect(-length / 2, -width / 2, length * 0.7, width * 0.25);
      body.fill({ color: 0xffffff, alpha: 0.3 });

      // Body shadow (Bottom edge)
      body.rect(-length / 2, width * 0.25, length * 0.7, width * 0.25);
      body.fill({ color: 0x000000, alpha: 0.15 });

      // 2. Nose Cone (Pointed & Dangerous)
      const noseX = length / 2 - length * 0.3;
      body.moveTo(noseX, -width / 2);
      body.lineTo(length / 2, 0);
      body.lineTo(noseX, width / 2);
      body.closePath();
      body.fill(0xe74c3c); // Bright red nose

      // Nose cone highlight
      body.moveTo(noseX, -width / 2);
      body.lineTo(noseX + (length / 2 - noseX) * 0.5, -width * 0.1);
      body.lineTo(noseX, 0);
      body.fill({ color: 0xffffff, alpha: 0.2 });

      // 3. Technical Detail (Yellow warning band)
      const bandWidth = length * 0.1;
      const bandX = -length * 0.2;
      body.rect(bandX, -width / 2 - 0.5, bandWidth, width + 1);
      body.fill(0xf1c40f); // Caution yellow

      // Black stripe in yellow band
      body.rect(bandX + bandWidth * 0.4, -width / 2 - 0.5, bandWidth * 0.2, width + 1);
      body.fill(0x2c3e50);

      // 4. Rear Nozzle
      body.rect(-length / 2 - 2, -width * 0.4, 3, width * 0.8);
      body.fill(0x34495e); // Dark steel

      // 5. Stabilizing Fins (X-wing configuration feel)
      const finSize = width * 1.2;

      // Top rear fin
      body.moveTo(-length / 2, -width / 2);
      body.lineTo(-length / 2 - length * 0.2, -width / 2 - finSize);
      body.lineTo(-length / 2 + length * 0.1, -width / 2);
      body.closePath();
      body.fill(0x2c3e50);

      // Bottom rear fin
      body.moveTo(-length / 2, width / 2);
      body.lineTo(-length / 2 - length * 0.2, width / 2 + finSize);
      body.lineTo(-length / 2 + length * 0.1, width / 2);
      body.closePath();
      body.fill(0x2c3e50);

      // Side fin detail (subtle)
      body.rect(-length / 2 + 1, -1, length * 0.3, 2);
      body.fill({ color: 0x000000, alpha: 0.1 });

      container.rotation = angle;
      container.x = x;
      container.y = y;

      return { container, exhaust };
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

      const { container, exhaust } = createRocketGraphics(spawnX, spawnY, angle);
      cameraContainer.addChild(container);

      rockets.set(projectile.id, {
        graphics: container,
        exhaust,
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

    /**
     * Calculates the distance between two points
     */
    const calculateDistance = (x1: number, y1: number, x2: number, y2: number): number => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    };

    /**
     * Checks if target is within combat range
     * @param fromX - Source X position (pixels)
     * @param fromY - Source Y position (pixels)
     * @param toX - Target X position (pixels)
     * @param toY - Target Y position (pixels)
     * @param isPlayerFiring - Whether the player is firing (true) or enemy (false)
     */
    const isInRange = (fromX: number, fromY: number, toX: number, toY: number, isPlayerFiring: boolean): boolean => {
      const distance = calculateDistance(fromX, fromY, toX, toY);
      const maxRange = isPlayerFiring ? COMBAT_CONFIG.PLAYER_RANGE : COMBAT_CONFIG.ENEMY_RANGE;
      return distance <= maxRange;
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
      if (currentPlayerFiring && currentEnemyState && currentEnemyState.health > 0 && laserAmmoRef.current > 0) {
        const timeSinceLastFire = (now - playerLastFireTimeRef.current) / 1000;
        if (timeSinceLastFire >= 1 / COMBAT_CONFIG.FIRING_RATE) {
          // Check if enemy is in range (player firing)
          if (!isInRange(currentPlayerPos.x, currentPlayerPos.y, currentEnemyState.x, currentEnemyState.y, true)) {
            // Throttle out-of-range messages to avoid spam (show once every 2 seconds)
            if (now - lastOutOfRangeMessageTimeRef.current >= 2000) {
              onOutOfRangeRef.current?.('laser');
              lastOutOfRangeMessageTimeRef.current = now;
            }
            // Skip firing if out of range (don't update fire time so it can retry)
          } else {
            // Calculate damage using new formula
            const damage = calculateLaserDamage(
              currentLaserCannonRef.current,
              currentLaserAmmoTypeRef.current,
              SPARROW_SHIP.laserSlots,
              0 // No bonuses yet
            );
            createLaser(
              currentPlayerPos.x,
              currentPlayerPos.y,
              currentEnemyState.x,
              currentEnemyState.y,
              'player',
              currentEnemyState.id,
              damage,
              currentEnemyState.vx,
              currentEnemyState.vy
            );
            // Consume 1 ammo per shot
            onLaserAmmoConsumeRef.current?.();
            playerLastFireTimeRef.current = now;
          }
        }
      }

      // Player firing rockets (manual with SPACE key, only if ammo available and enemy is alive)
      if (playerFiringRocketRef.current && currentEnemyState && currentEnemyState.isEngaged && currentEnemyState.health > 0 && rocketAmmoRef.current > 0) {
        const timeSinceLastRocketFire = (now - playerLastRocketFireTimeRef.current) / 1000;
        if (timeSinceLastRocketFire >= 1 / ROCKET_CONFIG.FIRING_RATE) {
          // Check if enemy is in range (player firing)
          if (!isInRange(currentPlayerPos.x, currentPlayerPos.y, currentEnemyState.x, currentEnemyState.y, true)) {
            // Throttle out-of-range messages to avoid spam (show once every 2 seconds)
            if (now - lastOutOfRangeMessageTimeRef.current >= 2000) {
              onOutOfRangeRef.current?.('rocket');
              lastOutOfRangeMessageTimeRef.current = now;
            }
            // Reset firing flag if out of range
            onRocketFiredRef.current?.();
          } else {
            // Calculate rocket damage
            const damage = calculateRocketDamage(currentRocketTypeRef.current);
            createRocket(
              currentPlayerPos.x,
              currentPlayerPos.y,
              currentEnemyState.x,
              currentEnemyState.y,
              'player',
              currentEnemyState.id,
              damage,
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
      }

      // Enemy firing (disabled in safety zone, if enemy is dead, or if Insta-shield is active)
      if (currentEnemyState && currentEnemyState.isEngaged && currentEnemyState.health > 0 && !isInSafetyZoneRef.current && !instaShieldActiveRef.current) {
        const timeSinceLastFire = (now - enemyLastFireTimeRef.current) / 1000;
        if (timeSinceLastFire >= 1 / COMBAT_CONFIG.FIRING_RATE) {
          // Check if player is in range (enemy firing)
          if (isInRange(currentEnemyState.x, currentEnemyState.y, currentPlayerPos.x, currentPlayerPos.y, false)) {
            // Enemy uses default damage (can be updated later with enemy equipment)
            const enemyDamage = ENEMY_STATS.DRIFTER.DAMAGE;
            createLaser(
              currentEnemyState.x,
              currentEnemyState.y,
              currentPlayerPos.x,
              currentPlayerPos.y,
              currentEnemyState.id,
              'player',
              enemyDamage,
              currentPlayerVel.vx,
              currentPlayerVel.vy
            );
            enemyLastFireTimeRef.current = now;
          }
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
              let remainingDamage = projectile.damage;
              const currentShield = playerShieldRef.current;
              const maxShield = playerMaxShieldRef.current;

              // Apply damage to shield first, then health
              if (currentShield > 0 && maxShield > 0) {
                const shieldDamage = Math.min(remainingDamage, currentShield);
                const newShield = Math.max(0, currentShield - shieldDamage);
                remainingDamage -= shieldDamage;
                onPlayerShieldChangeRef.current?.(newShield);
              }

              // Apply remaining damage to health
              if (remainingDamage > 0) {
                const newHealth = Math.max(0, currentPlayerHealth - remainingDamage);
                onPlayerHealthChangeRef.current?.(newHealth);
              }

              // Trigger damage number (enemy damages player)
              onPlayerDamageRef.current?.({
                damage: projectile.damage,
                position: { x: currentPlayerPos.x, y: currentPlayerPos.y }
              });
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
            let remainingDamage = projectile.damage;
            const currentEnemyShield = currentEnemyState.shield ?? 0;
            const maxEnemyShield = currentEnemyState.maxShield ?? 0;

            // Apply damage to enemy shield first, then health
            if (currentEnemyShield > 0 && maxEnemyShield > 0) {
              const shieldDamage = Math.min(remainingDamage, currentEnemyShield);
              const newShield = Math.max(0, currentEnemyShield - shieldDamage);
              remainingDamage -= shieldDamage;
              onEnemyShieldChangeRef.current?.(newShield);
            }

            // Apply remaining damage to enemy health
            if (remainingDamage > 0) {
              const newHealth = Math.max(0, currentEnemyState.health - remainingDamage);
              onEnemyHealthChangeRef.current?.(newHealth);
            }

            // Trigger damage number (player damages enemy)
            onEnemyDamageRef.current?.({
              damage: projectile.damage,
              position: { x: currentEnemyState.x, y: currentEnemyState.y }
            });

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
        const { graphics, exhaust, projectile, prevX, prevY } = rocketData;

        // Animate exhaust flicker
        if (exhaust) {
          exhaust.clear();
          const flicker = Math.random() * 0.3 + 0.7;
          const length = ROCKET_CONFIG.LENGTH * 1.5;
          const width = ROCKET_CONFIG.WIDTH * 1.2;

          // Outer flame
          const exLen = length * (0.6 + Math.random() * 0.4);
          const exWidth = width * 0.9;
          exhaust.moveTo(-length / 2, -exWidth / 2);
          exhaust.lineTo(-length / 2 - exLen, 0);
          exhaust.lineTo(-length / 2, exWidth / 2);
          exhaust.fill({ color: 0xff8800, alpha: 0.6 * flicker });

          // Inner core
          const coreLen = exLen * 0.6;
          const coreWidth = exWidth * 0.5;
          exhaust.moveTo(-length / 2, -coreWidth / 2);
          exhaust.lineTo(-length / 2 - coreLen, 0);
          exhaust.lineTo(-length / 2, coreWidth / 2);
          exhaust.fill({ color: 0xffff00, alpha: 0.8 * flicker });

          // Blue heat core
          exhaust.circle(-length / 2, 0, coreWidth * 0.4);
          exhaust.fill({ color: 0x00aaff, alpha: 0.4 });
        }

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
              let remainingDamage = projectile.damage;
              const currentShield = playerShieldRef.current;
              const maxShield = playerMaxShieldRef.current;

              // Apply damage to shield first, then health
              if (currentShield > 0 && maxShield > 0) {
                const shieldDamage = Math.min(remainingDamage, currentShield);
                const newShield = Math.max(0, currentShield - shieldDamage);
                remainingDamage -= shieldDamage;
                onPlayerShieldChangeRef.current?.(newShield);
              }

              // Apply remaining damage to health
              if (remainingDamage > 0) {
                const newHealth = Math.max(0, currentPlayerHealth - remainingDamage);
                onPlayerHealthChangeRef.current?.(newHealth);
              }

              // Trigger damage number (enemy damages player with rocket)
              onPlayerDamageRef.current?.({
                damage: projectile.damage,
                position: { x: currentPlayerPos.x, y: currentPlayerPos.y }
              });
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
            let remainingDamage = projectile.damage;
            const currentEnemyShield = currentEnemyState.shield ?? 0;
            const maxEnemyShield = currentEnemyState.maxShield ?? 0;

            // Apply damage to enemy shield first, then health
            if (currentEnemyShield > 0 && maxEnemyShield > 0) {
              const shieldDamage = Math.min(remainingDamage, currentEnemyShield);
              const newShield = Math.max(0, currentEnemyShield - shieldDamage);
              remainingDamage -= shieldDamage;
              onEnemyShieldChangeRef.current?.(newShield);
            }

            // Apply remaining damage to enemy health
            if (remainingDamage > 0) {
              const newHealth = Math.max(0, currentEnemyState.health - remainingDamage);
              onEnemyHealthChangeRef.current?.(newHealth);
            }

            // Trigger damage number (player damages enemy with rocket)
            onEnemyDamageRef.current?.({
              damage: projectile.damage,
              position: { x: currentEnemyState.x, y: currentEnemyState.y }
            });

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

    if (!app?.ticker) return;

    app.ticker.add(tickerCallback);

    return () => {
      if (app?.ticker) {
        app.ticker.remove(tickerCallback);
      }
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
