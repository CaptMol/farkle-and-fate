/**
 * src/render/renderHUD.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * render/renderHUD.js — Status bar, progress bars, turn indicator
 */

export function renderHUD(player, enemy, phase) {
  renderProgressBars(player, enemy);
  renderTurnIndicator(phase, player, enemy);
  renderRoundInfo(player);
}

const SHOP_INTERVAL = 2500;

function renderProgressBars(player, enemy) {
  const pPct = Math.min(100, (player.total / player.target) * 100);
  const ePct = Math.min(100, (enemy.total  / enemy.target)  * 100);

  const pp = document.getElementById('prog-player');
  const pe = document.getElementById('prog-enemy');
  if (pp) pp.style.width = pPct + '%';
  if (pe) pe.style.width = ePct + '%';

  // Shop tick marks — small vertical lines at each 2500-pt milestone
  addShopTicks('prog-player-outer', player.target, 'left');
  addShopTicks('prog-enemy-outer',  enemy.target,  'right');

  // Scores (skip if a count-up animation is already running on this element)
  const ps = document.getElementById('s-player-score');
  const es = document.getElementById('s-enemy-score');
  if (ps && !ps._counting) ps.textContent = player.total.toLocaleString();
  if (es && !es._counting) es.textContent = enemy.total.toLocaleString();

  // Targets
  const pt = document.getElementById('s-player-target');
  const et = document.getElementById('s-enemy-target');
  if (pt) pt.textContent = `/ ${player.target.toLocaleString()}`;
  if (et) et.textContent = `${enemy.target.toLocaleString()} /`;

  // "Next shop: X pts" label
  const labelEl = document.getElementById('next-shop-label');
  if (labelEl) {
    const nextShop = (Math.floor(player.total / SHOP_INTERVAL) + 1) * SHOP_INTERVAL;
    labelEl.textContent = nextShop <= player.target
      ? `Next shop: ${(nextShop - player.total).toLocaleString()} pts`
      : '';
  }
}

function addShopTicks(outerId, target, side) {
  const outer = document.getElementById(outerId);
  if (!outer) return;
  // Remove old ticks, keep the fill element
  outer.querySelectorAll('.shop-tick').forEach(el => el.remove());
  for (let ms = SHOP_INTERVAL; ms < target; ms += SHOP_INTERVAL) {
    const pct = (ms / target) * 100;
    const tick = document.createElement('div');
    tick.className = 'shop-tick';
    tick.style.cssText = `position:absolute;top:0;bottom:0;width:1px;
      ${side}:${pct}%;background:rgba(255,200,100,.3);pointer-events:none`;
    outer.appendChild(tick);
  }
}

function renderTurnIndicator(phase, player, enemy) {
  const h = document.getElementById('turn-h');
  if (!h) return;

  const isPlayerTurn = ['ROLL','PICK','INSTANT_W1','INSTANT_W2','INSTANT_FARKLE','END_TURN'].includes(phase);
  const dot = `<span class="adot"></span>`;

  if (phase === 'SHOP') {
    h.innerHTML = `${dot}Shop`;
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
