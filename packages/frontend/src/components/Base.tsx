import { useEffect, useRef } from 'react';
import { Application, Graphics, Container, Text } from 'pixi.js';

interface BaseProps {
  app: Application;
  cameraContainer: Container;
  position?: { x: number; y: number };
}

export function Base({ app, cameraContainer, position = { x: 0, y: 0 } }: BaseProps) {
  const baseRef = useRef<Graphics | null>(null);
  const nameTextRef = useRef<Text | null>(null);

  useEffect(() => {
    if (!app) return;

    const currentPosition = position || { x: 0, y: 0 };

    // Only create Graphics if it doesn't exist
    if (!baseRef.current) {
      // Create space base visual - hexagonal structure with details
      const base = new Graphics();
      
      // Main hexagonal structure (base platform)
      const radius = 40;
      const sides = 6;
      base.moveTo(radius, 0);
      for (let i = 1; i <= sides; i++) {
        const angle = (i / sides) * Math.PI * 2;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        base.lineTo(x, y);
      }
      base.closePath();
      base.fill(0x2a4a7f); // Dark blue base
      base.stroke({ color: 0x4a9eff, width: 2 }); // Blue border
      
      // Central structure (command center)
      base.circle(0, 0, 25);
      base.fill(0x1a3a5f); // Darker blue center
      base.stroke({ color: 0x4a9eff, width: 2 });
      
      // Add some detail - small structures around the base
      // Top structure
      base.rect(-8, -radius - 8, 16, 12);
      base.fill(0x3a5a8f);
      base.stroke({ color: 0x4a9eff, width: 1 });
      
      // Bottom structure
      base.rect(-8, radius - 4, 16, 12);
      base.fill(0x3a5a8f);
      base.stroke({ color: 0x4a9eff, width: 1 });
      
      // Left structure
      base.rect(-radius - 8, -8, 12, 16);
      base.fill(0x3a5a8f);
      base.stroke({ color: 0x4a9eff, width: 1 });
      
      // Right structure
      base.rect(radius - 4, -8, 12, 16);
      base.fill(0x3a5a8f);
      base.stroke({ color: 0x4a9eff, width: 1 });
      
      // Add some lights/glow effects
      base.circle(-15, -15, 3);
      base.fill({ color: 0x00ff88, alpha: 0.8 }); // Green light
      base.circle(15, -15, 3);
      base.fill({ color: 0x00ff88, alpha: 0.8 });
      base.circle(-15, 15, 3);
      base.fill({ color: 0x00ff88, alpha: 0.8 });
      base.circle(15, 15, 3);
      base.fill({ color: 0x00ff88, alpha: 0.8 });

      base.x = currentPosition.x;
      base.y = currentPosition.y;

      cameraContainer.addChild(base);
      baseRef.current = base;

      // Create name text
      const nameText = new Text({
        text: 'Home Base',
        style: {
          fontFamily: 'Verdana, Arial, sans-serif',
          fontSize: 14,
          fontWeight: 'bold',
          fill: 0x4a9eff, // Blue text
          align: 'center',
        },
      });
      nameText.anchor.set(0.5, 0);
      nameText.x = currentPosition.x;
      nameText.y = currentPosition.y + radius + 15; // Below base
      cameraContainer.addChild(nameText);
      nameTextRef.current = nameText;
    } else {
      // Update position if base already exists
      if (baseRef.current) {
        baseRef.current.x = currentPosition.x;
        baseRef.current.y = currentPosition.y;
      }
      if (nameTextRef.current) {
        const radius = 40;
        nameTextRef.current.x = currentPosition.x;
        nameTextRef.current.y = currentPosition.y + radius + 15;
      }
    }

    return () => {
      if (baseRef.current) {
        cameraContainer.removeChild(baseRef.current);
        baseRef.current.destroy();
        baseRef.current = null;
      }
      if (nameTextRef.current) {
        cameraContainer.removeChild(nameTextRef.current);
        nameTextRef.current.destroy();
        nameTextRef.current = null;
      }
    };
  }, [app, cameraContainer, position?.x, position?.y]);

  return null;
}

