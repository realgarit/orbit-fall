import { useState } from 'react';

interface RocketSlotProps {
  slotNumber: number;
  ammo: number;
  cooldown?: number;
  onActionClick?: (key: number) => void;
}

// Format ammunition count to "X.XK" format (for display)
const formatAmmo = (amount: number): string => {
  if (amount >= 1000) {
    // Truncate to one decimal place instead of rounding
    // e.g., 9999 -> 9.9K (not 10.0K), 9954 -> 9.9K
    const thousands = amount / 1000;
    const truncated = Math.floor(thousands * 10) / 10;
    return `${truncated.toFixed(1)}K`;
  }
  return amount.toString();
};

// Format exact amount with thousands separator (e.g., 9'954)
const formatExactAmmo = (amount: number): string => {
  return amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
};

export function RocketSlot({ slotNumber, ammo, cooldown = 0, onActionClick }: RocketSlotProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onActionClick?.(slotNumber);
  };

  const isOnCooldown = cooldown > 0;

  return (
    <div
      className="game-actionbar-laser-slot-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className="game-actionbar-item"
        onClick={handleClick}
        style={{
          opacity: isOnCooldown ? 0.5 : 1,
        }}
      >
        {/* Cooldown or ammo display on top */}
        {isOnCooldown ? (
          <span className="game-actionbar-ammo" style={{ color: '#ff8800' }}>
            {cooldown.toFixed(1)}s
          </span>
        ) : (
          <span className="game-actionbar-ammo">{formatAmmo(ammo)}</span>
        )}

        {/* Horizontal rocket icon */}
        <div className="game-actionbar-rocket-icon">
          <svg width="24" height="8" viewBox="0 0 24 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="rocketBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ff4d4d" />
                <stop offset="50%" stopColor="#ff0000" />
                <stop offset="100%" stopColor="#990000" />
              </linearGradient>
              <filter id="flameGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.5" result="blur" />
              </filter>
            </defs>

            {/* Back Fins */}
            <path d="M4 2.5 L0 0.5 L0 2.5 Z" fill="#990000" />
            <path d="M4 5.5 L0 7.5 L0 5.5 Z" fill="#990000" />
            <path d="M3 3 L1 3.5 L3 4 Z" fill="#660000" />

            {/* Exhaust Flame */}
            <g filter="url(#flameGlow)">
              <path d="M1 3 L-3 4 L1 5 Z" fill="#ffcc00" opacity="0.8" />
              <circle cx="0" cy="4" r="1.5" fill="#ffffff" opacity="0.9" />
            </g>

            {/* Main Rocket Body */}
            <rect x="3" y="2" width="14" height="4" rx="1.5" fill="url(#rocketBodyGradient)" />
            {/* Panel lines */}
            <rect x="7" y="2" width="0.5" height="4" fill="#000000" opacity="0.2" />
            <rect x="12" y="2" width="0.5" height="4" fill="#000000" opacity="0.2" />

            {/* Nose Cone */}
            <path d="M17 2 C19 2 22 3 23 4 C22 5 19 6 17 6 Z" fill="#cc0000" />
            {/* Tip Highlight */}
            <circle cx="18" cy="3" r="0.5" fill="#ffffff" opacity="0.4" />
          </svg>
        </div>

        {/* Slot number badge */}
        <span className="game-actionbar-badge">{slotNumber}</span>
      </button>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="game-actionbar-laser-tooltip">
          <div className="game-actionbar-laser-tooltip-name">RT-01</div>
          <div className="game-actionbar-laser-tooltip-amount">
            {isOnCooldown
              ? `Cooldown: ${cooldown.toFixed(1)}s`
              : formatExactAmmo(ammo)}
          </div>
        </div>
      )}
    </div>
  );
}
