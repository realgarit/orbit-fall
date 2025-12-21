import { useState } from 'react';

interface LaserSlotProps {
  slotNumber: number;
  ammo: number;
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

export function LaserSlot({ slotNumber, ammo, onActionClick }: LaserSlotProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    onActionClick?.(slotNumber);
  };

  return (
    <div
      className="game-actionbar-laser-slot-container"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        className="game-actionbar-item"
        onClick={handleClick}
      >
        {/* Ammunition count display on top */}
        <span className="game-actionbar-ammo">{formatAmmo(ammo)}</span>

        {/* Horizontal red laser icon */}
        <div className="game-actionbar-laser-icon">
          <svg width="24" height="8" viewBox="0 0 24 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="laserGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            {/* Outer large diffuse glow */}
            <rect x="0" y="1" width="24" height="6" rx="3" fill="#ff0000" opacity="0.2" />

            {/* Main beam with filter */}
            <g filter="url(#laserGlow)">
              {/* Primary laser body */}
              <rect x="0" y="2.5" width="24" height="3" rx="1.5" fill="#ff0000" />
              {/* Bright core */}
              <rect x="0" y="3.5" width="24" height="1" rx="0.5" fill="#ffffff" opacity="0.9" />
            </g>

            {/* Energy sparks/particles */}
            <rect x="4" y="2" width="1.5" height="1" rx="0.5" fill="#ffcccc" opacity="0.8" />
            <rect x="18" y="5" width="2" height="1" rx="0.5" fill="#ffcccc" opacity="0.8" />
            <rect x="12" y="1.5" width="1" height="1" rx="0.5" fill="#ffffff" opacity="0.6" />
          </svg>
        </div>

        {/* Slot number badge */}
        <span className="game-actionbar-badge">{slotNumber}</span>
      </button>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="game-actionbar-laser-tooltip">
          <div className="game-actionbar-laser-tooltip-name">LC-10</div>
          <div className="game-actionbar-laser-tooltip-amount">{formatExactAmmo(ammo)}</div>
        </div>
      )}
    </div>
  );
}
