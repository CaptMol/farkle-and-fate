/**
 * src/constants.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * constants.js — All game data
 * Pure data, zero logic, zero DOM.
 * Add new items here — no code changes elsewhere needed.
 */

// ── Die Templates ─────────────────────────────────────────────────────────

export const DIE_TEMPLATES = {
  iron_cube:    { name: 'Iron Cube',    rarity: 'common',    runeSlots: 0, icon: '⚀', cost: 0 },
  bone_die:     { name: 'Bone Die',     rarity: 'rare',      runeSlots: 1, icon: '⚁', cost: 30 },
  arcane_prism: { name: 'Arcane Prism', rarity: 'epic',      runeSlots: 2, icon: '⚄', cost: 50 },
  void_cube:    { name: 'Void Cube',    rarity: 'epic',      runeSlots: 2, icon: '⚃', cost: 50 },
  chaos_shard:  { name: 'Chaos Shard',  rarity: 'legendary', runeSlots: 3, icon: '⚅', cost: 80 },
  fate_die:     { name: 'Fate Die',     rarity: 'legendary', runeSlots: 3, icon: '✦', cost: 80 },
  godlike_die:  { name: 'Godlike Die',  rarity: 'godlike',   runeSlots: 4, icon: '👁', cost: 150 },
};

// ── Shop Items ────────────────────────────────────────────────────────────

