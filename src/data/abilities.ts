import type { Ability } from '../types/models';

/** Post-boss permanent ability choices (pick 1 of 3) */
export const BOSS_ABILITY_CHOICES: Ability[] = [
  {
    id: 'soft_cascade',
    name: 'Soft Cascade',
    description: 'Soft drop is significantly faster for all future runs.',
    icon: '🌊',
    effect: 'soft_drop_boost',
  },
  {
    id: 'archive_hold',
    name: 'Archive Hold',
    description: 'Start every run with +1 hold slot.',
    icon: '🗃️',
    effect: 'hold_slot_plus',
  },
  {
    id: 'score_prism',
    name: 'Score Prism',
    description: 'All scores multiplied by 1.25 permanently.',
    icon: '💎',
    effect: 'score_multiplier',
  },
];

export const ALL_ABILITIES: Ability[] = [
  ...BOSS_ABILITY_CHOICES,
  {
    id: 'boot_shield',
    name: 'Boot Shield',
    description: 'Begin each campaign level with a top-out shield charge.',
    icon: '🔰',
    effect: 'start_shield',
  },
  {
    id: 'wide_preview',
    name: 'Wide Preview',
    description: 'Next queue shows one extra piece.',
    icon: '🔭',
    effect: 'wider_queue',
  },
];

export function getAbility(id: string): Ability | undefined {
  return ALL_ABILITIES.find((a) => a.id === id);
}
