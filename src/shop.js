/**
 * src/shop.js
 * Auto-extracted from bundle. Edit this file.
 */

import { SHOP_ITEMS, RARITY_WEIGHTS } from './constants.js';

/**
 * shop.js — ShopState and offer generation
 * One ShopState per player — identical logic for both.
 */


export class ShopState {
  constructor(owner) {
    this.owner        = owner;   // PlayerState reference
    this.milestones   = new Set();
    this.queue        = [];      // pending ShopWindow objects
    this.current      = null;
    this.windowIndex  = 0;
    this.windowTotal  = 0;
  }

  /** Check if new shop windows triggered after banking score */
  checkMilestones(newTotal) {
    const newShops = [];
    for (let t = 1000; t <= newTotal; t += 1000) {
      if (!this.milestones.has(t)) {
        this.milestones.add(t);
        this.queue.push({ triggeredAt: t });
        newShops.push(t);
      }
    }
    this.windowTotal = this.milestones.size;
    return newShops;
  }

  /** Open next shop window. Returns false if none pending. */
  openNext() {
    if (!this.queue.length) return false;
    this.current = this.queue.shift();
    this.windowIndex++;
    return true;
  }

  close() {
    this.current = null;
  }

  get counterLabel() {
    return `Shop ${this.windowIndex} / ${this.windowTotal}`;
  }

  get hasPending() {
    return this.queue.length > 0;
  }

  canAfford(cost) {
    return this.owner.coins >= cost;
  }
}

// ── Offer Generation ──────────────────────────────────────────────────────

/**
 * Generate shop offer — exactly 2 items from 2 randomly chosen categories.
 * Categories: dice, rune, enchantment, spell (sorcery/instant both count as 'spell').
 * Two categories are chosen randomly each visit; one item per category.
 */
export function buildOffer(player) {
  const ALL_CATEGORIES = ['dice', 'rune', 'enchantment', 'spell'];

  // Shuffle and take first 2
  const shuffled = [...ALL_CATEGORIES].sort(() => Math.random() - 0.5);
  const chosen = shuffled.slice(0, 2);

  const items = chosen.map(type => {
    const pool = SHOP_ITEMS.filter(i => i.type === type && isAvailable(i, player));
    if (!pool.length) return null;
    return weightedRandom(buildWeightedPool(pool));
  });

  return { items };
}

function isAvailable(item, player) {
  if (item.type === 'dice') {
    const owned = (player.ownedDice||[]).filter(d => d.templateId === item.tpl).length;
    const max = item.rarity === 'godlike' ? 1 : 3;
    return owned < max;
  }
  // Always available
  return true;
}

function buildWeightedPool(items) {
  return items.flatMap(item => {
    const weight = RARITY_WEIGHTS[item.rarity] || 10;
    return Array(weight).fill(item);
  });
}

function weightedRandom(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Buy Logic ─────────────────────────────────────────────────────────────

/**
 * Execute a purchase.
 * Returns { success, message }
 */
export function buy(item, player, mkDieFn) {
  if (!player.shop.canAfford(item.cost)) {
    return { success: false, message: 'Not enough gold' };
  }

  player.spendGold(item.cost);

  switch (item.type) {
    case 'dice': {
      const die = mkDieFn(item.tpl, player.ownedDice.length);
      player.addDie(die);
      return { success: true, message: `${item.name} added to vault` };
    }

    case 'rune': {
      player.runes.push({ ...item, instanceId: `rune_${Date.now()}` });
      return { success: true, message: 'Rune added to pouch' };
    }

    case 'enchantment': {
      player.applyEnchant(item);
      return { success: true, message: `Enchantment active: ${item.name}` };
    }

    case 'spell': {
      player.addSpell(item);
      return { success: true, message: `${item.name} added to spell inventory` };
    }

    default:
      return { success: false, message: `Unknown item type: ${item.type}` };
  }
}

// ── AI Shop Decision ──────────────────────────────────────────────────────

/** Greedy AI shop decision — picks best affordable item */
export function greedyShopDecide(offer, player) {
  const items = (offer?.items || []).filter(Boolean);

  const affordable = items.filter(o => player.coins >= o.cost);
  if (!affordable.length) return null;

  // Priority: enchantment > dice > spell > rune
  const priority = ['enchantment', 'dice', 'spell', 'rune'];
  for (const type of priority) {
    const found = affordable.find(o => o.type === type);
    if (found) return found;
  }

  return affordable[0];
}
