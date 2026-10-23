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
      const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
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
