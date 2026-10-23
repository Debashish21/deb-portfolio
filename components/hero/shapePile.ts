// Shapes drawn with the hero pencil (circle, star, …) that were recognised: each glows where it was
// drawn, then drops under spring physics and piles up along the bottom of the screen. A few seconds
// later they evaporate one by one (or all at once on scroll): each breaks into ink motes that drift up.
//
// Performance: a shape's gradient line and glow are drawn once into a small sprite canvas; each frame
// only moves and rotates that sprite. (Blurring every segment every frame was the cause of dropped frames.)

import { inkColor } from "@/lib/ink";
import { dieTimes, Pile, type Body } from "@/lib/pile";
import type { Pt } from "@/lib/recognize";

type Mote = { x: number; y: number; vx: number; vy: number; born: number; life: number; style: string; size: number };
type Sprite = { img: HTMLCanvasElement; half: number }; // half: sprite half-size in CSS px
type Shape = {
  pts: Pt[]; // relative to the centre
  cum: number[]; // length along the line, for the gradient
  x: number;
  y: number;
  scale: number; // ≤ 1: big drawings shrink to fit the pile
  born: number;
  body: Body | null;
  dieAt: number; // 0 = not scheduled
  gone: boolean;
  rest: Sprite;
  glow: Sprite;
};

const GLOW_MS = 320;
const MAX_SHAPES = 8;
const MAX_R = 110;
const MOTE_MS = 1100;
/** A shape evaporates on its own this long after it was drawn… */
export const SHAPE_LIFE_MS = 5000;
/** …and never sooner than this after the previous one, so they leave one by one. */
const SHAPE_GAP_MS = 500;

/** Draws a shape's gradient line once into its own canvas, with a glow baked in. */
function sprite(pts: Pt[], cum: number[], k: number, width: number, blur: number): Sprite {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const r = Math.max(...pts.map((p) => Math.hypot(p.x, p.y))) * k, half = Math.ceil(r + blur * 1.5 + width + 2);
  const img = document.createElement("canvas");
  img.width = img.height = Math.ceil(half * 2 * dpr);
  const ctx = img.getContext("2d");
  if (!ctx) return { img, half };
  ctx.setTransform(dpr, 0, 0, dpr, half * dpr, half * dpr);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.shadowColor = "rgba(169,124,248,0.9)";
  ctx.shadowBlur = blur;
  // Runs of a few segments share one colour: far fewer draw calls, the gradient still reads smoothly.
  const RUN = 4;
  for (let i = 1; i < pts.length; i += RUN) {
    const [cr, cg, cb] = inkColor(cum[i]);
    ctx.strokeStyle = `rgb(${cr},${cg},${cb})`;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x * k, pts[i - 1].y * k);
    for (let j = i; j < Math.min(pts.length, i + RUN); j++) ctx.lineTo(pts[j].x * k, pts[j].y * k);
    ctx.stroke();
  }
  return { img, half };
}

export class ShapePile {
  private pile: Pile;
  private shapes: Shape[] = [];
  private motes: Mote[] = [];
  private raf = 0;
  private last = 0;
  private wake = 0 as unknown as ReturnType<typeof setTimeout>;

  constructor(private canvas: HTMLCanvasElement, private hero: HTMLElement) {
    this.pile = new Pile(hero.clientWidth, hero.clientHeight - 6);
  }

  /** A recognised loop (hero coordinates). */
  add(points: Pt[]) {
    const now = performance.now();
    const c = points.reduce((a, p) => ({ x: a.x + p.x / points.length, y: a.y + p.y / points.length }), { x: 0, y: 0 });
    const rel = points.map((p) => ({ x: p.x - c.x, y: p.y - c.y }));
    const r = Math.max(...rel.map((p) => Math.hypot(p.x, p.y)));
    const cum = rel.map(() => 0);
    for (let i = 1; i < rel.length; i++) cum[i] = cum[i - 1] + Math.hypot(rel[i].x - rel[i - 1].x, rel[i].y - rel[i - 1].y);
    const scale = Math.min(1, MAX_R / r);
    this.shapes.push({
      pts: rel, cum, x: c.x, y: c.y, scale, born: now, body: null, dieAt: 0, gone: false,
      rest: sprite(rel, cum, scale, 2.2, 6),
      glow: sprite(rel, cum, 1, 3.4, 22),
    });
    const live = this.shapes.filter((s) => !s.dieAt);
    if (live.length > MAX_SHAPES) live[0].dieAt = now;
    this.kick();
  }

