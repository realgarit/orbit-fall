import { LaserSlot } from './LaserSlot';
import { RocketSlot } from './RocketSlot';
import { RepairSlot } from './RepairSlot';

interface ActionBarProps {
  laserAmmo?: number;
  rocketAmmo?: number;
  rocketCooldown?: number;
  repairCooldown?: number;
  isRepairing?: boolean;
  onActionClick?: (key: number) => void;
  onRepairClick?: () => void;
}

export function ActionBar({
  laserAmmo = 0,
  rocketAmmo = 0,
  rocketCooldown = 0,
  repairCooldown = 0,
  isRepairing = false,
  onActionClick,
  onRepairClick,
}: ActionBarProps) {
  const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const handleClick = (key: number) => {
    if (key === 0 && onRepairClick) {
      onRepairClick();
    } else {
      onActionClick?.(key);
    }
  };

  return (
    <div className="game-actionbar">
      {/* Slot 1: LC-10 Laser */}
      <LaserSlot
        slotNumber={1}
        ammo={laserAmmo}
        onActionClick={handleClick}
      />

      {/* Slot 2: RT-01 Rocket */}
      <RocketSlot
        slotNumber={2}
        ammo={rocketAmmo}
        cooldown={rocketCooldown}
        onActionClick={handleClick}
      />

      {/* Slots 3-9: Regular numbered buttons */}
      {keys.slice(2).map((key) => (
        <button
          key={key}
          className="game-actionbar-item"
          onClick={() => handleClick(key)}
          title={`Action ${key}`}
        >
          <span className="game-actionbar-badge">{key}</span>
        </button>
      ))}

      {/* Slot 0: RPR-1 Repair Robot */}
      <RepairSlot
        slotNumber={0}
        cooldown={repairCooldown}
        isRepairing={isRepairing}
        onActionClick={handleClick}
      />
    </div>
  );
}
