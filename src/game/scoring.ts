/** Classic-inspired scoring with cascade bonuses */

export function gravityMsForLevel(level: number): number {
  // Faster as level rises; floor at 50ms
  const table = [
    800, 720, 630, 550, 470, 380, 300, 220, 130, 100,
    80, 80, 80, 70, 70, 70, 50, 50, 50, 50,
  ];
  if (level < table.length) return table[level];
  return 50;
}

export function scoreForClears(
  lines: number,
  level: number,
  combo: number,
  softDropCells: number,
  hardDropCells: number,
  multiplier = 1,
): number {
  const base = [0, 100, 300, 500, 800][Math.min(lines, 4)] ?? 800;
  const comboBonus = combo > 1 ? (combo - 1) * 50 * level : 0;
  const drop = softDropCells + hardDropCells * 2;
  return Math.floor((base * (level + 1) + comboBonus + drop) * multiplier);
}

export function levelFromLines(totalLines: number, startLevel = 0): number {
  return startLevel + Math.floor(totalLines / 10);
}
