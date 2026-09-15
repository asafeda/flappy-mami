// Built-in 8-bit chiptune SFX via the Web Audio API. Dropping files named
// flap/point/collect/hit into assets/audio/ still wins — playSfx() prefers
// those HTMLAudio elements when they're present.

let audioCtx = null;
let master = null;
const waveCache = new Map();
const playCounts = Object.create(null);

function getCtx() {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  master = audioCtx.createGain();
  master.gain.value = 0.22;
  master.connect(audioCtx.destination);
  return audioCtx;
}

export function unlockSfx() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
}

function pulseWave(ctx, duty) {
  const key = String(duty);
  if (waveCache.has(key)) return waveCache.get(key);
  const harmonics = 32;
  const real = new Float32Array(harmonics);
  const imag = new Float32Array(harmonics);
  for (let n = 1; n < harmonics; n++) {
    imag[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
  }
  const wave = ctx.createPeriodicWave(real, imag);
  waveCache.set(key, wave);
  return wave;
}

function playPulse(ctx, t, { freq, freqEnd, dur, gain = 0.16, duty = 0.25, slide = null }) {
  const osc = ctx.createOscillator();
  osc.setPeriodicWave(pulseWave(ctx, duty));
  const g = ctx.createGain();
  osc.connect(g);
  g.connect(master);

  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd && freqEnd !== freq) {
    const when = t + (slide == null ? dur * 0.45 : slide);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), when);
  }

  g.gain.setValueAtTime(Math.max(0.0001, gain), t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function playNoise(ctx, t, { dur = 0.12, gain = 0.18, cutoff = 1800 }) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;

  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(cutoff, t);
  filter.frequency.exponentialRampToValueAtTime(400, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filter);
  filter.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.02);
}

function playHtmlAudio(audio) {
  try {
    const clone = audio.cloneNode ? audio.cloneNode() : audio;
    clone.currentTime = 0;
    clone.volume = 1;
    const p = clone.play();
    if (p && p.catch) p.catch(() => {});
  } catch {
    // autoplay policy / missing file — ignore
  }
}

const SYNTH = {
  // Short rising chirp — a flap, not a full jump jingle.
  flap(ctx, t) {
    playPulse(ctx, t, {
      freq: 520,
      freqEnd: 880,
      dur: 0.09,
      gain: 0.12,
      duty: 0.125,
      slide: 0.07,
    });
  },

  // Two-note score ding, distinct from the coin collect.
  point(ctx, t) {
    playPulse(ctx, t, { freq: 784, dur: 0.07, gain: 0.12, duty: 0.5 });
    playPulse(ctx, t + 0.07, { freq: 1047, dur: 0.14, gain: 0.14, duty: 0.5 });
  },

  // Super Mario-ish coin: square B5 then E6 with a quick decay.
  collect(ctx, t) {
    const osc = ctx.createOscillator();
    osc.setPeriodicWave(pulseWave(ctx, 0.5));
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(master);

    osc.frequency.setValueAtTime(987.77, t);
    osc.frequency.setValueAtTime(1318.51, t + 0.045);

    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);

    osc.start(t);
    osc.stop(t + 0.34);
  },

  hit(ctx, t) {
    playNoise(ctx, t, { dur: 0.14, gain: 0.22, cutoff: 1400 });
    playPulse(ctx, t + 0.02, {
      freq: 240,
      freqEnd: 70,
      dur: 0.38,
      gain: 0.16,
      duty: 0.25,
      slide: 0.32,
    });
  },

  ui(ctx, t) {
    playPulse(ctx, t, { freq: 1320, dur: 0.05, gain: 0.08, duty: 0.25 });
  },
};

export function playSfx(name, fileAudio) {
  playCounts[name] = (playCounts[name] || 0) + 1;
  if (fileAudio) {
    playHtmlAudio(fileAudio);
    return;
  }
  const ctx = getCtx();
  if (!ctx || !master) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => {});
  }
  const fn = SYNTH[name];
  if (!fn) return;
  try {
    fn(ctx, ctx.currentTime + 0.001);
  } catch {
    // ignore synthesis errors
  }
}

export function getSfxStatus() {
  return {
    state: audioCtx ? audioCtx.state : "none",
    playCounts: { ...playCounts },
  };
}
