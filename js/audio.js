// Sound: placeholder effects made with the Web Audio API, plus Dad's recorded lines (later).
// Browsers only allow sound after a tap, so unlock() runs on the first touch.
let ctx = null;
let enabled = true;
let noiseBuffer = null;
const voices = new Map(); // url → decoded AudioBuffer

export function setEnabled(on) {
  enabled = on;
}

export function unlock() {
  if (!ctx) {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume();
}

function ready() {
  return enabled && ctx && ctx.state === "running";
}

function tone(freq, duration, { type = "square", volume = 0.06, slideTo = null, delay = 0 } = {}) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration, { volume = 0.15, filter = 1200, type = "lowpass", delay = 0 } = {}) {
  if (!ready()) return;
  const t0 = ctx.currentTime + delay;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = filter;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(f).connect(gain).connect(ctx.destination);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

const SOUNDS = {
  // a tap on the menus
  tick() {
    tone(1200, 0.04, { type: "square", volume: 0.03 });
  },
  pop() {
    tone(500, 0.08, { type: "sine", volume: 0.06, slideTo: 900 });
  },
  boing() {
    tone(220, 0.3, { type: "sine", volume: 0.1, slideTo: 520 });
  },
  // a new bulb screwed in: a little glassy clink and a hum
  swap() {
    tone(2200, 0.05, { type: "sine", volume: 0.07 });
    tone(2900, 0.08, { type: "sine", volume: 0.05, delay: 0.05 });
    tone(120, 0.15, { type: "sawtooth", volume: 0.02, delay: 0.08 });
  },
  // a bulb popping as it dies
  fizz() {
    noise(0.12, { volume: 0.1, filter: 5000, type: "highpass" });
    tone(1800, 0.06, { type: "square", volume: 0.025, slideTo: 300 });
  },
  // a bulb pops
  zap() {
    noise(0.4, { volume: 0.25, filter: 2500, type: "bandpass" });
    tone(90, 0.5, { type: "sawtooth", volume: 0.12, slideTo: 40 });
  },
  click() {
    noise(0.04, { volume: 0.3, filter: 3000, type: "highpass" });
    tone(160, 0.05, { type: "square", volume: 0.05 });
  },
  drumroll() {
    for (let i = 0; i < 26; i++) noise(0.05, { volume: 0.1 + i * 0.006, filter: 900, delay: i * 0.05 });
  },
  // the lights come on: a big chord
  tada() {
    [523, 659, 784, 1047].forEach((f) => tone(f, 0.9, { type: "triangle", volume: 0.05 }));
    tone(1568, 0.6, { type: "sine", volume: 0.04, delay: 0.1 });
  },
  climb() {
    tone(300, 0.04, { type: "triangle", volume: 0.05 });
    tone(360, 0.04, { type: "triangle", volume: 0.05, delay: 0.1 });
  },
  creak() {
    tone(180, 0.35, { type: "sawtooth", volume: 0.03, slideTo: 140 });
  },
  refill() {
    for (let i = 0; i < 5; i++) tone(1800 + i * 200, 0.04, { type: "sine", volume: 0.04, delay: i * 0.05 });
  },
  empty() {
    tone(220, 0.12, { type: "square", volume: 0.05 });
    tone(165, 0.2, { type: "square", volume: 0.05, delay: 0.13 });
  },
  warn() {
    tone(880, 0.07, { type: "square", volume: 0.03 });
  },
  cheer() {
    [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, { type: "triangle", volume: 0.07, delay: i * 0.12 }));
  },
  groan() {
    tone(300, 0.6, { type: "sawtooth", volume: 0.04, slideTo: 120 });
  },
  // Grandma: "BURGLAR!"
  yell() {
    tone(900, 0.12, { type: "sawtooth", volume: 0.05, slideTo: 1300 });
    tone(1300, 0.35, { type: "sawtooth", volume: 0.05, slideTo: 800, delay: 0.12 });
  },
  bonk() {
    tone(500, 0.12, { type: "square", volume: 0.08, slideTo: 150 });
    noise(0.08, { volume: 0.2, filter: 1500 });
  },
  thud() {
    noise(0.25, { volume: 0.3, filter: 400 });
    tone(80, 0.3, { type: "sine", volume: 0.2, slideTo: 40 });
  },
  meow() {
    tone(600, 0.35, { type: "triangle", volume: 0.06, slideTo: 900 });
    tone(900, 0.3, { type: "triangle", volume: 0.05, slideTo: 500, delay: 0.3 });
  },
  hiss() {
    noise(0.45, { volume: 0.12, filter: 4000, type: "highpass" });
  },
  chatter() {
    for (let i = 0; i < 7; i++) tone(1600 + (i % 2) * 400, 0.04, { type: "square", volume: 0.025, delay: i * 0.06 });
  },
  bark() {
    for (const d of [0, 0.22]) {
      noise(0.08, { volume: 0.2, filter: 900, delay: d });
      tone(260, 0.1, { type: "sawtooth", volume: 0.08, slideTo: 180, delay: d });
    }
  },
  yelp() {
    tone(700, 0.15, { type: "sawtooth", volume: 0.05, slideTo: 1200 });
  },
  whistle() {
    tone(1400, 0.15, { type: "sine", volume: 0.05, slideTo: 1900 });
    tone(1900, 0.25, { type: "sine", volume: 0.05, slideTo: 1200, delay: 0.17 });
  },
  whoosh() {
    noise(0.35, { volume: 0.12, filter: 1200, type: "bandpass" });
  },
  splat() {
    noise(0.2, { volume: 0.3, filter: 800 });
  },
  swat() {
    noise(0.08, { volume: 0.35, filter: 2500, type: "bandpass" });
    tone(300, 0.08, { type: "square", volume: 0.06, slideTo: 120 });
  },
  // midnight: church bells
  bells() {
    for (let i = 0; i < 4; i++) {
      tone(392, 0.9, { type: "sine", volume: 0.07, delay: i * 0.45 });
      tone(784, 0.6, { type: "sine", volume: 0.03, delay: i * 0.45 });
    }
  },
};

export function play(name) {
  SOUNDS[name]?.();
}

// Plays a recorded voice line, fetched and decoded the first time it is needed.
// Dad says one thing at a time: a new line cuts off the last one.
let speaking = null;
let speakingUntil = 0;

export function busySpeaking() {
  return ctx && ctx.currentTime < speakingUntil;
}

export async function playVoice(url) {
  if (!url || !ready()) return false;
  try {
    let buffer = voices.get(url);
    if (!buffer) {
      const bytes = await (await fetch(url)).arrayBuffer();
      buffer = await ctx.decodeAudioData(bytes);
      voices.set(url, buffer);
    }
    try {
      speaking?.stop();
    } catch {
      // it had already finished
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
    speaking = src;
    speakingUntil = ctx.currentTime + buffer.duration;
    return true;
  } catch {
    return false;
  }
}
