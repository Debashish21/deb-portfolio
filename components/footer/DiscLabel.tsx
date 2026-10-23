import { labelFontSize, lineRoom, splitLabel } from "@/lib/disc-label";

const PATHS: Record<string, string> = {
  top: "M36 70 Q100 40 164 70",
  bot: "M40 146 Q100 174 160 146",
  a: "M48 52 Q100 30 152 52",
  b: "M34 78 Q100 52 166 78",
  c: "M42 148 Q100 174 158 148",
};

/** The visitor's idea handwritten along the disc's curves. */
export default function DiscLabel({ text, placeholder, caret }: { text: string; placeholder: string; caret: boolean }) {
  const empty = !text;
  const lines = empty ? [placeholder] : splitLabel(text);
  const ids = lines.length === 3 ? ["a", "b", "c"] : ["top", "bot"];
  const room = lineRoom(lines.length);
  const fs = labelFontSize(lines);
  return (
    <svg viewBox="0 0 200 200" width="100%" height="100%" className="foot-label" aria-hidden>
      <defs>
        {Object.entries(PATHS).map(([id, d]) => (
          <path key={id} id={`fd-${id}`} d={d} />
        ))}
      </defs>
      {lines.map((l, k) => {
        const fit = Math.max(l.length, 1) * fs * 0.62 > room[k] ? { textLength: room[k], lengthAdjust: "spacingAndGlyphs" as const } : {};
        return (
          <text key={k} textAnchor="middle" style={{ fontFamily: "var(--marker)", fontSize: fs, fill: empty ? "rgba(30,28,36,.38)" : "#1c1a22" }} {...fit}>
            <textPath href={`#fd-${ids[k]}`} startOffset="50%">
              {l}
              {caret && k === lines.length - 1 && <tspan className="foot-caret">|</tspan>}
            </textPath>
          </text>
        );
      })}
    </svg>
  );
}
