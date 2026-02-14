import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Application, Container } from 'pixi.js';
import { usePixiApp } from '../hooks/usePixiApp';
import { Starfield } from './Starfield';
import { MarsBackground } from './MarsBackground';
import { Ship } from './Ship';
import { Enemy } from './Enemy';
import { Base } from './Base';
import { RepairRobot } from './RepairRobot';
import { HPBar } from './HPBar';
import { CombatSystem } from './CombatSystem';
import { Shield } from './Shield';
import { SelectionCircle } from './SelectionCircle';
import { ShipExplosion } from './ShipExplosion';
import { DamageNumbers } from './DamageNumbers';
import { BonusBox } from './BonusBox';
import { ResourceCrystal } from './ResourceCrystal';
import type { DamageNumbersHandle } from './DamageNumbers';
import { useMessageStore } from '../stores/messageStore';
import { TopBar } from './windows/TopBar';
import { ActionBar } from './windows/ActionBar';
import { StatsWindow } from './windows/StatsWindow';
import { DebugWindow } from './windows/DebugWindow';
import { BattleWindow } from './windows/BattleWindow';
import { MinimapWindow } from './windows/MinimapWindow';
import { SettingsWindow } from './windows/SettingsWindow';
import { ShipWindow } from './windows/ShipWindow';
import { DeathWindow } from './windows/DeathWindow';
import { MessageSystem } from './MessageSystem';
import { OreWindow } from './windows/OreWindow';
import { TradeWindow } from './windows/TradeWindow';
import { useGameStore } from '../stores/gameStore';
import { Socket } from "socket.io-client";
import { RemoteShip } from "./RemoteShip";
import { BASE_SAFETY_ZONE, SPARROW_SHIP, BONUS_BOX_CONFIG } from '@shared/constants';
import '../styles/windows.css';

