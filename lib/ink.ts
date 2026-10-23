// The pencil ink drawn while hovering "Shape it": strokes that fade after a delay, with a cap on total ink.

export type InkPoint = { x: number; y: number; t: number; brk: boolean; len: number; fadeAt: number; jx: number; jy: number };

export const INK_FADE_OUT_MS = 500;
const STROKE_GAP_MS = 140;
const MIN_STEP_PX = 2;

export class InkStore {
  points: InkPoint[] = [];
  private breakNext = true;

  constructor(
    readonly fadeAfterMs = 6000,
    readonly capPx = 2400,
    private readonly rand: () => number = Math.random,
  ) {}

  breakStroke() {
    this.breakNext = true;
  }

  /** Adds a point; returns false when the move was too small to record. */
  add(x: number, y: number, now: number): boolean {
    const last = this.points[this.points.length - 1];
    const brk = this.breakNext || !last || now - last.t > STROKE_GAP_MS;
    this.breakNext = false;
    let len = 0;
    if (!brk && last) {
      len = Math.hypot(x - last.x, y - last.y);
      if (len < MIN_STEP_PX) return false;
    }
    this.points.push({ x, y, t: now, brk, len, fadeAt: now + this.fadeAfterMs, jx: (this.rand() - 0.5) * 1.4, jy: (this.rand() - 0.5) * 1.4 });
    let total = 0;
    for (const p of this.points) if (p.fadeAt > now) total += p.len;
    for (let k = 0; total > this.capPx && k < this.points.length; k++) {
      const p = this.points[k];
      if (p.fadeAt > now) {
        p.fadeAt = now;
        total -= p.len;
      }
    }
    return true;
  }

  alpha(p: InkPoint, now: number) {
    return 1 - Math.max(0, Math.min(1, (now - p.fadeAt) / INK_FADE_OUT_MS));
  }

  prune(now: number) {
    let cut = 0;
    while (cut < this.points.length - 1 && now - this.points[cut + 1].fadeAt > INK_FADE_OUT_MS) cut++;
    if (cut) this.points.splice(0, cut);
  }

  isAlive(now: number) {
    return this.points.some((p) => now - p.fadeAt < INK_FADE_OUT_MS);
  }

  /** Removes points at once (a recognised shape takes their place); the next point starts a new stroke. */
  kill(points: InkPoint[], now: number) {
    for (const p of points) p.fadeAt = now - INK_FADE_OUT_MS;
    this.breakNext = true;
  }

  clear() {
    this.points = [];
    this.breakNext = true;
  }

  snapshot() {
    return this.points.map(({ x, y, brk }) => ({ x, y, brk }));
  }
}

// Pencil colour along a stroke: violet → pink → amber and back, every 1000px of line drawn.
const STOPS: [number, number, number][] = [
  [169, 124, 248],
  [240, 122, 184],
  [245, 180, 83],
];

/** RGB at `s` px along a stroke. */
export function inkColor(s: number): [number, number, number] {
  const t = (((s % 1000) + 1000) % 1000) / 500, u = t <= 1 ? t : 2 - t; // 0→1→0
  const k = u * 2, i = Math.min(1, Math.floor(k)), f = k - i, a = STOPS[i], b = STOPS[i + 1];
  return [0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * f)) as [number, number, number];
}
