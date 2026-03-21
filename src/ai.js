/**
 * src/ai.js
 * Auto-extracted from bundle. Edit this file.
 */

import { findAllCombos, getScorableUids, calcScore } from './scoring.js';
import { scoringProbability } from './dice.js';
import { greedyInstantDecide } from './spells.js';
import { greedyShopDecide } from './shop.js';

/**
 * ai.js — Greedy AI
 *
 * All AI decisions are deterministic and fast.
 * No API calls. No randomness except the dice rolls themselves.
 *
 * Key improvement over prototype:
 * - Dynamic farkle probability based on actual die faces (respects runes)
 * - Combo-first selection (always picks whole combo, never partial)
 * - Uses same findAllCombos + getScorableUids as player — identical rules
 */


// ── Farkle Risk Calculation ───────────────────────────────────────────────

/**
 * Calculate probability of farkle (no scoring dice) for a given set of dice.
 * Uses actual die probabilities — respects rune values.
 *
 * P(farkle) = P(no die scores) = product of P(each die doesn't score)
 */
export function calcFarkleProbability(dice) {
  if (!dice.length) return 0;

  return dice.reduce((prob, die) => {
    const dieRef = die.dieRef;
    if (!dieRef) {
      // Fallback: assume standard die (2 scoring faces: 1 and 5)
      return prob * (4/6);
    }
    const pScore = scoringProbability(dieRef);
    return prob * (1 - pScore);
  }, 1);
}

// ── Pick Decision ─────────────────────────────────────────────────────────

/**
 * AI pick decision: choose what to pick from active dice.
 * Returns array of UIDs to pick.
 *
 * Strategy:
 * 1. Always pick the highest-scoring combo if available
 * 2. Otherwise pick all standalone 1s and 5s
 * 3. Never make partial combo picks (combo atomicity)
 */
export function greedyPickDecide(activeDice, pickedDice = []) {
  if (!activeDice.length) return [];

  const combos = findAllCombos(activeDice);

  if (combos.length) {
    // Pick the highest-scoring combo — atomically
    const best = combos.sort((a, b) => b.score - a.score)[0];
    return best.diceUids;
  }

  // No combos — pick all standalone scoring singles
  const scorable = getScorableUids(activeDice);
  return activeDice
    .filter(d => scorable.has(d.uid))
    .map(d => d.uid);
}

// ── Roll/Bank Decision ────────────────────────────────────────────────────

/**
 * Decide whether to roll again or bank.
 * Returns 'roll' | 'bank'
 */
export function greedyRollDecide(turnState, player) {
  const remaining = turnState.active;
  const currentScore = turnState.endScore(player.enchants);

  // Hot Dice — always roll (free roll, score preserved)
  if (turnState.hasHotDice) return 'roll';

  // Nothing picked yet — must pick before deciding
  if (!turnState.hasPickedAnything) return 'pick';

  // Calculate farkle risk on remaining dice
  const farkleRisk = calcFarkleProbability(remaining);

  // Risk thresholds — conservative AI
  if (remaining.length <= 1 && currentScore >= 100) return 'bank';
  if (farkleRisk >= 0.67) return 'bank'; // 1 die: ~67% farkle
  if (farkleRisk >= 0.44 && currentScore >= 300) return 'bank'; // 2 dice
  if (farkleRisk >= 0.28 && currentScore >= 500) return 'bank'; // 3 dice
  if (farkleRisk >= 0.18 && currentScore >= 800) return 'bank'; // 4 dice

  // Far from win — take risks
  const toWin = player.target - player.total;
  if (toWin > 5000 && currentScore < 500) return 'roll'; // need points badly

  // Default: roll if score is low
  return currentScore >= 600 ? 'bank' : 'roll';
}

// ── Full Turn ─────────────────────────────────────────────────────────────

/**
 * Execute one complete AI turn step.
 * Returns the action the AI wants to take.
 *
 * Called by game.js after each phase transition.
 * Returns:
 *   { action: 'pick', uids: [...] }
 *   { action: 'roll' }
 *   { action: 'bank' }
 *   { action: 'pass' }  — for instant windows
 */
export function greedyTurn(phase, turnState, activePlayer, passivePlayer) {
  switch (phase) {

    case 'PICK': {
      const pickUids = greedyPickDecide(turnState.active, turnState.picked);
      if (!pickUids.length) {
        return { action: 'bank' };
      }
      const decision = greedyRollDecide(turnState, activePlayer);
      return { action: 'pick', uids: pickUids, then: decision };
    }

    case 'INSTANT_W1':
    case 'INSTANT_W2':
    case 'INSTANT_FARKLE':
    case 'INSTANT_VICTORY': {
      // AI uses instants as passive player
      const instant = greedyInstantDecide(passivePlayer, activePlayer, turnState, phase);
      if (instant) return { action: 'instant', ...instant };
      return { action: 'pass' };
    }

    case 'SHOP': {
      const offers = activePlayer._currentShopOffers || [];
      const pick = greedyShopDecide(offers, activePlayer);
      return pick ? { action: 'buy', item: pick } : { action: 'skip' };
    }

    default:
      return { action: 'pass' };
  }
}

// ── Next Round Decision ───────────────────────────────────────────────────

/**
 * AI always picks Normal (no self-handicap).
 * Could be made smarter in future (adaptive difficulty).
 */
export function greedyNextRoundDecide() {
  return 'normal';
}
