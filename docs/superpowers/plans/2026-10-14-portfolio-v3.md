# Portfolio v3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the site as one scrolling page (Nav → Hero "live verbs" → Special Delivery → disc carousel → "Your idea's next" footer) per the v3 design.

**Architecture:** Next.js App Router page with one client shell (`Portfolio.tsx`) composing focused components. Scroll-linked motion is computed by pure, unit-tested functions in `lib/` and applied by a single `requestAnimationFrame` painter that writes straight to the DOM (no React re-render per frame). Native document scrolling; no animation library.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, plain CSS, Vitest (pure logic only), Playwright via MCP for browser verification.

**Spec:** `docs/superpowers/specs/2026-10-14-portfolio-v3-design.md`. Source prototype: `design-v3/portfolio-with-animated-character/project/Portfolio v3.dc.html` (read it for any visual detail not repeated here).

## Global Constraints

- Colours: background `oklch(0.13 0.008 290)`, text `oklch(0.96 0.006 290)`, muted `oklch(0.74 0.01 290)`, accent `oklch(0.72 0.19 295)`, button shade `oklch(0.62 0.21 295)` (existing CSS tokens `--bg --fg --accent --accent-strong`).
- Fonts: Geist (300/400/500), Geist Mono, Permanent Marker (footer disc only).
- Runways: hero `1.6 × max(100vh,560px)`, projects `2.2 × max(100vh,560px)`; progress `u = S/1.6H`, `v = (S−1.6H)/1.2H`, `b = (v−0.12)/0.6`, `r = smoothstep((v−0.8)/0.2)`, all clamped to 0..1, `H = max(innerHeight, 560)`.
- Timings: ink fades after 6000ms (fade-out 900ms), ink cap 2400px, flight 1800ms, burn 2400ms, spotlight 240px, doodle base opacity 0.08 (0.18 reduced), touch roam 4500ms (tap roam 4200ms), ship whoosh 1.15s, back to top 2000ms.
- Copy is exact as in the spec (§3.2 notes, §3.5 footer). Email placeholder `hello@debashish.com`; LinkedIn/GitHub placeholders `https://www.linkedin.com/`, `https://github.com/` (the owner fills them in).
- Mouse wheel always scrolls the page; arrows/buttons/click step the carousel.
- Every effect has a reduced-motion path (spec §3.6).
- No git commits unless the owner asks; each task ends with a verification checkpoint instead.

## Review Focus

1. **Scrolling during the auto-launch**: wheel, touch or key input must stop the auto-scroll immediately and leave the page where the visitor put it.
2. **Resizing or rotating mid-sequence**: the painter must recompute on `resize`; the plane, burn and carousel must never get stuck half-way.
3. **Opening and closing a case study from the carousel**: page scroll position is preserved and page scrolling is unlocked afterwards.
4. **Footer idea text with emoji, quotes, `&` and line-break-ish input**: the `mailto:` link must be correctly encoded and the 80-character limit enforced.
5. **Reduced motion**: nothing important stays hidden (carousel heading, controls and discs visible; footer ship opens mail directly).

Tests for these live in Task 1 (mail encoding, launch legs) and the browser checks of Tasks 2, 4, 5 and 6.

---

### Task 1: Pure motion maths, ink store, disc label and mail helpers (with Vitest)

**Files:**
- Modify: `package.json` (devDependency `vitest`, script `test`)
- Create: `vitest.config.ts`
- Create: `lib/motion-math.ts`, `lib/motion-math.test.ts`
- Create: `lib/ink.ts`, `lib/ink.test.ts`
- Create: `lib/disc-label.ts`, `lib/disc-label.test.ts`
- Create: `lib/mail.ts`, `lib/mail.test.ts`
- Create: `lib/viewport.ts`

**Interfaces (produced, used by later tasks):**
- `motion-math`: `type Pt = {x:number;y:number}`; `clamp01`, `smoothstep`, `lerp`, `easeInOutCubic`, `easeInOutQuad`, `easeInOutSine`; `bezier(p0,p1,p2,p3,t): Pt`; `bezierAngle(p0,p1,p2,p3,t, offsetDeg=22): number`; `FLIGHT_VH = 1.6`, `LANDING_VH = 1.2`; `deliveryProgress(scrollY, H): {u,v,b,r}`; `burnRadius(b): number`; `spiralTo(p, center, s, turns=1.8): Pt`; `type ScrollLeg = {from;to;durationMs;ease}`; `launchLegs(scrollY, H, maxScroll, flightMs, burnMs): ScrollLeg[]`; `settledScroll(H): number`.
- `ink`: `class InkStore(fadeAfterMs=6000, capPx=2400, rand=Math.random)` with `points`, `add(x,y,now): boolean`, `breakStroke()`, `alpha(p,now)`, `prune(now)`, `isAlive(now)`, `clear()`, `snapshot(): {x,y,brk}[]`; `INK_FADE_OUT_MS = 900`.
- `disc-label`: `splitLabel(text): string[]`, `lineRoom(count): number[]`, `labelFontSize(lines): number`.
- `mail`: `mailtoHref(to, subject, body): string`.
- `viewport`: `viewportH(): number` (`Math.max(window.innerHeight, 560)`).

- [ ] **Step 1: Install Vitest and add the config**

Run: `npm install -D vitest`

Add to `package.json` scripts: `"test": "vitest run"`.

Create `vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["lib/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
```

- [ ] **Step 2: Write the failing tests**

`lib/motion-math.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bezier, bezierAngle, burnRadius, deliveryProgress, launchLegs, settledScroll, spiralTo } from "./motion-math";

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
```

`lib/ink.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { InkStore } from "./ink";

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
  it("fades out over 900ms and prunes dead points", () => {
    const s = store(1000);
    s.add(0, 0, 0);
    s.add(10, 0, 10);
    s.add(20, 0, 20);
    expect(s.alpha(s.points[0], 1000)).toBe(1);
    expect(s.alpha(s.points[0], 1450)).toBeCloseTo(0.5);
    expect(s.isAlive(1900)).toBe(true);
    expect(s.isAlive(2000)).toBe(false);
    s.prune(1912);
    expect(s.points.length).toBeLessThan(3);
  });
  it("snapshots positions and stroke breaks", () => {
    const s = store();
    s.add(1, 2, 0);
    expect(s.snapshot()).toEqual([{ x: 1, y: 2, brk: true }]);
    s.clear();
    expect(s.points).toEqual([]);
  });
});
```

`lib/disc-label.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { labelFontSize, splitLabel } from "./disc-label";

describe("splitLabel", () => {
  it("keeps short ideas on one line", () => expect(splitLabel("Splitting rent is hard")).toHaveLength(1));
  it("uses two lines up to 48 characters", () => {
    const t = "Splitting rent with flatmates is a total mess";
    const lines = splitLabel(t);
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe(t);
  });
  it("uses three lines beyond 48 characters", () => {
    const t = "Why does every expense app make splitting rent with flatmates so hard";
    const lines = splitLabel(t);
    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).toBe(t);
  });
});

describe("labelFontSize", () => {
  it("never exceeds 18", () => expect(labelFontSize(["hi"])).toBe(18));
  it("shrinks for long lines", () => expect(labelFontSize(["a".repeat(30)])).toBeLessThan(18));
});
```

`lib/mail.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { mailtoHref } from "./mail";

describe("mailtoHref", () => {
  it("encodes subject and body", () => {
    expect(mailtoHref("hi@x.com", "An idea worth shipping", "Rent & bills — \"fair\" splits 🙂"))
      .toBe("mailto:hi@x.com?subject=An%20idea%20worth%20shipping&body=Rent%20%26%20bills%20%E2%80%94%20%22fair%22%20splits%20%F0%9F%99%82");
  });
  it("keeps the address readable", () => expect(mailtoHref("a.b@c.io", "s", "b").startsWith("mailto:a.b@c.io?")).toBe(true));
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test`
Expected: FAIL (modules `./motion-math`, `./ink`, `./disc-label`, `./mail` not found).

- [ ] **Step 4: Implement the modules**

`lib/motion-math.ts`:

```ts
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

export const settledScroll = (H: number) => (FLIGHT_VH + LANDING_VH) * H;
```

`lib/ink.ts`:

```ts
// The pencil ink drawn while hovering "Shape it": strokes that fade after a delay, with a cap on total ink.

export type InkPoint = { x: number; y: number; t: number; brk: boolean; len: number; fadeAt: number; jx: number; jy: number };

export const INK_FADE_OUT_MS = 900;
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

  clear() {
    this.points = [];
    this.breakNext = true;
  }

  snapshot() {
    return this.points.map(({ x, y, brk }) => ({ x, y, brk }));
  }
}
```

`lib/disc-label.ts`:

```ts
// Fits a visitor's idea onto the footer disc: 1–3 curved lines of marker handwriting.

export function splitLabel(text: string): string[] {
  if (text.length <= 22) return [text];
  const n = text.length <= 48 ? 2 : 3;
  const words = text.split(/\s+/);
  const target = text.length / n;
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && out.length < n - 1 && (cur + " " + w).length > target + 3) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  out.push(cur);
  return out;
}

/** Usable width (in the 200-unit disc viewBox) for each line. */
export const lineRoom = (count: number) => (count === 3 ? [100, 128, 110] : [128, 118]);

export function labelFontSize(lines: string[]): number {
  const room = lineRoom(lines.length);
  return Math.min(...lines.map((l, k) => Math.min(18, room[k] / (Math.max(l.length, 1) * 0.62))));
}
```

`lib/mail.ts`:

```ts
export const mailtoHref = (to: string, subject: string, body: string) =>
  `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
```

`lib/viewport.ts`:

```ts
/** The page's sizing unit: the viewport height, never below the 560px design minimum. */
export const viewportH = () => Math.max(window.innerHeight, 560);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test`
Expected: PASS (all four files).

- [ ] **Step 6: Checkpoint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no errors (ignore the pre-existing `LayoutProps` typegen note if it appears before a build).

---

### Task 2: Page shell: content, icons, nav, carousel and case study extracted, mascot removed

The site keeps working at the end of this task: nav, a static hero, the settled carousel with case studies, and a simple footer. Later tasks replace the hero, delivery and footer stubs.

**Files:**
- Create: `content/site.ts`
- Modify: `content/portfolio.ts` (keep `lenses` and the `projects` re-export only)
- Create: `components/icons.tsx`
- Create: `hooks/useReducedMotion.ts`
- Create: `components/Nav.tsx`
- Create: `components/DiscStage.tsx`
- Create: `components/CaseStudy.tsx`
- Create (stubs, replaced later): `components/hero/Hero.tsx`, `components/delivery/Delivery.tsx`, `components/footer/Footer.tsx`
- Rewrite: `components/Portfolio.tsx`
- Modify: `app/layout.tsx` (fonts, CSS imports, metadata)
- Create: `app/styles/shell.css`
- Modify: `app/globals.css` (remove obsolete rules, `.case` fixed, pager selectors)
- Create: `public/Debashish-CV.pdf` (placeholder)
- Delete: `components/Mascot.tsx`, `content/mascot.ts`, `public/mascot/`, `scripts/process-mascot-clips.sh`, `docs/mascot-production.md`; uninstall `motion`

**Interfaces:**
- Produces `content/site.ts`: `site {name, role, email, cvHref, linkedin, github, signoff}`, `hero {eyebrow, sub, primary, secondary}`, `footer {eyebrow, headline, hint, sent, hiring, sayHi, subject}`, `type DoodleDef = {x:string;y:string;w:string;r:string;paths:string[];note:string}`, `doodles: DoodleDef[]`, `timings {...}`.
- Produces `icons.tsx`: `TorchIcon`, `PencilIcon`, `PlaneIcon`, `PenIcon`, `Doodle({paths})`.
- Produces `useReducedMotion(): boolean`.
- Produces `Nav({current, onGo})`, `type NavTarget = "top" | "projects" | "contact"`.
- Produces `DiscStage({active, hidden, onGo, onOpen, stageRef})` with DOM hooks `[data-stage]`, `[data-land-center]`, `[data-disc]`, `[data-front]`, `[data-burn="hubglow|laser|shimmer|label"]`, CSS vars `--r --blank --burn --spin`, attribute `data-moving`.
- Produces `CaseStudy({active, closing, intro, onClose, onNext})`, `type Intro = {size;dx;dy}`.
- Stubs fix the props later tasks implement: `Hero(HeroProps)` with `HeroProps = {ink: InkStore; reduced: boolean; onShip(): void; onHello(): void}`; `Delivery({ink, reduced, apiRef, active, caseHidden})` and `type DeliveryApi = {launch(): void; cancel(): void}`; `Footer({footRef, reduced})`.

- [ ] **Step 1: Content**

Create `content/site.ts`:

```ts
// Copy, links, doodles and timings for the single-page site. Case studies live in content/projects/.

export const site = {
  name: "Debashish",
  role: "Product Owner",
  email: "hello@debashish.com",
  cvHref: "/Debashish-CV.pdf",
  linkedin: "https://www.linkedin.com/",
  github: "https://github.com/",
  signoff: "Bootstrapping ideas, one sprint at a time.",
};

export const hero = {
  eyebrow: "Product Owner",
  sub: "From an everyday annoyance to a product people want, with the customer, the tech and the numbers in view.",
  primary: "See what I've shipped",
  secondary: "Say hello",
};

export const footer = {
  eyebrow: "Your turn",
  headline: "Got something bugging you? Let's ship it.",
  hint: "Click the disc to write",
  placeholder: "Write your idea…",
  sent: "Opening your mail app ✓",
  hiring: "Hiring?",
  sayHi: "Just say hi",
  subject: "An idea worth shipping",
};

export type DoodleDef = { x: string; y: string; w: string; r: string; paths: string[]; note: string };

