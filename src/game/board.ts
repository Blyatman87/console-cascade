import type { Board, CellColor, ActivePiece, PieceType } from '../types/models';
import { getCells } from './pieces';

export const COLS = 10;
export const ROWS = 20;
export const HIDDEN_ROWS = 2;
export const TOTAL_ROWS = ROWS + HIDDEN_ROWS;

export function createEmptyBoard(): Board {
  return Array.from({ length: TOTAL_ROWS }, () =>
    Array.from({ length: COLS }, () => 'empty' as CellColor),
  );
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => [...row]);
}

export function pieceOccupies(
  piece: ActivePiece,
): { x: number; y: number }[] {
  return getCells(piece.type, piece.rotation).map((c) => ({
    x: piece.position.x + c.x,
    y: piece.position.y + c.y,
  }));
}

export function collides(board: Board, piece: ActivePiece): boolean {
  for (const { x, y } of pieceOccupies(piece)) {
    if (x < 0 || x >= COLS || y >= TOTAL_ROWS) return true;
    if (y < 0) continue;
    if (board[y][x] !== 'empty') return true;
  }
  return false;
}

export function lockPiece(board: Board, piece: ActivePiece): Board {
  const next = cloneBoard(board);
  for (const { x, y } of pieceOccupies(piece)) {
    if (y >= 0 && y < TOTAL_ROWS && x >= 0 && x < COLS) {
      next[y][x] = piece.type as CellColor;
    }
  }
  return next;
}

export function clearLines(board: Board): { board: Board; cleared: number; rows: number[] } {
  const rows: number[] = [];
  const kept: Board = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (board[y].every((c) => c !== 'empty')) {
      rows.push(y);
    } else {
      kept.push([...board[y]]);
    }
  }
  const cleared = rows.length;
  while (kept.length < TOTAL_ROWS) {
    kept.unshift(Array.from({ length: COLS }, () => 'empty' as CellColor));
  }
  return { board: kept, cleared, rows };
}

export function addGarbageRows(board: Board, count: number, holeCol?: number): Board {
  if (count <= 0) return board;
  const next = cloneBoard(board);
  for (let i = 0; i < count; i++) {
    next.shift();
    const hole = holeCol ?? Math.floor(Math.random() * COLS);
    const row: CellColor[] = Array.from({ length: COLS }, (_, x) =>
      x === hole ? 'empty' : 'garbage',
    );
    next.push(row);
  }
  return next;
}

export function clearBottomRows(board: Board, count: number): Board {
  const next = cloneBoard(board);
  for (let i = 0; i < count; i++) {
    const y = TOTAL_ROWS - 1 - i;
    if (y >= 0) next[y] = Array.from({ length: COLS }, () => 'empty' as CellColor);
  }
  // Compact empty bottom? Keep as cleared cells for visual; gravity via clearLines style
  const compacted: Board = [];
  for (let y = 0; y < TOTAL_ROWS; y++) {
    if (!next[y].every((c) => c === 'empty')) compacted.push([...next[y]]);
  }
  while (compacted.length < TOTAL_ROWS) {
    compacted.unshift(Array.from({ length: COLS }, () => 'empty' as CellColor));
  }
  return compacted;
}

export function nukeRow(board: Board, rowIndex: number): Board {
  if (rowIndex < 0 || rowIndex >= TOTAL_ROWS) return board;
  const next = cloneBoard(board);
  next.splice(rowIndex, 1);
  next.unshift(Array.from({ length: COLS }, () => 'empty' as CellColor));
  return next;
}

export function ghostPosition(board: Board, piece: ActivePiece): ActivePiece {
  let ghost = { ...piece, position: { ...piece.position } };
  while (!collides(board, { ...ghost, position: { x: ghost.position.x, y: ghost.position.y + 1 } })) {
    ghost = { ...ghost, position: { x: ghost.position.x, y: ghost.position.y + 1 } };
  }
  return ghost;
}

export function spawnPiece(type: PieceType): ActivePiece {
  return {
    type,
    rotation: 0,
    position: { x: 3, y: 0 },
  };
}

/** Simple wall-kick: try offsets */
const KICKS: { x: number; y: number }[] = [
  { x: 0, y: 0 },
  { x: -1, y: 0 },
  { x: 1, y: 0 },
  { x: 0, y: -1 },
  { x: -2, y: 0 },
  { x: 2, y: 0 },
  { x: -1, y: -1 },
  { x: 1, y: -1 },
];

export function tryRotate(
  board: Board,
  piece: ActivePiece,
  dir: 1 | -1,
): ActivePiece | null {
  const nextRot = ((piece.rotation + dir + 4) % 4) as 0 | 1 | 2 | 3;
  for (const k of KICKS) {
    const candidate: ActivePiece = {
      ...piece,
      rotation: nextRot,
      position: { x: piece.position.x + k.x, y: piece.position.y + k.y },
    };
    if (!collides(board, candidate)) return candidate;
  }
  return null;
}
