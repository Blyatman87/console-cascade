import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GameEngine } from '../game/engine';
import type { Inventory, PowerUpId, ThemePalette, GameMode } from '../types/models';
import { GameBoard } from './GameBoard';
import { MiniPiece } from './MiniPiece';
import { TouchControls } from './TouchControls';
import { PowerUpBar } from './PowerUpBar';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeyboard } from '../hooks/useKeyboard';
import { ROWS, COLS } from '../game/board';

interface Props {
  engine: GameEngine;
  theme: ThemePalette;
  inventory: Inventory;
  mode: GameMode;
  levelTitle?: string;
  livesLabel?: string;
  onUsePowerUp: (id: PowerUpId) => boolean;
  onPauseChange: (paused: boolean) => void;
  onMute: () => void;
  muted: boolean;
  onExitToMenu: () => void;
  /** Force re-render tick from parent when engine state changes externally */
  tick: number;
  setTick: (n: number | ((t: number) => number)) => void;
}

export function PlayScreen({
  engine,
  theme,
  inventory,
  mode,
  levelTitle,
  livesLabel,
  onUsePowerUp,
  onPauseChange,
  onMute,
  muted,
  onExitToMenu,
  tick,
  setTick,
}: Props) {
  const [cellSize, setCellSize] = useState(28);
  const state = engine.state;
  const ghost = engine.getGhost();

  useEffect(() => {
    const fit = () => {
      const maxH = Math.min(window.innerHeight * 0.55, 560);
      const maxW = Math.min(window.innerWidth * 0.9, 320);
      const byH = Math.floor(maxH / ROWS);
      const byW = Math.floor(maxW / COLS);
      setCellSize(Math.max(16, Math.min(byH, byW)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const bump = useCallback(() => setTick((t) => t + 1), [setTick]);

  useGameLoop(engine, !state.paused && !state.gameOver && !state.levelComplete, bump);

  const handlers = useMemo(
    () => ({
      enabled: !state.gameOver && !state.levelComplete,
      onLeft: () => {
        engine.tryMove(-1, 0);
        bump();
      },
      onRight: () => {
        engine.tryMove(1, 0);
        bump();
      },
      onSoftDropStart: () => {
        engine.setSoftDrop(true);
        bump();
      },
      onSoftDropEnd: () => {
        engine.setSoftDrop(false);
        bump();
      },
      onHardDrop: () => {
        engine.hardDrop();
        bump();
      },
      onRotateCW: () => {
        engine.rotate(1);
        bump();
      },
      onRotateCCW: () => {
        engine.rotate(-1);
        bump();
      },
      onHold: () => {
        engine.hold();
        bump();
      },
      onPause: () => {
        engine.togglePause();
        onPauseChange(engine.state.paused);
        bump();
      },
      onMute,
    }),
    [engine, bump, onMute, onPauseChange, state.gameOver, state.levelComplete],
  );

  useKeyboard(handlers);

  // Number keys 1-6 for power-ups
  useEffect(() => {
    const ids: PowerUpId[] = [
      'slow_time',
      'clear_bottom',
      'row_nuke',
      'top_out_shield',
      'gravity_lock',
      'cascade_bomb',
    ];
    const onKey = (e: KeyboardEvent) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 6) {
        onUsePowerUp(ids[n - 1]);
        bump();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onUsePowerUp, bump]);

  void tick; // dependency for re-render

  const now = state.stats.timeMs;
  const slowActive = now < state.effects.slowTimeUntil;
  const lockActive = now < state.effects.gravityLockUntil;

  return (
    <div className="play-screen">
      <header className="play-header">
        <div>
          <p className="eyebrow">{mode.toUpperCase()}</p>
          <h2>{levelTitle ?? 'Cascade'}</h2>
        </div>
        <div className="play-header-actions">
          <button type="button" className="icon-btn" onClick={onMute} title="Mute (M)">
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              engine.togglePause();
              onPauseChange(engine.state.paused);
              bump();
            }}
            title="Pause (P)"
          >
            ❚❚
          </button>
        </div>
      </header>

      <div className="play-layout">
        <aside className="side-panel left">
          <div className="panel-box">
            <div className="panel-label">Hold</div>
            <MiniPiece type={state.holdSlots[0] ?? state.hold} />
            {state.holdSlots.slice(1).map((s, i) => (
              <MiniPiece key={i} type={s} cell={10} />
            ))}
          </div>
          <div className="panel-box stats-box">
            <div><span>Score</span><strong>{state.stats.score.toLocaleString()}</strong></div>
            <div><span>Lines</span><strong>{state.stats.lines}</strong></div>
            <div><span>Level</span><strong>{state.stats.level}</strong></div>
            {livesLabel && <div><span>Lives</span><strong>{livesLabel}</strong></div>}
            {state.effects.shieldCharges > 0 && (
              <div><span>Shield</span><strong>×{state.effects.shieldCharges}</strong></div>
            )}
          </div>
        </aside>

        <div className="board-wrap">
          <GameBoard
            board={state.board}
            active={state.active}
            ghost={ghost}
            theme={theme}
            cellSize={cellSize}
          />
          {(slowActive || lockActive) && (
            <div className="effect-banner">
              {slowActive && <span>Chrono Drift</span>}
              {lockActive && <span>Gravity Lock</span>}
            </div>
          )}
        </div>

        <aside className="side-panel right">
          <div className="panel-box">
            <div className="panel-label">Next</div>
            {state.queue.slice(0, 5).map((p, i) => (
              <MiniPiece key={`${p}-${i}`} type={p} cell={i === 0 ? 14 : 10} />
            ))}
          </div>
        </aside>
      </div>

      <PowerUpBar
        inventory={inventory}
        disabled={state.paused || state.gameOver}
        onUse={(id) => {
          onUsePowerUp(id);
          bump();
        }}
      />

      <TouchControls
        onLeft={handlers.onLeft!}
        onRight={handlers.onRight!}
        onSoftDropStart={handlers.onSoftDropStart!}
        onSoftDropEnd={handlers.onSoftDropEnd!}
        onHardDrop={handlers.onHardDrop!}
        onRotateCW={handlers.onRotateCW!}
        onRotateCCW={handlers.onRotateCCW!}
        onHold={handlers.onHold!}
        onPause={handlers.onPause!}
      />

      {state.paused && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>Paused</h2>
            <p className="muted">P / Esc to resume</p>
            <button
              type="button"
              className="menu-btn primary"
              onClick={() => {
                engine.togglePause();
                onPauseChange(false);
                bump();
              }}
            >
              Resume
            </button>
            <button type="button" className="menu-btn ghost" onClick={onExitToMenu}>
              Quit to Menu
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
