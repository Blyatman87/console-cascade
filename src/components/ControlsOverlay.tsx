import {
  ACTION_LABELS,
  CONTROL_ACTIONS,
  type ControlBindings,
  formatCode,
} from '../input/controls';

interface Props {
  bindings: ControlBindings;
  onDismiss: () => void;
}

export function ControlsOverlay({ bindings, onDismiss }: Props) {
  return (
    <div className="overlay controls-first-run" role="dialog" aria-modal="true">
      <div className="overlay-card">
        <h2>Controls</h2>
        <p className="muted">Remappable anytime from Settings (menu or pause).</p>
        <ul className="controls-list">
          {CONTROL_ACTIONS.map((a) => (
            <li key={a}>
              <strong>{ACTION_LABELS[a]}</strong>
              <span>
                {formatCode(bindings[a].primary)}
                {bindings[a].alt ? ` / ${formatCode(bindings[a].alt)}` : ''}
              </span>
            </li>
          ))}
        </ul>
        <button type="button" className="menu-btn primary" onClick={onDismiss}>
          Got it
        </button>
      </div>
    </div>
  );
}
