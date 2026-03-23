# CLAUDE.md — Farkle & Fate
*Guidance for Claude Code. Read this before touching any file.*

---

## Commands

Run tests:
`````node --test tests/scoring.test.js```

Serve locally:
````npx serve .```

Build single-file bundle:
```python3 build.py```
Output: `farkle-fate-v2.html` — fully self-contained playable file.

---

## Working Rules

These are non-negotiable. Apply them to every change.

**Code quality:**
- Fix root cause, never patch symptoms. If you find yourself adding a workaround: stop, leave a comment explaining why, do not proceed.
- Logic belongs in its owner. TurnState decides what gets rolled. PlayerState manages gold. game.js orchestrates — it does not contain business logic.
- Deletion over addition. Prefer removing code over adding new abstractions.
- No unnecessary abstractions. Only introduce new architecture when strictly necessary.
- No console.log in production code.
- Comments in English only.

**Process:**
- One commit per issue. Reference the issue number in the commit message.
- Run `node --test tests/scoring.test.js` after every change that touches scoring, TurnState, or PlayerState. All 41 tests must pass.
- When fixing a bug: describe the root cause in the commit message, not just what changed.
- Do not change design decisions documented in this file without explicit instruction.

---

## Architecture

Farkle & Fate is a vanilla JavaScript browser game. No npm dependencies, no framework, no build step for development. ES modules in dev; `build.py` bundles into one HTML file for itch.io.

### State Model

**TurnState** (`src/TurnState.js`) — Immutable. Single turn's dice state.
Every action returns a new TurnState. Never mutate directly.
Zones: `active` (pickable), `picked` (selected), `archived` (locked sub-rolls).

**PlayerState** (`src/PlayerState.js`) — Mutable. Persists across turns.
Contains: score, gold, deck, enchantments, spells, shop queue.
One instance per player. Only mutated at turn boundaries.

### Game Loop

`src/game.js` — orchestrator. Owns PhaseManager FSM + two PlayerState instances.
All flow routes through `_onPhaseChange(phase, active, passive)`.

**One codebase, two players.** activePlayer/passivePlayer are neutral.
No `if (isEnemy)` in game logic. If something applies to the player, it applies to the enemy too.

### Phase Flow
```
ROLL → FARKLE_CHECK → INSTANT_FARKLE → FARKLE
     → INSTANT_W1 → PICK → INSTANT_W2 → HOT_DICE
     → END_TURN → SHOP → BETWEEN_TURNS
     → INSTANT_VICTORY → VICTORY
````
Instant windows = timed Promise (8s). Resolves on spell played or passed.

### Rendering
Full redraws every cycle. State is source of truth, DOM is derived.
- `renderZone()` — dice field + secured zone (one function, two instances)
- `renderVault()` — deck/enchants/spells panel (one function, two instances)
- `renderHUD()` — progress bars + turn indicator

### Scoring
`src/scoring.js` — pure functions only. No DOM, no side effects.
All combo detection and score calculation lives here.
Key functions: `calcScore`, `isFarkle`, `isHotDice`, `getScorableUids`, `findAllCombos`.
**When adding combos or enchantments: add tests in `tests/scoring.test.js` first.**

### Content vs Logic
`src/constants.js` — data only. All game items defined here.
New content goes here. Behavior goes in the relevant module.

### AI
`src/ai.js` — greedy deterministic engine. No randomness except dice rolls.
`greedyPickDecide` → highest-scoring atomic combo, then standalone 1s/5s.
`greedyRollDecide` → farkle probability vs banked score thresholds.
AI scheduled via `game._scheduleAI()` for UX delay.

### Spells & Instants
`src/spells.js` — all spell effect resolution.
Sorcery: cast during PICK phase (own turn).
Instant: cast during timed windows (W1, W2, FARKLE, VICTORY).

### Rune Mechanics
Runes change a face's `value` without changing `faceNum`.
Face `3|1` rolls as face 3 (1/6 probability) but scores as 1.
Stacks probability if die also has a natural face with same value.

### CSS
- `style/vars.css` — design tokens + 3 skins (Tavern, Arcane, Dungeon)
- `style/layout.css` — grid structure
- `style/components.css` — dice, buttons, modals, overlays
Skins override CSS custom properties only.

---

## Game Design Decisions
*These are final. Do not change without explicit instruction.*

### Round Progression
- Target increases +5.000 per round automatically
- Round 1: 10.000 / Round 2: 15.000 / Round 3: 20.000 etc.
- No manual difficulty selection (Normal/Challenge/Brutal removed)

### Between Rounds
- Dice: always kept
- Enchantments: always reset
- Spells: always reset — EXCEPT player may carry over one instant spell
- Loser always receives +50 gold consolation

### Shop
- Triggers every 1.000 points
- Milestones reset each new round
- Exactly 2 items per visit, from 2 randomly chosen categories (dice / rune / enchantment / spell)
- Progress bar shows tick marks at each 1.000 interval
- "Next shop: X pts" label updates live

### Curse Spells (flat additive)
- Minor Curse:   +1.000 to enemy target
- Hex:           +2.500 to enemy target
- Greater Curse: +5.000 to enemy target
- Doom:          +10.000 to enemy target
- Each cast stacks on current target (not from base 10.000)

### Godlike Die
- Max 1 per player
- Disappears from shop after first purchase
- All other dice: max 3 per player

### Enemy Shop
- Runs silently in background
- Player never sees enemy shop overlay
- After enemy shop resolves: small toast shows what enemy bought
- Spells always hidden, dice/enchants/runes visible in toast

### Spell Cards (bottom bar)
- Cards peek from bottom of screen
- Hover/tap: card slides up fully
- Playable cards glow on player turn
- Instant cards glow when instant window is open

### Battle Chronicle
- Toggle overlay via 📜 button
- Takes no permanent layout space

### Enemy Difficulty Scaling
- Tier advances every 3 player wins
- Tiers: Default → Veteran → Champion → Warlord
- Higher tiers: more aggressive AI, better shop decisions, bonus starting gold

---

## Known Issues & Backlog
*Do not fix these without a linked GitHub Issue.*

- BUG-04: Instant spell target selection UI not implemented
  (Transform Die, Freeze, Shatter need target picker + dice highlight)
- BUG-06: Dice field dimming during enemy turn (cosmetic, low priority)
- BACKLOG: Spell collection system (needs 50+ spells, post-demo)
- BACKLOG: Story map / boss rounds
- BACKLOG: Pixel art sprites
- BACKLOG: Mobile layout
- BACKLOG: PvP mode
- BACKLOG: Win-streak board / highscore
`````

---

GitHub → `CLAUDE.md` → Edit → alles ersetzen → Commit:
