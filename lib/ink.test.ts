import { describe, expect, it } from "vitest";
import { inkColor, InkStore } from "./ink";

const store = (fade = 6000, cap = 2400) => new InkStore(fade, cap, () => 0.5);

describe("InkStore", () => {
  it("starts a new stroke on the first point", () => {
    const s = store();
    s.add(0, 0, 0);
    expect(s.points[0]).toMatchObject({ brk: true, len: 0, fadeAt: 6000 });
  });
  it("continues a stroke within 140ms", () => {
    const s = store();
    s.add(0, 0, 0);
    s.add(10, 0, 50);
    expect(s.points[1]).toMatchObject({ brk: false, len: 10 });
  });
  it("ignores moves under 2px", () => {
    const s = store();
    s.add(0, 0, 0);
    expect(s.add(1, 0, 10)).toBe(false);
    expect(s.points).toHaveLength(1);
  });
  it("breaks after a 140ms pause or on request", () => {
    const s = store();
    s.add(0, 0, 0);
    s.add(10, 0, 300);
    expect(s.points[1].brk).toBe(true);
    s.breakStroke();
    s.add(20, 0, 310);
    expect(s.points[2].brk).toBe(true);
  });
  it("caps visible ink by fading the oldest first", () => {
    const s = store(6000, 100);
    for (let i = 0; i <= 20; i++) s.add(i * 10, 0, i);
    const visible = s.points.filter((p) => p.fadeAt > 20).reduce((t, p) => t + p.len, 0);
    expect(visible).toBeLessThanOrEqual(100);
    expect(s.points[1].fadeAt).toBeLessThanOrEqual(20);
    expect(s.points[20].fadeAt).toBe(6020);
  });
  it("fades out over 500ms and prunes dead points", () => {
    const s = store(1000);
    s.add(0, 0, 0);
    s.add(10, 0, 10);
    s.add(20, 0, 20);
    expect(s.alpha(s.points[0], 1000)).toBe(1);
    expect(s.alpha(s.points[0], 1250)).toBeCloseTo(0.5);
    expect(s.isAlive(1500)).toBe(true);
    expect(s.isAlive(1600)).toBe(false);
    s.prune(1512);
    expect(s.points.length).toBeLessThan(3);
  });
  it("kill() makes points vanish at once and starts a new stroke", () => {
    const s = store();
    s.add(0, 0, 0);
    s.add(10, 0, 10);
    s.add(20, 0, 20);
    s.kill([s.points[1], s.points[2]], 30);
    expect(s.alpha(s.points[1], 30)).toBe(0);
    expect(s.alpha(s.points[0], 30)).toBe(1);
    s.add(30, 0, 35);
    expect(s.points[3].brk).toBe(true);
  });
  it("snapshots positions and stroke breaks", () => {
    const s = store();
    s.add(1, 2, 0);
    expect(s.snapshot()).toEqual([{ x: 1, y: 2, brk: true }]);
    s.clear();
    expect(s.points).toEqual([]);
  });
});

describe("inkColor", () => {
  it("starts violet, passes through pink, reaches amber, then comes back", () => {
    expect(inkColor(0)).toEqual([169, 124, 248]);
    expect(inkColor(250)).toEqual([240, 122, 184]);
    expect(inkColor(500)).toEqual([245, 180, 83]);
    expect(inkColor(1000)).toEqual([169, 124, 248]);
  });
});
