# Console Cascade

Tetris-style cascade game with power-ups, three modes, and a homage-only campaign through console eras.

**MVP focus:** playable core + Universe 1 — *Cartridge Dawn Era* (end boss: **Maw of the Maze**).

> Homage naming only in the UI. No trademarked game names, logos, or mascots.

## Quick start

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

Production build:

```bash
npm run build
npm run preview
```

## Modes

| Mode | Description |
|------|-------------|
| **Sandbox** | Unlimited lives, endless leveling, modern theme. |
| **High Score** | Limited lives; scores & stats saved in `localStorage`. Side missions unlock lives / power-ups. |
| **Campaign** | Universe 1 only: 10 themed levels + boss. Shop between levels. Post-boss permanent ability pick. |

## Controls

Remappable (Settings from menu or pause). Stored in `localStorage` key `cc.controls.v1`. Dual bind primary + alt.

| Action | Default primary | Default alt | Touch |
|--------|-----------------|-------------|-------|
| Move Left / Right | ← → | A D | ◀ ▶ |
| Soft drop | ↓ | S (hold; ends on keyup) | ▼ (hold) |
| Hard drop | Space (edge-trigger) | — | ⬇ |
| Rotate CW / CCW | ↑ / Z | W / Ctrl | ↻ ↺ |
| Hold | C | Shift | Hold |
| Pause | P | Esc | ❚❚ |
| Mute | M | — | 🔊 |
| Power-ups | 1–6 | | Power-up bar |

To free Space (e.g. sticky chat hotkey): **Settings → Hard Drop → click Space → press a new key**.

## Power-ups (≥5 wired)

- **Chrono Drift** — slow gravity
- **Floor Sweep** — clear bottom 2 rows
- **Row Nuke** — clear densest row
- **Top-Out Shield** — survive one top-out
- **Twin Hold** — extra hold slot (shop)
- **Gravity Lock** — freeze gravity
- **Edge Shear** / **Cascade Bomb** — extra one-shots in shop

## Architecture

```
src/
  types/models.ts     # PlayerProgress, Inventory, Mission, Universe, Level, Ability…
  game/               # Board, pieces (7-bag), scoring, GameEngine
  data/               # Universes, missions, power-ups, abilities
  themes/             # modern + cartridge_dawn (+ hook for more)
  storage/            # localStorage progress / high scores
  components/         # Menu, playfield, shop, campaign map, etc.
  hooks/              # rAF game loop, keyboard
```

Themes use CSS variables (`applyThemeCssVars`) so future universes can swap skins without rewriting the board.

## Campaign (Universe 1)

See `docs/CAMPAIGN_BIBLE.md` for the full era spine. MVP ships:

1. Dig-Site Jungle Canopy  
2. Invader Barrage Sky  
3. Drifting Rock Belt  
4. Brick-Wall Rally  
5. Silo Defense Grid  
6. Dustbowl Combat Yard  
7. Adventure Castle Crypt  
8. Canyon River Run  
9. Fly-Swatter Grid  
10. Segment Garden Crawl  
★ **Maw of the Maze** (boss)

## Stack

- React 19 + TypeScript + Vite

## License

Game code is yours in this repo. Homage labels are original descriptive titles — do not add trademarked IP.
