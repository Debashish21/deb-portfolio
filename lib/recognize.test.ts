import { describe, expect, it } from "vitest";
import { recognize, ShapeDetector, type Pt } from "./recognize";

// Deterministic "hand" noise so tests are repeatable.
const rng = (seed: number) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

function wobble(pts: Pt[], amt: number, seed = 7): Pt[] {
  const r = rng(seed);
  return pts.map((p) => ({ x: p.x + (r() - 0.5) * amt, y: p.y + (r() - 0.5) * amt }));
}
function polyline(vs: Pt[], step = 4): Pt[] {
  const out: Pt[] = [];
  for (let k = 0; k < vs.length - 1; k++) {
    const a = vs[k], b = vs[k + 1], n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let i = 0; i < n; i++) out.push({ x: a.x + ((b.x - a.x) * i) / n, y: a.y + ((b.y - a.y) * i) / n });
  }
  out.push(vs[vs.length - 1]);
  return out;
}
const circle = (cx: number, cy: number, rx: number, ry = rx, start = 0, dir = 1, n = 90): Pt[] =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = start + (dir * i * 2 * Math.PI) / n;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
const square = (x: number, y: number, w: number, h = w) => polyline([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }]);
const triangle = (cx: number, cy: number, s: number) =>
  polyline([{ x: cx, y: cy - s }, { x: cx + s * 0.87, y: cy + s / 2 }, { x: cx - s * 0.87, y: cy + s / 2 }, { x: cx, y: cy - s }]);
function star(cx: number, cy: number, R: number, startTip = 0): Pt[] {
  const tip = (k: number) => {
    const a = -Math.PI / 2 + ((k % 5) * 2 * Math.PI) / 5;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  };
  return polyline([0, 2, 4, 1, 3, 0].map((k) => tip(k + startTip)));
}
const heart = (cx: number, cy: number, s: number): Pt[] =>
  Array.from({ length: 101 }, (_, i) => {
    const t = (i / 100) * 2 * Math.PI;
    return { x: cx + s * 16 * Math.sin(t) ** 3, y: cy - s * (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) };
  });

describe("recognize", () => {
  it("knows a wobbly hand-drawn circle, from any start and in either direction", () => {
    expect(recognize(wobble(circle(200, 200, 80), 8))?.name).toBe("circle");
    expect(recognize(wobble(circle(200, 200, 80, 80, 2, -1), 8, 3))?.name).toBe("circle");
  });
  it("treats an ellipse as a circle", () => expect(recognize(wobble(circle(200, 200, 110, 60), 6))?.name).toBe("circle"));
  it("knows a square and a rectangle", () => {
    expect(recognize(wobble(square(100, 100, 150), 8))?.name).toBe("square");
    expect(recognize(wobble(square(100, 100, 200, 110), 8, 5))?.name).toBe("square");
  });
  it("knows a triangle", () => expect(recognize(wobble(triangle(200, 200, 90), 8))?.name).toBe("triangle"));
  it("knows a five-point star drawn in one stroke", () => {
    expect(recognize(wobble(star(200, 200, 100), 8))?.name).toBe("star");
    expect(recognize(wobble(star(200, 200, 100, 2), 8, 9))?.name).toBe("star");
  });
  it("knows a heart", () => expect(recognize(wobble(heart(200, 200, 5), 6))?.name).toBe("heart"));
  it("ignores a straight line and an open zigzag", () => {
    expect(recognize(polyline([{ x: 0, y: 0 }, { x: 300, y: 40 }]))).toBeNull();
    expect(recognize(polyline([{ x: 0, y: 0 }, { x: 60, y: 120 }, { x: 120, y: 0 }, { x: 180, y: 120 }, { x: 240, y: 0 }]))).toBeNull();
  });
  it("ignores random scribbles", () => {
    let hits = 0;
    for (let s = 1; s <= 20; s++) {
      const r = rng(s * 31), pts: Pt[] = [{ x: 200, y: 200 }];
      for (let i = 0; i < 80; i++) {
        const p = pts[pts.length - 1];
        pts.push({ x: p.x + (r() - 0.5) * 40, y: p.y + (r() - 0.5) * 40 });
      }
      if (recognize(pts)) hits++;
    }
    expect(hits).toBeLessThanOrEqual(2);
  });
});

/** Feeds points like the pencil does (4px apart, ~8ms apart); returns every shape the detector reports. */
function feed(d: ShapeDetector, pts: Pt[]) {
  const found: string[] = [];
  for (const p of pts) {
    const r = d.push({ ...p, brk: false });
    if (r) found.push(r.name);
  }
  return found;
}

describe("ShapeDetector", () => {
  it("spots a circle once the stroke pauses", () => {
    const d = new ShapeDetector();
    expect(feed(d, wobble(circle(300, 300, 80), 6))).toEqual([]);
    expect(d.flush()?.name).toBe("circle");
  });
  it("spots a circle drawn in the middle of a longer hover stroke, without waiting for a pause", () => {
    const d = new ShapeDetector();
    const path = [...polyline([{ x: 0, y: 300 }, { x: 380, y: 300 }]), ...wobble(circle(300, 300, 80, 80, 0, 1), 6).slice(1), ...polyline([{ x: 380, y: 300 }, { x: 900, y: 320 }])];
    expect(feed(d, path)).toEqual(["circle"]);
  });
  it("waits for the whole star instead of stopping at its first self-crossing", () => {
    const d = new ShapeDetector();
    const found = feed(d, wobble(star(400, 300, 110), 5));
    const last = d.flush();
    expect([...found, last?.name].filter(Boolean)).toEqual(["star"]);
  });
  it("returns the stroke's own points for the shape", () => {
    const d = new ShapeDetector();
    const pts = wobble(circle(300, 300, 80), 6).map((p) => ({ ...p, brk: false }));
    pts.forEach((p) => d.push(p));
    const r = d.flush();
    expect(r?.points.every((p) => pts.includes(p as (typeof pts)[number]))).toBe(true);
    expect(r!.points.length).toBeGreaterThan(60);
  });
  it("does nothing for a long wandering line", () => {
    const d = new ShapeDetector();
    expect(feed(d, polyline([{ x: 0, y: 0 }, { x: 400, y: 100 }, { x: 800, y: 0 }]))).toEqual([]);
    expect(d.flush()).toBeNull();
  });
  it("a new stroke starts fresh", () => {
    const d = new ShapeDetector();
    const half = circle(300, 300, 80).slice(0, 46);
    feed(d, half);
    d.push({ x: 0, y: 0, brk: true });
    feed(d, circle(300, 300, 80).slice(46));
    expect(d.flush()).toBeNull();
  });
});
