"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent, type RefObject } from "react";
import ImageSlot from "./ImageSlot";
import { projects } from "@/content/portfolio";
import { snapSteps, velocityOf, type Sample } from "@/lib/swipe";
import { runSpring } from "@/lib/spring";
import { timings } from "@/content/site";

const N = projects.length;

/** Signed distance of disc k from carousel position p (fractional while dragging), wrapped around the ring. */
export function discOffset(k: number, p: number) {
  let o = k - p;
  o -= N * Math.round(o / N);
  return o;
}

type Props = {
  active: number;
  /** Discs fade out while a case study is open */
  hidden: boolean;
  reduced: boolean;
  onGo: (i: number) => void;
  onOpen: () => void;
  /** Moves the carousel by whole discs when a drag, swipe or sideways scroll settles */
  onStep: (d: number) => void;
  /** The disc nearest the middle while dragging (null once settled), so the title can follow along */
  onPeek: (i: number | null) => void;
  stageRef: RefObject<HTMLDivElement | null>;
};

const WHEEL_SETTLE_MS = 140;

// Every disc transform is scaled by --r (0 = stacked behind the front disc, 1 = settled carousel),
// which the delivery painter drives while the carousel fans out.
export default function DiscStage({ active, hidden, reduced, onGo, onOpen, onStep, onPeek, stageRef }: Props) {
  // pos: where the carousel is, in discs. It rests on `active`; while dragged or springing it sits between.
  const [pos, setPos] = useState(active);
  const [dragging, setDragging] = useState(false);
  const m = useRef({ pos: active, vel: 0, target: active, stop: null as null | (() => void) });
  const g = useRef({ id: -1, x: 0, y: 0, unit: 300, axis: null as "x" | "y" | "wheel" | null, base: 0, offset: 0, samples: [] as Sample[], dragged: false, wheelTimer: 0 as unknown as ReturnType<typeof setTimeout> });
  const live = useRef({ onStep, reduced, active });
  useEffect(() => {
    live.current = { onStep, reduced, active };
  }, [onStep, reduced, active]);

  // One Apple-style spring drives every move (drag release, flick, arrows, clicks, keys, the peek),
  // starting from wherever the discs are and as fast as they were going.
  const springTo = useCallback((target: number, velocity: number) => {
    const st = m.current;
    const place = (p: number, v: number) => {
      st.pos = p;
      st.vel = v;
      setPos(p);
    };
    st.stop?.();
    st.stop = null;
    st.target = target;
    if (live.current.reduced) return place(target, 0);
    st.stop = runSpring({ from: st.pos, to: target, velocity, cfg: timings.discSpring, onFrame: place, onDone: () => (st.stop = null) });
  }, []);

  useEffect(() => {
    if (m.current.target !== active) springTo(active, m.current.vel);
  }, [active, springTo]);
  useEffect(() => {
    const st = m.current;
    return () => st.stop?.();
  }, []);

  const unitOf = () => (stageRef.current?.querySelector<HTMLElement>("[data-land-center]")?.offsetWidth || 300) * 1.02;
  const settled = () => !stageRef.current?.hasAttribute("data-moving");

  /** Takes hold of the discs (stopping any spring mid-swing) for a drag or a trackpad scroll. */
  const grab = useCallback((axis: "x" | "wheel") => {
    const st = g.current;
    m.current.stop?.();
    m.current.stop = null;
    Object.assign(st, { axis, base: m.current.pos, offset: 0, samples: [] });
    setDragging(true);
  }, []);
  const follow = useCallback((offset: number, t: number) => {
    const st = g.current;
    st.offset = offset;
    st.samples.push({ t, v: offset });
    if (st.samples.length > 12) st.samples.shift();
    m.current.pos = st.base + offset;
    setPos(m.current.pos);
  }, []);
  /** Lets go: snap to a disc, carrying the release speed into the spring. */
  const release = useCallback((velocity: number) => {
    const st = g.current, a = live.current.active;
    st.axis = null;
    setDragging(false);
    const steps = snapSteps(m.current.pos - a, velocity);
    springTo(a + steps, velocity);
    if (steps) live.current.onStep(steps);
  }, [springTo]);

  // Title and counter follow the disc that's nearest the middle while dragging.
  const near = dragging ? Math.round(pos) : null;
  useEffect(() => onPeek(near !== null && near !== active ? near : null), [near, active, onPeek]);

  // Trackpad sideways scroll (or Shift + mouse wheel) slides the discs, then springs onto a disc once the
  // gesture (and its inertia) stops. Native listener so preventDefault can stop the browser's back/forward swipe.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const st = g.current;
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.shiftKey ? 0 : e.deltaY)) return;
      e.preventDefault();
      if (el.hasAttribute("data-moving") || st.axis === "x") return;
      if (st.axis !== "wheel") grab("wheel");
      const unit = (el.querySelector<HTMLElement>("[data-land-center]")?.offsetWidth || 300) * 1.02;
      follow(Math.max(-3, Math.min(3, st.offset + dx / unit)), e.timeStamp);
      clearTimeout(st.wheelTimer);
      st.wheelTimer = setTimeout(() => {
        const last = st.samples[st.samples.length - 1];
        release(last ? velocityOf(st.samples, last.t) : 0);
      }, WHEEL_SETTLE_MS);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(st.wheelTimer);
    };
  }, [stageRef, grab, follow, release]);

  // Once the carousel first fans out, it gets a little sideways kick and the spring brings it back:
  // "you can drag me".
  useEffect(() => {
    const el = stageRef.current;
    if (!el || reduced) return;
    let t: ReturnType<typeof setTimeout>;
    const mo = new MutationObserver(() => {
      if (el.hasAttribute("data-moving")) return;
      mo.disconnect();
      t = setTimeout(() => {
        if (g.current.axis || m.current.stop || live.current.reduced) return;
        springTo(live.current.active, timings.discPeekVelocity);
      }, 700);
    });
    mo.observe(el, { attributes: true, attributeFilter: ["data-moving"] });
    return () => {
      mo.disconnect();
      clearTimeout(t);
    };
  }, [stageRef, reduced, springTo]);

  // Drag (mouse) or swipe (touch): the discs follow the pointer once it's clearly moving sideways;
  // a vertical move is left to the page. A drag swallows the click that follows it.
  const onDown = (e: PointerEvent) => {
    if (e.button !== 0 || !settled() || g.current.axis === "wheel") return;
    Object.assign(g.current, { id: e.pointerId, x: e.clientX, y: e.clientY, unit: unitOf(), axis: null, dragged: false });
  };
  const onPtrMove = (e: PointerEvent) => {
    const st = g.current;
    if (st.id !== e.pointerId) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (!st.axis) {
      if (Math.hypot(dx, dy) < 6) return;
      if (Math.abs(dx) <= Math.abs(dy)) {
        st.axis = "y";
        return;
      }
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      grab("x");
      st.x = e.clientX;
    }
    if (st.axis !== "x") return;
    follow(-(e.clientX - st.x) / st.unit, e.timeStamp);
  };
  const onUp = (e: PointerEvent) => {
    const st = g.current;
    if (st.id !== e.pointerId) return;
    st.id = -1;
    if (st.axis === "x") {
      st.dragged = true;
      release(e.type === "pointercancel" ? 0 : velocityOf(st.samples, e.timeStamp));
    } else if (st.axis === "y") st.axis = null;
  };
  const onClickCapture = (e: MouseEvent) => {
    if (!g.current.dragged) return;
    g.current.dragged = false;
    e.preventDefault();
    e.stopPropagation();
  };
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
    <div ref={stageRef} className="stage" data-stage onMouseMove={onMove} onMouseLeave={onLeave}
      data-dragging={dragging ? "" : undefined}
      onPointerDown={onDown} onPointerMove={onPtrMove} onPointerUp={onUp} onPointerCancel={onUp} onClickCapture={onClickCapture}
      onDragStart={(e) => e.preventDefault()}>
      <div className="stage-anchor" data-land-center>
        {projects.map((p, k) => {
          const o = discOffset(k, pos);
          // `front` is the disc nearest the middle; `centred` is exactly there (the settled resting pose).
          const front = Math.round(o) === 0, centred = o === 0;
          const near = Math.min(o, 2.2), yaw = 22 + o * -10, x = o * 1.02;
          const far = o < -2.5 ? Math.max(0, 1 - (-o - 2.5) / 1.2) : 1;
          const z = centred ? "0px" : `calc((-0.35 + ${(near * 0.42 + 0.35).toFixed(3)} * var(--r)) * var(--s))`;
          const style = {
            transform:
              `translate3d(calc(${x.toFixed(3)} * var(--r) * var(--s)), calc(${(-o * 0.24).toFixed(3)} * var(--r) * var(--s)), ${z}) ` +
              `rotateZ(calc(-6deg * var(--r))) rotateY(calc(${yaw}deg * var(--r))) rotateX(calc(8deg * var(--r))) ` +
              `scale(${centred ? "1" : "calc(0.75 + 0.25 * var(--r))"})`,
            zIndex: Math.round(100 + o * 10),
            opacity: hidden ? 0 : centred ? 1 : `calc(var(--r) * ${far.toFixed(3)})`,
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
                        <ImageSlot src={p.disc} shape="circle" placeholder={`${p.title} screenshot`} alt={`${p.title} screenshot`} />
                      </div>
                    </div>
                    <div className="disc-blank" />
                  </div>
                  <div className="disc-burnt" />
                  <div className="disc-hub" />
                  <div className="disc-sheen" />
                </div>
                {front && (
                  <button className="disc-open" aria-label={`Open ${p.title}`} onClick={onOpen}>
                    Open
                  </button>
                )}
              </div>
              {!front && <button className="disc-hit" aria-label={`Show ${p.title}`} onClick={() => onGo(Math.round(pos + o))} />}
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
