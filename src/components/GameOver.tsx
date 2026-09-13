import type { GameStats, GameMode } from '../types/models';

interface Props {
  stats: GameStats;
  mode: GameMode;
  message?: string;
  missionNotes?: string[];
  onRetry: () => void;
  onMenu: () => void;
}

export function GameOver({ stats, mode, message, missionNotes, onRetry, onMenu }: Props) {
  return (
    <div className="screen gameover-screen">
      <h2>{message ?? (mode === 'campaign' ? 'Cascade Broken' : 'Game Over')}</h2>
      <div className="stats-grid">
        <div><span>Score</span><strong>{stats.score.toLocaleString()}</strong></div>
        <div><span>Lines</span><strong>{stats.lines}</strong></div>
        <div><span>Level</span><strong>{stats.level}</strong></div>
        <div><span>Pieces</span><strong>{stats.piecesPlaced}</strong></div>
        <div><span>Max Combo</span><strong>{stats.maxCombo}</strong></div>
        <div><span>Time</span><strong>{Math.floor(stats.timeMs / 1000)}s</strong></div>
      </div>
      {missionNotes && missionNotes.length > 0 && (
        <div className="mission-notes">
          {missionNotes.map((n, i) => (
            <p key={i}>{n}</p>
          ))}
        </div>
      )}
      <div className="menu-actions row">
        <button type="button" className="menu-btn primary" onClick={onRetry}>
          Retry
        </button>
        <button type="button" className="menu-btn ghost" onClick={onMenu}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
