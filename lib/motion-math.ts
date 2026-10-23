// Pure maths for the scroll-linked "Special Delivery" sequence and paper-plane flights.

export type Pt = { x: number; y: number };

export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smoothstep = (x: number) => x * x * (3 - 2 * x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeInOutQuad = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;

export function bezier(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const m = 1 - t;
  return {
    x: m * m * m * p0.x + 3 * m * m * t * p1.x + 3 * m * t * t * p2.x + t * t * t * p3.x,
    y: m * m * m * p0.y + 3 * m * m * t * p1.y + 3 * m * t * t * p2.y + t * t * t * p3.y,
  };
}

/** Heading along the curve in degrees; the plane icon points 22° off its axis, hence the offset. */
export function bezierAngle(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number, offsetDeg = 22): number {
  const a = bezier(p0, p1, p2, p3, Math.max(0, t - 0.01));
  const b = bezier(p0, p1, p2, p3, Math.min(1, t + 0.01));
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + offsetDeg;
}

/** Runway lengths in viewport heights (spec §3.3). */
export const FLIGHT_VH = 1.6;
export const LANDING_VH = 1.2;

export type DeliveryProgress = { u: number; v: number; b: number; r: number };

export function deliveryProgress(scrollY: number, H: number): DeliveryProgress {
  const u = clamp01(scrollY / (FLIGHT_VH * H));
  const v = clamp01((scrollY - FLIGHT_VH * H) / (LANDING_VH * H));
  const b = clamp01((v - 0.12) / 0.6);
  const r = smoothstep(clamp01((v - 0.8) / 0.2));
  return { u, v, b, r };
}

/** Laser ring radius as % of the disc: from the hub (17.5) to the rim (49.5). */
export const burnRadius = (b: number) => lerp(17.5, 49.5, b);

/** Position of a point spiralling into `center`; s = 0 at home, 1 at the centre. */
export function spiralTo(p: Pt, center: Pt, s: number, turns = 1.8): Pt {
  const dx = p.x - center.x, dy = p.y - center.y;
  const th = Math.atan2(dy, dx) + s * turns * Math.PI;
  const rad = Math.hypot(dx, dy) * (1 - s);
  return { x: center.x + rad * Math.cos(th), y: center.y + rad * Math.sin(th) };
}

export type ScrollLeg = { from: number; to: number; durationMs: number; ease: (t: number) => number };

export const settledScroll = (H: number) => (FLIGHT_VH + LANDING_VH) * H;

/** Once settled, the projects stay pinned for this many more viewports of scrolling before the footer comes up. */
export const HOLD_VH = 0.8;
/** Stopping within this distance before settled finishes the landing… */
const PULL_IN_VH = 0.4;
/** …and within this distance past the hold pulls the projects back into place. */
const PULL_BACK_VH = 0.25;

/**
 * Where the page should spring to when scrolling comes to rest, or null to leave it where it is.
 * It only ever finishes a move in the direction you were scrolling (dir: 1 down, -1 up), so it never
 * holds back someone who is leaving the projects, e.g. one mouse-wheel notch at a time.
 */
export function settleTarget(scrollY: number, H: number, maxScroll: number, dir: number): number | null {
  const settled = settledScroll(H), holdEnd = settled + HOLD_VH * H;
  if (dir > 0 && scrollY >= settled - PULL_IN_VH * H && scrollY < settled) return Math.min(settled, maxScroll);
  if (dir < 0 && scrollY > holdEnd && scrollY <= holdEnd + PULL_BACK_VH * H) return Math.min(holdEnd, maxScroll);
  return null;
}

/** Auto-scroll for "Ship it": fly to the end of the hero runway, then burn to the settled carousel. */
export function launchLegs(scrollY: number, H: number, maxScroll: number, flightMs: number, burnMs: number): ScrollLeg[] {
  const mid = FLIGHT_VH * H;
  const end = Math.min(maxScroll, settledScroll(H));
  const legs: ScrollLeg[] = [];
  if (scrollY < mid && mid <= end) legs.push({ from: scrollY, to: mid, durationMs: Math.max(300, flightMs * (1 - scrollY / mid)), ease: easeInOutCubic });
  else if (scrollY < end && mid > end) return [{ from: scrollY, to: end, durationMs: Math.max(300, flightMs), ease: easeInOutCubic }];
  const b0 = Math.max(scrollY, Math.min(mid, end));
  if (b0 < end) {
    const frac = end > mid ? (b0 - mid) / (end - mid) : 0;
    legs.push({ from: b0, to: end, durationMs: Math.max(300, burnMs * (1 - Math.max(0, frac))), ease: easeInOutSine });
  }
  return legs;
}
