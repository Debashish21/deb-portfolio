/* eslint-disable @next/next/no-img-element -- static case-study screenshots at intrinsic size */
import { Fragment } from "react";
import type { Block, Diagram as DiagramData } from "@/content/types";

export function Diagram({ diagram }: { diagram: DiagramData }) {
  return (
    <figure className="dgm" data-long={diagram.stages.length > 4 ? "" : undefined} data-variant={diagram.variant ?? "flow"}>
      <figcaption className="dgm-head">
        <span className="dgm-title">{diagram.title}</span>
        {diagram.caption && <span className="dgm-caption">{diagram.caption}</span>}
      </figcaption>
      <div className="dgm-flow" role="list">
        {diagram.stages.map((stage, i) => (
          <Fragment key={i}>
            <div className="dgm-stage" role="listitem">
              {stage.label && <span className="dgm-label">{stage.label}</span>}
              {stage.nodes.map((n, j) => (
                <div key={j} className="dgm-node" data-tone={n.tone}>
                  <span className="dgm-node-title">{n.title}</span>
                  {n.sub && <span className="dgm-node-sub">{n.sub}</span>}
                </div>
              ))}
            </div>
            {i < diagram.stages.length - 1 && diagram.variant !== "compare" && (
              <div className="dgm-arrow" aria-hidden>
                {stage.arrow && <span>{stage.arrow}</span>}
              </div>
            )}
          </Fragment>
        ))}
      </div>
      {diagram.loop && (
        <div className="dgm-loop" aria-label={`Loops back: ${diagram.loop}`}>
          <span>Loops back · {diagram.loop}</span>
        </div>
      )}
    </figure>
  );
}

export function CaseBlock({ block }: { block: Block }) {
  switch (block.kind) {
    case "p":
      return <p>{block.text}</p>;
    case "list":
      return (
        <ul className="case-list">
          {block.items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      );
    case "features":
      return (
        <div className="case-features" data-cols={block.items.length % 3 === 0 ? 3 : block.items.length % 2 === 0 ? 2 : undefined}>
          {block.items.map((f, i) => (
            <div key={i}>
              <span className="case-feature-title">{f.title}</span>
              <span>{f.text}</span>
            </div>
          ))}
        </div>
      );
    case "steps":
      return (
        <ol className="case-steps">
          {block.items.map((s, i) => (
            <li key={i}>
              <span className="case-step-num">{String(i + 1).padStart(2, "0")}</span>
              <span>
                <span className="case-feature-title">{s.title}</span>
                <span>{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      );
    case "callout":
      return <blockquote className="case-callout">{block.text}</blockquote>;
    case "diagram":
      return <Diagram diagram={block.diagram} />;
    case "gallery":
      return (
        <div className="case-gallery">
          {block.items.map((g) => (
            <figure key={g.src} data-wide={g.wide ? "" : undefined}>
              <a href={g.src} target="_blank" rel="noreferrer">
                <img src={g.src} alt={g.alt} loading="lazy" />
              </a>
              {g.caption && <figcaption>{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      );
  }
}
