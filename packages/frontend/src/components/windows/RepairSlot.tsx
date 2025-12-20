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
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
            <path d="M1 0 0 1l2.2 3.081a1 1 0 0 0 .815.419h.07a1 1 0 0 1 .708.293l2.675 2.675-2.617 2.654A3.003 3.003 0 0 0 0 13a3 3 0 1 0 5.878-.851l2.654-2.617.968.968-.305.914a1 1 0 0 0 .242 1.023l3.27 3.27a.997.997 0 0 0 1.414 0l1.586-1.586a.997.997 0 0 0 0-1.414l-3.27-3.27a1 1 0 0 0-1.023-.242L10.5 9.5l-.96-.96 2.68-2.643A3.005 3.005 0 0 0 16 3q0-.405-.102-.777l-2.14 2.141L12 4l-.364-1.757L13.777.102a3 3 0 0 0-3.675 3.68L7.462 6.46 4.793 3.793a1 1 0 0 1-.293-.707v-.071a1 1 0 0 0-.419-.814zm9.646 10.646a.5.5 0 0 1 .708 0l2.914 2.915a.5.5 0 0 1-.707.707l-2.915-2.914a.5.5 0 0 1 0-.708M3 11l.471.242.529.026.287.445.445.287.026.529L5 13l-.242.471-.026.529-.445.287-.287.445-.529.026L3 15l-.471-.242L2 14.732l-.287-.445L1.268 14l-.026-.529L1 13l.242-.471.026-.529.445-.287.287-.445.529-.026z"/>
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

