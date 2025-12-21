import { useState } from 'react';

interface RepairSlotProps {
  slotNumber: number;
  cooldown: number;
  isRepairing: boolean;
  onActionClick?: (key: number) => void;
}

export function RepairSlot({ slotNumber, cooldown, isRepairing, onActionClick }: RepairSlotProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onActionClick?.(slotNumber);
  };

  const isReady = cooldown <= 0 && !isRepairing;

  return (
    <div
      className="game-actionbar-laser-slot-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className="game-actionbar-item"
        onClick={handleClick}
        disabled={!isReady}
        style={{
          opacity: isReady ? 1 : 0.5,
          cursor: isReady ? 'pointer' : 'not-allowed',
        }}
      >
        {/* Cooldown display on top */}
        {cooldown > 0 && (
          <span className="game-actionbar-ammo" style={{ color: '#ff8800' }}>
            {cooldown.toFixed(1)}s
          </span>
        )}
        {isRepairing && (
          <span className="game-actionbar-ammo" style={{ color: '#00ff88' }}>
            REPAIR
          </span>
        )}

        {/* Tools icon */}
        <div className="game-actionbar-repair-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="botBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#475569" />
                <stop offset="100%" stopColor="#1e293b" />
              </linearGradient>
              <filter id="visorGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.8" result="blur" />
              </filter>
            </defs>

            {/* Robot Base/Shoulders */}
            <path d="M4 18 C4 16 6 15 12 15 C18 15 20 16 20 18 L20 20 L4 20 Z" fill="#334155" />

            {/* Main Robot Head/Body */}
            <rect x="6" y="6" width="12" height="10" rx="3" fill="url(#botBodyGradient)" />

            {/* Visor/Eye area */}
            <rect x="8" y="9" width="8" height="3" rx="1.5" fill="#0f172a" />

            {/* Glowing Visor */}
            <g filter="url(#visorGlow)">
              <rect x="9" y="10" width="6" height="1" rx="0.5" fill={isRepairing ? "#00ff88" : "#00ffff"} opacity="0.8" />
            </g>

            {/* Antennas */}
            <line x1="9" y1="6" x2="7" y2="3" stroke="#94a3b8" strokeWidth="1" />
            <line x1="15" y1="6" x2="17" y2="3" stroke="#94a3b8" strokeWidth="1" />
            <circle cx="7" cy="3" r="1" fill={isRepairing ? "#00ff88" : "#64748b"} />
            <circle cx="17" cy="3" r="1" fill={isRepairing ? "#00ff88" : "#64748b"} />

            {/* Side mechanical detail */}
            <rect x="5" y="11" width="2" height="4" rx="1" fill="#1e293b" />
            <rect x="17" y="11" width="2" height="4" rx="1" fill="#1e293b" />
          </svg>
        </div>

        {/* Slot number badge */}
        <span className="game-actionbar-badge">{slotNumber}</span>
      </button>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="game-actionbar-laser-tooltip">
          <div className="game-actionbar-laser-tooltip-name">RPR-1</div>
          <div className="game-actionbar-laser-tooltip-amount" style={{ fontSize: '11px', marginTop: '2px' }}>
            {isRepairing
              ? 'Repairing...'
              : cooldown > 0
                ? `Cooldown: ${cooldown.toFixed(1)}s`
                : 'Ready to repair'}
          </div>
        </div>
      )}
    </div>
  );
}

