import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';

interface BattleWindowProps {
  selectedEnemy?: {
    name: string;
    health?: number;
    maxHealth?: number;
  } | null;
  inCombat?: boolean;
  windowId?: string;
}

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

export function BattleWindow({
  selectedEnemy = null,
  inCombat = false,
  windowId = 'battle-window',
}: BattleWindowProps) {
  const { minimizeWindow, restoreWindow } = useWindowManager();

  return (
    <Window
      id={windowId}
      title="Battle"
      icon={<BattleIcon />}
      initialX={320}
      initialY={60}
      initialWidth={280}
      initialHeight={180}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        {/* Combat Status */}
        <div className="stats-section">
          <div className="stats-label">Combat Status</div>
          <div className={`stats-combat-status ${inCombat ? 'in-combat' : 'idle'}`}>
            {inCombat ? 'In Combat' : 'Idle'}
          </div>
        </div>

        {/* Selected Enemy */}
        {selectedEnemy && (
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
        )}
      </div>
    </Window>
  );
}
