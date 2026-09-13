import type { PieceType } from '../types/models';
import { PIECE_SHAPES } from '../game/pieces';

interface Props {
  type: PieceType | null;
  cell?: number;
}

export function MiniPiece({ type, cell = 14 }: Props) {
  if (!type) {
    return <div className="mini-piece empty" style={{ width: cell * 4, height: cell * 3 }} />;
  }
  const cells = PIECE_SHAPES[type][0];
  const maxX = Math.max(...cells.map((c) => c.x)) + 1;
  const maxY = Math.max(...cells.map((c) => c.y)) + 1;
  return (
    <div
      className="mini-piece"
      style={{
        width: maxX * cell,
        height: maxY * cell,
        position: 'relative',
      }}
    >
      {cells.map((c, i) => (
        <div
          key={i}
          className={`cell piece-${type}`}
          style={{
            position: 'absolute',
            left: c.x * cell,
            top: c.y * cell,
            width: cell - 1,
            height: cell - 1,
          }}
        />
      ))}
    </div>
  );
}
