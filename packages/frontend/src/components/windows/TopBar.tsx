import React from 'react';
import { useWindowManager } from '../../hooks/useWindowManager';

interface TopBarProps {
  windowIcons?: Map<string, React.ReactNode>;
}

// Default icon for stats window
const StatsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 2h12v12H2V2zm1 1v10h10V3H3zm1 1h8v1H4V4zm0 2h8v1H4V6zm0 2h6v1H4V8z"
      fill="currentColor"
    />
  </svg>
);

const defaultIcons = new Map([
  ['stats-window', <StatsIcon key="stats-icon" />],
]);

export function TopBar({ windowIcons = new Map() }: TopBarProps) {
  const { getMinimizedWindows, restoreWindow } = useWindowManager();
  const minimizedWindows = getMinimizedWindows();

  if (minimizedWindows.length === 0) {
    return null;
  }

  // Merge default icons with provided icons
  const allIcons = new Map([...defaultIcons, ...windowIcons]);

  return (
    <div className="game-topbar">
      {minimizedWindows.map((window) => (
        <button
          key={window.id}
          className="game-topbar-item"
          onClick={() => restoreWindow(window.id)}
          title={window.title}
        >
          {allIcons.get(window.id) || <span className="game-topbar-icon-default">📊</span>}
        </button>
      ))}
    </div>
  );
}
