import type { ThemePalette } from '../types/models';

/** Modern polish + warm Atari-era homage — no trademarks, no muddy pixels */
export const cartridgeDawnTheme: ThemePalette = {
  id: 'cartridge_dawn',
  name: 'Cartridge Dawn',
  bg: '#0B1020',
  bgAlt: '#12182B',
  panel: '#1A2238',
  panelBorder: 'rgba(255, 255, 255, 0.16)',
  text: '#E8ECF4',
  textMuted: '#8B93A7',
  accent: '#F0A04B',
  accentAlt: '#FF7A59',
  boardBg: '#0E1424',
  gridLine: 'rgba(232, 236, 244, 0.10)',
  piece: {
    I: '#3DE0F5',
    O: '#F5C542',
    T: '#B07CFF',
    S: '#4ADE80',
    Z: '#F472B6',
    J: '#5B8CFF',
    L: '#FB923C',
  },
  garbage: '#5C6478',
  ghost: 'rgba(240, 160, 75, 0.35)',
  fontFamily: "'Inter', system-ui, sans-serif",
  titleFont: "'DM Sans', 'Inter', system-ui, sans-serif",
  uiRadius: '12px',
  pixelated: false,
};
