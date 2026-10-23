"use client";

import { site } from "@/content/site";
import { setSound } from "@/lib/sound";
import { useSound } from "@/hooks/useSound";
import { SoundIcon } from "./icons";

export type NavTarget = "top" | "projects" | "contact";

const [first, ...rest] = site.name.split(" ");
const last = rest.join(" ");

export default function Nav({ current, onGo }: { current: "projects" | "contact" | null; onGo: (t: NavTarget) => void }) {
  const sound = useSound();
  return (
    <div className="nav-bar">
      <nav className="nav" aria-label="Main">
        <button className="brand" onClick={() => onGo("top")}>
          <span className="brand-dot" />
          <span>
            {first}
            <span className="brand-last"> {last}</span>
          </span>
        </button>
        <div className="nav-links">
          <button className="nav-link" aria-current={current === "projects" ? "true" : undefined} onClick={() => onGo("projects")}>
            Projects
          </button>
          <button className="nav-link" aria-current={current === "contact" ? "true" : undefined} onClick={() => onGo("contact")}>
            Contact
          </button>
          <button className="nav-sound" aria-pressed={sound} aria-label="Sound" onClick={() => setSound(!sound)}>
            <SoundIcon on={sound} />
            <span className="nav-sound-label">{sound ? "Sound on" : "Sound off"}</span>
          </button>
          <a className="nav-cv" href={site.cvHref} download>
            <span className="nav-cv-long">Download CV ↓</span>
            <span className="nav-cv-short">CV ↓</span>
          </a>
        </div>
      </nav>
    </div>
  );
}