export const SHOP_ITEMS = [

  // ── DICE ──
  { id: 'sh_bone',  name: 'Bone Die',      type: 'dice', rarity: 'rare',      icon: '⚁', cost: 30,  tpl: 'bone_die',     desc: '1 rune slot' },
  { id: 'sh_prism', name: 'Arcane Prism',  type: 'dice', rarity: 'epic',      icon: '⚄', cost: 50,  tpl: 'arcane_prism', desc: '2 rune slots' },
  { id: 'sh_void',  name: 'Void Cube',     type: 'dice', rarity: 'epic',      icon: '⚃', cost: 50,  tpl: 'void_cube',    desc: '2 rune slots' },
  { id: 'sh_chaos', name: 'Chaos Shard',   type: 'dice', rarity: 'legendary', icon: '⚅', cost: 80,  tpl: 'chaos_shard',  desc: '3 rune slots' },
  { id: 'sh_fate',  name: 'Fate Die',      type: 'dice', rarity: 'legendary', icon: '✦', cost: 80,  tpl: 'fate_die',     desc: '3 rune slots' },
  { id: 'sh_god',   name: 'Godlike Die',   type: 'dice', rarity: 'godlike',   icon: '👁', cost: 150, tpl: 'godlike_die',  desc: '4 rune slots — ultra rare' },

  // ── RUNE (single type — all identical function) ──
  { id: 'rune_1',   name: 'Rune',          type: 'rune', rarity: 'common',    icon: '🔮', cost: 15,
    desc: 'Add a bonus number (1-6) to any face of a die. Increases probability of that value.' },

  // ── ENCHANTMENTS — perPick ──
  { id: 'enc_ones_1',    name: 'Ones Omen',      type: 'enchantment', rarity: 'common',    icon: '✦', cost: 12,
    eid: 'ones_bonus',   timing: 'perPick',  value: 100, desc: 'Ones score +100 (200 total)' },
  { id: 'enc_ones_2',    name: 'Ones Mastery',   type: 'enchantment', rarity: 'rare',      icon: '✦', cost: 25,
    eid: 'ones_bonus',   timing: 'perPick',  value: 200, desc: 'Ones score +200 (300 total)' },
  { id: 'enc_fives_1',   name: 'Five Touch',     type: 'enchantment', rarity: 'common',    icon: '✦', cost: 12,
    eid: 'fives_bonus',  timing: 'perPick',  value: 50,  desc: 'Fives score +50 (100 total)' },
  { id: 'enc_fives_2',   name: 'Five Power',     type: 'enchantment', rarity: 'rare',      icon: '✦', cost: 25,
    eid: 'fives_bonus',  timing: 'perPick',  value: 100, desc: 'Fives score +100 (150 total)' },
  { id: 'enc_street_1',  name: 'Road Wisdom',    type: 'enchantment', rarity: 'rare',      icon: '✦', cost: 28,
    eid: 'street_bonus', timing: 'perPick',  value: 200, desc: 'Streets score +200' },
  { id: 'enc_street_2',  name: 'Path Master',    type: 'enchantment', rarity: 'epic',      icon: '✦', cost: 45,
    eid: 'street_bonus', timing: 'perPick',  value: 500, desc: 'Streets score +500' },
  { id: 'enc_trip_1',    name: 'Triplet Touch',  type: 'enchantment', rarity: 'rare',      icon: '✦', cost: 28,
    eid: 'triplet_bonus',timing: 'perPick',  value: 100, desc: 'Triplets score +100' },
  { id: 'enc_trip_2',    name: 'Triplet Power',  type: 'enchantment', rarity: 'epic',      icon: '✦', cost: 45,
    eid: 'triplet_bonus',timing: 'perPick',  value: 200, desc: 'Triplets score +200' },

  // ── ENCHANTMENTS — endOfTurn ──
  { id: 'enc_double',    name: 'Double Essence', type: 'enchantment', rarity: 'legendary', icon: '⚡', cost: 60,
    eid: 'double_score', timing: 'endOfTurn', value: true, desc: 'Total turn score ×2 (once per run)' },

  // ── ATTACK SPELLS (sorcery — own turn, multiplies enemy target from base 10000) ──
  { id: 'sp_curse_c',  name: 'Minor Curse',   type: 'spell', category: 'attack', rarity: 'common',    icon: '🎯',
    cost: 25,  timing: 'sorcery', effect: 'target_mult', value: 1.1,  desc: 'Enemy target ×1.1 of base → 11.000 pts' },
  { id: 'sp_curse_r',  name: 'Hex',           type: 'spell', category: 'attack', rarity: 'rare',      icon: '🎯',
    cost: 50,  timing: 'sorcery', effect: 'target_mult', value: 1.25, desc: 'Enemy target ×1.25 of base → 12.500 pts' },
  { id: 'sp_curse_e',  name: 'Greater Curse', type: 'spell', category: 'attack', rarity: 'epic',      icon: '🎯',
    cost: 75,  timing: 'sorcery', effect: 'target_mult', value: 1.5,  desc: 'Enemy target ×1.5 of base → 15.000 pts' },
  { id: 'sp_curse_l',  name: 'Doom',          type: 'spell', category: 'attack', rarity: 'legendary', icon: '🎯',
    cost: 100, timing: 'sorcery', effect: 'target_mult', value: 2.0,  desc: 'Enemy target ×2 of base → 20.000 pts' },

  { id: 'sp_fumble',   name: 'Fumble',        type: 'spell', category: 'attack', rarity: 'epic',      icon: '🎲',
    cost: 75,  timing: 'sorcery', effect: 'one_die_less', value: 1, desc: 'Enemy plays next turn with one fewer die' },

  // ── GOLD STEAL ──
  { id: 'sp_gold_c',   name: 'Pickpocket',    type: 'spell', category: 'attack', rarity: 'common',    icon: '💰',
    cost: 25,  timing: 'sorcery', effect: 'gold_steal', value: 50,   desc: 'Steal 50 🪙 from enemy' },
  { id: 'sp_gold_r',   name: 'Plunder',       type: 'spell', category: 'attack', rarity: 'rare',      icon: '💰',
    cost: 25,  timing: 'sorcery', effect: 'gold_steal', value: 100,  desc: 'Steal 100 🪙 from enemy' },
  { id: 'sp_gold_e',   name: 'Ransack',       type: 'spell', category: 'attack', rarity: 'epic',      icon: '💰',
    cost: 50,  timing: 'sorcery', effect: 'gold_steal', value: 250,  desc: 'Steal 250 🪙 from enemy' },
  { id: 'sp_gold_l',   name: 'Treasury Raid', type: 'spell', category: 'attack', rarity: 'legendary', icon: '💰',
    cost: 75,  timing: 'sorcery', effect: 'gold_steal', value: 500,  desc: 'Steal 500 🪙 from enemy' },

  // ── LIFE STEAL ──
  { id: 'sp_life_r',   name: 'Life Drain',    type: 'spell', category: 'attack', rarity: 'rare',      icon: '🩸',
    cost: 50,  timing: 'sorcery', effect: 'steal_life', value: 500,  desc: 'Steal 500 pts from enemy score' },
  { id: 'sp_life_e',   name: 'Soul Rend',     type: 'spell', category: 'attack', rarity: 'epic',      icon: '🩸',
    cost: 75,  timing: 'sorcery', effect: 'steal_life', value: 1000, desc: 'Steal 1.000 pts from enemy score' },
  { id: 'sp_life_l',   name: 'Essence Drain', type: 'spell', category: 'attack', rarity: 'legendary', icon: '🩸',
    cost: 100, timing: 'sorcery', effect: 'steal_life', value: 2500, desc: 'Steal 2.500 pts from enemy score' },

  // ── DEFENSE SPELLS (instant — farkle windows) ──
  { id: 'sp_shield_1', name: 'Shield I',      type: 'spell', category: 'defense', rarity: 'rare',      icon: '🛡',
    cost: 25,  timing: 'instant', effect: 'farkle_shield', shieldCharges: 1,
    windows: ['INSTANT_FARKLE'], desc: 'On farkle: 1× re-roll. Score preserved.' },
  { id: 'sp_shield_2', name: 'Shield II',     type: 'spell', category: 'defense', rarity: 'epic',      icon: '🛡',
    cost: 50,  timing: 'instant', effect: 'farkle_shield', shieldCharges: 2,
    windows: ['INSTANT_FARKLE'], desc: 'On farkle: up to 2× re-rolls. Score preserved.' },
  { id: 'sp_shield_3', name: 'Shield III',    type: 'spell', category: 'defense', rarity: 'legendary', icon: '🛡',
    cost: 100, timing: 'instant', effect: 'farkle_shield', shieldCharges: 3,
    windows: ['INSTANT_FARKLE'], desc: 'On farkle: up to 3× re-rolls. Score preserved.' },

  // ── UTILITY SPELLS ──
  { id: 'sp_extra',    name: 'Extra Die',     type: 'spell', category: 'defense', rarity: 'epic',      icon: '⚀',
    cost: 75,  timing: 'sorcery', effect: 'extra_die', desc: 'Roll with +1 extra die this turn (7 total)' },
  { id: 'sp_transform',name: 'Transform Die', type: 'spell', category: 'defense', rarity: 'rare',      icon: '🎭',
    cost: 50,  timing: 'instant', effect: 'transform_die',
    windows: ['INSTANT_W1', 'INSTANT_W2'], desc: 'Change one active die to any value (instant)' },
  { id: 'sp_freeze',   name: 'Freeze Die',    type: 'spell', category: 'defense', rarity: 'epic',      icon: '❄',
    cost: 75,  timing: 'instant', effect: 'freeze_die',
    windows: ['INSTANT_W2', 'INSTANT_W4'], desc: 'Freeze one enemy picked die — it returns to their active zone' },
  { id: 'sp_shatter',  name: 'Shatter',       type: 'spell', category: 'attack',  rarity: 'legendary', icon: '💥',
    cost: 100, timing: 'instant', effect: 'shatter_die',
    windows: ['INSTANT_W2', 'INSTANT_W4'], desc: 'Destroy one enemy picked die — removed from this sub-roll' },
];

