/**
 * src/game.js
 */

import { PlayerState } from './PlayerState.js';
import { TurnState } from './TurnState.js';
import { PhaseManager, PHASES } from './PhaseManager.js';
import { mkStarterDeck, mkDie, applyRune } from './dice.js';
import { buildOffer, buy } from './shop.js';
import { castSpell, useShieldCharge, hasShield, consumeFumble, consumeExtraDie } from './spells.js';
import { greedyTurn } from './ai.js';
import { renderZone } from './render/renderZone.js';
import { renderVault } from './render/renderVault.js';
import { renderHUD } from './render/renderHUD.js';
import { ENEMIES, NEXT_ROUND_CHALLENGES, GOLD_CONFIG } from './constants.js';
import { SFX } from './audio.js';
import { spawnParticles, spawnCoinParticles, showFloat } from './particles.js';

/**
 * game.js — Main game loop
 *
 * Wires together: PhaseManager, PlayerState, TurnState, AI, Render, Shop
 *
 * Exposed as window._game for UI event handlers.
 * All user actions go through this object — no DOM event logic elsewhere.
 */


// ── Game singleton ────────────────────────────────────────────────────────

class Game {
  constructor() {
    this.player  = null;
    this.enemy   = null;
    this.fsm     = null;

    this.playerTurn = null;
    this.enemyTurn  = null;

    this._enemyThinkTimer = null;
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  init() {
    this.player = new PlayerState({ id: 'player', isHuman: true, name: loadName() });
    this.enemy  = new PlayerState({ id: 'enemy',  isHuman: false, name: pickEnemyName() });

    const starterDice = mkStarterDeck();
    starterDice.forEach(d => this.player.addDie(d));

    const enemyDice = mkStarterDeck();
    enemyDice.forEach(d => this.enemy.addDie(d));

    this.fsm = new PhaseManager({
      onPhaseChange: (phase, active, passive) => this._onPhaseChange(phase, active, passive),
      instantTimeout: 8000,
    });

    this.playerTurn = TurnState.fresh();
    this.enemyTurn  = TurnState.fresh();

    this._renderAll();
    this.fsm.startTurn(this.player, this.enemy);
  }

  // ── Phase Change Handler ──────────────────────────────────────────────────

  _onPhaseChange(phase, active, passive) {
    this._renderAll();
    this._updateButtons(phase);

    switch (phase) {
      case PHASES.ROLL:
        if (!active.isHuman) this._scheduleAI(() => this._aiRoll());
        break;

      case PHASES.FARKLE_CHECK:
        this._handleFarkleCheck(active, passive);
        break;

      case PHASES.INSTANT_W1:
      case PHASES.INSTANT_W2:
        this._handleInstantWindow(phase, active, passive);
        break;

      case PHASES.INSTANT_FARKLE:
        this._handleFarkleInstantWindow(active, passive);
        break;

      case PHASES.HOT_DICE:
        this._handleHotDice(active);
        break;

      case PHASES.PICK:
        if (!active.isHuman) this._scheduleAI(() => this._aiPick());
        break;

      case PHASES.END_TURN:
        this._handleEndTurn(active, passive);
        break;

      case PHASES.SHOP:
        this._handleShop(active, passive);
        break;

      case PHASES.BETWEEN_TURNS:
        this._handleBetweenTurns(active, passive);
        break;

      case PHASES.FARKLE:
        this._handleFarkle(active);
        break;

      case PHASES.VICTORY:
        this._handleVictory(active);
        break;

      case PHASES.INSTANT_VICTORY:
        this._handleVictoryWindow(active, passive);
        break;
    }
  }

  // ── Roll ──────────────────────────────────────────────────────────────────

  roll() {
    if (!this.fsm.canRoll) return;
    const active = this.fsm.activePlayer;
    const turn   = this._getTurn(active);

    // FIX: Farkle-Regel — Spieler muss mindestens einen Würfel picken bevor er neu rollt.
    // Ausnahme: erster Roll des Zuges (ROLL-Phase) und Enemy-Zug.
    if (this.fsm.isPlayerTurn && this.fsm.phase === PHASES.PICK) {
      if (!turn.hasPickedAnything) {
        log('bad', 'Pick at least one die before rolling again!');
        return;
      }
    }

    SFX.roll();

    // Archive current picks if any (completing a sub-roll before re-rolling)
    let newTurn = turn.picked.length > 0
      ? turn.withArchive(active.enchants.perPick)
      : turn;

    // TurnState decides which dice to roll
    const remainingDice = newTurn.diceToRoll;
    let deckToRoll = remainingDice
      ? remainingDice.map(ds => ds.dieRef).filter(Boolean)
      : active.activeDeck;

    // Extra die spell
    if (consumeExtraDie(active)) {
      const extra = mkDie('iron_cube', '_extra');
      deckToRoll = [...deckToRoll, extra];
      log('mag', `⚀ Extra Die active!`);
    }

    // Fumble penalty
    const fumblePenalty = consumeFumble(active);
    if (fumblePenalty > 0) {
      deckToRoll = deckToRoll.slice(0, Math.max(1, deckToRoll.length - fumblePenalty));
      log('bad', `🎲 Fumble! ${active.name} rolls with ${deckToRoll.length} dice`);
    }

    // Roll animation then resolve
    this._animateRoll(deckToRoll, newTurn, (rolledDice) => {
      newTurn = newTurn.withRoll(rolledDice);
      this._setTurn(active, newTurn);
      this.fsm.afterRoll(newTurn);
      this._renderAll();
    });
  }

  _aiRoll() {
    this.roll();
  }

  // ── Farkle ────────────────────────────────────────────────────────────────

  _handleFarkleCheck(active, passive) {
    if (hasShield(active)) {
      this.fsm._advance(PHASES.INSTANT_FARKLE);
    } else {
      SFX.farkle();
      log('bad', `${active.name}: FARKLE!`);
      this.fsm._advance(PHASES.FARKLE);
    }
  }

  _handleFarkleInstantWindow(active, passive) {
    const instants = active.getPlayableInstants('INSTANT_FARKLE');
    this.fsm.openInstantWindow('INSTANT_FARKLE', instants).then(result => {
      if (result?.spell) {
        const used = useShieldCharge(active);
        if (used) {
          SFX.spell?.();
          log('mag', `🛡 Shield! ${active.name} re-rolls`);
          active.consumeSpell(result.spell.instanceId);
          this.fsm.afterInstantFarkle(true);
        } else {
          this.fsm.afterInstantFarkle(false);
        }
      } else {
        this.fsm.afterInstantFarkle(false);
      }
    });

    if (!active.isHuman) {
      this._scheduleAI(() => {
        const decision = greedyTurn('INSTANT_FARKLE', this._getTurn(active), active, passive);
        if (decision.action === 'instant') {
          this.fsm.playInstant(decision.spell, decision.targetUid);
        } else {
          this.fsm.passInstant();
        }
      });
    }
  }

  _handleFarkle(active) {
    this._setTurn(active, TurnState.fresh());
    this._renderAll();
    setTimeout(() => {
      this.fsm._advance(PHASES.END_TURN);
    }, 1200);
  }

  // ── Instant Windows ───────────────────────────────────────────────────────

  _handleInstantWindow(windowType, active, passive) {
    const passiveInstants = passive.getPlayableInstants(windowType);

    if (!passiveInstants.length) {
      if (windowType === PHASES.INSTANT_W1) this.fsm.afterInstantW1();
      else this.fsm.afterInstantW2();
      return;
    }

    this.fsm.openInstantWindow(windowType, passiveInstants).then(result => {
      if (result?.spell) {
        this._executeInstant(result.spell, passive, active, windowType, result.targetUid);
      }
      if (windowType === PHASES.INSTANT_W1) this.fsm.afterInstantW1();
      else this.fsm.afterInstantW2();
      if (passive.isHuman) window.hideInstantWindowUI?.();
    });

    if (!passive.isHuman) {
      this._scheduleAI(() => {
        const turn = this._getTurn(active);
        const decision = greedyTurn(windowType, turn, active, passive);
        if (decision.action === 'instant') {
          this.fsm.playInstant(decision.spell, decision.targetUid);
        } else {
          this.fsm.passInstant();
        }
      });
    } else {
      window.showInstantWindowUI?.(windowType, passiveInstants, this.fsm.instantTimeout);
    }
  }

  _executeInstant(spell, caster, target, windowType, targetUid) {
    const turn = this._getTurn(target);
    const result = castSpell(spell, caster, target, turn, targetUid);

    if (result.success) {
      this._setTurn(target, result.newTurnState);
      caster.consumeSpell(spell.instanceId);
      if (result.logMsg) log('mag', result.logMsg);
      if (result.animation) this._playAnimation(result.animation);
      SFX.spell?.();
      this._renderAll();
    }
  }

  // ── Pick ──────────────────────────────────────────────────────────────────

  pickDie(uid) {
    if (!this.fsm.canPickDice) return;
    const active = this.fsm.activePlayer;
    const turn   = this._getTurn(active);

    const scorable = getScorableUids(turn.active, turn.activeComboChoice);
    if (!scorable.has(uid)) return;

    const newTurn = turn.withPickDie(uid);
    this._setTurn(active, newTurn);
    SFX.pick();
    this._renderAll();
  }

  returnDie(uid) {
    if (!this.fsm.canPickDice) return;
    const active  = this.fsm.activePlayer;
    const newTurn = this._getTurn(active).withReturnDie(uid);
    this._setTurn(active, newTurn);
    this._renderAll();
  }

  clickCombo(combo) {
    if (!this.fsm.canPickDice) return;
    const active = this.fsm.activePlayer;
    const turn   = this._getTurn(active);

    let newTurn = turn;
    const nonComboInPicked = turn.picked.filter(d => !combo.diceUids.includes(d.uid));
    if (nonComboInPicked.length > 0) {
      newTurn = newTurn.withArchive(active.enchants.perPick);
    }

    combo.diceUids.forEach(uid => {
      const inActive = newTurn.active.find(d => d.uid === uid);
      if (inActive) newTurn = newTurn.withPickDie(uid);
    });

    newTurn = newTurn.withArchive(active.enchants.perPick);

    this._setTurn(active, newTurn);
    SFX.combo();
    log('hi', `${combo.label}! ${combo.diceUids.length} dice secured · ${combo.score} pts`);
    this._renderAll();
    this._updateButtons(this.fsm.phase);
  }

  _aiPick() {
    const active = this.fsm.activePlayer;
    const turn   = this._getTurn(active);
    const decision = greedyTurn(PHASES.PICK, turn, active, this.fsm.passivePlayer);

    if (decision.action === 'pick') {
      let newTurn = turn;
      decision.uids.forEach(uid => {
        if (newTurn.active.find(d => d.uid === uid)) {
          newTurn = newTurn.withPickDie(uid);
        }
      });
      newTurn = newTurn.withArchive(active.enchants.perPick);
      this._setTurn(active, newTurn);
      this._renderAll();

      const newDecision = greedyTurn(PHASES.PICK, newTurn, active, this.fsm.passivePlayer);
      setTimeout(() => {
        if (newDecision.then === 'bank' || newDecision.action === 'bank') {
          this.endTurn();
        } else {
          this.roll();
        }
      }, 600);
    } else if (decision.action === 'bank') {
      setTimeout(() => this.endTurn(), 400);
    }
  }

  // ── Hot Dice / Feuerhand ──────────────────────────────────────────────────

  _handleHotDice(active) {
    const turn    = this._getTurn(active);
    const newTurn = turn.withFeuerhand(active.enchants.perPick);
    this._setTurn(active, newTurn);

    SFX.feuerhand?.();
    log('fire', `🔥 FEUERHAND ×${newTurn.feuerhandCount}! ${newTurn.secureScore()} pts banked — all dice back!`);
    spawnParticles(window.innerWidth / 2, window.innerHeight / 2, '#ff8800', 60);

    setTimeout(() => this.roll(), 600);
  }

  // ── End Turn ──────────────────────────────────────────────────────────────

  endTurn() {
    if (!this.fsm.canEndTurn && this.fsm.isPlayerTurn) return;
    const active  = this.fsm.activePlayer;
    const turn    = this._getTurn(active);

    let finalTurn = turn.picked.length > 0
      ? turn.withArchive(active.enchants.perPick)
      : turn;

    this._setTurn(active, finalTurn);
    this.fsm._advance(PHASES.END_TURN);
  }

  _handleEndTurn(active, passive) {
    const turn   = this._getTurn(active);
    const score  = turn.endScore(active.enchants);
    const earned = active.earnGold(score);
    const { won } = active.bankScore(score);

    log('hi', `✓ ${score.toLocaleString()} pts banked! (+${earned} 🪙)`);
    SFX.bank?.(score);

    showFloat(`+${score.toLocaleString()}`, score >= 1000 ? 'var(--epic)' : 'var(--green2)');
    setTimeout(() => {
      SFX.coin?.();
      showFloat(`+${earned} 🪙`, 'var(--gold)');
    }, 400);

    this._setTurn(active, TurnState.fresh());
    this._renderAll();

    this.fsm.onEndTurn(won);
  }

  _handleVictoryWindow(active, passive) {
    const instants = passive.getPlayableInstants('INSTANT_VICTORY');
    this.fsm.openInstantWindow('INSTANT_VICTORY', instants).then(result => {
      if (result?.spell) {
        this._executeInstant(result.spell, passive, active, 'INSTANT_VICTORY', result.targetUid);
        if (active.total < active.target) {
          log('mag', `⚡ Last stand! ${passive.name} fights back!`);
          this.fsm._advance(PHASES.PICK);
          return;
        }
      }
      this.fsm.afterVictoryWindow();
    });

    if (!passive.isHuman) {
      this._scheduleAI(() => this.fsm.passInstant());
    }
  }

  _handleVictory(winner) {
    SFX.victory?.();
    log('hi', `🏆 ${winner.name} wins!`);
    (window.showVictoryScreen||((w)=>alert(w.name+" wins!")))(winner, this.player, this.enemy, NEXT_ROUND_CHALLENGES);
  }

  // ── Shop ──────────────────────────────────────────────────────────────────

  _handleShop(active, passive) {
    if (this.player.shop.hasPending) {
      this.player.shop.openNext();
      const offers = buildOffer(this.player);
      this.player._currentShopOffers = offers;
      (window.showShopUI||((o,p,e,cb)=>cb()))(offers, this.player, false, () => {
        this.player.shop.close();
        if (this.player.shop.hasPending) {
          this.fsm._advance(PHASES.SHOP);
        } else {
          this._continueToEnemyShop(passive);
        }
      });
      return;
    }
    this._continueToEnemyShop(passive);
  }

  _continueToEnemyShop(enemy) {
    if (enemy.shop.hasPending) {
      enemy.shop.openNext();
      const offers = buildOffer(enemy);
      enemy._currentShopOffers = offers;
      (window.showShopUI||((o,p,e,cb)=>setTimeout(cb,500)))(offers, enemy, true, () => {
        const decision = greedyTurn(PHASES.SHOP, null, enemy, this.player);
        if (decision.action === 'buy') {
          const result = buy(decision.item, enemy, mkDie);
          if (result.success) log('ei', `${enemy.name} buys: ${decision.item.name}`);
        }
        enemy.shop.close();
        if (enemy.shop.hasPending) {
          this._continueToEnemyShop(enemy);
        } else {
          (window.closeShopUI||(() => {}))();
          this.fsm.afterShop();
        }
      });
    } else {
      closeShopUI();
      this.fsm.afterShop();
    }
  }

  buyItem(item) {
    const result = buy(item, this.player, mkDie);
    if (!result.success) {
      SFX.error?.();
      return;
    }
    SFX.coin?.();
    log('hi', result.message);
    this._renderAll();
  }

  // ── Between Turns ─────────────────────────────────────────────────────────

  _handleBetweenTurns(justPlayed, nextUp) {
    setTimeout(() => {
      this.fsm.startTurn(nextUp, justPlayed);
    }, 400);
  }

  // ── Spell Casting ─────────────────────────────────────────────────────────

  castSpell(instanceId) {
    const spell = this.player.spells.find(s => s.instanceId === instanceId);
    if (!spell) return;

    if (spell.timing === 'sorcery') {
      const result = castSpell(spell, this.player, this.enemy, this.playerTurn);
      if (result.success) {
        this.player.consumeSpell(instanceId);
        this.playerTurn = result.newTurnState;
        if (result.logMsg) log('mag', result.logMsg);
        if (result.animation) this._playAnimation(result.animation);
        SFX.spell?.();
        this._renderAll();
      } else {
        log('bad', result.message || 'Cannot cast now');
        SFX.error?.();
      }
    }
  }

  // ── Rune Application ──────────────────────────────────────────────────────

  openRuneApply(die) {
    (window.showRuneModal||(() => {}))(die, this.player, (dieUid, faceNumber, runeValue) => {
      const result = applyRune(this.player, dieUid, faceNumber, runeValue);
      if (result.success) {
        log('mag', result.message);
        SFX.click?.();
        this._renderAll();
      } else {
        log('bad', result.message);
        SFX.error?.();
      }
    });
  }

  toggleDeck(uid) {
    this.player.toggleDeck(uid);
    SFX.click?.();
    this._renderAll();
  }

  // ── Next Round ────────────────────────────────────────────────────────────

  nextRound(challengeId, winnerIsPlayer) {
    const challenge = NEXT_ROUND_CHALLENGES.find(c => c.id === challengeId);
    if (!challenge) return;

    const newTarget = Math.round(10000 * challenge.targetMult);

    if (winnerIsPlayer) {
      this.player.target = newTarget;
      this.enemy.target  = 10000;
    } else {
      this.player.target = 10000;
      this.enemy.target  = newTarget;
    }

    if (winnerIsPlayer) {
      this.player.coins += challenge.goldBonus;
      this.enemy.coins  += 50;
    } else {
      this.enemy.coins  += challenge.goldBonus;
      this.player.coins += 50;
    }

    if (winnerIsPlayer) this.player.resetEnchants();
    else                this.enemy.resetEnchants();

    this.player.total = 0;
    this.enemy.total  = 0;
    this.player.shop  = new (Object.getPrototypeOf(this.player.shop).constructor)(this.player);
    this.enemy.shop   = new (Object.getPrototypeOf(this.enemy.shop).constructor)(this.enemy);

    if (winnerIsPlayer) this.player.winStreak++;
    else { this.player.winStreak = 0; }

    this.enemy.name = pickEnemyName();

    this.playerTurn = TurnState.fresh();
    this.enemyTurn  = TurnState.fresh();

    hideVictoryScreen();
    this._renderAll();
    this.fsm.startTurn(this.player, this.enemy);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  _getTurn(player) {
    return player.id === 'player' ? this.playerTurn : this.enemyTurn;
  }

  _setTurn(player, turn) {
    if (player.id === 'player') this.playerTurn = turn;
    else                        this.enemyTurn  = turn;
  }

  _scheduleAI(fn, delay = 800) {
    if (this._enemyThinkTimer) clearTimeout(this._enemyThinkTimer);
    this._enemyThinkTimer = setTimeout(fn.bind(this), delay);
  }

  _animateRoll(dice, turn, callback) {
    const rolling = dice.map((die, i) => ({ ...die.roll(i), rolling: true }));
    const rolled  = turn.withRoll(rolling);
    this._setTurn(this.fsm.activePlayer, rolled);
    this._renderAll();

    setTimeout(() => {
      const resolved = dice.map((die, i) => die.roll(i));
      callback(resolved);
    }, 520);
  }

  _renderAll() {
    const phase = this.fsm?.phase;

    renderZone(this.player, this.playerTurn, {
      drow: 'p-drow', seczone: 'p-seczone', rscore: 'p-rscore', banner: 'p-combo-banner'
    }, {
      isActive: this.fsm?.isPlayerTurn,
      isHuman:  true,
      phase,
      playerState: this.player,
    });

    renderZone(this.enemy, this.enemyTurn, {
      drow: 'e-drow', seczone: 'e-seczone', rscore: 'e-rscore', banner: 'e-combo-banner'
    }, {
      isActive: this.fsm?.isEnemyTurn,
      isHuman:  false,
      phase,
      playerState: this.enemy,
    });

    renderVault(this.player, {
      dcoll: 'dcoll', enchList: 'ench-list-bar', runeBar: 'rune-list-bar',
      spellList: 'spell-list-bar', deckCt: 'deck-ct', gold: 'p-gold-vault',
      nameEl: 'p-name-lbl', titleEl: 'p-title-lbl',
    }, { isHuman: true });

    renderVault(this.enemy, {
      dcoll: 'e-dcoll', enchList: 'e-ench-list', runeBar: 'e-rune-bar',
      spellList: 'e-spell-list', deckCt: 'e-deck-ct', gold: 'e-gold-vault',
      nameEl: 'e-name-lbl', titleEl: 'e-title-lbl',
    }, { isHuman: false });

    renderHUD(this.player, this.enemy, phase);

    const pz = document.getElementById('pz');
    const ez = document.getElementById('ez');
    if (pz && ez) {
      pz.classList.toggle('active',      this.fsm?.isPlayerTurn);
      pz.classList.toggle('inactive',    this.fsm?.isEnemyTurn);
      pz.classList.toggle('player-done', this.fsm?.isEnemyTurn);
      ez.classList.toggle('active',      this.fsm?.isEnemyTurn);
      ez.classList.toggle('inactive',    this.fsm?.isPlayerTurn);
    }
  }

  _updateButtons(phase) {
    const rollBtn  = document.getElementById('btn-roll');
    const endBtn   = document.getElementById('btn-end');
    const spellBtn = document.getElementById('btn-spell');

    if (!rollBtn) return;

    const canRoll = this.fsm.canRoll;
    const canEnd  = this.fsm.canEndTurn;
    const hasShieldActive = hasShield(this.player);
    const charges = this.player._shieldCharges || 0;

    rollBtn.disabled = !canRoll;
    if (endBtn) endBtn.disabled = !canEnd;

    rollBtn.classList.toggle('breathing',        canRoll && !hasShieldActive);
    rollBtn.classList.toggle('breathing-shield',  canRoll && hasShieldActive);
    rollBtn.textContent = hasShieldActive
      ? `🛡 Roll (Shield${charges > 1 ? ' ×' + charges : ''})`
      : '⚀ Roll';

    if (spellBtn) {
      spellBtn.disabled = !(canEnd && this.player.spells.length > 0);
    }
  }

  _playAnimation(anim) {
    if (anim.type === 'gold_steal') {
      SFX.coin?.();
      showFloat(`−${anim.amount} 🪙`, 'var(--red2)');
      setTimeout(() => showFloat(`+${anim.amount} 🪙`, 'var(--gold)'), 600);
    }
    if (anim.type === 'life_steal') {
      showFloat(`🩸 +${anim.amount.toLocaleString()}`, 'var(--red2)');
    }
    if (anim.type === 'target_change') {
      showFloat(`⚠ Target → ${anim.value.toLocaleString()}`, 'var(--red2)');
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function loadName() {
  return localStorage.getItem('ff-player-name') || 'Player';
}

function pickEnemyName() {
  return ENEMIES[Math.floor(Math.random() * ENEMIES.length)].name;
}

function log(type, msg) {
  const l = document.getElementById('glog');
  if (!l) return;
  const e = document.createElement('div');
  e.className = `le ${type}`;
  e.textContent = msg;
  l.prepend(e);
  while (l.children.length > 120) l.lastChild.remove();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────

export function initGame() {
  const game = new Game();
  window._game = game;
  game.init();

  document.getElementById('p-name-lbl')?.addEventListener('click', () => {
    const name = prompt('Your name:', game.player.name);
    if (name?.trim()) {
      game.player.name = name.trim();
      localStorage.setItem('ff-player-name', name.trim());
      game._renderAll();
    }
  });
}
