import { useEffect, useRef } from 'react';
import type { ControlBindings } from '../input/controls';
import { actionForCode, codesForAction } from '../input/controls';

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
  /** When false, gameplay actions ignored (pause/mute still optional). */
  enabled?: boolean;
  /** Allow pause/mute even when gameplay disabled. */
  allowMeta?: boolean;
  bindings: ControlBindings;
  /** Bump to clear held keys + start ~100ms input ignore window. */
  clearToken?: number;
}

const INPUT_CLEAR_MS = 100;

export function useKeyboard(handlers: KeyHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const downRef = useRef(ignoreSet());
  const ignoreUntilRef = useRef(0);
  const softDropCodesRef = useRef<Set<string>>(new Set());

  function ignoreSet() {
    return new Set<string>();
  }

  useEffect(() => {
    // Clear held keys + brief input ignore on play focus / level start / overlay close
    downRef.current = ignoreSet();
    softDropCodesRef.current = new Set();
    ignoreUntilRef.current = performance.now() + INPUT_CLEAR_MS;
    handlersRef.current.onSoftDropEnd?.();
  }, [handlers.clearToken]);

  useEffect(() => {
    const fire = (action: ReturnType<typeof actionForCode>, isRepeat: boolean) => {
      const h = handlersRef.current;
      if (!action) return;
      const gameplay =
        action !== 'pause' && action !== 'mute';
      if (gameplay && h.enabled === false) return;
      if (!gameplay && h.enabled === false && h.allowMeta === false) return;

      switch (action) {
        case 'moveLeft':
          h.onLeft?.();
          break;
        case 'moveRight':
          h.onRight?.();
          break;
        case 'softDrop':
          h.onSoftDropStart?.();
          break;
        case 'hardDrop':
          // Edge-trigger only — no key repeat
          if (!isRepeat) h.onHardDrop?.();
          break;
        case 'rotateCW':
          if (!isRepeat) h.onRotateCW?.();
          break;
        case 'rotateCCW':
          if (!isRepeat) h.onRotateCCW?.();
          break;
        case 'hold':
          if (!isRepeat) h.onHold?.();
          break;
        case 'pause':
          if (!isRepeat) h.onPause?.();
          break;
        case 'mute':
          if (!isRepeat) h.onMute?.();
          break;
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      const action = actionForCode(h.bindings, e.code);
      if (!action) return;

      const bound = new Set([
        ...codesForAction(h.bindings, 'moveLeft'),
        ...codesForAction(h.bindings, 'moveRight'),
        ...codesForAction(h.bindings, 'softDrop'),
        ...codesForAction(h.bindings, 'hardDrop'),
        ...codesForAction(h.bindings, 'rotateCW'),
        ...codesForAction(h.bindings, 'rotateCCW'),
        ...codesForAction(h.bindings, 'hold'),
        ...codesForAction(h.bindings, 'pause'),
        ...codesForAction(h.bindings, 'mute'),
      ]);
      if (bound.has(e.code)) e.preventDefault();

      if (performance.now() < ignoreUntilRef.current) {
        downRef.current.add(e.code);
        return;
      }

      if (action === 'softDrop') {
        softDropCodesRef.current.add(e.code);
      }

      // Hard drop: edge only — if already down (incl. OS repeat), skip
      if (action === 'hardDrop') {
        if (downRef.current.has(e.code) || e.repeat) {
          e.preventDefault();
          return;
        }
        downRef.current.add(e.code);
        fire(action, false);
        return;
      }

      // Movement / soft drop may use OS repeat for DAS-feel
      if (downRef.current.has(e.code)) {
        if (action === 'moveLeft' || action === 'moveRight' || action === 'softDrop') {
          fire(action, true);
        }
        return;
      }
      downRef.current.add(e.code);
      fire(action, e.repeat);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      downRef.current.delete(e.code);
      // Soft drop ends on keyup of any bound soft-drop key
      const softCodes = codesForAction(h.bindings, 'softDrop');
      if (softCodes.includes(e.code)) {
        softDropCodesRef.current.delete(e.code);
        if (softDropCodesRef.current.size === 0) {
          h.onSoftDropEnd?.();
        }
      }
    };

    const onBlur = () => {
      downRef.current = ignoreSet();
      softDropCodesRef.current = new Set();
      handlersRef.current.onSoftDropEnd?.();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
