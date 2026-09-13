import type {
  ActivePiece,
  Board,
  GameMode,
  GameStats,
  PieceType,
  PowerUpId,
  ActiveEffects,
} from '../types/models';
import { BagRandomizer } from './pieces';
import {
  COLS,
  ROWS,
  TOTAL_ROWS,
  addGarbageRows,
  clearBottomRows,
  clearLines,
  collides,
  createEmptyBoard,
  ghostPosition,
  lockPiece,
  nukeRow,
  spawnPiece,
  tryRotate,
} from './board';
import { gravityMsForLevel, levelFromLines, scoreForClears } from './scoring';

export interface EngineConfig {
  mode: GameMode;
  startLevel: number;
  targetLines: number | null; // null = endless
  lives: number; // Infinity for sandbox via large number
  garbageRows: number;
  disruption: 'none' | 'garbage_rain' | 'speed_spikes' | 'mirror_field';
  scoreMultiplier: number;
  startShield: number;
  extraHoldSlots: number;
  softDropBoost: boolean;
  queueSize: number;
  /** Delay first piece spawn (ms). Game Feel: 300–500ms after level start. */
  spawnDelayMs?: number;
}

export type EngineEvent =
  | { type: 'lines_cleared'; count: number; rows: number[] }
  | { type: 'level_up'; level: number }
  | { type: 'game_over'; reason: 'top_out' | 'no_lives' }
  | { type: 'level_complete' }
  | { type: 'piece_locked' }
  | { type: 'powerup_used'; id: PowerUpId };

export interface EngineState {
  board: Board;
  active: ActivePiece | null;
  hold: PieceType | null;
  holdSlots: (PieceType | null)[];
  canHold: boolean;
  queue: PieceType[];
  stats: GameStats;
  combo: number;
  lives: number;
  paused: boolean;
  gameOver: boolean;
  levelComplete: boolean;
  effects: ActiveEffects;
  softDropping: boolean;
  lockTimer: number;
  dropAccumulator: number;
  disruptionTimer: number;
  lastEvent: EngineEvent | null;
  spawnDelayRemaining: number;
}

const LOCK_DELAY_MS = 500;

export function defaultEffects(extraHold = 0, shield = 0, mult = 1): ActiveEffects {
  return {
    slowTimeUntil: 0,
    gravityLockUntil: 0,
    shieldCharges: shield,
    extraHoldSlots: extraHold,
    scoreMultiplier: mult,
  };
}

export class GameEngine {
  config: EngineConfig;
  state: EngineState;
  private bag: BagRandomizer;
  private softDropCells = 0;
  private hardDropCells = 0;
  private pendingFirstSpawn = false;

  constructor(config: EngineConfig) {
    this.config = config;
    this.bag = new BagRandomizer();
    const queueSize = Math.max(3, config.queueSize);
    const queue: PieceType[] = [];
    for (let i = 0; i < queueSize; i++) queue.push(this.bag.next());

    let board = createEmptyBoard();
    if (config.garbageRows > 0) {
      board = addGarbageRows(board, config.garbageRows);
    }

    const holdSlots = Array.from(
      { length: 1 + config.extraHoldSlots },
      () => null as PieceType | null,
    );

    this.state = {
      board,
      active: null,
      hold: null,
      holdSlots,
      canHold: true,
      queue,
      stats: {
        score: 0,
        lines: 0,
        level: config.startLevel,
        piecesPlaced: 0,
        maxCombo: 0,
        timeMs: 0,
      },
      combo: 0,
      lives: config.lives,
      paused: false,
      gameOver: false,
      levelComplete: false,
      effects: defaultEffects(config.extraHoldSlots, config.startShield, config.scoreMultiplier),
      softDropping: false,
      lockTimer: 0,
      dropAccumulator: 0,
      disruptionTimer: 0,
      lastEvent: null,
      spawnDelayRemaining: config.spawnDelayMs ?? 0,
    };

    if ((config.spawnDelayMs ?? 0) > 0) {
      this.pendingFirstSpawn = true;
    } else {
      this.spawnNext();
    }
  }

