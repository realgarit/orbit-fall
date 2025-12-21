/**
 * ZUSTAND INTEGRATION EXAMPLE
 *
 * This file demonstrates how to use the Zustand store instead of useState.
 * Use this as a reference when migrating components.
 */

import { useEffect } from 'react';
import { Application } from 'pixi.js';
import { useGameStore } from '../stores/gameStore';
import { shallow } from 'zustand/shallow';

// ============================================================================
// EXAMPLE 1: Basic State Access
// ============================================================================

export function BasicStateExample() {
  // Access individual state values
  const fps = useGameStore((state) => state.fps);
  const playerLevel = useGameStore((state) => state.playerLevel);
  const playerHealth = useGameStore((state) => state.playerHealth);

  // Access action methods
  const setFps = useGameStore((state) => state.setFps);

  return (
    <div>
      <p>FPS: {fps}</p>
      <p>Level: {playerLevel}</p>
      <p>Health: {playerHealth}</p>
      <button onClick={() => setFps(60)}>Set FPS to 60</button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 2: Multiple Values with Shallow Comparison (Performance Optimized)
// ============================================================================

export function MultipleValuesExample() {
  // Select multiple values efficiently
  // Component only re-renders when these specific values change
  const { shipPosition, shipRotation, playerHealth, playerShield } = useGameStore(
    (state) => ({
      shipPosition: state.shipPosition,
      shipRotation: state.shipRotation,
      playerHealth: state.playerHealth,
      playerShield: state.playerShield,
    }),
    shallow
  );

  return (
    <div>
      <p>
        Position: ({shipPosition.x.toFixed(0)}, {shipPosition.y.toFixed(0)})
      </p>
      <p>Rotation: {shipRotation.toFixed(2)}</p>
      <p>
        Health: {playerHealth} / Shield: {playerShield ?? 'None'}
      </p>
    </div>
  );
}

// ============================================================================
// EXAMPLE 3: Using Actions to Update State
// ============================================================================

export function ActionsExample() {
  const { playerExperience, playerLevel, playerCredits } = useGameStore(
    (state) => ({
      playerExperience: state.playerExperience,
      playerLevel: state.playerLevel,
      playerCredits: state.playerCredits,
    }),
    shallow
  );

  // Get action methods
  const addExperience = useGameStore((state) => state.addExperience);
  const addCredits = useGameStore((state) => state.addCredits);
  const consumeLaserAmmo = useGameStore((state) => state.consumeLaserAmmo);

  const handleKillEnemy = () => {
    // Simulate enemy kill rewards
    addExperience(400); // Automatically updates level
    addCredits(400);
  };

  const handleFireLaser = () => {
    const consumed = consumeLaserAmmo();
    if (!consumed) {
      console.log('Out of ammo!');
    }
  };

  return (
    <div>
      <p>Experience: {playerExperience}</p>
      <p>Level: {playerLevel}</p>
      <p>Credits: {playerCredits}</p>
      <button onClick={handleKillEnemy}>Simulate Enemy Kill</button>
      <button onClick={handleFireLaser}>Fire Laser</button>
    </div>
  );
}

// ============================================================================
// EXAMPLE 4: Using Zustand in PixiJS Ticker (No Refs Needed!)
// ============================================================================

export function PixiIntegrationExample({ app }: { app: Application }) {
  // No need to create refs or sync them!
  // Access state directly in ticker callback

  useEffect(() => {
    if (!app) return;

    const tickerCallback = () => {
      // Get current state without subscribing
      const state = useGameStore.getState();

      // Read state
      const { shipPosition, shipVelocity, enemies, inCombat } = state;

      // Example: Update ship position based on velocity
      const newX = shipPosition.x + shipVelocity.vx;
      const newY = shipPosition.y + shipVelocity.vy;

      // Update state directly
      state.setShipPosition({ x: newX, y: newY });

      // Example: Check combat state
      if (inCombat) {
        const aliveEnemies = Array.from(enemies.values()).filter(
          (enemy) => !state.deadEnemies.has(enemy.id) && enemy.health > 0
        );

        if (aliveEnemies.length === 0) {
          state.setInCombat(false);
        }
      }

      // Example: Update FPS
      state.setFps(Math.round(app.ticker.FPS));
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
    };
  }, [app]);

  return null; // This is a PixiJS integration component
}

// ============================================================================
// EXAMPLE 5: Enemy Management
// ============================================================================

export function EnemyManagementExample() {
  const enemies = useGameStore((state) => state.enemies);
  const deadEnemies = useGameStore((state) => state.deadEnemies);
  const updateEnemy = useGameStore((state) => state.updateEnemy);
  const addDeadEnemy = useGameStore((state) => state.addDeadEnemy);

  // Get alive enemies
  const aliveEnemies = Array.from(enemies.values()).filter(
    (enemy) => !deadEnemies.has(enemy.id) && enemy.health > 0
  );

  const handleDamageEnemy = (enemyId: string, damage: number) => {
    const enemy = enemies.get(enemyId);
    if (!enemy) return;

    const newHealth = Math.max(0, enemy.health - damage);
    updateEnemy(enemyId, { ...enemy, health: newHealth });

    if (newHealth === 0) {
      addDeadEnemy(enemyId);
    }
  };

  return (
    <div>
      <p>Alive Enemies: {aliveEnemies.length}</p>
      <p>Total Enemies: {enemies.size}</p>
      <p>Dead Enemies: {deadEnemies.size}</p>
      <div>
        {aliveEnemies.map((enemy) => (
          <div key={enemy.id}>
            <span>
              {enemy.name}: {enemy.health}/{enemy.maxHealth} HP
            </span>
            <button onClick={() => handleDamageEnemy(enemy.id, 100)}>Damage -100</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// EXAMPLE 6: Using Selectors (Pre-defined computed values)
// ============================================================================

export function SelectorsExample() {
  // Use pre-defined selectors from the store
  const currentLaserAmmo = useGameStore((state) =>
    state.laserAmmo[state.currentLaserAmmoType]
  );
  const currentRocketAmmo = useGameStore((state) =>
    state.rocketAmmo[state.currentRocketType]
  );

  const currentLaserType = useGameStore((state) => state.currentLaserAmmoType);
  const currentRocketType = useGameStore((state) => state.currentRocketType);

  return (
    <div>
      <p>
        {currentLaserType}: {currentLaserAmmo} rounds
      </p>
      <p>
        {currentRocketType}: {currentRocketAmmo} rockets
      </p>
    </div>
  );
}

// ============================================================================
// COMPARISON: Before vs After
// ============================================================================

/*
// BEFORE (using useState + refs):
function GameComponent() {
  const [shipPosition, setShipPosition] = useState({ x: 600, y: 400 });
  const [enemies, setEnemies] = useState(new Map());
  const [playerHealth, setPlayerHealth] = useState(4000);

  // Need refs for PixiJS callbacks
  const shipPositionRef = useRef(shipPosition);
  const enemiesRef = useRef(enemies);

  // Sync refs
  useEffect(() => {
    shipPositionRef.current = shipPosition;
  }, [shipPosition]);

  useEffect(() => {
    enemiesRef.current = enemies;
  }, [enemies]);

  useEffect(() => {
    const ticker = () => {
      const pos = shipPositionRef.current; // Use ref
      const enemies = enemiesRef.current;  // Use ref
      // ... game logic
    };
    app.ticker.add(ticker);
    return () => app.ticker.remove(ticker);
  }, [app]);

  return (
    <StatsWindow
      playerHealth={playerHealth}
      shipPosition={shipPosition}
      // ... many props
    />
  );
}

// AFTER (using Zustand):
function GameComponent() {
  // No useState, no refs!

  useEffect(() => {
    const ticker = () => {
      const state = useGameStore.getState();
      const pos = state.shipPosition;     // Direct access
      const enemies = state.enemies;      // Direct access
      // ... game logic
      state.setShipPosition(newPos);      // Direct update
    };
    app.ticker.add(ticker);
    return () => app.ticker.remove(ticker);
  }, [app]);

  return (
    <StatsWindow />  // No props needed!
  );
}

// Child component gets data directly from store
function StatsWindow() {
  const playerHealth = useGameStore(state => state.playerHealth);
  const shipPosition = useGameStore(state => state.shipPosition);
  // Component code...
}
*/
