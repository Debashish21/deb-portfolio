import { describe, expect, it } from "vitest";
import { snapSteps, velocityOf } from "./swipe";

describe("snapSteps", () => {
  it("springs back from a small nudge", () => expect(snapSteps(0.1, 0)).toBe(0));
  it("moves one disc once the drag passes a fifth of a disc", () => {
    expect(snapSteps(0.3, 0)).toBe(1);
    expect(snapSteps(-0.3, 0)).toBe(-1);
  });
  it("lands on the nearest disc for long drags", () => expect(snapSteps(2.4, 0)).toBe(2));
  it("a quick flick carries to the next disc even if the drag was short", () => expect(snapSteps(0.08, 3)).toBe(1));
  it("a flick against the drag can cancel it", () => expect(snapSteps(0.3, -4)).toBe(0));
  it("never travels more than three discs", () => expect(snapSteps(2.6, 40)).toBe(3));
});

describe("velocityOf", () => {
  it("is zero with fewer than two samples", () => expect(velocityOf([{ t: 0, v: 1 }], 0)).toBe(0));
  it("measures units per second over the recent window", () =>
    expect(velocityOf([{ t: 0, v: 0 }, { t: 50, v: 0.5 }, { t: 100, v: 1 }], 100)).toBeCloseTo(10));
  it("ignores a stale gesture (finger held still before release)", () =>
    expect(velocityOf([{ t: 0, v: 0 }, { t: 50, v: 1 }], 400)).toBe(0));
});
