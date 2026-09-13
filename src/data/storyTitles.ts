/** Story titles from docs/STORYBOARD_U1.md — used in level interstitials. */

export const STORYBOARD_U1_TITLES = [
  'Woodgrain Warmup',
  'Soft Plastic Plains',
  'Flicker Alley',
  'Eight-Bit Boulevard',
  'Save-State Crossing',
  'Sixteen-Bit Skyline',
  'Mode Twist Meadows',
  'Disc Drive District',
  'Polygon Promenade',
  'Analog Threshold',
] as const;

export const STORYBOARD_U1_BOSS = 'Maw of the Maze';

export function storyTitleForLevelIndex(levelIndex: number): string {
  return STORYBOARD_U1_TITLES[levelIndex] ?? `Level ${levelIndex + 1}`;
}
