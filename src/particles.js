/**
 * src/particles.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * particles.js — Particle system + floating text
 * Canvas overlay, no DOM pollution.
 */

// ── Canvas Setup ──────────────────────────────────────────────────────────

const _canvas = document.createElement('canvas');
_canvas.style.cssText = 'position:fixed;top:0;left:0;pointer-events:none;z-index:9999;width:100%;height:100%';
document.body.appendChild(_canvas);
const _pCtx = _canvas.getContext('2d');

let _particles = [];
let _raf = null;

function _resize() {
  _canvas.width  = window.innerWidth;
  _canvas.height = window.innerHeight;
}
_resize();
window.addEventListener('resize', _resize);

// ── Particle Loop ─────────────────────────────────────────────────────────

function _loop() {
  _pCtx.clearRect(0, 0, _canvas.width, _canvas.height);
  _particles = _particles.filter(p => p.life > 0);

  _particles.forEach(p => {
    p.x  += p.vx;
    p.y  += p.vy;
    p.vy += 0.12;   // gravity
    p.vx *= 0.98;   // drag
    p.life--;

    _pCtx.save();
    _pCtx.globalAlpha = Math.max(0, p.life / p.maxLife);
    _pCtx.fillStyle = p.color;

    if (p.star) {
      _drawStar(_pCtx, p.x, p.y, p.size / 2);
    } else {
      _pCtx.beginPath();
      _pCtx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
      _pCtx.fill();
    }
    _pCtx.restore();
  });

  if (_particles.length > 0) {
    _raf = requestAnimationFrame(_loop);
  } else {
    _raf = null;
    _pCtx.clearRect(0, 0, _canvas.width, _canvas.height);
  }
}

function _drawStar(ctx, x, y, r) {
  const r2 = r * 0.4;
  ctx.beginPath();
  for (let j = 0; j < 8; j++) {
    const ang = j * Math.PI / 4;
    const rv  = j % 2 === 0 ? r : r2;
    j === 0
      ? ctx.moveTo(x + rv * Math.cos(ang), y + rv * Math.sin(ang))
      : ctx.lineTo(x + rv * Math.cos(ang), y + rv * Math.sin(ang));
  }
  ctx.closePath();
  ctx.fill();
}

function _start() {
  if (!_raf) _raf = requestAnimationFrame(_loop);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Spawn a burst of particles at (cx, cy).
 * count: more particles for bigger moments
 */
export function spawnParticles(cx, cy, baseColor = '#f0b84a', count = 40) {
  const cols = [baseColor, '#ffe088', '#ffcc44', 'rgba(255,255,255,.9)', '#fff8d0'];

  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 1.5 + Math.random() * 7;
    _particles.push({
      x:       cx + (Math.random() - 0.5) * 20,
      y:       cy + (Math.random() - 0.5) * 10,
      vx:      Math.cos(a) * s,
      vy:      Math.sin(a) * s - 3,
      size:    1.5 + Math.random() * 4,
      color:   cols[Math.floor(Math.random() * cols.length)],
      life:    55 + Math.random() * 45,
      maxLife: 100,
      star:    Math.random() > 0.5,
    });
  }
  _start();
}

/**
 * Gold coin burst — upward spray.
 */
export function spawnCoinParticles(cx, cy) {
  const cols = ['#f0b84a', '#ffe088', '#ffd700', '#ffcc44'];
  for (let i = 0; i < 30; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
    const s = 2 + Math.random() * 6;
    _particles.push({
      x:       cx + (Math.random() - 0.5) * 10,
      y:       cy,
      vx:      Math.cos(a) * s,
      vy:      Math.sin(a) * s - 1,
      size:    2 + Math.random() * 3.5,
      color:   cols[Math.floor(Math.random() * cols.length)],
      life:    45 + Math.random() * 35,
      maxLife: 80,
      star:    true,
    });
  }
  _start();
}

/**
 * Show a floating text label at (x, y).
 * Fades out and drifts upward over 1.4s.
 */
export function showFloat(txt, color = 'var(--gold2)', x = null, y = null) {
  const el = document.createElement('div');
  el.className = 'sfloat';
  el.textContent = txt;

  const px = x ?? window.innerWidth  / 2 - 50;
  const py = y ?? window.innerHeight * 0.45;

  el.style.cssText = `
    left:${px}px;top:${py}px;font-size:28px;
    color:${color};text-shadow:0 0 20px ${color};
  `;
  document.body.appendChild(el);

  // Spawn particles at same location
  const count = txt.includes('×2') ? 80 : parseInt(txt.replace(/[^0-9]/g, '')) >= 1000 ? 60 : 40;
  spawnParticles(px + 50, py, color.startsWith('var') ? '#f0b84a' : color, count);

  setTimeout(() => el.remove(), 1400);
}

