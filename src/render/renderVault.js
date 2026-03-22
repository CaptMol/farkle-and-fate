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

  // Win streak badge
  const streakId = nameEl.replace('name-lbl', 'streak-badge');
  const streakEl = document.getElementById(streakId);
  if (streakEl) {
    const s = playerState.winStreak || 0;
    streakEl.innerHTML = s >= 1
      ? `<span style="font-size:9px;color:var(--legendary);opacity:.9">🔥 ×${s}</span>`
      : '';
  }
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

    // Rune edit hint — only shown when human has runes and die can accept one
    const canEdit = isHuman && hasRuneInPouch && die.canEquipRune;
    const editHint = canEdit
      ? `<span style="font-size:9px;color:var(--epic);margin-left:4px;opacity:.85">✏ rune</span>`
      : '';

    card.innerHTML = `
      <!-- Die face visual -->
      <div style="
        width:34px;height:34px;flex-shrink:0;
        border:2px solid ${rc[die.rarity]};border-radius:6px;
        display:flex;align-items:center;justify-content:center;
        font-size:20px;
        background:linear-gradient(160deg,rgba(0,0,0,.4),rgba(0,0,0,.2));
        box-shadow:0 0 6px ${rc[die.rarity]}44,inset 0 0 6px rgba(0,0,0,.4);
      ">${die.icon}</div>

      <!-- Info column -->
      <div style="flex:1;min-width:0">
        <div style="
          font-family:Cinzel,serif;font-size:11px;font-weight:600;
          color:${inPlay ? rc[die.rarity] : 'var(--text-dim)'};
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          text-shadow:${inPlay ? `0 0 8px ${rc[die.rarity]}66` : 'none'};
        ">${die.name}</div>
        <div style="display:flex;align-items:center;margin-top:3px;gap:3px">
          <span style="font-family:Cinzel,serif;font-size:8px;letter-spacing:1px;
            color:${rc[die.rarity]};opacity:.75;text-transform:uppercase">${die.rarity}</span>
          <span style="color:var(--border2);font-size:8px">·</span>
          ${slotDots}
          ${editHint}
        </div>
        ${runePreview ? `<div style="margin-top:2px">${runePreview}</div>` : ''}
      </div>

      <!-- In-deck indicator -->
      <span style="font-size:10px;flex-shrink:0;${inPlay ? `color:var(--green2)` : 'color:var(--text-muted);opacity:.5'}">
        ${inPlay ? '●' : '○'}
      </span>
    `;
    cont.appendChild(card);
  });
}

// ── Enchantments ──────────────────────────────────────────────────────────