/** Everyday things the torch reveals in the hero, each with a question I've asked myself. */
export const doodles: DoodleDef[] = [
  { x: "60%", y: "17%", w: "72px", r: "-6deg", note: "Could a social app be built to give you your attention back?",
    paths: ["M10 24 Q10 16 18 16 L52 16 Q60 16 60 24 L60 42 Q60 50 52 50 L30 50 L19 61 L21 50 L18 50 Q10 50 10 42 Z", "M20 28 L48 28", "M20 37 L40 37", "M58 16 a7 7 0 1 0 14 0 a7 7 0 1 0 -14 0", "M65 13 L65 19"] },
  { x: "85%", y: "22%", w: "82px", r: "8deg", note: "Money out isn't money spent. Why does every app pretend it is?",
    paths: ["M22 9 L58 8 L59 63 L54 68 L49 62 L44 68 L39 62 L34 68 L29 62 L24 68 L21 63 Z", "M29 19 L50 18", "M29 27 L46 27", "M29 35 L52 34", "M29 47 L38 47", "M44 47 L52 46", "M21 32 L33 37 L27 47"] },
  { x: "72%", y: "48%", w: "78px", r: "-4deg", note: "Good ideas rarely show up at the desk. Mine arrive in queues.",
    paths: ["M40 12 C26 12 18 22 20 34 C21 43 29 47 31 56 L49 56 C51 47 59 43 60 34 C62 22 54 12 40 12 Z", "M32 62 L48 62", "M34 68 L46 68", "M34 42 L37 35 L40 42 L43 35 L46 42", "M12 18 L6 14", "M68 18 L74 14", "M40 6 L40 2"] },
  { x: "92%", y: "60%", w: "86px", r: "10deg", note: "Why do lyrics live in another window, not where my eyes already are?",
    paths: ["M17 46 C15 20 65 20 63 46", "M11 44 Q11 41 15 41 L20 41 Q23 41 23 44 L23 60 Q23 63 20 63 L15 63 Q11 63 11 60 Z", "M57 44 Q57 41 60 41 L65 41 Q69 41 69 44 L69 60 Q69 63 65 63 L60 63 Q57 63 57 60 Z", "M62 22 L62 6 L72 4 L72 18", "M55 22 a3.5 3 0 1 0 7 0 a3.5 3 0 1 0 -7 0", "M65 18 a3.5 3 0 1 0 7 0 a3.5 3 0 1 0 -7 0"] },
  { x: "80%", y: "82%", w: "80px", r: "-8deg", note: "Why does a two-week sprint always feel like four days?",
    paths: ["M12 19 L66 18 L67 66 L13 67 Z", "M12 29 L66 29", "M25 12 L25 23", "M53 12 L53 23", "M19 41 L23 45 L30 37", "M37 41 L41 45 L48 37", "M19 56 L23 60 L30 52", "M38 52 L48 52 L48 61 L38 61 Z"] },
  { x: "61%", y: "80%", w: "70px", r: "5deg", note: "How much caffeine is 'enough'? Still collecting data.",
    paths: ["M18 30 L60 30 L56 65 Q55 69 50 69 L28 69 Q23 69 22 65 Z", "M59 38 C71 38 71 55 57 55", "M30 22 C26 17 34 13 30 7", "M40 22 C36 17 44 13 40 7", "M50 22 C46 17 54 13 50 7"] },
  { x: "7%", y: "89%", w: "62px", r: "-10deg", note: "If everything's a priority, which note survives Friday?",
    paths: ["M14 14 L64 15 L65 51 L51 65 L15 64 Z", "M51 65 L51 52 L65 51", "M22 27 L52 26", "M22 35 L48 36", "M22 43 L38 43"] },
];

export const timings = {
  inkFadeMs: 6000,
  inkCapPx: 2400,
  flightMs: 1800,
  burnMs: 2400,
  spotlightPx: 240,
  doodleOpacity: 0.08,
  reducedDoodleOpacity: 0.18,
  roamTapMs: 4200,
  roamTouchMs: 4500,
  shipWhooshMs: 1150,
  backToTopMs: 2000,
  trail: true,
};
```

Replace `content/portfolio.ts` with:

```ts
// The five case-study lenses. Site copy lives in content/site.ts; case studies in content/projects/.

import type { LensKey } from "./types";

export { projects } from "./projects";
export type { Project } from "./types";

/** The five case-study lenses, in order: key, title, the hat worn */
export const lenses: [key: LensKey, title: string, hat: string][] = [
  ["problem", "Problem Statement", "Product Owner"],
  ["product", "Product View", "Product Manager"],
  ["engineering", "Engineering View", "Tech Partner"],
  ["result", "Result", "Owner of outcomes"],
  ["future", "Future Scope", "Strategist"],
];
```

- [ ] **Step 2: Icons and the reduced-motion hook**

Create `components/icons.tsx`:

```tsx
// Line icons ported from the v3 prototype. All decorative; parents set aria-hidden.

const INK = "oklch(0.96 0.006 290)";
const ACC = "var(--accent)";
const DARK = "oklch(0.2 0.012 290)";
const shadow = { display: "block", overflow: "visible", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.6))" } as const;

export function TorchIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" style={shadow}>
      <g transform="rotate(-45 20 20)" strokeLinejoin="round">
        <path d="M13 3 L27 3 L24 12 L16 12 Z" fill={DARK} stroke={INK} strokeWidth={1.4} />
        <line x1={14} y1={3} x2={26} y2={3} stroke={ACC} strokeWidth={2.4} strokeLinecap="round" />
        <rect x={16} y={12} width={8} height={24} rx={2} fill={DARK} stroke={INK} strokeWidth={1.4} />
        <rect x={18.5} y={17} width={3} height={5} rx={1} fill={ACC} />
      </g>
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" style={shadow}>
      <g transform="rotate(45 16 16)" strokeLinejoin="round">
        <rect x={12} y={1.5} width={8} height={4} rx={1} fill={ACC} />
        <rect x={12} y={5.5} width={8} height={18.5} fill={DARK} stroke={INK} strokeWidth={1.3} />
        <path d="M12 24 L20 24 L16 30.5 Z" fill="oklch(0.85 0.03 70)" stroke={INK} strokeWidth={1.3} />
        <path d="M14.6 28.2 L17.4 28.2 L16 30.5 Z" fill={INK} />
      </g>
    </svg>
  );
}

export function PlaneIcon() {
  return (
    <svg viewBox="0 0 30 30" width="100%" height="100%" style={shadow}>
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 15 L27 5 L19 27 L15 18 Z" fill={DARK} stroke={INK} strokeWidth={1.4} />
        <path d="M15 18 L27 5" fill="none" stroke={ACC} strokeWidth={1.4} />
      </g>
    </svg>
  );
}

export function PenIcon() {
  return (
    <svg viewBox="0 0 140 40" width="100%" style={{ display: "block", overflow: "visible" }}>
      <g fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 12 L96 12 Q100 12 100 16 L100 24 Q100 28 96 28 L14 28 Q10 28 10 24 L10 16 Q10 12 14 12 Z" />
        <path d="M100 14 L122 15 Q127 15 127 20 Q127 25 122 25 L100 26" style={{ stroke: ACC }} />
        <path d="M10 16 L4 18 L2 20 L4 22 L10 24" />
        <path d="M30 12 L30 28" opacity={0.5} />
        <path d="M38 20 L86 20" opacity={0.25} />
      </g>
    </svg>
  );
}

/** Hand-drawn doodle: a firm stroke plus a faint, slightly offset second pass. */
export function Doodle({ paths }: { paths: string[] }) {
  const g = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <g {...g} strokeWidth={1.6}>
        {paths.map((d, k) => <path key={k} d={d} />)}
      </g>
      <g {...g} strokeWidth={0.9} opacity={0.5} transform="translate(0.9 0.6) rotate(0.8 40 40)">
        {paths.map((d, k) => <path key={k} d={d} />)}
      </g>
    </svg>
  );
}
```

Create `hooks/useReducedMotion.ts`:

```ts
"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

export function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
```

- [ ] **Step 3: Nav**

Create `components/Nav.tsx`:

```tsx
"use client";

import { site } from "@/content/site";

export type NavTarget = "top" | "projects" | "contact";

