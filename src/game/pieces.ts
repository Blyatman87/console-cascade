import type { PieceType, Vec2 } from '../types/models';

/** SRS-style shapes: [rotation][cells as {x,y} relative to origin] */
export const PIECE_SHAPES: Record<PieceType, Vec2[][]> = {
  I: [
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 }],
    [{ x: 2, y: 0 }, { x: 2, y: 1 }, { x: 2, y: 2 }, { x: 2, y: 3 }],
    [{ x: 0, y: 2 }, { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 1, y: 3 }],
  ],
  O: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  ],
  T: [
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  S: [
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
  Z: [
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 2, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 0, y: 2 }],
  ],
  J: [
    [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 2, y: 2 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 2 }, { x: 1, y: 2 }],
  ],
  L: [
    [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
    [{ x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }, { x: 2, y: 2 }],
    [{ x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 0, y: 2 }],
    [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 1, y: 2 }],
  ],
};

export const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

export function getCells(type: PieceType, rotation: 0 | 1 | 2 | 3): Vec2[] {
  return PIECE_SHAPES[type][rotation];
}

/** 7-bag randomizer */
export class BagRandomizer {
  private bag: PieceType[] = [];
  private fairTutorialOpener = false;

  /** Campaign L1: first bag avoids leading with S/Z; prefers I/T/L/J/O early. */
  enableFairTutorialOpener(): void {
    this.fairTutorialOpener = true;
  }

  private refill(): void {
    this.bag = [...PIECE_TYPES];
    for (let i = this.bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]];
    }
    if (this.fairTutorialOpener) {
      this.fairTutorialOpener = false;
      const preferred: PieceType[] = ['I', 'T', 'L', 'J', 'O'];
      // Ensure first dealt (pop from end) is preferred and not S/Z
      const easy = preferred[Math.floor(Math.random() * preferred.length)];
      const idx = this.bag.indexOf(easy);
      if (idx >= 0) {
        const last = this.bag.length - 1;
        [this.bag[idx], this.bag[last]] = [this.bag[last], this.bag[idx]];
      }
      // Keep S/Z toward the front of the array (dealt later)
      this.bag.sort((a, b) => {
        const score = (p: PieceType) => (p === 'S' || p === 'Z' ? -1 : 0);
        return score(a) - score(b);
      });
      // After sort, put easy at end again for first pop
      const i2 = this.bag.indexOf(easy);
      if (i2 >= 0) {
        const last = this.bag.length - 1;
        [this.bag[i2], this.bag[last]] = [this.bag[last], this.bag[i2]];
      }
    }
  }

  next(): PieceType {
    if (this.bag.length === 0) {
      this.refill();
    }
    return this.bag.pop()!;
  }

  peek(n: number): PieceType[] {
    while (this.bag.length < n) {
      const refill = [...PIECE_TYPES];
      for (let i = refill.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [refill[i], refill[j]] = [refill[j], refill[i]];
      }
      this.bag = [...refill, ...this.bag];
    }
    return this.bag.slice(-n).reverse();
  }
}
