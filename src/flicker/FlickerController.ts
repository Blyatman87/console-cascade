/**
 * Console Cascade — FlickerController (prototype)
 * Target: U1 (Cartridge Dawn) from L2+.
 * Hybrid: CSS data-era token swap + thin FxOverlay.
 * 60fps-minded; skippable after Enter completes.
 */

export type EraId =
  | "cartridge-dawn"
  | "eight-bit-revival"
  | "sixteen-bit-rival"
  | "mode-7-majesty";

export type FlickerPhase = "idle" | "telegraph" | "enter" | "hold" | "exit";

export type ChallengeId =
  | "survive"
  | "clear_1"
  | "soft_only"
  | "orb_collect"
  | "no_hold"
  | "noise_line"
  | "perfect_lock";

export interface FlickerTiming {
  telegraphMs: number;
  enterMs: number;
  holdMs: number;
  exitMs: number;
}

export interface FlickerConfig {
  era: EraId;
  challenge: ChallengeId;
  timing?: Partial<FlickerTiming>;
  /** Easy / Normal / Hard scales hold + forgiveness */
  tier?: "easy" | "normal" | "hard";
  /** If true, reduced-motion: snap tokens, no overlay juice */
  reducedMotion?: boolean;
  skippableAfterEnter?: boolean;
}

export interface FlickerHooks {
  /** Set data-era on board root; pass null to clear */
  setEraAttr: (era: EraId | null) => void;
  /** Drive FxOverlay uniforms (scanline, noise, chromatic) 0..1 */
  setFxIntensity: (t: number) => void;
  /** Soft-constrain controls during enter/exit if desired */
  setControlGate: (gate: "open" | "soft" | "challenge") => void;
  onChallengeStart: (id: ChallengeId) => void;
  onChallengeEnd: (success: boolean) => void;
  onComplete: (result: { skipped: boolean; success: boolean }) => void;
  /** Optional: duck modern audio bed */
  setAudioEraMix?: (eraMix: number) => void;
}

const DEFAULT_TIMING: FlickerTiming = {
  telegraphMs: 600,
  enterMs: 450,
  holdMs: 3500,
  exitMs: 550,
};

const TIER_HOLD: Record<NonNullable<FlickerConfig["tier"]>, number> = {
  easy: 5500,
  normal: 3500,
  hard: 2800,
};

/**
 * Tiny challenge contract — eng plugs real board events.
 */
export interface ChallengePlugin {
  id: ChallengeId;
  onEnter: (ctx: ChallengeContext) => void;
  onUpdate: (ctx: ChallengeContext, dtMs: number) => void;
  /** Return success; called on hold timeout or early resolve */
  onExit: (ctx: ChallengeContext) => boolean;
}

export interface ChallengeContext {
  era: EraId;
  tier: "easy" | "normal" | "hard";
  elapsedHoldMs: number;
  holdMs: number;
  /** Board façade — stub interfaces for prototype */
  board: {
    linesClearedThisWindow: number;
    toppedOut: boolean;
    hardDropUsed: boolean;
    holdUsed: boolean;
    orbsCollected: number;
    orbsTarget: number;
  };
}

export function createEasySurvivePlugin(): ChallengePlugin {
  return {
    id: "survive",
    onEnter: () => {},
    onUpdate: () => {},
    onExit: (ctx) => !ctx.board.toppedOut && ctx.elapsedHoldMs >= Math.min(3000, ctx.holdMs),
  };
}

export function createClear1Plugin(): ChallengePlugin {
  return {
    id: "clear_1",
    onEnter: () => {},
    onUpdate: () => {},
    onExit: (ctx) => ctx.board.linesClearedThisWindow >= 1,
  };
}

export function createSoftOnlyPlugin(): ChallengePlugin {
  return {
    id: "soft_only",
    onEnter: () => {},
    onUpdate: () => {},
    onExit: (ctx) => !ctx.board.toppedOut && !ctx.board.hardDropUsed,
  };
}

export function createOrbCollectPlugin(target = 1): ChallengePlugin {
  return {
    id: "orb_collect",
    onEnter: (ctx) => {
      ctx.board.orbsTarget = target;
    },
    onUpdate: () => {},
    onExit: (ctx) => ctx.board.orbsCollected >= ctx.board.orbsTarget,
  };
}

