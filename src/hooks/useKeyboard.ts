import { useEffect } from 'react';

export interface KeyHandlers {
  onLeft?: () => void;
  onRight?: () => void;
  onSoftDropStart?: () => void;
  onSoftDropEnd?: () => void;
  onHardDrop?: () => void;
  onRotateCW?: () => void;
  onRotateCCW?: () => void;
  onHold?: () => void;
  onPause?: () => void;
  onMute?: () => void;
  enabled?: boolean;
}

export function useKeyboard(handlers: KeyHandlers) {
  useEffect(() => {
    if (handlers.enabled === false) return;

    const down = new Set<string>();

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowleft', 'arrowright', 'arrowdown', 'arrowup', ' ', 'c', 'shift', 'p', 'm', 'z', 'x'].includes(k) || e.code === 'Space') {
        e.preventDefault();
      }
      if (down.has(e.code)) {
        // allow DAS-style repeat for left/right/down via OS repeat
        if (e.code === 'ArrowLeft') handlers.onLeft?.();
        if (e.code === 'ArrowRight') handlers.onRight?.();
        if (e.code === 'ArrowDown') handlers.onSoftDropStart?.();
        return;
      }
      down.add(e.code);

      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          handlers.onLeft?.();
          break;
        case 'ArrowRight':
        case 'KeyD':
          handlers.onRight?.();
          break;
        case 'ArrowDown':
        case 'KeyS':
          handlers.onSoftDropStart?.();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          handlers.onRotateCW?.();
          break;
        case 'KeyZ':
        case 'ControlLeft':
        case 'ControlRight':
          handlers.onRotateCCW?.();
          break;
        case 'Space':
          handlers.onHardDrop?.();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          handlers.onHold?.();
          break;
        case 'KeyP':
        case 'Escape':
          handlers.onPause?.();
          break;
        case 'KeyM':
          handlers.onMute?.();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      down.delete(e.code);
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        handlers.onSoftDropEnd?.();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [handlers]);
}
