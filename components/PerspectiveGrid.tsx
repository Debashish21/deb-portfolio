"use client";

import { useEffect, useRef } from "react";

/**
 * A faint 3D "room" of grid lines behind the whole page: four planes in perspective. The vanishing point
 * leans toward the pointer and the lines drift as you scroll, so the page feels like it has depth.
 */
export default function PerspectiveGrid({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = ref.current;
    if (!g || reduced) return;
    let raf = 0, origin = "50% 45%";
    const paint = () => {
      raf = 0;
      g.style.perspectiveOrigin = origin;
      const d = ((window.scrollY * 0.35) % 80).toFixed(1);
      g.style.setProperty("--gd", d + "px");
      g.style.setProperty("--gdn", "-" + d + "px");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
      origin = (50 - nx * 14).toFixed(2) + "% " + (45 - ny * 12).toFixed(2) + "%";
      schedule();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", schedule, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", schedule);
      g.style.perspectiveOrigin = "";
      g.style.removeProperty("--gd");
      g.style.removeProperty("--gdn");
    };
  }, [reduced]);

  return (
    <div ref={ref} className="pgrid" aria-hidden>
      <div className="pgrid-room">
        <div className="pgrid-plane" data-gp="floor" />
        <div className="pgrid-plane" data-gp="ceiling" />
        <div className="pgrid-plane" data-gp="left" />
        <div className="pgrid-plane" data-gp="right" />
      </div>
      <div className="pgrid-vignette" />
    </div>
  );
}
