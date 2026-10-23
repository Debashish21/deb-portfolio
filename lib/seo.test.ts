import { describe, expect, it } from "vitest";
import { projects } from "../content/projects";
import { site } from "../content/site";
import { jsonLd, llmsText, scriptJson } from "./seo";

describe("jsonLd", () => {
  const graph = jsonLd(site, projects)["@graph"];
  it("describes the person by full name, with their profiles", () => {
    const person = graph.find((n) => n["@type"] === "Person")!;
    expect(person.name).toBe("Debashish Ram");
    expect(person).toMatchObject({ givenName: "Debashish", familyName: "Ram", url: site.url });
    expect((person as { sameAs: string[] }).sameAs).toEqual([site.linkedin, site.github]);
  });
  it("lists every project as their work, with absolute image URLs", () => {
    const page = graph.find((n) => n["@type"] === "ProfilePage") as { hasPart: { name: string; image?: string }[] };
    expect(page.hasPart.map((p) => p.name)).toEqual(projects.map((p) => p.title));
    for (const p of page.hasPart) if (p.image) expect(p.image.startsWith(`${site.url}/`)).toBe(true);
  });
});

describe("scriptJson", () => {
  it("can't be used to close the script tag", () => {
    const out = scriptJson({ x: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("<");
    expect(JSON.parse(out).x).toBe("</script><script>alert(1)</script>");
  });
});

describe("llmsText", () => {
  const txt = llmsText(site, projects);
  it("starts with the name as the title and the summary as a quote", () => {
    expect(txt.startsWith(`# ${site.name}\n\n> ${site.description}`)).toBe(true);
  });
  it("has a section per project and the contact links", () => {
    for (const p of projects) expect(txt).toContain(`### ${p.title} (${p.year})`);
    for (const url of [site.linkedin, site.github, `${site.url}${site.cvHref}`]) expect(txt).toContain(url);
  });
});