// ── Shop Drop Weights ─────────────────────────────────────────────────────

export const RARITY_WEIGHTS = {
  common:    20,
  rare:      40,
  epic:      26,
  legendary: 10,
  godlike:    4,
};

// ── Enemy Difficulty Tiers ────────────────────────────────────────────────
// Set on enemy.tier = Math.min(3, Math.floor(player.winStreak / 3))
// Controls AI risk thresholds in greedyRollDecide.
// Higher tier = more aggressive rolling, higher bank thresholds, bonus starting coins.

export const ENEMY_TIERS = [
  {
    label: 'Novice',
    riskCap1Die: 0.67, bankScore1Die: 100,  // 1 remaining die
    riskCap2:    0.44, bankScore2:    300,   // 2 dice
    riskCap3:    0.28, bankScore3:    500,   // 3 dice
    riskCap4:    0.18, bankScore4:    800,   // 4 dice
    desperationGap: 5000, desperationScore: 500,
    defaultBank: 600, bonusCoins: 0,
  },
  {
    label: 'Veteran',
    riskCap1Die: 0.72, bankScore1Die: 80,
    riskCap2:    0.50, bankScore2:    200,
    riskCap3:    0.33, bankScore3:    350,
    riskCap4:    0.22, bankScore4:    650,
    desperationGap: 6000, desperationScore: 600,
    defaultBank: 500, bonusCoins: 30,
  },
  {
    label: 'Champion',
    riskCap1Die: 0.78, bankScore1Die: 50,
    riskCap2:    0.56, bankScore2:    150,
    riskCap3:    0.38, bankScore3:    250,
    riskCap4:    0.26, bankScore4:    500,
    desperationGap: 7000, desperationScore: 700,
    defaultBank: 400, bonusCoins: 60,
  },
  {
    label: 'Warlord',
    riskCap1Die: 0.85, bankScore1Die: 0,
    riskCap2:    0.62, bankScore2:    100,
    riskCap3:    0.45, bankScore3:    200,
    riskCap4:    0.32, bankScore4:    400,
    desperationGap: 9000, desperationScore: 1000,
    defaultBank: 300, bonusCoins: 100,
  },
];

