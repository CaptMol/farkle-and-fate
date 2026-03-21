/**
 * src/scoring.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * scoring.js — Pure scoring functions
 * Zero DOM dependency. Fully testable.
 * All functions are pure: same input → same output, no side effects.
 */

// ── Helpers ───────────────────────────────────────────────────────────────

/** Count occurrences of each value in dice array */
function counts(dice) {
  return dice.reduce((acc, d) => {
    acc[d.value] = (acc[d.value] || 0) + 1;
    return acc;
  }, {});
}

/** Get sorted unique values from dice */
function uniqueValues(dice) {
  return [...new Set(dice.map(d => d.value))].sort((a, b) => a - b);
}

/** Check if sorted array contains n consecutive values starting at any point */
function hasConsecutive(vals, n) {
  for (let i = 0; i <= vals.length - n; i++) {
    let consecutive = true;
    for (let j = 1; j < n; j++) {
      if (vals[i + j] !== vals[i] + j) { consecutive = false; break; }
    }
    if (consecutive) return vals[i]; // returns starting value
  }
  return null;
}

// ── Street Detection ──────────────────────────────────────────────────────

function isFullStreet(dice) {
  if (dice.length < 6) return false;
  return dice.map(d => d.value).sort((a,b)=>a-b).join(',') === '1,2,3,4,5,6';
}

function isSt5(dice) {
  if (dice.length < 5) return false;
  const uv = uniqueValues(dice);
  return hasConsecutive(uv, 5) !== null;
}

function isSt4(dice) {
  if (dice.length < 4) return false;
  const uv = uniqueValues(dice);
  return hasConsecutive(uv, 4) !== null;
}

function isGallows(dice) {
  // MUST be exactly 3 dice with values 3,4,5
  if (dice.length !== 3) return false;
  const vals = dice.map(d => d.value).sort((a,b)=>a-b);
  return vals[0] === 3 && vals[1] === 4 && vals[2] === 5;
}

function is3Pairs(dice) {
  if (dice.length !== 6) return false;
  const c = counts(dice);
  return Object.values(c).filter(v => v >= 2).length >= 3;
}

function is6K(dice) {
  if (dice.length < 6) return false;
  return Object.values(counts(dice)).some(v => v >= 6);
}

// ── Combo Detection ───────────────────────────────────────────────────────

/**
 * Find all valid combos in a pool of dice.
 * Returns array of combo objects: { type, diceUids, score, label }
 * Uses die.value — post-roll fixed values, no ambiguity.
 */
export function findAllCombos(dice) {
  if (!dice || !dice.length) return [];
  const combos = [];
  const c = counts(dice);

  // Full Street (1-2-3-4-5-6)
  if (isFullStreet(dice)) {
    combos.push({
      type: 'fullSt',
      diceUids: dice.map(d => d.uid),
      score: 1000,
      label: "Pilgrim's Path (1-6)"
    });
    return combos; // Full street consumes all dice — no other combos possible
  }

  // 6 of a Kind
  if (is6K(dice)) {
    combos.push({
      type: '6K',
      diceUids: dice.map(d => d.uid),
      score: 3000,
      label: "Dragon's Hoard (6×)"
    });
    return combos;
  }

  // 3 Pairs
  if (is3Pairs(dice)) {
    combos.push({
      type: '3P',
      diceUids: dice.map(d => d.uid),
      score: 1500,
      label: 'Twin Fates (3 pairs)'
    });
  }

  // 5-Street
  if (isSt5(dice)) {
    const uv = uniqueValues(dice);
    const start = hasConsecutive(uv, 5);
    const streetVals = [start, start+1, start+2, start+3, start+4];
    const streetDice = [];
    const used = new Set();
    for (const v of streetVals) {
      const die = dice.find(d => d.value === v && !used.has(d.uid));
      if (die) { streetDice.push(die); used.add(die.uid); }
    }
    if (streetDice.length === 5) {
      const label = start === 1 ? "Knight's March (1-5)" : "Shadow Road (2-6)";
      combos.push({ type: 'st5', diceUids: streetDice.map(d => d.uid), score: 500, label });
    }
  }

  // 4-Street
  if (isSt4(dice)) {
    const uv = uniqueValues(dice);
    const start = hasConsecutive(uv, 4);
    const streetVals = [start, start+1, start+2, start+3];
    const streetDice = [];
    const used = new Set();
    for (const v of streetVals) {
      const die = dice.find(d => d.value === v && !used.has(d.uid));
      if (die) { streetDice.push(die); used.add(die.uid); }
    }
    if (streetDice.length === 4) {
      combos.push({
        type: 'st4',
        diceUids: streetDice.map(d => d.uid),
        score: 400,
        label: "Wanderer's Road (4 consec.)"
      });
    }
  }

  // Gallows (3-4-5) — only when exactly 3 dice remain
  if (dice.length === 3 && isGallows(dice)) {
    combos.push({
      type: 'gallows',
      diceUids: dice.map(d => d.uid),
      score: 300,
      label: 'The Gallows (3-4-5)'
    });
  }

  // N-of-a-Kind (3, 4, 5, 6)
  // Also works with picked dice for partial picks
  Object.entries(c)
    .filter(([, cnt]) => cnt >= 3)
    .sort(([, a], [, b]) => b - a)
    .forEach(([vs, cnt]) => {
      const v = parseInt(vs);
      // Collect UIDs for this NK — include rune-value matches
      const nkDice = dice.filter(d => d.value === v);
      if (nkDice.length < 3) return;

      const baseScore = v === 1 ? 1000 : v * 100;
      const multiplier = cnt >= 6 ? 64 : cnt >= 5 ? 16 : cnt >= 4 ? 4 : 1;
      const score = baseScore * multiplier;
      const label = `${cnt}× ${v}s`;

      combos.push({
        type: `nk${cnt}_${v}`,
        diceUids: nkDice.map(d => d.uid),
        score,
        label,
        nkVal: v,
        nkCnt: cnt
      });
    });

  return combos;
}

