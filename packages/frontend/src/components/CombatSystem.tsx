import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { COMBAT_CONFIG, ROCKET_CONFIG, ENEMY_STATS, SPARROW_SHIP, PLAYER_STATS } from '@shared/constants';
import type { LaserProjectile, RocketProjectile, EnemyState, LaserCannonType, LaserAmmoType, RocketType } from '@shared/types';
import { calculateLaserDamage, calculateRocketDamage } from '@shared/utils/damageCalculation';

interface CombatSystemProps {
  app: Application; cameraContainer: Container;
  playerPosition: { x: number; y: number };
  playerVelocity: { vx: number; vy: number };
  playerRotation: number;
  playerHealth: number; playerShield?: number; playerMaxShield?: number;
  enemyState: EnemyState | null;
  playerFiring: boolean;
  onPlayerHealthChange: (health: number) => void;
  onPlayerShieldChange?: (shield: number) => void;
  onEnemyHealthChange: (health: number) => void;
  onEnemyShieldChange?: (shield: number) => void;
  onLaserHit?: (laser: LaserProjectile) => void;
  isInSafetyZone?: boolean;
  laserAmmo?: number; currentLaserCannon?: LaserCannonType; currentLaserAmmoType?: LaserAmmoType;
  onLaserAmmoConsume?: () => void;
  rocketAmmo?: number; currentRocketType?: RocketType; onRocketAmmoConsume?: () => void;
  playerFiringRocket?: boolean; onRocketFired?: () => void;
  instaShieldActive?: boolean;
  onPlayerDamage?: (event: { damage: number; position: { x: number; y: number } }) => void;
  onEnemyDamage?: (event: { damage: number; position: { x: number; y: number } }) => void;
  onOutOfRange?: (weaponType: 'laser' | 'rocket') => void;
}

interface LaserData { graphics: Graphics; projectile: LaserProjectile; prevX: number; prevY: number; }
interface RocketData { graphics: Container; exhaust: Graphics; projectile: RocketProjectile; prevX: number; prevY: number; }

