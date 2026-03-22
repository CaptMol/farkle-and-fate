/**
 * src/render/renderVault.js
 * Auto-extracted from bundle. Edit this file.
 */

// Stable sort order cache: playerId → uid[]
// Preserves visual position during vault interaction; reset per turn.
const _stableOrder = new Map();

export function invalidateVaultOrder(playerId) {
  _stableOrder.delete(playerId);
}

/**
 * render/renderVault.js
 * ONE function for both player and enemy vaults.
 */

export function renderVault(playerState, domIds, options = {}) {
  const { isHuman, phaseManager } = options;

  renderDiceList(playerState, domIds.dcoll, isHuman);
  renderEnchantments(playerState, domIds.enchList);
  renderRuneBar(playerState, domIds.runeBar);
  renderSpells(playerState, domIds.spellList, isHuman);
  renderDeckCount(playerState, domIds.deckCt);
  renderGold(playerState, domIds.gold);
  renderPlayerHeader(playerState, domIds.nameEl, domIds.titleEl, isHuman);
}

// ── Player Header (name + avatar placeholder) ─────────────────────────────

function renderPlayerHeader(playerState, nameEl, titleEl, isHuman) {
  const nameDiv = document.getElementById(nameEl);
  if (nameDiv) {
    // Don't overwrite while the user is actively editing
    if (!nameDiv.querySelector('input')) {
      nameDiv.textContent = playerState.name;
    }
    if (isHuman && !nameDiv.dataset.editableSet) {
      nameDiv.dataset.editableSet = '1';
      nameDiv.style.cursor = 'pointer';
      nameDiv.title = 'Click to rename';
      nameDiv.addEventListener('click', () => {
        if (nameDiv.querySelector('input')) return;
        const current = playerState.name;
        const input = document.createElement('input');
        input.value = current;
        input.maxLength = 20;
        input.style.cssText = `
          font-family:Cinzel,serif;font-size:inherit;color:inherit;
          background:transparent;border:none;border-bottom:1px solid var(--gold);
          outline:none;width:${Math.max(60, current.length * 9)}px;padding:0;
        `;
        nameDiv.textContent = '';
        nameDiv.appendChild(input);
        input.focus();
        input.select();

        function confirm() {
          const val = input.value.trim().slice(0, 20);
          playerState.name = val || current;
          nameDiv.textContent = playerState.name;
        }
        input.addEventListener('blur', confirm, { once: true });
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
          if (e.key === 'Escape') { input.value = current; input.blur(); }
        });
      });
    }
  }

  const titleDiv = document.getElementById(titleEl);
  if (titleDiv) titleDiv.textContent = playerState.avatar?.title || '';
}

// ── Gold ──────────────────────────────────────────────────────────────────

function renderGold(playerState, goldId) {
  const el = document.getElementById(goldId);
  if (el) el.textContent = `${playerState.coins} 🪙`;
}

// ── Deck Count ────────────────────────────────────────────────────────────

function renderDeckCount(playerState, deckCtId) {
  const el = document.getElementById(deckCtId);
  if (el) el.textContent = `${playerState.deckUids.length}/6`;
}

// ── Dice List (compact) ───────────────────────────────────────────────────

