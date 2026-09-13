import type { PlayerProgress, HighScoreRun, Mission } from '../types/models';
import { createDefaultMissions } from '../data/missions';

const STORAGE_KEY = 'console-cascade-progress-v1';

export function createDefaultProgress(): PlayerProgress {
  return {
    version: 1,
    cartridges: 50,
    inventory: {
      consumables: {
        slow_time: 2,
        clear_bottom: 1,
        row_nuke: 1,
        top_out_shield: 1,
      },
      permanents: [],
      cartridges: 50,
    },
    unlockedAbilities: [],
    selectedAbilityId: null,
    campaign: {
      universeIndex: 1,
      levelIndex: 0,
      completedLevels: [],
      bossDefeated: false,
      lives: 5,
    },
    highScore: {
      bestScore: 0,
      bestLines: 0,
      bestLevel: 0,
      runs: [],
      missions: createDefaultMissions(),
      lives: 5,
    },
    settings: {
      muted: false,
    },
  };
}

export function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as PlayerProgress;
    if (!parsed.version) return createDefaultProgress();
    // Ensure missions exist
    if (!parsed.highScore?.missions?.length) {
      parsed.highScore.missions = createDefaultMissions();
    }
    return parsed;
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(progress: PlayerProgress): void {
  try {
    progress.inventory.cartridges = progress.cartridges;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore quota errors
  }
}

export function recordHighScoreRun(
  progress: PlayerProgress,
  run: Omit<HighScoreRun, 'date'>,
): PlayerProgress {
  const next = { ...progress };
  const entry: HighScoreRun = { ...run, date: new Date().toISOString() };
  next.highScore = {
    ...next.highScore,
    runs: [entry, ...next.highScore.runs].slice(0, 20),
    bestScore: Math.max(next.highScore.bestScore, run.score),
    bestLines: Math.max(next.highScore.bestLines, run.lines),
    bestLevel: Math.max(next.highScore.bestLevel, run.level),
  };
  return next;
}

export function updateMissionsFromRun(
  missions: Mission[],
  stats: { score: number; lines: number; quadsApprox: number; timeMs: number },
): { missions: Mission[]; newlyCompleted: Mission[] } {
  const newlyCompleted: Mission[] = [];
  const updated = missions.map((m) => {
    if (m.completed) return m;
    let done = false;
    switch (m.goalType) {
      case 'clear_lines':
        done = stats.lines >= m.goalValue;
        break;
      case 'reach_score':
        done = stats.score >= m.goalValue;
        break;
      case 'survive_time':
        done = stats.timeMs >= m.goalValue;
        break;
      case 'clear_quads':
        done = stats.quadsApprox >= m.goalValue;
        break;
    }
    if (done) {
      const completed = { ...m, completed: true };
      newlyCompleted.push(completed);
      return completed;
    }
    return m;
  });
  return { missions: updated, newlyCompleted };
}

export function resetProgress(): PlayerProgress {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}
