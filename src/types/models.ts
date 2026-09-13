/** Console Cascade — core typed models */

export type CellColor =
  | 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
  | 'garbage' | 'empty' | 'ghost';

export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';

export interface Vec2 {
  x: number;
  y: number;
}

export interface ActivePiece {
  type: PieceType;
  rotation: 0 | 1 | 2 | 3;
  position: Vec2; // top-left of bounding box
}

export type Board = CellColor[][]; // [row][col], row 0 = top

export interface GameStats {
  score: number;
  lines: number;
  level: number;
  piecesPlaced: number;
  maxCombo: number;
  timeMs: number;
}

export type PowerUpId =
  | 'slow_time'
  | 'clear_bottom'
  | 'row_nuke'
  | 'top_out_shield'
  | 'extra_hold'
  | 'gravity_lock'
  | 'mirror_clear'
  | 'cascade_bomb';

export type PowerUpKind = 'one_shot' | 'permanent';

export interface PowerUpDef {
  id: PowerUpId;
  name: string;
  description: string;
  kind: PowerUpKind;
  shopCost: number;
  icon: string;
  /** Duration in ms for timed one-shots; 0 = instant */
  durationMs: number;
}

export interface Inventory {
  /** Consumable counts */
  consumables: Partial<Record<PowerUpId, number>>;
  /** Permanent unlocks */
  permanents: PowerUpId[];
  /** Currency for campaign shop */
  cartridges: number;
}

export interface Ability {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Permanent passive effect key */
  effect: 'soft_drop_boost' | 'hold_slot_plus' | 'score_multiplier' | 'start_shield' | 'wider_queue';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  /** Target metric */
  goalType: 'clear_lines' | 'reach_score' | 'survive_time' | 'clear_quads';
  goalValue: number;
  rewardLives: number;
  rewardPowerUp?: PowerUpId;
  rewardCartridges?: number;
  completed: boolean;
}

export interface LevelDef {
  id: string;
  index: number;
  title: string;
  storyBlurb: string;
  /** Starting gravity level override */
  startLevel: number;
  targetLines: number;
  /** Optional garbage rows at start */
  garbageRows: number;
  /** Disruptions: random garbage / mirror etc. */
  disruption?: 'none' | 'garbage_rain' | 'speed_spikes' | 'mirror_field';
  rewardCartridges: number;
}

export interface BossDef {
  id: string;
  name: string;
  title: string;
  storyBlurb: string;
  phases: number;
  startLevel: number;
}

export interface Universe {
  id: string;
  index: number;
  name: string;
  eraLabel: string;
  description: string;
  themeId: string;
  levels: LevelDef[];
  boss: BossDef;
  unlocked: boolean;
}

export interface PlayerProgress {
  version: number;
  cartridges: number;
  inventory: Inventory;
  unlockedAbilities: string[];
  selectedAbilityId: string | null;
  campaign: {
    universeIndex: number;
    levelIndex: number;
    completedLevels: string[];
    bossDefeated: boolean;
    lives: number;
  };
  highScore: {
    bestScore: number;
    bestLines: number;
    bestLevel: number;
    runs: HighScoreRun[];
    missions: Mission[];
    lives: number;
  };
  settings: {
    muted: boolean;
    sfxVolume: number;
    musicVolume: number;
    seenControlsOverlay: boolean;
  };
}

export interface HighScoreRun {
  score: number;
  lines: number;
  level: number;
  date: string;
  mode: 'highscore' | 'sandbox' | 'campaign';
}

export type GameMode = 'sandbox' | 'highscore' | 'campaign';

export type AppScreen =
  | 'menu'
  | 'playing'
  | 'paused'
  | 'shop'
  | 'story'
  | 'gameover'
  | 'boss_intro'
  | 'boss_victory'
  | 'ability_pick'
  | 'missions'
  | 'campaign_map'
  | 'level_result'
  | 'wash';

export interface ThemePalette {
  id: string;
  name: string;
  bg: string;
  bgAlt: string;
  panel: string;
  panelBorder: string;
  text: string;
  textMuted: string;
  accent: string;
  accentAlt: string;
  boardBg: string;
  gridLine: string;
  piece: Record<PieceType, string>;
  garbage: string;
  ghost: string;
  fontFamily: string;
  titleFont: string;
  uiRadius: string;
  pixelated: boolean;
}

export interface ActiveEffects {
  slowTimeUntil: number;
  gravityLockUntil: number;
  shieldCharges: number;
  extraHoldSlots: number;
  scoreMultiplier: number;
}
