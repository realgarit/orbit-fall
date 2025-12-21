import React from 'react';
import { useWindowStore } from '../../stores/windowStore';
import { DeathIcon } from './DeathWindow';

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
      d="M2 4h8v1H2V4zm0 3h6v1H2V7zm0 3h7v1H2v-1zm10-6h2v1h-2V4zm0 3h2v1h-2V7zm0 3h2v1h-2v-1z"
      fill="currentColor"
    />
    <circle cx="11" cy="4.5" r="1" fill="currentColor" />
    <circle cx="10" cy="7.5" r="1" fill="currentColor" />
    <circle cx="11" cy="10.5" r="1" fill="currentColor" />
  </svg>
);

// Default icon for ship window
const ShipIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Simple spaceship: triangle pointing up with small base */}
    <path
      d="M8 2L4 12H6L8 10L10 12H12L8 2Z"
      fill="currentColor"
    />
  </svg>
);

const defaultIcons = new Map<string, React.ReactNode>([
  ['stats-window', <StatsIcon key="stats-icon" />],
  ['minimap-window', <MinimapIcon key="minimap-icon" />],
  ['battle-window', <BattleIcon key="battle-icon" />],
  ['settings-window', <SettingsIcon key="settings-icon" />],
  ['ship-window', <ShipIcon key="ship-icon" />],
  ['death-window', <DeathIcon key="death-icon" />],
]);

export function TopBar({ windowIcons = new Map() }: TopBarProps) {
  const restoreWindow = useWindowStore((state) => state.restoreWindow);
  const windows = useWindowStore((state) => state.windows);
  const minimizedWindows = Array.from(windows.values()).filter((w) => w.minimized);

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
