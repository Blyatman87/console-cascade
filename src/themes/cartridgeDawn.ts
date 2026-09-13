import type { ThemePalette } from '../types/models';

/** Atari-era homage palette — no trademarks */
export const cartridgeDawnTheme: ThemePalette = {
  id: 'cartridge_dawn',
  name: 'Cartridge Dawn',
  bg: '#1a0f0a',
  bgAlt: '#2b1810',
  panel: '#3a2218',
  panelBorder: '#c4a574',
  text: '#f4e4c1',
  textMuted: '#a89070',
  accent: '#e8a838',
  accentAlt: '#d94f3d',
  boardBg: '#0d0805',
  gridLine: '#3d2a1c',
  piece: {
    I: '#4ecdc4',
    O: '#ffe66d',
    T: '#c77dff',
    S: '#95e06c',
    Z: '#ff6b6b',
    J: '#4d96ff',
    L: '#ff9f45',
  },
  garbage: '#6b5344',
  ghost: 'rgba(244,228,193,0.2)',
  fontFamily: "'Courier New', Courier, monospace",
  titleFont: "'Courier New', Courier, monospace",
  uiRadius: '4px',
  pixelated: true,
};
