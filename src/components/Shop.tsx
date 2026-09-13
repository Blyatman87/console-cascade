import type { Inventory, PowerUpId, PlayerProgress } from '../types/models';
import { POWERUPS } from '../data/powerups';

interface Props {
  progress: PlayerProgress;
  onBuy: (id: PowerUpId) => void;
  onContinue: () => void;
  title?: string;
}

export function Shop({ progress, onBuy, onContinue, title = 'Cartridge Shop' }: Props) {
  const inv: Inventory = progress.inventory;

  return (
    <div className="screen shop-screen">
      <h2>{title}</h2>
      <p className="muted">
        Spend cartridges on one-shot power-ups. Stock carries between levels.
      </p>
      <div className="shop-balance">Cartridges: <strong>{progress.cartridges}</strong></div>
      <div className="shop-grid">
        {POWERUPS.filter((p) => p.kind === 'one_shot').map((p) => {
          const owned = inv.consumables[p.id] ?? 0;
          const canAfford = progress.cartridges >= p.shopCost;
          return (
            <div key={p.id} className="shop-card">
              <div className="shop-icon">{p.icon}</div>
              <h3>{p.name}</h3>
              <p>{p.description}</p>
              <div className="shop-meta">
                <span>Owned ×{owned}</span>
                <span>{p.shopCost} cart</span>
              </div>
              <button
                type="button"
                disabled={!canAfford}
                onClick={() => onBuy(p.id)}
              >
                Buy
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="menu-btn primary" onClick={onContinue}>
        Continue
      </button>
    </div>
  );
}
