"use client";

import { useEffect, useRef, type RefObject } from "react";
import { doodles, timings } from "@/content/site";
import type { InkStore } from "@/lib/ink";
import { bezier, bezierAngle, burnRadius, clamp01, deliveryProgress, FLIGHT_VH, launchLegs, settledScroll, settleTarget, smoothstep, spiralTo, type Pt } from "@/lib/motion-math";
import { runSpring } from "@/lib/spring";
import { hum, sfx } from "@/lib/sound";
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
    let raf = 0, autoRaf = 0, lastV = 0, humT: ReturnType<typeof setTimeout> | undefined;
    let snap: { x: number; y: number; brk: boolean }[] | null = null;

    const paint = () => {
      raf = 0;
      const page = document.querySelector<HTMLElement>("[data-page]");
      if (!page) return;
      const H = viewportH(), W = window.innerWidth, S = window.scrollY;
      const { reduced: red, caseHidden: hide } = live.current;
      const btt = document.documentElement.hasAttribute("data-btt");
      const { u, v, b, r } = deliveryProgress(S, H);

      // Sound (only if the visitor turned it on): the burner hums while the laser runs, chimes when done.
      if (!red && b > 0 && b < 1) {
        hum(0.03, 110 + b * 260);
        clearTimeout(humT);
        humT = setTimeout(() => hum(0, 0), 260);
      } else hum(0, 0);
      if (!red && v >= 0.72 && lastV < 0.72) sfx("burned");
      lastV = v;

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
        // Size the buffer to the canvas's own box (100vh), so it is never stretched on mobile.
        const dpr = window.devicePixelRatio || 1, cw = Math.round(cv.clientWidth * dpr), ch = Math.round(cv.clientHeight * dpr);
        if (cv.width !== cw || cv.height !== ch) {
          cv.width = cw;
          cv.height = ch;
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
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

      // Scroll positions are whole pixels; a settle point like 2363.2px must still count as settled.
      const reveal = red || r > 0.995 ? 1 : r;
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
            el.style.removeProperty("--burnt");
            return;
          }
          el.style.setProperty("--blank", b < 1 ? "1" : "0");
          el.style.setProperty("--burn", (v >= 0.72 ? 49.5 : burnRadius(b)).toFixed(2) + "%");
          // Freshly burned grooves darken the ring behind the laser, then fade as the disc settles.
          el.style.setProperty("--burnt", b > 0 ? (0.6 * (1 - clamp01((v - 0.72) / 0.12))).toFixed(3) : "0");
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
      cancelSettle();
      const H = viewportH(), max = document.documentElement.scrollHeight - window.innerHeight;
      if (live.current.reduced) {
        window.scrollTo(0, Math.min(max, settledScroll(H)));
        return;
      }
      const legs = launchLegs(window.scrollY, H, max, timings.flightMs, timings.burnMs);
      if (!legs.length) return;
      sfx("whoosh");
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

    // Settle: when scrolling pauses near the projects, spring the page the rest of the way into place,
    // only ever in the direction it was going. Any wheel, touch, key or pointer press lets go at once.
    let settleTimer: ReturnType<typeof setTimeout> | undefined, stopSettle: (() => void) | null = null;
    let lastY = window.scrollY, dir = 0, touching = false;
    const cancelSettle = () => {
      clearTimeout(settleTimer);
      stopSettle?.();
      stopSettle = null;
    };
    const trySettle = () => {
      const html = document.documentElement;
      if (autoRaf || touching || live.current.reduced || html.style.overflow === "hidden" || html.hasAttribute("data-btt")) return;
      const to = settleTarget(window.scrollY, viewportH(), html.scrollHeight - window.innerHeight, dir);
      if (to === null || Math.abs(to - window.scrollY) < 1) return;
      stopSettle = runSpring({
        from: window.scrollY, to, velocity: 0, cfg: timings.settleSpring, eps: 0.5,
        onFrame: (y) => window.scrollTo(0, y),
        onDone: () => (stopSettle = null),
      });
    };
    const onScroll = () => {
      schedule();
      if (stopSettle) return;
      const y = window.scrollY;
      if (y !== lastY) dir = Math.sign(y - lastY);
      lastY = y;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(trySettle, timings.settleIdleMs);
    };
    const onTouchStart = () => {
      touching = true;
      cancelSettle();
    };
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(settleTimer);
      settleTimer = setTimeout(trySettle, timings.settleIdleMs);
    };
    const interrupt = ["wheel", "keydown", "pointerdown"] as const;

    // A resize (e.g. rotating a phone) mid-launch changes where the carousel settles: re-plan from here.
    const onResize = () => {
      schedule();
      if (autoRaf) launch();
    };

    apiRef.current = { launch, cancel: stopAuto };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    interrupt.forEach((t) => window.addEventListener(t, cancelSettle, { passive: true }));
    window.addEventListener("resize", onResize);
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(humT);
      hum(0, 0);
      stopAuto();
      cancelSettle();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
      interrupt.forEach((t) => window.removeEventListener(t, cancelSettle));
      window.removeEventListener("resize", onResize);
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
