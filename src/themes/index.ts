import type { ThemePalette } from '../types/models';
import { modernTheme } from './modern';
import { cartridgeDawnTheme } from './cartridgeDawn';

const THEMES: Record<string, ThemePalette> = {
  modern: modernTheme,
  cartridge_dawn: cartridgeDawnTheme,
};

export function getTheme(id: string): ThemePalette {
  return THEMES[id] ?? modernTheme;
}

export function applyThemeCssVars(theme: ThemePalette): void {
  const root = document.documentElement;
  root.style.setProperty('--cc-bg', theme.bg);
  root.style.setProperty('--cc-bg-alt', theme.bgAlt);
  root.style.setProperty('--cc-panel', theme.panel);
  root.style.setProperty('--cc-panel-border', theme.panelBorder);
  root.style.setProperty('--cc-text', theme.text);
  root.style.setProperty('--cc-text-muted', theme.textMuted);
  root.style.setProperty('--cc-accent', theme.accent);
  root.style.setProperty('--cc-accent-alt', theme.accentAlt);
  root.style.setProperty('--cc-board-bg', theme.boardBg);
  root.style.setProperty('--cc-grid', theme.gridLine);
  root.style.setProperty('--cc-font', theme.fontFamily);
  root.style.setProperty('--cc-title-font', theme.titleFont);
  root.style.setProperty('--cc-radius', theme.uiRadius);
  root.style.setProperty('--cc-garbage', theme.garbage);
  root.style.setProperty('--cc-ghost', theme.ghost);
  (Object.keys(theme.piece) as (keyof typeof theme.piece)[]).forEach((k) => {
    root.style.setProperty(`--cc-piece-${k}`, theme.piece[k]);
  });
  root.dataset.pixelated = theme.pixelated ? 'true' : 'false';
}

export { modernTheme, cartridgeDawnTheme };
