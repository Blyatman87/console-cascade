import type { UniverseMeta } from '../data/universes';

interface Props {
  universes: UniverseMeta[];
  unlocked: number[];
  onSelect: (universeIndex: number) => void;
  onBack: () => void;
}

export function UniverseSelect({ universes, unlocked, onSelect, onBack }: Props) {
  const unlockedSet = new Set(unlocked);

  return (
    <div className="screen universe-select">
      <p className="eyebrow">Multi-Universe</p>
      <h2>Select Era</h2>
      <p className="muted">
        Modern sleek is default play. Campaign eras unlock as you silence each boss — homage names only.
      </p>

      <div className="universe-grid">
        {universes.map((u) => {
          const isOpen = unlockedSet.has(u.index);
          return (
            <button
              key={u.id}
              type="button"
              className={`universe-card ${isOpen ? 'open' : 'locked'} ${u.index === 1 ? 'featured' : ''}`}
              disabled={!isOpen}
              onClick={() => onSelect(u.index)}
            >
              <span className="uni-index">U{u.index}</span>
              <span className="uni-name">{u.name}</span>
              <span className="uni-era">{u.eraLabel}</span>
              <span className="uni-status">{isOpen ? 'Enter' : '🔒 Locked'}</span>
              {!isOpen && u.unlockHint && (
                <span className="uni-hint muted">{u.unlockHint}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="menu-actions row">
        <button type="button" className="menu-btn ghost" onClick={onBack}>
          Main Menu
        </button>
      </div>
    </div>
  );
}
