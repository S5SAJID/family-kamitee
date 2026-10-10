/**
 * Synthesized sound effects (Web Audio API). No audio files, fully offline.
 */
let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noiseBuffer(a: AudioContext, seconds: number) {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** Paper parchis rustling inside the box. */
export function playShuffle(durationMs = 2200) {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const buf = noiseBuffer(a, 0.12);
  const bursts = Math.floor(durationMs / 70);
  for (let i = 0; i < bursts; i++) {
    const src = a.createBufferSource();
    src.buffer = buf;
    const bp = a.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1800 + Math.random() * 2600;
    bp.Q.value = 0.9;
    const g = a.createGain();
    const at = t0 + (i * durationMs) / bursts / 1000 + Math.random() * 0.03;
    const vol = 0.08 + Math.random() * 0.12;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, at + 0.09);
    src.connect(bp).connect(g).connect(a.destination);
    src.start(at);
    src.stop(at + 0.12);
  }
  // soft wooden knocks of the box
  for (let i = 0; i < 6; i++) knock(a, t0 + i * (durationMs / 6000) + 0.05);
}

function knock(a: AudioContext, at: number) {
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(160, at);
  o.frequency.exponentialRampToValueAtTime(70, at + 0.12);
  g.gain.setValueAtTime(0.18, at);
  g.gain.exponentialRampToValueAtTime(0.001, at + 0.15);
  o.connect(g).connect(a.destination);
  o.start(at);
  o.stop(at + 0.16);
}

/** Paper unfolding swish. */
export function playUnfold() {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer(a, 0.5);
  const hp = a.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.setValueAtTime(800, t0);
  hp.frequency.linearRampToValueAtTime(4000, t0 + 0.4);
  const g = a.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.12, t0 + 0.1);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.45);
  src.connect(hp).connect(g).connect(a.destination);
  src.start(t0);
  src.stop(t0 + 0.5);
}

/** Celebratory reveal chime (major arpeggio). */
export function playReveal() {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const at = t0 + i * 0.11;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(0.16, at + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, at + 1.1);
    o.connect(g).connect(a.destination);
    o.start(at);
    o.stop(at + 1.2);
  });
}

export function playTick() {
  const a = ac();
  if (!a) return;
  const t0 = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = 'sine';
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.1, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  o.connect(g).connect(a.destination);
  o.start(t0);
  o.stop(t0 + 0.13);
}
