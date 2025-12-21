import { useState, useEffect } from 'react';
import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';

interface DeathWindowProps {
  onRepairAtHomeBase?: () => void;
  onRepairAtJumpGate?: () => void;
  onRepairOnSpot?: () => void;
  windowId?: string;
}

// Death icon - skull/crossbones style
export const DeathIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Skull icon for death */}
    <circle cx="8" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <rect x="6" y="9" width="4" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="7" cy="5" r="0.8" fill="currentColor" />
    <circle cx="9" cy="5" r="0.8" fill="currentColor" />
    <path d="M7 7.5 Q8 8.5 9 7.5" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" />
  </svg>
);

export function DeathWindow({
  onRepairAtHomeBase,
  onRepairAtJumpGate,
  onRepairOnSpot,
  windowId = 'death-window',
}: DeathWindowProps) {
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);

  const windowWidth = 900; // Wide enough for 3 buttons horizontally
  const windowHeight = 210; // Slightly increased to prevent scrollbar

  // Calculate center position, update on window resize
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 400, y: 300 };
    return {
      x: window.innerWidth / 2 - windowWidth / 2,
      y: window.innerHeight / 2 - windowHeight / 2,
    };
  });

  useEffect(() => {
    const updatePosition = () => {
      const newX = window.innerWidth / 2 - windowWidth / 2;
      const newY = window.innerHeight / 2 - windowHeight / 2;
      setPosition({ x: newX, y: newY });
    };

    // Update immediately and on resize
    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [windowWidth, windowHeight]);

  return (
    <Window
      id={windowId}
      title="Ship Destroyed"
      icon={<DeathIcon />}
      initialX={position.x}
      initialY={position.y}
      initialWidth={windowWidth}
      initialHeight={windowHeight}
      initialZIndex={10000}
      fixed={true}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content" style={{ padding: '8px' }}>
        <div className="stats-section" style={{ marginBottom: '10px', textAlign: 'center' }}>
          <div className="stats-label" style={{ textAlign: 'center' }}>Ship Destroyed</div>
          <div className="stats-value" style={{ color: '#ef4444', marginBottom: '3px', textAlign: 'center' }}>
            Your ship has been destroyed!
          </div>
          <div className="stats-value" style={{ fontSize: '11px', color: '#94a3b8', textAlign: 'center' }}>
            Choose a repair option to continue:
          </div>
        </div>
        
        <div className="death-options-horizontal">
          <button
            className="death-option-button disabled"
            disabled
            title="Coming soon"
          >
            <div className="death-option-title">Repair at Nearest Home Base</div>
            <div className="death-option-description">
              Repair Credits (green bar) - Coming soon
            </div>
          </button>
          
          <button
            className="death-option-button disabled"
            disabled
            title="Coming soon"
          >
            <div className="death-option-title">Repair at Next Jump Gate</div>
            <div className="death-option-description">
              Premium - Coming soon
            </div>
          </button>
          
          <button
            className="death-option-button active"
            onClick={onRepairOnSpot}
          >
            <div className="death-option-title">Repair on the Spot</div>
            <div className="death-option-description">
              Free - Return to death location with 10% HP
            </div>
          </button>
        </div>
      </div>
    </Window>
  );
}
