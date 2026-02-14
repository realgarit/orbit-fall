import { useEffect, useRef, memo } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import type { BonusBoxState } from '@shared/types';

interface BonusBoxProps {
    app: Application;
    cameraContainer: Container;
    boxState: BonusBoxState;
    isCollecting?: boolean;
}

export const BonusBox = memo(function BonusBox({ app, cameraContainer, boxState, isCollecting = false }: BonusBoxProps) {
    const boxRef = useRef<Graphics | null>(null);
    const glowRef = useRef<Graphics | null>(null);
    const containerRef = useRef<Container | null>(null);
    const startTimeRef = useRef(Date.now());

    useEffect(() => {
        if (!app || !cameraContainer) return;

        const container = new Container();
        container.x = boxState.x;
        container.y = boxState.y;
        cameraContainer.addChild(container);
        containerRef.current = container;

        // 1. Blue/Violet Glow (Bottom layer)
        const glow = new Graphics();
        glow.circle(0, 0, 25);
        glow.fill({ color: 0x8a2be2, alpha: 0.4 }); // Blue-violet
        glow.circle(0, 0, 15);
        glow.fill({ color: 0x4169e1, alpha: 0.6 }); // Royal blue
        container.addChild(glow);
        glowRef.current = glow;

        // 2. Square Box (Top layer)
        const box = new Graphics();
        const size = 12;

        // Yellow square
        box.rect(-size / 2, -size / 2, size, size);
        box.fill(0xffffcc); // Very light yellow/white
        box.stroke({ color: 0xffff00, width: 1 }); // Pure yellow border

        // Orange corner edges
        const cornerSize = 4;
        // Top-left
        box.moveTo(-size / 2, -size / 2 + cornerSize);
        box.lineTo(-size / 2, -size / 2);
        box.lineTo(-size / 2 + cornerSize, -size / 2);
        // Top-right
        box.moveTo(size / 2 - cornerSize, -size / 2);
        box.lineTo(size / 2, -size / 2);
        box.lineTo(size / 2, -size / 2 + cornerSize);
        // Bottom-right
        box.moveTo(size / 2, size / 2 - cornerSize);
        box.lineTo(size / 2, size / 2);
        box.lineTo(size / 2 - cornerSize, size / 2);
        // Bottom-left
        box.moveTo(-size / 2 + cornerSize, size / 2);
        box.lineTo(-size / 2, size / 2);
        box.lineTo(-size / 2, size / 2 - cornerSize);

        box.stroke({ color: 0xffa500, width: 2 }); // Orange

        container.addChild(box);
        boxRef.current = box;

        const tickerCallback = (ticker: any) => {
            const now = Date.now();
            const elapsed = (now - startTimeRef.current) / 1000;

            // Pulsing glow
            if (glowRef.current) {
                glowRef.current.alpha = 0.4 + Math.sin(elapsed * 3) * 0.2;
                glowRef.current.scale.set(1 + Math.sin(elapsed * 2) * 0.1);
            }

            // Floating box animation
            if (boxRef.current) {
                boxRef.current.y = Math.sin(elapsed * 2) * 3;
                boxRef.current.rotation += 0.01 * ticker.deltaTime;
            }

            // Collection "abduction" effect
            if (isCollecting && containerRef.current) {
                // Move upwards and shrink
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
    }, [app, cameraContainer, boxState.id, isCollecting]);

    return null;
});