export default function Nav({ current, onGo }: { current: "projects" | "contact" | null; onGo: (t: NavTarget) => void }) {
  return (
    <div className="nav-bar">
      <nav className="nav" aria-label="Main">
        <button className="brand" onClick={() => onGo("top")}>
          <span className="brand-dot" />
          <span>{site.name}</span>
        </button>
        <div className="nav-links">
          <button className="nav-link" aria-current={current === "projects" ? "true" : undefined} onClick={() => onGo("projects")}>
            Projects
          </button>
          <button className="nav-link" aria-current={current === "contact" ? "true" : undefined} onClick={() => onGo("contact")}>
            Contact
          </button>
          <a className="nav-cv" href={site.cvHref} download>
            <span className="nav-cv-long">Download CV ↓</span>
            <span className="nav-cv-short">CV ↓</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: DiscStage (carousel with burn hooks)**

Create `components/DiscStage.tsx`:

```tsx
"use client";

import type { CSSProperties, MouseEvent, RefObject } from "react";
import ImageSlot from "./ImageSlot";
import { projects } from "@/content/portfolio";

const N = projects.length;

/** Signed distance of disc k from the active disc, wrapped around the ring. */
export function discOffset(k: number, active: number) {
  let o = k - active;
  o -= N * Math.round(o / N);
  return o;
}

type Props = {
  active: number;
  /** Discs fade out while a case study is open */
  hidden: boolean;
  onGo: (i: number) => void;
  onOpen: () => void;
  stageRef: RefObject<HTMLDivElement | null>;
};

// Every disc transform is scaled by --r (0 = stacked behind the front disc, 1 = settled carousel),
// which the delivery painter drives while the carousel fans out.
export default function DiscStage({ active, hidden, onGo, onOpen, stageRef }: Props) {
  const onMove = (e: MouseEvent) => {
    const el = stageRef.current;
    const anchor = el?.querySelector<HTMLElement>("[data-land-center]");
    if (!el || !anchor) return;
    const r = el.getBoundingClientRect();
    const s = anchor.offsetWidth || 300;
    const cx = r.left + r.width / 2, cy = r.top + r.height * 0.54;
    el.style.setProperty("--px", Math.max(-1, Math.min(1, (e.clientX - cx) / s)).toFixed(3));
    el.style.setProperty("--py", Math.max(-1, Math.min(1, (e.clientY - cy) / s)).toFixed(3));
    el.style.setProperty("--lift", (Math.hypot(e.clientX - cx, e.clientY - cy) < s / 2 ? s * 0.05 : 0) + "px");
  };
  const onLeave = () => {
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--px", "0");
    el.style.setProperty("--py", "0");
    el.style.setProperty("--lift", "0px");
  };

  return (
    <div ref={stageRef} className="stage" data-stage onMouseMove={onMove} onMouseLeave={onLeave}>
      <div className="stage-anchor" data-land-center>
        {projects.map((p, k) => {
          const o = discOffset(k, active);
          const front = o === 0;
          const near = Math.min(o, 2.2), yaw = 22 + o * -10, x = o * 1.02;
          const far = o < -2.5 ? Math.max(0, 1 - (-o - 2.5) / 1.2) : 1;
          const z = front ? "0px" : `calc((-0.35 + ${(near * 0.42 + 0.35).toFixed(3)} * var(--r)) * var(--s))`;
          const style = {
            transform:
              `translate3d(calc(${x.toFixed(3)} * var(--r) * var(--s)), calc(${(-o * 0.24).toFixed(3)} * var(--r) * var(--s)), ${z}) ` +
              `rotateZ(calc(-6deg * var(--r))) rotateY(calc(${yaw}deg * var(--r))) rotateX(calc(8deg * var(--r))) ` +
              `scale(${front ? "1" : "calc(0.75 + 0.25 * var(--r))"})`,
            zIndex: 100 + o * 10,
            opacity: hidden ? 0 : front ? 1 : `calc(var(--r) * ${far.toFixed(3)})`,
            visibility: o < -4 || o > 2.8 || far <= 0 ? "hidden" : "visible",
            "--glint": (yaw * 3 + x * 40).toFixed(1) + "deg",
          } as CSSProperties;
          return (
            <div key={k} className="disc" style={style} data-disc={k} data-front={front ? "" : undefined}>
              <div
                className="disc-tilt"
                style={{ transform: front ? "translateZ(var(--lift)) rotateX(calc(var(--py) * -12deg)) rotateY(calc(var(--px) * 12deg))" : "none" }}
              >
                <div className="disc-shadow" />
                <div className="disc-edge disc-hole" style={{ transform: "translateZ(-4px)" }} />
                <div className="disc-face disc-hole">
                  <div className="disc-burnspin">
                    <div className="disc-roll" style={{ transform: `rotate(${o * 110}deg)` }}>
                      <div className="disc-spin" style={{ animationPlayState: front ? "running" : "paused" }}>
                        <ImageSlot src={p.disc} shape="circle" placeholder={`${p.title} screenshot`} alt="" />
                      </div>
                    </div>
                    <div className="disc-blank" />
                  </div>
                  <div className="disc-hub" />
                  <div className="disc-sheen" />
                </div>
                {front && (
                  <button className="disc-open" aria-label={`Open ${p.title}`} onClick={onOpen}>
                    Open
                  </button>
                )}
              </div>
              {!front && <button className="disc-hit" aria-label={`Show ${p.title}`} onClick={() => onGo(active + o)} />}
            </div>
          );
        })}
        <div className="burn-hubglow" data-burn="hubglow" aria-hidden />
        <div className="burn-laser" data-burn="laser" aria-hidden />
        <div className="burn-shimmer disc-hole" data-burn="shimmer" aria-hidden />
        <div className="burn-label" data-burn="label" aria-hidden>
          Burned
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: CaseStudy (moved out of Portfolio, now a fixed overlay)**

Create `components/CaseStudy.tsx`. The JSX for the intro, bar, video, hero, lenses and next-project button is moved **verbatim** from the current `components/Portfolio.tsx` lines 312–464 (`{caseOpen && ( <div ref={caseRef} className="case" …` to its closing `</div>`); only the variable names below change.

```tsx
"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import ImageSlot from "./ImageSlot";
import { CaseBlock } from "./CaseBlocks";
import { lenses, projects } from "@/content/portfolio";

export type Intro = { size: string; dx: string; dy: string };

const N = projects.length;
const wrap = (i: number) => ((i % N) + N) % N;
const pad = (n: number) => String(n).padStart(2, "0");

type Props = { active: number; closing: boolean; intro: Intro; onClose: () => void; onNext: () => void };

export default function CaseStudy({ active, closing, intro, onClose, onNext }: Props) {
  const [lens, setLens] = useState(0);
  const caseRef = useRef<HTMLDivElement>(null);

  // The page behind must not scroll while the case study is open.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const next = () => {
    onNext();
    setLens(0);
    if (caseRef.current) caseRef.current.scrollTop = 0;
  };

  const scrollToLens = (i: number) => {
    const c = caseRef.current;
    const el = c?.querySelector(`[data-lens="${i}"]`);
    if (c && el) c.scrollTo({ top: el.getBoundingClientRect().top - c.getBoundingClientRect().top + c.scrollTop - 96, behavior: "smooth" });
  };

  const onCaseScroll = () => {
    const c = caseRef.current;
    if (!c) return;
    const mid = c.getBoundingClientRect().top + c.clientHeight * 0.35;
    let cur = 0;
    c.querySelectorAll("[data-lens]").forEach((el, i) => {
      if (el.getBoundingClientRect().top < mid) cur = i;
    });
    if (c.scrollTop + c.clientHeight >= c.scrollHeight - 4) cur = lenses.length - 1;
    setLens(cur);
  };

  const cur = projects[wrap(active)];
  const curNum = pad(wrap(active) + 1);
  const total = pad(N);

  return (
    <div ref={caseRef} className="case" data-screen-label="Case study" onScroll={onCaseScroll}>
      {/* … moved JSX from Portfolio.tsx lines 314–463, unchanged except:
            closeCase → onClose, nextCase → next, DiscFace → <ImageSlot src={cur.disc} shape="circle" alt="" />,
            projects[wrap(active + 1)].title stays as is … */}
    </div>
  );
}
```

When moving the JSX, apply exactly these replacements: `onClick={closeCase}` → `onClick={onClose}`; both `onClick={nextCase}` → `onClick={next}`; `<DiscFace src={cur.disc} />` → `<ImageSlot src={cur.disc} shape="circle" alt="" />`. Keep the `style={{ "--size": intro.size, … } as CSSProperties}` line.

- [ ] **Step 6: Stubs for the parts built in Tasks 3–5**

Create `components/hero/Hero.tsx` (stub):

```tsx
"use client";

import { hero } from "@/content/site";
import type { InkStore } from "@/lib/ink";

export type HeroProps = { ink: InkStore; reduced: boolean; onShip: () => void; onHello: () => void };

export default function Hero({ onShip, onHello }: HeroProps) {
  return (
    <main className="hero" data-hero>
      <div className="hero-content">
        <div className="hero-copy">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1 className="hero-title">
            <span className="hero-line">Spot it<span className="hero-dot">.</span></span>
            <span className="hero-line">Shape it<span className="hero-dot">.</span></span>
            <span className="hero-line"><span data-ship-word>Ship it</span><span className="hero-dot">.</span></span>
          </h1>
          <p className="hero-sub">{hero.sub}</p>
          <div className="cta-row">
            <button className="btn-primary" onClick={onShip}><span>{hero.primary}</span><span>→</span></button>
            <button className="btn-link" onClick={onHello}>{hero.secondary}</button>
          </div>
        </div>
      </div>
    </main>
  );
}
```

Create `components/delivery/Delivery.tsx` (stub):

```tsx
"use client";

import { useEffect, type RefObject } from "react";
import type { InkStore } from "@/lib/ink";
import { settledScroll } from "@/lib/motion-math";
import { viewportH } from "@/lib/viewport";

export type DeliveryApi = { launch: () => void; cancel: () => void };

type Props = { ink: InkStore; reduced: boolean; apiRef: RefObject<DeliveryApi | null>; active: number; caseHidden: boolean };

export default function Delivery({ apiRef }: Props) {
  useEffect(() => {
    apiRef.current = {
      launch: () => window.scrollTo({ top: settledScroll(viewportH()), behavior: "smooth" }),
      cancel: () => {},
    };
  }, [apiRef]);
  return null;
}
```

Create `components/footer/Footer.tsx` (stub):

```tsx
"use client";

import type { RefObject } from "react";
import { footer, site } from "@/content/site";

export default function Footer({ footRef }: { footRef: RefObject<HTMLElement | null>; reduced: boolean }) {
  return (
    <section ref={footRef} className="foot" id="contact" aria-label="Contact">
      <div className="foot-main">
        <div className="foot-head">
          <div className="eyebrow">{footer.eyebrow}</div>
          <h2>{footer.headline}</h2>
        </div>
        <a href={`mailto:${site.email}`}>{site.email}</a>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Portfolio shell**

Replace `components/Portfolio.tsx` with:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Nav, { type NavTarget } from "./Nav";
import DiscStage from "./DiscStage";
import CaseStudy, { type Intro } from "./CaseStudy";
import Hero from "./hero/Hero";
import Delivery, { type DeliveryApi } from "./delivery/Delivery";
import Footer from "./footer/Footer";
import { projects } from "@/content/portfolio";
import { timings } from "@/content/site";
import { InkStore } from "@/lib/ink";
import { FLIGHT_VH, settledScroll } from "@/lib/motion-math";
import { viewportH } from "@/lib/viewport";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const N = projects.length;
const wrap = (i: number) => ((i % N) + N) % N;
const pad = (n: number) => String(n).padStart(2, "0");

export default function Portfolio() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [caseOpen, setCaseOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [intro, setIntro] = useState<Intro>({ size: "300px", dx: "0px", dy: "0px" });
  const [section, setSection] = useState<"projects" | "contact" | null>(null);
  const [ink] = useState(() => new InkStore(timings.inkFadeMs, timings.inkCapPx));

  const stageRef = useRef<HTMLDivElement>(null);
  const footRef = useRef<HTMLElement>(null);
  const deliveryApi = useRef<DeliveryApi | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const live = useRef({ caseOpen, closing });
  useEffect(() => {
    live.current = { caseOpen, closing };
  }, [caseOpen, closing]);

  const closeCase = useCallback(() => {
    if (live.current.closing) return;
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setCaseOpen(false);
      setClosing(false);
    }, 1000);
  }, []);

  const openCase = () => {
    const anchor = stageRef.current?.querySelector("[data-land-center]");
    let next: Intro = { size: "300px", dx: "0px", dy: "0px" };
    if (anchor) {
      const r = anchor.getBoundingClientRect();
      next = { size: r.width + "px", dx: r.left + r.width / 2 - window.innerWidth / 2 + "px", dy: r.top + r.height / 2 - window.innerHeight / 2 + "px" };
    }
    setIntro(next);
    setCaseOpen(true);
  };

  // Escape closes a case study; left/right step the carousel while it's on screen and settled.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (live.current.caseOpen) {
        if (e.key === "Escape") closeCase();
        return;
      }
      const st = stageRef.current;
      if (!st || st.hasAttribute("data-moving")) return;
      const r = st.getBoundingClientRect();
      if (r.top > window.innerHeight * 0.6 || r.bottom < window.innerHeight * 0.4) return;
      if (e.key === "ArrowRight") setActive((a) => a + 1);
      if (e.key === "ArrowLeft") setActive((a) => a - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(closeTimer.current);
    };
  }, [closeCase]);

  // Which section the nav highlights.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const H = viewportH(), S = window.scrollY, ft = footRef.current?.offsetTop ?? Infinity;
      const next = S >= ft - H * 0.5 ? "contact" : S >= FLIGHT_VH * H ? "projects" : null;
      setSection((cur) => (cur === next ? cur : next));
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  const go = (t: NavTarget) => {
    const behavior: ScrollBehavior = reduced ? "auto" : "smooth";
    deliveryApi.current?.cancel();
    if (t === "top") window.scrollTo({ top: 0, behavior });
    if (t === "projects") window.scrollTo({ top: settledScroll(viewportH()), behavior });
    if (t === "contact") window.scrollTo({ top: footRef.current?.offsetTop ?? 0, behavior });
  };

  const cur = projects[wrap(active)];

  return (
    <div className="page" data-page>
      <Nav current={section} onGo={go} />
      <div className="hero-runway">
        <Hero ink={ink} reduced={reduced} onShip={() => deliveryApi.current?.launch()} onHello={() => go("contact")} />
      </div>
      <section className="land-runway" id="projects" aria-label="Projects">
        <div className="land-panel" data-land-panel>
          <div className="land-head" data-reveal>
            <div className="eyebrow">Shipped</div>
            <h2>Projects</h2>
          </div>
          <DiscStage active={active} hidden={caseOpen && !closing} onGo={setActive} onOpen={openCase} stageRef={stageRef} />
          <div className="land-foot" data-reveal>
            <div className="land-title">
              <div className="counter">
                <b>{pad(wrap(active) + 1)}</b> / {pad(N)}
              </div>
              <div className="land-name">{cur.title}</div>
            </div>
            <div className="pager">
              <button className="pager-arrow" aria-label="Previous project" onClick={() => setActive((a) => a - 1)}>←</button>
              <button className="btn-glass" onClick={openCase}>
                <span>View case study</span>
                <span>→</span>
              </button>
              <button className="pager-arrow" aria-label="Next project" onClick={() => setActive((a) => a + 1)}>→</button>
            </div>
          </div>
        </div>
      </section>
      <Footer footRef={footRef} reduced={reduced} />
      <Delivery ink={ink} reduced={reduced} apiRef={deliveryApi} active={active} caseHidden={caseOpen && !closing} />
      {caseOpen && <CaseStudy active={active} closing={closing} intro={intro} onClose={closeCase} onNext={() => setActive((a) => a + 1)} />}
    </div>
  );
}
```

- [ ] **Step 8: Layout, CSS and assets**

In `app/layout.tsx`: replace the `Dancing_Script` import and font with `Permanent_Marker` (`variable: "--font-marker"`, `weight: ["400"]`), add `${marker.variable}` to the `<html>` class list, import the stylesheets after `./globals.css`:

```ts
import "./styles/shell.css";
import "./styles/hero.css";
import "./styles/delivery.css";
import "./styles/footer.css";
```

and set `metadata.title` to `"Debashish — Spot it. Shape it. Ship it."`. Create empty `app/styles/hero.css`, `app/styles/delivery.css`, `app/styles/footer.css` (filled by Tasks 3–5).

Create `app/styles/shell.css`:

```css
.page {
  font-family: var(--sans);
  background: var(--bg);
  overflow-x: clip;
}

/* fixed nav with a soft fade so content scrolls under it */
.nav-bar {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 10;
  background: linear-gradient(var(--bg) 35%, transparent);
  pointer-events: none;
}
.nav-bar .nav {
  pointer-events: auto;
  padding: 24px clamp(20px, 5vw, 64px);
}
.nav-links {
  gap: clamp(14px, 3vw, 36px);
}
.nav-cv {
  display: flex;
  align-items: center;
  height: 38px;
  padding: 0 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  font-size: 13px;
  white-space: nowrap;
  transition: border-color 0.2s, background 0.2s;
}
.nav-cv:hover {
  color: var(--fg);
  border-color: var(--accent);
  background: rgba(255, 255, 255, 0.04);
}
.nav-cv-short {
  display: none;
}
@media (max-width: 559px) {
  .nav-cv-long {
    display: none;
  }
  .nav-cv-short {
    display: inline;
  }
}

