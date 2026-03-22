/**
 * src/PlayerState.js
 * Auto-extracted from bundle. Edit this file.
 */

import { GOLD_FORMULA } from './scoring.js';
import { ShopState } from './shop.js';

/**
 * PlayerState.js
 * Identical class for both human player and AI enemy.
 * The only difference: isHuman controls whether actions wait for UI or use AI.
 */


export class PlayerState {
  constructor({ id, isHuman = false, name = null }) {
    this.id       = id;       // 'player' | 'enemy'
    this.isHuman  = isHuman;
    this.name     = name || (isHuman ? 'Player' : 'Enemy');

    // Progress
    this.total    = 0;        // accumulated score this run
    this.target   = 10000;    // win condition — manipulable by spells
    this.coins    = 50;       // starting gold

    // Deck
    this.ownedDice  = [];     // full collection
    this.deckUids   = [];     // which dice are in active deck (max 6)

    // Upgrades
    this.enchants = {
      perPick:   {},          // applied during calcScore()
      endOfTurn: {}           // applied during bankScore()
    };
    this.enchantLog = [];     // ordered list of individual purchases for display
    this.spells   = [];       // consumable spells (hidden from opponent)
    this.runes    = [];       // rune pouch — bought, not yet equipped

    // Shop
    this.shop = new ShopState(this);

    // Meta
    this.winStreak  = 0;
    this.tier       = 0;

    // Avatar (placeholder for pixel art)
    this.avatar = {
      sprite: null,           // future: pixel art sprite URL
      title:  null,           // e.g. "The Iron Merchant", "Lady Hexara"
    };
  }

  // ── Deck Management ──────────────────────────────────────────────────────

  get activeDeck() {
    return this.deckUids
      .map(uid => this.ownedDice.find(d => d.uid === uid))
      .filter(Boolean);
  }

  toggleDeck(uid) {
    if (this.deckUids.includes(uid)) {
      if (this.deckUids.length > 1) { // always keep at least 1
        this.deckUids = this.deckUids.filter(u => u !== uid);
      }
    } else {
      if (this.deckUids.length < 6) {
        this.deckUids.push(uid);
      }
    }
  }

  addDie(die) {
    this.ownedDice.push(die);
    if (this.deckUids.length < 6) {
      this.deckUids.push(die.uid);
    }
  }

  // ── Enchantment Management ───────────────────────────────────────────────

  applyEnchant(enchant) {
    const target = enchant.timing === 'endOfTurn'
      ? this.enchants.endOfTurn
      : this.enchants.perPick;

    switch (enchant.eid) {
      case 'ones_bonus':
        target.ones_bonus = (target.ones_bonus || 0) + enchant.value;
        break;
      case 'fives_bonus':
        target.fives_bonus = (target.fives_bonus || 0) + enchant.value;
        break;
      case 'street_bonus':
        target.street_bonus = (target.street_bonus || 0) + enchant.value;
        break;
      case 'triplet_bonus':
        target.triplet_bonus = (target.triplet_bonus || 0) + enchant.value;
        break;
      case 'double_score':
        this.enchants.endOfTurn.double_score = true;
        break;
    }

    // Record individual purchase for tile display
    this.enchantLog.push({
      name:    enchant.name,
      icon:    enchant.icon || '✦',
      desc:    enchant.desc || '',
      rarity:  enchant.rarity || 'common',
    });
  }

  resetEnchants() {
    this.enchants    = { perPick: {}, endOfTurn: {} };
    this.enchantLog  = [];
  }

  // ── Gold ─────────────────────────────────────────────────────────────────

  earnGold(score) {
    const earned = GOLD_FORMULA.total(score);
    this.coins += earned;
    return earned;
  }

  spendGold(amount) {
    if (this.coins < amount) return false;
    this.coins -= amount;
    return true;
  }

  // ── Score / Win ───────────────────────────────────────────────────────────

  bankScore(endScore) {
    this.total += endScore;
    // Check shop milestones after banking
    const newShops = this.shop.checkMilestones(this.total);
    return { newShops, won: this.total >= this.target };
  }

  // ── Spell Management ──────────────────────────────────────────────────────

  addSpell(spell) {
    this.spells.push({ ...spell, instanceId: `${spell.id}_${Date.now()}` });
  }

  consumeSpell(instanceId) {
    const idx = this.spells.findIndex(s => s.instanceId === instanceId);
    if (idx === -1) return null;
    return this.spells.splice(idx, 1)[0];
  }

  getPlayableInstants(windowType) {
    return this.spells.filter(s =>
      s.timing === 'instant' && s.windows?.includes(windowType)
    );
  }

  // ── Serialization (for localStorage) ─────────────────────────────────────

  toJSON() {
    return {
      id: this.id,
      isHuman: this.isHuman,
      name: this.name,
      total: this.total,
      target: this.target,
      coins: this.coins,
      ownedDice: this.ownedDice,
      deckUids: this.deckUids,
      enchants: this.enchants,
      spells: this.spells,
      runes: this.runes,
      winStreak: this.winStreak,
      tier: this.tier,
      avatar: this.avatar,
    };
  }

  static fromJSON(data) {
    const p = new PlayerState({ id: data.id, isHuman: data.isHuman, name: data.name });
    Object.assign(p, data);
    p.shop = new ShopState(p);
    return p;
  }
}
