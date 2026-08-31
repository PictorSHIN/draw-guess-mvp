let ctx = null;

function getCtx() {
  if (ctx) return ctx;
  try {
    if (typeof wx.createWebAudioContext === 'function') {
      ctx = wx.createWebAudioContext();
    }
  } catch (e) {}
  return ctx;
}

function tone(freq, dur, type, vol, delay) {
  const c = getCtx();
  if (!c) return;
  type = type || 'sine';
  vol = vol == null ? 0.25 : vol;
  delay = delay || 0;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function unlock() {
  const c = getCtx();
  if (!c) return;
  if (c.state === 'suspended' && c.resume) {
    c.resume();
  }
}

/** 开局倒数：3、2、1 各响一声 */
function countdown(step) {
  const n = step == null ? 3 : step;
  const base = { 3: 523, 2: 659, 1: 784 }[n] || 660;
  tone(base, 0.14, 'triangle', 0.38);
  tone(base * 1.5, 0.18, 'triangle', 0.32, 0.06);
}

/** 倒数结束，开始答题 */
function go() {
  tone(988, 0.1, 'triangle', 0.35);
  tone(1318, 0.22, 'triangle', 0.38, 0.08);
}

/** 切到下一题时的翻页提示音 */
function wordFlip() {
  tone(420, 0.06, 'sine', 0.18);
  tone(640, 0.09, 'sine', 0.22, 0.035);
  tone(880, 0.07, 'sine', 0.15, 0.07);
}

function correct() {
  tone(880, 0.12, 'triangle', 0.3);
  tone(1320, 0.16, 'triangle', 0.28, 0.08);
}

function skip() {
  tone(300, 0.16, 'sawtooth', 0.22);
  tone(200, 0.18, 'sawtooth', 0.2, 0.06);
}

function tick() {
  tone(1000, 0.05, 'square', 0.15);
}

function end() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.22, 'triangle', 0.28, i * 0.12));
}

module.exports = {
  unlock,
  countdown,
  go,
  wordFlip,
  correct,
  skip,
  tick,
  end
};
