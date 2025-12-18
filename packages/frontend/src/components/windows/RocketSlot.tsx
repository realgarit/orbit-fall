import React, { useState } from 'react';

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
            {/* Outer glow */}
            <rect x="0" y="2" width="24" height="4" rx="2" fill="#ff0000" opacity="0.5" />
            {/* Main rocket body (cylindrical) */}
            <rect x="2" y="2.5" width="16" height="3" rx="1.5" fill="#ff0000" />
            {/* Inner highlight */}
            <rect x="2" y="3" width="16" height="2" rx="1" fill="#ff6666" />
            {/* Rocket nose cone (pointed front) */}
            <path d="M18 1 L22 4 L18 7 Z" fill="#ff0000" />
            {/* Rocket fins (at back) */}
            <path d="M2 2.5 L0 0 L0 2.5 Z" fill="#cc0000" />
            <path d="M2 5.5 L0 8 L0 5.5 Z" fill="#cc0000" />
            {/* Rocket exhaust (small flame at back) */}
            <rect x="0" y="3.5" width="2" height="1" fill="#ff8800" />
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