/* temporary layout for the stubs; Tasks 3–5 replace these sections */
.hero-runway {
  position: relative;
  height: calc(max(100vh, 560px) * 1.6);
}
.hero {
  position: sticky;
  top: 0;
  height: max(100vh, 560px);
  padding-top: 86px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
}
.land-runway {
  position: relative;
  height: calc(max(100vh, 560px) * 2.2);
}
.land-panel {
  position: sticky;
  top: 0;
  height: max(100vh, 560px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 96px clamp(20px, 5vw, 64px) 32px;
}
.land-head,
.land-foot {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  position: relative;
  z-index: 3;
}
.land-head {
  gap: 10px;
}
.land-head h2 {
  margin: 0;
  font-weight: 300;
  font-size: clamp(30px, 3.4vw, 46px);
  line-height: 1.1;
  letter-spacing: -0.03em;
}
.land-foot {
  gap: 18px;
}
.land-title {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.land-name {
  font-size: 22px;
  letter-spacing: -0.02em;
}
.stage {
  --r: 1;
}
.pager {
  display: flex;
  align-items: center;
  gap: 14px;
}
.pager .pager-arrow {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 1px solid oklch(0.32 0.015 290);
  background: transparent;
  color: oklch(0.9 0.006 290);
  font-size: 16px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.pager .pager-arrow:hover {
  border-color: var(--accent);
}
```

Clean `app/globals.css` with this script (removes top-level rules for the old screens, mascot and bubbles; keeps `.eyebrow`, `.cta-row`, `.btn-primary`, `.btn-link`, `.counter`, discs and case study):

```bash
python3 - <<'EOF'
import re
p = "app/globals.css"
s = open(p).read()
drop_prefixes = (".root", ".screen", ".about", ".character", ".mascot", ".bubble", ".contact",
                 ".footer", ".projects", ".pager", "@keyframes write", "@keyframes floaty", "@keyframes wave")
drop_media_markers = (".root:has", ".about", ".mascot")
out, i = [], 0
while i < len(s):
    j = s.find("{", i)
    if j == -1:
        out.append(s[i:]); break
    head = s[i:j]
    depth, k = 1, j + 1
    while depth:
        depth += {"{": 1, "}": -1}.get(s[k], 0); k += 1
    block = s[i:k]
    sel = head.strip().split("*/")[-1].strip()
    if sel.startswith(drop_prefixes) or (sel.startswith("@media") and any(m in block for m in drop_media_markers)):
        comments = re.findall(r"/\*.*?\*/", head, re.S)
        out.append("".join("\n" + c + "\n" for c in comments if "----------" in c and not any(w in c for w in ("about", "mascot", "speech bubble", "contact"))))
    else:
        out.append(block)
    i = k
s = "".join(out)
s = s.replace("  --bubble: oklch(0.6 0.22 295);\n", "").replace("  --script: var(--font-script), cursive;\n", "")
s = s.replace(".case {\n  position: absolute;", ".case {\n  position: fixed;\n  z-index: 50;", 1).replace("  z-index: 20;\n  overflow-y: auto;", "  overflow-y: auto;", 1)
open(p, "w").write(s)
EOF
```

Remove the mascot system and the old package:

```bash
rm -f components/Mascot.tsx content/mascot.ts scripts/process-mascot-clips.sh docs/mascot-production.md
rm -rf public/mascot
npm uninstall motion
```

Create a placeholder CV (the owner replaces it):

```bash
python3 - <<'EOF'
body = b"BT /F1 24 Tf 72 720 Td (CV coming soon) Tj ET"
objs = [b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        b"<< /Length %d >>\nstream\n" % len(body) + body + b"\nendstream",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
pdf, offs = b"%PDF-1.4\n", []
for n, o in enumerate(objs, 1):
    offs.append(len(pdf)); pdf += b"%d 0 obj\n" % n + o + b"\nendobj\n"
x = len(pdf)
pdf += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
pdf += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF\n" % (len(objs) + 1, x)
open("public/Debashish-CV.pdf", "wb").write(pdf)
EOF
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all pass; `grep -rn "Mascot\|content/mascot\|motion/react" components app content` returns nothing.

Browser check (Playwright, `npm run dev -- -p 3100`, 1440×900 then 390×844):
1. Nav is fixed; "Projects" scrolls to the carousel; "Contact" to the footer; the CV link downloads a PDF (HTTP 200 on `/Debashish-CV.pdf`).
2. Carousel shows seven discs settled (art on AirLyrics, LED, ADO); arrows and buttons step it; clicking "View case study" opens the overlay with the lift-off.
3. **Review focus 3:** note `window.scrollY` before opening, open a case study, check `document.documentElement.style.overflow === "hidden"`, close it, wait 1.2s: `scrollY` is unchanged and `overflow` is back to `""`.
4. No console errors.

---

### Task 3: Hero "live verbs"

**Files:**
- Rewrite: `components/hero/Hero.tsx`
- Fill: `app/styles/hero.css`
- Modify: `app/styles/shell.css` (delete the temporary `.hero-runway` and `.hero` rules, now in `hero.css`)

**Interfaces:**
- Consumes: `HeroProps` (Task 2), `InkStore` (Task 1), `doodles`, `hero`, `timings` (Task 2), icons (Task 2).
- Produces DOM hooks used by Task 4: `[data-hero]` on the hero, `[data-ship-word]` on the "Ship it" word, `[data-cue]` on the scroll cue, `[data-doodle]` doodles.

- [ ] **Step 1: Write the component**

Replace `components/hero/Hero.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { doodles, hero, timings } from "@/content/site";
import type { InkStore } from "@/lib/ink";
import { Doodle, PencilIcon, PlaneIcon, TorchIcon } from "../icons";

export type HeroProps = { ink: InkStore; reduced: boolean; onShip: () => void; onHello: () => void };
type Mode = "torch" | "pencil" | "plane" | null;

const JITTER = [-2.5, 3, -1.5, 2.5, -3, 0, 2, -2];
const SHAPE = "Shape it".split("");

export default function Hero({ ink, reduced, onShip, onHello }: HeroProps) {
  const [mode, setModeState] = useState<Mode>(null);
  const [note, setNote] = useState(-1);
  const [shapeOn, setShapeOn] = useState(false);

  const heroRef = useRef<HTMLElement>(null);
  const spotRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const shipRef = useRef<HTMLSpanElement>(null);
  const streakRef = useRef<HTMLSpanElement>(null);
  const m = useRef({
    mode: null as Mode, roaming: false, shipping: false, planeOut: false, drawTouch: false, lastPt: "mouse",
    inkRaf: 0, roamRaf: 0, timers: [] as ReturnType<typeof setTimeout>[],
  });

  const base = reduced ? timings.reducedDoodleOpacity : timings.doodleOpacity;

  const clearLight = useCallback(() => {
    const h = heroRef.current;
    if (spotRef.current) spotRef.current.style.opacity = "0";
    h?.querySelectorAll<HTMLElement>("[data-doodle]").forEach((el) => {
      el.style.opacity = el.dataset.found ? `calc(var(--db) + 0.14)` : "var(--db)";
      const w = el.firstElementChild as HTMLElement | null;
      if (w) delete w.dataset.on;
    });
  }, []);

  const setMode = useCallback((next: Mode) => {
    if (m.current.mode !== next) {
      m.current.mode = next;
      setModeState(next);
    }
    if (next !== "torch" && !m.current.roaming) clearLight();
    if (!next && cursorRef.current) cursorRef.current.style.opacity = "0";
    ink.breakStroke();
  }, [clearLight, ink]);

  const moveCursor = (cx: number, cy: number) => {
    const h = heroRef.current?.getBoundingClientRect(), c = cursorRef.current;
    if (!h || !c) return;
    c.style.transform = `translate(${cx - h.left}px,${cy - h.top}px)`;
    c.style.opacity = "1";
  };

  const light = (cx: number, cy: number, R: number) => {
    heroRef.current?.querySelectorAll<HTMLElement>("[data-doodle]").forEach((el) => {
      const r = el.getBoundingClientRect();
      const d = Math.hypot(cx - (r.left + r.width / 2), cy - (r.top + r.height / 2));
      const lit = Math.max(0, Math.min(1, 1 - (d - r.width * 0.3) / R));
      if (lit > 0.35 && !el.dataset.found) {
        el.dataset.found = "1";
        el.style.pointerEvents = "auto";
      }
      const floor = el.dataset.found ? base + 0.14 : base;
      el.style.opacity = (floor + (0.92 - floor) * lit).toFixed(3);
      const w = el.firstElementChild as HTMLElement | null;
      if (!w) return;
      if (lit > 0.35) w.dataset.on = "1";
      else if (lit < 0.15) delete w.dataset.on;
    });
  };

  const placeSpot = (cx: number, cy: number) => {
    const h = heroRef.current?.getBoundingClientRect(), sp = spotRef.current;
    if (!h || !sp) return;
    const S = timings.spotlightPx;
    sp.style.transform = `translate(${cx - h.left - S / 2}px,${cy - h.top - S / 2}px)`;
    sp.style.opacity = "1";
    if (m.current.roaming) moveCursor(cx, cy);
    light(cx, cy, S / 2);
  };

  const roam = (ms: number) => {
    if (reduced || !heroRef.current) return;
    cancelAnimationFrame(m.current.roamRaf);
    m.current.roaming = true;
    setMode("torch");
    const t0 = performance.now();
    const step = (now: number) => {
      const el = heroRef.current;
      if (!el) {
        m.current.roaming = false;
        return;
      }
      const t = (now - t0) / ms;
      if (t >= 1) {
        m.current.roaming = false;
        setMode(null);
        return;
      }
      const h = el.getBoundingClientRect();
      placeSpot(h.left + h.width * (0.55 + 0.33 * Math.sin(t * Math.PI * 2.4)), h.top + h.height * (0.5 + 0.3 * Math.sin(t * Math.PI * 1.6 + 1)));
      const fade = String(Math.min(1, t * 6, (1 - t) * 6));
      if (spotRef.current) spotRef.current.style.opacity = fade;
      if (cursorRef.current) cursorRef.current.style.opacity = fade;
      m.current.roamRaf = requestAnimationFrame(step);
    };
    m.current.roamRaf = requestAnimationFrame(step);
  };

  const drawInk = useCallback(() => {
    m.current.inkRaf = 0;
    const cv = inkRef.current, el = heroRef.current;
    if (!cv || !el) return;
    const dpr = window.devicePixelRatio || 1, w = el.clientWidth, hh = el.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hh * dpr)) {
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(hh * dpr);
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, hh);
    const now = performance.now(), L = ink.points;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let k = 1; k < L.length; k++) {
      const p = L[k], q = L[k - 1];
      if (p.brk) continue;
      const al = ink.alpha(p, now);
      if (al <= 0) continue;
      ctx.strokeStyle = `rgba(242,240,247,${(0.85 * al).toFixed(3)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(q.x, q.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.strokeStyle = `rgba(242,240,247,${(0.32 * al).toFixed(3)})`;
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.moveTo(q.x + q.jx, q.y + q.jy);
      ctx.lineTo(p.x + p.jx, p.y + p.jy);
      ctx.stroke();
      if (k % 3 === 0) {
        ctx.fillStyle = `rgba(242,240,247,${(0.25 * al).toFixed(3)})`;
        ctx.fillRect(p.x - p.jy, p.y + p.jx, 0.8, 0.8);
      }
    }
    ink.prune(now);
    if (ink.isAlive(now)) m.current.inkRaf = requestAnimationFrame(drawInk);
    else {
      ink.clear();
      ctx.clearRect(0, 0, w, hh);
    }
  }, [ink]);

  const inkAt = (cx: number, cy: number) => {
    if (reduced) return;
    const h = heroRef.current?.getBoundingClientRect();
    if (!h) return;
    if (ink.add(cx - h.left, cy - h.top, performance.now()) && !m.current.inkRaf) m.current.inkRaf = requestAnimationFrame(drawInk);
  };

  const whoosh = () => {
    if (reduced || m.current.shipping) return;
    m.current.shipping = true;
    for (const [el, anim] of [[shipRef.current, "shipGo 1.15s cubic-bezier(.6,0,.3,1) both"], [streakRef.current, "streakGo 1.15s linear both"]] as const) {
      if (!el) continue;
      el.style.animation = "none";
      void el.offsetWidth;
      el.style.animation = anim;
    }
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        const pl = planeRef.current;
        if (!pl) return;
        pl.style.animation = "none";
        void pl.offsetWidth;
        pl.style.animation = "planeGo 1.15s cubic-bezier(.6,0,.3,1) both";
      }),
    );
    m.current.timers.push(
      setTimeout(() => {
        m.current.shipping = false;
        if (m.current.planeOut && m.current.mode === "plane") setMode(null);
      }, timings.shipWhooshMs + 100),
    );
  };

  // Touch devices: let the torch roam once so people discover the doodles.
  useEffect(() => {
    const timers = m.current.timers;
    if (window.matchMedia("(hover: none)").matches && !reduced) timers.push(setTimeout(() => roam(timings.roamTouchMs), 900));
    return () => {
      timers.forEach(clearTimeout);
      cancelAnimationFrame(m.current.roamRaf);
      cancelAnimationFrame(m.current.inkRaf);
    };
    // roam is recreated each render; running once on mount is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const isMouse = (e: PointerEvent) => e.pointerType === "mouse";
  const keyActivate = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  const spotEnter = (e: PointerEvent) => {
    if (!isMouse(e) || reduced) return;
    setShapeOn(false);
    setMode("torch");
    moveCursor(e.clientX, e.clientY);
    placeSpot(e.clientX, e.clientY);
  };
  const spotTap = () => {
    if (m.current.lastPt === "mouse" || reduced) return;
    roam(timings.roamTapMs);
  };
  const shapeEnter = (e: PointerEvent) => {
    if (!isMouse(e) || reduced) return;
    setMode("pencil");
    setShapeOn(true);
    moveCursor(e.clientX, e.clientY);
  };
  const shapeLeave = (e: PointerEvent) => {
    if (isMouse(e)) setShapeOn(false);
  };
  const shapeTap = () => {
    if (m.current.lastPt === "mouse" || reduced) return;
    setShapeOn(true);
    m.current.timers.push(setTimeout(() => setShapeOn(false), 1400));
  };
  const shipLineEnter = (e: PointerEvent) => {
    if (!isMouse(e)) return;
    m.current.planeOut = false;
    if (!reduced) {
      setMode("plane");
      moveCursor(e.clientX, e.clientY);
    }
    whoosh();
  };
  const shipLineLeave = (e: PointerEvent) => {
    if (!isMouse(e)) return;
    m.current.planeOut = true;
    if (!m.current.shipping && m.current.mode === "plane") setMode(null);
  };

  const onHeroMove = (e: PointerEvent) => {
    if (isMouse(e)) {
      const mo = m.current.mode;
      if (!mo || reduced) return;
      moveCursor(e.clientX, e.clientY);
      if (mo === "torch" && !m.current.roaming) placeSpot(e.clientX, e.clientY);
      if (mo === "pencil") inkAt(e.clientX, e.clientY);
    } else if (m.current.drawTouch) inkAt(e.clientX, e.clientY);
  };
  const onHeroLeave = (e: PointerEvent) => {
    if (!isMouse(e)) return;
    if (!m.current.roaming) setMode(null);
    setNote(-1);
  };
  const onHeroDown = (e: PointerEvent) => {
    m.current.lastPt = e.pointerType;
    const onDoodle = (e.target as HTMLElement).closest?.("[data-doodle]");
    if (!isMouse(e) && !onDoodle) setNote(-1);
  };
  const h1Down = (e: PointerEvent) => {
    m.current.lastPt = e.pointerType;
    if (isMouse(e) || reduced) return;
    m.current.drawTouch = true;
    ink.breakStroke();
    inkAt(e.clientX, e.clientY);
  };
  const h1Up = () => {
    m.current.drawTouch = false;
    ink.breakStroke();
  };

  const noteEnter = (k: number, e: PointerEvent) => {
    if (isMouse(e)) setNote(k);
  };
  const noteLeave = (k: number, e: PointerEvent) => {
    if (isMouse(e)) setNote((n) => (n === k ? -1 : n));
  };
  const noteTap = (k: number) => {
    if (m.current.lastPt !== "mouse") setNote((n) => (n === k ? -1 : k));
  };

  return (
    <main
      ref={heroRef}
      className="hero"
      data-hero
      data-mode={mode ?? undefined}
      onPointerMove={onHeroMove}
      onPointerLeave={onHeroLeave}
      onPointerDown={onHeroDown}
    >
      <div className="hero-doodles" aria-hidden style={{ "--db": base } as CSSProperties}>
        {doodles.map((d, k) => (
          <div
            key={k}
            className="hero-doodle"
            data-doodle={k}
            style={{ left: d.x, top: d.y, width: d.w, transform: `translate(-50%,-50%) rotate(${d.r})`, pointerEvents: reduced ? "auto" : "none" }}
            onPointerEnter={(e) => noteEnter(k, e)}
            onPointerLeave={(e) => noteLeave(k, e)}
            onClick={() => noteTap(k)}
          >
            <div className="hero-doodle-wob">
              <Doodle paths={d.paths} />
            </div>
          </div>
        ))}
      </div>
      <div ref={spotRef} className="hero-spot" aria-hidden style={{ width: timings.spotlightPx, height: timings.spotlightPx }} />
      <canvas ref={inkRef} className="hero-ink" aria-hidden />
      <div className="hero-notes">
        {doodles.map((d, k) => {
          if (note !== k) return null;
          const x = parseFloat(d.x), y = parseFloat(d.y), w = parseFloat(d.w), left = x > 50;
          const tx = left ? `calc(-100% - ${w / 2 + 10}px)` : `${w / 2 + 10}px`;
          const ty = y > 70 ? "-85%" : y < 25 ? "-20%" : "-50%";
          return (
            <div key={k} className="hero-note" role="status" style={{ left: d.x, top: d.y, transform: `translate(${tx},${ty})` }}>
              <div className="hero-note-card" style={{ transformOrigin: left ? "100% 50%" : "0% 50%" }}>
                <span className="hero-note-label">Noticed</span>
                <span className="hero-note-text">{d.note}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={cursorRef} className="hero-cursor" aria-hidden>
        {mode === "torch" && <div className="hero-cursor-torch"><TorchIcon /></div>}
        {mode === "pencil" && <div className="hero-cursor-pencil"><PencilIcon /></div>}
        {mode === "plane" && <div ref={planeRef} className="hero-cursor-plane"><PlaneIcon /></div>}
      </div>

      <div className="hero-content">
        <div className="hero-copy">
          <div className="eyebrow">{hero.eyebrow}</div>
          <h1 className="hero-title" aria-label="Spot it. Shape it. Ship it." onPointerDown={h1Down} onPointerUp={h1Up} onPointerCancel={h1Up}>
            <span className="hero-line">
              <span className="hero-verb" role="button" tabIndex={0} aria-label="Spot it: light up what I've noticed"
                onPointerEnter={spotEnter} onClick={spotTap} onKeyDown={keyActivate(() => roam(timings.roamTapMs))}>
                Spot it
              </span>
              <span className="hero-dot" aria-hidden>.</span>
            </span>
            <span className="hero-line">
              <span className="hero-verb hero-shape" data-on={shapeOn && !reduced ? "" : undefined} role="button" tabIndex={0}
                aria-label="Shape it: sketch mode" onPointerEnter={shapeEnter} onPointerLeave={shapeLeave} onClick={shapeTap}
                onKeyDown={keyActivate(() => {
                  setShapeOn(true);
                  m.current.timers.push(setTimeout(() => setShapeOn(false), 1400));
                })}>
                {SHAPE.map((ch, k) => {
                  const on = shapeOn && !reduced, t = k - (SHAPE.length - 1) / 2;
                  return (
                    <span key={k} className="hero-shape-ch" style={on ? { transform: `translateY(${(t * t * 0.01 - 0.06).toFixed(3)}em) rotate(${(t * 2.2 + JITTER[k]).toFixed(1)}deg)`, color: "transparent", WebkitTextStroke: "1.2px var(--fg)" } : undefined}>
                      {ch}
                    </span>
                  );
                })}
                <span className="hero-sketch" aria-hidden>
                  <span className="hero-guide" style={{ top: "24%" }} />
                  <span className="hero-guide" style={{ top: "46%", opacity: 0.7 }} />
                  <span className="hero-guide hero-guide-base" style={{ top: "80%" }} />
                  <span className="hero-box" />
                  <span className="hero-handle" style={{ left: 0, top: 0 }} />
                  <span className="hero-handle" style={{ right: 0, top: 0, transform: "translate(50%,-50%)" }} />
                  <span className="hero-handle" style={{ left: 0, bottom: 0, top: "auto", transform: "translate(-50%,50%)" }} />
                  <span className="hero-handle" style={{ right: 0, bottom: 0, top: "auto", transform: "translate(50%,50%)" }} />
                  <span className="hero-sketch-tag">sketch_v0.1</span>
                </span>
              </span>
              <span className="hero-dot" aria-hidden>.</span>
            </span>
            <span className="hero-line" onPointerEnter={shipLineEnter} onPointerLeave={shipLineLeave}>
              <span ref={shipRef} className="hero-verb hero-ship" data-ship-word role="button" tabIndex={0}
                aria-label="Ship it: see what I've shipped" onClick={onShip} onKeyDown={keyActivate(onShip)}>
                Ship it
                <span ref={streakRef} className="hero-streak" aria-hidden>
                  <span />
                  <span />
                  <span />
                </span>
              </span>
              <span className="hero-dot" aria-hidden>.</span>
            </span>
          </h1>
          <p className="hero-sub">{hero.sub}</p>
          <div className="cta-row" onPointerEnter={() => setMode(null)}>
            <button className="btn-primary" onClick={onShip}>
              <span>{hero.primary}</span>
              <span>→</span>
            </button>
            <button className="btn-link" onClick={onHello}>
              {hero.secondary}
            </button>
          </div>
        </div>
      </div>

      <div className="hero-cue" data-cue aria-hidden>
        <span>Scroll</span>
        <span className="hero-cue-line"><span /></span>
      </div>
    </main>
  );
}
```


- [ ] **Step 2: Styles**

Fill `app/styles/hero.css` (and delete `.hero-runway`/`.hero` from `shell.css`):

```css
.hero-runway { position: relative; height: calc(max(100vh, 560px) * 1.6); }
.hero { position: sticky; top: 0; height: max(100vh, 560px); padding-top: 86px; overflow: hidden; display: flex; flex-direction: column; width: 100%; }
.hero[data-mode], .hero[data-mode] .hero-verb { cursor: none; }

.hero-doodles { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.hero-doodle { position: absolute; aspect-ratio: 1 / 1; opacity: var(--db); color: var(--fg); transition: opacity 0.35s ease; }
.hero-doodle-wob { width: 100%; height: 100%; }
.hero-doodle-wob[data-on] { animation: wobble 1.1s ease-in-out infinite; }
@keyframes wobble { 0%, 100% { transform: rotate(0) scale(1); } 25% { transform: rotate(-5deg) scale(1.05); } 75% { transform: rotate(4deg) scale(1.05); } }

.hero-spot { position: absolute; left: 0; top: 0; z-index: 1; border-radius: 50%; pointer-events: none; opacity: 0; transition: opacity 0.35s ease;
  background: radial-gradient(circle closest-side, rgba(255, 255, 255, 0.12), rgba(255, 255, 255, 0.045) 55%, transparent 100%); }
.hero-ink { position: absolute; left: 0; top: 0; width: 100%; height: 100%; z-index: 4; pointer-events: none; }

.hero-notes { position: absolute; inset: 0; z-index: 8; pointer-events: none; }
.hero-note { position: absolute; width: max-content; max-width: min(250px, 46vw); }
.hero-note-card { background: oklch(0.16 0.01 290); border: 1px solid var(--accent); border-radius: 12px; padding: 12px 14px; box-shadow: 0 18px 40px -12px rgba(0, 0, 0, 0.75);
  display: flex; flex-direction: column; gap: 6px; transform: rotate(-2deg); animation: popIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) both; }
.hero-note-label { font-family: var(--mono); font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--accent); }
.hero-note-text { font-size: 14px; line-height: 1.45; color: var(--fg); text-wrap: pretty; }
@keyframes popIn { from { opacity: 0; transform: scale(0.6) rotate(-9deg); } to { opacity: 1; transform: scale(1) rotate(-2deg); } }

.hero-cursor { position: absolute; left: 0; top: 0; z-index: 9; pointer-events: none; opacity: 0; transition: opacity 0.2s ease; }
.hero-cursor-torch { position: absolute; left: -4px; top: -4px; width: 40px; height: 40px; }
.hero-cursor-pencil { position: absolute; left: -6px; top: -26px; width: 32px; height: 32px; }
.hero-cursor-plane { position: absolute; left: -15px; top: -15px; width: 30px; height: 30px; }

.hero-content { position: relative; z-index: 2; flex: 1; display: flex; align-items: center; max-width: 1280px; width: 100%; margin: 0 auto;
  padding: 16px clamp(20px, 5vw, 64px) 96px; pointer-events: none; }
.hero-copy { pointer-events: auto; display: flex; flex-direction: column; gap: clamp(20px, 3.4vh, 32px); animation: heroIn 0.9s cubic-bezier(0.2, 0.7, 0.2, 1) both; }
@keyframes heroIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: none; } }
.hero-title { touch-action: none; margin: 0; font-weight: 300; font-size: clamp(48px, min(9vw, 13vh), 140px); line-height: 1; letter-spacing: -0.03em;
  display: flex; flex-direction: column; align-items: flex-start; }
.hero-line { display: flex; align-items: baseline; }
.hero-dot { color: var(--accent); }
.hero-verb { cursor: default; border-radius: 8px; outline: none; }
.hero-verb:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; }
.hero-sub { margin: 0; max-width: 440px; font-size: 16px; line-height: 1.6; color: oklch(0.74 0.01 290); text-wrap: pretty; }
.hero-copy .cta-row { margin-top: 0; cursor: auto; }

.hero-shape { position: relative; display: inline-flex; }
.hero-shape-ch { display: inline-block; transform-origin: 50% 100%; transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.3s ease; }
.hero-sketch { position: absolute; inset: 0.04em -0.12em -0.04em -0.12em; pointer-events: none; opacity: 0; transform: scale(0.96);
  transition: opacity 0.25s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1); }
.hero-shape[data-on] .hero-sketch { opacity: 1; transform: none; }
.hero-guide { position: absolute; left: -0.35em; right: -0.35em; border-top: 1px dashed color-mix(in oklch, var(--accent) 55%, transparent); }
.hero-guide-base { border-top-style: solid; border-top-color: color-mix(in oklch, var(--accent) 70%, transparent); }
.hero-box { position: absolute; inset: 0; border: 1px solid var(--accent); }
.hero-handle { position: absolute; width: 8px; height: 8px; transform: translate(-50%, -50%); background: var(--bg); border: 1px solid var(--accent); }
.hero-sketch-tag { position: absolute; left: 0; top: -22px; font-family: var(--mono); font-size: 11px; letter-spacing: 0.08em; color: var(--accent); white-space: nowrap; }

.hero-ship { position: relative; display: inline-block; }
.hero-streak { position: absolute; right: 100%; top: 34%; width: 1.8em; height: 36%; opacity: 0; transform-origin: 100% 50%; pointer-events: none;
  display: flex; flex-direction: column; justify-content: space-between; }
.hero-streak span { height: 2px; background: linear-gradient(to right, transparent, var(--accent)); }
.hero-streak span:nth-child(1) { margin-left: 30%; }
.hero-streak span:nth-child(2) { background: linear-gradient(to right, transparent, oklch(0.96 0.006 290 / 0.7)); }
.hero-streak span:nth-child(3) { margin-left: 50%; }
@keyframes shipGo { 0% { transform: none; } 10% { transform: translateX(-0.05em); } 44% { transform: translateX(110vw) skewX(-16deg); filter: blur(2px); }
  44.01% { transform: translateX(-110vw) skewX(-16deg); filter: blur(2px); } 82% { transform: translateX(0.03em) skewX(2deg); filter: none; } 100% { transform: none; } }
@keyframes streakGo { 0%, 8% { opacity: 0; transform: scaleX(0.2); } 20% { opacity: 1; transform: scaleX(1); } 44% { opacity: 0.8; transform: scaleX(1.7); }
  60% { opacity: 0.8; transform: scaleX(1); } 82%, 100% { opacity: 0; transform: scaleX(0.2); } }
@keyframes planeGo { 0% { transform: none; } 10% { transform: translate(-6px, 4px) rotate(8deg); } 44% { transform: translate(110vw, -60px) rotate(-14deg); }
  44.01% { transform: translate(-110vw, -40px) rotate(-6deg); } 82% { transform: translate(4px, -2px); } 100% { transform: none; } }

.hero-cue { position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; }
.hero-cue > span:first-child { font-family: var(--mono); font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: oklch(0.6 0.01 290); }
.hero-cue-line { position: relative; width: 1px; height: 40px; background: oklch(0.28 0.01 290); overflow: hidden; }
.hero-cue-line span { position: absolute; left: 0; top: 0; width: 1px; height: 14px; background: var(--accent); animation: cueDrop 1.8s ease-in-out infinite; }
@keyframes cueDrop { 0% { transform: translateY(-12px); opacity: 0; } 25% { opacity: 1; } 100% { transform: translateY(40px); opacity: 0; } }
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test`. Expected: pass.

Browser (1440×900): hover "Spot it" → torch cursor, spotlight, doodles brighten and wobble; hover a found doodle → its exact note; hover "Shape it" → pencil, outlined letters, box, handles, "sketch_v0.1"; move → ink appears and fades about 6s later; draw a long scribble → older ink fades first; hover "Ship it" → plane cursor and whoosh, returns; Tab to each verb shows a focus ring; Enter on "Ship it" calls `onShip`. Phone (390×844, `hasTouch`): torch roams once after load; tap a doodle toggles its note; drawing only while pressing the headline. No console errors.

---

### Task 4: Special Delivery painter and burn styles

**Files:**
- Rewrite: `components/delivery/Delivery.tsx`
- Fill: `app/styles/delivery.css`
- Modify: `app/styles/shell.css` (delete temporary `.land-*`, `.land-runway`, `.land-panel` rules, now in `delivery.css`)

**Interfaces:**
- Consumes: `deliveryProgress`, `bezier`, `bezierAngle`, `burnRadius`, `spiralTo`, `launchLegs`, `settledScroll`, `FLIGHT_VH`, `clamp01`, `smoothstep` (Task 1); `viewportH`; DOM hooks from Tasks 2–3; `html[data-btt]` attribute (set by the footer in Task 5 while its back-to-top plane flies).
- Produces: `DeliveryApi.launch()` and `DeliveryApi.cancel()`.

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useEffect, useRef, type RefObject } from "react";
import { doodles, timings } from "@/content/site";
import type { InkStore } from "@/lib/ink";
import { bezier, bezierAngle, burnRadius, clamp01, deliveryProgress, FLIGHT_VH, launchLegs, settledScroll, smoothstep, spiralTo, type Pt } from "@/lib/motion-math";
import { viewportH } from "@/lib/viewport";
import { Doodle, PlaneIcon } from "../icons";

export type DeliveryApi = { launch: () => void; cancel: () => void };
type Props = { ink: InkStore; reduced: boolean; apiRef: RefObject<DeliveryApi | null>; active: number; caseHidden: boolean };

export default function Delivery({ ink, reduced, apiRef, active, caseHidden }: Props) {
  const planeRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const spiralRef = useRef<HTMLDivElement>(null);
  const live = useRef({ reduced, caseHidden });
  const repaint = useRef<() => void>(() => {});

  useEffect(() => {
    live.current = { reduced, caseHidden };
    repaint.current();
  }, [reduced, caseHidden, active]);

  useEffect(() => {
    let raf = 0, autoRaf = 0;
    let snap: { x: number; y: number; brk: boolean }[] | null = null;

    const paint = () => {
      raf = 0;
      const page = document.querySelector<HTMLElement>("[data-page]");
      if (!page) return;
      const H = viewportH(), W = window.innerWidth, VH = window.innerHeight, S = window.scrollY;
      const { reduced: red, caseHidden: hide } = live.current;
      const btt = document.documentElement.hasAttribute("data-btt");
      const { u, v, b, r } = deliveryProgress(S, H);

      const lc = page.querySelector<HTMLElement>("[data-land-center]");
      const ship = page.querySelector<HTMLElement>("[data-ship-word]");
      let Bf: Pt = { x: W / 2, y: H * 0.55 }, A0: Pt = { x: W * 0.3, y: H * 0.6 };
      if (lc) {
        const q = lc.getBoundingClientRect();
        Bf = { x: q.left + q.width / 2, y: q.top + q.height / 2 - Math.max(0, FLIGHT_VH * H - S) };
      }
      if (ship) {
        const q = ship.getBoundingClientRect();
        A0 = { x: q.right, y: q.top + q.height * 0.45 + Math.max(0, S - 0.6 * H) };
      }
      const P1 = { x: W * 0.9, y: A0.y - H * 0.22 }, P2 = { x: W * 0.1, y: Bf.y - H * 0.5 };
      const at = (t: number) => bezier(A0, P1, P2, Bf, t);

      // The visitor's pencil strokes ship too: capture them as the plane nears the disc.
      if (u < 0.5) snap = null;
      else if (!snap && u > 0.9) snap = ink.snapshot();

      const fly = planeRef.current;
      if (fly) {
        if (red || btt || u <= 0.002 || v >= 0.12) fly.style.opacity = "0";
        else {
          let p = at(u), ang = bezierAngle(A0, P1, P2, Bf, u), s = 1, op = clamp01(u * 40);
          if (v > 0) {
            const k = clamp01(v / 0.12);
            p = Bf;
            ang = bezierAngle(A0, P1, P2, Bf, 1) + k * 200;
            s = 1 - 0.92 * k;
            op = 1 - k;
          }
          fly.style.opacity = String(op);
          fly.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg) scale(${s.toFixed(3)})`;
        }
      }

      const cv = trailRef.current;
      const ctx = cv?.getContext("2d");
      if (cv && ctx) {
        const dpr = window.devicePixelRatio || 1, cw = Math.round(W * dpr), ch = Math.round(VH * dpr);
        if (cv.width !== cw || cv.height !== ch) {
          cv.width = cw;
          cv.height = ch;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, VH);
        if (timings.trail && !red && !btt && u > 0 && v < 0.15) {
          const am = 1 - clamp01(v / 0.15), Sc = Math.min(S, FLIGHT_VH * H);
          for (let k = 1; k <= 30; k++) {
            const uk = u - k * 0.012;
            if (uk <= 0) break;
            const p = at(uk), y = p.y - (Sc - uk * FLIGHT_VH * H), f = 1 - k / 30;
            ctx.fillStyle = `rgba(242,240,247,${(0.7 * f * am).toFixed(3)})`;
            ctx.beginPath();
            ctx.arc(p.x, y, 0.8 + 1.6 * f, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        if (!red && b > 0 && snap && snap.length > 1) {
          const s = smoothstep(clamp01((b - 0.04) / 0.6));
          if (s < 1) {
            const L = snap;
            const tf = (pt: { x: number; y: number }) => spiralTo({ x: pt.x, y: pt.y - 0.75 * H }, Bf, s);
            ctx.lineWidth = 1.3;
            ctx.lineCap = "round";
            ctx.strokeStyle = `rgba(242,240,247,${(0.8 * (1 - s) * clamp01(b * 10)).toFixed(3)})`;
            ctx.beginPath();
            for (let k = 1; k < L.length; k++) {
              if (L[k].brk) continue;
              const p0 = tf(L[k - 1]), p1 = tf(L[k]);
              ctx.moveTo(p0.x, p0.y);
              ctx.lineTo(p1.x, p1.y);
            }
            ctx.stroke();
          }
        }
      }

      spiralRef.current?.querySelectorAll<HTMLElement>("[data-sp]").forEach((el, k) => {
        const d = doodles[k];
        if (!d) return;
        const w = parseFloat(d.w);
        const src = { x: (parseFloat(d.x) / 100) * W, y: (parseFloat(d.y) / 100) * H - 0.75 * H };
        const s = smoothstep(clamp01((b - k * 0.05) / 0.55));
        if (red || b <= 0 || s >= 1) {
          el.style.opacity = "0";
          return;
        }
        const p = spiralTo(src, Bf, s);
        el.style.opacity = (0.85 * (1 - s * s)).toFixed(3);
        el.style.transform = `translate(${(p.x - w / 2).toFixed(1)}px,${(p.y - w / 2).toFixed(1)}px) rotate(${(parseFloat(d.r) + s * 540).toFixed(1)}deg) scale(${(1 - 0.85 * s).toFixed(3)})`;
      });

      const reveal = red ? 1 : r;
      const stage = page.querySelector<HTMLElement>("[data-stage]");
      if (stage) {
        stage.style.setProperty("--r", reveal.toFixed(4));
        stage.style.pointerEvents = reveal >= 1 ? "" : "none";
        if (reveal >= 1) stage.removeAttribute("data-moving");
        else stage.setAttribute("data-moving", "");
        stage.querySelectorAll<HTMLElement>("[data-disc]").forEach((el) => {
          if (!el.hasAttribute("data-front") || red) {
            el.style.removeProperty("--blank");
            el.style.removeProperty("--burn");
            el.style.removeProperty("--spin");
            return;
          }
          el.style.setProperty("--blank", b < 1 ? "1" : "0");
          el.style.setProperty("--burn", (v >= 0.72 ? 49.5 : burnRadius(b)).toFixed(2) + "%");
          el.style.setProperty("--spin", (900 * b * b + 140 * clamp01((v - 0.72) / 0.28)).toFixed(1) + "deg");
        });
        const Rad = burnRadius(b);
        const laser = stage.querySelector<HTMLElement>('[data-burn="laser"]');
        if (laser) {
          laser.style.opacity = !red && b > 0 && b < 1 && !hide ? "1" : "0";
          laser.style.left = laser.style.top = (50 - Rad).toFixed(2) + "%";
          laser.style.width = laser.style.height = (2 * Rad).toFixed(2) + "%";
        }
        const shm = stage.querySelector<HTMLElement>('[data-burn="shimmer"]');
        if (shm) {
          const t = clamp01((v - 0.72) / 0.1);
          shm.style.opacity = red ? "0" : Math.sin(t * Math.PI).toFixed(3);
          shm.style.transform = `translateZ(4px) rotate(${(t * 300).toFixed(1)}deg)`;
        }
        const glow = stage.querySelector<HTMLElement>('[data-burn="hubglow"]');
        if (glow) glow.style.opacity = red ? "0" : (0.9 * Math.sin(clamp01(v / 0.16) * Math.PI)).toFixed(3);
        const label = stage.querySelector<HTMLElement>('[data-burn="label"]');
        if (label) label.style.opacity = red ? "0" : Math.sin(clamp01((v - 0.72) / 0.16) * Math.PI).toFixed(3);
      }

      const panel = page.querySelector<HTMLElement>("[data-land-panel]");
      if (panel) {
        panel.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el) => {
          el.style.opacity = String(reveal);
          el.style.transform = `translateY(${((1 - reveal) * 14).toFixed(1)}px)`;
          el.style.pointerEvents = reveal > 0.5 ? "" : "none";
        });
        panel.style.opacity = red ? String(clamp01((S - 0.6 * H) / H)) : "";
      }
      const heroEl = page.querySelector<HTMLElement>("[data-hero]");
      if (heroEl) heroEl.style.opacity = red ? String(1 - clamp01(S / (0.8 * H))) : "";
      const cue = page.querySelector<HTMLElement>("[data-cue]");
      if (cue) cue.style.opacity = String(1 - clamp01(S / (0.15 * H)));
    };

    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    repaint.current = schedule;

    const stopAuto = () => {
      if (autoRaf) cancelAnimationFrame(autoRaf);
      autoRaf = 0;
      window.removeEventListener("wheel", stopAuto);
      window.removeEventListener("touchstart", stopAuto);
      window.removeEventListener("keydown", stopAuto);
    };

    const launch = () => {
      stopAuto();
      const H = viewportH(), max = document.documentElement.scrollHeight - window.innerHeight;
      if (live.current.reduced) {
        window.scrollTo(0, Math.min(max, settledScroll(H)));
        return;
      }
      const legs = launchLegs(window.scrollY, H, max, timings.flightMs, timings.burnMs);
      if (!legs.length) return;
      // Attach on the next frame so the key press that launched the delivery doesn't cancel it.
      requestAnimationFrame(() => {
        window.addEventListener("wheel", stopAuto, { passive: true });
        window.addEventListener("touchstart", stopAuto, { passive: true });
        window.addEventListener("keydown", stopAuto);
      });
      let i = 0, t0 = performance.now();
      const step = (now: number) => {
        const L = legs[i], t = Math.min(1, (now - t0) / L.durationMs);
        window.scrollTo(0, L.from + (L.to - L.from) * L.ease(t));
        if (t >= 1) {
          i++;
          t0 = now;
          if (i >= legs.length) {
            stopAuto();
            return;
          }
        }
        autoRaf = requestAnimationFrame(step);
      };
      autoRaf = requestAnimationFrame(step);
    };

    apiRef.current = { launch, cancel: stopAuto };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      stopAuto();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [apiRef, ink]);

  return (
    <>
      <canvas ref={trailRef} className="delivery-trail" aria-hidden />
      <div ref={spiralRef} className="delivery-spiral" aria-hidden>
        {doodles.map((d, k) => (
          <div key={k} data-sp className="delivery-sp" style={{ width: d.w }}>
            <Doodle paths={d.paths} />
          </div>
        ))}
      </div>
      <div ref={planeRef} className="delivery-plane" aria-hidden>
        <PlaneIcon />
      </div>
    </>
  );
}
```


- [ ] **Step 2: Styles**

Fill `app/styles/delivery.css` (and delete the temporary `.land-*`, `.land-runway`, `.land-panel` rules from `shell.css`, moving them here unchanged):

```css
/* (moved from shell.css) .land-runway, .land-panel, .land-head, .land-foot, .land-title, .land-name */

