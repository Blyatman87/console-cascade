import type { FxOverlayParams } from './FxOverlay';
import { paramsFromEraTokens } from './FxOverlay';
import type { EraId } from './FlickerController';
import cartridgeDawn from './tokens/cartridge-dawn.json';
import eightBitRevival from './tokens/eight-bit-revival.json';
import sixteenBitRival from './tokens/sixteen-bit-rival.json';
import mode7Majesty from './tokens/mode-7-majesty.json';

export interface EraTokenPack {
  id: string;
  displayName: string;
  palette: Record<string, string | number>;
  pieces: Record<string, { fill: string; outline: string }>;
  fxOverlay: Partial<FxOverlayParams>;
  cssVars?: Record<string, string>;
}

const PACKS: Record<EraId, EraTokenPack> = {
  'cartridge-dawn': cartridgeDawn as EraTokenPack,
  'eight-bit-revival': eightBitRevival as EraTokenPack,
  'sixteen-bit-rival': sixteenBitRival as EraTokenPack,
  'mode-7-majesty': mode7Majesty as EraTokenPack,
};

const ERA_STYLE_KEYS = [
  '--cc-era-bg',
  '--cc-era-grid',
  '--cc-era-hud',
  '--cc-era-phosphor',
  '--cc-board-bg',
  '--cc-grid',
  '--cc-ghost',
  '--cc-piece-I',
  '--cc-piece-O',
  '--cc-piece-T',
  '--cc-piece-S',
  '--cc-piece-Z',
  '--cc-piece-J',
  '--cc-piece-L',
] as const;

export function getEraTokens(era: EraId): EraTokenPack {
  return PACKS[era];
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n)) return `rgba(61, 255, 106, ${alpha})`;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function fxParamsForEra(era: EraId): FxOverlayParams {
  const fx = PACKS[era].fxOverlay ?? {};
  const phosphor =
    typeof PACKS[era].palette.phosphorPrimary === 'string'
      ? (PACKS[era].palette.phosphorPrimary as string)
      : '#3dff6a';
  return paramsFromEraTokens({
    bloomTint: hexToRgba(phosphor, 0.14),
    ...fx,
  });
}

function applyPackToEl(el: HTMLElement, era: EraId): void {
  const pack = PACKS[era];
  const p = pack.palette;
  if (typeof p.bg === 'string') {
    el.style.setProperty('--cc-era-bg', p.bg);
    el.style.setProperty('--cc-board-bg', p.bg);
  }
  if (typeof p.gridLine === 'string') {
    el.style.setProperty('--cc-era-grid', p.gridLine);
    el.style.setProperty('--cc-grid', p.gridLine);
  }
  if (typeof p.hudText === 'string') el.style.setProperty('--cc-era-hud', p.hudText);
  if (typeof p.phosphorPrimary === 'string') {
    el.style.setProperty('--cc-era-phosphor', p.phosphorPrimary);
  }
  if (typeof p.ghostAlpha === 'number' && typeof p.phosphorPrimary === 'string') {
    el.style.setProperty('--cc-ghost', `color-mix(in srgb, ${p.phosphorPrimary} ${Math.round(p.ghostAlpha * 100)}%, transparent)`);
  }
  for (const [piece, colors] of Object.entries(pack.pieces)) {
    el.style.setProperty(`--cc-piece-${piece}`, colors.fill);
  }
}

function clearEraStyles(el: HTMLElement): void {
  for (const key of ERA_STYLE_KEYS) {
    el.style.removeProperty(key);
  }
}

/**
 * Apply era CSS vars onto board shell + documentElement.
 * Pass null to clear era attrs/vars (caller restores modern theme if needed).
 */
export function applyEraCssVars(el: HTMLElement | null, era: EraId | null): void {
  const root = document.documentElement;
  if (!era) {
    if (el) {
      clearEraStyles(el);
      el.removeAttribute('data-era');
    }
    clearEraStyles(root);
    root.removeAttribute('data-era');
    return;
  }
  if (el) {
    el.setAttribute('data-era', era);
    applyPackToEl(el, era);
  }
  root.setAttribute('data-era', era);
  applyPackToEl(root, era);
}
