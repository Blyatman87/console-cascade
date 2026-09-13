import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  Ability,
  AppScreen,
  GameMode,
  PlayerProgress,
  PowerUpId,
  ThemePalette,
} from './types/models';
import {
  GameEngine,
  createSandboxConfig,
  createHighScoreConfig,
  createCampaignConfig,
} from './game/engine';
import {
  loadProgress,
  saveProgress,
  recordHighScoreRun,
  updateMissionsFromRun,
  resetProgress,
} from './storage/localStorage';
import { getTheme, applyThemeCssVars } from './themes';
import { UNIVERSE_1 } from './data/universes';
import { getAbility } from './data/abilities';
import { getPowerUp } from './data/powerups';
import { storyTitleForLevelIndex, STORYBOARD_U1_BOSS } from './data/storyTitles';
import {
  type ControlBindings,
  loadBindings,
  saveBindings,
} from './input/controls';
import { audio } from './audio/audio';
import { MainMenu } from './components/MainMenu';
import { PlayScreen } from './components/PlayScreen';
import { Shop } from './components/Shop';
import { StoryBlurb } from './components/StoryBlurb';
import { CampaignMap } from './components/CampaignMap';
import { MissionsPanel } from './components/MissionsPanel';
import { AbilityPick } from './components/AbilityPick';
import { GameOver } from './components/GameOver';
import { SettingsPanel } from './components/SettingsPanel';
import { LevelResult } from './components/LevelResult';

const SPAWN_DELAY_MS = 400;
const STING_MS_MIN = 1200;
const STING_MS_MAX = 1800;
const WASH_MS = 450;

function abilityExtras(progress: PlayerProgress) {
  const ability = progress.selectedAbilityId
    ? getAbility(progress.selectedAbilityId)
    : undefined;
  return {
    softDropBoost: ability?.effect === 'soft_drop_boost',
    extraHoldSlots: ability?.effect === 'hold_slot_plus' ? 1 : 0,
    scoreMultiplier: ability?.effect === 'score_multiplier' ? 1.25 : 1,
    startShield: ability?.effect === 'start_shield' ? 1 : 0,
    queueSize: ability?.effect === 'wider_queue' ? 6 : 5,
    spawnDelayMs: SPAWN_DELAY_MS,
  };
}

