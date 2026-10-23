// The five case-study lenses. Site copy lives in content/site.ts; case studies in content/projects/.

import type { LensKey } from "./types";

export { projects } from "./projects";
export type { Project } from "./types";

/** The five case-study lenses, in order: key, title, the hat worn */
export const lenses: [key: LensKey, title: string, hat: string][] = [
  ["problem", "Problem Statement", "Product Owner"],
  ["product", "Product View", "Product Manager"],
  ["engineering", "Engineering View", "Tech Partner"],
  ["result", "Result", "Owner of outcomes"],
  ["future", "Future Scope", "Strategist"],
];