  private refillQueue() {
    while (this.state.queue.length < this.config.queueSize) {
      this.state.queue.push(this.bag.next());
    }
  }

  private spawnNext(): boolean {
    this.refillQueue();
    const type = this.state.queue.shift()!;
    this.refillQueue();
    const piece = spawnPiece(type);
    if (collides(this.state.board, piece)) {
      if (this.state.effects.shieldCharges > 0) {
        this.state.effects.shieldCharges -= 1;
        // Clear top few rows as shield effect
        for (let y = 0; y < 4; y++) {
          this.state.board[y] = Array.from({ length: COLS }, () => 'empty');
        }
        if (!collides(this.state.board, piece)) {
          this.state.active = piece;
          this.state.canHold = true;
          this.softDropCells = 0;
          this.hardDropCells = 0;
          this.state.lockTimer = 0;
          return true;
        }
      }
      this.handleTopOut();
      return false;
    }
    this.state.active = piece;
    this.state.canHold = true;
    this.softDropCells = 0;
    this.hardDropCells = 0;
    this.state.lockTimer = 0;
    return true;
  }

  private handleTopOut() {
    if (this.config.mode === 'sandbox') {
      // Unlimited: clear board and continue
      this.state.board = createEmptyBoard();
      this.state.lives = Math.max(this.state.lives, 99);
      this.spawnNext();
      return;
    }
    this.state.lives -= 1;
    if (this.state.lives <= 0) {
      this.state.gameOver = true;
      this.state.active = null;
      this.state.lastEvent = { type: 'game_over', reason: 'no_lives' };
    } else {
      this.state.board = createEmptyBoard();
      if (this.config.garbageRows > 0) {
        this.state.board = addGarbageRows(this.state.board, Math.min(2, this.config.garbageRows));
      }
      this.spawnNext();
    }
  }

  tick(dtMs: number): EngineEvent | null {
    this.state.lastEvent = null;
    if (this.state.paused || this.state.gameOver || this.state.levelComplete) {
      return null;
    }

    // First-piece spawn delay (Game Feel 300–500ms)
    if (this.pendingFirstSpawn) {
      this.state.spawnDelayRemaining = Math.max(0, this.state.spawnDelayRemaining - dtMs);
      this.state.stats.timeMs += dtMs;
      if (this.state.spawnDelayRemaining <= 0) {
        this.pendingFirstSpawn = false;
        this.spawnNext();
      }
      return null;
    }

    if (!this.state.active) {
      return null;
    }

    this.state.stats.timeMs += dtMs;

    // Disruptions
    if (this.config.disruption !== 'none') {
      this.state.disruptionTimer += dtMs;
      const interval = this.config.disruption === 'garbage_rain' ? 12000 : 8000;
      if (this.state.disruptionTimer >= interval) {
        this.state.disruptionTimer = 0;
        if (this.config.disruption === 'garbage_rain') {
          this.state.board = addGarbageRows(this.state.board, 1);
          if (this.state.active && collides(this.state.board, this.state.active)) {
            this.state.active = {
              ...this.state.active,
              position: {
                ...this.state.active.position,
                y: Math.max(0, this.state.active.position.y - 1),
              },
            };
          }
        }
      }
    }

    const now = this.state.stats.timeMs;
    let gravity = gravityMsForLevel(this.state.stats.level);
    if (this.config.disruption === 'speed_spikes' && Math.floor(now / 5000) % 2 === 1) {
      gravity = Math.max(50, gravity * 0.45);
    }
    if (now < this.state.effects.slowTimeUntil) {
      gravity *= 2.5;
    }
    if (now < this.state.effects.gravityLockUntil) {
      gravity = 999999;
    }

    if (this.state.softDropping) {
      const boost = this.config.softDropBoost ? 20 : 12;
      gravity = Math.min(gravity, 1000 / boost);
    }

    this.state.dropAccumulator += dtMs;
    while (this.state.dropAccumulator >= gravity) {
      this.state.dropAccumulator -= gravity;
      if (!this.tryMove(0, 1)) {
        this.state.lockTimer += gravity;
        if (this.state.lockTimer >= LOCK_DELAY_MS) {
          this.lockActive();
          break;
        }
      } else {
        this.state.lockTimer = 0;
        if (this.state.softDropping) this.softDropCells += 1;
      }
    }

    return this.state.lastEvent;
  }

