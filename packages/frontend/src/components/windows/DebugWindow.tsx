import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';

export const DebugIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Antennae */}
        <path d="M6 3L5 1.5M10 3l1-1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        {/* Legs */}
        <path d="M3 6h3M3 9h3M3 12h3M10 6h3M10 9h3M10 12h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        {/* Body */}
        <rect x="5.5" y="4.5" width="5" height="9" rx="2.5" fill="currentColor" />
        {/* Head */}
        <circle cx="8" cy="5" r="2" fill="currentColor" stroke="currentColor" strokeWidth="0.5" />
    </svg>
);

export function DebugWindow() {
    const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
    const restoreWindow = useWindowStore((state) => state.restoreWindow);

    // Get state from Zustand
    const shipVelocity = useGameStore((state) => state.shipVelocity);
    const shipPosition = useGameStore((state) => state.shipPosition);
    const fps = useGameStore((state) => state.fps);

    const speed = Math.sqrt(shipVelocity.vx * shipVelocity.vx + shipVelocity.vy * shipVelocity.vy);

    return (
        <Window
            id="debug-window"
            title="Debug"
            icon={<DebugIcon />}
            initialX={310}
            initialY={60}
            initialWidth={280}
            initialHeight={300}
            onMinimize={minimizeWindow}
            onRestore={restoreWindow}
        >
            <div className="stats-window-content">
                <div className="stats-section">
                    <div className="stats-label">Coordinates</div>
                    <div className="stats-value">
                        X: {Math.round(shipPosition.x)}, Y: {Math.round(shipPosition.y)}
                    </div>
                </div>

                <div className="stats-section">
                    <div className="stats-label">Speed</div>
                    <div className="stats-value">
                        {speed.toFixed(2)}
                    </div>
                </div>

                <div className="stats-section">
                    <div className="stats-label">Velocity</div>
                    <div className="stats-value" style={{ fontSize: '11px' }}>
                        X: {shipVelocity.vx.toFixed(2)}, Y: {shipVelocity.vy.toFixed(2)}
                    </div>
                </div>

                <div className="stats-section">
                    <div className="stats-label">FPS</div>
                    <div className="stats-value">
                        {fps.toFixed(0)}
                    </div>
                </div>
            </div>
        </Window>
    );
}