function renderEnchantments(playerState, enchListId) {
  const bar = document.getElementById(enchListId);
  if (!bar) return;

  const log = playerState.enchantLog || [];
  if (!log.length) {
    bar.innerHTML = `<div style="color:var(--text-muted);font-size:11px;padding:2px 0">none</div>`;
    return;
  }

  const rc = {
    common:   'var(--common)',
    rare:     'var(--rare)',
    epic:     'var(--epic)',
    legendary:'var(--legendary)',
    godlike:  'var(--godlike)',
  };

  bar.innerHTML = log.map(e => {
    const col = rc[e.rarity] || 'var(--text-dim)';
    return `
      <div style="display:flex;align-items:center;gap:6px;padding:5px 7px;margin-bottom:4px;
        border-radius:4px;border:1px solid ${col}66;background:${col}18"
        title="${e.desc}">
        <span style="font-size:14px;width:20px;text-align:center">${e.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-family:Cinzel,serif;font-size:11px;color:${col};
            white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e.name}</div>
          <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;
            overflow:hidden;text-overflow:ellipsis">${e.desc}</div>
        </div>
      </div>
    `;
  }).join('');
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

// ── Spells (compact summary in vault panel) ────────────────────────────────

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
    // Human: compact list (full cards shown in bottom bar)
    bar.innerHTML = spells.map(s => {
      const col = catCol[s.category] || 'var(--text-muted)';
      return `
        <div style="display:flex;align-items:center;gap:6px;padding:4px 6px;margin-bottom:3px;
          border-radius:3px;border:1px solid ${col}44;background:${col}0d">
          <span style="font-size:13px">${s.icon || '⚔'}</span>
          <div style="flex:1;min-width:0">
            <div style="font-family:Cinzel,serif;font-size:10px;color:${col};
              white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          </div>
          <span style="font-size:8px;color:${col};opacity:.7;font-family:Cinzel,serif;
            letter-spacing:1px">${(s.timing || '').toUpperCase()}</span>
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

// ── Spell Card Bar (MTG-style, fixed bottom) ──────────────────────────────

export function renderSpellCardBar(playerState, phase) {
  const bar = document.getElementById('spell-card-bar');
  if (!bar) return;

  const spells = playerState?.spells || [];
  const canCast = phase === 'PICK';

  if (!spells.length) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = 'flex';
  bar.style.pointerEvents = 'auto';

  const catCol = { attack:'var(--red2)', defense:'var(--rare)', utility:'var(--epic)' };

  bar.innerHTML = spells.map(s => {
    const col = catCol[s.category] || 'var(--text-muted)';
    const timingLabel = s.timing === 'instant' ? '⚡ Instant' : '✦ Sorcery';
    const castable = canCast && s.timing !== 'instant';
    const opacity = castable ? '1' : '0.5';
    const cursor = castable ? 'pointer' : 'default';

    return `
      <div
        data-spell-id="${s.instanceId}"
        style="
          width:82px;min-height:116px;
          border:2px solid ${col};border-radius:8px;
          background:linear-gradient(180deg,var(--panel2) 0%,var(--panel) 100%);
          box-shadow:0 0 10px ${col}44,3px 3px 0 rgba(0,0,0,.8);
          display:flex;flex-direction:column;
          cursor:${cursor};pointer-events:auto;
          opacity:${opacity};
          transition:transform .12s,box-shadow .12s,opacity .2s;
          position:relative;overflow:hidden;
          flex-shrink:0;
        "
        onmouseenter="if(${castable}){this.style.transform='translateY(-12px) scale(1.05)';this.style.boxShadow='0 0 20px ${col}88,3px 3px 0 rgba(0,0,0,.8)'}"
        onmouseleave="this.style.transform='';this.style.boxShadow='0 0 10px ${col}44,3px 3px 0 rgba(0,0,0,.8)'"
        onclick="${castable ? `window._game?.castSpell('${s.instanceId}')` : ''}"
      >
        <!-- Color bar top -->
        <div style="height:4px;background:${col};box-shadow:0 0 8px ${col}"></div>
        <!-- Category badge -->
        <div style="font-family:Cinzel,serif;font-size:7px;letter-spacing:1px;
          color:${col};text-align:center;padding:3px 0;text-transform:uppercase;
          border-bottom:1px solid ${col}33">${timingLabel}</div>
        <!-- Icon -->
        <div style="font-size:26px;text-align:center;padding:6px 0 4px;
          text-shadow:0 0 12px ${col}66">${s.icon || '⚔'}</div>
        <!-- Name -->
        <div style="font-family:Cinzel,serif;font-size:9px;font-weight:700;
          color:${col};text-align:center;padding:0 5px 4px;
          white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
          text-shadow:0 0 6px ${col}44">${s.name}</div>
        <!-- Desc -->
        <div style="font-size:8px;color:var(--text-dim);text-align:center;
          padding:0 5px 6px;line-height:1.35;flex:1">${s.desc || ''}</div>
        <!-- Uncastable overlay -->
        ${!castable ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,.35);border-radius:6px;
          display:flex;align-items:center;justify-content:center;font-size:8px;
          color:var(--text-muted);font-family:Cinzel,serif;text-align:center;padding:4px">
          ${s.timing === 'instant' ? 'Instant — auto' : 'Cast on your turn'}
        </div>` : ''}
      </div>
    `;
  }).join('');
}
