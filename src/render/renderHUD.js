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

function renderProgressBars(player, enemy) {
  // fill% = pts/target — works for any target value (10k, 15k, 20k)
  // Player bar grows left→right, Enemy bar grows right→left
  // Symmetry: each bar is 50% of available width, fills proportionally
  const pPct = Math.min(100, (player.total / player.target) * 100);
  const ePct = Math.min(100, (enemy.total  / enemy.target)  * 100);

  const pp = document.getElementById('prog-player');
  const pe = document.getElementById('prog-enemy');
  if (pp) pp.style.width = pPct + '%';
  if (pe) pe.style.width = ePct + '%';

  // Scores
  const ps = document.getElementById('s-player-score');
  const es = document.getElementById('s-enemy-score');
  if (ps) ps.textContent = player.total.toLocaleString();
  if (es) es.textContent = enemy.total.toLocaleString();

  // Targets — update when changed by spells (target_mult, steal_life)
  const pt = document.getElementById('s-player-target');
  const et = document.getElementById('s-enemy-target');
  if (pt) pt.textContent = `/ ${player.target.toLocaleString()}`;
  if (et) et.textContent = `${enemy.target.toLocaleString()} /`;
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