/**
 * Balatro-style score breakdown overlay.
 * Shows lines sequentially, then total + gold.
 */
function showScoreBreakdown(subRolls, totalScore, wasDoubled, coinsEarned = 0) {
  const existing = document.getElementById('score-breakdown-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'score-breakdown-overlay';
  overlay.style.cssText = `
    position:fixed;top:20%;right:20px;z-index:5000;
    width:210px;background:var(--bg2);border:1px solid var(--border2);
    border-radius:6px;padding:12px;font-family:Cinzel,serif;
    box-shadow:4px 4px 0 rgba(0,0,0,.7),0 0 20px rgba(0,0,0,.5);
    cursor:move;user-select:none;
  `;

  // Close button
  const closeBtn = document.createElement('div');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `position:absolute;top:6px;right:8px;cursor:pointer;
    color:var(--text-muted);font-size:12px;`;
  closeBtn.onclick = () => overlay.remove();
  overlay.appendChild(closeBtn);

  // Make draggable
  let dragging = false, dragX = 0, dragY = 0;
  overlay.onmousedown = e => {
    dragging = true;
    dragX = e.clientX - overlay.offsetLeft;
    dragY = e.clientY - overlay.offsetTop;
  };
  document.onmousemove = e => {
    if (!dragging) return;
    overlay.style.left = (e.clientX - dragX) + 'px';
    overlay.style.top  = (e.clientY - dragY) + 'px';
    overlay.style.right = 'auto';
  };
  document.onmouseup = () => { dragging = false; };

  document.body.appendChild(overlay);

  // Build lines from sub-rolls
  const lines = [];
  subRolls.forEach(sr => {
    if (sr.feuerhand) lines.push({ label: '🔥 Feuerhand', value: null, color: 'var(--gold)', isMult: true });
    lines.push({ label: sr.score.toLocaleString(), value: sr.score, color: 'var(--gold)' });
  });

  if (wasDoubled) {
    lines.push({ label: '⚡ Double Essence ×2', value: null, color: 'var(--legendary)', isMult: true });
  }

  // Render lines sequentially
  lines.forEach((line, i) => {
    setTimeout(() => {
      if (!overlay.isConnected) return;
      const el = document.createElement('div');
      el.style.cssText = `
        font-size:13px;color:${line.color};margin-bottom:3px;
        opacity:0;transform:translateX(-8px);transition:all .2s;
        ${line.isMult ? `border-left:2px solid ${line.color};padding-left:6px;` : ''}
      `;
      if (line.isMult) {
        el.textContent = line.label;
      } else {
        el.innerHTML = `+<b>${line.value?.toLocaleString() || ''}</b>`;
      }
      overlay.appendChild(el);
      requestAnimationFrame(() => { el.style.opacity = '1'; el.style.transform = 'none'; });
    }, i * 180);
  });

  // Total + gold
  setTimeout(() => {
    if (!overlay.isConnected) return;

    const sep = document.createElement('div');
    sep.style.cssText = 'border-top:1px solid var(--border2);margin:6px 0 4px;';
    overlay.appendChild(sep);

    const tot = document.createElement('div');
    tot.style.cssText = `
      font-size:22px;font-weight:700;color:var(--gold2);
      text-shadow:0 0 20px rgba(240,184,74,.8);
      opacity:0;transform:scale(.9);transition:all .25s;
    `;
    tot.textContent = `= ${totalScore.toLocaleString()}`;
    overlay.appendChild(tot);
    requestAnimationFrame(() => { tot.style.opacity = '1'; tot.style.transform = 'scale(1)'; });

    if (coinsEarned > 0) {
      const goldLine = document.createElement('div');
      goldLine.style.cssText = 'font-size:14px;color:var(--gold);margin-top:4px;opacity:0;transition:all .25s;';
      goldLine.textContent = `+${coinsEarned} 🪙 Gold`;
      overlay.appendChild(goldLine);
      requestAnimationFrame(() => { goldLine.style.opacity = '1'; });
    }
  }, lines.length * 180 + 300);
}
