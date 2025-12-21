import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useGameStore } from '../../stores/gameStore';
import { getLevelProgress, getExpForNextLevel } from '@shared/utils/leveling';

const StatsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 2h12v12H2V2zm1 1v10h10V3H3zm1 1h8v1H4V4zm0 2h8v1H4V6zm0 2h6v1H4V8z"
      fill="currentColor"
    />
  </svg>
);

export function StatsWindow() {
  const { minimizeWindow, restoreWindow } = useWindowManager();

  // Get state from Zustand
  const shipVelocity = useGameStore((state) => state.shipVelocity);
  const fps = useGameStore((state) => state.fps);
  const playerLevel = useGameStore((state) => state.playerLevel);
  const playerExperience = useGameStore((state) => state.playerExperience);
  const playerCredits = useGameStore((state) => state.playerCredits);
  const playerHonor = useGameStore((state) => state.playerHonor);
  const playerAetherium = useGameStore((state) => state.playerAetherium);

  const speed = Math.sqrt(shipVelocity.vx * shipVelocity.vx + shipVelocity.vy * shipVelocity.vy);
  const expForNextLevel = getExpForNextLevel(playerLevel);
  const levelProgress = getLevelProgress(playerExperience, playerLevel);

  return (
    <Window
      id="stats-window"
      title="Stats"
      icon={<StatsIcon />}
      initialX={20}
      initialY={60}
      initialWidth={280}
      initialHeight={400}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        {/* Level and Experience */}
        <div className="stats-section">
          <div className="stats-label">Level</div>
          <div className="stats-value">{playerLevel}</div>
        </div>

        <div className="stats-section">
          <div className="stats-label">Experience</div>
          <div className="stats-value">
            {playerExperience.toLocaleString()}
            {expForNextLevel !== null && (
              <span style={{ fontSize: '11px', color: '#888' }}>
                {' '}/ {expForNextLevel.toLocaleString()}
              </span>
            )}
          </div>
          {expForNextLevel !== null && (
            <div className="stats-health-bar-container" style={{ marginTop: '4px' }}>
              <div
                className="stats-health-bar"
                style={{ width: `${levelProgress}%`, height: '4px' }}
              />
            </div>
          )}
        </div>

        {/* Currency */}
        <div className="stats-section">
          <div className="stats-label">Credits</div>
          <div className="stats-value">{playerCredits.toLocaleString()}</div>
        </div>

        <div className="stats-section">
          <div className="stats-label">Honor</div>
          <div className="stats-value">{playerHonor.toLocaleString()}</div>
        </div>

        <div className="stats-section">
          <div className="stats-label">Aetherium</div>
          <div className="stats-value">{playerAetherium.toLocaleString()}</div>
        </div>

        {/* Technical Stats */}
        <div className="stats-section" style={{ marginTop: '8px', borderTop: '1px solid #333', paddingTop: '8px' }}>
          <div className="stats-label">Speed</div>
          <div className="stats-value">
            {speed.toFixed(2)}
          </div>
        </div>

        <div className="stats-section">
          <div className="stats-label">Velocity</div>
          <div className="stats-value" style={{ fontSize: '11px' }}>
            X: {shipVelocity.vx.toFixed(2)}, Y: {shipVelocity.vy.toFixed(2)}
          </div>
        </div>

        <div className="stats-section">
          <div className="stats-label">FPS</div>
          <div className="stats-value">
            {fps.toFixed(0)}
          </div>
        </div>
      </div>
    </Window>
  );
}