export const CHALLENGE_REGISTRY: Record<ChallengeId, (tier: FlickerConfig["tier"]) => ChallengePlugin> = {
  survive: () => createEasySurvivePlugin(),
  clear_1: () => createClear1Plugin(),
  soft_only: () => createSoftOnlyPlugin(),
  orb_collect: (tier) => createOrbCollectPlugin(tier === "easy" ? 1 : tier === "hard" ? 3 : 2),
  no_hold: () => ({
    id: "no_hold",
    onEnter: () => {},
    onUpdate: () => {},
    onExit: (ctx) => !ctx.board.toppedOut && !ctx.board.holdUsed,
  }),
  noise_line: () => createClear1Plugin(), // success = clear_1; FX layer raises noise via setFxIntensity
  perfect_lock: () => ({
    id: "perfect_lock",
    onEnter: () => {},
    onUpdate: () => {},
    // Prototype: succeed if survived; eng tightens with nudge counters
    onExit: (ctx) => !ctx.board.toppedOut,
  }),
};

/** Ease for overlay: enter ramps 0→1, hold holds, exit 1→0 */
function phaseIntensity(phase: FlickerPhase, phaseT: number): number {
  switch (phase) {
    case "telegraph":
      return phaseT * 0.25;
    case "enter":
      return phaseT;
    case "hold":
      return 1;
    case "exit":
      return 1 - phaseT;
    default:
      return 0;
  }
}

export class FlickerController {
  phase: FlickerPhase = "idle";
  private cfg: FlickerConfig | null = null;
  private timing: FlickerTiming = { ...DEFAULT_TIMING };
  private phaseElapsed = 0;
  private holdElapsed = 0;
  private plugin: ChallengePlugin | null = null;
  private skipped = false;
  private challengeSuccess = false;
  private enterComplete = false;
  private boardStub = {
    linesClearedThisWindow: 0,
    toppedOut: false,
    hardDropUsed: false,
    holdUsed: false,
    orbsCollected: 0,
    orbsTarget: 1,
  };

  private hooks: FlickerHooks;

  constructor(hooks: FlickerHooks) {
    this.hooks = hooks;
  }

  /** U1 L2+ gate helper */
  static shouldOfferFlicker(universeIndex: number, levelIndex: number): boolean {
    // U1 = index 0; levels 1-based → L2+ means levelIndex >= 2
    return universeIndex === 0 && levelIndex >= 2;
  }

  get isActive(): boolean {
    return this.phase !== "idle";
  }

  get canSkip(): boolean {
    return (
      !!this.cfg?.skippableAfterEnter !== false &&
      this.enterComplete &&
      (this.phase === "hold" || this.phase === "exit")
    );
  }

  /** Wire from board: call when a line clears during hold */
  notifyLineClear(n = 1): void {
    if (this.phase === "hold") this.boardStub.linesClearedThisWindow += n;
  }
  notifyTopOut(): void {
    this.boardStub.toppedOut = true;
  }
  notifyHardDrop(): void {
    this.boardStub.hardDropUsed = true;
  }
  notifyHold(): void {
    this.boardStub.holdUsed = true;
  }
  notifyOrbCollected(): void {
    this.boardStub.orbsCollected += 1;
  }

  start(config: FlickerConfig): void {
    if (this.phase !== "idle") this.forceReset();
    const tier = config.tier ?? "normal";
    this.cfg = {
      skippableAfterEnter: true,
      reducedMotion: false,
      ...config,
      tier,
    };
    this.timing = {
      ...DEFAULT_TIMING,
      holdMs: TIER_HOLD[tier],
      ...config.timing,
    };
    this.phase = "telegraph";
    this.phaseElapsed = 0;
    this.holdElapsed = 0;
    this.skipped = false;
    this.challengeSuccess = false;
    this.enterComplete = false;
    this.boardStub = {
      linesClearedThisWindow: 0,
      toppedOut: false,
      hardDropUsed: false,
      holdUsed: false,
      orbsCollected: 0,
      orbsTarget: 1,
    };
    this.plugin = CHALLENGE_REGISTRY[config.challenge](tier);
    this.hooks.setControlGate("soft");
    this.hooks.setFxIntensity(0);
    this.hooks.setAudioEraMix?.(0);
  }

