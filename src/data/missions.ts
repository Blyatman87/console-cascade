import type { Mission } from '../types/models';

export function createDefaultMissions(): Mission[] {
  return [
    {
      id: 'mission_lines_20',
      title: 'Warm-Up Sweep',
      description: 'Clear 20 lines in a single High Score run.',
      goalType: 'clear_lines',
      goalValue: 20,
      rewardLives: 1,
      rewardPowerUp: 'slow_time',
      rewardCartridges: 30,
      completed: false,
    },
    {
      id: 'mission_score_5k',
      title: 'Arcade Ambition',
      description: 'Reach 5,000 points before topping out.',
      goalType: 'reach_score',
      goalValue: 5000,
      rewardLives: 1,
      rewardPowerUp: 'clear_bottom',
      rewardCartridges: 50,
      completed: false,
    },
    {
      id: 'mission_quad_3',
      title: 'Quad Cadet',
      description: 'Clear 3 Tetris (4-line) clears in one run. Track via 12+ lines in big chunks — clear at least 3 quads (engine counts lines; complete when lines ≥ 12 and max combo helps).',
      goalType: 'clear_quads',
      goalValue: 3,
      rewardLives: 2,
      rewardPowerUp: 'row_nuke',
      rewardCartridges: 75,
      completed: false,
    },
  ];
}
