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


// ── Die position store ────────────────────────────────────────────────────
// Positions persist across renders within a roll phase so dice don't jump.
// Cleared on each new roll so every throw looks different.
const _diePositions = new Map();
const FIELD_H  = 120; // height of .drow for absolute layout (px)
const DIE_SZ   = 56;
const MIN_DIST = 62;  // minimum center-to-center distance (px)

/** Place a die randomly, avoiding already-placed positions. */
function _placeNewDie(uid, fieldW, usedPositions) {
  const maxX = Math.max(1, fieldW - DIE_SZ - 8);
  const maxY = Math.max(1, FIELD_H - DIE_SZ - 8);
  let best = null;
  let bestMinDist = -1;
  for (let t = 0; t < 40; t++) {
    const x   = 8 + Math.random() * maxX;
    const y   = 8 + Math.random() * maxY;
    const rot = (Math.random() - 0.5) * 24;
    const cx  = x + DIE_SZ / 2;
    const cy  = y + DIE_SZ / 2;
    let minDist = Infinity;
    for (const p of usedPositions) {
      const dx = (p.x + DIE_SZ / 2) - cx;
      const dy = (p.y + DIE_SZ / 2) - cy;
      minDist = Math.min(minDist, Math.sqrt(dx * dx + dy * dy));
    }
    if (minDist >= MIN_DIST) {
      const pos = { x, y, rot };
      _diePositions.set(uid, pos);
      return pos;
    }
    if (minDist > bestMinDist) { bestMinDist = minDist; best = { x, y, rot }; }
  }
  const pos = best ?? { x: 8, y: 8, rot: 0 };
  _diePositions.set(uid, pos);
  return pos;
}

// ── Main Zone Render ──────────────────────────────────────────────────────

export function renderZone(playerState, turnState, domIds, options = {}) {
  const { isActive, isHuman, phase } = options;

  renderDiceField(turnState, domIds, { isActive, isHuman, phase, playerState });
  renderSecuredZone(turnState, domIds, playerState.enchants.perPick, { phase, isActive, playerState });
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

  const hasExtraDie = playerState?._extraDiePending || false;
  const totalSlots = hasExtraDie ? 7 : 6;
  row.classList.toggle('extra-die', totalSlots === 7);

  // Nothing rolled yet — show ghost placeholders in a centered grid
  const nothingYet = !turnState.active.length && !turnState.picked.length && !turnState.archived.length;
  if (nothingYet) {
    const fw   = Math.max(200, row.offsetWidth);
    const cols = Math.min(totalSlots, 3);
    const totalW = cols * DIE_SZ + (cols - 1) * 8;
    const startX = Math.max(0, (fw - totalW) / 2);
    const startY = 8;
    for (let i = 0; i < totalSlots; i++) {
      const col = i % cols;
      const r   = Math.floor(i / cols);
      const ghost = document.createElement('div');
      ghost.className = 'die-ghost';
      ghost.style.cssText = `position:absolute;left:${startX + col * (DIE_SZ + 8)}px;top:${startY + r * (DIE_SZ + 8)}px;width:${DIE_SZ}px;height:${DIE_SZ}px`;
      row.appendChild(ghost);
    }
    return;
  }

  const fieldW = Math.max(200, row.offsetWidth);
  const active = turnState.active;

  // New roll: clear position cache so dice land at fresh random positions
  if (active.some(ds => ds.rolling)) _diePositions.clear();

  // Scoring info for PICK phase
  const scorableUids = (isActive && phase === 'PICK')
    ? getScorableUids(turnState.active, turnState.activeComboChoice)
    : new Set();
  const allCombos = (isActive && phase === 'PICK') ? findAllCombos(turnState.active) : [];
  const activeCombo = allCombos.sort((a,b) => b.score - a.score)[0];
  const comboUids = activeCombo ? new Set(activeCombo.diceUids) : new Set();

  const placed = [];

  active.forEach((ds, i) => {
    // Look up cached position or generate a new non-overlapping one
    let pos = _diePositions.get(ds.uid);
    if (!pos) pos = _placeNewDie(ds.uid, fieldW, placed);
    placed.push(pos);

    const inCombo  = comboUids.has(ds.uid);
    const scorable = scorableUids.has(ds.uid);
    const cls = ds.rolling ? 'rolling'
      : inCombo  ? 'combo-hit'
      : scorable ? 'scorable'
      : '';

    const el = buildDieEl(ds, cls);
    el.dataset.uid  = ds.uid;
    el.dataset.slot = ds.slotIndex ?? i;

    if (ds.rolling) {
      el.style.setProperty('--fall-delay', `${i * 60}ms`);
    }

    if (isHuman && isActive && phase === 'PICK' && (scorable || inCombo)) {
      el.onclick = () => window._game?.pickDie(ds.uid);
    }
    if (ds.status === 'frozen') {
      el.style.borderColor = 'rgba(130,200,255,.8)';
      el.title = '❄ Frozen';
    }

    // Wrapper controls position + persistent rotation.
    // Die element handles its own fall animation (transform on a separate element
    // so the keyframe transforms don't clobber the rotation).
    const wrap = document.createElement('div');
    wrap.style.cssText = `position:absolute;left:${Math.round(pos.x)}px;top:${Math.round(pos.y)}px;transform:rotate(${pos.rot.toFixed(1)}deg)`;
    wrap.appendChild(el);
    row.appendChild(wrap);
  });
}
// ── Secured Zone ──────────────────────────────────────────────────────────

