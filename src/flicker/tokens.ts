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

export function getEraTokens(era: EraId): EraTokenPack {
  return PACKS[era];
}

export function fxParamsForEra(era: EraId): FxOverlayParams {
  return paramsFromEraTokens(PACKS[era].fxOverlay ?? {});
}

/** Apply era CSS vars onto an element (board shell). */
export function applyEraCssVars(el: HTMLElement, era: EraId | null): void {
  if (!era) {
    for (const key of [...el.style]) {
      if (key.startsWith('--cc-era-') || key.startsWith('--cc-piece-')) {
        // keep piece vars from theme; only clear era-specific overlays we set
      }
    }
    return;
  }
  const pack = PACKS[era];
  const p = pack.palette;
  if (typeof p.bg === 'string') el.style.setProperty('--cc-era-bg', p.bg);
  if (typeof p.gridLine === 'string') el.style.setProperty('--cc-era-grid', p.gridLine);
  if (typeof p.hudText === 'string') el.style.setProperty('--cc-era-hud', p.hudText);
  if (typeof p.phosphorPrimary === 'string') {
    el.style.setProperty('--cc-era-phosphor', p.phosphorPrimary);
  }
  for (const [piece, colors] of Object.entries(pack.pieces)) {
    el.style.setProperty(`--cc-piece-${piece}`, colors.fill);
  }
}
