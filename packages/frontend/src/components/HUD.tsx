import { COORDINATE_SCALE } from '@shared/constants';

interface HUDProps {
  position: { x: number; y: number };
  velocity: { vx: number; vy: number };
  fps: number;
  cargo: number;
  maxCargo: number;
}

export function HUD({ position, velocity, fps, cargo, maxCargo }: HUDProps) {
  const speed = Math.sqrt(velocity.vx * velocity.vx + velocity.vy * velocity.vy);

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        color: '#ffffff',
        fontFamily: 'monospace',
        fontSize: '14px',
        lineHeight: '1.6',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: '10px',
        borderRadius: '4px',
        zIndex: 1000,
        pointerEvents: 'none',
      }}
    >
      <div>Coordinates: ({Math.round(position.x / COORDINATE_SCALE)}, {Math.round(position.y / COORDINATE_SCALE)})</div>
      <div>Speed: {speed.toFixed(2)}</div>
      <div>Velocity: ({velocity.vx.toFixed(2)}, {velocity.vy.toFixed(2)})</div>
      <div>Cargo: {cargo} / {maxCargo}</div>
      <div>FPS: {fps.toFixed(0)}</div>
    </div>
  );
}
