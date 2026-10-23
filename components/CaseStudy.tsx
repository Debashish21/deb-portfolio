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

  // A modal: the page behind can't scroll or be reached, keyboard focus moves in, and returns on close.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    const opener = document.activeElement as HTMLElement | null;
    html.style.overflow = "hidden";
    const behind = [...document.querySelectorAll<HTMLElement>("[data-page] > *")].filter((el) => el !== caseRef.current);
    behind.forEach((el) => el.setAttribute("inert", ""));
    caseRef.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev;
      behind.forEach((el) => el.removeAttribute("inert"));
      opener?.focus({ preventScroll: true });
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
    <div ref={caseRef} className="case" role="dialog" aria-modal="true" aria-label={cur.title} tabIndex={-1} data-screen-label="Case study" onScroll={onCaseScroll}>
      {closing && <div className="case-closing" />}

      {/* Lift-off intro: the active disc rises, coin-flips toward the viewer, then the title rises in */}
      <div className="intro">
        <div className="intro-blur" />
        <div className="intro-bg" />
        <div className="intro-glow" />
        <div className="intro-space" style={{ "--size": intro.size, "--dx": intro.dx, "--dy": intro.dy } as CSSProperties}>
          <div className="intro-shadow" />
          <div className="intro-disc">
            <div className="disc-edge disc-hole" />
            <div className="disc-mid disc-hole" />
            <div className="disc-face disc-hole">
              <div className="intro-spin">
                <ImageSlot src={cur.disc} shape="circle" alt="" />
              </div>
              <div className="disc-hub" />
              <div className="intro-sheen" />
            </div>
          </div>
        </div>
        <div className="intro-title">
          <div>
            <div className="intro-num">
              {curNum} / {total}
            </div>
          </div>
          <div style={{ paddingBottom: 8 }}>
            <div className="intro-name">{cur.title}</div>
          </div>
        </div>
      </div>

      <div className="case-bar">
        <button className="pill" onClick={onClose}>
          <span>←</span>
          <span>All projects</span>
        </button>
        <span>{cur.title}</span>
        <button className="pill" onClick={next}>
          <span>Next</span>
          <span>→</span>
        </button>
      </div>

      <div className="case-body">
        <div className="case-video">
          {cur.video ? (
            <video key={cur.video} src={cur.video} poster={cur.poster} autoPlay muted loop playsInline />
          ) : cur.cover ? (
            // eslint-disable-next-line @next/next/no-img-element -- case-study cover at intrinsic size
            <img src={cur.cover} alt={`${cur.title} screenshot`} />
          ) : (
            <div className="case-video-empty">
              <span className="play">▶</span>
              <span className="label" style={{ color: "oklch(0.62 0.01 290)" }}>
                Project video · 16:9
              </span>
            </div>
          )}
        </div>

        <div className="case-hero">
          <div className="case-hero-copy">
            <div className="eyebrow">
              {curNum} / {total}
            </div>
            <h1>{cur.title}</h1>
            <p>{cur.tagline}</p>
            {cur.links.length > 0 && (
              <div className="case-links">
                {cur.links.map((l) => (
                  <a key={l.url} href={l.url} target="_blank" rel="noreferrer">
                    <span>{l.label}</span>
                    <span>↗</span>
                  </a>
                ))}
              </div>
            )}
            <div className="case-tags" aria-label="Stack">
              {cur.stack.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          </div>
          <div className="case-meta">
            <span className="label">Role</span>
            <span>{cur.role}</span>
            <span className="label">Platform</span>
            <span>{cur.platform}</span>
            <span className="label">Year</span>
            <span>{cur.year}</span>
            <span className="label">Team</span>
            <span>{cur.team}</span>
          </div>
        </div>

        <div className="case-grid">
          <aside className="lens-nav">
            <div>
              {lenses.map(([, title], k) => (
                <button key={k} className="lens-btn" aria-current={lens === k ? "true" : undefined} onClick={() => scrollToLens(k)}>
                  <span>{pad(k + 1)}</span>
                  <span>{title}</span>
                </button>
              ))}
            </div>
          </aside>
          <div>
            {lenses.map(([key, title, hat], k) => {
              const content = cur.lenses[key];
              return (
                <section key={key} className="lens" data-lens={k}>
                  <div className="lens-tags">
                    <span>{pad(k + 1)}</span>
                    <span className="hat">Hat · {hat}</span>
                  </div>
                  <h2>{title}</h2>
                  <div className="lens-body">
                    <p className="lens-lead">{content.summary}</p>
                    {content.blocks.map((b, i) => (
                      <CaseBlock key={i} block={b} />
                    ))}
                  </div>
                  <div className="decisions">
                    {content.decisions.map((d, i) => (
                      <div key={i}>
                        <span>D{i + 1}</span>
                        <span>
                          <span className="decision-title">{d.title}</span>
                          <span className="decision-why">{d.why}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>

        <button className="next-project" onClick={next}>
          <span>
            <span className="label">Next project</span>
            <span className="next-project-title">{projects[wrap(active + 1)].title}</span>
          </span>
          <span style={{ fontSize: 32 }}>→</span>
        </button>
      </div>
    </div>
  );
}