// ── Next Round Challenge Options ──────────────────────────────────────────
// Extensible array — add new challenges here without changing game logic

export const NEXT_ROUND_CHALLENGES = [
  {
    id: 'normal',
    label: 'Normal',
    targetMult: 1.0,
    goldBonus: 0,
    desc: 'Standard run — 10.000 pts',
    icon: '⚔',
  },
  {
    id: 'challenge',
    label: 'Challenge',
    targetMult: 1.5,
    goldBonus: 500,
    desc: 'Harder run — 15.000 pts · +500 🪙',
    icon: '☠',
  },
  {
    id: 'brutal',
    label: 'Brutal',
    targetMult: 2.0,
    goldBonus: 1500,
    desc: 'No mercy — 20.000 pts · +1.500 🪙',
    icon: '💀',
  },
  // Future: uncomment to add new challenges
  // { id: 'chaos', label: 'Chaos', targetMult: () => 1.2 + Math.random() * 1.3, goldBonus: 800, desc: 'Random target · +800 🪙', icon: '🎲' },
  // { id: 'cursed', label: 'Cursed', targetMult: 1.8, goldBonus: 1000, startDebuff: 'fumble', desc: 'Start cursed · +1.000 🪙', icon: '🔮' },
];

// ── Gold Formula ──────────────────────────────────────────────────────────
// Tune during playtesting — all in one place

export const GOLD_CONFIG = {
  perPoint:   1 / 20,     // 1 gold per 20 pts
  bonusAt500: 5,
  bonusAt1000: 10,
  bonusAt2000: 15,
  startingGold: 50,
};

// ── Enemy Names ───────────────────────────────────────────────────────────

export const ENEMIES = [
  { name: 'Magister Vorn',  title: 'The Iron Merchant',  tier: 1 },
  { name: 'Lady Hexara',    title: 'The Bone Weaver',     tier: 1 },
  { name: 'Deckard the Fat',title: 'The Lucky Gambler',   tier: 2 },
  { name: 'Sister Morvane', title: 'The Silent Collector',tier: 2 },
  { name: 'The Pale Baron', title: 'Master of Fates',     tier: 3 },
];

// ── Avatar Placeholders ───────────────────────────────────────────────────

export const PLAYER_AVATAR = {
  sprite: null,        // future: pixel art sprite URL
  defaultName: 'Player',
  defaultTitle: 'The Wanderer',
};
