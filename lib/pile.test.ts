import { describe, expect, it } from "vitest";
import { dieTimes, Pile } from "./pile";

const run = (p: Pile, s: number, onStep?: () => void) => {
  for (let t = 0; t < s; t += 1 / 60) {
    p.step(1 / 60);
    onStep?.();
  }
};

describe("Pile", () => {
  it("a dropped shape falls, bounces on the floor and comes to rest on it", () => {
    const p = new Pile(800, 600);
    const b = p.add({ x: 400, y: 100, r: 40 });
    let touched = false, bounced = false;
    run(p, 4, () => {
      if (b.y + b.r >= 599) touched = true;
      if (touched && b.vy < -20) bounced = true;
    });
    expect(touched).toBe(true);
    expect(bounced).toBe(true);
    expect(Math.abs(b.y - (600 - 40))).toBeLessThan(4);
    expect(p.settled()).toBe(true);
  });
  it("shapes pile up instead of overlapping", () => {
    const p = new Pile(800, 600);
    const a = p.add({ x: 400, y: 300, r: 50 });
    const b = p.add({ x: 410, y: 50, r: 40 });
    run(p, 6);
    expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThan(90 - 6);
    expect(b.y + b.r).toBeLessThanOrEqual(604);
  });
  it("stays between the walls", () => {
    const p = new Pile(800, 600);
    const b = p.add({ x: 780, y: 100, r: 40 });
    b.vx = 900;
    run(p, 4);
    expect(b.x).toBeLessThanOrEqual(800 - 40 + 3);
    expect(b.x).toBeGreaterThanOrEqual(40 - 3);
  });
  it("rolls as it slides along the floor", () => {
    const p = new Pile(800, 600);
    const b = p.add({ x: 200, y: 559, r: 40 });
    b.vx = 300;
    run(p, 0.3);
    expect(b.angle).toBeGreaterThan(0.3);
  });
  it("is not settled while something is moving", () => {
    const p = new Pile(800, 600);
    p.add({ x: 400, y: 100, r: 40 });
    p.step(1 / 60);
    expect(p.settled()).toBe(false);
  });
  it("remove() takes a body out", () => {
    const p = new Pile(800, 600);
    const b = p.add({ x: 400, y: 100, r: 40 });
    p.remove(b);
    expect(p.bodies).toHaveLength(0);
  });
});

describe("dieTimes", () => {
  it("each shape evaporates `life` ms after it was drawn", () => expect(dieTimes([0, 5000], 4000, 600)).toEqual([4000, 9000]));
  it("shapes drawn close together still leave one by one, `gap` apart", () => expect(dieTimes([0, 100, 200], 4000, 600)).toEqual([4000, 4600, 5200]));
});
