/**
 * src/TurnState.js
 * Auto-extracted from bundle. Edit this file.
 */

import { calcScore, applyEndEnchants, isFarkle } from './scoring.js';

/**
 * TurnState.js
 * Immutable turn state. Every mutation returns a NEW TurnState.
 * This eliminates race conditions and makes bugs reproducible.
 *
 * Zones:
 *   active   — würfelfeld: pickable, targetable by instant W1
 *   picked   — pick-zone: returnable, targetable by instant W2/W4
 *   archived — secured: UNTOUCHABLE, fixed scores
 */


export class SubRoll {
  constructor(dice, score, feuerhand = false) {
    this.dice      = dice;    // DieState[] — snapshot
    this.score     = score;   // fixed at archive time
    this.feuerhand = feuerhand;
  }
}

export class TurnState {
  constructor() {
    this.active   = [];  // DieState[]
    this.picked   = [];  // DieState[]
    this.archived = [];  // SubRoll[]

    this.feuerhandCount = 0;
    this.activeComboChoice = null; // which combo type is selected
  }

  // ── Computed scores (never cached) ──────────────────────────────────────

  pickScore(perPickEnchants = {}) {
    return calcScore(this.picked, perPickEnchants).total;
  }

  secureScore() {
    return this.archived.reduce((sum, sr) => sum + sr.score, 0);
  }

  endScore(enchants = {}) {
    const raw = this.pickScore(enchants.perPick) + this.secureScore();
    return applyEndEnchants(raw, enchants.endOfTurn);
  }

  // ── Status checks ─────────────────────────────────────────────────────────

  get hasFarkle() {
    return this.active.length > 0 && isFarkle(this.active);
  }

  get hasHotDice() {
    return isHotDice(this.active) && this.picked.length > 0;
  }

  get hasPickedAnything() {
    return this.picked.length > 0 || this.archived.length > 0;
  }

  // ── Immutable mutations ────────────────────────────────────────────────────

  /** Roll dice — set active from deck */
  withRoll(rolledDice) {
    const next = this._clone();
    next.active = rolledDice;
    next.picked = [];          // fresh sub-roll
    next.activeComboChoice = null;
    return next;
  }

  /** Pick a die from active into picked */
  withPickDie(uid) {
    const die = this.active.find(d => d.uid === uid);
    if (!die) return this;
    const next = this._clone();
    next.active = this.active.filter(d => d.uid !== uid);
    next.picked = [...this.picked, die];
    return next;
  }

  /** Return a die from picked back to active */
  withReturnDie(uid) {
    const die = this.picked.find(d => d.uid === uid);
    if (!die) return this;
    const next = this._clone();
    next.picked = this.picked.filter(d => d.uid !== uid);
    next.active = [...this.active, die];
    return next;
  }

  /** Archive current picked dice as a sub-roll */
  withArchive(perPickEnchants = {}) {
    if (!this.picked.length) return this;
    const score = calcScore(this.picked, perPickEnchants).total;
    const subRoll = new SubRoll([...this.picked], score);
    const next = this._clone();
    next.archived = [...this.archived, subRoll];
    next.picked = [];
    next.activeComboChoice = null;
    return next;
  }

  /** Archive + feuerhand flag */
  withFeuerhand(perPickEnchants = {}) {
    if (!this.picked.length) return this;
    const score = calcScore(this.picked, perPickEnchants).total;
    const subRoll = new SubRoll([...this.picked], score, true);
    const next = this._clone();
    next.archived = [...this.archived, subRoll];
    next.picked = [];
    next.feuerhandCount++;
    next.activeComboChoice = null;
    return next;
  }

  /** Set combo choice (which combo button is active) */
  withComboChoice(type) {
    const next = this._clone();
    next.activeComboChoice = type === next.activeComboChoice ? null : type;
    return next;
  }

  // ── Instant effects ────────────────────────────────────────────────────────

  /** Transform a die value (instant W1: react to own roll, or W3: react to enemy roll) */
  withTransformDie(uid, newValue) {
    const inActive = this.active.find(d => d.uid === uid);
    const inPicked = this.picked.find(d => d.uid === uid);
    if (!inActive && !inPicked) return this;

    const next = this._clone();
    if (inActive) {
      next.active = this.active.map(d =>
        d.uid === uid ? { ...d, value: newValue, _transformed: true } : d
      );
    } else {
      next.picked = this.picked.map(d =>
        d.uid === uid ? { ...d, value: newValue, _transformed: true } : d
      );
    }
    return next;
  }

  /** Shatter: remove die from picked, return to active (instant W2/W4) */
  withShatterDie(uid) {
    const die = this.picked.find(d => d.uid === uid);
    if (!die) return this;
    const next = this._clone();
    next.picked = this.picked.filter(d => d.uid !== uid);
    next.active = [...this.active, { ...die, _shattered: true }];
    return next;
  }

  /** Freeze: mark die as frozen — skip next roll */
  withFreezeDie(uid) {
    const next = this._clone();
    const freeze = d => d.uid === uid ? { ...d, status: 'frozen' } : d;
    next.active = this.active.map(freeze);
    next.picked = this.picked.map(freeze);
    return next;
  }

  // ── Private ───────────────────────────────────────────────────────────────

  _clone() {
    const next = new TurnState();
    next.active             = [...this.active];
    next.picked             = [...this.picked];
    next.archived           = [...this.archived];
    next.feuerhandCount     = this.feuerhandCount;
    next.activeComboChoice  = this.activeComboChoice;
    return next;
  }

  /**
   * Which dice should be rolled next?
   * Owner of this decision is TurnState — not the caller.
   *
   * Returns array of DieStates if re-roll (some dice remain active),
   * or null if fresh roll is needed (caller uses full deck).
   *
   * Cases:
   *   active.length > 0  → re-roll: only the active (non-picked) dice
   *   active.length === 0 → fresh roll (first roll OR feuerhand): caller uses full deck
   */
  get diceToRoll() {
    return this.active.length > 0 ? this.active : null;
  }

  /** Create a fresh turn state */
  static fresh() {
    return new TurnState();
  }
}
