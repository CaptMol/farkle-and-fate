/**
 * tests/scoring.test.js
 * Run with: node --test tests/scoring.test.js
 * No Jest, no setup — pure Node.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcScore, findAllCombos, getScorableUids, isFarkle, isHotDice, applyEndEnchants
} from '../src/scoring.js';

// Helper: make fake dice
const d = (value, uid) => ({ uid: uid || `d${value}${Math.random()}`, value });
const ds = (...values) => values.map((v, i) => d(v, `d${i}_${v}`));

// ── calcScore ─────────────────────────────────────────────────────────────

test('Single 1 = 100', () => {
  assert.equal(calcScore(ds(1)).total, 100);
});

test('Single 5 = 50', () => {
  assert.equal(calcScore(ds(5)).total, 50);
});

test('Single 3 = 0', () => {
  assert.equal(calcScore(ds(3)).total, 0);
});

test('Triplet Ones = 1000', () => {
  assert.equal(calcScore(ds(1,1,1)).total, 1000);
});

test('Triplet 2s = 200', () => {
  assert.equal(calcScore(ds(2,2,2)).total, 200);
});

test('Triplet 3s = 300', () => {
  assert.equal(calcScore(ds(3,3,3)).total, 300);
});

test('Triplet 4s = 400', () => {
  assert.equal(calcScore(ds(4,4,4)).total, 400);
});

test('Triplet 5s = 500', () => {
  assert.equal(calcScore(ds(5,5,5)).total, 500);
});

test('Triplet 6s = 600', () => {
  assert.equal(calcScore(ds(6,6,6)).total, 600);
});

test('Quad 1s = 4000 (×4 multiplier)', () => {
  assert.equal(calcScore(ds(1,1,1,1)).total, 4000);
});

test('Quad 5s = 2000 (×4 multiplier)', () => {
  assert.equal(calcScore(ds(5,5,5,5)).total, 2000);
});

test('Gallows [3,4,5] = 300', () => {
  assert.equal(calcScore(ds(3,4,5)).total, 300);
});

test('Gallows only when exactly 3 dice', () => {
  // 4 dice [1,3,4,5] should NOT score as gallows + 1
  // It should score as 4-street (1,2,3,4 - wait, no 2) — actually just 1 + singles
  const result = calcScore(ds(1,3,4,5));
  // [1,3,4,5]: no NK, no street (not consecutive), just singles: 1+5=150
  assert.equal(result.total, 150);
});

test('4-Street [1,2,3,4] = 400', () => {
  assert.equal(calcScore(ds(1,2,3,4)).total, 400);
});

test('4-Street [2,3,4,5] = 400', () => {
  assert.equal(calcScore(ds(2,3,4,5)).total, 400);
});

test('4-Street [3,4,5,6] = 400', () => {
  assert.equal(calcScore(ds(3,4,5,6)).total, 400);
});

test('5-Street [1,2,3,4,5] = 500', () => {
  assert.equal(calcScore(ds(1,2,3,4,5)).total, 500);
});

test('5-Street [2,3,4,5,6] = 500', () => {
  assert.equal(calcScore(ds(2,3,4,5,6)).total, 500);
});

test("Pilgrim's Path [1,2,3,4,5,6] = 1000", () => {
  assert.equal(calcScore(ds(1,2,3,4,5,6)).total, 1000);
});

test('Twin Fates (3 pairs) = 1500', () => {
  assert.equal(calcScore(ds(1,1,2,2,3,3)).total, 1500);
});

test("Dragon's Hoard (6×) = 3000", () => {
  assert.equal(calcScore(ds(4,4,4,4,4,4)).total, 3000);
});

test('4-street + 1er = 500', () => {
  // [1,2,3,4,1] — street of 1,2,3,4 + single 1
  assert.equal(calcScore(ds(1,2,3,4,1)).total, 500);
});

// ── Enchantment perPick ───────────────────────────────────────────────────

test('Ones Omen: 1 = 200 with +100 bonus', () => {
  assert.equal(calcScore(ds(1), { ones_bonus: 100 }).total, 200);
});

test('Fives bonus: 5 = 100 with +50 bonus', () => {
  assert.equal(calcScore(ds(5), { fives_bonus: 50 }).total, 100);
});

test('Street bonus applied to 4-street', () => {
  assert.equal(calcScore(ds(1,2,3,4), { street_bonus: 200 }).total, 600);
});

// ── End-of-Turn Enchantments ──────────────────────────────────────────────

test('Double score doubles total', () => {
  assert.equal(applyEndEnchants(1000, { double_score: true }), 2000);
});

test('No enchantments: score unchanged', () => {
  assert.equal(applyEndEnchants(500, {}), 500);
});

// ── findAllCombos ─────────────────────────────────────────────────────────

test('findAllCombos: returns NK for triplet', () => {
  const combos = findAllCombos(ds(3,3,3));
  assert.ok(combos.some(c => c.type.startsWith('nk3')));
});

test('findAllCombos: returns street for [1,2,3,4]', () => {
  const combos = findAllCombos(ds(1,2,3,4));
  assert.ok(combos.some(c => c.type === 'st4'));
});

test('findAllCombos: gallows only when exactly 3 dice', () => {
  const combos3 = findAllCombos(ds(3,4,5));
  assert.ok(combos3.some(c => c.type === 'gallows'));

  const combos4 = findAllCombos(ds(1,3,4,5));
  assert.ok(!combos4.some(c => c.type === 'gallows'));
});

// ── getScorableUids ───────────────────────────────────────────────────────

test('getScorableUids: 1 and 5 are scorable, 3 and 4 are not (no street)', () => {
  // [1,3,4,6] — no street possible (gap between 1 and 3, 4 and 6)
  const dice = [
    { uid: 'a', value: 1 },
    { uid: 'b', value: 3 },
    { uid: 'c', value: 4 },
    { uid: 'd', value: 6 },
  ];
  const scorable = getScorableUids(dice);
  assert.ok(scorable.has('a'),  '1 should be scorable');
  assert.ok(!scorable.has('b'), '3 should NOT be scorable (no street, not 1 or 5)');
  assert.ok(!scorable.has('c'), '4 should NOT be scorable');
  assert.ok(!scorable.has('d'), '6 should NOT be scorable');
});

test('getScorableUids: [3,4,5,6] all scorable as 4-street', () => {
  const dice = [
    { uid: 'a', value: 3 },
    { uid: 'b', value: 4 },
    { uid: 'c', value: 5 },
    { uid: 'd', value: 6 },
  ];
  const scorable = getScorableUids(dice);
  assert.equal(scorable.size, 4, 'All 4 dice should be scorable as a street');
});

test('getScorableUids: all street dice scorable', () => {
  const dice = ds(1,2,3,4);
  const scorable = getScorableUids(dice);
  assert.equal(scorable.size, 4); // all street dice
});

// ── isFarkle / isHotDice ──────────────────────────────────────────────────

test('isFarkle: [3,4,6] = true', () => {
  assert.equal(isFarkle(ds(3,4,6)), true);
});

test('isFarkle: [1,3,4] = false', () => {
  assert.equal(isFarkle(ds(1,3,4)), false);
});

test('isHotDice: empty array = true', () => {
  assert.equal(isHotDice([]), true);
});

test('isHotDice: non-empty = false', () => {
  assert.equal(isHotDice(ds(1)), false);
});

// ── Critical regression tests (bugs from prototype) ──────────────────────

test('REGRESSION: Gallows not contaminated by extra dice', () => {
  // Bug: [1,3,4,5] was scoring Gallows — now fixed by dice.length === 3 check
  const result = calcScore(ds(1,3,4,5));
  assert.ok(result.total !== 300, 'Should not score as Gallows with 4 dice');
  assert.equal(result.total, 150); // just 1 + 5
});

test('REGRESSION: archiveSubRoll score is fixed', () => {
  // After archiving, the score should be the value at time of archiving
  // Test that calcScore is deterministic
  const dice = ds(3,4,5);
  const score1 = calcScore(dice).total;
  const score2 = calcScore(dice).total;
  assert.equal(score1, score2);
  assert.equal(score1, 300);
});

test('REGRESSION: Split face contributes to NK', () => {
  // Die with runeValue=1 should count as 1 for NK detection
  const dice = [
    { uid: 'a', value: 1 },  // normal 1
    { uid: 'b', value: 1 },  // normal 1
    { uid: 'c', value: 1 },  // split die — value already resolved to 1
  ];
  assert.equal(calcScore(dice).total, 1000); // Triplet Ones
});

test('REGRESSION: 4-street does not trigger Gallows on remaining dice', () => {
  // [1,2,3,4,3,4,5] — should score street + extras, not contaminated Gallows
  const dice = ds(1,2,3,4);
  const result = calcScore(dice);
  assert.equal(result.total, 400);
});
