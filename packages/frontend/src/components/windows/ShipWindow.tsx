import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';
import { useGameStore } from '../../stores/gameStore';
import { SPARROW_SHIP } from '@shared/constants';

const ShipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Simple spaceship: triangle pointing up with small base */}
    <path
      d="M8 2L4 12H6L8 10L10 12H12L8 2Z"
      fill="currentColor"
    />
  </svg>
);

export function ShipWindow() {
  const { minimizeWindow, restoreWindow } = useWindowManager();

  // Get state from Zustand
  const playerHealth = useGameStore((state) => state.playerHealth);
  const playerShield = useGameStore((state) => state.playerShield);
  const playerMaxShield = useGameStore((state) => state.playerMaxShield);
  const currentLaserCannon = useGameStore((state) => state.currentLaserCannon);
  const currentLaserAmmoType = useGameStore((state) => state.currentLaserAmmoType);
  const currentRocketType = useGameStore((state) => state.currentRocketType);

  const maxHealth = SPARROW_SHIP.hitpoints;
  const healthPercentage = maxHealth > 0 ? (playerHealth / maxHealth) * 100 : 0;
  const shieldPercentage = playerMaxShield && playerMaxShield > 0
    ? ((playerShield ?? 0) / playerMaxShield) * 100
    : 0;
  const hasShield = playerMaxShield && playerMaxShield > 0;

  return (
    <Window
      id="ship-window"
      title="Ship"
      icon={<ShipIcon />}
      initialX={20}
      initialY={60}
      initialWidth={280}
      initialHeight={hasShield ? 280 : 240}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        {/* Ship Name */}
        <div className="stats-section">
          <div className="stats-label">Ship</div>
          <div className="stats-value">{SPARROW_SHIP.name}</div>
        </div>

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

        {/* Shield - Always show, even if 0 */}
        <div className="stats-section">
          <div className="stats-label">Shield</div>
          <div className="stats-health-bar-container">
            <div
              className="stats-health-bar stats-shield-bar"
              style={{ 
                width: `${shieldPercentage}%`,
              }}
            />
            <div className="stats-health-text">
              {(playerShield ?? 0).toFixed(0)} / {(playerMaxShield ?? 0).toFixed(0)}
            </div>
          </div>
        </div>

        {/* Ship Stats */}
        <div className="stats-section">
          <div className="stats-label">Ship Stats</div>
          <div className="stats-value" style={{ fontSize: '12px' }}>
            Speed: {SPARROW_SHIP.baseSpeed}<br/>
            Cargo: {SPARROW_SHIP.cargo}<br/>
            Laser Slots: {SPARROW_SHIP.laserSlots}<br/>
            Generator Slots: {SPARROW_SHIP.generatorSlots}<br/>
            Extras Slots: {SPARROW_SHIP.extrasSlots}
          </div>
        </div>

        {/* Equipment */}
        <div className="stats-section">
          <div className="stats-label">Equipment</div>
          <div className="stats-value" style={{ fontSize: '12px' }}>
            Laser: {currentLaserCannon}<br/>
            Ammo: {currentLaserAmmoType}<br/>
            Rocket: {currentRocketType}
          </div>
        </div>
      </div>
    </Window>
  );
}
