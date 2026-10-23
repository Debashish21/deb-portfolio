// Fits a visitor's idea onto the footer disc: 1–3 curved lines of marker handwriting.

export function splitLabel(text: string): string[] {
  if (text.length <= 22) return [text];
  const n = text.length <= 48 ? 2 : 3;
  const words = text.split(/\s+/);
  const target = text.length / n;
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (cur && out.length < n - 1 && (cur + " " + w).length > target + 3) {
      out.push(cur);
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  out.push(cur);
  return out;
}

/** Usable width (in the 200-unit disc viewBox) for each line. */
export const lineRoom = (count: number) => (count === 3 ? [100, 128, 110] : [128, 118]);

export function labelFontSize(lines: string[]): number {
  const room = lineRoom(lines.length);
  return Math.min(...lines.map((l, k) => Math.min(18, room[k] / (Math.max(l.length, 1) * 0.62))));
}

export const IDEA_MAX = 80;

/** Limits an idea to 80 characters, counting emoji as one so none gets cut in half. */
export const clampIdea = (v: string) => Array.from(v).slice(0, IDEA_MAX).join("");
