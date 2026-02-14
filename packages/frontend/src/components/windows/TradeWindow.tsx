import { useState } from 'react';
import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';
import { ORE_CONFIG, BASE_SAFETY_ZONE, ORE_REFINING_RECIPES } from '@shared/constants';
import type { OreType } from '@shared/types';
import { Socket } from 'socket.io-client';

export const TradeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M4 6L2 8L4 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M12 6L14 8L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M2 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 8H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
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

export function TradeWindow({ socket }: { socket: Socket }) {
    const [activeTab, setActiveTab] = useState<'trade' | 'refine'>('trade');
    const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
    const restoreWindow = useWindowStore((state) => state.restoreWindow);

    const playerCargo = useGameStore((state) => state.playerCargo);
    const shipPosition = useGameStore((state) => state.shipPosition);
    const sellOre = useGameStore((state) => state.sellOre);
    const sellAllOres = useGameStore((state) => state.sellAllOres);
    const refineOre = useGameStore((state) => state.refineOre);

    const isInSafetyZone = () => {
        const dx = shipPosition.x - BASE_SAFETY_ZONE.POSITION.x;
        const dy = shipPosition.y - BASE_SAFETY_ZONE.POSITION.y;
        return Math.sqrt(dx * dx + dy * dy) < BASE_SAFETY_ZONE.RADIUS;
    };

    const inBase = isInSafetyZone();
    const formatNumber = (num: number): string => num.toLocaleString();
    const tradeableOres = (Object.entries(playerCargo) as [OreType, number][]).filter(([type]) => (ORE_CONFIG as any)[type.toUpperCase()]?.resaleValue !== undefined);
    const totalCargoValue = tradeableOres.reduce((sum, [type, amount]) => sum + (amount * ((ORE_CONFIG as any)[type.toUpperCase()]?.resaleValue || 0)), 0);

    const renderTradeTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
            {!inBase && (
                <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', padding: '8px', color: '#ef4444', fontSize: '11px', textAlign: 'center' }}>
                    Trading system only available at Home Base
                </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', overflowY: 'auto' }}>
                {tradeableOres.map(([type, amount]) => {
                    const config = (ORE_CONFIG as any)[type.toUpperCase()];
                    const color = config?.color || 0xffffff;
                    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
                    return (
                        <div key={type} style={{ background: 'rgba(30, 58, 95, 0.4)', border: `1px solid ${amount > 0 ? 'rgba(255,255,255,0.1)' : '#334155'}`, borderRadius: '4px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '10px', opacity: amount > 0 ? 1 : 0.6 }}>
                            <div style={{ width: '8px', height: '8px', backgroundColor: colorHex, borderRadius: '50%', boxShadow: `0 0 6px ${colorHex}` }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', color: '#fff' }}>{type}</div>
                                <div style={{ fontSize: '10px', color: '#94a3b8' }}>Value: <span style={{ color: '#fbbf24' }}>{config?.resaleValue} C</span></div>
                            </div>
                            <div style={{ textAlign: 'right', marginRight: '8px' }}><div style={{ fontSize: '12px', fontWeight: 'bold', color: amount > 0 ? '#fff' : '#64748b' }}>{formatNumber(amount)}</div></div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <button onClick={() => sellOre(type, 1, socket)} disabled={!inBase || amount <= 0} style={{ ...buttonStyle, opacity: (!inBase || amount <= 0) ? 0.4 : 1, cursor: (!inBase || amount <= 0) ? 'not-allowed' : 'pointer' }}>Sell 1</button>
                                <button onClick={() => sellOre(type, amount, socket)} disabled={!inBase || amount <= 0} style={{ ...buttonStyle, opacity: (!inBase || amount <= 0) ? 0.4 : 1, cursor: (!inBase || amount <= 0) ? 'not-allowed' : 'pointer' }}>All</button>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div style={{ marginTop: 'auto', padding: '10px', background: 'rgba(15, 23, 42, 0.6)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div><div style={{ fontSize: '9px', color: '#94a3b8' }}>Total Cargo Value</div><div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fbbf24' }}>{formatNumber(totalCargoValue)} Credits</div></div>
                <button onClick={() => sellAllOres(socket)} disabled={!inBase || totalCargoValue <= 0} style={{ ...buttonStyle, padding: '8px 8px', fontSize: '12px', flex: '0 0 auto', minWidth: 'auto', opacity: (!inBase || totalCargoValue <= 0) ? 0.4 : 1, cursor: (!inBase || totalCargoValue <= 0) ? 'not-allowed' : 'pointer' }}>SELL ALL</button>
            </div>
        </div>
    );

    const renderRefineTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
            {!inBase && <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '4px', padding: '8px', color: '#ef4444', fontSize: '11px', textAlign: 'center' }}>Refining system only available at Home Base</div>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', overflowY: 'auto' }}>
                {Object.entries(ORE_REFINING_RECIPES).map(([recipeKey, recipe]) => {
                    const resultType = recipe.result as OreType;
                    const config = (ORE_CONFIG as any)[resultType.toUpperCase()];
                    const color = config?.color || 0xffffff;
                    const colorHex = `#${color.toString(16).padStart(6, '0')}`;
                    const canRefine = Object.entries(recipe.ingredients).every(([ingName, amount]) => (playerCargo[ingName.charAt(0) + ingName.toLowerCase().slice(1) as OreType] || 0) >= (amount as number)) && inBase;
                    return (
                        <div key={recipeKey} style={{ background: 'rgba(30, 58, 95, 0.4)', border: `1px solid ${canRefine ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`, borderRadius: '4px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '10px', height: '10px', backgroundColor: colorHex, borderRadius: '50%', boxShadow: `0 0 8px ${colorHex}` }} />
                                <div style={{ flex: 1, fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>Refine {resultType}</div>
                                <button onClick={() => refineOre(resultType, socket)} disabled={!canRefine} style={{ ...buttonStyle, padding: '4px 10px', fontSize: '10px', opacity: canRefine ? 1 : 0.4, cursor: canRefine ? 'pointer' : 'not-allowed' }}>Refine</button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.entries(recipe.ingredients).map(([ingName, reqAmount]) => {
                                    const ingType = ingName.charAt(0) + ingName.toLowerCase().slice(1) as OreType;
                                    const owned = playerCargo[ingType] || 0;
                                    const hasEnough = owned >= (reqAmount as number);
                                    const ingColor = (ORE_CONFIG as any)[ingName.toUpperCase()]?.color || 0xffffff;
                                    return <div key={ingName} style={{ fontSize: '10px', color: hasEnough ? '#fff' : '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: '10px' }}><div style={{ width: '4px', height: '4px', background: `#${ingColor.toString(16).padStart(6, '0')}`, borderRadius: '50%' }} />{owned}/{reqAmount} {ingType}</div>;
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Window id="trade-window" title="Trade & Refining" icon={<TradeIcon />} initialX={320} initialY={400} initialWidth={380} initialHeight={450} onMinimize={minimizeWindow} onRestore={restoreWindow}>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '12px' }}>
                <div className="settings-tabs">
                    <button onClick={() => setActiveTab('trade')} className={`settings-tab ${activeTab === 'trade' ? 'active' : ''}`}>Sell</button>
                    <button onClick={() => setActiveTab('refine')} className={`settings-tab ${activeTab === 'refine' ? 'active' : ''}`}>Refine</button>
                </div>
                <div className="settings-tab-content">{activeTab === 'trade' ? renderTradeTab() : renderRefineTab()}</div>
            </div>
        </Window>
    );
}
