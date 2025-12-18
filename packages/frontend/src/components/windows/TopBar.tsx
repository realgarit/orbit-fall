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

// Default icon for minimap window
const MinimapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 2h12v12H2V2zm1 1v10h10V3H3zm8 2l-2 4-2-2-2 3v3h8V5h-2z"
      fill="currentColor"
    />
  </svg>
);

// Default icon for battle window
const BattleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Crosshair/Target icon for battle */}
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1" fill="none" />
    <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="1.5" />
    <line x1="8" y1="10" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5" />
    <line x1="2" y1="8" x2="6" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="8" cy="8" r="1" fill="currentColor" />
  </svg>
);

// Default icon for settings window
const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 0.5L9.5 2.5L9 4.5L11 5L11.5 7L13.5 7.5L11.5 8.5L12 10.5L10 12L8 11.5L6 12L4 10.5L4.5 8.5L2.5 7.5L4.5 7L5 5L7 4.5L6.5 2.5L8 0.5ZM8 5C6.3 5 5 6.3 5 8C5 9.7 6.3 11 8 11C9.7 11 11 9.7 11 8C11 6.3 9.7 5 8 5Z"
      fill="currentColor"
      fillRule="evenodd"
    />
    <circle cx="8" cy="8" r="1.5" fill="currentColor" />
  </svg>
);

const defaultIcons = new Map<string, React.ReactNode>([
  ['stats-window', <StatsIcon key="stats-icon" />],
  ['minimap-window', <MinimapIcon key="minimap-icon" />],
  ['battle-window', <BattleIcon key="battle-icon" />],
  ['settings-window', <SettingsIcon key="settings-icon" />],
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
