import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';
import { STARFIELD_LAYERS, STARS_PER_LAYER } from '@shared/constants';
import type { Star } from '@shared/types';

interface StarfieldProps {
  app: Application;
  speed?: number;
}

export function Starfield({ app, speed = 0.5 }: StarfieldProps) {
  const starsRef = useRef<Star[][]>([]);
  const containersRef = useRef<Container[]>([]);

  useEffect(() => {
    if (!app) return;

    // Create layers for parallax effect
    const layers: Container[] = [];
    const stars: Star[][] = [];

    for (let layer = 0; layer < STARFIELD_LAYERS; layer++) {
      const container = new Container();
      app.stage.addChild(container);
      layers.push(container);

      const layerStars: Star[] = [];
      const layerZ = layer + 1; // Depth value

      // Create stars for this layer
      for (let i = 0; i < STARS_PER_LAYER; i++) {
        const star = new Graphics();
        const size = Math.random() * 2 + 0.5;
        const brightness = Math.random() * 0.5 + 0.5;

        const x = Math.random() * app.screen.width;
        const y = Math.random() * app.screen.height;

        // Draw circle at (0,0) relative to Graphics object, then position the Graphics object
        star.circle(0, 0, size);
        star.fill({ color: 0xffffff, alpha: brightness });

        star.x = x;
        star.y = y;

        container.addChild(star);
        layerStars.push({
          x,
          y,
          z: layerZ,
          size,
        });
      }

      stars.push(layerStars);
    }

    starsRef.current = stars;
    containersRef.current = layers;

    // Animation ticker
    const tickerCallback = (ticker: any) => {
      const delta = ticker.deltaTime;
      for (let layer = 0; layer < STARFIELD_LAYERS; layer++) {
        const container = containersRef.current[layer];
        const layerStars = starsRef.current[layer];
        const layerSpeed = (layer + 1) * 0.3 * speed;

        for (let i = 0; i < layerStars.length; i++) {
          const starData = layerStars[i];
          const star = container.children[i] as Graphics;

          // Move star down
          starData.y += layerSpeed * delta;

          // Wrap around when star goes off screen
          if (starData.y > app.screen.height) {
            starData.y = 0;
            starData.x = Math.random() * app.screen.width;
          }

          star.x = starData.x;
          star.y = starData.y;
        }
      }
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      layers.forEach((container) => {
        container.destroy({ children: true });
        app.stage.removeChild(container);
      });
    };
  }, [app, speed]);

  return null;
}

