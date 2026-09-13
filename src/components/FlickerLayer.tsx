import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type RefObject,
} from 'react';
import {
  FlickerController,
  type ChallengeId,
  type EraId,
  type FlickerPhase,
} from '../flicker/FlickerController';
import { FxOverlay } from '../flicker/FxOverlay';
import { applyEraCssVars, fxParamsForEra } from '../flicker/tokens';
import { audio } from '../audio/audio';

export type FlickerUiPhase = 'idle' | 'offer' | 'running';

export interface FlickerLayerHandle {
  /** Show Easy/Normal/Dismiss offer (campaign L2+ / debug). */
  offer: (opts?: { era?: EraId; challenge?: ChallengeId }) => void;
  /** Force-start without offer (debug). */
  trigger: (tier?: 'easy' | 'normal', opts?: { era?: EraId; challenge?: ChallengeId }) => void;
  isBusy: () => boolean;
  notifyLineClear: (n?: number) => void;
  notifyHardDrop: () => void;
  notifyHold: () => void;
  notifyTopOut: () => void;
}

interface Props {
  /** Board shell element that receives data-era / data-flicker */
  shellRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  width: number;
  height: number;
  rewardCartridges?: number;
  onReward: (cartridges: number) => void;
  onUiPhaseChange?: (phase: FlickerUiPhase) => void;
}

const CHALLENGE_LABEL: Record<ChallengeId, string> = {
  survive: 'Survive the flicker',
  clear_1: 'Clear at least 1 line',
  soft_only: 'No hard drops',
  orb_collect: 'Collect orbs',
  no_hold: 'No hold',
  noise_line: 'Clear a line through the noise',
  perfect_lock: 'Lock clean — survive',
};

