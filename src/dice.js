/**
 * src/dice.js
 * Auto-extracted from bundle. Edit this file.
 */

import { DIE_TEMPLATES } from './constants.js';

/**
 * dice.js — Die and Face classes
 *
 * Face: physical side of a die (1-6)
 *   - number: which face (never changes)
 *   - runeValue: bonus value from rune (null = no rune)
 *   - value: what it scores (runeValue ?? number)
 *
 * Die: a dice with 6 faces and rune slots
 *
 * Split Face: face where runeValue !== number
 * → displayed as "3|1" in UI
 * → PROBABILITY mechanic: two faces with value=1 means P(1) = 2/6
 */


// ── Face ─────────────────────────────────────────────────────────────────

export class Face {
  constructor(number) {
    this.number    = number;   // physical face 1-6, never changes
    this.runeValue = null;     // null = no rune
  }

  /** The value this face scores as */
  get value() {
    return this.runeValue ?? this.number;
  }

  /** True if this face has a rune with different value */
  get isSplit() {
    return this.runeValue !== null && this.runeValue !== this.number;
  }

  /** Display string for UI */
  get displayStr() {
    return this.isSplit ? `${this.number}|${this.runeValue}` : `${this.number}`;
  }

  /** Apply a rune to this face */
  applyRune(value) {
    this.runeValue = value;
  }

  /** Remove rune from this face */
  removeRune() {
    this.runeValue = null;
  }

  toJSON() {
    return { number: this.number, runeValue: this.runeValue };
  }

  static fromJSON(data) {
    const f = new Face(data.number);
    f.runeValue = data.runeValue;
    return f;
  }
}

// ── Die ──────────────────────────────────────────────────────────────────

export class Die {
  constructor(uid, templateId, template) {
    this.uid        = uid;
    this.templateId = templateId;
    this.name       = template.name;
    this.rarity     = template.rarity;
    this.runeSlots  = template.runeSlots;  // max runes this die can have
    this.icon       = template.icon || '⚀';
    this.faces      = [1,2,3,4,5,6].map(n => new Face(n));
  }

  /** All values this die can produce (including rune values) */
  get values() {
    return this.faces.map(f => f.value);
  }

  /** How many faces currently have runes */
  get usedRuneSlots() {
    return this.faces.filter(f => f.runeValue !== null).length;
  }

  /** How many rune slots are still free */
  get freeRuneSlots() {
    return this.runeSlots - this.usedRuneSlots;
  }

  /** Can this die accept another rune? */
  get canEquipRune() {
    return this.freeRuneSlots > 0;
  }

  /**
   * Roll this die — pick a random face.
   * Returns a DieState ready for TurnState.
   *
   * PROBABILITY MECHANIC:
   * All 6 faces have equal probability (1/6).
   * But if two faces have value=1 (one natural, one runed),
   * then P(scoring as 1) = 2/6. This is the rune effect.
   */
  roll(slotIndex = 0) {
    const faceIndex = Math.floor(Math.random() * 6);
    const face = this.faces[faceIndex];
    return {
      uid:       this.uid,
      dieRef:    this,
      value:     face.value,
      faceNum:   face.number,
      isSplit:   face.isSplit,
      status:    'active',
      slotIndex, // fixed position in the grid — never changes after roll
    };
  }

  /** Apply rune to a specific face number (1-6) */
  equipRune(faceNumber, runeValue) {
    if (!this.canEquipRune) return false;
    const face = this.faces.find(f => f.number === faceNumber);
    if (!face || face.runeValue !== null) return false; // already has rune
    face.applyRune(runeValue);
    return true;
  }

  /** Remove rune from a specific face */
  removeRune(faceNumber) {
    const face = this.faces.find(f => f.number === faceNumber);
    if (!face) return false;
    face.removeRune();
    return true;
  }

  toJSON() {
    return {
      uid: this.uid,
      templateId: this.templateId,
      name: this.name,
      rarity: this.rarity,
      runeSlots: this.runeSlots,
      icon: this.icon,
      faces: this.faces.map(f => f.toJSON()),
    };
  }

  static fromJSON(data) {
    const tpl = DIE_TEMPLATES[data.templateId] || {
      name: data.name, rarity: data.rarity,
      runeSlots: data.runeSlots, icon: data.icon
    };
    const die = new Die(data.uid, data.templateId, tpl);
    die.faces = data.faces.map(f => Face.fromJSON(f));
    return die;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────

let _uidCounter = 0;

/** Create a new die from a template ID */
export function mkDie(templateId, uidSuffix = '') {
  const tpl = DIE_TEMPLATES[templateId];
  if (!tpl) throw new Error(`Unknown die template: ${templateId}`);
  const uid = `die_${templateId}_${++_uidCounter}${uidSuffix}`;
  return new Die(uid, templateId, tpl);
}

/** Create starting deck: 6 Iron Cubes */
export function mkStarterDeck() {
  return [0,1,2,3,4,5].map(i => mkDie('iron_cube', `_s${i}`));
}

/** Roll a full deck — returns array of DieState */
// NOTE: Frozen-dice logic (for future Freeze-Spell implementation):
// When a die is frozen, it keeps its current value and skips the next roll.
// Implementation: DieState gains status:'frozen' + _frozenValue field.
// rollDeck was: dice.map(die => frozenUids.has(die.uid)
//   ? { uid, dieRef, value: die._frozenValue, status:'active', frozen:true }
//   : die.roll())
// This will live in TurnState.diceToRoll or _animateRoll when implemented.

// ── Rune Application ──────────────────────────────────────────────────────

/**
 * Apply a rune from a player's rune pouch to a die face.
 * Removes rune from pouch on success.
 * Returns { success, message }
 */
export function applyRune(player, dieUid, faceNumber, runeValue) {
  const die = player.ownedDice.find(d => d.uid === dieUid);
  if (!die) return { success: false, message: 'Die not found' };
  if (!die.canEquipRune) return { success: false, message: 'No free rune slots' };

  const face = die.faces.find(f => f.number === faceNumber);
  if (!face) return { success: false, message: 'Invalid face number' };
  if (face.runeValue !== null) return { success: false, message: 'Face already has a rune' };

  // Consume rune from pouch
  if (!player.runes.length) return { success: false, message: 'No runes in pouch' };
  player.runes.splice(0, 1); // consume one rune

  face.applyRune(runeValue);
  return { success: true, message: `Rune applied: Face ${faceNumber} → also scores as ${runeValue}` };
}

// ── Probability Display ───────────────────────────────────────────────────

/**
 * Calculate probability of each value for a die.
 * Useful for tooltips and AI decision-making.
 * Returns Map<value, probability>
 */
// NOTE: getDiceProbabilities removed — unused.
// scoringProbability(die) in the same module covers the AI use case.

/**
 * Probability that a die scores at least something (value 1 or 5)
 */
export function scoringProbability(die) {
  const scoringFaces = die.faces.filter(f => f.value === 1 || f.value === 5).length;
  return scoringFaces / 6;
}
