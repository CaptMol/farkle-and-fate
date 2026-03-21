/**
 * src/render/renderZone.js
 * Auto-extracted from bundle. Edit this file.
 */

import { findAllCombos, getScorableUids, calcScore } from '../scoring.js';

/**
 * render/renderZone.js
 *
 * ONE render function for both player and enemy zones.
 * Called with different playerState + turnState + domIds.
 *
 * renderZone(playerState, turnState, domIds, options)
 *
 * domIds: {
 *   drow:    'p-drow'    | 'e-drow'
 *   seczone: 'p-seczone' | 'e-seczone'
 *   rscore:  'p-rscore'  | 'e-rscore'
 *   banner:  'p-combo-banner' | 'e-combo-banner'
 * }
 *
 * options: {
 *   isActive: bool  — is this player currently taking their turn?
 *   isHuman: bool   — show clickable elements?
 *   phase: string   — current game phase
 * }
 */


// ── Main Zone Render ──────────────────────────────────────────────────────

export function renderZone(playerState, turnState, domIds, options = {}) {
  const { isActive, isHuman, phase } = options;

  renderDiceField(turnState, domIds, { isActive, isHuman, phase, playerState });
  renderSecuredZone(turnState, domIds, playerState.enchants.perPick);
  renderComboBanner(turnState, domIds, { isActive, isHuman, phase, playerState });
  renderTurnScore(turnState, domIds, playerState.enchants);
}

// ── Dice Field ─────────────────────────────────────────────────────────────

function renderDiceField(turnState, domIds, options) {
  const row = document.getElementById(domIds.drow);
  if (!row) return;
  row.innerHTML = '';

  const { isActive, isHuman, phase, playerState } = options;

  // Pre-roll: dim secured zone
  const secEl = document.getElementById(domIds.seczone);
  const preRoll = phase === 'ROLL' || phase === 'BETWEEN_TURNS';
  if (secEl) {
    secEl.style.opacity = (preRoll && turnState.archived.length > 0) ? '0.3' : '';
    secEl.style.filter  = (preRoll && turnState.archived.length > 0) ? 'grayscale(.6)' : '';
  }

  // Total slots: 6 standard, 7 with extra-die spell
  const hasExtraDie = playerState?._extraDiePending || false;
  const totalSlots = hasExtraDie ? 7 : 6;
  row.classList.toggle('extra-die', totalSlots === 7);

  // Build slot map: slotIndex → DieState (active only — picked/archived leave gaps)
  const slotMap = new Map();
  turnState.active.forEach(ds => slotMap.set(ds.slotIndex ?? 0, ds));

  // Nothing rolled yet
  const nothingYet = !turnState.active.length && !turnState.picked.length && !turnState.archived.length;
  if (nothingYet) {
    // Still show empty grid — layout must not jump
    for (let slot = 0; slot < totalSlots; slot++) {
      const ghost = document.createElement('div');
      ghost.className = 'die-ghost';
      row.appendChild(ghost);
    }
    return;
  }

  // Scoring info for PICK phase
  const scorableUids = (isActive && phase === 'PICK')
    ? getScorableUids(turnState.active, turnState.activeComboChoice)
    : new Set();
  const allCombos = (isActive && phase === 'PICK') ? findAllCombos(turnState.active) : [];
  const activeCombo = allCombos.sort((a,b) => b.score - a.score)[0];
  const comboUids = activeCombo ? new Set(activeCombo.diceUids) : new Set();

  // Render all slots — dice stay at their fixed position, gaps where picked/archived
  for (let slot = 0; slot < totalSlots; slot++) {
    const ds = slotMap.get(slot);

    if (!ds) {
      const ghost = document.createElement('div');
      ghost.className = 'die-ghost';
      ghost.dataset.slot = slot;
      row.appendChild(ghost);
      continue;
    }

    const inCombo  = comboUids.has(ds.uid);
    const scorable = scorableUids.has(ds.uid);
    const cls = ds.rolling ? 'rolling'
      : inCombo  ? 'combo-hit'
      : scorable ? 'scorable'
      : '';

    const el = buildDieEl(ds, cls);
    el.dataset.slot = slot;

    if (isHuman && isActive && phase === 'PICK' && (scorable || inCombo)) {
      el.onclick = () => window._game?.pickDie(ds.uid);
    }
    if (ds.status === 'frozen') {
      el.style.borderColor = 'rgba(130,200,255,.8)';
      el.title = '❄ Frozen';
    }

    row.appendChild(el);
  }
}
// ── Secured Zone ──────────────────────────────────────────────────────────

