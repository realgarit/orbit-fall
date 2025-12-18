import React, { useState } from 'react';

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
        
        {/* Simple gear/tool icon */}
        <div className="game-actionbar-repair-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Simple gear icon */}
            <circle cx="12" cy="12" r="6" fill="#06b6d4" />
            <circle cx="12" cy="12" r="3" fill="#0ea5e9" />
            {/* Gear teeth */}
            <rect x="11" y="4" width="2" height="3" fill="#0ea5e9" />
            <rect x="11" y="17" width="2" height="3" fill="#0ea5e9" />
            <rect x="4" y="11" width="3" height="2" fill="#0ea5e9" />
            <rect x="17" y="11" width="3" height="2" fill="#0ea5e9" />
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

