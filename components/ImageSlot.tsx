/* eslint-disable @next/next/no-img-element -- slots hold arbitrary user assets at intrinsic size */
type Props = {
  src?: string;
  alt?: string;
  placeholder?: string;
  shape?: "rounded" | "circle";
  radius?: number;
  fit?: "cover" | "contain";
};

export default function ImageSlot({ src, alt = "", placeholder, shape = "rounded", radius = 0, fit = "cover" }: Props) {
  const borderRadius = shape === "circle" ? "50%" : radius;

  if (src) {
    return (
      <div className="slot" style={{ borderRadius }}>
        <img src={src} alt={alt} draggable={false} style={{ objectFit: fit }} />
      </div>
    );
  }

  return (
    <div className={`slot slot-empty ${shape === "circle" ? "slot-circle" : ""}`} style={{ borderRadius }} aria-hidden>
      {shape !== "circle" && (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="2" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      )}
      {placeholder && <span>{placeholder}</span>}
    </div>
  );
}