export function renderSecuredZone(turnState, domIds, perPickEnchants = {}) {
  const zone = document.getElementById(domIds.seczone);
  if (!zone) return;

  // Clear old content except the label
  zone.querySelectorAll('.dmini,.sec-div,.rpts-w').forEach(e => e.remove());

  const empty = zone.querySelector('.sec-empty');
  const hasPicked   = turnState.picked.length > 0;
  const hasArchived = turnState.archived.length > 0;

  if (!hasPicked && !hasArchived) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  const isEnemy = domIds.drow.startsWith('e-');
  const accentColor = isEnemy ? 'rgba(180,60,40' : 'rgba(201,162,39';

  // Archived sub-rolls — each as a group with score
  turnState.archived.forEach(subRoll => {
    [...subRoll.dice].sort((a,b) => a.value - b.value).forEach(d => {
      const m = document.createElement('div');
      m.className = 'dmini';
      m.style.cssText = `opacity:.4;filter:grayscale(.5);cursor:default;
        border-color:${accentColor},.35);background:${accentColor},.08)`;
      m.textContent = d.value;
      m.title = `${d.dieRef?.name || 'Die'} — locked`;
      if (d.isSplit) m.title += ` (rune: ${d.faceNum}→${d.value})`;
      zone.appendChild(m);
    });

    const sep = document.createElement('div');
    sep.className = 'sec-div';
    const label = subRoll.feuerhand ? `🔥 +${subRoll.score}` : `+${subRoll.score}`;
    sep.innerHTML = `<div class="sec-div-line"></div><div class="sec-div-score">${label}</div>`;
    zone.appendChild(sep);
  });

  // Current picked dice (returnable)
  if (hasPicked) {
    [...turnState.picked].sort((a,b) => a.value - b.value).forEach(d => {
      const m = document.createElement('div');
      m.className = 'dmini';
      m.style.cssText = `background:${accentColor},.22);border-color:${accentColor},.7)`;
      m.textContent = d.value;
      m.title = `${d.dieRef?.name || 'Die'} — click to return`;
      if (d.isSplit) m.title += ` (rune: ${d.faceNum}→${d.value})`;

      // Human player can return picked dice
      if (!isEnemy) {
        m.style.cursor = 'pointer';
        m.onclick = () => window._game?.returnDie(d.uid);
      }
      zone.appendChild(m);
    });
  }

  // Score display
  const secureScore = turnState.secureScore();
  const pickScore   = turnState.pickScore(perPickEnchants);
  const displayScore = secureScore + pickScore;

  const w = document.createElement('div');
  w.className = 'rpts-w';
  const scoreColor = isEnemy ? 'var(--red2)' : 'var(--green2)';
  w.innerHTML = `
    <div class="rpts-l">SCORE</div>
    <div class="rpts-v" style="color:${scoreColor}">${displayScore.toLocaleString()}</div>
  `;
  zone.appendChild(w);
}

// ── Combo Banner ──────────────────────────────────────────────────────────

function renderComboBanner(turnState, domIds, options) {
  const banner = document.getElementById(domIds.banner);
  if (!banner) return;
  banner.innerHTML = '';

  const { isActive, isHuman, phase } = options;

  // Only show during PICK phase
  if (phase !== 'PICK' || !isActive || !turnState.active.length) return;

  const combos = findAllCombos(turnState.active);
  if (!combos.length) return;

  combos.sort((a,b) => b.score - a.score).forEach(combo => {
    const btn = document.createElement('div');
    const isSelected = turnState.activeComboChoice === combo.type;

    btn.style.cssText = `
      font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;
      padding:4px 12px;border-radius:4px;cursor:${isHuman ? 'pointer' : 'default'};
      border:1px solid ${isSelected ? 'var(--gold2)' : 'var(--border2)'};
      color:${isSelected ? 'var(--gold2)' : 'var(--text-muted)'};
      background:${isSelected ? 'rgba(240,184,74,.1)' : 'transparent'};
      transition:all .1s;
    `;

    const pts = combo.score.toLocaleString();
    btn.textContent = `✦ ${combo.label} — ${pts} pts`;

    if (isHuman) {
      btn.onclick = () => window._game?.clickCombo(combo);

      // Hover highlight
      btn.onmouseenter = () => {
        combo.diceUids.forEach(uid => {
          const el = document.querySelector(`[data-uid="${uid}"]`);
          if (el) el.classList.add('combo-hover');
        });
      };
      btn.onmouseleave = () => {
        document.querySelectorAll('.combo-hover').forEach(el => el.classList.remove('combo-hover'));
      };
    }

    banner.appendChild(btn);
  });
}

// ── Turn Score Display ────────────────────────────────────────────────────

function renderTurnScore(turnState, domIds, enchants) {
  const el = document.getElementById(domIds.rscore);
  if (!el) return;

  const score = turnState.secureScore() + turnState.pickScore(enchants.perPick);
  el.textContent = score.toLocaleString();

  // Glow when score > 0
  el.style.textShadow = score > 0
    ? '0 0 20px rgba(50,184,98,.5)'
    : 'none';
}

// ── Die Element Builder ───────────────────────────────────────────────────

function buildDieEl(dieState, extraClass = '') {
  const die = dieState.dieRef;
  const rm  = { common:'rc', rare:'rr', epic:'re', legendary:'rl', godlike:'rg' };
  const rarCls = die ? rm[die.rarity] || 'rc' : 'rc';

  const el = document.createElement('div');
  el.className = `die ${rarCls} ${extraClass}`.trim();
  el.dataset.uid = dieState.uid;

  if (dieState.isSplit) {
    // Split die: show both face and rune value
    el.innerHTML = `
      <div class="die-split">
        <span class="die-face-num">${dieState.faceNum}</span>
        <span class="die-rune-num">${dieState.value}</span>
      </div>
    `;
  } else {
    el.textContent = dieState.value;
  }

  if (die) el.title = die.name;
  return el;
}
