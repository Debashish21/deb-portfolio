// Line icons ported from the v3 prototype. All decorative; parents set aria-hidden.

const INK = "oklch(0.96 0.006 290)";
const ACC = "var(--accent)";
const DARK = "oklch(0.2 0.012 290)";
const shadow = { display: "block", overflow: "visible", filter: "drop-shadow(0 2px 4px rgba(0,0,0,.6))" } as const;

export function TorchIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" style={shadow}>
      <g transform="rotate(-45 20 20)" strokeLinejoin="round">
        <path d="M13 3 L27 3 L24 12 L16 12 Z" fill={DARK} stroke={INK} strokeWidth={1.4} />
        <line x1={14} y1={3} x2={26} y2={3} stroke={ACC} strokeWidth={2.4} strokeLinecap="round" />
        <rect x={16} y={12} width={8} height={24} rx={2} fill={DARK} stroke={INK} strokeWidth={1.4} />
        <rect x={18.5} y={17} width={3} height={5} rx={1} fill={ACC} />
      </g>
    </svg>
  );
}

export function PencilIcon() {
  return (
    <svg viewBox="0 0 32 32" width="100%" height="100%" style={shadow}>
      <g transform="rotate(45 16 16)" strokeLinejoin="round">
        <rect x={12} y={1.5} width={8} height={4} rx={1} fill={ACC} />
        <rect x={12} y={5.5} width={8} height={18.5} fill={DARK} stroke={INK} strokeWidth={1.3} />
        <path d="M12 24 L20 24 L16 30.5 Z" fill="oklch(0.85 0.03 70)" stroke={INK} strokeWidth={1.3} />
        <path d="M14.6 28.2 L17.4 28.2 L16 30.5 Z" fill={INK} />
      </g>
    </svg>
  );
}

export function PlaneIcon() {
  return (
    <svg viewBox="0 0 30 30" width="100%" height="100%" style={shadow}>
      <g strokeLinejoin="round" strokeLinecap="round">
        <path d="M3 15 L27 5 L19 27 L15 18 Z" fill={DARK} stroke={INK} strokeWidth={1.4} />
        <path d="M15 18 L27 5" fill="none" stroke={ACC} strokeWidth={1.4} />
      </g>
    </svg>
  );
}

export function PenIcon() {
  return (
    <svg viewBox="0 0 140 40" width="100%" style={{ display: "block", overflow: "visible" }}>
      <g fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 12 L96 12 Q100 12 100 16 L100 24 Q100 28 96 28 L14 28 Q10 28 10 24 L10 16 Q10 12 14 12 Z" />
        <path d="M100 14 L122 15 Q127 15 127 20 Q127 25 122 25 L100 26" style={{ stroke: ACC }} />
        <path d="M10 16 L4 18 L2 20 L4 22 L10 24" />
        <path d="M30 12 L30 28" opacity={0.5} />
        <path d="M38 20 L86 20" opacity={0.25} />
      </g>
    </svg>
  );
}

/** Hand-drawn doodle: a firm stroke plus a faint, slightly offset second pass. */
export function Doodle({ paths }: { paths: string[] }) {
  const g = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" style={{ display: "block", overflow: "visible" }}>
      <g {...g} strokeWidth={1.6}>
        {paths.map((d, k) => <path key={k} d={d} />)}
      </g>
      <g {...g} strokeWidth={0.9} opacity={0.5} transform="translate(0.9 0.6) rotate(0.8 40 40)">
        {paths.map((d, k) => <path key={k} d={d} />)}
      </g>
    </svg>
  );
}

export function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2.5 6 L5 6 L8.5 3 L8.5 13 L5 10 L2.5 10 Z" />
      <path d={on ? "M11 5.5 Q12.6 8 11 10.5 M12.8 3.8 Q15.4 8 12.8 12.2" : "M11 6 L14 10 M14 6 L11 10"} />
    </svg>
  );
}
