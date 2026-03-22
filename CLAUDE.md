# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Run tests:**
```
node --test tests/scoring.test.js
```

**Serve locally:**
```
npx serve .
```

**Build single-file bundle:**
```
python3 build.py
```
Output: `farkle-fate-v2.html` — a fully self-contained playable file.

## Architecture

Farkle & Fate is a vanilla JavaScript browser game with no npm dependencies. Modules use ES imports in development; `build.py` strips imports/exports and bundles everything into one HTML file.

### State model

There are two distinct state classes:

- **`TurnState`** (`src/TurnState.js`) — **Immutable.** Represents a single turn's dice state. Every action (roll, pick, archive) returns a new `TurnState`. Zones: `active` (pickable field), `picked` (selected dice), `archived` (locked sub-rolls). This is the right place to add die effects that transform turn state.

- **`PlayerState`** (`src/PlayerState.js`) — **Mutable.** Persists across turns: score, gold, deck, enchantments, spells, shop queue. One instance per player; only mutated at turn boundaries (end turn, shop purchase).

### Game loop

`src/game.js` is the orchestrator. It owns one `PhaseManager` FSM and two `PlayerState` instances. All flow routes through `_onPhaseChange(phase, active, passive)`.

`src/PhaseManager.js` is a finite state machine. Phases in order: `ROLL → FARKLE_CHECK → INSTANT_FARKLE → FARKLE → INSTANT_W1 → PICK → INSTANT_W2 → HOT_DICE → END_TURN → SHOP → BETWEEN_TURNS`. Instant windows open a timed Promise (8s timeout) that resolves when a spell is played or passed.

### Scoring

`src/scoring.js` is **pure functions only** — no DOM, no side effects. All combo detection and score calculation lives here. This is also where the test coverage is (`tests/scoring.test.js`). When adding new combos or enchantments, add tests here.

Key functions:
- `calcScore(dice, perPickEnchants)` → `{breakdown, total}`
- `isFarkle(dice)` → bool
- `isHotDice(active)` → bool (all remaining dice scorable)
- `getScorableUids(dice)` → uid list
- `findAllCombos(dice)` → combo array

### Content vs. logic separation

**`src/constants.js` is data only.** All game items (dice templates, spells, enchantments, runes, shop items, enemies, gold config) are defined here. New game content goes here; behavior goes in the relevant module.

### Rendering

Three render functions, each called every cycle from `game._renderAll()`:
- `renderZone(playerState, turnState, domIds, options)` — dice field + secured zone
- `renderVault(playerState, domIds, options)` — deck/enchants/spells panel
- `renderHUD()` — progress bars + turn indicator

Renders are full redraws (innerHTML replacement). State is the source of truth; the DOM is derived.

### AI

`src/ai.js` is a greedy deterministic engine. `greedyPickDecide` picks the highest-scoring atomic combo, then standalone 1s/5s. `greedyRollDecide` computes farkle probability per die count and compares against banked score thresholds. AI decisions are scheduled with a small delay via `game._scheduleAI()` for UX.

### Spells / Instants

`src/spells.js` handles all spell effect resolution. Sorcery spells are cast during `PICK` phase (own turn). Instant spells are cast during timed windows (W1 post-roll, W2 post-pick, FARKLE, VICTORY). Instant windows are opened by `PhaseManager.openInstantWindow()` and resolved by `playInstant(spell)` or `passInstant()`.

### Rune mechanics

Runes change a die face's `value` without changing its physical `faceNum`. A face showing `3|1` still rolls as face 3 (1-in-6 probability) but scores as value 1. This effectively stacks the probability of value 1 if the die also has a natural 1 face.

### CSS

Three files: `style/vars.css` (design tokens + 3 skins), `style/layout.css` (grid), `style/components.css` (dice, buttons, modals). Skins (Tavern, Arcane, Dungeon) work by overriding CSS custom properties.