export const FlickerLayer = forwardRef<FlickerLayerHandle, Props>(function FlickerLayer(
  {
    shellRef,
    enabled,
    width,
    height,
    rewardCartridges = 12,
    onReward,
    onUiPhaseChange,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<FxOverlay | null>(null);
  const ctrlRef = useRef<FlickerController | null>(null);
  const pendingRef = useRef<{ era: EraId; challenge: ChallengeId } | null>(null);
  const reducedMotion = useRef(false);

  const [uiPhase, setUiPhase] = useState<FlickerUiPhase>('idle');
  const [flickerPhase, setFlickerPhase] = useState<FlickerPhase>('idle');
  const [challengeLabel, setChallengeLabel] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const setShellAttrs = useCallback(
    (era: EraId | null, flicker: 'off' | 'on' | 'transition') => {
      const el = shellRef.current;
      if (!el) return;
      if (era) el.setAttribute('data-era', era);
      else el.removeAttribute('data-era');
      el.setAttribute('data-flicker', flicker);
      applyEraCssVars(el, era);
    },
    [shellRef],
  );

  const setPhase = useCallback(
    (phase: FlickerUiPhase) => {
      setUiPhase(phase);
      onUiPhaseChange?.(phase);
    },
    [onUiPhaseChange],
  );

  // Init FxOverlay + FlickerController once
  useEffect(() => {
    reducedMotion.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const fx = new FxOverlay(canvas);
    fx.setReducedMotion(reducedMotion.current);
    fxRef.current = fx;

    const ctrl = new FlickerController({
      setEraAttr: (era) => {
        const phase = ctrlRef.current?.phase ?? 'idle';
        const flicker =
          phase === 'telegraph' || phase === 'enter' || phase === 'exit'
            ? 'transition'
            : phase === 'hold'
              ? 'on'
              : 'off';
        setShellAttrs(era, era ? flicker : 'off');
        if (era) {
          fx.setParams(fxParamsForEra(era));
        }
      },
      setFxIntensity: (t) => fx.setIntensity(t),
      setControlGate: () => {
        /* soft gate handled by parent busy flag */
      },
      onChallengeStart: (id) => {
        setChallengeLabel(CHALLENGE_LABEL[id] ?? id);
        audio.play('ui');
      },
      onChallengeEnd: (success) => {
        if (success) {
          setToast(`Flicker clear! +${rewardCartridges} cartridges`);
          onReward(rewardCartridges);
          audio.play('levelComplete');
        } else {
          setToast('Flicker faded — modern restored');
          audio.play('ui');
        }
      },
      onComplete: () => {
        setShellAttrs(null, 'off');
        setPhase('idle');
        setFlickerPhase('idle');
        setCanSkip(false);
        setChallengeLabel('');
        window.setTimeout(() => setToast(null), 2200);
      },
      setAudioEraMix: () => {
        /* optional duck — keep modern bed for MVP */
      },
    });
    ctrlRef.current = ctrl;

    return () => {
      fx.clear();
      fxRef.current = null;
      ctrlRef.current = null;
    };
  }, [setShellAttrs, onReward, rewardCartridges, setPhase]);

  // Resize canvas to board
  useEffect(() => {
    fxRef.current?.resize(Math.max(1, width), Math.max(1, height));
  }, [width, height]);

  // rAF tick while running
  useEffect(() => {
    if (uiPhase !== 'running') return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(50, now - last);
      last = now;
      const ctrl = ctrlRef.current;
      const fx = fxRef.current;
      if (ctrl) {
        ctrl.update(dt);
        setFlickerPhase(ctrl.phase);
        setCanSkip(ctrl.canSkip);
        if (ctrl.phase === 'idle' && uiPhase === 'running') {
          // finished via onComplete
        }
      }
      fx?.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [uiPhase]);

  const startWithTier = useCallback(
    (tier: 'easy' | 'normal') => {
      const pending = pendingRef.current ?? {
        era: 'cartridge-dawn' as EraId,
        challenge: (tier === 'easy' ? 'survive' : 'clear_1') as ChallengeId,
      };
      const ctrl = ctrlRef.current;
      if (!ctrl || !enabled) return;
      setPhase('running');
      setShellAttrs(null, 'transition');
      ctrl.start({
        era: pending.era,
        challenge: pending.challenge,
        tier,
        reducedMotion: reducedMotion.current,
        skippableAfterEnter: true,
      });
      setChallengeLabel(CHALLENGE_LABEL[pending.challenge]);
      audio.play('ui');
    },
    [enabled, setPhase, setShellAttrs],
  );

  const dismissOffer = useCallback(() => {
    pendingRef.current = null;
    setPhase('idle');
    setShellAttrs(null, 'off');
    setToast('Flicker dismissed');
    window.setTimeout(() => setToast(null), 1600);
  }, [setPhase, setShellAttrs]);

  useImperativeHandle(
    ref,
    () => ({
      offer: (opts) => {
        if (!enabled) return;
        if (ctrlRef.current?.isActive || uiPhase !== 'idle') return;
        pendingRef.current = {
          era: opts?.era ?? 'cartridge-dawn',
          challenge: opts?.challenge ?? 'survive',
        };
        setPhase('offer');
        setShellAttrs(null, 'transition');
        audio.play('ui');
      },
      trigger: (tier = 'normal', opts) => {
        if (!enabled) return;
        pendingRef.current = {
          era: opts?.era ?? 'cartridge-dawn',
          challenge: opts?.challenge ?? (tier === 'easy' ? 'survive' : 'clear_1'),
        };
        startWithTier(tier);
      },
      isBusy: () => uiPhase !== 'idle' || !!ctrlRef.current?.isActive,
      notifyLineClear: (n = 1) => ctrlRef.current?.notifyLineClear(n),
      notifyHardDrop: () => ctrlRef.current?.notifyHardDrop(),
      notifyHold: () => ctrlRef.current?.notifyHold(),
      notifyTopOut: () => ctrlRef.current?.notifyTopOut(),
    }),
    [enabled, uiPhase, startWithTier, setPhase, setShellAttrs],
  );

  const showCanvas = uiPhase === 'running' && flickerPhase !== 'idle';

  return (
    <>
      <canvas
        ref={canvasRef}
        className="flicker-fx-canvas"
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 4,
          opacity: showCanvas ? 1 : 0,
        }}
      />

      {uiPhase === 'offer' && (
        <div className="flicker-offer overlay" role="dialog" aria-label="Era Flicker">
          <div className="overlay-card flicker-card">
            <p className="eyebrow">Era Flicker</p>
            <h2>Cartridge Dawn bleeds through</h2>
            <p className="muted">
              A short Layer-1 challenge. Survive or clear — earn cartridges. Modern returns after.
            </p>
            <p className="flicker-challenge-hint">
              {CHALLENGE_LABEL[pendingRef.current?.challenge ?? 'survive']}
            </p>
            <div className="flicker-actions">
              <button type="button" className="menu-btn primary" onClick={() => startWithTier('easy')}>
                Easy
              </button>
              <button type="button" className="menu-btn primary" onClick={() => startWithTier('normal')}>
                Normal
              </button>
              <button type="button" className="menu-btn ghost" onClick={dismissOffer}>
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {uiPhase === 'running' && (
        <div className="flicker-hud" aria-live="polite">
          <span className="flicker-phase-chip">{flickerPhase}</span>
          {challengeLabel && <span className="flicker-challenge-chip">{challengeLabel}</span>}
          {canSkip && (
            <button
              type="button"
              className="menu-btn ghost tiny-btn"
              onClick={() => ctrlRef.current?.skip()}
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {toast && (
        <div className="flicker-toast" role="status">
          {toast}
        </div>
      )}
    </>
  );
});
