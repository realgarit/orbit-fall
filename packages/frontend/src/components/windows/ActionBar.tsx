import React from 'react';
import { LaserSlot } from './LaserSlot';

interface ActionBarProps {
  laserAmmo?: number;
  onActionClick?: (key: number) => void;
}

export function ActionBar({ laserAmmo = 0, onActionClick }: ActionBarProps) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  const handleClick = (key: number) => {
    onActionClick?.(key);
  };

  return (
    <div className="game-actionbar">
      {/* Slot 1: LC-10 Laser */}
      <LaserSlot
        slotNumber={1}
        ammo={laserAmmo}
        onActionClick={handleClick}
      />
      
      {/* Slots 2-9, 0: Regular numbered buttons */}
      {keys.slice(1).map((key) => (
        <button
          key={key}
          className="game-actionbar-item"
          onClick={() => handleClick(key)}
          title={`Action ${key}`}
        >
          <span className="game-actionbar-badge">{key}</span>
        </button>
      ))}
    </div>
  );
}
