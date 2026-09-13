import type { Inventory, PowerUpId } from '../types/models';
import { POWERUPS } from '../data/powerups';

interface Props {
  inventory: Inventory;
  onUse: (id: PowerUpId) => void;
  disabled?: boolean;
}

const QUICK_SLOTS: PowerUpId[] = [
  'slow_time',
  'clear_bottom',
  'row_nuke',
  'top_out_shield',
  'gravity_lock',
  'cascade_bomb',
];

export function PowerUpBar({ inventory, onUse, disabled }: Props) {
  return (
    <div className="powerup-bar">
      <div className="panel-label">Power-Ups</div>
      <div className="powerup-slots">
        {QUICK_SLOTS.map((id, idx) => {
          const def = POWERUPS.find((p) => p.id === id)!;
          const count = inventory.consumables[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              className="powerup-slot"
              disabled={disabled || count <= 0}
              title={`${def.name} — ${def.description}`}
              onClick={() => onUse(id)}
            >
              <span className="pu-icon">{def.icon}</span>
              <span className="pu-key">{idx + 1}</span>
              <span className="pu-count">×{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
