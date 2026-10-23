import { ImageResponse } from "next/og";
import { site } from "@/content/site";

// Share card for links on LinkedIn, Slack, WhatsApp and search results. Colours are the site's tokens in hex
// (the image renderer has no oklch).
export const alt = `${site.name} — ${site.role}. Spot it. Shape it. Ship it.`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 80, background: "#0e0d12", color: "#f3f2f6", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 34, color: "#aeacb6" }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: "#a77bff" }} />
          {site.name} · {site.role}
        </div>
        <div style={{ display: "flex", flexDirection: "column", fontSize: 104, fontWeight: 600, lineHeight: 1.05, letterSpacing: -3 }}>
          <span>Spot it.</span>
          <span style={{ color: "#a77bff" }}>Shape it.</span>
          <span>Ship it.</span>
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#aeacb6" }}>{site.url.replace("https://", "")}</div>
      </div>
    ),
    size,
  );
}