  tryMove(dx: number, dy: number): boolean {
    if (!this.state.active || this.state.gameOver || this.state.paused) return false;
    const next: ActivePiece = {
      ...this.state.active,
      position: {
        x: this.state.active.position.x + dx,
        y: this.state.active.position.y + dy,
      },
    };
    if (collides(this.state.board, next)) return false;
    this.state.active = next;
    if (dy === 0) this.state.lockTimer = 0;
    return true;
  }

  rotate(dir: 1 | -1): boolean {
    if (!this.state.active || this.state.gameOver || this.state.paused) return false;
    const rotated = tryRotate(this.state.board, this.state.active, dir);
    if (!rotated) return false;
    this.state.active = rotated;
    this.state.lockTimer = 0;
    return true;
  }

  hardDrop(): void {
    if (!this.state.active || this.state.gameOver || this.state.paused) return;
    let cells = 0;
    while (this.tryMove(0, 1)) cells += 1;
    this.hardDropCells = cells;
    this.lockActive();
  }

  hold(): void {
    if (!this.state.active || !this.state.canHold || this.state.gameOver || this.state.paused) return;
    const current = this.state.active.type;
    const slots = this.state.holdSlots;
    // Prefer primary slot (index 0), then extras
    let swap: PieceType | null = slots[0];
    if (slots.length > 1 && swap !== null) {
      // If extra slots and primary filled, cycle into first empty or swap primary
      const emptyIdx = slots.findIndex((s) => s === null);
      if (emptyIdx > 0) {
        slots[emptyIdx] = current;
        this.state.hold = slots[0];
        this.state.holdSlots = [...slots];
        this.state.canHold = false;
        this.spawnNext();
        return;
      }
    }
    slots[0] = current;
    this.state.holdSlots = [...slots];
    this.state.hold = current;
    this.state.canHold = false;
    if (swap) {
      this.state.active = spawnPiece(swap);
      if (collides(this.state.board, this.state.active)) {
        this.handleTopOut();
      }
    } else {
      this.spawnNext();
    }
  }

  setSoftDrop(on: boolean) {
    this.state.softDropping = on;
  }

  togglePause() {
    if (this.state.gameOver || this.state.levelComplete) return;
    this.state.paused = !this.state.paused;
  }

  private lockActive() {
    if (!this.state.active) return;
    this.state.board = lockPiece(this.state.board, this.state.active);
    this.state.stats.piecesPlaced += 1;
    this.state.active = null;
    this.state.lastEvent = { type: 'piece_locked' };

    const { board, cleared, rows } = clearLines(this.state.board);
    this.state.board = board;

    if (cleared > 0) {
      this.state.combo += 1;
      this.state.stats.maxCombo = Math.max(this.state.stats.maxCombo, this.state.combo);
      this.state.stats.lines += cleared;
      const gained = scoreForClears(
        cleared,
        this.state.stats.level,
        this.state.combo,
        this.softDropCells,
        this.hardDropCells,
        this.state.effects.scoreMultiplier,
      );
      this.state.stats.score += gained;
      const newLevel = levelFromLines(this.state.stats.lines, this.config.startLevel);
      if (newLevel > this.state.stats.level) {
        this.state.stats.level = newLevel;
        this.state.lastEvent = { type: 'level_up', level: newLevel };
      } else {
        this.state.lastEvent = { type: 'lines_cleared', count: cleared, rows };
      }

      if (
        this.config.targetLines !== null &&
        this.state.stats.lines >= this.config.targetLines
      ) {
        this.state.levelComplete = true;
        this.state.lastEvent = { type: 'level_complete' };
        return;
      }
    } else {
      this.state.combo = 0;
      this.state.stats.score += this.softDropCells + this.hardDropCells * 2;
    }

    this.softDropCells = 0;
    this.hardDropCells = 0;
    this.spawnNext();
  }

