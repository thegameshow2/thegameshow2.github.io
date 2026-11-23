// Synthesized sound effects for the big screen (Web Audio, no files needed).
export const SFX = { on: localStorage.getItem("sfx") !== "0", vol: 0.6 };   // vol: 0 (silent) to 1 (loud)
// To use your own file for any effect, upload it to the repo and list it here, e.g. { correct: "sounds/correct.mp3" }
const CUSTOM = {};

let ac = null;
export const ctx = () => ac || (ac = new (window.AudioContext || window.webkitAudioContext)());

function tone(freq, start, dur, type = "sine", vol = 0.25, endFreq) {
  const c = ctx(), o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * SFX.vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.05);
}
const arp = (notes, step, dur, type = "triangle", vol = 0.3) => notes.forEach((f, i) => tone(f, i * step, dur, type, vol));

const SOUND = {
  start:   () => { arp([523, 659, 784, 1047], 0.13, 0.4); tone(1047, 0.55, 0.9, "sawtooth", 0.1); tone(1319, 0.55, 0.9, "sine", 0.25); },
  count:   () => tone(660, 0, 0.2, "square", 0.14),
  reveal:  () => { tone(880, 0, 0.14, "triangle", 0.3); tone(1320, 0.09, 0.4, "triangle", 0.3); tone(1760, 0.18, 0.5, "sine", 0.15); },
  open:    () => tone(988, 0, 0.14, "sine", 0.2),
  buzz:    () => { tone(300, 0, 0.4, "sawtooth", 0.22, 560); tone(600, 0.02, 0.35, "square", 0.08, 1000); },
  correct: () => { arp([523, 659, 784, 1047], 0.09, 0.42); tone(1319, 0.4, 0.8, "sine", 0.25); },
  wrong:   () => { tone(220, 0, 0.6, "sawtooth", 0.28, 110); tone(165, 0, 0.6, "square", 0.14, 80); },
  tick:    (up, p) => tone(up ? 500 + 900 * p : 1400 - 900 * p, 0, 0.06, "square", 0.09),
  swoosh:  () => tone(200, 0, 0.6, "sine", 0.18, 1400),
  whoosh:  () => tone(1000, 0, 0.45, "sawtooth", 0.07, 200),
  timer:   n => tone(n <= 3 ? 880 : 520, 0, 0.12, "square", n <= 3 ? 0.2 : 0.1),
  timeout: () => { tone(180, 0, 1, "sawtooth", 0.33, 90); tone(130, 0, 1, "square", 0.2, 70); tone(900, 0, 0.25, "square", 0.12); },
  win:     () => { arp([523, 659, 784, 1047, 1319, 1568], 0.14, 0.5); tone(1568, 0.9, 1.4, "sine", 0.25); tone(784, 0.9, 1.4, "sawtooth", 0.08); },
};

export function sfx(name, ...args) {
  if (!SFX.on) return;
  try {
    ctx().resume();
    if (CUSTOM[name]) { const a = new Audio(CUSTOM[name]); a.volume = SFX.vol; a.play().catch(() => {}); return; }
    SOUND[name]?.(...args);
  } catch {}
}
