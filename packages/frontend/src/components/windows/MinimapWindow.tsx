import { useEffect, useRef, useState } from 'react';
import { Window } from './Window';
import { useWindowStore } from '../../stores/windowStore';
import { useGameStore } from '../../stores/gameStore';
import { MAP_WIDTH, MAP_HEIGHT, COORDINATE_SCALE } from '@shared/constants';
import { generateMarsBackgroundCanvas } from '../../utils/marsBackgroundCanvas';

interface MinimapWindowProps {
  onTargetChange: (target: { x: number; y: number } | null) => void;
}

const MinimapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 2h12v12H2V2zm1 1v10h10V3H3zm8 2l-2 4-2-2-2 3v3h8V5h-2z"
      fill="currentColor"
    />
  </svg>
);

export function MinimapWindow({ onTargetChange }: MinimapWindowProps) {
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const restoreWindow = useWindowStore((state) => state.restoreWindow);
  const resetWindow = useWindowStore((state) => state.resetWindow);
  const windows = useWindowStore((state) => state.windows);

  // Get state from Zustand
  const playerPosition = useGameStore((state) => state.shipPosition);
  const targetPosition = useGameStore((state) => state.targetPosition);
  const enemyPositions = useGameStore((state) => state.enemyPositions);
  const deadEnemies = useGameStore((state) => state.deadEnemies);
  const enemies = useGameStore((state) => state.enemies);

  // Filter out dead enemies - create array for canvas rendering
  // Convert to array with stringified positions for proper change detection
  const aliveEnemyPositions: { x: number; y: number }[] = [];
  const enemyPositionsKey = Array.from(enemyPositions.entries())
    .filter(([enemyId, position]) => {
      if (!deadEnemies.has(enemyId) && enemies.has(enemyId)) {
        const enemy = enemies.get(enemyId);
        return enemy && enemy.health > 0 && position;
      }
      return false;
    })
    .map(([enemyId, position]) => {
      aliveEnemyPositions.push({ ...position });
      return `${enemyId}:${position.x.toFixed(1)},${position.y.toFixed(1)}`;
    })
    .sort()
    .join('|');

  const basePosition = { x: 200, y: 200 };
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [marsBackgroundImage, setMarsBackgroundImage] = useState<HTMLImageElement | null>(null);

  const windowId = 'minimap-window';

  // Generate Mars background image once
  useEffect(() => {
    const marsCanvas = generateMarsBackgroundCanvas();
    const img = new Image();
    img.onload = () => {
      setMarsBackgroundImage(img);
    };
    img.src = marsCanvas.toDataURL('image/jpeg', 0.8);
  }, []);

  // Reset minimap window if it's off-screen or missing
  useEffect(() => {
    const savedState = windows.get(windowId);
    if (savedState) {
      const isOffScreen =
        savedState.x + savedState.width < -100 ||
        savedState.x > window.innerWidth + 100 ||
        savedState.y + savedState.height < -100 ||
        savedState.y > window.innerHeight + 100;

      if (isOffScreen) {
        resetWindow(windowId);
      }
    }
  }, [windows, resetWindow]);

  // World -> minimap
  const worldToMinimap = (worldX: number, worldY: number, canvasWidth: number, canvasHeight: number) => {
    const scaleX = canvasWidth / MAP_WIDTH;
    const scaleY = canvasHeight / MAP_HEIGHT;
    return {
      x: worldX * scaleX,
      y: worldY * scaleY,
    };
  };

  // Minimap -> world
  const minimapToWorld = (minimapX: number, minimapY: number, canvasWidth: number, canvasHeight: number) => {
    const scaleX = MAP_WIDTH / canvasWidth;
    const scaleY = MAP_HEIGHT / canvasHeight;
    return {
      x: minimapX * scaleX,
      y: minimapY * scaleY,
    };
  };

  const drawMinimap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw Mars background if available
    if (marsBackgroundImage && marsBackgroundImage.complete) {
      ctx.drawImage(marsBackgroundImage, 0, 0, MAP_WIDTH, MAP_HEIGHT, 0, 0, width, height);
    } else {
      // Fallback: black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
    }

    // Border
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Home base - red star (smaller than player circle)
    if (basePosition) {
      const baseMinimap = worldToMinimap(basePosition.x, basePosition.y, width, height);
      ctx.fillStyle = '#ff0000'; // red
      
      // Draw a 5-pointed star
      const starRadius = 5; // A bit bigger
      const innerRadius = starRadius * 0.4;
      const centerX = baseMinimap.x;
      const centerY = baseMinimap.y;
      const spikes = 5;
      
      ctx.beginPath();
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? starRadius : innerRadius;
        const angle = (i * Math.PI) / spikes - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // Player dot
    const playerMinimap = worldToMinimap(playerPosition.x, playerPosition.y, width, height);
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.arc(playerMinimap.x, playerMinimap.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Enemy dots - render alive enemies
    aliveEnemyPositions.forEach((enemyPosition) => {
      const enemyMinimap = worldToMinimap(enemyPosition.x, enemyPosition.y, width, height);
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(enemyMinimap.x, enemyMinimap.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Target + line
    if (targetPosition) {
      const targetMinimap = worldToMinimap(targetPosition.x, targetPosition.y, width, height);

      // Line
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(playerMinimap.x, playerMinimap.y);
      ctx.lineTo(targetMinimap.x, targetMinimap.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Target marker
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(targetMinimap.x, targetMinimap.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Crosshair
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(targetMinimap.x - 8, targetMinimap.y);
      ctx.lineTo(targetMinimap.x + 8, targetMinimap.y);
      ctx.moveTo(targetMinimap.x, targetMinimap.y - 8);
      ctx.lineTo(targetMinimap.x, targetMinimap.y + 8);
      ctx.stroke();
    }
  };

  // Resize canvas to window content
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateSize = () => {
      const container = canvas.parentElement;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const padding = 24; // match window content padding
      canvas.width = Math.max(120, rect.width - padding);
      canvas.height = Math.max(120, rect.height - padding);
      drawMinimap();
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }

    return () => {
      resizeObserver.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redraw when player / target / enemies / base changes, or when Mars background loads
  // Use enemyPositionsKey to track actual position changes, not just count
  useEffect(() => {
    drawMinimap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPosition.x, playerPosition.y, targetPosition?.x, targetPosition?.y, enemyPositionsKey, marsBackgroundImage]);

  // Mouse down: start drag + set target
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const width = canvas.width;
    const height = canvas.height;

    const worldPos = minimapToWorld(x, y, width, height);
    const clamped = {
      x: Math.max(0, Math.min(MAP_WIDTH, worldPos.x)),
      y: Math.max(0, Math.min(MAP_HEIGHT, worldPos.y)),
    };
    onTargetChange(clamped);
    setIsDragging(true);
  };

  // Mouse move while dragging: update target continuously
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const width = canvas.width;
    const height = canvas.height;

    const worldPos = minimapToWorld(x, y, width, height);
    const clamped = {
      x: Math.max(0, Math.min(MAP_WIDTH, worldPos.x)),
      y: Math.max(0, Math.min(MAP_HEIGHT, worldPos.y)),
    };
    onTargetChange(clamped);
  };

  // Global mouse up: stop dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleUp);
    return () => window.removeEventListener('mouseup', handleUp);
  }, [isDragging]);

  return (
    <Window
      id={windowId}
      title="Minimap"
      icon={<MinimapIcon />}
      initialX={window.innerWidth - 320}
      initialY={60}
      initialWidth={300}
      initialHeight={250}
      onMinimize={minimizeWindow}
      onRestore={restoreWindow}
    >
      <div style={{ padding: '12px', width: '100%', height: '100%', boxSizing: 'border-box', position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: '0',
            left: '12px',
            height: '12px',
            display: 'flex',
            alignItems: 'center',
            color: '#ffffff',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: 10,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          X: {Math.round(playerPosition.x / COORDINATE_SCALE)}, Y: {Math.round(playerPosition.y / COORDINATE_SCALE)}
        </div>
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          style={{
            width: '100%',
            height: '100%',
            cursor: isDragging ? 'grabbing' : 'crosshair',
            border: '1px solid #0ea5e9',
            borderRadius: '2px',
          }}
        />
      </div>
    </Window>
  );
}
