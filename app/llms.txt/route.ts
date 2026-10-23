import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { llmsText } from "@/lib/seo";

export function GET() {
  return new Response(llmsText(site, projects), { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
}
