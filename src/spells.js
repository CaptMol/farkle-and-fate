/**
 * src/spells.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * spells.js — Spell casting and effect resolution
 *
 * castSpell(spell, caster, target, turnState) → { success, newTurnState, message, animation }
 *
 * All spell effects are pure where possible.
 * Side effects (mutating player state) are explicit and documented.
 */

// ── Cast Entry Point ──────────────────────────────────────────────────────

/**
 * Cast a spell.
 * @param {Object} spell — spell definition from spellInventory
 * @param {PlayerState} caster — the player casting
 * @param {PlayerState} target — the other player
 * @param {TurnState} turnState — current turn state (for instant effects)
 * @param {string} targetUid — UID of targeted die (for instant spells)
 * @returns {{ success, newTurnState, message, animation, logMsg }}
 */
export function castSpell(spell, caster, target, turnState, targetUid = null) {
  const result = {
    success: false,
    newTurnState: turnState,
    message: '',
    logMsg: '',
    animation: null,
  };

  switch (spell.effect) {

    // ── Attack: Target Add (additive flat bonus to current target) ──────
    case 'target_add': {
      target.target += spell.value;
      result.success = true;
      result.logMsg = `🎯 ${spell.name}: ${target.name}'s target → ${target.target.toLocaleString()} pts (+${spell.value.toLocaleString()})`;
      result.animation = { type: 'target_change', player: 'enemy', value: target.target };
      break;
    }

    // ── Attack: One Die Less ──────────────────────────────────────────
    case 'one_die_less': {
      target._fumblePending = (target._fumblePending || 0) + spell.value;
      result.success = true;
      result.logMsg = `🎲 ${spell.name}: ${target.name} plays next turn with ${spell.value} fewer die`;
      break;
    }

    // ── Attack: Gold Steal ────────────────────────────────────────────
    case 'gold_steal': {
      const stolen = Math.min(spell.value, target.coins);
      target.coins   -= stolen;
      caster.coins   += stolen;
      result.success  = true;
      result.logMsg   = `💰 ${spell.name}: Stole ${stolen} 🪙 from ${target.name}!`;
      result.animation = {
        type: 'gold_steal',
        from: target.id,
        to:   caster.id,
        amount: stolen,
      };
      break;
    }

    // ── Attack: Life Steal (score transfer) ───────────────────────────
    case 'steal_life': {
      const stealAmt = Math.min(spell.value, target.total);
      target.total   -= stealAmt;
      caster.total   += stealAmt;
      result.success  = true;
      result.logMsg   = `🩸 ${spell.name}: Stole ${stealAmt.toLocaleString()} pts from ${target.name}!`;
      result.animation = {
        type: 'life_steal',
        from: target.id,
        to:   caster.id,
        amount: stealAmt,
      };
      break;
    }

    // ── Defense: Farkle Shield (instant — farkle window) ─────────────
    case 'farkle_shield': {
      caster._shieldCharges = (caster._shieldCharges || 0) + (spell.shieldCharges || 1);
      result.success = true;
      result.logMsg  = `🛡 ${spell.name}: ${spell.shieldCharges || 1} shield charge${spell.shieldCharges > 1 ? 's' : ''} active`;
      break;
    }

    // ── Utility: Extra Die ────────────────────────────────────────────
    case 'extra_die': {
      caster._extraDiePending = true;
      result.success = true;
      result.logMsg  = `⚀ ${spell.name}: Roll with +1 die this turn!`;
      break;
    }

    // ── Instant: Transform Die ────────────────────────────────────────
    case 'transform_die': {
      if (!targetUid) {
        result.message = 'Choose a die to transform';
        break;
      }
      // newValue must be provided — UI handles the value selection
      if (spell._newValue === undefined) {
        result.message = 'Choose a value (1-6)';
        break;
      }
      result.newTurnState = turnState.withTransformDie(targetUid, spell._newValue);
      result.success = true;
      result.logMsg  = `🎭 ${spell.name}: Die transformed to ${spell._newValue}`;
      break;
    }

    // ── Instant: Freeze Die (enemy's picked die → back to active) ────
    case 'freeze_die': {
      if (!targetUid) { result.message = 'Choose a die to freeze'; break; }
      result.newTurnState = turnState.withFreezeDie(targetUid);
      result.success = true;
      result.logMsg  = `❄ ${spell.name}: Die frozen — returned to enemy's active zone`;
      break;
    }

    // ── Instant: Shatter Die (remove from sub-roll permanently) ──────
    case 'shatter_die': {
      if (!targetUid) { result.message = 'Choose a die to shatter'; break; }
      result.newTurnState = turnState.withShatterDie(targetUid);
      result.success = true;
      result.logMsg  = `💥 ${spell.name}: Die shattered and removed from sub-roll!`;
      break;
    }

    default:
      result.message = `Unknown spell effect: ${spell.effect}`;
  }

  return result;
}

// ── Shield Logic ──────────────────────────────────────────────────────────

/** Use one shield charge. Returns true if shield was active. */
export function useShieldCharge(player) {
  if (!player._shieldCharges || player._shieldCharges <= 0) return false;
  player._shieldCharges--;
  if (player._shieldCharges <= 0) {
    delete player._shieldCharges;
  }
  return true;
}

export function hasShield(player) {
  return (player._shieldCharges || 0) > 0;
}

function shieldChargeCount(player) {
  return player._shieldCharges || 0;
}

// ── Fumble Logic ──────────────────────────────────────────────────────────

/** Check and consume fumble penalty. Returns number of dice to remove. */
export function consumeFumble(player) {
  const penalty = player._fumblePending || 0;
  delete player._fumblePending;
  return penalty;
}

// ── Extra Die Logic ───────────────────────────────────────────────────────

export function consumeExtraDie(player) {
  const pending = player._extraDiePending || false;
  delete player._extraDiePending;
  return pending;
}

// ── AI Spell Decision ─────────────────────────────────────────────────────

/**
 * Greedy AI spell decision for instant windows.
 * Returns the spell to play, or null to pass.
 */
export function greedyInstantDecide(player, opponent, turnState, windowType) {
  const playable = player.getPlayableInstants(windowType);
  if (!playable.length) return null;

  // Priority: shield > freeze > shatter > transform
  const priority = ['farkle_shield', 'freeze_die', 'shatter_die', 'transform_die'];

  for (const effect of priority) {
    const spell = playable.find(s => s.effect === effect);
    if (!spell) continue;

    // Context-aware decisions
    if (effect === 'farkle_shield' && windowType === 'INSTANT_FARKLE') {
      return { spell, targetUid: null };
    }
    if (effect === 'freeze_die' && turnState.picked.length > 0) {
      // Target the highest-value picked die
      const best = [...turnState.picked].sort((a,b) => b.value - a.value)[0];
      return { spell, targetUid: best.uid };
    }
    if (effect === 'shatter_die' && turnState.picked.length > 0) {
      // Target the picked die that would cause the most damage
      // (the one making a combo possible)
      const best = turnState.picked[0];
      return { spell, targetUid: best.uid };
    }
  }

  return null;
}
