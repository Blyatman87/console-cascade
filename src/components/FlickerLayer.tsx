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
import { applyEraCssVars, fxParamsForEra, getEraTokens } from '../flicker/tokens';
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
  /** Restore modern theme CSS vars after flicker clears era overrides */
  onRestoreTheme?: () => void;
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

const ERA_GLYPH: Record<EraId, string> = {
  'cartridge-dawn': '◈',
  'eight-bit-revival': '▣',
  'sixteen-bit-rival': '◆',
  'mode-7-majesty': '◇',
};

function flickerAttrForPhase(phase: FlickerPhase): 'off' | 'on' | 'transition' {
  if (phase === 'hold') return 'on';
  if (phase === 'telegraph' || phase === 'enter' || phase === 'exit') return 'transition';
  return 'off';
}

export const FlickerLayer = forwardRef<FlickerLayerHandle, Props>(function FlickerLayer(
  {
    shellRef,
    enabled,
    width,
    height,
    rewardCartridges = 12,
    onReward,
    onUiPhaseChange,
    onRestoreTheme,
  },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<FxOverlay | null>(null);
  const ctrlRef = useRef<FlickerController | null>(null);
  const pendingRef = useRef<{ era: EraId; challenge: ChallengeId } | null>(null);
  const reducedMotion = useRef(false);
  const activeEraRef = useRef<EraId | null>(null);

  // Stable callback refs so controller init effect does not reset every render
  const onRewardRef = useRef(onReward);
  const onUiPhaseChangeRef = useRef(onUiPhaseChange);
  const onRestoreThemeRef = useRef(onRestoreTheme);
  const rewardRef = useRef(rewardCartridges);
  onRewardRef.current = onReward;
  onUiPhaseChangeRef.current = onUiPhaseChange;
  onRestoreThemeRef.current = onRestoreTheme;
  rewardRef.current = rewardCartridges;

  const [uiPhase, setUiPhase] = useState<FlickerUiPhase>('idle');
  const [flickerPhase, setFlickerPhase] = useState<FlickerPhase>('idle');
  const [challengeLabel, setChallengeLabel] = useState('');
  const [canSkip, setCanSkip] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [telegraphEra, setTelegraphEra] = useState<EraId | null>(null);

  const setPhase = useCallback((phase: FlickerUiPhase) => {
    setUiPhase(phase);
    onUiPhaseChangeRef.current?.(phase);
  }, []);

  const syncShellFlicker = useCallback(
    (era: EraId | null, phase: FlickerPhase) => {
      const el = shellRef.current;
      const flicker = flickerAttrForPhase(phase);
      if (el) el.setAttribute('data-flicker', flicker);
      if (era && (phase === 'enter' || phase === 'hold' || phase === 'exit')) {
        applyEraCssVars(el, era);
        activeEraRef.current = era;
      } else if (!era || phase === 'idle') {
        applyEraCssVars(el, null);
        activeEraRef.current = null;
        onRestoreThemeRef.current?.();
      } else if (phase === 'telegraph') {
        // Keep modern board during telegraph; pulse chrome with era phosphor
        if (el) el.removeAttribute('data-era');
        document.documentElement.removeAttribute('data-era');
        const pending = pendingRef.current?.era;
        if (pending) {
          const ph = getEraTokens(pending).palette.phosphorPrimary;
          if (typeof ph === 'string') {
            el?.style.setProperty('--cc-era-phosphor', ph);
            document.documentElement.style.setProperty('--cc-era-phosphor', ph);
          }
        }
      }
    },
    [shellRef],
  );

  // Init FxOverlay + FlickerController once (stable deps)
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
        if (era) {
          fx.setParams(fxParamsForEra(era));
          applyEraCssVars(shellRef.current, era);
          activeEraRef.current = era;
          const el = shellRef.current;
          if (el) el.setAttribute('data-flicker', flickerAttrForPhase(phase));
        } else {
          applyEraCssVars(shellRef.current, null);
          activeEraRef.current = null;
          const el = shellRef.current;
          if (el) el.setAttribute('data-flicker', 'off');
          onRestoreThemeRef.current?.();
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
          setToast(`Flicker clear! +${rewardRef.current} cartridges`);
          onRewardRef.current(rewardRef.current);
          audio.play('levelComplete');
        } else {
          setToast('Flicker faded — modern restored');
          audio.play('ui');
        }
      },
      onComplete: () => {
        applyEraCssVars(shellRef.current, null);
        const el = shellRef.current;
        if (el) el.setAttribute('data-flicker', 'off');
        onRestoreThemeRef.current?.();
        activeEraRef.current = null;
        setPhase('idle');
        setFlickerPhase('idle');
        setCanSkip(false);
        setChallengeLabel('');
        setTelegraphEra(null);
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
    // Intentionally once — callbacks via refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resize canvas to board
  useEffect(() => {
    fxRef.current?.resize(Math.max(1, width), Math.max(1, height));
  }, [width, height]);

  // rAF tick while running — drives telegraph→enter→hold→exit
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
        const prev = ctrl.phase;
        ctrl.update(dt);
        const phase = ctrl.phase;
        setFlickerPhase(phase);
        setCanSkip(ctrl.canSkip);
        if (phase !== prev) {
          const era = activeEraRef.current ?? pendingRef.current?.era ?? null;
          if (phase === 'telegraph') {
            setTelegraphEra(pendingRef.current?.era ?? era);
            syncShellFlicker(null, 'telegraph');
          } else if (phase === 'enter' || phase === 'hold' || phase === 'exit') {
            setTelegraphEra(null);
            const liveEra = pendingRef.current?.era ?? era;
            if (liveEra) {
              fx?.setParams(fxParamsForEra(liveEra));
              syncShellFlicker(liveEra, phase);
            }
          } else if (phase === 'idle') {
            setTelegraphEra(null);
            syncShellFlicker(null, 'idle');
          }
        }
      }
      fx?.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [uiPhase, syncShellFlicker]);

  const startWithTier = useCallback(
    (tier: 'easy' | 'normal') => {
      const pending = pendingRef.current ?? {
        era: 'cartridge-dawn' as EraId,
        challenge: (tier === 'easy' ? 'survive' : 'clear_1') as ChallengeId,
      };
      pendingRef.current = pending;
      const ctrl = ctrlRef.current;
      if (!ctrl || !enabled) return;
      setPhase('running');
      setFlickerPhase('telegraph');
      setTelegraphEra(pending.era);
      setCanSkip(false);
      setChallengeLabel(CHALLENGE_LABEL[pending.challenge]);
      syncShellFlicker(null, 'telegraph');
      fxRef.current?.setParams(fxParamsForEra(pending.era));
      ctrl.start({
        era: pending.era,
        challenge: pending.challenge,
        tier,
        reducedMotion: reducedMotion.current,
        skippableAfterEnter: true,
      });
      audio.play('ui');
    },
    [enabled, setPhase, syncShellFlicker],
  );

  const dismissOffer = useCallback(() => {
    pendingRef.current = null;
    setPhase('idle');
    syncShellFlicker(null, 'idle');
    setToast('Flicker dismissed');
    window.setTimeout(() => setToast(null), 1600);
  }, [setPhase, syncShellFlicker]);

  const doSkip = useCallback(() => {
    const ctrl = ctrlRef.current;
    if (!ctrl?.canSkip) return;
    ctrl.skip();
    audio.play('ui');
  }, []);

  // Skip via Esc or Enter after enter completes
  useEffect(() => {
    if (uiPhase !== 'running' || !canSkip) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        doSkip();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [uiPhase, canSkip, doSkip]);

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
        const el = shellRef.current;
        if (el) el.setAttribute('data-flicker', 'transition');
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
    [enabled, uiPhase, startWithTier, setPhase, shellRef],
  );

  const showCanvas = uiPhase === 'running' && flickerPhase !== 'idle';
  const showTelegraph = uiPhase === 'running' && flickerPhase === 'telegraph' && !!telegraphEra;

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

      {showTelegraph && (
        <div className="flicker-telegraph" aria-hidden>
          <span className="flicker-glyph">{ERA_GLYPH[telegraphEra!] ?? '◈'}</span>
        </div>
      )}

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
            <button type="button" className="menu-btn ghost tiny-btn" onClick={doSkip} title="Esc / Enter">
              Skip
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
