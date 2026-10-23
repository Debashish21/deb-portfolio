import { describe, expect, it } from "vitest";
import { clampIdea, labelFontSize, splitLabel } from "./disc-label";

describe("splitLabel", () => {
  it("keeps short ideas on one line", () => expect(splitLabel("Splitting rent is hard")).toHaveLength(1));
  it("uses two lines up to 48 characters", () => {
    const t = "Splitting rent with flatmates is a total mess";
    const lines = splitLabel(t);
    expect(lines).toHaveLength(2);
    expect(lines.join(" ")).toBe(t);
  });
  it("uses three lines beyond 48 characters", () => {
    const t = "Why does every expense app make splitting rent with flatmates so hard";
    const lines = splitLabel(t);
    expect(lines).toHaveLength(3);
    expect(lines.join(" ")).toBe(t);
  });
});

describe("labelFontSize", () => {
  it("never exceeds 18", () => expect(labelFontSize(["hi"])).toBe(18));
  it("shrinks for long lines", () => expect(labelFontSize(["a".repeat(30)])).toBeLessThan(18));
});

describe("clampIdea", () => {
  it("keeps at most 80 characters without splitting an emoji", () => {
    const v = "a".repeat(79) + "🙂🙂";
    const out = clampIdea(v);
    expect(Array.from(out)).toHaveLength(80);
    expect(out.endsWith("🙂")).toBe(true);
  });
});
