import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';
import { ORE_CONFIG, BASE_SAFETY_ZONE } from '@shared/constants';
import type { OreType } from '@shared/types';

export const TradeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
            d="M3 4H13V5H3V4ZM3 7H13V8H3V7ZM3 10H10V11H3V10ZM12 10V13H13V10H12ZM14 11.5L12.5 13L11 11.5H14Z"
            fill="currentColor"
        />
    </svg>
);

export function TradeWindow() {
    const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
    const restoreWindow = useWindowStore((state) => state.restoreWindow);

    const playerCargo = useGameStore((state) => state.playerCargo);
    const shipPosition = useGameStore((state) => state.shipPosition);
    const sellOre = useGameStore((state) => state.sellOre);
    const sellAllOres = useGameStore((state) => state.sellAllOres);

    // Check if player is in safety zone
    const isInSafetyZone = () => {
        const dx = shipPosition.x - BASE_SAFETY_ZONE.POSITION.x;
        const dy = shipPosition.y - BASE_SAFETY_ZONE.POSITION.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < BASE_SAFETY_ZONE.RADIUS;
    };

    const inBase = isInSafetyZone();

    const formatNumber = (num: number): string => {
        return num.toLocaleString();
    };

    const ores = Object.entries(playerCargo) as [OreType, number][];
    const tradeableOres = ores.filter(([type]) => (ORE_CONFIG as any)[type.toUpperCase()]?.resaleValue !== undefined);

    const totalCargoValue = tradeableOres.reduce((sum, [type, amount]) => {
        const resaleValue = (ORE_CONFIG as any)[type.toUpperCase()]?.resaleValue || 0;
        return sum + (amount * resaleValue);
    }, 0);

    return (
        <Window
            id="trade-window"
            title="Trade"
            icon={<TradeIcon />}
            initialX={320}
            initialY={400}
            initialWidth={350}
            initialHeight={400}
            onMinimize={minimizeWindow}
            onRestore={restoreWindow}
        >
            <div className="stats-window-content" style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px' }}>
                {!inBase && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '4px',
                        padding: '8px',
                        color: '#ef4444',
                        fontSize: '11px',
                        textAlign: 'center'
                    }}>
                        Selling only available at Home Base
                    </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                    {tradeableOres.map(([type, amount]) => {
                        const config = (ORE_CONFIG as any)[type.toUpperCase()];
                        const color = config?.color || 0xffffff;
                        const resaleValue = config?.resaleValue || 0;
                        const colorHex = `#${color.toString(16).padStart(6, '0')}`;

                        return (
                            <div
                                key={type}
                                style={{
                                    background: 'rgba(30, 58, 95, 0.4)',
                                    border: `1px solid ${amount > 0 ? 'rgba(255,255,255,0.1)' : '#334155'}`,
                                    borderRadius: '4px',
                                    padding: '6px 10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    opacity: amount > 0 ? 1 : 0.6
                                }}
                            >
                                <div
                                    style={{
                                        width: '8px',
                                        height: '8px',
                                        backgroundColor: colorHex,
                                        borderRadius: '50%',
                                        boxShadow: `0 0 6px ${colorHex}`,
                                    }}
                                />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '11px', color: '#fff' }}>{type}</div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                                        Value: <span style={{ color: '#fbbf24' }}>{resaleValue} C</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', marginRight: '8px' }}>
                                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: amount > 0 ? '#fff' : '#64748b' }}>
                                        {formatNumber(amount)}
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                    <button
                                        onClick={() => sellOre(type, 1)}
                                        disabled={!inBase || amount <= 0}
                                        className="game-button"
                                        style={{
                                            padding: '2px 6px',
                                            fontSize: '9px',
                                            minWidth: '45px',
                                            height: '24px',
                                            opacity: (!inBase || amount <= 0) ? 0.3 : 1
                                        }}
                                    >
                                        Sell 1
                                    </button>
                                    <button
                                        onClick={() => sellOre(type, amount)}
                                        disabled={!inBase || amount <= 0}
                                        className="game-button"
                                        style={{
                                            padding: '2px 6px',
                                            fontSize: '9px',
                                            minWidth: '45px',
                                            height: '24px',
                                            opacity: (!inBase || amount <= 0) ? 0.3 : 1
                                        }}
                                    >
                                        All
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div style={{
                    marginTop: 'auto',
                    padding: '10px',
                    background: 'rgba(15, 23, 42, 0.6)',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{ fontSize: '9px', color: '#94a3b8' }}>Total Cargo Value</div>
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>
                            {formatNumber(totalCargoValue)} Credits
                        </div>
                    </div>
                    <button
                        onClick={sellAllOres}
                        disabled={!inBase || totalCargoValue <= 0}
                        className="game-button"
                        style={{
                            padding: '6px 12px',
                            background: inBase ? 'linear-gradient(to bottom, #10b981, #059669)' : '#334155',
                            borderColor: inBase ? '#10b981' : '#475569',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            opacity: (!inBase || totalCargoValue <= 0) ? 0.5 : 1
                        }}
                    >
                        SELL ALL
                    </button>
                </div>
            </div>
        </Window>
    );
}
