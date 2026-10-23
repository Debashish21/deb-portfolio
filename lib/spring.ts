// Damped spring, parameterised the way Apple's SwiftUI springs are: `response` is the period of one
// swing in seconds, `dampingFraction` how quickly it calms (1 = no overshoot, lower = more bounce).
// Solved exactly, so it is stable at any frame rate and can start with any velocity (e.g. a flick).

export type SpringConfig = { response: number; dampingFraction: number };
export type SpringState = { x: number; v: number };

/** Displacement from the target and velocity at time t (seconds), starting from x0 moving at v0. */
export function springAt(x0: number, v0: number, cfg: SpringConfig, t: number): SpringState {
  const w = (2 * Math.PI) / cfg.response;
  const z = Math.min(1, cfg.dampingFraction);
  if (z >= 1) {
    const c = v0 + w * x0, e = Math.exp(-w * t);
    return { x: (x0 + c * t) * e, v: (c - w * (x0 + c * t)) * e };
  }
  const a = z * w, wd = w * Math.sqrt(1 - z * z);
  const B = (v0 + a * x0) / wd, e = Math.exp(-a * t), cs = Math.cos(wd * t), sn = Math.sin(wd * t);
  return { x: e * (x0 * cs + B * sn), v: e * ((B * wd - a * x0) * cs - (a * B + x0 * wd) * sn) };
}

export const atRest = (s: SpringState, eps = 0.001) => Math.abs(s.x) < eps && Math.abs(s.v) < eps * 10;

/**
 * Runs a spring from `from` to `to` on animation frames. Returns cancel(); `onFrame` gets the value and
 * its velocity (units/second) so a gesture can catch the motion mid-flight and carry its speed.
 */
export function runSpring(opts: {
  from: number; to: number; velocity: number; cfg: SpringConfig; eps?: number;
  onFrame: (value: number, velocity: number) => void; onDone?: () => void;
}): () => void {
  const { from, to, velocity, cfg, onFrame, onDone, eps = 0.001 } = opts;
  let raf = 0;
  const t0 = performance.now();
  const tick = (now: number) => {
    const s = springAt(from - to, velocity, cfg, (now - t0) / 1000);
    if (atRest(s, eps)) {
      onFrame(to, 0);
      onDone?.();
      return;
    }
    onFrame(to + s.x, s.v);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
