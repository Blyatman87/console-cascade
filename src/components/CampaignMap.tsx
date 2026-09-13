import type { Universe, PlayerProgress } from '../types/models';

interface Props {
  universe: Universe;
  progress: PlayerProgress;
  onSelectLevel: (levelIndex: number) => void;
  onBoss: () => void;
  onShop: () => void;
  onBack: () => void;
}

export function CampaignMap({
  universe,
  progress,
  onSelectLevel,
  onBoss,
  onShop,
  onBack,
}: Props) {
  const completed = new Set(progress.campaign.completedLevels);
  const nextIdx = progress.campaign.levelIndex;

  return (
    <div className="screen campaign-map">
      <p className="eyebrow">Universe {universe.index}</p>
      <h2>{universe.eraLabel}</h2>
      <p className="muted">{universe.description}</p>
      <div className="map-meta">
        <span>Lives: {progress.campaign.lives}</span>
        <span>Cartridges: {progress.cartridges}</span>
      </div>

      <div className="level-list">
        {universe.levels.map((lvl, i) => {
          const done = completed.has(lvl.id);
          const unlocked = i <= nextIdx || done;
          return (
            <button
              key={lvl.id}
              type="button"
              className={`level-row ${done ? 'done' : ''} ${i === nextIdx && !done ? 'current' : ''}`}
              disabled={!unlocked}
              onClick={() => onSelectLevel(i)}
            >
              <span className="lvl-num">{lvl.index}</span>
              <span className="lvl-title">{lvl.title}</span>
              <span className="lvl-status">{done ? '✓' : unlocked ? 'Play' : '🔒'}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`level-row boss ${progress.campaign.bossDefeated ? 'done' : ''}`}
          disabled={nextIdx < universe.levels.length && !progress.campaign.bossDefeated}
          onClick={onBoss}
        >
          <span className="lvl-num">★</span>
          <span className="lvl-title">{universe.boss.name}</span>
          <span className="lvl-status">
            {progress.campaign.bossDefeated ? '✓' : 'Boss'}
          </span>
        </button>
      </div>

      <div className="menu-actions row">
        <button type="button" className="menu-btn ghost" onClick={onShop}>
          Shop
        </button>
        <button type="button" className="menu-btn ghost" onClick={onBack}>
          Universe Select
        </button>
      </div>
    </div>
  );
}
