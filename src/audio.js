/**
 * src/audio.js
 * Auto-extracted from bundle. Edit this file.
 */

/**
 * audio.js — Synthesized sound effects via Web Audio API
 * No external files. All sounds procedurally generated.
 */

let _ctx = null;
function _getCtx() {
  if (!_ctx) {
    try { _ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch(e) { return null; }
  }
  if (_ctx.state === 'suspended') _ctx.resume();
  return _ctx;
}

function playTone(freq, type = 'sine', gain = 0.15, duration = 0.15, delay = 0) {
  const ctx = _getCtx(); if (!ctx) return;
  try {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, ctx.currentTime + delay);
    g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    o.start(ctx.currentTime + delay);
    o.stop(ctx.currentTime + delay + duration + 0.01);
  } catch(e) {}
}

function playNoise(gain = 0.08, duration = 0.08, delay = 0) {
  const ctx = _getCtx(); if (!ctx) return;
  try {
    const bufSize = Math.floor(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    src.buffer = buf;
    g.gain.setValueAtTime(gain, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
    src.connect(g); g.connect(ctx.destination);
    src.start(ctx.currentTime + delay);
  } catch(e) {}
}

export const SFX = {
  roll() {
    playNoise(0.05, 0.08);
    playTone(180, 'triangle', 0.06, 0.1);
  },
  pick() {
    playTone(600, 'sine', 0.08, 0.06);
    playTone(800, 'sine', 0.06, 0.05, 0.04);
  },
  click() { playTone(400, 'square', 0.04, 0.04); },
  combo() {
    [440, 550, 660].forEach((f, i) => playTone(f, 'sine', 0.1, 0.12, i * 0.06));
  },
  farkle() {
    playTone(220, 'sawtooth', 0.12, 0.2);
    playTone(180, 'sawtooth', 0.10, 0.25, 0.1);
    playNoise(0.08, 0.15, 0.05);
  },
  feuerhand() {
    [523, 659, 784, 1047].forEach((f, i) => playTone(f, 'sine', 0.12, 0.15, i * 0.07));
    playNoise(0.04, 0.2, 0.1);
  },
  bank(score = 0) {
    const base = score >= 2000 ? 880 : score >= 1000 ? 660 : score >= 500 ? 523 : 440;
    [base, base * 1.25, base * 1.5].forEach((f, i) => playTone(f, 'sine', 0.12, 0.18, i * 0.08));
  },
  coin() {
    playTone(1200, 'sine', 0.06, 0.14);
    playTone(1600, 'sine', 0.05, 0.10, 0.05);
    playTone(2000, 'sine', 0.04, 0.08, 0.09);
  },
  shop() {
    playTone(523, 'sine', 0.08, 0.12);
    playTone(659, 'sine', 0.07, 0.12, 0.08);
  },
  spell() {
    playTone(330, 'sawtooth', 0.06, 0.08);
    playTone(440, 'triangle', 0.08, 0.15, 0.05);
    playTone(550, 'sine', 0.06, 0.12, 0.12);
  },
  error() {
    playTone(180, 'sawtooth', 0.08, 0.12);
    playNoise(0.04, 0.05, 0.05);
  },
  multiply() {
    [523, 659, 784, 1047, 1319].forEach((f, i) => playTone(f, 'sine', 0.1, 0.15, i * 0.06));
  },
  victory() {
    [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => playTone(f, 'sine', 0.12, 0.2, i * 0.08));
  },
};