  skip(): void {
    if (!this.canSkip || !this.cfg) return;
    this.skipped = true;
    // Resolve challenge early as fail (or tutorial grant handled outside)
    this.challengeSuccess = false;
    this.beginExit();
  }

  /** dt in ms — call from rAF / fixed sim tick */
  update(dtMs: number): void {
    if (this.phase === "idle" || !this.cfg) return;

    this.phaseElapsed += dtMs;
    const dur = this.currentPhaseDuration();
    const t = dur <= 0 ? 1 : Math.min(1, this.phaseElapsed / dur);

    if (!this.cfg.reducedMotion) {
      this.hooks.setFxIntensity(phaseIntensity(this.phase, t));
      this.hooks.setAudioEraMix?.(phaseIntensity(this.phase, t));
    } else {
      this.hooks.setFxIntensity(0);
      this.hooks.setAudioEraMix?.(this.phase === "hold" ? 0.35 : 0);
    }

    if (this.phase === "hold" && this.plugin) {
      this.holdElapsed += dtMs;
      const ctx = this.challengeCtx();
      this.plugin.onUpdate(ctx, dtMs);
    }

    if (this.phaseElapsed >= dur) {
      this.advancePhase();
    }
  }

  private currentPhaseDuration(): number {
    switch (this.phase) {
      case "telegraph":
        return this.timing.telegraphMs;
      case "enter":
        return this.timing.enterMs;
      case "hold":
        return this.timing.holdMs;
      case "exit":
        return this.timing.exitMs;
      default:
        return 0;
    }
  }

  private advancePhase(): void {
    if (!this.cfg) return;
    switch (this.phase) {
      case "telegraph":
        this.phase = "enter";
        this.phaseElapsed = 0;
        this.hooks.setEraAttr(this.cfg.era);
        if (this.cfg.reducedMotion) this.hooks.setFxIntensity(0);
        break;
      case "enter":
        this.enterComplete = true;
        this.phase = "hold";
        this.phaseElapsed = 0;
        this.hooks.setControlGate("challenge");
        this.plugin?.onEnter(this.challengeCtx());
        this.hooks.onChallengeStart(this.cfg.challenge);
        break;
      case "hold":
        this.challengeSuccess = this.plugin?.onExit(this.challengeCtx()) ?? false;
        this.hooks.onChallengeEnd(this.challengeSuccess);
        this.beginExit();
        break;
      case "exit":
        this.finish();
        break;
    }
  }

  private beginExit(): void {
    this.phase = "exit";
    this.phaseElapsed = 0;
    this.hooks.setControlGate("soft");
  }

  private finish(): void {
    const skipped = this.skipped;
    const success = this.challengeSuccess;
    this.hooks.setEraAttr(null);
    this.hooks.setFxIntensity(0);
    this.hooks.setAudioEraMix?.(0);
    this.hooks.setControlGate("open");
    this.phase = "idle";
    this.cfg = null;
    this.plugin = null;
    this.hooks.onComplete({ skipped, success });
  }

  private forceReset(): void {
    this.hooks.setEraAttr(null);
    this.hooks.setFxIntensity(0);
    this.hooks.setAudioEraMix?.(0);
    this.hooks.setControlGate("open");
    this.phase = "idle";
    this.cfg = null;
    this.plugin = null;
  }

  private challengeCtx(): ChallengeContext {
    return {
      era: this.cfg!.era,
      tier: this.cfg!.tier ?? "normal",
      elapsedHoldMs: this.holdElapsed,
      holdMs: this.timing.holdMs,
      board: this.boardStub,
    };
  }
}

/** Example wiring for U1 L2+ */
export function maybeStartU1Flicker(
  ctrl: FlickerController,
  universeIndex: number,
  levelIndex: number,
  challenge: ChallengeId = "survive"
): boolean {
  if (!FlickerController.shouldOfferFlicker(universeIndex, levelIndex)) return false;
  ctrl.start({
    era: "cartridge-dawn",
    challenge,
    tier: levelIndex <= 3 ? "easy" : "normal",
  });
  return true;
}