// ── Main Score Calculator ─────────────────────────────────────────────────

/**
 * Calculate score for a set of dice.
 * @param {DieState[]} dice — array with .uid and .value
 * @param {Object} perPickEnchants — { ones_bonus, fives_bonus, street_bonus, triplet_bonus }
 * @returns {{ total: number, combos: ComboResult[] }}
 */
export function calcScore(dice, perPickEnchants = {}) {
  if (!dice || !dice.length) return { total: 0, combos: [] };

  const enc = perPickEnchants;
  const results = [];
  let total = 0;

  // Full street — consumes all 6
  if (isFullStreet(dice)) {
    const bonus = enc.street_bonus || 0;
    const score = 1000 + bonus;
    return { total: score, combos: [{ label: "Pilgrim's Path", score, highlight: true }] };
  }

  // 6 of a kind
  if (is6K(dice)) {
    return { total: 3000, combos: [{ label: "Dragon's Hoard!", score: 3000, highlight: true }] };
  }

  // 3 pairs
  if (is3Pairs(dice) && dice.length === 6) {
    return { total: 1500, combos: [{ label: 'Twin Fates', score: 1500, highlight: true }] };
  }

  // 5-street
  if (isSt5(dice)) {
    const bonus = enc.street_bonus || 0;
    const score = 500 + bonus;
    const uv = uniqueValues(dice);
    const start = hasConsecutive(uv, 5);
    const label = start === 1 ? "Knight's March (1-5)" : "Shadow Road (2-6)";
    const used = new Set();
    const streetVals = [start,start+1,start+2,start+3,start+4];
    for (const v of streetVals) {
      const d = dice.find(x => x.value === v && !used.has(x.uid));
      if (d) used.add(d.uid);
    }
    // Remaining dice scored individually
    const rest = dice.filter(d => !used.has(d.uid));
    const restResult = calcScore(rest, enc);
    return {
      total: score + restResult.total,
      combos: [{ label, score, highlight: true }, ...restResult.combos]
    };
  }

  // 4-street
  if (isSt4(dice)) {
    const bonus = enc.street_bonus || 0;
    const score = 400 + bonus;
    const uv = uniqueValues(dice);
    const start = hasConsecutive(uv, 4);
    const used = new Set();
    const streetVals = [start,start+1,start+2,start+3];
    for (const v of streetVals) {
      const d = dice.find(x => x.value === v && !used.has(x.uid));
      if (d) used.add(d.uid);
    }
    const rest = dice.filter(d => !used.has(d.uid));
    const restResult = calcScore(rest, enc);
    return {
      total: score + restResult.total,
      combos: [{ label: "Wanderer's Road", score, highlight: true }, ...restResult.combos]
    };
  }

  // Gallows (exactly 3 dice: 3,4,5)
  if (dice.length === 3 && isGallows(dice)) {
    const score = 300;
    return { total: score, combos: [{ label: 'The Gallows (3-4-5)', score, highlight: true }] };
  }

  // N-of-a-Kind + singles
  const c = counts(dice);
  const scored = new Set();

  // Process NK (highest count first, highest value first)
  Object.entries(c)
    .filter(([, cnt]) => cnt >= 3)
    .sort(([va, ca], [vb, cb]) => cb - ca || parseInt(vb) - parseInt(va))
    .forEach(([vs, cnt]) => {
      const v = parseInt(vs);
      const nkDice = dice.filter(d => d.value === v && !scored.has(d.uid));
      const actualCnt = Math.min(cnt, nkDice.length);
      if (actualCnt < 3) return;

      const used = nkDice.slice(0, actualCnt);
      used.forEach(d => scored.add(d.uid));

      const baseScore = v === 1 ? 1000 : v * 100;
      const tripBonus = enc.triplet_bonus || 0;
      const multiplier = actualCnt >= 6 ? 64 : actualCnt >= 5 ? 16 : actualCnt >= 4 ? 4 : 1;
      const score = (baseScore + tripBonus) * multiplier;
      const names = ['','','','Triplet','Quad','Quintet','Sextet'];
      results.push({ label: `${names[actualCnt] || actualCnt+'×'} ${v}s`, score, highlight: actualCnt > 3 });
      total += score;
    });

  // Singles (1s and 5s not already scored in NK)
  dice.filter(d => !scored.has(d.uid)).forEach(d => {
    if (d.value === 1) {
      const score = 100 + (enc.ones_bonus || 0);
      results.push({ label: `1 (${score}pts)`, score });
      total += score;
    } else if (d.value === 5) {
      const score = 50 + (enc.fives_bonus || 0);
      results.push({ label: `5 (${score}pts)`, score });
      total += score;
    }
  });

  return { total, combos: results };
}

