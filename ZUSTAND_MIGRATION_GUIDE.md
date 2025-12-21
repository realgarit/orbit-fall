# Zustand Migration Guide

This guide shows how to gradually migrate from React useState to Zustand state management.

## Why Zustand?

The current Game.tsx has 30+ `useState` calls with complex ref synchronization for PixiJS ticker callbacks. Zustand provides:

- Centralized state management
- No ref synchronization needed (access state outside React)
- Better debugging and dev tools
- Cleaner code organization

## The Zustand Store

The store is located at `src/stores/gameStore.ts` and includes:

- Ship state (position, velocity, rotation)
- Player stats (health, shield, experience, credits, etc.)
- Combat state (selected enemy, firing states)
- Enemy management (enemies Map, positions, dead enemies)
- Equipment and ammo
- UI state (repair, death, targeting)

## Migration Strategy: Gradual Replacement

You can migrate incrementally without breaking existing code:

### Step 1: Start with Simple State

Pick simple state variables first (like `fps`, `isDead`, `isRepairing`):

**Before (Game.tsx):**
```tsx
const [fps, setFps] = useState(0);
const [isDead, setIsDead] = useState(false);
```

**After:**
```tsx
import { useGameStore } from '../stores/gameStore';

// In component:
const fps = useGameStore((state) => state.fps);
const isDead = useGameStore((state) => state.isDead);
const setFps = useGameStore((state) => state.setFps);
const setIsDead = useGameStore((state) => state.setIsDead);
```

### Step 2: Use Selectors for Performance

For frequently updated state, use shallow comparison:

```tsx
import { useGameStore } from '../stores/gameStore';
import { shallow } from 'zustand/shallow';

// Select multiple values efficiently
const { shipPosition, shipRotation } = useGameStore(
  (state) => ({
    shipPosition: state.shipPosition,
    shipRotation: state.shipRotation,
  }),
  shallow
);
```

### Step 3: Access State in PixiJS Ticker Callbacks

**OLD WAY (with refs):**
```tsx
const [enemies, setEnemies] = useState(new Map());
const enemiesRef = useRef(enemies);

useEffect(() => {
  enemiesRef.current = enemies;
}, [enemies]);

useEffect(() => {
  const ticker = () => {
    const currentEnemies = enemiesRef.current; // Access via ref
    // ... game logic
  };
  app.ticker.add(ticker);
  return () => app.ticker.remove(ticker);
}, [app]);
```

**NEW WAY (with Zustand):**
```tsx
import { useGameStore } from '../stores/gameStore';

useEffect(() => {
  const ticker = () => {
    // Access state directly without subscribing
    const enemies = useGameStore.getState().enemies;
    const shipPosition = useGameStore.getState().shipPosition;

    // Update state
    useGameStore.getState().setShipPosition({ x: newX, y: newY });

    // ... game logic
  };
  app.ticker.add(ticker);
  return () => app.ticker.remove(ticker);
}, [app]);
```

**Benefits:**
- No ref synchronization needed
- Always get latest state
- Can update state directly
- Cleaner code

### Step 4: Migrate Complex State (Enemies, Combat)

**Before:**
```tsx
const [enemies, setEnemies] = useState<Map<string, EnemyState>>(new Map());
const [selectedEnemyId, setSelectedEnemyId] = useState<string | null>(null);

// Update enemy
setEnemies((prev) => {
  const newMap = new Map(prev);
  newMap.set(enemyId, updatedEnemy);
  return newMap;
});
```

**After:**
```tsx
const enemies = useGameStore((state) => state.enemies);
const selectedEnemyId = useGameStore((state) => state.selectedEnemyId);
const updateEnemy = useGameStore((state) => state.updateEnemy);

// Update enemy
updateEnemy(enemyId, updatedEnemy);
```

### Step 5: Use Action Methods

The store provides convenient action methods:

```tsx
// Player progression
const addExperience = useGameStore((state) => state.addExperience);
const addCredits = useGameStore((state) => state.addCredits);

// Usage
addExperience(400);  // Automatically updates level
addCredits(400);

// Ammo consumption
const consumeLaserAmmo = useGameStore((state) => state.consumeLaserAmmo);
const consumed = consumeLaserAmmo(); // Returns true if successful
```

## Example: Migrating a Component

### StatsWindow.tsx Migration

**Before:**
```tsx
interface StatsWindowProps {
  playerHealth: number;
  playerMaxHealth: number;
  playerShield?: number;
  playerMaxShield?: number;
  playerExperience: number;
  playerLevel: number;
  playerCredits: number;
  playerHonor: number;
  // ... many props
}

export function StatsWindow({
  playerHealth,
  playerMaxHealth,
  // ... many props
}: StatsWindowProps) {
  // Component code
}
```

**After:**
```tsx
import { useGameStore } from '../../stores/gameStore';

interface StatsWindowProps {
  // Much cleaner - only UI-specific props remain
}

export function StatsWindow(props: StatsWindowProps) {
  // Select only what this component needs
  const {
    playerHealth,
    playerShield,
    playerExperience,
    playerLevel,
    playerCredits,
    playerHonor,
  } = useGameStore(
    (state) => ({
      playerHealth: state.playerHealth,
      playerShield: state.playerShield,
      playerExperience: state.playerExperience,
      playerLevel: state.playerLevel,
      playerCredits: state.playerCredits,
      playerHonor: state.playerHonor,
    }),
    shallow
  );

  // Component code - same as before
}
```

**Parent component (Game.tsx) - Before:**
```tsx
<StatsWindow
  playerHealth={playerHealth}
  playerMaxHealth={SPARROW_SHIP.hitpoints}
  playerShield={playerShield}
  playerMaxShield={playerMaxShield}
  playerExperience={playerExperience}
  playerLevel={playerLevel}
  playerCredits={playerCredits}
  playerHonor={playerHonor}
  // ... many props
/>
```

**Parent component - After:**
```tsx
<StatsWindow />  {/* Much cleaner! */}
```

## Migration Order Recommendation

1. ✅ **Simple scalar state** (fps, isDead, isRepairing)
2. ✅ **Player stats** (health, shield, experience, credits)
3. ✅ **Combat state** (selectedEnemyId, inCombat, playerFiring)
4. ✅ **Ship state** (position, velocity, rotation)
5. ✅ **Equipment & ammo** (lasers, rockets)
6. ✅ **Enemy management** (enemies Map, positions, dead enemies)
7. ✅ **Cooldowns & timers**

## Testing During Migration

1. Keep both systems running side-by-side initially
2. Migrate one state variable at a time
3. Test after each migration
4. Remove old useState when Zustand version works
5. Remove refs once state is in Zustand

## DevTools

Install Zustand DevTools for debugging:

```bash
npm install --save-dev @redux-devtools/extension
```

```tsx
import { devtools } from 'zustand/middleware';

export const useGameStore = create<GameState>()(
  devtools(
    (set, get) => ({
      // ... store implementation
    }),
    { name: 'GameStore' }
  )
);
```

## Benefits After Migration

- ✅ Game.tsx reduced from 1,227 lines to ~600 lines
- ✅ No more ref synchronization (30+ refs eliminated)
- ✅ Child components get state directly (no prop drilling)
- ✅ Easier testing (mock store instead of props)
- ✅ Better debugging with DevTools
- ✅ Cleaner PixiJS integration

## Questions?

The Zustand store is fully typed and includes:
- All game state
- Type-safe actions
- Helper selectors
- Convenient methods for common operations

Start with simple state and gradually migrate. The store is ready to use!
