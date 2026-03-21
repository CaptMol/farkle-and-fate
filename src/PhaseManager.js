/**
 * src/PhaseManager.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * PhaseManager.js
 * Finite State Machine for game phases.
 *
 * KEY PRINCIPLE: One code path for both players.
 * activePlayer = whoever is currently taking their turn.
 * passivePlayer = the other player — can play instants in windows.
 *
 * Phase flow:
 *   ROLL → FARKLE_CHECK → INSTANT_W1 → PICK → INSTANT_W2 → SECURE
 *   → HOT_DICE (if feuerhand) → back to ROLL
 *   → END_TURN → WIN_CHECK → (VICTORY | next player's turn)
 */

export const PHASES = Object.freeze({
  // Turn phases
  ROLL:             'ROLL',
  FARKLE_CHECK:     'FARKLE_CHECK',
  INSTANT_FARKLE:   'INSTANT_FARKLE',    // instant window: react to farkle
  INSTANT_W1:       'INSTANT_W1',        // post-roll, pre-pick
  PICK:             'PICK',
  INSTANT_W2:       'INSTANT_W2',        // post-pick, pre-secure
  SECURE:           'SECURE',
  HOT_DICE:         'HOT_DICE',          // feuerhand!

  // End of turn
  END_TURN:         'END_TURN',
  INSTANT_VICTORY:  'INSTANT_VICTORY',   // 5s window after win
  VICTORY:          'VICTORY',
  FARKLE:           'FARKLE',            // turn ends, score lost

  // Between turns
  SHOP:             'SHOP',
  BETWEEN_TURNS:    'BETWEEN_TURNS',

  // Game over
  GAME_OVER:        'GAME_OVER',
});

export class PhaseManager {
  constructor({ onPhaseChange, instantTimeout = 8000 }) {
    this.phase          = null;
    this.activePlayer   = null;   // PlayerState — whose turn it is
    this.passivePlayer  = null;   // PlayerState — the other player

    this.onPhaseChange  = onPhaseChange;  // callback: (phase, active, passive) => void
    this.instantTimeout = instantTimeout; // ms for instant windows (default 8s)

    this._instantTimer  = null;
    this._pendingResolve = null;
  }

  // ── Turn Management ───────────────────────────────────────────────────────

  startTurn(activePlayer, passivePlayer) {
    this.activePlayer  = activePlayer;
    this.passivePlayer = passivePlayer;
    this._advance(PHASES.ROLL);
  }

  // ── Phase Transitions ─────────────────────────────────────────────────────

  _advance(phase) {
    this.phase = phase;
    this._notifyChange();
  }

  _notifyChange() {
    if (this.onPhaseChange) {
      this.onPhaseChange(this.phase, this.activePlayer, this.passivePlayer);
    }
  }

  // ── Called by game.js after each action ───────────────────────────────────

  /** After roll completes */
  afterRoll(turnState) {
    if (turnState.hasFarkle) {
      this._advance(PHASES.FARKLE_CHECK);
    } else {
      this._advance(PHASES.INSTANT_W1);
    }
  }

  /** After instant W1 resolves (or auto-skipped) */
  afterInstantW1() {
    this._advance(PHASES.PICK);
  }

  /** After farkle instant window resolves */
  afterInstantFarkle(shieldPlayed) {
    if (shieldPlayed) {
      this._advance(PHASES.ROLL);  // re-roll
    } else {
      this._advance(PHASES.FARKLE);
    }
  }

  /** After pick action (die picked or combo button clicked) */
  afterPick() {
    // Stay in PICK phase — multiple picks possible
    // game.js calls this to ensure we're in PICK
    if (this.phase !== PHASES.PICK) this._advance(PHASES.PICK);
  }

  /** Player presses Roll — archive current picks, start new sub-roll */
  onRoll(turnState) {
    if (turnState.hasHotDice) {
      this._advance(PHASES.HOT_DICE);
    } else if (turnState.hasFarkle) {
      this._advance(PHASES.FARKLE_CHECK);
    } else {
      this._advance(PHASES.INSTANT_W1);
    }
  }

  /** After archive sub-roll, before next roll */
  afterSubRollArchive(turnState) {
    if (turnState.hasHotDice) {
      this._advance(PHASES.HOT_DICE);
    } else {
      this._advance(PHASES.INSTANT_W2);
    }
  }

  /** After instant W2 resolves */
  afterInstantW2() {
    this._advance(PHASES.SECURE);
  }

  /** Player presses End Turn */
  onEndTurn(won) {
    if (won) {
      this._advance(PHASES.INSTANT_VICTORY);
    } else {
      this._advance(PHASES.SHOP);
    }
  }

  /** After victory window expires or no instants */
  afterVictoryWindow() {
    this._advance(PHASES.VICTORY);
  }

  /** After end-of-turn processing */
  afterEndTurn() {
    this._advance(PHASES.BETWEEN_TURNS);
  }

  /** After shop closes */
  afterShop() {
    this._advance(PHASES.BETWEEN_TURNS);
  }

  // ── Instant Window Management ─────────────────────────────────────────────

  /**
   * Open an instant window.
   * Returns a promise that resolves when:
   *   - a spell is played (resolves with { spell, targetUid })
   *   - timer expires (resolves with null)
   *   - player passes (resolves with null)
   */
  openInstantWindow(windowType, playableInstants) {
    // Auto-skip if nothing to play
    if (!playableInstants || playableInstants.length === 0) {
      return Promise.resolve(null);
    }

    return new Promise(resolve => {
      this._pendingResolve = resolve;

      // Auto-expire after timeout
      this._instantTimer = setTimeout(() => {
        this._closeInstantWindow(null);
      }, this.instantTimeout);
    });
  }

  /** Called when player plays an instant spell */
  playInstant(spell, targetUid = null) {
    this._closeInstantWindow({ spell, targetUid });
  }

  /** Called when player passes the instant window */
  passInstant() {
    this._closeInstantWindow(null);
  }

  _closeInstantWindow(result) {
    if (this._instantTimer) {
      clearTimeout(this._instantTimer);
      this._instantTimer = null;
    }
    if (this._pendingResolve) {
      const resolve = this._pendingResolve;
      this._pendingResolve = null;
      resolve(result);
    }
  }

  // ── Queries ───────────────────────────────────────────────────────────────

  get isPlayerTurn() {
    return this.activePlayer?.isHuman === true;
  }

  get isEnemyTurn() {
    return this.activePlayer?.isHuman === false;
  }

  get inInstantWindow() {
    return [
      PHASES.INSTANT_W1,
      PHASES.INSTANT_W2,
      PHASES.INSTANT_FARKLE,
      PHASES.INSTANT_VICTORY
    ].includes(this.phase);
  }

  get canPickDice() {
    return this.phase === PHASES.PICK && this.isPlayerTurn;
  }

  get canRoll() {
    return this.phase === PHASES.ROLL ||
           (this.phase === PHASES.PICK && this.isPlayerTurn);
  }

  get canEndTurn() {
    return this.phase === PHASES.PICK && this.isPlayerTurn;
  }

  // ── String representation (for debugging) ─────────────────────────────────

  toString() {
    return `[${this.activePlayer?.id || '?'}] ${this.phase}`;
  }
}
