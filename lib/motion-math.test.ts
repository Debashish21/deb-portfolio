import { describe, expect, it } from "vitest";
import { bezier, bezierAngle, burnRadius, deliveryProgress, launchLegs, settledScroll, settleTarget, spiralTo } from "./motion-math";

describe("deliveryProgress", () => {
  const H = 1000;
  it("is all zero at the top", () => expect(deliveryProgress(0, H)).toEqual({ u: 0, v: 0, b: 0, r: 0 }));
  it("flies during the hero runway", () => expect(deliveryProgress(800, H)).toMatchObject({ u: 0.5, v: 0 }));
  it("starts landing after 1.6 viewports", () => expect(deliveryProgress(1600, H)).toEqual({ u: 1, v: 0, b: 0, r: 0 }));
  it("burns half way at v = 0.42", () => expect(deliveryProgress(1600 + 0.42 * 1200, H).b).toBeCloseTo(0.5));
  it("reveals the carousel with smoothstep", () => expect(deliveryProgress(1600 + 0.9 * 1200, H).r).toBeCloseTo(0.5));
  it("is fully settled at 2.8 viewports", () => expect(deliveryProgress(2800, H)).toEqual({ u: 1, v: 1, b: 1, r: 1 }));
  it("never exceeds 1 further down", () => expect(deliveryProgress(9000, H)).toEqual({ u: 1, v: 1, b: 1, r: 1 }));
});

describe("bezier", () => {
  const a = { x: 0, y: 0 }, d = { x: 30, y: 0 };
  it("hits its endpoints", () => {
    expect(bezier(a, { x: 10, y: 0 }, { x: 20, y: 0 }, d, 0)).toEqual(a);
    expect(bezier(a, { x: 10, y: 0 }, { x: 20, y: 0 }, d, 1)).toEqual(d);
  });
  it("is linear on a straight evenly spaced curve", () => expect(bezier(a, { x: 10, y: 0 }, { x: 20, y: 0 }, d, 0.5).x).toBeCloseTo(15));
  it("heads along +x with the plane offset", () => expect(bezierAngle(a, { x: 10, y: 0 }, { x: 20, y: 0 }, d, 0.5)).toBeCloseTo(22));
});

describe("burn and spiral", () => {
  it("burns from hub to rim", () => {
    expect(burnRadius(0)).toBe(17.5);
    expect(burnRadius(1)).toBe(49.5);
  });
  it("spirals from home to centre", () => {
    const p = { x: 100, y: 0 }, c = { x: 0, y: 0 };
    expect(spiralTo(p, c, 0)).toEqual(p);
    const end = spiralTo(p, c, 1);
    expect(end.x).toBeCloseTo(0);
    expect(end.y).toBeCloseTo(0);
    const mid = spiralTo(p, c, 0.5);
    expect(Math.hypot(mid.x, mid.y)).toBeCloseTo(50);
  });
});

describe("launchLegs", () => {
  const H = 1000, max = 10000;
  it("flies then burns from the top", () => {
    const legs = launchLegs(0, H, max, 1800, 2400);
    expect(legs.map((l) => [l.from, l.to, l.durationMs])).toEqual([[0, 1600, 1800], [1600, 2800, 2400]]);
  });
  it("only burns when already past the flight", () => {
    const legs = launchLegs(1600, H, max, 1800, 2400);
    expect(legs).toHaveLength(1);
    expect(legs[0].from).toBe(1600);
  });
  it("does nothing when already settled", () => expect(launchLegs(2800, H, max, 1800, 2400)).toEqual([]));
  it("never ends beyond the page", () => expect(launchLegs(0, H, 2000, 1800, 2400).at(-1)!.to).toBe(2000));
  it("keeps short legs at 300ms minimum", () => expect(launchLegs(1590, H, max, 1800, 2400)[0].durationMs).toBe(300));
  it("still scrolls to the end of a page shorter than the flight", () => {
    const legs = launchLegs(0, H, 1000, 1800, 2400);
    expect(legs).toHaveLength(1);
    expect(legs[0].to).toBe(1000);
  });
  it("knows where the carousel settles", () => expect(settledScroll(H)).toBe(2800));
});

describe("settleTarget", () => {
  const H = 1000, max = 10000; // settled at 2800, hold ends at 3600
  it("scrolling down, finishes a landing that stopped just short of settled", () => expect(settleTarget(2500, H, max, 1)).toBe(2800));
  it("scrolling up out of the projects, lets you leave", () => expect(settleTarget(2500, H, max, -1)).toBeNull());
  it("leaves the early part of the landing alone", () => expect(settleTarget(2300, H, max, 1)).toBeNull());
  it("doesn't move while the projects are pinned", () => {
    expect(settleTarget(2800, H, max, 1)).toBeNull();
    expect(settleTarget(3500, H, max, -1)).toBeNull();
  });
  it("scrolling back up from the footer, settles into the projects just past the hold", () => expect(settleTarget(3750, H, max, -1)).toBe(3600));
  it("scrolling down towards the footer, lets you go", () => expect(settleTarget(3750, H, max, 1)).toBeNull());
  it("lets go once you're well past the hold", () => expect(settleTarget(3900, H, max, -1)).toBeNull());
  it("never targets past the end of the page", () => expect(settleTarget(2500, H, 2700, 1)).toBe(2700));
});