.delivery-trail { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 4; pointer-events: none; }
.delivery-spiral { position: fixed; inset: 0; z-index: 4; pointer-events: none; overflow: hidden; }
.delivery-sp { position: absolute; left: 0; top: 0; aspect-ratio: 1 / 1; opacity: 0; color: var(--fg); }
.delivery-plane { position: fixed; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; z-index: 4; pointer-events: none; opacity: 0; }

.stage[data-moving] .disc { transition: none; }
.stage[data-moving] .disc-open { opacity: 0; pointer-events: none; }

.disc-burnspin { position: absolute; inset: 0; transform: rotate(var(--spin, 0deg)); }
.disc-blank { position: absolute; inset: 0; pointer-events: none; opacity: var(--blank, 0);
  background: repeating-radial-gradient(circle, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 3px),
    conic-gradient(from 0deg, #c9cdd3, #f4f5f7 12%, #9ea4ac 25%, #e8eaee 37%, #b5bac2 50%, #f6f7f9 62%, #a2a8b0 75%, #e3e5e9 87%, #c9cdd3);
  -webkit-mask: radial-gradient(circle closest-side, transparent var(--burn, 0%), #000 calc(var(--burn, 0%) + 0.6%));
  mask: radial-gradient(circle closest-side, transparent var(--burn, 0%), #000 calc(var(--burn, 0%) + 0.6%)); }

.burn-hubglow { position: absolute; left: 36%; top: 36%; width: 28%; height: 28%; border-radius: 50%; pointer-events: none; opacity: 0; transform: translateZ(3px);
  background: radial-gradient(circle closest-side, var(--accent), transparent 75%); z-index: 200; }
.burn-laser { position: absolute; left: 32.5%; top: 32.5%; width: 35%; height: 35%; border-radius: 50%; pointer-events: none; opacity: 0; transform: translateZ(3px);
  border: 1.5px solid var(--accent); box-shadow: 0 0 14px var(--accent), 0 0 4px rgba(255, 255, 255, 0.9), inset 0 0 10px var(--accent); z-index: 200; }
.burn-shimmer { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; opacity: 0; mix-blend-mode: screen; z-index: 200;
  background: conic-gradient(from 0deg, transparent 0deg, rgba(255, 255, 255, 0.85) 20deg, transparent 50deg, transparent 180deg, rgba(200, 180, 255, 0.6) 200deg, transparent 230deg); }
.burn-label { position: absolute; left: 50%; top: calc(100% + 18px); transform: translateX(-50%); opacity: 0; pointer-events: none; font-family: var(--mono); font-size: 11px;
  letter-spacing: 0.2em; text-transform: uppercase; color: var(--accent); white-space: nowrap; }
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`. Expected: pass.

Browser (1440×900), scroll in steps of 0.2 viewport from 0 to 3.2 viewports, screenshot each, and check:
1. The plane leaves just after "Ship it", follows the curve with a dotted trail, and lands in the hub; the front disc is blank silver while the plane lands.
2. The laser ring grows from hub to rim, revealing the project art behind it; doodles spiral into the hub; "Burned" flashes; the other discs fan out and the heading/controls fade up.
3. Scrolling back up plays it in reverse; the carousel restacks behind a blank disc.
4. Clicking "Ship it" from the top auto-scrolls through the whole sequence (about 4.2s) and stops at the settled carousel.
5. **Review focus 1:** click "Ship it", wait 600ms, dispatch a wheel event (`page.mouse.wheel(0, 200)`), record `scrollY`, wait 500ms: `scrollY` changes only by the wheel, not by the auto-scroll.
6. **Review focus 2:** at mid-burn, resize to 1024×700 and back; the plane, laser and discs repaint in the right places (no stuck elements).
7. Draw ink in the hero, then click "Ship it": the strokes spiral into the disc during the burn.

---

### Task 5: Footer "Your idea's next"

**Files:**
- Create: `lib/fly.ts`
- Rewrite: `components/footer/Footer.tsx`
- Create: `components/footer/DiscLabel.tsx`
- Fill: `app/styles/footer.css`

**Interfaces:**
- Consumes: `splitLabel`, `lineRoom`, `labelFontSize` (Task 1), `mailtoHref` (Task 1), `bezier`, `bezierAngle`, `easeInOutQuad`, `easeInOutCubic`, `type Pt` (Task 1), `site`, `footer`, `timings` (Task 2), `PlaneIcon`, `PenIcon` (Task 2).
- Produces: `flyAlong(options): () => void` (cancel function); sets `html[data-btt]` during the back-to-top flight (read by Task 4).

- [ ] **Step 1: The flight utility**

Create `lib/fly.ts`:

```ts
// Flies an element along a cubic Bézier in viewport coordinates, with an optional dotted trail on a canvas.
import { bezier, bezierAngle, easeInOutQuad, type Pt } from "./motion-math";

export type FlyOptions = {
  el: HTMLElement;
  canvas: HTMLCanvasElement | null;
  from: Pt;
  c1: Pt;
  c2: Pt;
  to: Pt;
  durationMs: number;
  trail?: boolean;
  fadeEnd?: boolean;
  onDone?: () => void;
};

export function flyAlong(o: FlyOptions): () => void {
  const pts: Pt[] = [];
  const t0 = performance.now();
  const trail = o.trail ?? true;
  let raf = 0;
  const clear = () => {
    const ctx = o.canvas?.getContext("2d");
    if (o.canvas && ctx) ctx.clearRect(0, 0, o.canvas.width, o.canvas.height);
  };
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / o.durationMs), e = easeInOutQuad(t);
    const p = bezier(o.from, o.c1, o.c2, o.to, e);
    const ang = bezierAngle(o.from, o.c1, o.c2, o.to, e);
    o.el.style.opacity = String(Math.min(1, t * 8, o.fadeEnd ? (1 - t) * 6 : 1));
    o.el.style.transform = `translate(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px) rotate(${ang.toFixed(1)}deg)`;
    pts.push(p);
    if (pts.length > 44) pts.shift();
    const cv = o.canvas, ctx = cv?.getContext("2d");
    if (cv && ctx) {
      const dpr = window.devicePixelRatio || 1, W = window.innerWidth, H = window.innerHeight;
      if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      if (trail && t < 1)
        for (let k = pts.length - 3; k >= 0; k -= 2) {
          const f = k / pts.length;
          ctx.fillStyle = `rgba(242,240,247,${(0.7 * f * (o.fadeEnd ? Math.min(1, (1 - t) * 4) : 1)).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(pts[k].x, pts[k].y, 0.8 + 1.6 * f, 0, Math.PI * 2);
          ctx.fill();
        }
    }
    if (t < 1) raf = requestAnimationFrame(step);
    else {
      o.el.style.opacity = "0";
      clear();
      raf = 0;
      o.onDone?.();
    }
  };
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    o.el.style.opacity = "0";
    clear();
  };
}
```

- [ ] **Step 2: The disc label**

Create `components/footer/DiscLabel.tsx`:

```tsx
import { labelFontSize, lineRoom, splitLabel } from "@/lib/disc-label";

const PATHS: Record<string, string> = {
  top: "M36 70 Q100 40 164 70",
  bot: "M40 146 Q100 174 160 146",
  a: "M48 52 Q100 30 152 52",
  b: "M34 78 Q100 52 166 78",
  c: "M42 148 Q100 174 158 148",
};

/** The visitor's idea handwritten along the disc's curves. */
export default function DiscLabel({ text, placeholder, caret }: { text: string; placeholder: string; caret: boolean }) {
  const empty = !text;
  const lines = empty ? [placeholder] : splitLabel(text);
  const ids = lines.length === 3 ? ["a", "b", "c"] : ["top", "bot"];
  const room = lineRoom(lines.length);
  const fs = labelFontSize(lines);
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" className="foot-label" aria-hidden>
      <defs>
        {Object.entries(PATHS).map(([id, d]) => (
          <path key={id} id={`fd-${id}`} d={d} />
        ))}
      </defs>
      {lines.map((l, k) => {
        const fit = Math.max(l.length, 1) * fs * 0.62 > room[k] ? { textLength: room[k], lengthAdjust: "spacingAndGlyphs" as const } : {};
        return (
          <text key={k} textAnchor="middle" style={{ fontFamily: "var(--marker)", fontSize: fs, fill: empty ? "rgba(30,28,36,.38)" : "#1c1a22" }} {...fit}>
            <textPath href={`#fd-${ids[k]}`} startOffset="50%">
              {l}
              {caret && k === lines.length - 1 && <tspan className="foot-caret">|</tspan>}
            </textPath>
          </text>
        );
      })}
    </svg>
  );
}
```

- [ ] **Step 3: The footer**

Replace `components/footer/Footer.tsx`:

```tsx
"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { footer, site, timings } from "@/content/site";
import { flyAlong } from "@/lib/fly";
import { mailtoHref } from "@/lib/mail";
import { easeInOutCubic } from "@/lib/motion-math";
import { PenIcon, PlaneIcon } from "../icons";
import DiscLabel from "./DiscLabel";