  usePowerUp(id: PowerUpId): boolean {
    if (this.state.gameOver || this.state.paused || this.state.levelComplete) return false;
    const now = this.state.stats.timeMs;
    switch (id) {
      case 'slow_time':
        this.state.effects.slowTimeUntil = now + 10000;
        break;
      case 'clear_bottom':
        this.state.board = clearBottomRows(this.state.board, 2);
        break;
      case 'row_nuke': {
        // Nuke the densest visible row
        let best = TOTAL_ROWS - 1;
        let bestFill = -1;
        for (let y = TOTAL_ROWS - ROWS; y < TOTAL_ROWS; y++) {
          const fill = this.state.board[y].filter((c) => c !== 'empty').length;
          if (fill > bestFill) {
            bestFill = fill;
            best = y;
          }
        }
        this.state.board = nukeRow(this.state.board, best);
        break;
      }
      case 'top_out_shield':
        this.state.effects.shieldCharges += 1;
        break;
      case 'extra_hold':
        if (this.state.holdSlots.length < 3) {
          this.state.holdSlots = [...this.state.holdSlots, null];
          this.state.effects.extraHoldSlots += 1;
        }
        break;
      case 'gravity_lock':
        this.state.effects.gravityLockUntil = now + 8000;
        break;
      case 'mirror_clear': {
        // Clear leftmost and rightmost columns partially
        const b = this.state.board.map((row) => [...row]);
        for (let y = 0; y < TOTAL_ROWS; y++) {
          b[y][0] = 'empty';
          b[y][COLS - 1] = 'empty';
        }
        this.state.board = b;
        break;
      }
      case 'cascade_bomb':
        this.state.board = clearBottomRows(this.state.board, 4);
        this.state.stats.score += 500;
        break;
      default:
        return false;
    }
    this.state.lastEvent = { type: 'powerup_used', id };
    return true;
  }

  getGhost(): ActivePiece | null {
    if (!this.state.active) return null;
    return ghostPosition(this.state.board, this.state.active);
  }
}

export function createSandboxConfig(extras?: Partial<EngineConfig>): EngineConfig {
  return {
    mode: 'sandbox',
    startLevel: 0,
    targetLines: null,
    lives: 99,
    garbageRows: 0,
    disruption: 'none',
    scoreMultiplier: 1,
    startShield: 0,
    extraHoldSlots: 0,
    softDropBoost: false,
    queueSize: 5,
    ...extras,
  };
}

export function createHighScoreConfig(extras?: Partial<EngineConfig>): EngineConfig {
  return {
    mode: 'highscore',
    startLevel: 0,
    targetLines: null,
    lives: 3,
    garbageRows: 0,
    disruption: 'none',
    scoreMultiplier: 1,
    startShield: 0,
    extraHoldSlots: 0,
    softDropBoost: false,
    queueSize: 5,
    ...extras,
  };
}

export function createCampaignConfig(
  startLevel: number,
  targetLines: number,
  garbageRows: number,
  disruption: EngineConfig['disruption'],
  extras?: Partial<EngineConfig>,
): EngineConfig {
  return {
    mode: 'campaign',
    startLevel,
    targetLines,
    lives: extras?.lives ?? 3,
    garbageRows,
    disruption,
    scoreMultiplier: extras?.scoreMultiplier ?? 1,
    startShield: extras?.startShield ?? 0,
    extraHoldSlots: extras?.extraHoldSlots ?? 0,
    softDropBoost: extras?.softDropBoost ?? false,
    queueSize: extras?.queueSize ?? 5,
    ...extras,
  };
}
