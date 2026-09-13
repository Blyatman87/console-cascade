import type { Mission, PlayerProgress } from '../types/models';

interface Props {
  progress: PlayerProgress;
  onBack: () => void;
}

export function MissionsPanel({ progress, onBack }: Props) {
  const missions: Mission[] = progress.highScore.missions;
  return (
    <div className="screen missions-screen">
      <h2>Side Missions</h2>
      <p className="muted">
        Complete these during High Score runs to unlock lives and power-ups.
      </p>
      <div className="mission-list">
        {missions.map((m) => (
          <div key={m.id} className={`mission-card ${m.completed ? 'done' : ''}`}>
            <div className="mission-head">
              <h3>{m.title}</h3>
              <span>{m.completed ? 'Complete' : 'Open'}</span>
            </div>
            <p>{m.description}</p>
            <div className="mission-rewards">
              {m.rewardLives > 0 && <span>+{m.rewardLives} life</span>}
              {m.rewardPowerUp && <span>+{m.rewardPowerUp}</span>}
              {m.rewardCartridges ? <span>+{m.rewardCartridges} cart</span> : null}
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="menu-btn primary" onClick={onBack}>
        Back
      </button>
    </div>
  );
}
