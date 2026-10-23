"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Nav, { type NavTarget } from "./Nav";
import PerspectiveGrid from "./PerspectiveGrid";
import Loader from "./Loader";
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
import { sfx } from "@/lib/sound";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const N = projects.length;
const wrap = (i: number) => ((i % N) + N) % N;
const pad = (n: number) => String(n).padStart(2, "0");

export default function Portfolio() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);
  const [peek, setPeek] = useState<number | null>(null);
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

  // A soft click on every button and link (when sound is on).
  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      if ((e.target as Element | null)?.closest?.("button,a")) sfx("click");
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

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

  const step = useCallback((d: number) => setActive((a) => a + d), []);
  const shown = peek ?? active;
  const cur = projects[wrap(shown)];

  return (
    <div className="page" data-page>
      <PerspectiveGrid reduced={reduced} />
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
          <DiscStage active={active} hidden={caseOpen && !closing} reduced={reduced} onGo={setActive} onOpen={openCase} onStep={step} onPeek={setPeek} stageRef={stageRef} />
          <div className="land-foot" data-reveal>
            <div className="land-title">
              <div className="counter">
                <b>{pad(wrap(shown) + 1)}</b> / {pad(N)}
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
      <Loader />
      <Delivery ink={ink} reduced={reduced} apiRef={deliveryApi} active={active} caseHidden={caseOpen && !closing} />
      {caseOpen && <CaseStudy active={active} closing={closing} intro={intro} onClose={closeCase} onNext={() => setActive((a) => a + 1)} />}
    </div>
  );
}
