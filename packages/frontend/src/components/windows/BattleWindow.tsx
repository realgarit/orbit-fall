import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';

const BattleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Crosshair/Target icon for battle */}
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" />
    <line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" />
    <line x1="2" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
  </svg>
);

export function BattleWindow() {
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  // Get state from Zustand
  const selectedEnemyId = useGameStore((state) => state.selectedEnemyId);
  const enemies = useGameStore((state) => state.enemies);
  const deadEnemies = useGameStore((state) => state.deadEnemies);
  const inCombat = useGameStore((state) => state.inCombat);

  // Get selected enemy data
  const selectedEnemy = selectedEnemyId && enemies.has(selectedEnemyId) && !deadEnemies.has(selectedEnemyId)
    ? (() => {
        const enemy = enemies.get(selectedEnemyId);
        if (!enemy || enemy.health <= 0) return null;
        return {
          name: enemy.name,
          health: enemy.health,
          maxHealth: enemy.maxHealth,
          shield: enemy.shield,
          maxShield: enemy.maxShield,
        };
      })()
    : null;

  const isInCombat = selectedEnemyId && enemies.has(selectedEnemyId) && !deadEnemies.has(selectedEnemyId)
    ? (() => {
        const enemy = enemies.get(selectedEnemyId);
        return inCombat && enemy !== undefined && enemy.health > 0;
      })()
    : false;

  // Calculate height based on whether enemy has shield
  const hasShield = selectedEnemy && selectedEnemy.maxShield !== undefined;
  const windowHeight = hasShield ? 240 : 180;

  return (
    <Window
      id="battle-window"
      title="Battle"
      icon={<BattleIcon />}
      initialX={320}
      initialY={60}
      initialWidth={280}
      initialHeight={windowHeight}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        {/* Combat Status */}
        <div className="stats-section">
          <div className="stats-label">Combat Status</div>
          <div className={`stats-combat-status ${isInCombat ? 'in-combat' : 'idle'}`}>
            {isInCombat ? 'In Combat' : 'Idle'}
          </div>
        </div>

        {/* Selected Enemy */}
        {selectedEnemy && (
          <>
            <div className="stats-section">
              <div className="stats-label">Target: {selectedEnemy.name}</div>
              {selectedEnemy.health !== undefined && selectedEnemy.maxHealth !== undefined && (
                <div className="stats-health-bar-container">
                  <div
                    className="stats-health-bar enemy"
                    style={{
                      width: `${((selectedEnemy.health / selectedEnemy.maxHealth) * 100)}%`,
                    }}
                  />
                  <div className="stats-health-text">
                    {selectedEnemy.health.toFixed(0)} / {selectedEnemy.maxHealth}
                  </div>
                </div>
              )}
            </div>
            
            {/* Enemy Shield */}
            {selectedEnemy.maxShield !== undefined && (
              <div className="stats-section">
                <div className="stats-label">Shield</div>
                <div className="stats-health-bar-container">
                  <div
                    className="stats-health-bar stats-shield-bar"
                    style={{
                      width: `${selectedEnemy.maxShield > 0 ? ((selectedEnemy.shield ?? 0) / selectedEnemy.maxShield) * 100 : 0}%`,
                    }}
                  />
                  <div className="stats-health-text">
                    {(selectedEnemy.shield ?? 0).toFixed(0)} / {selectedEnemy.maxShield}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Window>
  );
}
