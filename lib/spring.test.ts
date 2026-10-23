import { describe, expect, it } from "vitest";
import { atRest, springAt } from "./spring";

const bouncy = { response: 0.5, dampingFraction: 0.6 };
const smooth = { response: 0.5, dampingFraction: 1 };

describe("springAt", () => {
  it("starts where it was, moving as fast as it was", () => {
    for (const cfg of [bouncy, smooth]) {
      const s = springAt(1, 3, cfg, 0);
      expect(s.x).toBeCloseTo(1);
      expect(s.v).toBeCloseTo(3);
    }
  });
  it("comes to rest at the target", () => {
    for (const cfg of [bouncy, smooth]) {
      const s = springAt(1, 0, cfg, 2);
      expect(Math.abs(s.x)).toBeLessThan(0.002);
      expect(Math.abs(s.v)).toBeLessThan(0.02);
    }
  });
  it("an under-damped spring overshoots the target; a critically damped one never does", () => {
    const ts = Array.from({ length: 200 }, (_, i) => i / 100);
    expect(Math.min(...ts.map((t) => springAt(1, 0, bouncy, t).x))).toBeLessThan(-0.05);
    expect(Math.min(...ts.map((t) => springAt(1, 0, smooth, t).x))).toBeGreaterThanOrEqual(-1e-9);
  });
  it("velocity is the derivative of position", () => {
    for (const cfg of [bouncy, smooth]) {
      const h = 1e-5, t = 0.13;
      const num = (springAt(0.7, -2, cfg, t + h).x - springAt(0.7, -2, cfg, t - h).x) / (2 * h);
      expect(springAt(0.7, -2, cfg, t).v).toBeCloseTo(num, 3);
    }
  });
  it("a release velocity with no displacement swings out and back (the carousel peek)", () => {
    const peak = Math.max(...Array.from({ length: 100 }, (_, i) => springAt(0, 5, bouncy, i / 200).x));
    expect(peak).toBeGreaterThan(0.15);
    expect(Math.abs(springAt(0, 5, bouncy, 2).x)).toBeLessThan(0.002);
  });
});

describe("atRest", () => {
  it("needs both position and speed near zero", () => {
    expect(atRest({ x: 0.0001, v: 0.001 })).toBe(true);
    expect(atRest({ x: 0.0001, v: 1 })).toBe(false);
  });
});
