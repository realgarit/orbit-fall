import React from 'react';

interface ActionBarProps {
  onActionClick?: (key: number) => void;
}

export function ActionBar({ onActionClick }: ActionBarProps) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

  const handleClick = (key: number) => {
    onActionClick?.(key);
  };

  return (
    <div className="game-actionbar">
      {keys.map((key) => (
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
