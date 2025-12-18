import { useState } from 'react';
import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';

interface SettingsWindowProps {
  windowId?: string;
}

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

const buttonStyle: React.CSSProperties = {
  padding: '6px 10px',
  background: 'linear-gradient(180deg, #1e40af 0%, #1e3a8a 100%)',
  border: '1px solid #0ea5e9',
  borderRadius: '4px',
  color: '#e0e7ff',
  cursor: 'pointer',
  fontSize: '11px',
  fontWeight: 600,
  transition: 'all 0.15s ease',
  flex: '1 1 auto',
  minWidth: 0,
};

const primaryButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  width: '100%',
  padding: '8px 12px',
  fontSize: '12px',
  marginBottom: '12px',
};

export function SettingsWindow({
  windowId = 'settings-window',
}: SettingsWindowProps) {
  const { minimizeWindow, restoreWindow, resetWindow } = useWindowManager();
  const [activeTab, setActiveTab] = useState<'windows' | 'general'>('windows');

  const handleResetWindow = (id: string) => {
    resetWindow(id);
    // Force a re-render by reloading the page
    window.location.reload();
  };

  const handleResetAll = () => {
    const windowIds = ['ship-window', 'stats-window', 'battle-window', 'minimap-window', 'settings-window'];
    windowIds.forEach(id => resetWindow(id));
    window.location.reload();
  };

  const createButton = (label: string, onClick: () => void, style: React.CSSProperties = buttonStyle) => (
    <button
      onClick={onClick}
      style={style}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'linear-gradient(180deg, #2563eb 0%, #1e40af 100%)';
        e.currentTarget.style.borderColor = '#06b6d4';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = style.background as string;
        e.currentTarget.style.borderColor = style.border as string;
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
      initialHeight={280}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div className="settings-window-content">
        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button
            className={`settings-tab ${activeTab === 'windows' ? 'active' : ''}`}
            onClick={() => setActiveTab('windows')}
          >
            Windows
          </button>
        </div>

        <div className="settings-tab-content">
          {activeTab === 'windows' && (
            <div className="settings-section">
              {createButton('Reset All Windows', handleResetAll, primaryButtonStyle)}
              <div className="settings-label">Individual Windows</div>
              <div className="settings-button-grid">
                {createButton('Ship', () => handleResetWindow('ship-window'))}
                {createButton('Stats', () => handleResetWindow('stats-window'))}
                {createButton('Battle', () => handleResetWindow('battle-window'))}
                {createButton('Minimap', () => handleResetWindow('minimap-window'))}
                {createButton('Settings', () => handleResetWindow('settings-window'))}
              </div>
            </div>
          )}

          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="settings-empty">No general settings yet.</div>
            </div>
          )}
        </div>
      </div>
    </Window>
  );
}
