import type { Ability } from '../types/models';
import { BOSS_ABILITY_CHOICES } from '../data/abilities';

interface Props {
  onPick: (ability: Ability) => void;
}

export function AbilityPick({ onPick }: Props) {
  return (
    <div className="screen ability-screen">
      <p className="eyebrow">Boss Reward</p>
      <h2>Choose a Permanent Ability</h2>
      <p className="muted">The Maw yields one gift. Choose wisely — this sticks forever.</p>
      <div className="ability-grid">
        {BOSS_ABILITY_CHOICES.map((a) => (
          <button
            key={a.id}
            type="button"
            className="ability-card"
            onClick={() => onPick(a)}
          >
            <div className="ability-icon">{a.icon}</div>
            <h3>{a.name}</h3>
            <p>{a.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
