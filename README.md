# Farkle & Fate

Dice roguelike — Farkle/10.000 mechanics + MTG-style instants + roguelike shop loop.

## Play

**Local (requires HTTP server):**
```bash
npx serve .
# then open http://localhost:3000
```

**Or open the bundle directly:**
```bash
python3 build.py        # generates farkle-fate-v2.html
# open farkle-fate-v2.html in browser
```

## Development

Edit files in `src/` and `style/`.  
Run `python3 build.py` to generate the single-file bundle for local testing.

## Tests

```bash
node --test tests/scoring.test.js
```

## Structure

```
src/
  scoring.js        pure scoring functions (41 tests)
  TurnState.js      immutable turn state
  PlayerState.js    identical for player + enemy
  PhaseManager.js   FSM phase transitions
  constants.js      all game data
  dice.js           Die/Face classes, rune mechanics
  shop.js           shop offers, buy logic
  spells.js         spell effects
  ai.js             greedy AI
  audio.js          Web Audio API sounds
  particles.js      canvas particle system
  game.js           main game loop
  render/
    renderZone.js   dice field (one function, two instances)
    renderVault.js  vault panel (one function, two instances)
    renderHUD.js    progress bars, turn indicator
style/
  vars.css          CSS custom properties + skins
  layout.css        grid, panels, structural
  components.css    dice, buttons, shop cards, modals
tests/
  scoring.test.js   41 tests, node --test
```