type Props = { footRef: RefObject<HTMLElement | null>; reduced: boolean };

const NARROW = "(max-width: 559px)";
function useNarrow() {
  return useSyncExternalStore(
    (cb) => {
      const q = window.matchMedia(NARROW);
      q.addEventListener("change", cb);
      return () => q.removeEventListener("change", cb);
    },
    () => window.matchMedia(NARROW).matches,
    () => false,
  );
}

export default function Footer({ footRef, reduced }: Props) {
  const narrow = useNarrow();
  const [idea, setIdea] = useState("");
  const [focus, setFocus] = useState(false);
  const [sleeve, setSleeve] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const discRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bttRef = useRef<HTMLButtonElement>(null);
  const planeRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<HTMLCanvasElement>(null);
  const m = useRef({ busy: false, cancelFly: () => {}, scrollRaf: 0, timers: [] as ReturnType<typeof setTimeout>[] });

  useEffect(() => {
    const st = m.current;
    return () => {
      st.timers.forEach(clearTimeout);
      st.cancelFly();
      cancelAnimationFrame(st.scrollRaf);
      document.documentElement.removeAttribute("data-btt");
    };
  }, []);

  const openMail = (text: string) => {
    const a = document.createElement("a");
    a.href = mailtoHref(site.email, footer.subject, text);
    a.click();
  };

  const ship = () => {
    const text = idea.trim();
    if (!text || m.current.busy) return;
    if (reduced) {
      openMail(text);
      return;
    }
    m.current.busy = true;
    inputRef.current?.blur();
    setSleeve(true);
    m.current.timers.push(
      setTimeout(() => {
        const done = () => {
          openMail(text);
          m.current.busy = false;
          setSleeve(false);
          setSent(true);
          m.current.timers.push(setTimeout(() => setSent(false), 2600));
        };
        const d = discRef.current, el = planeRef.current;
        if (!d || !el) {
          done();
          return;
        }
        const r = d.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
        const from = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        m.current.cancelFly = flyAlong({ el, canvas: trailRef.current, from, c1: { x: from.x - W * 0.18, y: from.y - H * 0.3 }, c2: { x: W * 0.7, y: -H * 0.05 }, to: { x: W + 90, y: -90 },
          durationMs: 1200, trail: timings.trail, onDone: done });
      }, 720),
    );
  };

  const copyEmail = () => {
    const ok = () => {
      setCopied(true);
      m.current.timers.push(setTimeout(() => setCopied(false), 1800));
    };
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = site.email;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
      } catch {
        /* nothing else to try */
      }
      ta.remove();
      ok();
    };
    if (navigator.clipboard) navigator.clipboard.writeText(site.email).then(ok, fallback);
    else fallback();
  };

  const backToTop = () => {
    const b = bttRef.current, el = planeRef.current;
    if (reduced || !b || !el) {
      window.scrollTo(0, 0);
      return;
    }
    const br = b.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
    const from = { x: br.left + br.width / 2, y: br.top };
    const html = document.documentElement;
    html.setAttribute("data-btt", "");
    m.current.cancelFly();
    m.current.cancelFly = flyAlong({ el, canvas: trailRef.current, from, c1: { x: from.x - W * 0.25, y: from.y - H * 0.35 }, c2: { x: W * 0.2, y: H * 0.5 }, to: { x: W * 0.32, y: H * 0.3 },
      durationMs: timings.backToTopMs, trail: timings.trail, fadeEnd: true, onDone: () => html.removeAttribute("data-btt") });
    const s0 = window.scrollY, t0 = performance.now();
    const stop = () => {
      cancelAnimationFrame(m.current.scrollRaf);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
    };
    requestAnimationFrame(() => {
      window.addEventListener("wheel", stop, { passive: true });
      window.addEventListener("touchstart", stop, { passive: true });
    });
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / timings.backToTopMs);
      window.scrollTo(0, s0 * (1 - easeInOutCubic(t)));
      if (t < 1) m.current.scrollRaf = requestAnimationFrame(step);
      else stop();
    };
    m.current.scrollRaf = requestAnimationFrame(step);
  };

  const onFocus = () => {
    setFocus(true);
    if (narrow) m.current.timers.push(setTimeout(() => discRef.current?.scrollIntoView({ block: "center", behavior: "smooth" }), 320));
  };

  const hasIdea = !!idea.trim() && !sent;

  return (
    <section ref={footRef} className="foot" id="contact" aria-label="Contact">
      <div className="foot-main">
        <div className="foot-head">
          <div className="eyebrow">{footer.eyebrow}</div>
          <h2>{footer.headline}</h2>
        </div>
        <div className="foot-row">
          <div className="foot-disc-col">
            <div className="foot-disc-wrap" data-big={focus && narrow ? "" : undefined}>
              <div ref={discRef} className="foot-disc" data-tilt={sleeve ? "" : undefined}>
                <div className="disc-shadow" />
                <div className="disc-edge disc-hole" style={{ transform: "translateZ(-4px)" }} />
                <div className="disc-face disc-hole foot-disc-face">
                  <div className="foot-disc-silver" />
                  <div className="foot-disc-sheen" />
                  <div className="disc-hub foot-disc-hub" />
                </div>
                <div className="foot-disc-text">
                  <DiscLabel text={idea} placeholder={footer.placeholder} caret={focus} />
                </div>
              </div>
              {sleeve && (
                <div className="foot-sleeve" aria-hidden>
                  <div />
                  <div />
                  <div />
                </div>
              )}
              <button className="foot-disc-btn" aria-label="Write your idea on the disc" onClick={() => inputRef.current?.focus()} />
              <input
                ref={inputRef}
                className="foot-input"
                value={idea}
                maxLength={80}
                aria-label="Write your idea"
                placeholder={footer.placeholder}
                onChange={(e) => setIdea(e.target.value.slice(0, 80))}
                onFocus={onFocus}
                onBlur={() => setFocus(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    ship();
                  }
                }}
              />
              <div className="foot-pen" aria-hidden>
                <PenIcon />
              </div>
            </div>
            <div className="foot-action" aria-live="polite">
              {hasIdea && (
                <button className="btn-primary foot-ship" onClick={ship}>
                  <span>Ship it</span>
                  <span>→</span>
                </button>
              )}
              {!idea.trim() && !sent && <span className="foot-hint">{footer.hint}</span>}
              {sent && <span className="foot-sent">{footer.sent}</span>}
            </div>
          </div>
          <div className="foot-paths">
            <div className="foot-path">
              <span className="foot-path-label">{footer.hiring}</span>
              <a className="foot-cv" href={site.cvHref} download>
                Download CV ↓
              </a>
            </div>
            <div className="foot-path">
              <span className="foot-path-label">{footer.sayHi}</span>
              <div className="foot-email-row">
                <button className="foot-email" aria-label="Copy email address" onClick={copyEmail}>
                  {site.email}
                </button>
                {copied && <span className="foot-copied">Copied ✓</span>}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="foot-bar">
        <div className="foot-bar-left">
          <span>© 2026 {site.name}</span>
          <span>·</span>
          <a href={site.linkedin} target="_blank" rel="noopener">LinkedIn</a>
          <span>·</span>
          <a href={site.github} target="_blank" rel="noopener">GitHub</a>
          <span>·</span>
          <span className="foot-signoff">{site.signoff}</span>
        </div>
        <button ref={bttRef} className="foot-btt" onClick={backToTop}>
          Back to top ↑
        </button>
      </div>
      <canvas ref={trailRef} className="foot-trail" aria-hidden />
      <div ref={planeRef} className="foot-plane" aria-hidden>
        <PlaneIcon />
      </div>
    </section>
  );
}
```

Add `--marker: var(--font-marker), cursive;` to `:root` in `app/globals.css`.

- [ ] **Step 4: Styles**

Fill `app/styles/footer.css`:

```css
.foot { position: relative; min-height: max(100vh, 560px); display: flex; flex-direction: column; max-width: 1280px; margin: 0 auto;
  padding: clamp(120px, 20vh, 220px) clamp(20px, 5vw, 64px) 0; }
