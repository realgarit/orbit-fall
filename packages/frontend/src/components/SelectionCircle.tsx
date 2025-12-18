import { useEffect, useRef } from 'react';
import { Application, Graphics, Container } from 'pixi.js';

interface SelectionCircleProps {
  app: Application;
  cameraContainer: Container;
  position: { x: number; y: number };
  selected: boolean;
  inCombat: boolean;
  radius?: number;
}

export function SelectionCircle({
  app,
  cameraContainer,
  position,
  selected,
  inCombat,
  radius = 30,
}: SelectionCircleProps) {
  const circleRef = useRef<Graphics | null>(null);
  const positionRef = useRef(position);
  const selectedRef = useRef(selected);
  const inCombatRef = useRef(inCombat);

  useEffect(() => {
    positionRef.current = position;
    selectedRef.current = selected;
    inCombatRef.current = inCombat;
  }, [position, selected, inCombat]);

  useEffect(() => {
    if (!app) return;

    const circle = new Graphics();
    cameraContainer.addChild(circle);
    circleRef.current = circle;

    const updateCircle = () => {
      const circle = circleRef.current;
      if (!circle) return;

      circle.clear();

      const pos = positionRef.current;
      const isSelected = selectedRef.current;
      const isInCombat = inCombatRef.current;

      if (!isSelected && !isInCombat) {
        circle.visible = false;
        return;
      }

      circle.visible = true;

      if (isInCombat) {
        // Red combat circle (thicker)
        circle.circle(pos.x, pos.y, radius);
        circle.stroke({ color: 0xff0000, width: 3 });
      } else if (isSelected) {
        // White selection circle (thin)
        circle.circle(pos.x, pos.y, radius);
        circle.stroke({ color: 0xffffff, width: 1 });
      }
    };

    // Initial render
    updateCircle();

    // Update on ticker
    const tickerCallback = () => {
      updateCircle();
    };

    app.ticker.add(tickerCallback);

    return () => {
      app.ticker.remove(tickerCallback);
      if (circleRef.current) {
        cameraContainer.removeChild(circleRef.current);
        circleRef.current.destroy();
      }
    };
  }, [app, cameraContainer, radius]);

  return null;
}
