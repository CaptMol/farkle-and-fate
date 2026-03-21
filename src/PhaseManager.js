/**
 * src/PhaseManager.js
 */

export const PHASES = Object.freeze({
  ROLL:             'ROLL',
  FARKLE_CHECK:     'FARKLE_CHECK',
  INSTANT_FARKLE:   'INSTANT_FARKLE',
  INSTANT_W1:       'INSTANT_W1',
  PICK:             'PICK',
  INSTANT_W2:       'INSTANT_W2',
  SECURE:           'SECURE',
  HOT_DICE:         'HOT_DICE',
  END_TURN:         'END_TURN',
  INSTANT_VICTORY:  'INSTANT_VICTORY',
  VICTORY:          'VICTORY',
  FARKLE:           'FARKLE',
  SHOP:             'SHOP',
  BETWEEN_TURNS:    'BETWEEN_TURNS',
  GAME_OVER:        'GAME_OVER',
});

export class PhaseManager {
  constructor({ onPhaseChange, instantTimeout = 8000 }) {
    this.phase          = null;
    this.activePlayer   = null;
    this.passivePlayer  = null;
    this.onPhaseChange  = onPhaseChange;
    this.instantTimeout = instantTimeout;
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

  afterRoll(turnState) {
    if (turnState.hasFarkle) {
      this._advance(PHASES.FARKLE_CHECK);
    } else {
      this._advance(PHASES.INSTANT_W1);
    }
  }

  afterInstantW1() {
    this._advance(PHASES.PICK);
  }

  afterInstantFarkle(shieldPlayed) {
    if (shieldPlayed) {
      this._advance(PHASES.ROLL);
    } else {
      this._advance(PHASES.FARKLE);
    }
  }

  afterPick() {
    if (this.phase !== PHASES.PICK) this._advance(PHASES.PICK);
  }

  onRoll(turnState) {
    if (turnState.hasHotDice) {
      this._advance(PHASES.HOT_DICE);
    } else if (turnState.hasFarkle) {
      this._advance(PHASES.FARKLE_CHECK);
    } else {
      this._advance(PHASES.INSTANT_W1);
    }
  }

  afterSubRollArchive(turnState) {
    if (turnState.hasHotDice) {
      this._advance(PHASES.HOT_DICE);
    } else {
      this._advance(PHASES.INSTANT_W2);
    }
  }

  afterInstantW2() {
    this._advance(PHASES.SECURE);
  }

  onEndTurn(won) {
    if (won) {
      this._advance(PHASES.INSTANT_VICTORY);
    } else {
      this._advance(PHASES.SHOP);
    }
  }

  afterVictoryWindow() {
    this._advance(PHASES.VICTORY);
  }

  afterEndTurn() {
    this._advance(PHASES.BETWEEN_TURNS);
  }

  afterShop() {
    this._advance(PHASES.BETWEEN_TURNS);
  }

  // ── Instant Window Management ─────────────────────────────────────────────

  openInstantWindow(windowType, playableInstants) {
    if (!playableInstants || playableInstants.length === 0) {
      return Promise.resolve(null);
    }
    return new Promise(resolve => {
      this._pendingResolve = resolve;
      this._instantTimer = setTimeout(() => {
        this._closeInstantWindow(null);
      }, this.instantTimeout);
    });
  }

  playInstant(spell, targetUid = null) {
    this._closeInstantWindow({ spell, targetUid });
  }

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
    if (this.phase === PHASES.ROLL) return true;
    if (this.phase === PHASES.PICK) {
      // Enemy: AI hat bereits gepickt+archiviert vor dem roll()-Aufruf — immer erlaubt
      if (this.isEnemyTurn) return true;
      // Spieler: Roll-Button ist sichtbar in PICK-Phase, aber Farkle-Regel
      // wird in game.js roll() geprüft (TurnState.hasPickedAnything)
      return true;
    }
    return false;
  }

  get canEndTurn() {
    return this.phase === PHASES.PICK && this.isPlayerTurn;
  }

  toString() {
    return `[${this.activePlayer?.id || '?'}] ${this.phase}`;
  }
}
