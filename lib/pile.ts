// A tiny 2D physics world for the shapes that fall to the bottom of the hero. Each shape is treated as
// a disc; contacts (floor, walls, other shapes) are damped springs (Apple-style response/dampingFraction),
// which gives a soft bounce on landing and lets shapes pile up and roll off one another.

export type Body = { x: number; y: number; vx: number; vy: number; r: number; angle: number; va: number };

type Opts = { gravity: number; response: number; dampingFraction: number; friction: number; substeps: number };
const DEFAULTS: Opts = { gravity: 2600, response: 0.16, dampingFraction: 0.35, friction: 5, substeps: 8 };

export class Pile {
  bodies: Body[] = [];
  private restFor = 0;
  private o: Opts;
  private k: number;
  private c: number;

  /** width × height of the box; the floor is at y = height. */
  constructor(public width: number, public height: number, opts: Partial<Opts> = {}) {
    this.o = { ...DEFAULTS, ...opts };
    const w = (2 * Math.PI) / this.o.response;
    this.k = w * w;
    this.c = 2 * this.o.dampingFraction * w;
  }

  add(init: { x: number; y: number; r: number; vx?: number; vy?: number; va?: number }): Body {
    const b: Body = { vx: 0, vy: 0, va: 0, angle: 0, ...init };
    this.bodies.push(b);
    this.restFor = 0;
    return b;
  }

  remove(b: Body) {
    this.bodies = this.bodies.filter((x) => x !== b);
  }

  /** True once everything has been still for a moment (so the animation loop can stop). */
  settled() {
    return this.restFor > 0.3;
  }

  step(dt: number) {
    const n = this.o.substeps, h = dt / n;
    for (let s = 0; s < n; s++) this.substep(h);
    const still = this.bodies.every((b) => Math.abs(b.vx) < 8 && Math.abs(b.vy) < 8 && Math.abs(b.va) < 0.1);
    this.restFor = still ? this.restFor + dt : 0;
  }

  private substep(h: number) {
    const { k, c } = this, { gravity, friction } = this.o, B = this.bodies;
    const ax = B.map(() => 0), ay = B.map(() => gravity), grounded = B.map(() => false);

    B.forEach((b, i) => {
      // Floor and walls: one-sided springs.
      const pen = b.y + b.r - this.height;
      if (pen > 0) {
        ay[i] += -k * pen - c * b.vy;
        ax[i] += -friction * b.vx;
        grounded[i] = true;
      }
      const left = b.r - b.x, right = b.x + b.r - this.width;
      if (left > 0) ax[i] += k * left - c * b.vx;
      if (right > 0) ax[i] += -k * right - c * b.vx;
    });

    // Shape against shape: a spring along the line between centres, shared by mass (∝ r²).
    for (let i = 0; i < B.length; i++)
      for (let j = i + 1; j < B.length; j++) {
        const a = B[i], b = B[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
        const pen = a.r + b.r - d;
        if (pen <= 0) continue;
        const nx = dx / d, ny = dy / d, vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        const f = k * pen - c * vn, ma = a.r * a.r, mb = b.r * b.r, wa = mb / (ma + mb), wb = ma / (ma + mb);
        ax[i] -= nx * f * wa;
        ay[i] -= ny * f * wa;
        ax[j] += nx * f * wb;
        ay[j] += ny * f * wb;
        // a little friction between touching shapes
        const tx = -ny, ty = nx, vt = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
        ax[i] += tx * vt * friction * 0.5 * wa;
        ay[i] += ty * vt * friction * 0.5 * wa;
        ax[j] -= tx * vt * friction * 0.5 * wb;
        ay[j] -= ty * vt * friction * 0.5 * wb;
        if (ny > 0.3) grounded[i] = true; // resting on b
        if (ny < -0.3) grounded[j] = true;
      }

    B.forEach((b, i) => {
      b.vx += ax[i] * h;
      b.vy += ay[i] * h;
      b.vx *= 1 - 0.2 * h;
      b.vy *= 1 - 0.2 * h;
      b.x += b.vx * h;
      b.y += b.vy * h;
      // Rolling: on a surface, spin catches up with the speed it's sliding at.
      if (grounded[i]) b.va += (b.vx / b.r - b.va) * Math.min(1, 14 * h);
      else b.va *= 1 - 0.8 * h;
      b.angle += b.va * h;
    });
  }
}

/** When each shape (by draw time, oldest first) should evaporate: `life` ms after drawing, at least `gap` ms after the one before. */
export function dieTimes(born: number[], life: number, gap: number): number[] {
  const out: number[] = [];
  born.forEach((b, i) => out.push(Math.max(b + life, i ? out[i - 1] + gap : -Infinity)));
  return out;
}
