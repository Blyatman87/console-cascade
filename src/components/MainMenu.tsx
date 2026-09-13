import type { PlayerProgress } from '../types/models';

interface Props {
  progress: PlayerProgress;
  onSandbox: () => void;
  onHighScore: () => void;
  onCampaign: () => void;
  onMissions: () => void;
  onMuteToggle: () => void;
  onReset: () => void;
}

export function MainMenu({
  progress,
  onSandbox,
  onHighScore,
  onCampaign,
  onMissions,
  onMuteToggle,
  onReset,
}: Props) {
  return (
    <div className="screen menu-screen">
      <div className="menu-hero">
        <p className="eyebrow">Cascade Protocol // MVP</p>
        <h1 className="game-title">Console Cascade</h1>
        <p className="tagline">
          Stack, clear, and cascade through eras of living-room legends — homage only, forever.
        </p>
      </div>

      <div className="menu-stats">
        <div className="stat-chip">
          <span>Best</span>
          <strong>{progress.highScore.bestScore.toLocaleString()}</strong>
        </div>
        <div className="stat-chip">
          <span>Cartridges</span>
          <strong>{progress.cartridges}</strong>
        </div>
        <div className="stat-chip">
          <span>HS Lives</span>
          <strong>{progress.highScore.lives}</strong>
        </div>
      </div>

      <div className="menu-actions">
        <button type="button" className="menu-btn primary" onClick={onSandbox}>
          <span className="btn-title">Sandbox</span>
          <span className="btn-sub">Unlimited lives · endless leveling</span>
        </button>
        <button type="button" className="menu-btn" onClick={onHighScore}>
          <span className="btn-title">High Score</span>
          <span className="btn-sub">Limited lives · missions · local records</span>
        </button>
        <button type="button" className="menu-btn campaign" onClick={onCampaign}>
          <span className="btn-title">Campaign</span>
          <span className="btn-sub">Cartridge Dawn Era · Maw of the Maze</span>
        </button>
        <button type="button" className="menu-btn ghost" onClick={onMissions}>
          Side Missions
        </button>
      </div>

      <div className="menu-footer">
        <button type="button" className="linkish" onClick={onMuteToggle}>
          {progress.settings.muted ? 'Unmute' : 'Mute'}
        </button>
        <button
          type="button"
          className="linkish danger"
          onClick={() => {
            if (confirm('Reset all local progress?')) onReset();
          }}
        >
          Reset Progress
        </button>
      </div>
    </div>
  );
}
