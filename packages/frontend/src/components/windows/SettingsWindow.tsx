import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';

interface SettingsWindowProps {
  windowId?: string;
}

const SettingsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 0.5L9.2 2.8L11.5 2.5L12 4.8L14 5.8L12 6.8L11.5 9.2L9.2 8.9L8 11.2L6.8 8.9L4.5 9.2L4 6.8L2 5.8L4 4.8L4.5 2.5L6.8 2.8L8 0.5ZM8 4.5C6.1 4.5 4.5 6.1 4.5 8C4.5 9.9 6.1 11.5 8 11.5C9.9 11.5 11.5 9.9 11.5 8C11.5 6.1 9.9 4.5 8 4.5Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
);

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  marginTop: '8px',
  background: 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)',
  border: '1px solid #0ea5e9',
  borderRadius: '4px',
  color: '#e0e7ff',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
  transition: 'all 0.15s ease',
};

export function SettingsWindow({
  windowId = 'settings-window',
}: SettingsWindowProps) {
  const { minimizeWindow, restoreWindow, resetWindow } = useWindowManager();

  const handleResetWindow = (id: string) => {
    resetWindow(id);
    // Force a re-render by reloading the page
    window.location.reload();
  };

  const handleResetAll = () => {
    const windowIds = ['stats-window', 'battle-window', 'minimap-window', 'settings-window'];
    windowIds.forEach(id => resetWindow(id));
    window.location.reload();
  };

  const createButton = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)';
        e.currentTarget.style.borderColor = '#06b6d4';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)';
        e.currentTarget.style.borderColor = '#0ea5e9';
      }}
    >
      {label}
    </button>
  );

  return (
    <Window
      id={windowId}
      title="Settings"
      icon={<SettingsIcon />}
      initialX={620}
      initialY={60}
      initialWidth={280}
      initialHeight={320}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="stats-window-content">
        <div className="stats-section">
          <div className="stats-label">Window Management</div>
          {createButton('Reset All Windows', handleResetAll)}
          {createButton('Reset Stats Window', () => handleResetWindow('stats-window'))}
          {createButton('Reset Battle Window', () => handleResetWindow('battle-window'))}
          {createButton('Reset Minimap Window', () => handleResetWindow('minimap-window'))}
          {createButton('Reset Settings Window', () => handleResetWindow('settings-window'))}
        </div>
      </div>
    </Window>
  );
}