export function CombatSystem({
  app, cameraContainer, playerPosition, playerVelocity, playerHealth, playerShield, playerMaxShield,
  enemyState, playerFiring, onPlayerHealthChange, onPlayerShieldChange, onEnemyHealthChange,
  onEnemyShieldChange, onLaserHit, isInSafetyZone = false, laserAmmo = 0,
  currentLaserCannon = PLAYER_STATS.STARTING_LASER_CANNON,
  currentLaserAmmoType = PLAYER_STATS.STARTING_LASER_AMMO,
  onLaserAmmoConsume, rocketAmmo = 0, currentRocketType = PLAYER_STATS.STARTING_ROCKET,
  onRocketAmmoConsume, playerFiringRocket = false, onRocketFired,
  instaShieldActive = false, onPlayerDamage, onEnemyDamage, onOutOfRange,
}: CombatSystemProps) {
  const lasersRef = useRef<Map<string, LaserData>>(new Map());
  const rocketsRef = useRef<Map<string, RocketData>>(new Map());
  const playerLastFireTimeRef = useRef(0);
  const playerLastRocketFireTimeRef = useRef(0);
  const enemyLastFireTimeRef = useRef(0);
  const laserIdCounterRef = useRef(0);
  const rocketIdCounterRef = useRef(0);
  const lastOutOfRangeMessageTimeRef = useRef(0);

  const playerPositionRef = useRef(playerPosition);
  const playerVelocityRef = useRef(playerVelocity);
  const playerHealthRef = useRef(playerHealth);
  const playerShieldRef = useRef(playerShield ?? 0);
  const playerMaxShieldRef = useRef(playerMaxShield ?? 0);
  const enemyStateRef = useRef(enemyState);
  const playerFiringRef = useRef(playerFiring);
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
  const onPlayerShieldChangeRef = useRef(onPlayerShieldChange);
  const onEnemyShieldChangeRef = useRef(onEnemyShieldChange);
  const onPlayerHealthChangeRef = useRef(onPlayerHealthChange);
  const onEnemyHealthChangeRef = useRef(onEnemyHealthChange);
  const onPlayerDamageRef = useRef(onPlayerDamage);
  const onEnemyDamageRef = useRef(onEnemyDamage);
  const onOutOfRangeRef = useRef(onOutOfRange);
  const onLaserHitRef = useRef(onLaserHit);
  const isInSafetyZoneRef = useRef(isInSafetyZone);

  useEffect(() => { playerPositionRef.current = playerPosition; }, [playerPosition]);
  useEffect(() => { playerVelocityRef.current = playerVelocity; }, [playerVelocity]);
  useEffect(() => { playerHealthRef.current = playerHealth; }, [playerHealth]);
  useEffect(() => { playerShieldRef.current = playerShield ?? 0; }, [playerShield]);
  useEffect(() => { playerMaxShieldRef.current = playerMaxShield ?? 0; }, [playerMaxShield]);
  useEffect(() => { enemyStateRef.current = enemyState; }, [enemyState]);
  useEffect(() => { playerFiringRef.current = playerFiring; }, [playerFiring]);
  useEffect(() => { laserAmmoRef.current = laserAmmo; }, [laserAmmo]);
  useEffect(() => { currentLaserCannonRef.current = currentLaserCannon; }, [currentLaserCannon]);
  useEffect(() => { currentLaserAmmoTypeRef.current = currentLaserAmmoType; }, [currentLaserAmmoType]);
  useEffect(() => { onLaserAmmoConsumeRef.current = onLaserAmmoConsume; }, [onLaserAmmoConsume]);
  useEffect(() => { rocketAmmoRef.current = rocketAmmo; }, [rocketAmmo]);
  useEffect(() => { currentRocketTypeRef.current = currentRocketType; }, [currentRocketType]);
  useEffect(() => { onRocketAmmoConsumeRef.current = onRocketAmmoConsume; }, [onRocketAmmoConsume]);
  useEffect(() => { playerFiringRocketRef.current = playerFiringRocket; }, [playerFiringRocket]);
  useEffect(() => { onRocketFiredRef.current = onRocketFired; }, [onRocketFired]);
  useEffect(() => { instaShieldActiveRef.current = instaShieldActive; }, [instaShieldActive]);
  useEffect(() => { onPlayerShieldChangeRef.current = onPlayerShieldChange; }, [onPlayerShieldChange]);
  useEffect(() => { onEnemyShieldChangeRef.current = onEnemyShieldChange; }, [onEnemyShieldChange]);
  useEffect(() => { onPlayerHealthChangeRef.current = onPlayerHealthChange; }, [onPlayerHealthChange]);
  useEffect(() => { onEnemyHealthChangeRef.current = onEnemyHealthChange; }, [onEnemyHealthChange]);
  useEffect(() => { onPlayerDamageRef.current = onPlayerDamage; }, [onPlayerDamage]);
  useEffect(() => { onEnemyDamageRef.current = onEnemyDamage; }, [onEnemyDamage]);
  useEffect(() => { onOutOfRangeRef.current = onOutOfRange; }, [onOutOfRange]);
  useEffect(() => { onLaserHitRef.current = onLaserHit; }, [onLaserHit]);
  useEffect(() => { isInSafetyZoneRef.current = isInSafetyZone; }, [isInSafetyZone]);

  useEffect(() => {
    if (!app || !cameraContainer) return;
    const lasers = lasersRef.current; const rockets = rocketsRef.current;

    const createLaserGraphics = (x: number, y: number, angle: number): Graphics => {
      const g = new Graphics();
      g.roundRect(-COMBAT_CONFIG.LASER_LENGTH/2, -COMBAT_CONFIG.LASER_WIDTH/2, COMBAT_CONFIG.LASER_LENGTH, COMBAT_CONFIG.LASER_WIDTH, COMBAT_CONFIG.LASER_WIDTH/2);
      g.fill({ color: COMBAT_CONFIG.LASER_COLOR, alpha: 1.0 });
      g.rotation = angle; g.x = x; g.y = y; return g;
    };

    const createRocketGraphics = (x: number, y: number, angle: number): { container: Container; exhaust: Graphics } => {
      const c = new Container(); const b = new Graphics(); const e = new Graphics();
      c.addChild(e); c.addChild(b);
      b.rect(-ROCKET_CONFIG.LENGTH/2, -ROCKET_CONFIG.WIDTH/2, ROCKET_CONFIG.LENGTH, ROCKET_CONFIG.WIDTH);
      b.fill(0xe74c3c); c.rotation = angle; c.x = x; c.y = y; return { container: c, exhaust: e };
    };

    const createLaser = (fromX: number, fromY: number, toX: number, toY: number, ownerId: string, targetId: string, damage: number): void => {
      const dx = toX - fromX; const dy = toY - fromY; const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 1) return;
      const angle = Math.atan2(dy, dx);
      const projectile: LaserProjectile = {
        id: `laser-${laserIdCounterRef.current++}`, x: fromX, y: fromY,
        vx: Math.cos(angle) * COMBAT_CONFIG.LASER_SPEED, vy: Math.sin(angle) * COMBAT_CONFIG.LASER_SPEED,
        rotation: angle, damage, ownerId, targetId, spawnTime: Date.now(),
      };
      const graphics = createLaserGraphics(fromX, fromY, angle);
      cameraContainer.addChild(graphics);
      lasers.set(projectile.id, { graphics, projectile, prevX: fromX, prevY: fromY });
    };

    const createRocket = (fromX: number, fromY: number, toX: number, toY: number, ownerId: string, targetId: string, damage: number): void => {
      const dx = toX - fromX; const dy = toY - fromY; const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 1) return;
      const angle = Math.atan2(dy, dx);
      const projectile: RocketProjectile = {
        id: `rocket-${rocketIdCounterRef.current++}`, x: fromX, y: fromY,
        vx: Math.cos(angle) * ROCKET_CONFIG.SPEED, vy: Math.sin(angle) * ROCKET_CONFIG.SPEED,
        rotation: angle, damage, ownerId, targetId, spawnTime: Date.now(),
      };
      const { container, exhaust } = createRocketGraphics(fromX, fromY, angle);
      cameraContainer.addChild(container);
      rockets.set(projectile.id, { graphics: container, exhaust, projectile, prevX: fromX, prevY: fromY });
    };

    const checkHit = (px: number, py: number, cx: number, cy: number, tx: number, ty: number, r: number = 40): boolean => {
      const dx = cx - tx; const dy = cy - ty; if (Math.sqrt(dx*dx+dy*dy) < r) return true;
      const sdx = cx - px; const sdy = cy - py; const slen2 = sdx*sdx + sdy*sdy;
      if (slen2 < 0.0001) return false;
      const t = Math.max(0, Math.min(1, ((tx-px)*sdx + (ty-py)*sdy)/slen2));
      const cdx = (px + t*sdx) - tx; const cdy = (py + t*sdy) - ty;
      return Math.sqrt(cdx*cdx+cdy*cdy) < r;
    };

    const tickerCallback = () => {
      const now = Date.now(); const delta = app.ticker.deltaTime;
      const cpos = playerPositionRef.current; const enemy = enemyStateRef.current;

      if (playerFiringRef.current && enemy && enemy.health > 0 && laserAmmoRef.current > 0) {
        if ((now - playerLastFireTimeRef.current)/1000 >= 1/COMBAT_CONFIG.FIRING_RATE) {
          const d = Math.sqrt(Math.pow(enemy.x - cpos.x, 2) + Math.pow(enemy.y - cpos.y, 2));
          if (d <= COMBAT_CONFIG.PLAYER_RANGE) {
            const dmg = calculateLaserDamage(currentLaserCannonRef.current, currentLaserAmmoTypeRef.current, SPARROW_SHIP.laserSlots, 0);
            createLaser(cpos.x, cpos.y, enemy.x, enemy.y, 'player', enemy.id, dmg);
            onLaserAmmoConsumeRef.current?.(); playerLastFireTimeRef.current = now;
          } else if (now - lastOutOfRangeMessageTimeRef.current >= 2000) { onOutOfRangeRef.current?.('laser'); lastOutOfRangeMessageTimeRef.current = now; }
        }
      }

      if (playerFiringRocketRef.current && enemy && enemy.health > 0 && rocketAmmoRef.current > 0) {
        if ((now - playerLastRocketFireTimeRef.current)/1000 >= 1/ROCKET_CONFIG.FIRING_RATE) {
          const d = Math.sqrt(Math.pow(enemy.x - cpos.x, 2) + Math.pow(enemy.y - cpos.y, 2));
          if (d <= COMBAT_CONFIG.PLAYER_RANGE) {
            const dmg = calculateRocketDamage(currentRocketTypeRef.current);
            createRocket(cpos.x, cpos.y, enemy.x, enemy.y, 'player', enemy.id, dmg);
            onRocketAmmoConsumeRef.current?.(); playerLastRocketFireTimeRef.current = now; onRocketFiredRef.current?.();
          } else { onRocketFiredRef.current?.(); }
        }
      }

      if (enemy && enemy.isEngaged && enemy.health > 0 && !isInSafetyZoneRef.current && !instaShieldActiveRef.current) {
        if ((now - enemyLastFireTimeRef.current)/1000 >= 1/COMBAT_CONFIG.FIRING_RATE) {
          const d = Math.sqrt(Math.pow(enemy.x - cpos.x, 2) + Math.pow(enemy.y - cpos.y, 2));
          if (d <= COMBAT_CONFIG.ENEMY_RANGE) {
            createLaser(enemy.x, enemy.y, cpos.x, cpos.y, enemy.id, 'player', ENEMY_STATS.DRIFTER.DAMAGE);
            enemyLastFireTimeRef.current = now;
          }
        }
      }

      lasers.forEach((data, id) => {
        const p = data.projectile; const ox = p.x; const oy = p.y;
        p.x += p.vx * delta; p.y += p.vy * delta; data.graphics.x = p.x; data.graphics.y = p.y;
        if (now - p.spawnTime > COMBAT_CONFIG.LASER_TIMEOUT) { cameraContainer.removeChild(data.graphics); data.graphics.destroy(); lasers.delete(id); return; }
        if (now - p.spawnTime < 16) return;
        const targetX = p.targetId === 'player' ? cpos.x : enemy?.x;
        const targetY = p.targetId === 'player' ? cpos.y : enemy?.y;
        if (targetX !== undefined && targetY !== undefined && checkHit(ox, oy, p.x, p.y, targetX, targetY)) {
          if (p.targetId === 'player') {
            if (!instaShieldActiveRef.current) {
              let rem = p.damage; if (playerShieldRef.current > 0) { const sd = Math.min(rem, playerShieldRef.current); onPlayerShieldChangeRef.current?.(playerShieldRef.current - sd); rem -= sd; }
              if (rem > 0) onPlayerHealthChangeRef.current?.(playerHealthRef.current - rem);
              onPlayerDamageRef.current?.({ damage: p.damage, position: { x: cpos.x, y: cpos.y } });
            }
          } else {
            let rem = p.damage; const esh = enemy?.shield ?? 0; if (esh > 0) { const sd = Math.min(rem, esh); onEnemyShieldChangeRef.current?.(esh - sd); rem -= sd; }
            if (rem > 0) onEnemyHealthChangeRef.current?.((enemy?.health ?? 0) - rem);
            onEnemyDamageRef.current?.({ damage: p.damage, position: { x: enemy?.x ?? 0, y: enemy?.y ?? 0 } });
          }
          cameraContainer.removeChild(data.graphics); data.graphics.destroy(); lasers.delete(id);
        }
      });

      rockets.forEach((data, id) => {
        const p = data.projectile; const ox = p.x; const oy = p.y;
        p.x += p.vx * delta; p.y += p.vy * delta; data.graphics.x = p.x; data.graphics.y = p.y;
        if (now - p.spawnTime > ROCKET_CONFIG.TIMEOUT) { cameraContainer.removeChild(data.graphics); data.graphics.destroy(); rockets.delete(id); return; }
        if (now - p.spawnTime < 16) return;
        const targetX = p.targetId === 'player' ? cpos.x : enemy?.x;
        const targetY = p.targetId === 'player' ? cpos.y : enemy?.y;
        if (targetX !== undefined && targetY !== undefined && checkHit(ox, oy, p.x, p.y, targetX, targetY)) {
          if (p.targetId === 'player') {
            if (!instaShieldActiveRef.current) {
              let rem = p.damage; if (playerShieldRef.current > 0) { const sd = Math.min(rem, playerShieldRef.current); onPlayerShieldChangeRef.current?.(playerShieldRef.current - sd); rem -= sd; }
              if (rem > 0) onPlayerHealthChangeRef.current?.(playerHealthRef.current - rem);
              onPlayerDamageRef.current?.({ damage: p.damage, position: { x: cpos.x, y: cpos.y } });
            }
          } else {
            let rem = p.damage; const esh = enemy?.shield ?? 0; if (esh > 0) { const sd = Math.min(rem, esh); onEnemyShieldChangeRef.current?.(esh - sd); rem -= sd; }
            if (rem > 0) onEnemyHealthChangeRef.current?.((enemy?.health ?? 0) - rem);
            onEnemyDamageRef.current?.({ damage: p.damage, position: { x: enemy?.x ?? 0, y: enemy?.y ?? 0 } });
          }
          cameraContainer.removeChild(data.graphics); data.graphics.destroy(); rockets.delete(id);
        }
      });
    };
    app.ticker.add(tickerCallback);
    return () => {
      app.ticker.remove(tickerCallback);
      lasers.forEach(({ graphics }) => { cameraContainer.removeChild(graphics); graphics.destroy(); }); lasers.clear();
      rockets.forEach(({ graphics }) => { cameraContainer.removeChild(graphics); graphics.destroy(); }); rockets.clear();
    };
  }, [app, cameraContainer]);

  return null;
}