export function renderSecuredZone(turnState, domIds, perPickEnchants = {}, options = {}) {
  const zone = document.getElementById(domIds.seczone);
  if (!zone) return;

  // Clear old content except the label
  zone.querySelectorAll('.dmini,.sec-div,.rpts-w').forEach(e => e.remove());

  const empty = zone.querySelector('.sec-empty');
  const hasPicked   = turnState.picked.length > 0;
  const hasArchived = turnState.archived.length > 0;

  if (!hasPicked && !hasArchived) {
    const { phase, isActive, playerState } = options;
    // Resting state: show deck dice (dim) when it's this player's turn to roll
    if (phase === 'ROLL' && isActive && playerState?.activeDeck?.length > 0) {
      if (empty) empty.style.display = 'none';
      playerState.activeDeck.forEach(die => {
        const m = document.createElement('div');
        m.className = 'dmini';
        m.style.cssText = 'opacity:.2;cursor:default;border-style:dashed;border-color:rgba(200,170,80,.3);background:transparent';
        m.textContent = '⚀';
        m.title = die.name;
        zone.appendChild(m);
      });
    } else {
      if (empty) empty.style.display = '';
    }
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

    const selBorder = 'var(--gold2)';
    const defBorder = 'rgba(168,68,238,.55)';
    const selShadow = '0 0 10px rgba(240,184,74,.3)';
    const selShadowHover = '0 0 16px rgba(240,184,74,.55)';
    const defShadowHover = '0 0 14px rgba(168,68,238,.6)';

    btn.style.cssText = `
      font-family:Cinzel,serif;font-size:10px;letter-spacing:1px;
      padding:4px 12px;border-radius:4px;cursor:${isHuman ? 'pointer' : 'default'};
      border:1px solid ${isSelected ? selBorder : defBorder};
      color:${isSelected ? 'var(--gold2)' : 'var(--text)'};
      background:${isSelected ? 'rgba(240,184,74,.1)' : 'rgba(168,68,238,.08)'};
      box-shadow:${isSelected ? selShadow : 'none'};
      transition:all .1s;
    `;

    const pts = combo.score.toLocaleString();
    btn.textContent = `✦ ${combo.label} — ${pts} pts`;

    if (isHuman) {
      btn.onclick = () => window._game?.clickCombo(combo);
      btn.onmouseenter = () => {
        btn.style.boxShadow = isSelected ? selShadowHover : defShadowHover;
        btn.style.borderColor = isSelected ? selBorder : 'var(--epic)';
        combo.diceUids.forEach(uid => {
          const el = document.querySelector(`[data-uid="${uid}"]`);
          if (el) el.classList.add('combo-hover');
        });
      };
      btn.onmouseleave = () => {
        btn.style.boxShadow = isSelected ? selShadow : 'none';
        btn.style.borderColor = isSelected ? selBorder : defBorder;
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
