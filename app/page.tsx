import Portfolio from "@/components/Portfolio";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { jsonLd, scriptJson } from "@/lib/seo";

export default function Home() {
  return (
    <>
      {/* Structured data: tells search and answer engines who this is and what they've built. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: scriptJson(jsonLd(site, projects)) }} />
      <Portfolio />
    </>
  );
}
