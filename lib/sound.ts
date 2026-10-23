// Optional interface sounds, synthesised with Web Audio (no files). Off until the visitor turns them on;
// the choice is remembered in localStorage. Every call is a no-op while sound is off.

export type Sfx = "click" | "whoosh" | "burned";

const KEY = "dsh-sound";
let on: boolean | null = null;
let ac: AudioContext | null = null;
let humO: OscillatorNode | null = null, humG: GainNode | null = null;
const listeners = new Set<() => void>();

export function soundOn(): boolean {
  if (on === null) {
    try {
      on = localStorage.getItem(KEY) === "1";
    } catch {
      on = false;
    }
  }
  return on;
}

export function subscribeSound(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

function audio(): AudioContext | null {
  if (!ac) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ac = new C();
  }
  if (ac.state === "suspended") void ac.resume();
  return ac;
}

export function setSound(v: boolean) {
  on = v;
  try {
    localStorage.setItem(KEY, v ? "1" : "0");
  } catch {}
  listeners.forEach((fn) => fn());
  if (v) {
    audio();
    setTimeout(() => sfx("click"), 0);
  } else hum(0, 0);
}

export function sfx(kind: Sfx) {
  if (!soundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.currentTime, out = a.destination;
  if (kind === "click") {
    const o = a.createOscillator(), g = a.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(1700, t);
    o.frequency.exponentialRampToValueAtTime(520, t + 0.045);
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + 0.08);
  } else if (kind === "whoosh") {
    const dur = 0.9, buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = a.createBufferSource(), bp = a.createBiquadFilter(), g = a.createGain();
    src.buffer = buf;
    bp.type = "bandpass";
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(380, t);
    bp.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    bp.frequency.exponentialRampToValueAtTime(500, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp).connect(g).connect(out);
    src.start(t);
    src.stop(t + dur);
  } else {
    // "burned": a two-note chime as the disc finishes
    [988, 1480].forEach((fq, k) => {
      const o = a.createOscillator(), g = a.createGain(), s = t + k * 0.09;
      o.type = "sine";
      o.frequency.value = fq;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.05, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.7);
      o.connect(g).connect(out);
      o.start(s);
      o.stop(s + 0.75);
    });
  }
}

/** The burner's motor: a low filtered hum whose pitch rises as the burn progresses. level 0 silences it. */
export function hum(level: number, pitch: number) {
  if (!ac && (!level || !soundOn())) return;
  const a = soundOn() ? audio() : ac;
  if (!a) return;
  if (!humO) {
    humO = a.createOscillator();
    humO.type = "sawtooth";
    const f = a.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 700;
    humG = a.createGain();
    humG.gain.value = 0;
    humO.connect(f).connect(humG).connect(a.destination);
    humO.start();
  }
  const t = a.currentTime;
  if (pitch) humO.frequency.setTargetAtTime(pitch, t, 0.05);
  humG!.gain.setTargetAtTime(soundOn() ? level : 0, t, 0.08);
}
