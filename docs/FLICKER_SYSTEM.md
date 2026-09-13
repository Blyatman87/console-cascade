# Console Cascade — Multi-Universe & Era Flicker (design lock 2026-09-13)

## Summary
- Modern sleek = default play (Layer 0).
- Universes = console eras (homage names). Boss clear unlocks next universe.
- Era flicker = temporary Layer 1 overlay + SFX; short challenge; rewards; restore modern.
- L1: no flicker challenges. Mutex with side missions / perk teach.

## Eng hooks
- `data-era`, `data-flicker=off|on|transition`
- FlickerController: enter → challenge → exit + skip
- FxOverlay: scanline/noise/chroma (capped)
- Challenges: survive, clear_1, soft_only, orb_collect, etc.
- Flags: universeUnlocked, bossCleared, content.minUniverse

See Game Design / Art Direction / Web Motion / Research briefs in chat for full tables.
