import React, { useState } from 'react';

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
          <svg width="32" height="8" viewBox="0 0 32 8" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer glow */}
            <rect x="0" y="2" width="32" height="4" rx="2" fill="#ff0000" opacity="0.5" />
            {/* Main laser beam */}
            <rect x="0" y="3" width="32" height="2" rx="1" fill="#ff0000" />
            {/* Inner highlight */}
            <rect x="0" y="3.5" width="32" height="1" rx="0.5" fill="#ff6666" />
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