export function Game({ socket, initialPlayerData }: { socket: Socket, initialPlayerData: any }) {
  const addMessage = useMessageStore((state) => state.addMessage);
  const [app, setApp] = useState<Application | null>(null);
  const [cameraContainer, setCameraContainer] = useState<Container | null>(null);
  const [remotePlayers, setRemotePlayers] = useState<Map<string, any>>(new Map());
  const [serverPosition, setServerPosition] = useState<{ x: number; y: number } | null>(null);

  const lastClickTimeRef = useRef(0);
  const lastClickEnemyIdRef = useRef<string | null>(null);
  const lastOutsideClickTimeRef = useRef(0);
  const lastClickProcessedTimeRef = useRef(0);
  const damageNumbersRef = useRef<DamageNumbersHandle>(null);

  const shipPosition = useGameStore((state) => state.shipPosition);
  const shipVelocity = useGameStore((state) => state.shipVelocity);
  const shipRotation = useGameStore((state) => state.shipRotation);
  const playerHealth = useGameStore((state) => state.playerHealth);
  const playerShield = useGameStore((state) => state.playerShield);
  const playerMaxShield = useGameStore((state) => state.playerMaxShield);
  const enemies = useGameStore((state) => state.enemies);
  const deadEnemies = useGameStore((state) => state.deadEnemies);
  const selectedEnemyId = useGameStore((state) => state.selectedEnemyId);
  const inCombat = useGameStore((state) => state.inCombat);
  const playerFiring = useGameStore((state) => state.playerFiring);
  const playerFiringRocket = useGameStore((state) => state.playerFiringRocket);
  const isRepairing = useGameStore((state) => state.isRepairing);
  const isDead = useGameStore((state) => state.isDead);
  const deathPosition = useGameStore((state) => state.deathPosition);
  const showDeathWindow = useGameStore((state) => state.showDeathWindow);
  const instaShieldActive = useGameStore((state) => state.instaShieldActive);
  const targetPosition = useGameStore((state) => state.targetPosition);
  const bonusBoxes = useGameStore((state) => state.bonusBoxes);
  const targetBonusBoxId = useGameStore((state) => state.targetBonusBoxId);
  const ores = useGameStore((state) => state.ores);
  const targetOreId = useGameStore((state) => state.targetOreId);
  const currentLaserCannon = useGameStore((state) => state.currentLaserCannon);
  const currentLaserAmmoType = useGameStore((state) => state.currentLaserAmmoType);
  const currentRocketType = useGameStore((state) => state.currentRocketType);
  const rocketCooldown = useGameStore((state) => state.rocketCooldown);
  const repairCooldown = useGameStore((state) => state.repairCooldown);

  useEffect(() => {
    const state = useGameStore.getState();
    state.setShipPosition({ x: initialPlayerData.x, y: initialPlayerData.y });
    state.setPlayerLevel(initialPlayerData.level);
    state.setPlayerCredits(initialPlayerData.credits);
  }, [initialPlayerData]);

  useEffect(() => {
    socket.on("gameState", (data) => {
      const state = useGameStore.getState();
      const playersMap = new Map();
      data.players.forEach((p: any) => {
        const isMe = p.id === socket.id || p.username === initialPlayerData.username;
        if (!isMe) {
          playersMap.set(p.id, p);
        } else {
          setServerPosition({ x: p.x, y: p.y });
          state.setPlayerLevel(p.level);
          state.setPlayerExperience(p.experience);
          state.setPlayerCredits(p.credits);
          state.setPlayerHonor(p.honor);
          state.setPlayerAetherium(p.aetherium);
          state.setPlayerHealth(p.health);
          state.setPlayerShield(p.shield);
          state.setPlayerMaxShield(p.maxShield);
          if (p.cargo) state.setPlayerCargo(p.cargo);
        }
      });
      setRemotePlayers(playersMap);

      if (data.enemies) {
        const enemyMap = new Map();
        const posMap = new Map();
        data.enemies.forEach((e: any) => {
          enemyMap.set(e.id, { ...e, name: '-=[ Drifter ]=-', attitude: 'defensive' });
          posMap.set(e.id, { x: e.x, y: e.y });
        });
        state.setEnemies(enemyMap);
        state.setEnemyPositions(posMap);
      }
      if (data.ores) {
        const oreMap = new Map();
        data.ores.forEach((o: any) => oreMap.set(o.id, o));
        state.setOres(oreMap);
      }
      if (data.boxes) {
        const boxMap = new Map();
        data.boxes.forEach((b: any) => boxMap.set(b.id, b));
        state.setBonusBoxes(boxMap);
      }
    });
    return () => { socket.off("gameState"); };
  }, [socket, initialPlayerData.username]);

  const { containerRef } = usePixiApp({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x000000,
    onAppReady: (pixiApp) => {
      setApp(pixiApp);
      const worldContainer = new Container();
      pixiApp.stage.addChild(worldContainer);
      setCameraContainer(worldContainer);
    },
  });

  const basePosition = { x: 200, y: 200 };

  const isInSafetyZone = useCallback(() => {
    const dx = shipPosition.x - basePosition.x;
    const dy = shipPosition.y - basePosition.y;
    return Math.sqrt(dx * dx + dy * dy) < BASE_SAFETY_ZONE.RADIUS;
  }, [shipPosition, basePosition.x, basePosition.y]);

  const hasAggressiveEnemies = useCallback(() => {
    return Array.from(enemies.values()).some(e => e.health > 0 && e.isEngaged && !deadEnemies.has(e.id));
  }, [enemies, deadEnemies]);

  useEffect(() => {
    if (!app) return;
    const handleResize = () => app.renderer.resize(window.innerWidth, window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [app]);

  useEffect(() => {
    if (!app?.ticker) return;
    const callback = () => useGameStore.getState().setFps(app.ticker.FPS);
    app.ticker.add(callback);
    return () => { app.ticker.remove(callback); };
  }, [app]);

  const handleShipStateUpdate = useCallback((pos: { x: number; y: number }, vel: { vx: number; vy: number }, rotation: number, thrust: boolean, targetPos: { x: number; y: number } | null) => {
    const state = useGameStore.getState();
    state.setShipPosition(pos);
    state.setShipVelocity(vel);
    state.setShipRotation(rotation);
    socket.emit("player_input", { thrust, angle: rotation, targetPosition: targetPos });
  }, [socket]);

  const handlePlayerDamage = useCallback((event: { damage: number; position: { x: number; y: number } }) => {
    socket.emit('player_damaged', { damage: event.damage });
    damageNumbersRef.current?.addDamageNumber(event.damage, event.position, true);
  }, [socket]);

  const handleEnemyDamage = useCallback((event: { id: string, damage: number; position: { x: number; y: number } }) => {
    socket.emit('enemy_damage', { id: event.id, damage: event.damage });
    damageNumbersRef.current?.addDamageNumber(event.damage, event.position, false);
  }, [socket]);

  const handleRepairOnSpot = useCallback(() => {
    const state = useGameStore.getState();
    if (state.deathPosition) {
      socket.emit('respawn', { type: 'spot' });
      state.setPlayerHealth(Math.floor(SPARROW_SHIP.hitpoints * 0.1));
      state.setIsDead(false); state.setShowDeathWindow(false);
      addMessage('Ship repaired on the spot', 'success');
      state.setInstaShieldActive(true);
      state.setInstaShieldEndTime(Date.now() + 10000);
      state.setInCombat(false); state.setSelectedEnemyId(null);
      state.setTargetPosition(state.deathPosition);
    }
  }, [addMessage, socket]);

  const handleEnemyClick = useCallback((worldX: number, worldY: number): boolean => {
    const state = useGameStore.getState();
    for (const [enemyId, enemy] of state.enemies.entries()) {
      if (state.deadEnemies.has(enemyId)) continue;
      const dx = worldX - enemy.x;
      const dy = worldY - enemy.y;
      if (Math.sqrt(dx * dx + dy * dy) < 50) {
        const now = Date.now();
        if (now - lastClickProcessedTimeRef.current < 50) return true;
        lastClickProcessedTimeRef.current = now;
        const isDoubleClick = now - lastClickTimeRef.current < 350 && lastClickEnemyIdRef.current === enemyId;
        if (isDoubleClick) {
          state.setSelectedEnemyId(enemyId);
          if (!isInSafetyZone() && !state.instaShieldActive) {
            state.setInCombat(true);
            state.setPlayerFiring(true);
          }
          lastClickTimeRef.current = 0; lastClickEnemyIdRef.current = null;
        } else {
          state.setSelectedEnemyId(enemyId);
          lastClickTimeRef.current = now; lastClickEnemyIdRef.current = enemyId;
        }
        return true;
      }
    }
    return false;
  }, [isInSafetyZone]);

  const handleBonusBoxClick = useCallback((worldX: number, worldY: number): boolean => {
    const state = useGameStore.getState();
    for (const box of state.bonusBoxes.values()) {
      const dx = worldX - box.x;
      const dy = worldY - box.y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        state.setTargetPosition({ x: box.x, y: box.y - 25 });
        state.setTargetBonusBoxId(box.id);
        return true;
      }
    }
    return false;
  }, []);

  const handleOreClick = useCallback((worldX: number, worldY: number): boolean => {
    const state = useGameStore.getState();
    for (const ore of state.ores.values()) {
      const dx = worldX - ore.x;
      const dy = worldY - ore.y;
      if (Math.sqrt(dx * dx + dy * dy) < 35) {
        state.setTargetPosition({ x: ore.x, y: ore.y - 20 });
        state.setTargetOreId(ore.id);
        return true;
      }
    }
    return false;
  }, []);

  useEffect(() => {
    if (!app) return;
    const tickerCallback = () => {
      const state = useGameStore.getState();
      const shipPos = state.shipPosition;
      state.bonusBoxes.forEach((box) => {
        if (state.targetBonusBoxId === box.id) {
          if (Math.sqrt(Math.pow(shipPos.x - box.x, 2) + Math.pow(shipPos.y - box.y, 2)) < 55) {
            const rewardRoll = Math.random() * 100;
            let currentWeight = 0;
            let selectedReward: any = BONUS_BOX_CONFIG.REWARDS[0];
            for (const reward of BONUS_BOX_CONFIG.REWARDS) {
              currentWeight += reward.weight;
              if (rewardRoll <= currentWeight) { selectedReward = reward; break; }
            }
            const amount = selectedReward.amounts[Math.floor(Math.random() * selectedReward.amounts.length)];
            socket.emit('collect_bonus_box', { id: box.id, reward: { type: selectedReward.type, amount, ammoType: selectedReward.ammoType } });
            state.setTargetBonusBoxId(null);
          }
        }
      });
      state.ores.forEach((ore) => {
        if (state.targetOreId === ore.id) {
          if (Math.sqrt(Math.pow(shipPos.x - ore.x, 2) + Math.pow(shipPos.y - ore.y, 2)) < 55) {
            if (state.collectOre(ore.id)) { socket.emit('collect_ore', { id: ore.id }); }
            state.setTargetOreId(null);
          }
        }
      });
    };
    app.ticker.add(tickerCallback);
    return () => { app.ticker.remove(tickerCallback); };
  }, [app, socket]);

  useEffect(() => {
    if (!app || !cameraContainer) return;
    const handleCanvasClick = (e: MouseEvent) => {
      const state = useGameStore.getState();
      const target = e.target as HTMLElement;
      if (target.closest('.game-window')) return;
      const canvas = app.canvas as HTMLCanvasElement;
      if (canvas && (target === canvas || canvas.contains(target))) {
        const rect = canvas.getBoundingClientRect();
        const worldX = (e.clientX - rect.left) - cameraContainer.x;
        const worldY = (e.clientY - rect.top) - cameraContainer.y;
        if (handleEnemyClick(worldX, worldY) || handleBonusBoxClick(worldX, worldY) || handleOreClick(worldX, worldY)) return;
        state.setTargetBonusBoxId(null); state.setTargetOreId(null);
        if (Date.now() - lastOutsideClickTimeRef.current < 300) {
          state.setSelectedEnemyId(null); state.setInCombat(false); state.setPlayerFiring(false);
        }
        lastOutsideClickTimeRef.current = Date.now();
      }
    };
    window.addEventListener('mousedown', handleCanvasClick);
    return () => window.removeEventListener('mousedown', handleCanvasClick);
  }, [app, cameraContainer, handleEnemyClick, handleBonusBoxClick, handleOreClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useGameStore.getState();
      if (state.isDead) return;
      if (e.key === 'Escape') {
        state.setPlayerFiring(false); state.setInCombat(false); state.setSelectedEnemyId(null);
      } else if (e.key === '0') {
        if (!state.inCombat && !hasAggressiveEnemies() && (Date.now() - state.lastRepairTime) / 1000 >= 5) state.setIsRepairing(true);
      } else if (e.key === '1' && state.selectedEnemyId && !isInSafetyZone() && !state.instaShieldActive) {
        state.setInCombat(true); state.setPlayerFiring(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasAggressiveEnemies, isInSafetyZone]);

  const enemyList = useMemo(() => Array.from(enemies.entries()), [enemies]);
  const bonusBoxList = useMemo(() => Array.from(bonusBoxes.values()), [bonusBoxes]);
  const oreList = useMemo(() => Array.from(ores.values()), [ores]);
  const engagedEnemyList = useMemo(() => enemyList.filter(([id, e]) => {
    if (deadEnemies.has(id)) return false;
    if (e.health <= 0) return false;
    return e.isEngaged || (id === selectedEnemyId && inCombat);
  }), [enemyList, deadEnemies, selectedEnemyId, inCombat]);

  return (
    <div ref={containerRef} style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {isDead && <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 5000 }} />}
      <TopBar />
      <MessageSystem />
      <ActionBar 
        laserAmmo={useGameStore.getState().laserAmmo[currentLaserAmmoType]} 
        rocketAmmo={useGameStore.getState().rocketAmmo[currentRocketType]}
        rocketCooldown={rocketCooldown} repairCooldown={repairCooldown} isRepairing={isRepairing}
        onRepairClick={() => !inCombat && !hasAggressiveEnemies() && useGameStore.getState().setIsRepairing(true)}
      />
      {app && cameraContainer && (
        <>
          <Starfield app={app} cameraContainer={cameraContainer} />
          <MarsBackground app={app} cameraContainer={cameraContainer} />
          <Base app={app} cameraContainer={cameraContainer} position={basePosition} />
          {enemyList.map(([id, e]) => <Enemy key={id} app={app} cameraContainer={cameraContainer} enemyState={deadEnemies.has(id) ? null : e} isDead={deadEnemies.has(id)} />)}
          {bonusBoxList.map((box) => <BonusBox key={box.id} app={app} cameraContainer={cameraContainer} boxState={box} isCollecting={targetBonusBoxId === box.id && Math.sqrt(Math.pow(shipPosition.x - box.x, 2) + Math.pow(shipPosition.y - box.y, 2)) < 55} />)}
          {oreList.map((ore) => <ResourceCrystal key={ore.id} app={app} cameraContainer={cameraContainer} oreState={ore} isCollecting={targetOreId === ore.id && Math.sqrt(Math.pow(shipPosition.x - ore.x, 2) + Math.pow(shipPosition.y - ore.y, 2)) < 55} />)}
          {Array.from(remotePlayers.values()).map((p) => <RemoteShip key={p.id} app={app} cameraContainer={cameraContainer} x={p.x} y={p.y} rotation={p.angle} username={p.username} isMoving={p.thrust} />)}
          {selectedEnemyId && enemies.has(selectedEnemyId) && !deadEnemies.has(selectedEnemyId) && (() => {
            const enemy = enemies.get(selectedEnemyId);
            if (!enemy || enemy.health <= 0) return null;
            return (
              <>
                <SelectionCircle app={app} cameraContainer={cameraContainer} position={{ x: enemy.x, y: enemy.y }} selected={true} inCombat={inCombat} />
                <HPBar app={app} cameraContainer={cameraContainer} position={{ x: enemy.x, y: enemy.y }} health={enemy.health} maxHealth={enemy.maxHealth || 1000} visible={true} shield={enemy.shield ?? 0} maxShield={enemy.maxShield ?? 0} />
              </>
            );
          })()}
          <Ship 
            serverPosition={serverPosition} username={initialPlayerData.username} app={app} cameraContainer={cameraContainer} 
            onStateUpdate={handleShipStateUpdate} targetPosition={targetPosition} onTargetReached={() => useGameStore.getState().setTargetPosition(null)} 
            onEnemyClick={handleEnemyClick} onBonusBoxClick={handleBonusBoxClick} inCombat={!!(inCombat && selectedEnemyId)} isDead={isDead} 
          />
          {isDead && deathPosition && <ShipExplosion app={app} cameraContainer={cameraContainer} position={deathPosition} active={isDead} onComplete={() => setTimeout(() => useGameStore.getState().setShowDeathWindow(true), 1000)} />}
          {isRepairing && (
            <RepairRobot 
              app={app} 
              cameraContainer={cameraContainer} 
              shipPosition={shipPosition} 
              onRepairComplete={() => { 
                useGameStore.getState().setIsRepairing(false); 
                addMessage('Repair complete', 'success'); 
                socket.emit('player_heal', { amount: 0 }); // Final sync
              }} 
              onHealTick={(amt) => {
                useGameStore.getState().setPlayerHealth(Math.min(SPARROW_SHIP.hitpoints, playerHealth + amt));
                socket.emit('player_heal', { amount: amt });
              }} 
              playerHealth={playerHealth} 
              maxHealth={SPARROW_SHIP.hitpoints} 
            />
          )}
          <HPBar app={app} cameraContainer={cameraContainer} position={shipPosition} health={playerHealth} maxHealth={SPARROW_SHIP.hitpoints} visible={true} shield={playerShield ?? 0} maxShield={playerMaxShield ?? 0} />
          {instaShieldActive && <Shield app={app} cameraContainer={cameraContainer} position={shipPosition} active={true} />}
          {engagedEnemyList.map(([id, e]) => (
            <CombatSystem 
              key={id} app={app} cameraContainer={cameraContainer} playerPosition={shipPosition} playerVelocity={shipVelocity} playerRotation={shipRotation} playerHealth={playerHealth} 
              enemyState={e} playerFiring={playerFiring && selectedEnemyId === id} onPlayerHealthChange={(h) => useGameStore.getState().setPlayerHealth(h)} 
              onEnemyHealthChange={(h) => handleEnemyDamage({ id: id, damage: e.health - h, position: { x: e.x, y: e.y } })} isInSafetyZone={isInSafetyZone()} 
              laserAmmo={useGameStore.getState().laserAmmo[currentLaserAmmoType]} currentLaserCannon={currentLaserCannon} currentLaserAmmoType={currentLaserAmmoType}
              onLaserAmmoConsume={() => socket.emit('fire_laser', { ammoType: currentLaserAmmoType })} 
              rocketAmmo={useGameStore.getState().rocketAmmo[currentRocketType]} currentRocketType={currentRocketType}
              onRocketAmmoConsume={() => socket.emit('fire_rocket', { rocketType: currentRocketType })}
              playerFiringRocket={playerFiringRocket && selectedEnemyId === id}
              onRocketFired={() => {
                if (selectedEnemyId === id) {
                  useGameStore.getState().setPlayerFiringRocket(false);
                  useGameStore.getState().setPlayerLastRocketFireTime(Date.now());
                }
              }}
              onPlayerDamage={handlePlayerDamage} onEnemyDamage={(ev) => handleEnemyDamage({ id: id, ...ev })} 
            />
          ))}
          <DamageNumbers ref={damageNumbersRef} app={app} cameraContainer={cameraContainer} playerPosition={shipPosition} />
          {isInSafetyZone() && <div style={{ position: 'fixed', top: '190px', left: '50%', transform: 'translateX(-50%)', color: '#ffffff', fontFamily: 'monospace', fontSize: '16px', fontWeight: 'bold', zIndex: 1000, pointerEvents: 'none', textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)' }}>Safety Zone - Combat Disabled</div>}
          <ShipWindow /><StatsWindow /><DebugWindow /><BattleWindow /><MinimapWindow onTargetChange={(pos) => useGameStore.getState().setTargetPosition(pos)} /><SettingsWindow /><OreWindow /><TradeWindow socket={socket} />
          {isDead && showDeathWindow && <DeathWindow onRepairOnSpot={handleRepairOnSpot} />}
        </>
      )}
    </div>
  );
}