  /** Scroll: every shape evaporates now, one after another. */
  evaporate() {
    const now = performance.now();
    this.shapes.filter((s) => !s.gone && (!s.dieAt || s.dieAt > now)).forEach((s, k) => (s.dieAt = now + k * 70));
    this.kick();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.wake);
    this.raf = 0;
  }

  private kick() {
    if (!this.raf) {
      this.last = performance.now();
      this.raf = requestAnimationFrame(this.tick);
    }
  }

  /** Each shape's own departure time (unless scroll already sent it): oldest first, one by one. */
  private schedule() {
    const waiting = this.shapes.filter((s) => !s.gone);
    const times = dieTimes(waiting.map((s) => s.born), SHAPE_LIFE_MS, SHAPE_GAP_MS);
    waiting.forEach((s, i) => (s.dieAt = s.dieAt ? Math.min(s.dieAt, times[i]) : times[i]));
  }

  private tick = (now: number) => {
    this.raf = 0;
    clearTimeout(this.wake);
    const dt = Math.min(1 / 30, (now - this.last) / 1000);
    this.last = now;
    const W = this.hero.clientWidth, H = this.hero.clientHeight;
    this.pile.width = W;
    this.pile.height = H - 6;
    this.schedule();

    for (const s of this.shapes) {
      if (now >= s.dieAt && !s.gone) this.burst(s, now);
      // After its glow, a shape joins the physics where it was drawn, with a little spin.
      if (!s.gone && !s.body && now - s.born >= GLOW_MS) {
        const r = Math.max(14, Math.max(...s.pts.map((p) => Math.hypot(p.x, p.y))) * s.scale * 0.82);
        s.body = this.pile.add({ x: Math.min(W - r, Math.max(r, s.x)), y: s.y, r, va: (Math.random() - 0.5) * 3, vy: -120 });
      }
    }
    this.shapes = this.shapes.filter((s) => !s.gone);
    this.pile.step(dt);
    for (const m of this.motes) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.vy -= 30 * dt;
    }
    this.motes = this.motes.filter((m) => now - m.born < m.life);
    this.draw(now);

    const moving = this.motes.length || !this.pile.settled() || this.shapes.some((s) => !s.body);
    if (moving) this.raf = requestAnimationFrame(this.tick);
    else if (this.shapes.length) {
      // Everything is resting: sleep until the next shape is due to leave.
      const next = Math.min(...this.shapes.map((s) => s.dieAt));
      this.wake = setTimeout(() => this.kick(), Math.max(0, next - performance.now()));
    }
  };

  /** Breaks a shape into ink motes along its line and takes it out of the pile. */
  private burst(s: Shape, now: number) {
    const { x, y, a, k } = this.pose(s, now);
    const cos = Math.cos(a), sin = Math.sin(a);
    for (let i = 0; i < s.pts.length; i += 2) {
      const p = s.pts[i], px = p.x * k, py = p.y * k, [r, g, b] = inkColor(s.cum[i]);
      this.motes.push({
        x: x + px * cos - py * sin,
        y: y + px * sin + py * cos,
        vx: (Math.random() - 0.5) * 50,
        vy: -(40 + Math.random() * 80),
        born: now + Math.random() * 120,
        life: MOTE_MS * (0.7 + Math.random() * 0.5),
        style: `${r},${g},${b}`,
        size: 1.2 + Math.random() * 1.6,
      });
    }
    if (s.body) this.pile.remove(s.body);
    s.body = null;
    s.gone = true;
  }

  /** Where a shape is drawn: on its body once falling; while glowing, in place, easing down to its pile size. */
  private pose(s: Shape, now: number) {
    if (s.body) return { x: s.body.x, y: s.body.y, a: s.body.angle, k: s.scale };
    const t = Math.min(1, (now - s.born) / GLOW_MS);
    return { x: s.x, y: s.y, a: 0, k: 1 + (s.scale - 1) * t };
  }

  private draw(now: number) {
    const cv = this.canvas, dpr = Math.min(2, window.devicePixelRatio || 1), W = this.hero.clientWidth, H = this.hero.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) {
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
    }
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    for (const s of this.shapes) {
      const { x, y, a, k } = this.pose(s, now);
      const glow = s.body ? 0 : 1 - Math.min(1, (now - s.born) / GLOW_MS);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      if (glow > 0) {
        // the glow sprite is drawn at full size; scale it to the shape's current size
        const g = s.glow, sz = (g.half * 2 * k);
        ctx.globalAlpha = glow;
        ctx.drawImage(g.img, -sz / 2, -sz / 2, sz, sz);
      }
      const r = s.rest, rk = k / s.scale, rz = r.half * 2 * rk;
      ctx.globalAlpha = 1 - glow * 0.6;
      ctx.drawImage(r.img, -rz / 2, -rz / 2, rz, rz);
      ctx.restore();
    }

    ctx.globalAlpha = 1;
    for (const m of this.motes) {
      const t = (now - m.born) / m.life;
      if (t < 0) continue;
      ctx.fillStyle = `rgba(${m.style},${((1 - t) * 0.9).toFixed(3)})`;
      const sz = m.size * (1 - t * 0.6);
      ctx.fillRect(m.x - sz, m.y - sz, sz * 2, sz * 2);
    }
  }
}
