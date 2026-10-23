// Machine-readable descriptions of the site for search engines (JSON-LD) and AI answer engines (llms.txt).
// Built from content/ so they never drift from what the page shows.

import type { Project } from "@/content/types";

type Site = { name: string; role: string; url: string; description: string; email: string; linkedin: string; github: string; cvHref: string };

const abs = (base: string, path: string) => new URL(path, base).toString();

/** schema.org graph: the person, the site, the profile page, and each project as their work. */
export function jsonLd(site: Site, projects: Project[]) {
  const person = `${site.url}/#person`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        "@id": person,
        name: site.name,
        givenName: site.name.split(" ")[0],
        familyName: site.name.split(" ").slice(1).join(" ") || undefined,
        jobTitle: site.role,
        description: site.description,
        url: site.url,
        email: `mailto:${site.email}`,
        sameAs: [site.linkedin, site.github],
        knowsAbout: ["Product management", "Product ownership", ...new Set(projects.flatMap((p) => p.stack))],
      },
      {
        "@type": "WebSite",
        "@id": `${site.url}/#website`,
        url: site.url,
        name: `${site.name} — Portfolio`,
        author: { "@id": person },
      },
      {
        "@type": "ProfilePage",
        "@id": `${site.url}/#profile`,
        url: site.url,
        name: `${site.name} — ${site.role} Portfolio`,
        mainEntity: { "@id": person },
        isPartOf: { "@id": `${site.url}/#website` },
        hasPart: projects.map((p) => ({
          "@type": "CreativeWork",
          name: p.title,
          description: p.tagline,
          dateCreated: p.year,
          creator: { "@id": person },
          keywords: p.stack.join(", "),
          ...(p.disc ? { image: abs(site.url, p.disc) } : {}),
        })),
      },
    ],
  };
}

/** JSON for an inline <script>: escape "<" so content can never close the tag. */
export const scriptJson = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");

/** llms.txt (https://llmstxt.org): a plain-Markdown summary answer engines can read without running the page. */
export function llmsText(site: Site, projects: Project[]) {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    `${site.name} is a ${site.role}. Each project below started as an everyday annoyance and was taken from problem to shipped product, with the customer, the technology and the numbers in view.`,
    "",
    "## Contact",
    "",
    `- [Portfolio](${site.url})`,
    `- [CV (PDF)](${abs(site.url, site.cvHref)})`,
    `- [LinkedIn](${site.linkedin})`,
    `- [GitHub](${site.github})`,
    `- Email: ${site.email}`,
    "",
    "## Projects",
    "",
  ];
  for (const p of projects) {
    lines.push(
      `### ${p.title} (${p.year})`,
      "",
      p.tagline,
      "",
      `- Role: ${p.role}`,
      `- Team: ${p.team}`,
      `- Platform: ${p.platform}`,
      `- Stack: ${p.stack.join(", ")}`,
      ...p.links.map((l) => `- [${l.label}](${l.url})`),
      "",
      `**Problem.** ${p.lenses.problem.summary}`,
      "",
      `**Result.** ${p.lenses.result.summary}`,
      "",
    );
  }
  return lines.join("\n");
}