function renderDiceList(playerState, dcollId, isHuman) {
  const cont = document.getElementById(dcollId);
  if (!cont) return;
  cont.innerHTML = '';

  const ro = { legendary:0, epic:1, rare:2, common:3, godlike:-1 };
  const pid = playerState.id;
  const currentUids = new Set(playerState.ownedDice.map(d => d.uid));

  // Rebuild stable order if inventory changed (new purchase) or no cache yet
  const cached = _stableOrder.get(pid);
  const cacheValid = cached && cached.every(uid => currentUids.has(uid)) && cached.length === currentUids.size;
  if (!cacheValid) {
    const freshSorted = [...playerState.ownedDice].sort((a, b) => {
      const rd = (ro[a.rarity] ?? 3) - (ro[b.rarity] ?? 3);
      if (rd !== 0) return rd;
      const aIn = playerState.deckUids.includes(a.uid) ? 0 : 1;
      const bIn = playerState.deckUids.includes(b.uid) ? 0 : 1;
      return aIn - bIn;
    });
    _stableOrder.set(pid, freshSorted.map(d => d.uid));
  }

  const uidOrder = _stableOrder.get(pid);
  const dieByUid = new Map(playerState.ownedDice.map(d => [d.uid, d]));
  const sorted = uidOrder.map(uid => dieByUid.get(uid)).filter(Boolean);

  const rc = {
    common:'var(--common)', rare:'var(--rare)',
    epic:'var(--epic)', legendary:'var(--legendary)', godlike:'var(--godlike)'
  };

  sorted.forEach(die => {
    const inPlay = playerState.deckUids.includes(die.uid);
    const usedSlots = die.usedRuneSlots;
    const totalSlots = die.runeSlots;
    const hasRuneInPouch = playerState.runes.length > 0;

    // Slot dots
    const slotDots = totalSlots > 0
      ? Array.from({ length: totalSlots }, (_, i) => {
          const filled = i < usedSlots;
          return `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;
            margin:0 1px;border:1px solid ${rc[die.rarity]};
            background:${filled ? rc[die.rarity] : 'transparent'}"></span>`;
        }).join('')
      : `<span style="font-size:9px;color:var(--text-muted)">no slots</span>`;

    // Rune preview
    const runePreview = die.faces
      .filter(f => f.runeValue !== null)
      .map(f => `<span style="color:white;font-size:10px;margin-left:3px">⬡${f.number}→${f.runeValue}</span>`)
      .join('');

    const card = document.createElement('div');
    card.style.cssText = `
      display:flex;align-items:center;gap:8px;
      padding:5px 8px;margin-bottom:4px;border-radius:4px;
      border:1px solid ${inPlay ? rc[die.rarity] : 'var(--border)'};
      background:${inPlay ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.15)'};
      cursor:${isHuman ? 'pointer' : 'default'};
      opacity:${inPlay ? 1 : .55};
      transition:all .12s;
    `;
    card.onmouseenter = () => { if (isHuman) card.style.opacity = '1'; };
    card.onmouseleave = () => { if (isHuman) card.style.opacity = inPlay ? '1' : '.55'; };

    if (isHuman) {
      card.onclick = () => {
        if (hasRuneInPouch && die.canEquipRune) {
          window._game?.openRuneApply(die);
        } else {
          window._game?.toggleDeck(die.uid);
        }
      };
    }

    card.innerHTML = `
      <span style="font-size:14px">${die.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="font-family:Cinzel,serif;font-size:11px;
          color:${rc[die.rarity]};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${die.name}
        </div>
        <div style="margin-top:2px">${slotDots}${runePreview}</div>
      </div>
      ${inPlay
        ? `<span style="font-size:9px;color:var(--green2)">●</span>`
        : `<span style="font-size:9px;color:var(--text-muted)">○</span>`}
    `;
    cont.appendChild(card);
  });
}

// ── Enchantments ──────────────────────────────────────────────────────────

