import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameEngine } from '../game/engine';
import type { Inventory, PowerUpId, ThemePalette, GameMode } from '../types/models';
import type { ControlBindings } from '../input/controls';
import { GameBoard } from './GameBoard';
import { MiniPiece } from './MiniPiece';
import { TouchControls } from './TouchControls';
import { PowerUpBar } from './PowerUpBar';
import { SettingsPanel } from './SettingsPanel';
import { ControlsOverlay } from './ControlsOverlay';
import { MissionToast } from './MissionToast';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeyboard } from '../hooks/useKeyboard';
import { ROWS, COLS } from '../game/board';
import { audio } from '../audio/audio';
import { formatCode } from '../input/controls';
import { FlickerLayer, type FlickerLayerHandle } from './FlickerLayer';

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
  sfxVolume: number;
  musicVolume: number;
  onSfxVolume: (v: number) => void;
  onMusicVolume: (v: number) => void;
  onExitToMenu: () => void;
  tick: number;
  setTick: (n: number | ((t: number) => number)) => void;
  bindings: ControlBindings;
  onBindingsChange: (b: ControlBindings) => void;
  showControlsOverlay: boolean;
  onDismissControlsOverlay: () => void;
  missionToast: string | null;
  onDismissToast: () => void;
  /** When true, freeze input (level complete sting/result handled by parent). */
  inputLocked?: boolean;
  clearToken: number;
  /** Show QA force-complete (URL ?debug=1). */
  debugMode?: boolean;
  /** Campaign L2+ era flicker (never L1). */
  flickerEnabled?: boolean;
  onFlickerReward?: (cartridges: number) => void;
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
  sfxVolume,
  musicVolume,
  onSfxVolume,
  onMusicVolume,
  onExitToMenu,
  tick,
  setTick,
  bindings,
  onBindingsChange,
  showControlsOverlay,
  onDismissControlsOverlay,
  missionToast,
  onDismissToast,
  inputLocked = false,
  clearToken,
  debugMode = false,
  flickerEnabled = false,
  onFlickerReward,
}: Props) {
  const [cellSize, setCellSize] = useState(28);
  const [showSettings, setShowSettings] = useState(false);
  const boardShellRef = useRef<HTMLDivElement>(null);
  const flickerRef = useRef<FlickerLayerHandle>(null);
  const flickerOfferedRef = useRef(false);
  const [flickerOfferOpen, setFlickerOfferOpen] = useState(false);
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

  useEffect(() => {
    audio.setMuted(muted);
    audio.setSfxVolume(sfxVolume);
    audio.setMusicVolume(musicVolume);
  }, [muted, sfxVolume, musicVolume]);

  useEffect(() => {
    audio.resume();
    if (!muted) audio.startMusic();
    return () => audio.stopMusic();
  }, [muted]);

  // SFX from engine events + flicker board façade
  useEffect(() => {
    const ev = engine.state.lastEvent;
    if (!ev) return;
    if (ev.type === 'piece_locked') audio.play('lock');
    else if (ev.type === 'lines_cleared') {
      audio.play('clear');
      flickerRef.current?.notifyLineClear(ev.count);
    } else if (ev.type === 'level_complete') audio.play('levelComplete');
    else if (ev.type === 'level_up') audio.play('ui');
    else if (ev.type === 'game_over') flickerRef.current?.notifyTopOut();
  }, [tick, engine]);

  // Auto-offer era flicker once mid-level on campaign L2+ (never L1)
  useEffect(() => {
    if (!flickerEnabled || flickerOfferedRef.current || inputLocked) return;
    if (state.paused || state.gameOver || state.levelComplete) return;
    const t = window.setTimeout(() => {
      if (flickerOfferedRef.current) return;
      if (engine.state.paused || engine.state.gameOver || engine.state.levelComplete) return;
      flickerOfferedRef.current = true;
      flickerRef.current?.offer({ challenge: 'survive' });
    }, 9000);
    return () => window.clearTimeout(t);
  }, [flickerEnabled, inputLocked, state.paused, state.gameOver, state.levelComplete, engine]);

  useEffect(() => {
    flickerOfferedRef.current = false;
  }, [engine]);

  const bump = useCallback(() => setTick((t) => t + 1), [setTick]);

  const loopActive =
    !state.paused &&
    !state.gameOver &&
    !state.levelComplete &&
    !showSettings &&
    !showControlsOverlay &&
    !inputLocked;

  const loopActiveFinal = loopActive && !flickerOfferOpen;
  useGameLoop(engine, loopActiveFinal, bump);

  const gameplayOff =
    state.paused ||
    state.gameOver ||
    state.levelComplete ||
    showSettings ||
    showControlsOverlay ||
    inputLocked ||
    flickerOfferOpen;

  const handlers = useMemo(
    () => ({
      enabled: !gameplayOff,
      allowMeta: !showSettings && !showControlsOverlay && !inputLocked,
      bindings,
      clearToken,
      onLeft: () => {
        if (engine.tryMove(-1, 0)) audio.play('move');
        bump();
      },
      onRight: () => {
        if (engine.tryMove(1, 0)) audio.play('move');
        bump();
      },
      onSoftDropStart: () => {
        engine.setSoftDrop(true);
        audio.play('soft');
        bump();
      },
      onSoftDropEnd: () => {
        engine.setSoftDrop(false);
        bump();
      },
      onHardDrop: () => {
        engine.hardDrop();
        audio.play('hard');
        flickerRef.current?.notifyHardDrop();
        bump();
      },
      onRotateCW: () => {
        if (engine.rotate(1)) audio.play('rotate');
        bump();
      },
      onRotateCCW: () => {
        if (engine.rotate(-1)) audio.play('rotate');
        bump();
      },
      onHold: () => {
        engine.hold();
        audio.play('hold');
        flickerRef.current?.notifyHold();
        bump();
      },
      onPause: () => {
        if (showSettings || showControlsOverlay || inputLocked || state.levelComplete) return;
        engine.togglePause();
        audio.play('pause');
        onPauseChange(engine.state.paused);
        bump();
      },
      onMute,
    }),
    [
      engine,
      bump,
      onMute,
      onPauseChange,
      gameplayOff,
      showSettings,
      showControlsOverlay,
      inputLocked,
      state.levelComplete,
      bindings,
      clearToken,
    ],
  );

  useKeyboard(handlers);

  useEffect(() => {
    if (gameplayOff) return;
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
  }, [onUsePowerUp, bump, gameplayOff]);

  void tick;

  const now = state.stats.timeMs;
  const slowActive = now < state.effects.slowTimeUntil;
  const lockActive = now < state.effects.gravityLockUntil;
  const pauseHint = `${formatCode(bindings.pause.primary)}${
    bindings.pause.alt ? ` / ${formatCode(bindings.pause.alt)}` : ''
  }`;

  const openSettings = () => {
    if (!state.paused && !state.levelComplete && !state.gameOver) {
      engine.togglePause();
      onPauseChange(true);
      bump();
    }
    setShowSettings(true);
  };

  const closeSettings = () => {
    setShowSettings(false);
    bump();
  };

  return (
    <div className="play-screen">
      <header className="play-header">
        <div>
          <p className="eyebrow">{mode.toUpperCase()}</p>
          <h2>{levelTitle ?? 'Cascade'}</h2>
        </div>
        <div className="play-header-actions">
          <button type="button" className="icon-btn" onClick={onMute} title="Mute">
            {muted ? '🔇' : '🔊'}
          </button>
          <button type="button" className="icon-btn" onClick={openSettings} title="Settings">
            ⚙
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={() => {
              engine.togglePause();
              onPauseChange(engine.state.paused);
              bump();
            }}
            title={`Pause (${pauseHint})`}
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
            <div>
              <span>Score</span>
              <strong>{state.stats.score.toLocaleString()}</strong>
            </div>
            <div>
              <span>Lines</span>
              <strong>{state.stats.lines}</strong>
            </div>
            <div>
              <span>Level</span>
              <strong>{state.stats.level}</strong>
            </div>
            {livesLabel && (
              <div>
                <span>Lives</span>
                <strong>{livesLabel}</strong>
              </div>
            )}
            {state.effects.shieldCharges > 0 && (
              <div>
                <span>Shield</span>
                <strong>×{state.effects.shieldCharges}</strong>
              </div>
            )}
          </div>
        </aside>

        <div
          className="board-wrap"
          ref={boardShellRef}
          data-flicker="off"
        >
          <GameBoard
            board={state.board}
            active={state.active}
            ghost={ghost}
            theme={theme}
            cellSize={cellSize}
          />
          <FlickerLayer
            ref={flickerRef}
            shellRef={boardShellRef}
            enabled={flickerEnabled || debugMode}
            width={COLS * cellSize}
            height={ROWS * cellSize}
            onReward={(n) => onFlickerReward?.(n)}
            onUiPhaseChange={(phase) => setFlickerOfferOpen(phase === 'offer')}
            onRestoreTheme={() => {
              // Re-apply current play theme CSS vars after era flicker clears
              const root = document.documentElement;
              root.style.setProperty('--cc-board-bg', theme.boardBg);
              root.style.setProperty('--cc-grid', theme.gridLine);
              root.style.setProperty('--cc-ghost', theme.ghost);
              root.style.setProperty('--cc-garbage', theme.garbage);
              (Object.keys(theme.piece) as (keyof typeof theme.piece)[]).forEach((k) => {
                root.style.setProperty(`--cc-piece-${k}`, theme.piece[k]);
              });
            }}
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
        disabled={state.paused || state.gameOver || inputLocked}
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

      {missionToast && <MissionToast message={missionToast} onDone={onDismissToast} />}

      {showControlsOverlay && (
        <ControlsOverlay bindings={bindings} onDismiss={onDismissControlsOverlay} />
      )}

      {showSettings && (
        <SettingsPanel
          bindings={bindings}
          onBindingsChange={onBindingsChange}
          muted={muted}
          sfxVolume={sfxVolume}
          musicVolume={musicVolume}
          onMuteToggle={onMute}
          onSfxVolume={onSfxVolume}
          onMusicVolume={onMusicVolume}
          onClose={closeSettings}
        />
      )}

      {state.paused && !showSettings && !showControlsOverlay && !inputLocked && !flickerOfferOpen && (
        <div className="overlay">
          <div className="overlay-card">
            <h2>Paused</h2>
            <p className="muted">{pauseHint} to resume</p>
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
            <button type="button" className="menu-btn ghost" onClick={openSettings}>
              Settings & Controls
            </button>
            <button type="button" className="menu-btn ghost" onClick={onExitToMenu}>
              Quit to Menu
            </button>
            {debugMode && (
              <>
                <button
                  type="button"
                  className="menu-btn ghost"
                  onClick={() => {
                    engine.forceLevelComplete();
                    bump();
                  }}
                >
                  Debug: Complete Level
                </button>
                <button
                  type="button"
                  className="menu-btn ghost"
                  onClick={() => {
                    engine.togglePause();
                    onPauseChange(false);
                    bump();
                    window.setTimeout(() => {
                      flickerOfferedRef.current = true;
                      flickerRef.current?.offer({ challenge: 'clear_1' });
                      setFlickerOfferOpen(true);
                    }, 50);
                  }}
                >
                  Debug: Trigger Flicker
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
