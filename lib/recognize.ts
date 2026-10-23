// Recognises deliberate shapes in the hero pencil: circle, square (any rectangle), triangle, star, heart.
// The matcher is the "$1 Unistroke Recognizer" (Wobbrock, Wilson & Li, 2007): resample the stroke,
// rotate it by its indicative angle, scale it to a square, and compare it with template strokes.
// ShapeDetector finds those shapes inside a continuous pencil stroke (the desktop pencil draws on hover,
// so there is no pen-up): every target shape is closed, so it watches for the stroke looping back on itself.

export type Pt = { x: number; y: number };
export type ShapeName = "circle" | "square" | "triangle" | "star" | "heart";
export type Match = { name: ShapeName; score: number };

const N = 64;
const SIZE = 250;
const HALF_DIAG = 0.5 * Math.sqrt(2 * SIZE * SIZE);
const PHI = 0.5 * (-1 + Math.sqrt(5));
const THRESHOLD = 0.4;

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const centroid = (ps: Pt[]): Pt => {
  let x = 0, y = 0;
  for (const p of ps) {
    x += p.x;
    y += p.y;
  }
  return { x: x / ps.length, y: y / ps.length };
};
const pathLength = (ps: Pt[]) => ps.reduce((s, p, i) => (i ? s + dist(ps[i - 1], p) : 0), 0);
function bbox(ps: Pt[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of ps) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { w: x1 - x0, h: y1 - y0 };
}

function resample(ps: Pt[], n = N): Pt[] {
  const I = pathLength(ps) / (n - 1);
  const pts = ps.map((p) => ({ x: p.x, y: p.y }));
  const out: Pt[] = [pts[0]];
  let D = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (D + d >= I && d > 0) {
      const q = { x: pts[i - 1].x + ((I - D) / d) * (pts[i].x - pts[i - 1].x), y: pts[i - 1].y + ((I - D) / d) * (pts[i].y - pts[i - 1].y) };
      out.push(q);
      pts.splice(i, 0, q);
      D = 0;
    } else D += d;
  }
  while (out.length < n) out.push(pts[pts.length - 1]);
  return out.slice(0, n);
}

function rotateBy(ps: Pt[], a: number): Pt[] {
  const c = centroid(ps), cos = Math.cos(a), sin = Math.sin(a);
  return ps.map((p) => ({ x: (p.x - c.x) * cos - (p.y - c.y) * sin + c.x, y: (p.x - c.x) * sin + (p.y - c.y) * cos + c.y }));
}

/** Resample, rotate to the indicative angle, scale to a square, centre on the origin. Null for a near-1D stroke. */
function normalise(ps: Pt[]): Pt[] | null {
  if (ps.length < 8) return null;
  let p = resample(ps);
  const c = centroid(p);
  p = rotateBy(p, -Math.atan2(c.y - p[0].y, c.x - p[0].x));
  const b = bbox(p);
  if (Math.min(b.w, b.h) < 0.12 * Math.max(b.w, b.h)) return null;
  p = p.map((q) => ({ x: (q.x * SIZE) / b.w, y: (q.y * SIZE) / b.h }));
  const c2 = centroid(p);
  return p.map((q) => ({ x: q.x - c2.x, y: q.y - c2.y }));
}

const pathDistance = (a: Pt[], b: Pt[]) => a.reduce((s, p, i) => s + dist(p, b[i]), 0) / a.length;

function distanceAtBestAngle(ps: Pt[], t: Pt[]) {
  let a = -Math.PI / 4, b = Math.PI / 4;
  const eps = (2 * Math.PI) / 180;
  let x1 = PHI * a + (1 - PHI) * b, f1 = pathDistance(rotateBy(ps, x1), t);
  let x2 = (1 - PHI) * a + PHI * b, f2 = pathDistance(rotateBy(ps, x2), t);
  while (Math.abs(b - a) > eps) {
    if (f1 < f2) {
      b = x2;
      x2 = x1;
      f2 = f1;
      x1 = PHI * a + (1 - PHI) * b;
      f1 = pathDistance(rotateBy(ps, x1), t);
    } else {
      a = x1;
      x1 = x2;
      f1 = f2;
      x2 = (1 - PHI) * a + PHI * b;
      f2 = pathDistance(rotateBy(ps, x2), t);
    }
  }
  return Math.min(f1, f2);
}

// ---- Templates: each shape drawn the ways people tend to draw it, in both directions. ----

const ring = (n: number, f: (t: number) => Pt) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
function poly(vs: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < vs.length - 1; k++)
    for (let i = 0; i < 20; i++) out.push({ x: vs[k].x + ((vs[k + 1].x - vs[k].x) * i) / 20, y: vs[k].y + ((vs[k + 1].y - vs[k].y) * i) / 20 });
  out.push(vs[vs.length - 1]);
  return out;
}
const rect = (w: number, h: number, from: number) => {
  const c = [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];
  return poly([0, 1, 2, 3, 4].map((k) => c[(k + from) % 4]));
};
const starTips = (from: number) =>
  poly([0, 2, 4, 1, 3, 0].map((k) => {
    const a = -Math.PI / 2 + (((k + from) % 5) * 2 * Math.PI) / 5;
    return { x: Math.cos(a), y: Math.sin(a) };
  }));
