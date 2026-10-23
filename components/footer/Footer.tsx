"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { footer, site, timings } from "@/content/site";
import { sfx } from "@/lib/sound";
import { clampIdea } from "@/lib/disc-label";
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
        sfx("whoosh");
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
    sfx("whoosh");
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
                onChange={(e) => setIdea(clampIdea(e.target.value))}
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
