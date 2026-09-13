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
import { MainMenu } from './components/MainMenu';
import { PlayScreen } from './components/PlayScreen';
import { Shop } from './components/Shop';
import { StoryBlurb } from './components/StoryBlurb';
import { CampaignMap } from './components/CampaignMap';
import { MissionsPanel } from './components/MissionsPanel';
import { AbilityPick } from './components/AbilityPick';
import { GameOver } from './components/GameOver';

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
  };
}

export default function App() {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [screen, setScreen] = useState<AppScreen>('menu');
  const [mode, setMode] = useState<GameMode>('sandbox');
  const [theme, setTheme] = useState<ThemePalette>(() => getTheme('modern'));
  const [engine, setEngine] = useState<GameEngine | null>(null);
  const [tick, setTick] = useState(0);
  const [story, setStory] = useState<{ title: string; blurb: string; chapter?: string } | null>(null);
  const [pendingLevelIndex, setPendingLevelIndex] = useState(0);
  const [isBoss, setIsBoss] = useState(false);
  const [missionNotes, setMissionNotes] = useState<string[]>([]);
  const [gameOverMsg, setGameOverMsg] = useState<string | undefined>();
  const handledEndRef = useRef(false);
  const engineRef = useRef<GameEngine | null>(null);
  const progressRef = useRef(progress);
  progressRef.current = progress;

  const persist = useCallback((next: PlayerProgress) => {
    setProgress(next);
    saveProgress(next);
  }, []);

  useEffect(() => {
    applyThemeCssVars(theme);
  }, [theme]);

  const finishRun = useCallback(
    (won: boolean) => {
      const e = engineRef.current;
      if (!e || handledEndRef.current) return;
      handledEndRef.current = true;
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
            lives: Math.max(0, next.highScore.lives - (won ? 0 : 1)),
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

      // Campaign
      if (won) {
        if (isBoss) {
          const next: PlayerProgress = {
            ...current,
            campaign: { ...current.campaign, bossDefeated: true, lives: e.state.lives },
            cartridges: current.cartridges + 200,
          };
          next.inventory = { ...next.inventory, cartridges: next.cartridges };
          persist(next);
          setScreen('boss_victory');
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
        setScreen('shop');
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
    },
    [mode, isBoss, pendingLevelIndex, persist],
  );

  useEffect(() => {
    if (!engine) return;
    if (engine.state.gameOver) finishRun(false);
    else if (engine.state.levelComplete) finishRun(true);
  }, [tick, engine, finishRun]);

  const startEngine = (e: GameEngine) => {
    handledEndRef.current = false;
    engineRef.current = e;
    setEngine(e);
    setTick(0);
    setScreen('playing');
  };

  const startSandbox = () => {
    setMode('sandbox');
    setIsBoss(false);
    setTheme(getTheme('modern'));
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
    setPendingLevelIndex(levelIndex);
    setIsBoss(false);
    setStory({
      title: lvl.title,
      blurb: lvl.storyBlurb,
      chapter: `${UNIVERSE_1.eraLabel} — Level ${lvl.index}`,
    });
    setScreen('story');
  };

  const beginBoss = () => {
    setIsBoss(true);
    setStory({
      title: UNIVERSE_1.boss.name,
      blurb: UNIVERSE_1.boss.storyBlurb,
      chapter: UNIVERSE_1.boss.title,
    });
    setScreen('boss_intro');
  };

  const launchPendingLevel = () => {
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
    if (mode === 'sandbox') startSandbox();
    else if (mode === 'highscore') startHighScore();
    else if (isBoss) setScreen('boss_intro');
    else beginCampaignLevel(pendingLevelIndex);
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
          onMuteToggle={() =>
            persist({
              ...progress,
              settings: { muted: !progress.settings.muted },
            })
          }
          onReset={() => persist(resetProgress())}
        />
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

      {screen === 'playing' && engine && (
        <PlayScreen
          engine={engine}
          theme={theme}
          inventory={progress.inventory}
          mode={mode}
          levelTitle={
            isBoss
              ? UNIVERSE_1.boss.name
              : mode === 'campaign'
                ? UNIVERSE_1.levels[pendingLevelIndex]?.title
                : mode === 'sandbox'
                  ? 'Sandbox Cascade'
                  : 'High Score Run'
          }
          livesLabel={mode === 'sandbox' ? '∞' : String(engine.state.lives)}
          onUsePowerUp={usePowerUp}
          onPauseChange={() => setTick((t) => t + 1)}
          onMute={() =>
            persist({
              ...progress,
              settings: { muted: !progress.settings.muted },
            })
          }
          muted={progress.settings.muted}
          onExitToMenu={() => {
            setEngine(null);
            engineRef.current = null;
            setTheme(getTheme(mode === 'campaign' ? 'cartridge_dawn' : 'modern'));
            setScreen(mode === 'campaign' ? 'campaign_map' : 'menu');
          }}
          tick={tick}
          setTick={setTick}
        />
      )}

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
