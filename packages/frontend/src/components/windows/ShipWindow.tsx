import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';

interface ShipWindowProps {
  playerHealth?: number;
  maxHealth?: number;
  windowId?: string;
}

const ShipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 2L6 4H4L3 5V7L2 8L3 9V11L4 12H6L8 14L10 12H12L13 11V9L14 8L13 7V5L12 4H10L8 2Z"
      fill="currentColor"
    />
    <path
      d="M8 6L7 7V9L8 10L9 9V7L8 6Z"
      fill="currentColor"
    />
  </svg>
);

export function ShipWindow({
  playerHealth = 100,
  maxHealth = 100,
  windowId = 'ship-window',
}: ShipWindowProps) {
  const { minimizeWindow, restoreWindow } = useWindowManager();

  const healthPercentage = maxHealth > 0 ? (playerHealth / maxHealth) * 100 : 0;

  return (
    <Window
      id={windowId}
      title="Ship"
      icon={<ShipIcon />}
      initialX={20}
      initialY={60}
      initialWidth={280}
      initialHeight={200}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        {/* Hitpoints */}
        <div className="stats-section">
          <div className="stats-label">Hitpoints</div>
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
      </div>
    </Window>
  );
}