function easyMissionToast(levelIndex: number): string | null {
  // L1 none; L2+ easy side-mission tip
  if (levelIndex < 1) return null;
  const tips = [
    'Tip: Clear 20 lines in High Score for Warm-Up Sweep (+life).',
    'Tip: Hit 5,000 points in High Score for Arcade Ambition.',
    'Tip: Land three quads in one High Score run for Quad Cadet.',
  ];
  return tips[(levelIndex - 1) % tips.length];
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [mode, setMode] = useState<GameMode>('sandbox');
  const [theme, setTheme] = useState<ThemePalette>(() => getTheme('modern'));
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [tick, setTick] = useState(0);
  const [story, setStory] = useState<{ title: string; blurb: string; chapter?: string } | null>(
    null,
  );
  const [pendingLevelIndex, setPendingLevelIndex] = useState(0);
  const [isBoss, setIsBoss] = useState(false);
  const [missionNotes, setMissionNotes] = useState<string[]>([]);
  const [gameOverMsg, setGameOverMsg] = useState<string | undefined>();
  const [bindings, setBindings] = useState<ControlBindings>(() => loadBindings());
  const [showMenuSettings, setShowMenuSettings] = useState(false);
  const [clearToken, setClearToken] = useState(0);
  const [missionToast, setMissionToast] = useState<string | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [washing, setWashing] = useState(false);
  const [inputLocked, setInputLocked] = useState(false);

  const handledEndRef = useRef(false);
  const engineRef = useRef<GameEngine | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const stingTimerRef = useRef<number | null>(null);
  const washTimerRef = useRef<number | null>(null);

  const persist = useCallback((next: PlayerProgress) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  const bumpClear = useCallback(() => setClearToken((t) => t + 1), []);

  useEffect(() => {
    applyThemeCssVars(theme);
  }, [theme]);

  useEffect(() => {
    audio.setMuted(progress.settings.muted);
    audio.setSfxVolume(progress.settings.sfxVolume);
    audio.setMusicVolume(progress.settings.musicVolume);
  }, [progress.settings]);

  const syncAudioSettings = (patch: Partial<PlayerProgress['settings']>) => {
    const next = {
      ...progressRef.current,
      settings: { ...progressRef.current.settings, ...patch },
    };
    persist(next);
  };

  const finishRunLose = useCallback(() => {
    const e = engineRef.current;
    if (!e || handledEndRef.current) return;
    handledEndRef.current = true;
    setInputLocked(false);
    const stats = { ...e.state.stats };
    const quadsApprox = Math.floor(stats.lines / 4);
    const current = progressRef.current;

    if (mode === 'highscore') {
      let next = recordHighScoreRun(current, {
        score: stats.score,
        lines: stats.lines,
        level: stats.level,
        mode: 'highscore',
      });
      next = {
        ...next,
        highScore: {
          ...next.highScore,
          lives: Math.max(0, next.highScore.lives - 1),
        },
      };
      const { missions, newlyCompleted } = updateMissionsFromRun(next.highScore.missions, {
        score: stats.score,
        lines: stats.lines,
        quadsApprox,
        timeMs: stats.timeMs,
      });
      const notes: string[] = [];
      let carts = next.cartridges;
      let lives = next.highScore.lives;
      const consumables = { ...next.inventory.consumables };
      for (const m of newlyCompleted) {
        notes.push(`Mission complete: ${m.title}`);
        lives += m.rewardLives;
        if (m.rewardCartridges) carts += m.rewardCartridges;
        if (m.rewardPowerUp) {
          consumables[m.rewardPowerUp] = (consumables[m.rewardPowerUp] ?? 0) + 1;
        }
      }
      next = {
        ...next,
        cartridges: carts,
        inventory: { ...next.inventory, consumables, cartridges: carts },
        highScore: { ...next.highScore, missions, lives },
      };
      persist(next);
      setMissionNotes(notes);
      setGameOverMsg(undefined);
      setScreen('gameover');
      return;
    }

    if (mode === 'sandbox') {
      const next = recordHighScoreRun(current, {
        score: stats.score,
        lines: stats.lines,
        level: stats.level,
        mode: 'sandbox',
      });
      persist(next);
      setMissionNotes([]);
      setGameOverMsg('Left sandbox');
      setScreen('gameover');
      return;
    }

    const next: PlayerProgress = {
      ...current,
      campaign: {
        ...current.campaign,
        lives: Math.max(0, e.state.lives),
      },
    };
    persist(next);
    setGameOverMsg('Level failed');
    setMissionNotes([]);
    setScreen('gameover');
  }, [mode, persist]);

  /** Persist campaign win rewards (called when entering result). */
  const applyCampaignWin = useCallback(() => {
    const e = engineRef.current;
    if (!e) return;
    const current = progressRef.current;
    if (isBoss) {
      const next: PlayerProgress = {
        ...current,
        campaign: { ...current.campaign, bossDefeated: true, lives: e.state.lives },
        cartridges: current.cartridges + 200,
      };
      next.inventory = { ...next.inventory, cartridges: next.cartridges };
      persist(next);
      return;
    }
    const lvl = UNIVERSE_1.levels[pendingLevelIndex];
    const completed = new Set(current.campaign.completedLevels);
    completed.add(lvl.id);
    const nextIndex = Math.max(current.campaign.levelIndex, pendingLevelIndex + 1);
    const next: PlayerProgress = {
      ...current,
      cartridges: current.cartridges + lvl.rewardCartridges,
      campaign: {
        ...current.campaign,
        completedLevels: [...completed],
        levelIndex: nextIndex,
        lives: e.state.lives,
      },
    };
    next.inventory = { ...next.inventory, cartridges: next.cartridges };
    persist(next);
  }, [isBoss, pendingLevelIndex, persist]);

  const beginLevelCompleteFlow = useCallback(() => {
    if (handledEndRef.current) return;
    handledEndRef.current = true;
    setInputLocked(true);
    bumpClear();
    engineRef.current?.setSoftDrop(false);

    if (mode === 'sandbox' || mode === 'highscore') {
      // Non-campaign: treat as run end without result card chain
      handledEndRef.current = false;
      setInputLocked(false);
      // re-enter finish as win for highscore? sandbox/HS don't "win" levels typically
      // levelComplete only fires with targetLines — HS/sandbox have null target
      finishRunLose();
      return;
    }

    applyCampaignWin();
    setResultReady(false);
    setScreen('level_result');
    audio.playVictorySting(1.5);

    const stingMs =
      STING_MS_MIN + Math.floor(Math.random() * (STING_MS_MAX - STING_MS_MIN));
    if (stingTimerRef.current) window.clearTimeout(stingTimerRef.current);
    stingTimerRef.current = window.setTimeout(() => setResultReady(true), stingMs);
  }, [mode, applyCampaignWin, bumpClear, finishRunLose]);

  useEffect(() => {
    if (!engine) return;
    if (engine.state.gameOver) finishRunLose();
    else if (engine.state.levelComplete) beginLevelCompleteFlow();
  }, [tick, engine, finishRunLose, beginLevelCompleteFlow]);

  // Skip sting with 0.4s hold
  useEffect(() => {
    if (screen !== 'level_result' || resultReady) return;
    let holdStart: number | null = null;
    let raf = 0;
    const onDown = () => {
      holdStart = performance.now();
      const loop = (now: number) => {
        if (holdStart && now - holdStart >= 400) {
          setResultReady(true);
          if (stingTimerRef.current) window.clearTimeout(stingTimerRef.current);
          return;
        }
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    };
    const onUp = () => {
      holdStart = null;
      cancelAnimationFrame(raf);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      cancelAnimationFrame(raf);
    };
  }, [screen, resultReady]);

  const startEngine = (e: GameEngine) => {
    handledEndRef.current = false;
    engineRef.current = e;
    setEngine(e);
    setTick(0);
    setInputLocked(false);
    setResultReady(false);
    setWashing(false);
    bumpClear();
    setScreen('playing');
  };

  const startSandbox = () => {
    setMode('sandbox');
    setIsBoss(false);
    setTheme(getTheme('modern'));
    setMissionToast(null);
    startEngine(new GameEngine(createSandboxConfig(abilityExtras(progress))));
  };

  const startHighScore = () => {
    if (progress.highScore.lives <= 0) {
      alert('No High Score lives left. Complete side missions or reset progress.');
      return;
    }
    setMode('highscore');
    setIsBoss(false);
    setTheme(getTheme('modern'));
    setMissionToast(null);
    startEngine(
      new GameEngine(
        createHighScoreConfig({
          ...abilityExtras(progress),
          lives: Math.min(3, progress.highScore.lives),
        }),
      ),
    );
  };

  const openCampaign = () => {
    setMode('campaign');
    setTheme(getTheme('cartridge_dawn'));
    setScreen('campaign_map');
  };

  const beginCampaignLevel = (levelIndex: number) => {
    const lvl = UNIVERSE_1.levels[levelIndex];
    const storyTitle = storyTitleForLevelIndex(levelIndex);
    setPendingLevelIndex(levelIndex);
    setIsBoss(false);
    setStory({
      title: storyTitle,
      blurb: lvl.storyBlurb,
      chapter: `${UNIVERSE_1.eraLabel} — ${lvl.title}`,
    });
    setMissionToast(easyMissionToast(levelIndex));
    setScreen('story');
  };

  const beginBoss = () => {
    setIsBoss(true);
    setStory({
      title: STORYBOARD_U1_BOSS,
      blurb: UNIVERSE_1.boss.storyBlurb,
      chapter: UNIVERSE_1.boss.title,
    });
    setMissionToast(easyMissionToast(10));
    setScreen('boss_intro');
  };

  const launchPendingLevel = () => {
    bumpClear();
    const extras = abilityExtras(progress);
    if (isBoss) {
      startEngine(
        new GameEngine(
          createCampaignConfig(UNIVERSE_1.boss.startLevel, 25, 4, 'garbage_rain', {
            ...extras,
            lives: Math.max(1, progress.campaign.lives),
          }),
        ),
      );
      return;
    }
    const lvl = UNIVERSE_1.levels[pendingLevelIndex];
    startEngine(
      new GameEngine(
        createCampaignConfig(
          lvl.startLevel,
          lvl.targetLines,
          lvl.garbageRows,
          lvl.disruption ?? 'none',
          { ...extras, lives: Math.max(1, progress.campaign.lives) },
        ),
      ),
    );
  };

  const usePowerUp = (id: PowerUpId): boolean => {
    const e = engineRef.current;
    if (!e) return false;
    const current = progressRef.current;
    const count = current.inventory.consumables[id] ?? 0;
    if (count <= 0) return false;
    const ok = e.usePowerUp(id);
    if (!ok) return false;
    const consumables = { ...current.inventory.consumables, [id]: count - 1 };
    persist({
      ...current,
      inventory: { ...current.inventory, consumables },
    });
    return true;
  };

  const buyPowerUp = (id: PowerUpId) => {
    const def = getPowerUp(id);
    if (!def) return;
    const current = progressRef.current;
    if (current.cartridges < def.shopCost) return;
    const consumables = {
      ...current.inventory.consumables,
      [id]: (current.inventory.consumables[id] ?? 0) + 1,
    };
    const carts = current.cartridges - def.shopCost;
    persist({
      ...current,
      cartridges: carts,
      inventory: { ...current.inventory, consumables, cartridges: carts },
    });
  };

  const onPickAbility = (ability: Ability) => {
    const current = progressRef.current;
    const unlocked = current.unlockedAbilities.includes(ability.id)
      ? current.unlockedAbilities
      : [...current.unlockedAbilities, ability.id];
    persist({
      ...current,
      unlockedAbilities: unlocked,
      selectedAbilityId: ability.id,
    });
    setScreen('campaign_map');
  };

  const retry = () => {
    bumpClear();
    if (mode === 'sandbox') startSandbox();
    else if (mode === 'highscore') startHighScore();
    else if (isBoss) {
      setScreen('boss_intro');
      setInputLocked(false);
    } else beginCampaignLevel(pendingLevelIndex);
  };

  const goNextAfterResult = () => {
    bumpClear();
    setWashing(true);
    setScreen('wash');
    if (washTimerRef.current) window.clearTimeout(washTimerRef.current);
    washTimerRef.current = window.setTimeout(() => {
      setWashing(false);
      if (isBoss) {
        setEngine(null);
        engineRef.current = null;
        setScreen('boss_victory');
        return;
      }
      const nextIdx = pendingLevelIndex + 1;
      if (nextIdx < UNIVERSE_1.levels.length) {
        // Interstitial with storyboard title → next level
        beginCampaignLevel(nextIdx);
      } else {
        // All levels done — shop then boss
        setEngine(null);
        engineRef.current = null;
        setScreen('shop');
      }
    }, WASH_MS);
  };

  const levelTitle =
    isBoss
      ? UNIVERSE_1.boss.name
      : mode === 'campaign'
        ? UNIVERSE_1.levels[pendingLevelIndex]?.title
        : mode === 'sandbox'
          ? 'Sandbox Cascade'
          : 'High Score Run';

  const settingsProps = {
    bindings,
    onBindingsChange: (b: ControlBindings) => {
      setBindings(b);
      saveBindings(b);
      bumpClear();
    },
    muted: progress.settings.muted,
    sfxVolume: progress.settings.sfxVolume,
    musicVolume: progress.settings.musicVolume,
    onMuteToggle: () =>
      syncAudioSettings({ muted: !progressRef.current.settings.muted }),
    onSfxVolume: (v: number) => syncAudioSettings({ sfxVolume: v }),
    onMusicVolume: (v: number) => syncAudioSettings({ musicVolume: v }),
  };

  return (
    <div className="app-root">
      {screen === 'menu' && (
        <MainMenu
          progress={progress}
          onSandbox={startSandbox}
          onHighScore={startHighScore}
          onCampaign={openCampaign}
          onMissions={() => setScreen('missions')}
          onSettings={() => setShowMenuSettings(true)}
          onMuteToggle={() =>
            persist({
              ...progress,
              settings: { ...progress.settings, muted: !progress.settings.muted },
            })
          }
          onReset={() => persist(resetProgress())}
        />
      )}

      {showMenuSettings && (
        <SettingsPanel {...settingsProps} onClose={() => setShowMenuSettings(false)} />
      )}

      {screen === 'missions' && (
        <MissionsPanel progress={progress} onBack={() => setScreen('menu')} />
      )}

      {screen === 'campaign_map' && (
        <CampaignMap
          universe={UNIVERSE_1}
          progress={progress}
          onSelectLevel={beginCampaignLevel}
          onBoss={beginBoss}
          onShop={() => setScreen('shop')}
          onBack={() => {
            setTheme(getTheme('modern'));
            setScreen('menu');
          }}
        />
      )}

      {(screen === 'story' || screen === 'boss_intro') && story && (
        <StoryBlurb
          title={story.title}
          blurb={story.blurb}
          chapter={story.chapter}
          continueLabel={screen === 'boss_intro' ? 'Face the Maw' : 'Begin Level'}
          onContinue={launchPendingLevel}
        />
      )}

      {screen === 'shop' && (
        <Shop
          progress={progress}
          title="Between Levels — Cartridge Shop"
          onBuy={buyPowerUp}
          onContinue={() => {
            if (progress.campaign.bossDefeated && !progress.selectedAbilityId) {
              setScreen('ability_pick');
            } else {
              setScreen('campaign_map');
            }
          }}
        />
      )}

      {screen === 'boss_victory' && (
        <StoryBlurb
          title="Maw Silenced"
          blurb="The maze collapses into phosphor dust. Cartridge Dawn yields its first permanent gift — choose carefully."
          chapter="Universe 1 Complete"
          continueLabel="Claim Ability"
          onContinue={() => setScreen('ability_pick')}
        />
      )}

      {screen === 'ability_pick' && <AbilityPick onPick={onPickAbility} />}

      {(screen === 'playing' || screen === 'level_result' || screen === 'wash') && engine && (
        <PlayScreen
          engine={engine}
          theme={theme}
          inventory={progress.inventory}
          mode={mode}
          levelTitle={levelTitle}
          livesLabel={mode === 'sandbox' ? '∞' : String(engine.state.lives)}
          onUsePowerUp={usePowerUp}
          onPauseChange={() => {
            bumpClear();
            setTick((t) => t + 1);
          }}
          onMute={() =>
            persist({
              ...progress,
              settings: { ...progress.settings, muted: !progress.settings.muted },
            })
          }
          muted={progress.settings.muted}
          sfxVolume={progress.settings.sfxVolume}
          musicVolume={progress.settings.musicVolume}
          onSfxVolume={(v) => syncAudioSettings({ sfxVolume: v })}
          onMusicVolume={(v) => syncAudioSettings({ musicVolume: v })}
          onExitToMenu={() => {
            setEngine(null);
            engineRef.current = null;
            setTheme(getTheme(mode === 'campaign' ? 'cartridge_dawn' : 'modern'));
            setScreen(mode === 'campaign' ? 'campaign_map' : 'menu');
            bumpClear();
          }}
          tick={tick}
          setTick={setTick}
          bindings={bindings}
          onBindingsChange={(b) => {
            setBindings(b);
            saveBindings(b);
            bumpClear();
          }}
          showControlsOverlay={
            screen === 'playing' && !progress.settings.seenControlsOverlay
          }
          onDismissControlsOverlay={() => {
            syncAudioSettings({ seenControlsOverlay: true });
            bumpClear();
          }}
          missionToast={screen === 'playing' ? missionToast : null}
          onDismissToast={() => setMissionToast(null)}
          inputLocked={inputLocked || screen === 'level_result' || screen === 'wash'}
          clearToken={clearToken}
          debugMode={typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')}
        />
      )}

      {screen === 'level_result' && engine && (
        <LevelResult
          stats={engine.state.stats}
          levelTitle={levelTitle}
          storyTitle={
            isBoss
              ? STORYBOARD_U1_BOSS
              : storyTitleForLevelIndex(pendingLevelIndex)
          }
          ready={resultReady}
          hasNext={!isBoss && pendingLevelIndex + 1 < UNIVERSE_1.levels.length}
          onNext={goNextAfterResult}
          onRetry={() => {
            if (stingTimerRef.current) window.clearTimeout(stingTimerRef.current);
            setInputLocked(false);
            retry();
          }}
        />
      )}

      {screen === 'wash' && washing && <div className="wash-overlay" aria-hidden />}

      {screen === 'gameover' && engine && (
        <GameOver
          stats={engine.state.stats}
          mode={mode}
          message={gameOverMsg}
          missionNotes={missionNotes}
          onRetry={retry}
          onMenu={() => {
            setEngine(null);
            setTheme(getTheme('modern'));
            setScreen('menu');
          }}
        />
      )}
    </div>
  );
}
