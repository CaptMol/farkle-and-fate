/**
 * src/render/renderHUD.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * render/renderHUD.js — Status bar, progress bars, turn indicator
 */

// Transient info message (set by game.js after events, auto-clears)
let _infoMsg = null;
let _infoTimer = null;

export function setInfoMsg(text, duration = 2500) {
  _infoMsg = text;
  if (_infoTimer) clearTimeout(_infoTimer);
  _infoTimer = duration > 0
    ? setTimeout(() => { _infoMsg = null; _infoTimer = null; }, duration)
    : null;
}

export function renderHUD(player, enemy, phase, isPlayerTurn = false) {
  renderProgressBars(player, enemy);
  renderTurnIndicator(phase, player, enemy, isPlayerTurn);
  renderRoundInfo(player);
}

const SHOP_INTERVAL = 2500;
const TICK_INTERVAL = 1000;

function renderProgressBars(player, enemy) {
  const pPct = Math.min(100, (player.total / player.target) * 100);
  const ePct = Math.min(100, (enemy.total  / enemy.target)  * 100);

  const pp = document.getElementById('prog-player');
  const pe = document.getElementById('prog-enemy');
  if (pp) pp.style.width = pPct + '%';
  if (pe) pe.style.width = ePct + '%';

  // Tick marks at 1000pt intervals
  addProgTicks('prog-player-outer', player.target);
  addProgTicks('prog-enemy-outer',  enemy.target);

  // Scores (skip if a count-up animation is already running on this element)
  const ps = document.getElementById('s-player-score');
  const es = document.getElementById('s-enemy-score');
  if (ps && !ps._counting) ps.textContent = player.total.toLocaleString();
  if (es && !es._counting) es.textContent = enemy.total.toLocaleString();

  // Targets
  const pt = document.getElementById('s-player-target');
  const et = document.getElementById('s-enemy-target');
  if (pt) pt.textContent = `/ ${player.target.toLocaleString()}`;
  if (et) et.textContent = `/ ${enemy.target.toLocaleString()}`;

  // "Next shop" label (hidden element, kept for JS compatibility)
  const labelEl = document.getElementById('next-shop-label');
  if (labelEl) {
    const nextShop = (Math.floor(player.total / SHOP_INTERVAL) + 1) * SHOP_INTERVAL;
    labelEl.textContent = nextShop <= player.target
      ? `Next shop: ${(nextShop - player.total).toLocaleString()} pts`
      : '';
  }
}

function addProgTicks(outerId, target) {
  const outer = document.getElementById(outerId);
  if (!outer) return;
  outer.querySelectorAll('.prog-tick').forEach(el => el.remove());
  for (let ms = TICK_INTERVAL; ms < target; ms += TICK_INTERVAL) {
    const pct = (ms / target) * 100;
    const tick = document.createElement('div');
    tick.className = 'prog-tick';
    tick.style.cssText = `position:absolute;top:-1px;bottom:-1px;width:1px;
      left:${pct}%;background:rgba(255,200,100,.25);pointer-events:none`;
    outer.appendChild(tick);
  }
}

function renderTurnIndicator(phase, player, enemy, isPlayerTurn) {
  const h = document.getElementById('turn-h');
  if (!h) return;

  const dot = `<span class="adot"></span>`;

  // Transient event message (set via setInfoMsg after key actions)
  if (_infoMsg) {
    h.innerHTML = `${dot}${_infoMsg}`;
    return;
  }

  // Contextual phase-based message
  if (phase === 'ROLL' && isPlayerTurn) {
    h.innerHTML = `${dot}Your turn — roll the dice`;
  } else if (phase === 'ROLL') {
    h.innerHTML = `${dot}${enemy.name} rolls…`;
  } else if (phase === 'PICK' && isPlayerTurn) {
    const hasCastable = player.spells?.some(s => s.timing === 'sorcery');
    h.innerHTML = hasCastable
      ? `${dot}Choose dice — or cast a spell`
      : `${dot}Choose dice — or roll again`;
  } else if (phase === 'PICK') {
    h.innerHTML = `${dot}${enemy.name} thinks…`;
  } else if (phase === 'SHOP') {
    h.innerHTML = `${dot}Shop`;
  } else if (phase === 'BETWEEN_TURNS' || phase === 'FARKLE') {
    h.innerHTML = `${dot}…`;
  } else if (isPlayerTurn) {
    h.innerHTML = `${dot}Your Turn`;
  } else {
    h.innerHTML = `${dot}${enemy.name}`;
  }
}

function renderRoundInfo(player) {
  const el = document.getElementById('run-round');
  if (el) el.textContent = `Round ${player.winStreak + 1}`;
}

/**
 * Animate a score element counting up from fromVal to toVal.
 * Uses ease-out cubic so it starts fast and lands smoothly on the final number.
 * Sets el._counting = true while running so renderHUD doesn't overwrite it.
 */
export function animateScoreCount(elementId, fromVal, toVal, duration = 750) {
  const el = document.getElementById(elementId);
  if (!el || fromVal === toVal) return;
  el._counting = true;
  const start = performance.now();
  const delta = toVal - fromVal;
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
    el.textContent = Math.round(fromVal + delta * eased).toLocaleString();
    if (t < 1) {
      requestAnimationFrame(tick);
    } else {
      el.textContent = toVal.toLocaleString();
      el._counting = false;
    }
  }
  requestAnimationFrame(tick);
}
