"use client";

import { useEffect, useState } from "react";

/**
 * First-visit intro: a "D" monogram with the accent dot while a ring draws around it, then the page.
 * Shown once per browser session and never with reduced motion. The inline script in app/layout.tsx
 * decides before the first paint (html[data-noloader] hides it), so returning visitors never see a flash.
 */
export default function Loader() {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 2150);
    return () => clearTimeout(t);
  }, []);
  if (gone) return null;
  return (
    <div className="loader" aria-hidden>
      <div className="loader-mark">
        <svg className="loader-ring" viewBox="0 0 128 128" width="128" height="128">
          <circle cx="64" cy="64" r="54" fill="none" stroke="oklch(0.26 0.01 290)" strokeWidth="1" />
          <circle className="loader-arc" cx="64" cy="64" r="54" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="340" strokeDashoffset="340" />
          <circle cx="64" cy="64" r="12" fill="none" stroke="oklch(0.32 0.01 290)" strokeWidth="1" />
        </svg>
        <span className="loader-d">D</span>
        <span className="loader-dot" />
      </div>
    </div>
  );
}
