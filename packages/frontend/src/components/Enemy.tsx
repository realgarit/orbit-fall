import { useEffect, useRef, memo } from 'react';
import { Application, Graphics, Container, Text } from 'pixi.js';
import { ENEMY_STATS } from '@shared/constants';
import type { EnemyState } from '@shared/types';

interface EnemyProps {
  app: Application;
  cameraContainer: Container;
  enemyState: EnemyState | null;
  isDead?: boolean;
}

export const Enemy = memo(function Enemy({ app, cameraContainer, enemyState, isDead = false }: EnemyProps) {
  const enemyRef = useRef<Container | null>(null);
  const nameTextRef = useRef<Text | null>(null);
  const targetRef = useRef<{ x: number; y: number; rotation: number }>({ x: 0, y: 0, rotation: 0 });

  useEffect(() => {
    if (enemyState) {
      targetRef.current = {
        x: enemyState.x,
        y: enemyState.y,
        rotation: enemyState.rotation || 0
      };
    }
  }, [enemyState]);

  useEffect(() => {
    if (!app || !cameraContainer) return;

    // Create enemy ship container
    const enemy = new Container();
    const enemyBody = new Graphics();
    const engineGlow = new Graphics();

    enemy.addChild(engineGlow);
    enemy.addChild(enemyBody);

    const drawEnemyBody = (g: Graphics) => {
      g.clear();
      g.ellipse(-14, 2, 6, 12); g.fill(0x333333);
      g.ellipse(14, 2, 6, 12); g.fill(0x333333);
      g.moveTo(0, -22); 
      g.bezierCurveTo(-15, -15, -18, 5, -10, 15); g.lineTo(0, 10); g.lineTo(10, 15);
      g.bezierCurveTo(18, 5, 15, -15, 0, -22); g.fill(0x8b0000);
      g.moveTo(0, -18); g.lineTo(-8, -5); g.lineTo(-6, 5); g.lineTo(0, 0); g.lineTo(6, 5); g.lineTo(8, -5); g.lineTo(0, -18);
      g.fill({ color: 0xff4d4d, alpha: 0.4 });
      g.ellipse(0, -10, 5, 3); g.fill({ color: 0xffcc00, alpha: 0.9 });
      g.rect(-17, 10, 6, 4); g.fill(0x1a1a1a);
      g.rect(11, 10, 6, 4); g.fill(0x1a1a1a);
    };

    drawEnemyBody(enemyBody);
    cameraContainer.addChild(enemy);
    enemyRef.current = enemy;

    const nameText = new Text({
      text: ENEMY_STATS.DRIFTER.NAME,
      style: {
        fontFamily: 'Verdana, Arial, sans-serif',
        fontSize: 14,
        fontWeight: 'bold',
        fill: 0xff3333,
        align: 'center',
      },
    });
    nameText.anchor.set(0.5, 0);
    cameraContainer.addChild(nameText);
    nameTextRef.current = nameText;

    const tickerCallback = (ticker: any) => {
      if (!enemyRef.current || !nameTextRef.current || isDead) {
        if (enemyRef.current) enemyRef.current.visible = false;
        if (nameTextRef.current) nameTextRef.current.visible = false;
        return;
      }

      enemyRef.current.visible = true;
      nameTextRef.current.visible = true;

      // Smooth Interpolation
      const lerpFactor = 0.1;
      enemyRef.current.x += (targetRef.current.x - enemyRef.current.x) * lerpFactor;
      enemyRef.current.y += (targetRef.current.y - enemyRef.current.y) * lerpFactor;

      let diff = targetRef.current.rotation - enemyRef.current.rotation;
      while (diff > Math.PI) diff -= 2 * Math.PI;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      enemyRef.current.rotation += diff * lerpFactor;

      // Sync name tag
      nameTextRef.current.x = enemyRef.current.x;
      nameTextRef.current.y = enemyRef.current.y + 35;

      // Engine glow
      engineGlow.clear();
      const flicker = Math.random() * 0.3 + 0.7;
      engineGlow.circle(-14, 14, 6 * flicker);
      engineGlow.fill({ color: 0xff4400, alpha: 0.4 * flicker });
      engineGlow.circle(14, 14, 6 * flicker);
      engineGlow.fill({ color: 0xff4400, alpha: 0.4 * flicker });
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (enemyRef.current) cameraContainer.removeChild(enemyRef.current);
      if (nameTextRef.current) cameraContainer.removeChild(nameTextRef.current);
    };
  }, [app, cameraContainer, isDead]);

  return null;
});
