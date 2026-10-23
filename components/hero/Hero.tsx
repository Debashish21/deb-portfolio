"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { doodles, hero, timings } from "@/content/site";
import { sfx } from "@/lib/sound";
import { inkColor, type InkPoint, type InkStore } from "@/lib/ink";
import { ShapeDetector, type Detected } from "@/lib/recognize";
import { Doodle, PencilIcon, PlaneIcon, TorchIcon } from "../icons";
import { ShapePile } from "./shapePile";

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
  const pileRef = useRef<HTMLCanvasElement>(null);
  const m = useRef({
    mode: null as Mode, roaming: false, shipping: false, planeOut: false, drawTouch: false, lastPt: "mouse",
    inkRaf: 0, roamRaf: 0, timers: [] as ReturnType<typeof setTimeout>[],
    spotRaf: 0, spotAt: null as { x: number; y: number } | null,
    geo: null as { left: number; top: number; items: { el: HTMLElement; wrap: HTMLElement | null; icon: HTMLElement | null; x: number; y: number; w: number; last: Record<string, string> }[] } | null,
    shapes: new ShapeDetector<InkPoint>(), pile: null as ShapePile | null, shapePause: 0 as unknown as ReturnType<typeof setTimeout>,
  });

  const base = reduced ? timings.reducedDoodleOpacity : timings.doodleOpacity;

  const clearLight = useCallback(() => {
    const h = heroRef.current;
    if (spotRef.current) spotRef.current.style.opacity = "0";
    h?.querySelectorAll<HTMLElement>("[data-icon]").forEach((el) => delete el.dataset.on);
    cancelAnimationFrame(m.current.spotRaf);
    m.current.spotRaf = 0;
    m.current.geo = null;
    h?.querySelectorAll<HTMLElement>("[data-doodle]").forEach((el) => {
      el.style.opacity = el.dataset.found ? `calc(var(--db) + 0.14)` : "var(--db)";
      const w = el.firstElementChild as HTMLElement | null;
      if (!w) return;
      delete w.dataset.on;
      w.style.opacity = "";
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

  // Doodle positions, measured once per torch session (and again after a resize or scroll), so moving
  // the torch never forces layout. Each item remembers what it last wrote, so unchanged styles aren't rewritten.
  type LitItem = { el: HTMLElement; wrap: HTMLElement | null; icon: HTMLElement | null; x: number; y: number; w: number; last: Record<string, string> };
  const geometry = () => {
    const st = m.current, hero = heroRef.current;
    if (st.geo || !hero) return st.geo;
    const hr = hero.getBoundingClientRect();
    const items: LitItem[] = [...hero.querySelectorAll<HTMLElement>("[data-doodle]")].map((el, k) => {
      const r = el.getBoundingClientRect();
      return { el, wrap: el.firstElementChild as HTMLElement | null, icon: hero.querySelector<HTMLElement>(`[data-icon="${k}"]`), x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, last: {} };
    });
    st.geo = { left: hr.left, top: hr.top, items };
    return st.geo;
  };
  const put = (it: LitItem, key: string, v: string, write: () => void) => {
    if (it.last[key] === v) return;
    it.last[key] = v;
    write();
  };

  const light = (cx: number, cy: number, R: number) => {
    const g = geometry();
    if (!g) return;
    for (const it of g.items) {
      const { el, wrap, icon } = it, dx = cx - it.x, dy = cy - it.y;
      const lit = Math.max(0, Math.min(1, 1 - (Math.hypot(dx, dy) - it.w * 0.3) / R));
      if (lit > 0.35 && !el.dataset.found) {
        el.dataset.found = "1";
        el.style.pointerEvents = "auto";
      }
      const floor = el.dataset.found ? base + 0.14 : base;
      put(it, "op", (floor + (0.92 - floor) * lit).toFixed(2), () => (el.style.opacity = it.last.op));
      // A doodle with a 3D icon: once found, the icon pops up in its place and stays while the torch is on,
      // turning toward the light and glowing brighter as the beam passes over it.
      if (icon) {
        if (lit > 0.35 && !("on" in it.last)) {
          it.last.on = "";
          icon.dataset.on = "";
        }
        const R2 = R * 1.6;
        put(it, "ty", Math.round(Math.max(-1, Math.min(1, dx / R2)) * 22) + "deg", () => icon.style.setProperty("--ty", it.last.ty));
        put(it, "tx", Math.round(Math.max(-1, Math.min(1, -dy / R2)) * 16) + "deg", () => icon.style.setProperty("--tx", it.last.tx));
        put(it, "glow", (0.78 + 0.22 * lit).toFixed(2), () => icon.style.setProperty("--glow", it.last.glow));
      }
      if (!wrap) continue;
      // While its 3D icon is up, the flat drawing steps aside.
      put(it, "hide", "on" in it.last ? "0" : "", () => (wrap.style.opacity = it.last.hide));
      if (lit > 0.35) put(it, "wob", "1", () => (wrap.dataset.on = "1"));
      else if (lit < 0.15) put(it, "wob", "", () => delete wrap.dataset.on);
    }
  };

  // The torch follows the pointer at most once per frame, however fast pointer events arrive.
  const placeSpot = (cx: number, cy: number) => {
    const st = m.current;
    st.spotAt = { x: cx, y: cy };
    if (st.spotRaf) return;
    st.spotRaf = requestAnimationFrame(() => {
      st.spotRaf = 0;
      const g = geometry(), sp = spotRef.current, at = st.spotAt;
      if (!g || !sp || !at) return;
      const S = timings.spotlightPx;
      sp.style.transform = `translate(${at.x - g.left - S / 2}px,${at.y - g.top - S / 2}px)`;
      sp.style.opacity = "1";
      if (st.roaming) moveCursor(at.x, at.y);
      light(at.x, at.y, S / 2);
    });
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

  function drawInk() {
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
    // Drawn in short runs of segments (one colour and alpha per run) instead of one call per segment.
    const RUN = 4;
    let along = 0;
    for (let k = 1; k < L.length; ) {
      if (L[k].brk) {
        along = 0;
        k++;
        continue;
      }
      let end = k;
      while (end < L.length && end - k < RUN && !L[end].brk) end++;
      const al = ink.alpha(L[end - 1], now);
      for (let i = k; i < end; i++) along += L[i].len;
      if (al > 0) {
        const [cr, cg, cb] = inkColor(along);
        ctx.strokeStyle = `rgba(${cr},${cg},${cb},${(0.9 * al).toFixed(3)})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(L[k - 1].x, L[k - 1].y);
        for (let i = k; i < end; i++) ctx.lineTo(L[i].x, L[i].y);
        ctx.stroke();
        // a fainter, slightly offset second line gives the pencil its grain
        ctx.strokeStyle = `rgba(242,240,247,${(0.32 * al).toFixed(3)})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(L[k - 1].x + L[k - 1].jx, L[k - 1].y + L[k - 1].jy);
        for (let i = k; i < end; i++) ctx.lineTo(L[i].x + L[i].jx, L[i].y + L[i].jy);
        ctx.stroke();
      }
      k = end;
    }
    ink.prune(now);
    if (ink.isAlive(now)) m.current.inkRaf = requestAnimationFrame(drawInk);
    else {
      ink.clear();
      ctx.clearRect(0, 0, w, hh);
    }
  }

  const inkAt = (cx: number, cy: number) => {
    if (reduced) return;
    const h = heroRef.current?.getBoundingClientRect();
    if (!h) return;
    if (!ink.add(cx - h.left, cy - h.top, performance.now())) return;
    if (!m.current.inkRaf) m.current.inkRaf = requestAnimationFrame(drawInk);
    // Shape spotting: a closed loop that looks like a circle, star, … drops to the floor as a shape.
    const st = m.current;
    const found = st.shapes.push(ink.points[ink.points.length - 1]);
    if (found) dropShape(found);
    clearTimeout(st.shapePause);
    st.shapePause = setTimeout(() => {
      const r = st.shapes.flush();
      if (r) dropShape(r);
    }, 260);
  };

  const dropShape = (found: Detected<InkPoint>) => {
    const st = m.current, hero = heroRef.current, cv = pileRef.current;
    if (!hero || !cv) return;
    st.pile ??= new ShapePile(cv, hero);
    ink.kill(found.points, performance.now());
    st.pile.add(found.points.map(({ x, y }) => ({ x, y })));
    sfx("burned");
  };

  // "Ship it" lights up once it lands back in place, while the pointer is still on its line.
  const land = (on: boolean) => shipRef.current?.toggleAttribute("data-landed", on);

  const whoosh = () => {
    if (reduced) return land(true);
    if (m.current.shipping) return;
    m.current.shipping = true;
    sfx("whoosh");
    land(false);
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
        if (!m.current.planeOut) land(true);
      }, timings.shipWhooshMs * timings.shipLandAt),
      setTimeout(() => {
        m.current.shipping = false;
        if (m.current.planeOut && m.current.mode === "plane") setMode(null);
      }, timings.shipWhooshMs + 100),
    );
  };

  // The 3D icons load a moment after the page settles, so they never compete with first paint.
  const [iconsReady, setIconsReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setIconsReady(true), 1200);
    return () => clearTimeout(t);
  }, []);

  // Scrolling away from the hero evaporates the pile of drawn shapes.
  useEffect(() => {
    const st = m.current;
    const onScroll = () => {
      st.geo = null; // doodle positions moved
      if (window.scrollY > 24) st.pile?.evaporate();
    };
    const onResize = () => (st.geo = null);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(st.spotRaf);
      clearTimeout(st.shapePause);
      st.pile?.dispose();
      st.pile = null;
    };
  }, []);

  // Touch devices: let the torch roam once so people discover the doodles.
  useEffect(() => {
    const st = m.current;
    if (window.matchMedia("(hover: none)").matches && !reduced) st.timers.push(setTimeout(() => roam(timings.roamTouchMs), 900));
    return () => {
      st.timers.forEach(clearTimeout);
      cancelAnimationFrame(st.roamRaf);
      cancelAnimationFrame(st.inkRaf);
    };
    // roam is recreated each render; running once on mount is intended
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  const isMouse = (e: PointerEvent) => e.pointerType === "mouse";
  const onVerbKey = (e: KeyboardEvent, verb: "spot" | "shape" | "ship") => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (verb === "spot") roam(timings.roamTapMs);
    if (verb === "ship") onShip();
    if (verb === "shape") {
      setShapeOn(true);
      m.current.timers.push(setTimeout(() => setShapeOn(false), 1400));
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
    land(false);
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
      <div className="hero-icons" aria-hidden>
        {iconsReady &&
          doodles.map((d, k) =>
            d.icon ? (
              <div key={k} className="hero-icon" data-icon={k} style={{ left: d.x, top: d.y, "--w": d.w, "--r": d.r } as CSSProperties}>
                <div className="hero-icon-shadow" />
                <div className="hero-icon-bob">
                  <div className="hero-icon-tilt">
                    {/* eslint-disable-next-line @next/next/no-img-element -- small decorative PNG, already sized */}
                    <img src={d.icon} alt="" draggable={false} />
                  </div>
                </div>
              </div>
            ) : null,
          )}
      </div>
      <canvas ref={inkRef} className="hero-ink" aria-hidden />
      <canvas ref={pileRef} className="hero-pile" aria-hidden />
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
                onPointerEnter={spotEnter} onClick={spotTap} onKeyDown={(e) => onVerbKey(e, "spot")}>
                Spot it
              </span>
              <span className="hero-dot" aria-hidden>.</span>
            </span>
            <span className="hero-line">
              <span className="hero-verb hero-shape" data-on={shapeOn && !reduced ? "" : undefined} role="button" tabIndex={0}
                aria-label="Shape it: sketch mode" onPointerEnter={shapeEnter} onPointerLeave={shapeLeave} onClick={shapeTap}
                onKeyDown={(e) => onVerbKey(e, "shape")}>
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
                aria-label="Ship it: see what I've shipped" onClick={onShip} onKeyDown={(e) => onVerbKey(e, "ship")}>
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
