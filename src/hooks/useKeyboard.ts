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
  enabled?: boolean;
  allowMeta?: boolean;
  bindings: ControlBindings;
  clearToken?: number;
}

const INPUT_CLEAR_MS = 100;
const DAS_MS = 167;
const ARR_MS = 33;

export function useKeyboard(handlers: KeyHandlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const downRef = useRef(new Set<string>());
  const ignoreUntilRef = useRef(0);
  const softDropCodesRef = useRef(new Set<string>());
  const moveDirRef = useRef<-1 | 0 | 1>(0);
  const dasUntilRef = useRef(0);
  const nextArrRef = useRef(0);

  useEffect(() => {
    downRef.current = new Set();
    softDropCodesRef.current = new Set();
    moveDirRef.current = 0;
    ignoreUntilRef.current = performance.now() + INPUT_CLEAR_MS;
    handlersRef.current.onSoftDropEnd?.();
  }, [handlers.clearToken]);

  useEffect(() => {
    const fireMetaOrEdge = (
      action: NonNullable<ReturnType<typeof actionForCode>>,
      isRepeat: boolean,
    ) => {
      const h = handlersRef.current;
      const gameplay = action !== 'pause' && action !== 'mute';
      if (gameplay && h.enabled === false) return;
      if (!gameplay && h.enabled === false && h.allowMeta === false) return;

      switch (action) {
        case 'softDrop':
          h.onSoftDropStart?.();
          break;
        case 'hardDrop':
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
        default:
          break;
      }
    };

    const syncMoveDir = () => {
      const h = handlersRef.current;
      const left = codesForAction(h.bindings, 'moveLeft').some((c) => downRef.current.has(c));
      const right = codesForAction(h.bindings, 'moveRight').some((c) => downRef.current.has(c));
      if (left && !right) moveDirRef.current = -1;
      else if (right && !left) moveDirRef.current = 1;
      else moveDirRef.current = 0;
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

      if (action === 'hardDrop') {
        if (downRef.current.has(e.code) || e.repeat) return;
        downRef.current.add(e.code);
        fireMetaOrEdge(action, false);
        return;
      }

      if (action === 'moveLeft' || action === 'moveRight') {
        if (downRef.current.has(e.code)) return; // DAS loop handles repeat
        downRef.current.add(e.code);
        if (h.enabled === false) return;
        syncMoveDir();
        if (moveDirRef.current === -1) h.onLeft?.();
        if (moveDirRef.current === 1) h.onRight?.();
        dasUntilRef.current = performance.now() + DAS_MS;
        nextArrRef.current = dasUntilRef.current;
        return;
      }

      if (downRef.current.has(e.code)) {
        if (action === 'softDrop') fireMetaOrEdge(action, true);
        return;
      }
      downRef.current.add(e.code);
      fireMetaOrEdge(action, e.repeat);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      const h = handlersRef.current;
      downRef.current.delete(e.code);
      const softCodes = codesForAction(h.bindings, 'softDrop');
      if (softCodes.includes(e.code)) {
        softDropCodesRef.current.delete(e.code);
        if (softDropCodesRef.current.size === 0) h.onSoftDropEnd?.();
      }
      syncMoveDir();
      if (moveDirRef.current === 0) {
        dasUntilRef.current = 0;
        nextArrRef.current = 0;
      }
    };

    const onBlur = () => {
      downRef.current = new Set();
      softDropCodesRef.current = new Set();
      moveDirRef.current = 0;
      handlersRef.current.onSoftDropEnd?.();
    };

    let raf = 0;
    const tick = (now: number) => {
      const h = handlersRef.current;
      if (h.enabled !== false && moveDirRef.current !== 0 && now >= dasUntilRef.current) {
        if (now >= nextArrRef.current) {
          if (moveDirRef.current === -1) h.onLeft?.();
          if (moveDirRef.current === 1) h.onRight?.();
          nextArrRef.current = now + ARR_MS;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);
}
