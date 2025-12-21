import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';
import { ORE_CONFIG } from '@shared/constants';
import type { OreType } from '@shared/types';

const OreIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M8 2L3 7L8 14L13 7L8 2Z"
            fill="currentColor"
        />
        <path
            d="M8 2L6 7L8 10L10 7L8 2Z"
            fill="rgba(255,255,255,0.3)"
        />
    </svg>
);

export function OreWindow() {
    const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
    const restoreWindow = useWindowStore((state) => state.restoreWindow);

    const playerCargo = useGameStore((state) => state.playerCargo);

    // Format number with thousands separator
    const formatNumber = (num: number): string => {
        return num.toLocaleString();
    };

    const ores = Object.entries(playerCargo) as [OreType, number][];

    return (
        <Window
            id="ore-window"
            title="Ore"
            icon={<OreIcon />}
            initialX={320}
            initialY={60}
            initialWidth={300}
            initialHeight={320}
            onMinimize={minimizeWindow}
            onRestore={restoreWindow}
        >
            <div className="stats-window-content" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', padding: '4px' }}>
                {ores.map(([type, amount]) => {
                    const config = (ORE_CONFIG as any)[type.toUpperCase()];
                    const color = config?.color || 0xffffff;
                    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

                    return (
                        <div
                            key={type}
                            style={{
                                background: 'rgba(30, 58, 95, 0.4)',
                                border: `1px solid ${amount > 0 ? colorHex : '#334155'}`,
                                borderRadius: '4px',
                                padding: '8px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                                transition: 'all 0.2s ease',
                                opacity: amount > 0 ? 1 : 0.6,
                                boxShadow: amount > 0 ? `inset 0 0 10px ${colorHex}22` : 'none',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <div
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: colorHex,
                                        borderRadius: '50%',
                                        boxShadow: `0 0 6px ${colorHex}`,
                                        flexShrink: 0
                                    }}
                                />
                                <div className="stats-label" style={{ fontSize: '10px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {type}
                                </div>
                            </div>
                            <div className="stats-value" style={{ fontSize: '14px', textAlign: 'right', fontWeight: 'bold', color: amount > 0 ? '#fff' : '#64748b' }}>
                                {formatNumber(amount)}
                            </div>
                            {amount > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    bottom: '-5px',
                                    right: '-5px',
                                    width: '20px',
                                    height: '20px',
                                    background: `${colorHex}11`,
                                    borderRadius: '50%',
                                    filter: 'blur(10px)'
                                }} />
                            )}
                        </div>
                    );
                })}

                {ores.length === 0 && (
                    <div style={{ gridColumn: 'span 2', color: '#666', textAlign: 'center', marginTop: '20px', fontSize: '12px' }}>
                        No ores collected yet.
                    </div>
                )}
            </div>
        </Window>
    );
}
