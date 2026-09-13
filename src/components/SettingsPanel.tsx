import { useEffect, useState } from 'react';
import {
  ACTION_LABELS,
  CONTROL_ACTIONS,
  type ControlAction,
  type ControlBindings,
  applyRebind,
  formatCode,
  resetBindings,
  saveBindings,
  findBindingConflict,
} from '../input/controls';

interface Props {
  bindings: ControlBindings;
  onBindingsChange: (b: ControlBindings) => void;
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
  onMuteToggle: () => void;
  onSfxVolume: (v: number) => void;
  onMusicVolume: (v: number) => void;
  onClose: () => void;
  title?: string;
}

type Listening = { action: ControlAction; slot: 'primary' | 'alt' } | null;

export function SettingsPanel({
  bindings,
  onBindingsChange,
  muted,
  sfxVolume,
  musicVolume,
  onMuteToggle,
  onSfxVolume,
  onMusicVolume,
  onClose,
  title = 'Settings',
}: Props) {
  const [listening, setListening] = useState<Listening>(null);
  const [conflictNote, setConflictNote] = useState<string | null>(null);

  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.code === 'Escape' && listening.slot === 'alt') {
        // Esc while rebinding alt clears alt (except pause primary uses Esc)
        const next = applyRebind(bindings, listening.action, 'alt', null);
        saveBindings(next);
        onBindingsChange(next);
        setListening(null);
        setConflictNote('Alt cleared');
        return;
      }
      if (e.code === 'Escape') {
        setListening(null);
        return;
      }
      const conflict = findBindingConflict(
        bindings,
        e.code,
        listening.action,
        listening.slot,
      );
      const next = applyRebind(bindings, listening.action, listening.slot, e.code);
      saveBindings(next);
      onBindingsChange(next);
      setListening(null);
      if (conflict) {
        setConflictNote(
          `${formatCode(e.code)} moved from ${ACTION_LABELS[conflict.action]}`,
        );
      } else {
        setConflictNote(null);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [listening, bindings, onBindingsChange]);

  return (
    <div className="overlay settings-overlay" role="dialog" aria-modal="true">
      <div className="overlay-card settings-card">
        <h2>{title}</h2>
        <p className="muted">
          Click a bind, then press a key. Conflicts auto-clear the other slot. Hard Drop
          defaults to Space — rebind it if Space is sticky for you.
        </p>

        <div className="settings-section">
          <h3>Audio</h3>
          <label className="settings-row">
            <span>Mute</span>
            <button type="button" className="menu-btn ghost compact" onClick={onMuteToggle}>
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </label>
          <label className="settings-row">
            <span>SFX {Math.round(sfxVolume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={sfxVolume}
              onChange={(e) => onSfxVolume(Number(e.target.value))}
            />
          </label>
          <label className="settings-row">
            <span>Music {Math.round(musicVolume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(e) => onMusicVolume(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>Controls</h3>
          {conflictNote && <p className="conflict-note">{conflictNote}</p>}
          <div className="binds-table">
            {CONTROL_ACTIONS.map((action) => (
              <div className="bind-row" key={action}>
                <span className="bind-label">{ACTION_LABELS[action]}</span>
                <button
                  type="button"
                  className={`bind-key ${listening?.action === action && listening.slot === 'primary' ? 'listening' : ''}`}
                  onClick={() => setListening({ action, slot: 'primary' })}
                >
                  {listening?.action === action && listening.slot === 'primary'
                    ? '…'
                    : formatCode(bindings[action].primary)}
                </button>
                <button
                  type="button"
                  className={`bind-key alt ${listening?.action === action && listening.slot === 'alt' ? 'listening' : ''}`}
                  onClick={() => setListening({ action, slot: 'alt' })}
                  title="Alt (optional — Esc clears)"
                >
                  {listening?.action === action && listening.slot === 'alt'
                    ? '…'
                    : formatCode(bindings[action].alt)}
                </button>
              </div>
            ))}
          </div>
          {listening && (
            <p className="listening-hint">
              Press a key for {ACTION_LABELS[listening.action]} (
              {listening.slot}){listening.slot === 'alt' ? ' · Esc clears' : ' · Esc cancels'}
            </p>
          )}
        </div>

        <div className="menu-actions row">
          <button
            type="button"
            className="menu-btn ghost"
            onClick={() => {
              const next = resetBindings();
              onBindingsChange(next);
              setConflictNote('Defaults restored');
            }}
          >
            Reset defaults
          </button>
          <button type="button" className="menu-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