.foot-main { flex: 1; display: flex; flex-direction: column; gap: clamp(48px, 8vh, 80px); }
.foot-head { display: flex; flex-direction: column; gap: 20px; max-width: 780px; }
.foot-head h2 { margin: 0; font-weight: 300; font-size: clamp(40px, 6vw, 88px); line-height: 1.04; letter-spacing: -0.03em; text-wrap: balance; }
.foot-row { display: flex; flex-wrap: wrap; align-items: center; gap: clamp(48px, 7vw, 112px); }

.foot-disc-col { flex: 0 0 auto; display: flex; flex-direction: column; align-items: center; gap: 22px; }
.foot-disc-wrap { position: relative; width: clamp(240px, 32vw, 380px); aspect-ratio: 1 / 1; perspective: 900px; transition: width 0.4s ease; }
.foot-disc-wrap[data-big] { width: min(86vw, 380px); }
.foot-disc { position: absolute; inset: 0; transform-style: preserve-3d; transition: transform 0.7s cubic-bezier(0.3, 1.3, 0.5, 1); }
.foot-disc[data-tilt] { transform: rotateX(30deg) rotateZ(-10deg) scale(0.96); }
.foot-disc-face { box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35); }
.foot-disc-silver { position: absolute; inset: 0; animation: spin 40s linear infinite;
  background: repeating-radial-gradient(circle, rgba(0, 0, 0, 0.05) 0 1px, transparent 1px 3px),
    conic-gradient(from 0deg, #c9cdd3, #f4f5f7 12%, #9ea4ac 25%, #e8eaee 37%, #b5bac2 50%, #f6f7f9 62%, #a2a8b0 75%, #e3e5e9 87%, #c9cdd3); }
.foot-disc-sheen { position: absolute; inset: 0; border-radius: 50%; pointer-events: none; mix-blend-mode: screen; opacity: 0.7;
  background: conic-gradient(from 120deg, transparent 0deg, rgba(255, 255, 255, 0.5) 16deg, transparent 38deg, transparent 140deg, rgba(150, 215, 255, 0.38) 168deg,
    rgba(255, 170, 225, 0.38) 186deg, rgba(255, 236, 170, 0.3) 200deg, transparent 224deg); }
.foot-disc-hub { border-color: rgba(255, 255, 255, 0.95); box-shadow: inset 0 0 0 8px rgba(240, 242, 245, 0.55), inset 0 0 0 9px rgba(255, 255, 255, 0.9); }
.foot-disc-text { position: absolute; inset: 0; transform: translateZ(1px); pointer-events: none; }
.foot-label { position: absolute; inset: 0; overflow: visible; }
.foot-caret { fill: var(--accent-strong); animation: blink 1s steps(1) infinite; }
@keyframes blink { 0%, 49% { opacity: 1; } 50%, 100% { opacity: 0; } }

.foot-sleeve { position: absolute; inset: -5%; z-index: 3; pointer-events: none; animation: sleeveFold 0.8s cubic-bezier(0.5, 0, 0.3, 1) both; }
.foot-sleeve > div:nth-child(1) { position: absolute; inset: 0; border-radius: 6px; background: oklch(0.93 0.012 85); box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.6); }
.foot-sleeve > div:nth-child(2) { position: absolute; left: 30%; top: 30%; width: 40%; height: 40%; border-radius: 50%; border: 1px solid rgba(0, 0, 0, 0.18); }
.foot-sleeve > div:nth-child(3) { position: absolute; left: 8%; right: 8%; bottom: 10%; height: 1px; background: rgba(0, 0, 0, 0.15); }
@keyframes sleeveFold { 0% { transform: translateY(-120%) rotate(-4deg); opacity: 0; } 25% { opacity: 1; } 55% { transform: translateY(0) rotate(0); opacity: 1; }
  78% { transform: scale(0.5, 0.25) rotate(-12deg); opacity: 1; } 100% { transform: scale(0.12) rotate(-30deg); opacity: 0; } }

.foot-disc-btn { position: absolute; inset: 0; z-index: 2; border-radius: 50%; background: transparent; border: 0; padding: 0;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Cg transform='rotate(45 16 16)'%3E%3Crect x='12' y='4' width='8' height='20' rx='2' fill='%2307070a' stroke='%23f3f1f7' stroke-width='1.4'/%3E%3Crect x='12' y='1' width='8' height='6' rx='2' fill='%23a97cf8'/%3E%3Cpath d='M13 24 L19 24 L17.5 29 L14.5 29 Z' fill='%23f3f1f7'/%3E%3C/g%3E%3C/svg%3E") 7 25, text; }
.foot-disc-btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 6px; }
.foot-input { position: absolute; left: 50%; top: 60%; width: 2px; height: 2px; padding: 0; border: 0; opacity: 0; font-size: 16px; pointer-events: none; }
.foot-pen { position: absolute; right: -20%; bottom: -4%; width: 48%; transform: rotate(-28deg); pointer-events: none; color: oklch(0.86 0.006 290); }

.foot-action { min-height: 46px; display: flex; align-items: center; justify-content: center; }
.foot-ship { height: 46px; animation: fadeUp 0.35s ease both; }
.foot-hint, .foot-sent, .foot-path-label { font-family: var(--mono); font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: oklch(0.58 0.01 290); }
.foot-sent { color: var(--accent); animation: fadeUp 0.35s ease both; }

.foot-paths { flex: 1 1 300px; display: flex; flex-direction: column; gap: 44px; }
.foot-path { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
.foot-path-label { letter-spacing: 0.16em; color: oklch(0.62 0.01 290); }
.foot-cv { display: flex; align-items: center; height: 46px; padding: 0 22px; border-radius: 999px; border: 1px solid rgba(255, 255, 255, 0.18); font-size: 15px; transition: border-color 0.2s, background 0.2s; }
.foot-cv:hover { color: var(--fg); border-color: var(--accent); background: rgba(255, 255, 255, 0.04); }
.foot-email-row { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; }
.foot-email { border: 0; padding: 0 0 6px; font-weight: 300; font-size: clamp(26px, 3.2vw, 44px); letter-spacing: -0.02em; color: var(--fg); cursor: pointer;
  background: linear-gradient(var(--accent), var(--accent)) no-repeat 0 100% / 0% 1.5px; transition: background-size 0.45s cubic-bezier(0.2, 0.7, 0.2, 1); }
.foot-email:hover, .foot-email:focus-visible { background-size: 100% 1.5px; outline: none; }
.foot-copied { padding: 5px 10px; border-radius: 999px; border: 1px solid var(--accent); font-family: var(--mono); font-size: 11px; letter-spacing: 0.1em; color: var(--accent);
  animation: popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) both; }

.foot-bar { margin-top: clamp(64px, 10vh, 120px); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; padding: 22px 0 28px;
  border-top: 1px solid oklch(0.22 0.01 290); font-family: var(--mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: oklch(0.6 0.01 290); }
.foot-bar-left { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 14px; }
.foot-bar a { color: oklch(0.6 0.01 290); }
.foot-bar a:hover, .foot-btt:hover { color: var(--fg); }
.foot-signoff { text-transform: none; letter-spacing: 0.02em; }
.foot-btt { background: none; border: 0; padding: 6px 0; font: inherit; letter-spacing: inherit; text-transform: inherit; color: oklch(0.6 0.01 290); cursor: pointer; }

.foot-trail { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 4; pointer-events: none; }
.foot-plane { position: fixed; left: 0; top: 0; width: 46px; height: 46px; margin: -23px 0 0 -23px; z-index: 4; pointer-events: none; opacity: 0; }
```

(`popIn` and `fadeUp` keyframes already exist in `hero.css` and `globals.css`.)

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`. Expected: pass.

Browser (1440×900): scroll to the footer; click the disc (marker cursor), type "Splitting rent with flatmates is a mess": the text appears in marker along the disc's curves with a caret; "Ship it →" appears; press Enter: the disc tilts, the sleeve folds, the plane flies off top-right with its trail, then "Opening your mail app ✓". **Review focus 4:** intercept the anchor click (`page.evaluate` patching `HTMLAnchorElement.prototype.click` to record `this.href`) and confirm the href equals `mailtoHref(site.email, "An idea worth shipping", text)` for the input `Rent & bills — "fair" splits 🙂`, and that typing 100 characters keeps 80. Copy email shows "Copied ✓". Back to top: the plane flies up and the page eases to the top in about 2s; the delivery plane does not appear during it. Phone (390×844): focusing the input enlarges the disc and scrolls it into view.

---

### Task 6: Reduced motion, accessibility pass, cleanup and full verification

**Files:**
- Modify: `app/globals.css` (reduced-motion block covers new classes)
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-10-14-portfolio-v3-design.md` (one wording fix, below)

- [ ] **Step 1: Reduced-motion and focus details**

Append to `app/globals.css` inside the existing `@media (prefers-reduced-motion: reduce)` block:

```css
  .hero-doodle-wob[data-on],
  .hero-note-card,
  .foot-disc-silver,
  .hero-cue-line span {
    animation: none !important;
  }
  .hero-note-card {
    transform: none;
  }
```

- [ ] **Step 2: Spec wording**

In the spec, §3.3 Burn, change "and any pencil strokes the visitor drew (snapshotted when the flight starts)" to "and any pencil strokes still visible as the plane nears the disc".

- [ ] **Step 3: README**

Replace the README "Editing content" and "Structure" sections with:

```markdown
## Editing content

- Copy, links, doodles and timings: `content/site.ts` (email, LinkedIn, GitHub, CV path)
- Case studies: one file per project in `content/projects/`, ordered in `content/projects/index.ts`
- Replace `public/Debashish-CV.pdf` with the real CV

## Structure

- `components/Portfolio.tsx`: the single page (nav, hero, projects, footer, case study)
- `components/hero/Hero.tsx`: "Spot it. Shape it. Ship it." live verbs
- `components/delivery/Delivery.tsx`: the scroll-linked paper-plane → burn → carousel sequence
- `components/DiscStage.tsx`, `components/CaseStudy.tsx`: projects carousel and case-study overlay
- `components/footer/Footer.tsx`: "Your idea's next" footer
- `lib/`: pure, unit-tested maths (`npm test`)
```

- [ ] **Step 4: Full verification**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`. Expected: all pass.

Browser, desktop 1440×900 and phone 390×844:
1. Full scroll top → bottom → top with screenshots at hero, mid-flight, mid-burn, settled carousel, footer: no overlaps, nav readable, no horizontal scroll (`document.documentElement.scrollWidth === innerWidth`).
2. **Review focus 5:** with `emulateMedia({ reducedMotion: "reduce" })`: hero doodles at 0.18 opacity with notes on hover; scrolling fades hero out and the carousel in; heading, counter and controls visible (`opacity` 1); "Ship it" jumps to the carousel; footer "Ship it" opens mail directly; back to top jumps.
3. Keyboard: Tab order nav → verbs → hero buttons → carousel controls → footer disc → CV → email → footer links; Enter on "Ship it" runs the delivery; Escape closes a case study.
4. Console clean on every check.
```
