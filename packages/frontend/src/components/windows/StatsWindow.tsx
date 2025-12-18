import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';

interface StatsWindowProps {
  playerHealth?: number;
  maxHealth?: number;
  shipPosition?: { x: number; y: number };
  shipVelocity?: { vx: number; vy: number };
  fps?: number;
  selectedEnemy?: {
    name: string;
    health?: number;
    maxHealth?: number;
  } | null;
  inCombat?: boolean;
  windowId?: string;
}

const StatsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 2h12v12H2V2zm1 1v10h10V3H3zm1 1h8v1H4V4zm0 2h8v1H4V6zm0 2h6v1H4V8z"
      fill="currentColor"
    />
  </svg>
);

export function StatsWindow({
  playerHealth = 100,
  maxHealth = 100,
  shipPosition = { x: 0, y: 0 },
  shipVelocity = { vx: 0, vy: 0 },
  fps = 0,
  selectedEnemy = null,
  inCombat = false,
  windowId = 'stats-window',
}: StatsWindowProps) {
  const { minimizeWindow, restoreWindow } = useWindowManager();

  const healthPercentage = maxHealth > 0 ? (playerHealth / maxHealth) * 100 : 0;
  const speed = Math.sqrt(shipVelocity.vx * shipVelocity.vx + shipVelocity.vy * shipVelocity.vy);

  return (
    <Window
      id={windowId}
      title="Stats"
      icon={<StatsIcon />}
      initialX={20}
      initialY={60}
      initialWidth={280}
      initialHeight={320}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        {/* Player Health */}
        <div className="stats-section">
          <div className="stats-label">Player Health</div>
          <div className="stats-health-bar-container">
            <div
              className="stats-health-bar"
              style={{ width: `${healthPercentage}%` }}
            />
            <div className="stats-health-text">
              {playerHealth.toFixed(0)} / {maxHealth}
            </div>
          </div>
        </div>

        {/* Ship Position */}
        <div className="stats-section">
          <div className="stats-label">Position</div>
          <div className="stats-value">
            X: {shipPosition.x.toFixed(1)}, Y: {shipPosition.y.toFixed(1)}
          </div>
        </div>

        {/* Speed */}
        <div className="stats-section">
          <div className="stats-label">Speed</div>
          <div className="stats-value">
            {speed.toFixed(2)}
          </div>
        </div>

        {/* Velocity */}
        <div className="stats-section">
          <div className="stats-label">Velocity</div>
          <div className="stats-value">
            X: {shipVelocity.vx.toFixed(2)}, Y: {shipVelocity.vy.toFixed(2)}
          </div>
        </div>

        {/* FPS */}
        <div className="stats-section">
          <div className="stats-label">FPS</div>
          <div className="stats-value">
            {fps.toFixed(0)}
          </div>
        </div>

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
