/**
 * Console Cascade — FxOverlay (stub)
 * Thin canvas pass for era flicker: scanlines, noise, phosphor bloom hint,
 * light chromatic offset. Driven by FlickerController.setFxIntensity(0..1).
 * Never recolors minos — board draws underneath; this is additive FX only.
 */

export interface FxOverlayParams {
  scanlineOpacity: number;
  scanlineGapPx: number;
  noiseOpacity: number;
  phosphorBloom: number;
  chromaticPx: number;
  vignette: number;
  curvature: number;
  /** Phosphor tint when blooming (Cartridge Dawn etc.) */
  bloomTint?: string;
}

export const DEFAULT_FX: FxOverlayParams = {
  scanlineOpacity: 0.16,
  scanlineGapPx: 3,
  noiseOpacity: 0.08,
  phosphorBloom: 0.25,
  chromaticPx: 0.5,
  vignette: 0.2,
  curvature: 0.03,
  bloomTint: "rgba(61, 255, 106, 0.12)",
};

export class FxOverlay {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private intensity = 0;
  private params: FxOverlayParams;
  private noiseSeed = 1;
  private rafNoise = 0;
  private width = 0;
  private height = 0;
  private reducedMotion = false;

  constructor(
    canvas: HTMLCanvasElement,
    params: Partial<FxOverlayParams> = {}
  ) {
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("FxOverlay: 2d context unavailable");
    this.canvas = canvas;
    this.ctx = ctx;
    this.params = { ...DEFAULT_FX, ...params };
    this.canvas.style.pointerEvents = "none";
  }

  /** Call on resize / DPR change — size to board bounds, not full window if possible */
  resize(cssWidth: number, cssHeight: number, dpr = Math.min(window.devicePixelRatio || 1, 2)): void {
    this.width = cssWidth;
    this.height = cssHeight;
    this.canvas.width = Math.max(1, Math.floor(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.floor(cssHeight * dpr));
    this.canvas.style.width = `${cssWidth}px`;
    this.canvas.style.height = `${cssHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  setParams(params: Partial<FxOverlayParams>): void {
    this.params = { ...this.params, ...params };
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    if (on) this.setIntensity(0);
  }

  /** 0 = off, 1 = peak flicker FX. From FlickerController hook. */
  setIntensity(t: number): void {
    this.intensity = this.reducedMotion ? 0 : clamp(t, 0, 1);
    if (this.intensity <= 0.001) {
      this.clear();
      return;
    }
    this.draw();
  }

  getIntensity(): number {
    return this.intensity;
  }

  /** Optional: tick noise cheaply during hold (call from rAF if intensity > 0) */
  tick(dtMs: number): void {
    if (this.intensity <= 0) return;
    this.rafNoise += dtMs;
    // Refresh noise ~20fps to save fill-rate
    if (this.rafNoise >= 50) {
      this.rafNoise = 0;
      this.noiseSeed = (this.noiseSeed * 16807) % 2147483647;
      this.draw();
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  private draw(): void {
    const { ctx, width: w, height: h, intensity: a, params: p } = this;
    ctx.clearRect(0, 0, w, h);
    if (a <= 0 || w <= 0 || h <= 0) return;

    // Vignette
    if (p.vignette > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.75);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(1, `rgba(0,0,0,${p.vignette * a})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }

    // Scanlines (horizontal only — readability)
    const gap = Math.max(2, p.scanlineGapPx);
    ctx.fillStyle = `rgba(0,0,0,${p.scanlineOpacity * a})`;
    for (let y = 0; y < h; y += gap) {
      ctx.fillRect(0, y, w, 1);
    }

    // Sparse noise (low opacity — never muddy minos)
    if (p.noiseOpacity > 0) {
      ctx.globalAlpha = p.noiseOpacity * a;
      const step = 4;
      for (let y = 0; y < h; y += step) {
        for (let x = 0; x < w; x += step) {
          const n = hash2(x, y, this.noiseSeed);
          if (n > 0.72) {
            const v = Math.floor(n * 255);
            ctx.fillStyle = `rgb(${v},${v},${v})`;
            ctx.fillRect(x, y, 1, 1);
          }
        }
      }
      ctx.globalAlpha = 1;
    }

    // Soft phosphor wash (tint only — no blur filter on board)
    if (p.phosphorBloom > 0 && p.bloomTint) {
      ctx.globalAlpha = p.phosphorBloom * a * 0.5;
      ctx.fillStyle = p.bloomTint;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }

    // Cheap chromatic hint: two 1px offset strokes on edges only (not full-buffer copy)
    if (p.chromaticPx > 0 && a > 0.4) {
      const ox = p.chromaticPx;
      ctx.globalAlpha = 0.15 * a;
      ctx.strokeStyle = "rgba(255,60,60,0.8)";
      ctx.strokeRect(ox, 0, w - ox * 2, h);
      ctx.strokeStyle = "rgba(60,120,255,0.8)";
      ctx.strokeRect(-ox, 0, w + ox * 2, h);
      ctx.globalAlpha = 1;
    }

    // Curvature is CSS-side (perspective on shell) — keep canvas flat for cost.
    void p.curvature;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

function hash2(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed) | 0;
  n = (n ^ (n >>> 13)) * 1274126177;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

/** Map token fxOverlay block → FxOverlayParams */
export function paramsFromEraTokens(fx: Partial<FxOverlayParams> & { bloomTint?: string }): FxOverlayParams {
  return { ...DEFAULT_FX, ...fx };
}
