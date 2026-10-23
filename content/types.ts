// Shape of a case study. Each project fills the design's five lenses
// (see `lenses` in content/portfolio.ts) with its own content.

export type LensKey = "problem" | "product" | "engineering" | "result" | "future";

export type DiagramNode = {
  title: string;
  sub?: string;
  /** accent = the thing this diagram is about; muted = context or fallback */
  tone?: "accent" | "muted";
};

export type DiagramStage = {
  /** Small mono label above the stage, e.g. "Sources" */
  label?: string;
  nodes: DiagramNode[];
  /** Label on the arrow leading to the next stage */
  arrow?: string;
};

export type Diagram = {
  title: string;
  caption?: string;
  stages: DiagramStage[];
  /** Draws a return path from the last stage back to the first, with this label */
  loop?: string;
  /** flow (default) joins stages with arrows; compare shows them side by side as alternatives */
  variant?: "flow" | "compare";
};

export type Block =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "features"; items: { title: string; text: string }[] }
  | { kind: "steps"; items: { title: string; text: string }[] }
  | { kind: "callout"; text: string }
  | { kind: "gallery"; items: GalleryItem[] }
  | { kind: "diagram"; diagram: Diagram };

export type GalleryItem = {
  src: string;
  alt: string;
  caption?: string;
  /** Spans the full width; use for wide crops */
  wide?: boolean;
};

export type Decision = { title: string; why: string };

export type LensContent = {
  /** Lead paragraph shown under the lens heading */
  summary: string;
  blocks: Block[];
  /** D1 = a decision and why; D2 = a trade-off and what it cost */
  decisions: [Decision, Decision];
};

export type Project = {
  slug: string;
  title: string;
  /** One line, shown under the disc carousel and the case-study title */
  tagline: string;
  role: string;
  year: string;
  team: string;
  platform: string;
  stack: string[];
  links: { label: string; url: string }[];
  /** Screenshot shown on the disc, e.g. "/projects/airlyrics.png" */
  disc?: string;
  /** Case-study video, e.g. "/projects/airlyrics/film.mp4" */
  video?: string;
  /** Still frame shown before the video plays */
  poster?: string;
  /** 16:9 hero image, used when there is no video */
  cover?: string;
  lenses: Record<LensKey, LensContent>;
};