const heartAt = (t0: number) =>
  ring(100, (u) => {
    const t = t0 + u * 2 * Math.PI;
    return { x: 16 * Math.sin(t) ** 3, y: -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) };
  });

const raw: [ShapeName, Pt[]][] = [
  ["circle", ring(64, (u) => ({ x: Math.cos(u * 2 * Math.PI), y: Math.sin(u * 2 * Math.PI) }))],
  ["square", rect(1, 1, 0)],
  ["square", rect(1.8, 1, 0)],
  ["square", rect(1.8, 1, 1)],
  ["triangle", poly([{ x: 0, y: -1 }, { x: 0.87, y: 0.5 }, { x: -0.87, y: 0.5 }, { x: 0, y: -1 }])],
  ["star", starTips(0)],
  ["heart", heartAt(0)],
  ["heart", heartAt(Math.PI)],
];
const TEMPLATES: { name: ShapeName; pts: Pt[] }[] = raw.flatMap(([name, pts]) =>
  [pts, [...pts].reverse()].map((p) => ({ name, pts: normalise(p)! })),
);

/** Best matching shape for a stroke, or null if nothing matches well enough. */
export function recognize(ps: Pt[], threshold = THRESHOLD): Match | null {
  const p = normalise(ps);
  if (!p) return null;
  let best: Match | null = null;
  for (const t of TEMPLATES) {
    const score = 1 - distanceAtBestAngle(p, t.pts) / HALF_DIAG;
    if (!best || score > best.score) best = { name: t.name, score };
  }
  return best && best.score >= threshold ? best : null;
}

// ---- Finding shapes inside a continuous stroke ----

export type StrokePt = Pt & { brk?: boolean };
export type Detected<P extends Pt> = Match & { points: P[] };

type Opts = { closeR: number; minPerim: number; minSize: number; travelMin: number; travelK: number; maxPoints: number };
const DEFAULTS: Opts = { closeR: 22, minPerim: 150, minSize: 40, travelMin: 160, travelK: 0.8, maxPoints: 900 };

/** Shoelace area of a closed path (absolute; a self-crossing star still counts its points). */
function loopArea(ps: Pt[]) {
  let a = 0;
  for (let i = 0; i < ps.length; i++) {
    const p = ps[i], q = ps[(i + 1) % ps.length];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a / 2);
}

/**
 * Feed it the pencil's points as they're drawn. Whenever the stroke comes back to an earlier point it
 * notes a candidate loop; it decides once the stroke has clearly moved on (or on flush(), at a pause or
 * pen-up), trying the biggest loop first, so a star isn't mistaken for the small loops its lines cross.
 */
export class ShapeDetector<P extends StrokePt = StrokePt> {
  private P: P[] = [];
  private cum: number[] = [];
  private floor = 0;
  private cands: { i: number; j: number; perim: number }[] = [];
  private lastClose = 0;
  private o: Opts;

  constructor(opts: Partial<Opts> = {}) {
    this.o = { ...DEFAULTS, ...opts };
  }

  push(p: P): Detected<P> | null {
    let found: Detected<P> | null = null;
    if (p.brk) found = this.flush();
    const { P, cum, o } = this;
    const n = P.length;
    cum.push(n ? cum[n - 1] + dist(P[n - 1], p) : 0);
    P.push(p);
    if (P.length > o.maxPoints) this.trim(P.length - Math.floor(o.maxPoints * 0.7));
    const j = P.length - 1;
    for (let i = this.floor; i < j - 8; i++) {
      if (dist(P[i], p) > o.closeR || cum[j] - cum[i] < o.minPerim) continue;
      const loop = P.slice(i, j + 1), b = bbox(loop);
      if (Math.min(b.w, b.h) >= o.minSize && loopArea(loop) >= 0.15 * b.w * b.h) {
        this.cands.push({ i, j, perim: cum[j] - cum[i] });
        this.lastClose = cum[j];
      }
      break;
    }
    if (this.cands.length) {
      const big = Math.max(...this.cands.map((c) => c.perim));
      if (cum[j] - this.lastClose > Math.max(o.travelMin, o.travelK * big)) return found ?? this.decide();
    }
    return found;
  }

  /** The stroke paused or ended: decide on any pending loop, then start afresh. */
  flush(): Detected<P> | null {
    const r = this.decide();
    this.P = [];
    this.cum = [];
    this.floor = 0;
    return r;
  }

  private decide(): Detected<P> | null {
    const cands = [...this.cands].sort((a, b) => b.perim - a.perim);
    this.cands = [];
    for (const c of cands) {
      const points = this.P.slice(c.i, c.j + 1), m = recognize(points);
      if (m) {
        this.floor = c.j + 1;
        return { ...m, points };
      }
    }
    return null;
  }

  private trim(k: number) {
    this.P.splice(0, k);
    const base = this.cum[k];
    this.cum = this.cum.slice(k).map((c) => c - base);
    this.floor = Math.max(0, this.floor - k);
    this.lastClose -= base;
    this.cands = this.cands.filter((c) => c.i >= k).map((c) => ({ ...c, i: c.i - k, j: c.j - k }));
  }
}
