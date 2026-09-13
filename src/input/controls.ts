/** Remappable controls — Game Feel spec (cc.controls.v1) */

export type ControlAction =
  | 'moveLeft'
  | 'moveRight'
  | 'softDrop'
  | 'hardDrop'
  | 'rotateCW'
  | 'rotateCCW'
  | 'hold'
  | 'pause'
  | 'mute';

export type KeyCode = string;

export interface KeyBinding {
  primary: KeyCode;
  alt: KeyCode | null;
}

export type ControlBindings = Record<ControlAction, KeyBinding>;

export const CONTROL_ACTIONS: ControlAction[] = [
  'moveLeft',
  'moveRight',
  'softDrop',
  'hardDrop',
  'rotateCW',
  'rotateCCW',
  'hold',
  'pause',
  'mute',
];

export const ACTION_LABELS: Record<ControlAction, string> = {
  moveLeft: 'Move Left',
  moveRight: 'Move Right',
  softDrop: 'Soft Drop',
  hardDrop: 'Hard Drop',
  rotateCW: 'Rotate CW',
  rotateCCW: 'Rotate CCW',
  hold: 'Hold',
  pause: 'Pause',
  mute: 'Mute',
};

/** Defaults: Arrow + WASD; Hard Drop Space primary, no alt required. */
export const DEFAULT_BINDINGS: ControlBindings = {
  moveLeft: { primary: 'ArrowLeft', alt: 'KeyA' },
  moveRight: { primary: 'ArrowRight', alt: 'KeyD' },
  softDrop: { primary: 'ArrowDown', alt: 'KeyS' },
  hardDrop: { primary: 'Space', alt: null },
  rotateCW: { primary: 'ArrowUp', alt: 'KeyW' },
  rotateCCW: { primary: 'KeyZ', alt: 'ControlLeft' },
  hold: { primary: 'KeyC', alt: 'ShiftLeft' },
  pause: { primary: 'KeyP', alt: 'Escape' },
  mute: { primary: 'KeyM', alt: null },
};

const STORAGE_KEY = 'cc.controls.v1';

export function cloneBindings(b: ControlBindings): ControlBindings {
  const out = {} as ControlBindings;
  for (const a of CONTROL_ACTIONS) {
    out[a] = { primary: b[a].primary, alt: b[a].alt };
  }
  return out;
}

export function loadBindings(): ControlBindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneBindings(DEFAULT_BINDINGS);
    const parsed = JSON.parse(raw) as Partial<ControlBindings>;
    const merged = cloneBindings(DEFAULT_BINDINGS);
    for (const a of CONTROL_ACTIONS) {
      const entry = parsed[a];
      if (entry?.primary) {
        merged[a] = { primary: entry.primary, alt: entry.alt ?? null };
      }
    }
    return merged;
  } catch {
    return cloneBindings(DEFAULT_BINDINGS);
  }
}

export function saveBindings(bindings: ControlBindings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
  } catch {
    // ignore quota
  }
}

export function resetBindings(): ControlBindings {
  const next = cloneBindings(DEFAULT_BINDINGS);
  saveBindings(next);
  return next;
}

export function findBindingConflict(
  bindings: ControlBindings,
  code: KeyCode,
  exceptAction?: ControlAction,
  exceptSlot?: 'primary' | 'alt',
): { action: ControlAction; slot: 'primary' | 'alt' } | null {
  for (const a of CONTROL_ACTIONS) {
    if (bindings[a].primary === code) {
      if (!(exceptAction === a && exceptSlot === 'primary')) {
        return { action: a, slot: 'primary' };
      }
    }
    if (bindings[a].alt === code) {
      if (!(exceptAction === a && exceptSlot === 'alt')) {
        return { action: a, slot: 'alt' };
      }
    }
  }
  return null;
}

/** Clear a code from every slot except the one being set. */
function clearCodeElsewhere(
  bindings: ControlBindings,
  code: KeyCode,
  keepAction: ControlAction,
  keepSlot: 'primary' | 'alt',
): void {
  for (const a of CONTROL_ACTIONS) {
    if (bindings[a].alt === code && !(a === keepAction && keepSlot === 'alt')) {
      bindings[a].alt = null;
    }
    if (bindings[a].primary === code && !(a === keepAction && keepSlot === 'primary')) {
      if (bindings[a].alt) {
        bindings[a].primary = bindings[a].alt;
        bindings[a].alt = null;
      } else {
        const fallback = DEFAULT_BINDINGS[a].primary;
        bindings[a].primary =
          fallback === code ? DEFAULT_BINDINGS[a].alt ?? 'KeyU' : fallback;
      }
    }
  }
}

/**
 * Apply a rebind. Primary cannot be cleared. Alt may be null.
 * Conflicts: the new code is removed from any other action/slot.
 */
export function applyRebind(
  bindings: ControlBindings,
  action: ControlAction,
  slot: 'primary' | 'alt',
  code: KeyCode | null,
): ControlBindings {
  if (slot === 'primary' && !code) return bindings;
  const next = cloneBindings(bindings);
  if (code) clearCodeElsewhere(next, code, action, slot);
  if (slot === 'primary') next[action].primary = code!;
  else next[action].alt = code;
  return next;
}

export function codesForAction(bindings: ControlBindings, action: ControlAction): KeyCode[] {
  const b = bindings[action];
  return b.alt ? [b.primary, b.alt] : [b.primary];
}

export function actionForCode(
  bindings: ControlBindings,
  code: KeyCode,
): ControlAction | null {
  for (const a of CONTROL_ACTIONS) {
    if (bindings[a].primary === code || bindings[a].alt === code) return a;
  }
  return null;
}

export function formatCode(code: KeyCode | null): string {
  if (!code) return '—';
  const map: Record<string, string> = {
    Space: 'Space',
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Escape: 'Esc',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    MetaLeft: 'Meta',
    MetaRight: 'Meta',
  };
  if (map[code]) return map[code];
  if (code.startsWith('Key') && code.length === 4) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  return code;
}

export function allBoundCodes(bindings: ControlBindings): Set<KeyCode> {
  const s = new Set<KeyCode>();
  for (const a of CONTROL_ACTIONS) {
    s.add(bindings[a].primary);
    if (bindings[a].alt) s.add(bindings[a].alt!);
  }
  return s;
}
