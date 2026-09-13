import type { PowerUpDef } from '../types/models';

export const POWERUPS: PowerUpDef[] = [
  {
    id: 'slow_time',
    name: 'Chrono Drift',
    description: 'Slow gravity for 10 seconds.',
    kind: 'one_shot',
    shopCost: 40,
    icon: '⏳',
    durationMs: 10000,
  },
  {
    id: 'clear_bottom',
    name: 'Floor Sweep',
    description: 'Clear the bottom 2 rows instantly.',
    kind: 'one_shot',
    shopCost: 55,
    icon: '🧹',
    durationMs: 0,
  },
  {
    id: 'row_nuke',
    name: 'Row Nuke',
    description: 'Detonate the densest row on the board.',
    kind: 'one_shot',
    shopCost: 70,
    icon: '💥',
    durationMs: 0,
  },
  {
    id: 'top_out_shield',
    name: 'Top-Out Shield',
    description: 'Survive one top-out by clearing the skyline.',
    kind: 'one_shot',
    shopCost: 90,
    icon: '🛡️',
    durationMs: 0,
  },
  {
    id: 'extra_hold',
    name: 'Twin Hold',
    description: 'Add an extra hold slot for this run.',
    kind: 'one_shot',
    shopCost: 80,
    icon: '📦',
    durationMs: 0,
  },
  {
    id: 'gravity_lock',
    name: 'Gravity Lock',
    description: 'Freeze gravity for 8 seconds.',
    kind: 'one_shot',
    shopCost: 60,
    icon: '🔒',
    durationMs: 8000,
  },
  {
    id: 'mirror_clear',
    name: 'Edge Shear',
    description: 'Clear the leftmost and rightmost columns.',
    kind: 'one_shot',
    shopCost: 50,
    icon: '🪞',
    durationMs: 0,
  },
  {
    id: 'cascade_bomb',
    name: 'Cascade Bomb',
    description: 'Blast the bottom 4 rows and score a bonus.',
    kind: 'one_shot',
    shopCost: 120,
    icon: '💣',
    durationMs: 0,
  },
];

export function getPowerUp(id: string): PowerUpDef | undefined {
  return POWERUPS.find((p) => p.id === id);
}