// ── End-of-Turn Enchantments ──────────────────────────────────────────────

/**
 * Apply end-of-turn enchantments to the raw turn score.
 * Called once at bankScore() — never during picking.
 */
export function applyEndEnchants(rawScore, endEnchants = {}) {
  let score = rawScore;
  if (endEnchants.double_score) score *= 2;
  // Future: other end-of-turn enchantments here
  return Math.floor(score);
}

// ── Scroable UIDs ─────────────────────────────────────────────────────────

/**
 * Returns Set of UIDs that can be picked from activeDice.
 * Includes: dice in the best combo + standalone 1s/5s not in that combo.
 */
export function getScorableUids(activeDice, activeComboChoice = null) {
  if (!activeDice.length) return new Set();
  const scorable = new Set();
  const allCombos = findAllCombos(activeDice);

  if (allCombos.length) {
    // Pick active combo (chosen or highest scoring)
    const activeCombo = activeComboChoice
      ? allCombos.find(c => c.type === activeComboChoice) || allCombos[0]
      : allCombos.sort((a, b) => b.score - a.score)[0];

    activeCombo.diceUids.forEach(uid => scorable.add(uid));

    // Also mark standalone 1s/5s NOT part of this combo
    activeDice.forEach(d => {
      if (!scorable.has(d.uid) && (d.value === 1 || d.value === 5)) {
        scorable.add(d.uid);
      }
    });
    return scorable;
  }

  // No combos — only standalone 1s/5s
  activeDice.forEach(d => {
    if (d.value === 1 || d.value === 5) scorable.add(d.uid);
  });
  return scorable;
}

// ── Farkle Detection ──────────────────────────────────────────────────────

/** Returns true if no dice in pool can score */
export function isFarkle(activeDice) {
  return getScorableUids(activeDice).size === 0;
}

/** Returns true if all dice have been picked (Hot Dice / Feuerhand) */
export function isHotDice(activeDice) {
  return activeDice.length === 0;
}

// ── Gold Formula ──────────────────────────────────────────────────────────

export const GOLD_FORMULA = {
  base:  score => Math.floor(score / 20),
  bonus: score => score >= 2000 ? 15 : score >= 1000 ? 10 : score >= 500 ? 5 : 0,
  total: score => GOLD_FORMULA.base(score) + GOLD_FORMULA.bonus(score)
};
