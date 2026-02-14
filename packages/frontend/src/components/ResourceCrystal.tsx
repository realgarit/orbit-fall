import { useEffect, useRef, memo } from 'react';
import { Application, Sprite, Container, Graphics } from 'pixi.js';
import type { OreState } from '@shared/types';
import { ORE_CONFIG } from '@shared/constants';

interface ResourceCrystalProps {
    app: Application;
    cameraContainer: Container;
    oreState: OreState;
    isCollecting?: boolean;
}

export const ResourceCrystal = memo(function ResourceCrystal({ app, cameraContainer, oreState, isCollecting = false }: ResourceCrystalProps) {
    const crystalRef = useRef<Sprite | Graphics | null>(null);
    const glowRef = useRef<Graphics | null>(null);
    const containerRef = useRef<Container | null>(null);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!app || !cameraContainer) return;

        const container = new Container();
        container.x = oreState.x;
        container.y = oreState.y;
        cameraContainer.addChild(container);
        containerRef.current = container;

        const config = (ORE_CONFIG as any)[oreState.type.toUpperCase()];
        const color = config?.color || 0xffffff;
        const isLarge = oreState.size === 'large';

        // 1. Glow effect
        const glow = new Graphics();
        glow.circle(0, 0, isLarge ? 40 : 25);
        glow.fill({ color, alpha: 0.3 });
        container.addChild(glow);
        glowRef.current = glow;

        // 2. Programmatic Ore Rendering
        const drawOre = () => {
            const graphics = new Graphics();
            const baseSize = isLarge ? 20 : 12;
            const points: { x: number; y: number }[] = [];
            const segments = 6 + Math.floor(Math.random() * 4); // 6-9 sides

            // Generate irregular polygon points
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const distance = baseSize * (0.8 + Math.random() * 0.4);
                points.push({
                    x: Math.cos(angle) * distance,
                    y: Math.sin(angle) * distance
                });
            }

            // Draw main body
            graphics.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x, points[i].y);
            }
            graphics.closePath();
            graphics.fill({ color, alpha: 0.9 });

            // Add some "facets" or highlights for texture
            const highlightColor = 0xffffff;
            for (let i = 0; i < 3; i++) {
                const p1 = points[Math.floor(Math.random() * points.length)];
                const p2 = points[Math.floor(Math.random() * points.length)];
                graphics.moveTo(0, 0);
                graphics.lineTo(p1.x, p1.y);
                graphics.lineTo(p2.x, p2.y);
                graphics.closePath();
                graphics.fill({ color: highlightColor, alpha: 0.15 });
            }

            // Darker underside/shadow
            graphics.stroke({ color: 0x000000, width: 1.5, alpha: 0.4 });

            // Outer glow/shine line
            graphics.stroke({ color: highlightColor, width: 0.5, alpha: 0.3 });

            container.addChild(graphics);
            crystalRef.current = graphics;
        };

        drawOre();

        const tickerCallback = (ticker: any) => {
            const now = Date.now();
            const elapsed = (now - startTimeRef.current) / 1000;

            // Pulsing glow
            if (glowRef.current) {
                glowRef.current.alpha = 0.2 + Math.sin(elapsed * 2.5) * 0.15;
                glowRef.current.scale.set(1 + Math.sin(elapsed * 1.5) * 0.05);
            }

            // Floating animation
            if (crystalRef.current) {
                crystalRef.current.y = Math.sin(elapsed * 2) * 4;
                crystalRef.current.rotation += 0.005 * ticker.deltaTime;
            }

            // Collection "abduction" effect
            if (isCollecting && containerRef.current) {
                containerRef.current.y -= 10 * ticker.deltaTime;
                containerRef.current.scale.set(Math.max(0, containerRef.current.scale.x - 0.15 * ticker.deltaTime));
                containerRef.current.alpha -= 0.2 * ticker.deltaTime;
            }
        };

        if (!app?.ticker) return;
        app.ticker.add(tickerCallback);

        return () => {
            if (app?.ticker) {
                app.ticker.remove(tickerCallback);
            }
            if (containerRef.current) {
                cameraContainer.removeChild(containerRef.current);
                containerRef.current.destroy({ children: true });
            }
        };
    }, [app, cameraContainer, oreState.id, isCollecting]);

    return null;
});
