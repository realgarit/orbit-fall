import { useState } from 'react';
import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';
import { ORE_CONFIG, BASE_SAFETY_ZONE, ORE_REFINING_RECIPES } from '@shared/constants';
import type { OreType } from '@shared/types';

export const TradeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Exchange/Trade arrows - two curved arrows pointing in opposite directions */}
        <path
            d="M4 6L2 8L4 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path
            d="M12 6L14 8L12 10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />
        <path
            d="M2 8H6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
        <path
            d="M10 8H14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
        {/* Center circle representing exchange point */}
        <circle cx="8" cy="8" r="1.5" fill="currentColor" />
    </svg>
);

export function TradeWindow() {
    const [activeTab, setActiveTab] = useState<'trade' | 'refine'>('trade');
    const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
    const restoreWindow = useWindowStore((state) => state.restoreWindow);

    const playerCargo = useGameStore((state) => state.playerCargo);
    const shipPosition = useGameStore((state) => state.shipPosition);
    const sellOre = useGameStore((state) => state.sellOre);
    const sellAllOres = useGameStore((state) => state.sellAllOres);
    const refineOre = useGameStore((state) => state.refineOre);

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

    const renderTradeTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
            {!inBase && (activeTab === 'trade' || activeTab === 'refine') && (
                <div style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    padding: '8px',
                    color: '#ef4444',
                    fontSize: '11px',
                    textAlign: 'center'
                }}>
                    Trading system only available at Home Base
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', overflowY: 'auto' }}>
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
    );

    const renderRefineTab = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
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
                    Refining system only available at Home Base
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', overflowY: 'auto' }}>
                {Object.entries(ORE_REFINING_RECIPES).map(([recipeKey, recipe]) => {
                    const resultType = recipe.result as OreType;
                    const config = (ORE_CONFIG as any)[resultType.toUpperCase()];
                    const color = config?.color || 0xffffff;
                    const colorHex = `#${color.toString(16).padStart(6, '0')}`;

                    const canRefine = Object.entries(recipe.ingredients).every(([ingName, amount]) => {
                        const ingType = ingName.charAt(0) + ingName.toLowerCase().slice(1) as OreType;
                        return (playerCargo[ingType] || 0) >= amount;
                    }) && inBase;

                    return (
                        <div
                            key={recipeKey}
                            style={{
                                background: 'rgba(30, 58, 95, 0.4)',
                                border: `1px solid ${canRefine ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                                borderRadius: '4px',
                                padding: '10px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div
                                    style={{
                                        width: '10px',
                                        height: '10px',
                                        backgroundColor: colorHex,
                                        borderRadius: '50%',
                                        boxShadow: `0 0 8px ${colorHex}`,
                                    }}
                                />
                                <div style={{ flex: 1, fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                                    Refine {resultType}
                                </div>
                                <button
                                    onClick={() => refineOre(resultType)}
                                    disabled={!canRefine}
                                    className="game-button"
                                    style={{
                                        padding: '4px 10px',
                                        fontSize: '10px',
                                        background: canRefine ? 'linear-gradient(to bottom, #10b981, #059669)' : '#334155',
                                        borderColor: canRefine ? '#10b981' : '#475569',
                                        opacity: canRefine ? 1 : 0.4
                                    }}
                                >
                                    Refine
                                </button>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {Object.entries(recipe.ingredients).map(([ingName, reqAmount]) => {
                                    const ingType = ingName.charAt(0) + ingName.toLowerCase().slice(1) as OreType;
                                    const owned = playerCargo[ingType] || 0;
                                    const hasEnough = owned >= reqAmount;
                                    const ingConfig = (ORE_CONFIG as any)[ingName.toUpperCase()];
                                    const ingColor = ingConfig?.color || 0xffffff;
                                    const ingHex = `#${ingColor.toString(16).padStart(6, '0')}`;

                                    return (
                                        <div
                                            key={ingName}
                                            style={{
                                                fontSize: '10px',
                                                color: hasEnough ? '#fff' : '#ef4444',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                background: 'rgba(0,0,0,0.2)',
                                                padding: '2px 6px',
                                                borderRadius: '10px'
                                            }}
                                        >
                                            <div style={{ width: '4px', height: '4px', background: ingHex, borderRadius: '50%' }} />
                                            {owned}/{reqAmount} {ingType}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    return (
        <Window
            id="trade-window"
            title="Trade & Refining"
            icon={<TradeIcon />}
            initialX={320}
            initialY={400}
            initialWidth={380}
            initialHeight={450}
            onMinimize={minimizeWindow}
            onRestore={restoreWindow}
        >
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '8px', padding: '12px' }}>
                <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>
                    <button
                        onClick={() => setActiveTab('trade')}
                        className={`game-button ${activeTab === 'trade' ? 'active' : ''}`}
                        style={{
                            flex: 1,
                            background: activeTab === 'trade' ? 'rgba(30, 58, 95, 0.8)' : 'transparent',
                            border: 'none',
                            fontSize: '11px',
                            padding: '6px'
                        }}
                    >
                        Ore Sales
                    </button>
                    <button
                        onClick={() => setActiveTab('refine')}
                        className={`game-button ${activeTab === 'refine' ? 'active' : ''}`}
                        style={{
                            flex: 1,
                            background: activeTab === 'refine' ? 'rgba(30, 58, 95, 0.8)' : 'transparent',
                            border: 'none',
                            fontSize: '11px',
                            padding: '6px'
                        }}
                    >
                        Refining
                    </button>
                </div>

                {activeTab === 'trade' ? renderTradeTab() : renderRefineTab()}
            </div>
        </Window>
    );
}