function renderEnchantments(playerState, enchListId) {
  const bar = document.getElementById(enchListId);
  if (!bar) return;

  const pp = playerState.enchants.perPick;
  const et = playerState.enchants.endOfTurn;
  const parts = [];

  const rc = { rare:'var(--rare)', epic:'var(--epic)', legendary:'var(--legendary)' };

  if (pp.ones_bonus)    parts.push({ icon:'1',  label:'Ones',     val:`${100+pp.ones_bonus}pts`,    col:rc.rare });
  if (pp.fives_bonus)   parts.push({ icon:'5',  label:'Fives',    val:`${50+pp.fives_bonus}pts`,    col:rc.rare });
  if (pp.street_bonus)  parts.push({ icon:'↗',  label:'Streets',  val:`+${pp.street_bonus}`,        col:rc.epic });
  if (pp.triplet_bonus) parts.push({ icon:'3×', label:'Triplets', val:`+${pp.triplet_bonus}`,       col:rc.epic });
  if (et.double_score)  parts.push({ icon:'×2', label:'Double',   val:'all pts ×2',                 col:rc.legendary });

  if (!parts.length) {
    bar.innerHTML = `<div style="color:var(--text-muted);font-size:11px;padding:2px 0">none</div>`;
    return;
  }

  bar.innerHTML = parts.map(p => `
    <div style="display:flex;align-items:center;gap:6px;padding:5px 7px;margin-bottom:4px;
      border-radius:4px;border:1px solid ${p.col}66;background:${p.col}18">
      <span style="font-family:Cinzel,serif;font-size:14px;font-weight:bold;
        color:${p.col};width:24px;text-align:center;text-shadow:0 0 8px ${p.col}">${p.icon}</span>
      <span style="flex:1;font-size:14px;color:var(--text);font-family:Cinzel,serif">${p.label}</span>
      <span style="font-family:Cinzel,serif;font-size:14px;font-weight:bold;color:${p.col}">${p.val}</span>
    </div>
  `).join('');
}

// ── Rune Bar ──────────────────────────────────────────────────────────────

function renderRuneBar(playerState, runeBarId) {
  const bar = document.getElementById(runeBarId);
  if (!bar) return;

  const cnt = playerState.runes.length;
  if (!cnt) {
    bar.innerHTML = `<div style="color:var(--text-muted);font-size:11px;padding:2px 0">none</div>`;
    return;
  }

  bar.innerHTML = `
    <div style="display:flex;align-items:center;gap:6px;padding:4px 6px;
      border-radius:3px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.05)">
      <span style="font-size:14px">🔮</span>
      <div>
        <div style="font-family:Cinzel,serif;font-size:12px;color:white">
          ${cnt} Rune${cnt > 1 ? 's' : ''} in pouch
        </div>
        <div style="font-size:10px;color:var(--text-muted)">Click a die to equip</div>
      </div>
    </div>
  `;
}

// ── Spells (clickable for human, display-only for enemy) ──────────────────

function renderSpells(playerState, spellListId, isHuman) {
  const bar = document.getElementById(spellListId);
  if (!bar) return;

  const spells = playerState.spells;

  if (!spells.length) {
    bar.innerHTML = `<div style="color:var(--text-muted);font-size:11px;padding:2px 0">none</div>`;
    return;
  }

  const catCol = { attack:'var(--red2)', defense:'var(--rare)', utility:'var(--epic)' };

  if (isHuman) {
    // Human: show full spell cards, clickable
    bar.innerHTML = spells.map((s, i) => {
      const col = catCol[s.category] || 'var(--text-muted)';
      return `
        <div onclick="window._game?.castSpell('${s.instanceId}')"
          style="display:flex;align-items:center;gap:6px;padding:5px 7px;margin-bottom:3px;
          border-radius:3px;cursor:pointer;border:1px solid ${col}55;background:${col}11;
          transition:all .12s"
          onmouseenter="this.style.background='${col}22'"
          onmouseleave="this.style.background='${col}11'">
          <span style="font-size:14px">${s.icon || '⚔'}</span>
          <div style="flex:1">
            <div style="font-family:Cinzel,serif;font-size:11px;font-weight:bold;color:${col}">${s.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${s.desc || ''}</div>
          </div>
          <span style="font-size:9px;color:${col};font-family:Cinzel,serif">${(s.category || '').toUpperCase()}</span>
        </div>`;
    }).join('');
  } else {
    // Enemy: show count only (spells hidden)
    bar.innerHTML = `
      <div style="color:var(--text-dim);font-size:11px;padding:2px 0">
        ⚔ ${spells.length} spell${spells.length !== 1 ? 's' : ''} — hidden
      </div>`;
  }
}
