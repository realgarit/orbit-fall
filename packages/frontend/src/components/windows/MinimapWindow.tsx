import { useEffect, useRef, useState } from 'react';
import { Window } from './Window';
import { useWindowManager } from '../../hooks/useWindowManager';
import { MAP_WIDTH, MAP_HEIGHT } from '@shared/constants';

interface MinimapWindowProps {
  playerPosition: { x: number; y: number };
  targetPosition: { x: number; y: number } | null;
  onTargetChange: (target: { x: number; y: number } | null) => void;
  enemyPosition?: { x: number; y: number } | null;
  windowId?: string;
}

const MinimapIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M2 2h12v12H2V2zm1 1v10h10V3H3zm8 2l-2 4-2-2-2 3v3h8V5h-2z"
      fill="currentColor"
    />
  </svg>
);

export function MinimapWindow({
  playerPosition,
  targetPosition,
  onTargetChange,
  enemyPosition = null,
  windowId = 'minimap-window',
}: MinimapWindowProps) {
  const { minimizeWindow, restoreWindow, resetWindow, windows } = useWindowManager();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  
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
  }, [windowId, windows, resetWindow]);

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

    // Black background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1);

    // Player dot
    const playerMinimap = worldToMinimap(playerPosition.x, playerPosition.y, width, height);
    ctx.fillStyle = '#4a9eff';
    ctx.beginPath();
    ctx.arc(playerMinimap.x, playerMinimap.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Enemy dot
    if (enemyPosition) {
      const enemyMinimap = worldToMinimap(enemyPosition.x, enemyPosition.y, width, height);
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      ctx.arc(enemyMinimap.x, enemyMinimap.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

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

  // Redraw when player / target / enemy changes
  useEffect(() => {
    drawMinimap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPosition.x, playerPosition.y, targetPosition?.x, targetPosition?.y, enemyPosition?.x, enemyPosition?.y]);

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
      <div style={{ padding: '12px', width: '100%', height: '100%', boxSizing: 'border-box' }}>
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
