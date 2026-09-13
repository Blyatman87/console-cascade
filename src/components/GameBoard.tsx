import type { Board, ActivePiece, ThemePalette } from '../types/models';
import { pieceOccupies } from '../game/board';
import { ROWS, TOTAL_ROWS, COLS } from '../game/board';

interface Props {
  board: Board;
  active: ActivePiece | null;
  ghost: ActivePiece | null;
  theme: ThemePalette;
  cellSize?: number;
}

export function GameBoard({ board, active, ghost, theme, cellSize = 28 }: Props) {
  const visibleStart = TOTAL_ROWS - ROWS;
  const occupied = new Set<string>();
  const ghostSet = new Set<string>();

  if (ghost) {
    for (const c of pieceOccupies(ghost)) {
      ghostSet.add(`${c.x},${c.y}`);
    }
  }
  if (active) {
    for (const c of pieceOccupies(active)) {
      occupied.add(`${c.x},${c.y}`);
    }
  }

  return (
    <div
      className="game-board"
      style={{
        width: COLS * cellSize,
        height: ROWS * cellSize,
        background: `var(--cc-era-bg, var(--cc-board-bg, ${theme.boardBg}))`,
        borderColor: theme.panelBorder,
        ['--cell-size' as string]: `${cellSize}px`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -8px 24px rgba(0,0,0,0.35)',
      }}
    >
      {Array.from({ length: ROWS }, (_, vr) => {
        const y = visibleStart + vr;
        return Array.from({ length: COLS }, (_, x) => {
          const key = `${x},${y}`;
          let color = board[y][x];
          let isGhost = false;
          if (occupied.has(key) && active) {
            color = active.type;
          } else if (ghostSet.has(key) && color === 'empty') {
            isGhost = true;
          }
          const fallback =
            color === 'empty'
              ? isGhost
                ? theme.ghost
                : 'transparent'
              : color === 'garbage'
                ? theme.garbage
                : theme.piece[color as keyof typeof theme.piece] ?? theme.garbage;

          const bg =
            color === 'empty'
              ? isGhost
                ? `var(--cc-ghost, ${theme.ghost})`
                : 'transparent'
              : color === 'garbage'
                ? `var(--cc-garbage, ${theme.garbage})`
                : `var(--cc-piece-${color}, ${fallback})`;

          return (
            <div
              key={key}
              className={`board-cell ${color !== 'empty' || isGhost ? 'filled' : ''} ${isGhost ? 'ghost' : ''}`}
              style={{
                width: cellSize,
                height: cellSize,
                background: bg,
                boxShadow:
                  color !== 'empty' && !isGhost
                    ? 'inset 0 0 0 1px rgba(255,255,255,0.15)'
                    : `inset 0 0 0 1px var(--cc-era-grid, var(--cc-grid, ${theme.gridLine}))`,
              }}
            />
          );
        });
      })}
    </div>
  );
}
