import type { Project } from "../types";

export const airLyrics: Project = {
  slug: "airlyrics",
  title: "AirLyrics",
  tagline: "Synced lyrics that live in the empty space beside the MacBook notch: there when the music is, gone when it isn't.",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "macOS menu-bar app",
  stack: ["Swift", "SwiftUI", "AppKit", "Swift Concurrency", "Combine", "CoreData", "MediaRemote", "ScriptingBridge"],
  links: [
    { label: "Product site", url: "https://debashish21.github.io/AirLyrics/" },
    { label: "GitHub", url: "https://github.com/Debashish21/AirLyrics" },
  ],
  disc: "/projects/airlyrics/disc.jpg",
  video: "/projects/airlyrics/film.mp4",
  poster: "/projects/airlyrics/poster.jpg",
  lenses: {
    problem: {
      summary:
        "Every MacBook with a notch has two slivers of menu-bar space on either side of it that do nothing. Meanwhile, following the lyrics of a song means opening a window that covers whatever I'm working on.",
      blocks: [
        {
          kind: "p",
          text: "The existing options sat at two extremes. Lyrics apps show synced lyrics but ignore the notch, living as a ticker or a floating window. Notch apps understand the hardware but compete for attention, expanding into panels on hover and animating constantly. Nobody was using the dead space beside the notch for something quietly useful.",
        },
        {
          kind: "callout",
          text: "The opportunity: synced lyrics, plus notch-aware placement, plus zero expansion. A product whose whole personality is not demanding anything from you.",
        },
        {
          kind: "list",
          items: [
            "It has to work with the two players people actually use, Spotify and Apple Music.",
            "Lyrics coverage has to go beyond English, including Hindi, Punjabi, Tamil and Telugu.",
            "It must never steal focus, intercept clicks, or appear in the Dock.",
          ],
        },
      ],
      decisions: [
        {
          title: "Restraint is the product.",
          why: "The guiding principle was “invisible until useful”. Every feature that made the strip louder, bigger or clickable was out of scope for the first release.",
        },
        {
          title: "Direct distribution instead of the Mac App Store.",
          why: "Reading what's playing reliably needs system interfaces the App Store doesn't allow. Shipping as a direct download keeps the experience right, at the cost of a less familiar install step.",
        },
      ],
    },

    product: {
      summary:
        "One lyric line at a time, sitting beside the notch, in sync with the song. That's the whole interface, and every behaviour around it is about staying out of the way.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "Invisible until useful",
            variant: "compare",
            caption: "The strip has no empty state. It never says “no lyrics found”; it simply isn't there.",
            stages: [
              { label: "Playing + lyrics", nodes: [{ title: "Line shown", sub: "Current line beside the notch", tone: "accent" }] },
              { label: "Paused", nodes: [{ title: "Dimmed", sub: "The line stays, quietly" }] },
              { label: "Nothing to show", nodes: [{ title: "Hidden", sub: "No placeholder, no message", tone: "muted" }] },
            ],
          },
        },
        {
          kind: "features",
          items: [
            { title: "Notch-aware placement", text: "Lyrics sit in the unused space left and right of the notch, sized to fit each MacBook model." },
            { title: "Line-level sync", text: "The current line follows the song precisely, including after seeking or skipping." },
            { title: "Marquee for long lines", text: "Lines that don't fit scroll smoothly, timed to finish before the next line arrives." },
            { title: "Spotify + Apple Music", text: "Both players supported, with automatic switching to whichever one changed track most recently." },
            { title: "Wide language coverage", text: "Multiple lyric sources in a fallback chain, covering English and Western catalogues as well as Indian languages." },
            { title: "Settings that respect focus", text: "Font size, opacity, launch at login, and a per-app disable list, so lyrics vanish during presentations or calls." },
          ],
        },
        {
          kind: "p",
          text: "The launch came with a product website, a screenshot set and a short product film. The film opens on an empty menu bar, a single lyric resolves beside the notch, and it ends on the wordmark: the restraint is the closing argument.",
        },
      ],
      decisions: [
        {
          title: "No hover, no click, no expansion in version one.",
          why: "A click-through overlay can never get in the way of real work. It also means no quick controls on the strip itself, which I deferred on purpose.",
        },
        {
          title: "A per-app disable list instead of a global toggle.",
          why: "People want lyrics while coding but not while screen-sharing. Disabling by app handles that automatically, at the cost of one more settings concept.",
        },
      ],
    },

    engineering: {
      summary:
        "A native Swift app with a strict layered architecture: adapters talk to the outside world, the core knows nothing about it, and the UI only renders state.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "Architecture layers",
            stages: [
              { label: "Sources", nodes: [{ title: "Spotify" }, { title: "Apple Music" }, { title: "Lyrics services", tone: "muted" }], arrow: "talk to" },
              { label: "Adapters", nodes: [{ title: "Now-playing stream", sub: "Push events" }, { title: "Music.app polling", sub: "Precise position" }, { title: "Lyrics provider chain" }], arrow: "events" },
              { label: "Arbitration", nodes: [{ title: "Source arbiter", sub: "One unified stream", tone: "accent" }], arrow: "state" },
              { label: "Core", nodes: [{ title: "Player state machine" }, { title: "Lyrics sync engine" }], arrow: "publish" },
              { label: "UI", nodes: [{ title: "Notch strip" }, { title: "Menu bar + settings" }] },
            ],
          },
        },
        {
          kind: "diagram",
          diagram: {
            title: "One song, start to finish",
            stages: [
              { nodes: [{ title: "Track changes", sub: "Event from the player" }], arrow: "load" },
              { nodes: [{ title: "Cache", sub: "Instant on a repeat listen" }], arrow: "miss" },
              { nodes: [{ title: "Provider chain", sub: "First source with lyrics wins", tone: "accent" }], arrow: "parse" },
              { nodes: [{ title: "Sync engine", sub: "Finds the active line many times a second" }], arrow: "line" },
              { nodes: [{ title: "Notch strip", sub: "Render or marquee" }] },
            ],
          },
        },
        {
          kind: "steps",
          items: [
            { title: "Two sources, one truth", text: "A push-based now-playing stream sees both players; polling Music.app gives Apple Music its most accurate position. An arbiter merges them so the sync engine is never driven by two sources at once, and drops duplicate track events." },
            { title: "Cache first, then fall back", text: "Lyrics are cached locally, so a repeat listen is instant. On a miss, providers are tried in order and the chain stops at the first hit, keeping rate-limited sources for the songs others can't find." },
            { title: "Cheap, precise sync", text: "A fast tick uses binary search over timestamped lines to find the active one, and only publishes when the line actually changes." },
            { title: "A window that behaves like part of the menu bar", text: "A borderless, non-activating, click-through panel that joins every Space and full-screen app, positioned from the screen's safe-area insets." },
            { title: "Swappable by design", text: "Every adapter sits behind a protocol, so if a system interface changes in a future macOS release, an alternative can drop in without touching the core." },
          ],
        },
      ],
      decisions: [
        {
          title: "Isolate the risky system interface behind one adapter.",
          why: "The now-playing interface has already changed once between macOS releases. Keeping it behind a clean protocol makes a future break a one-file fix, at the cost of more abstraction up front.",
        },
        {
          title: "Order lyric providers by coverage and quota.",
          why: "Free, open sources go first and the quota-limited one goes last, so rarely-found songs still work without exhausting the daily allowance.",
        },
      ],
    },

    result: {
      summary:
        "A finished, distributable macOS app with its own product website, a release build, and a clear identity: the notch app that doesn't ask for attention.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Phase 1 and 2 shipped", text: "Notch strip, line sync and marquee, then Apple Music, more lyric sources, a settings panel and a full rename to AirLyrics." },
            { title: "Product website", text: "A launch page on GitHub Pages with screenshots and install instructions." },
            { title: "Release build", text: "Downloadable app bundle with a menu-bar presence and no Dock icon." },
            { title: "A hardware extension", text: "The same lyric line can also be mirrored to a Bluetooth LED panel. See AirLyrics × LED." },
          ],
        },
        {
          kind: "gallery",
          items: [
            { src: "/projects/airlyrics/notch-1.jpg", alt: "MacBook menu bar with the current lyric shown beside the notch while Spotify plays", caption: "On a real MacBook: the current line sits beside the notch while Spotify plays.", wide: true },
            { src: "/projects/airlyrics/notch-2.jpg", alt: "A longer lyric line filling the space to the left of the notch", caption: "Longer lines use the full flank and scroll when they run out of room.", wide: true },
            { src: "/projects/airlyrics/settings.jpg", alt: "AirLyrics settings panel with font size, opacity and launch at login", caption: "Settings: font size, opacity and launch at login." },
            { src: "/projects/airlyrics/poster.jpg", alt: "Product film frame: synced lyrics, right where the notch is", caption: "From the product film: the whole pitch in one frame." },
          ],
        },
      ],
      decisions: [
        {
          title: "Phase the scope ruthlessly.",
          why: "Phase 1's bar was “lyrics appear correctly beside the notch for Spotify”. Apple Music, more providers and settings came only after that held. A smaller first release, but one that was solid.",
        },
        {
          title: "Keep internal names that are load-bearing.",
          why: "The rename to AirLyrics didn't touch the on-disk project or local cache names, because renaming them risked silently losing cached lyrics. A little inconsistency in the source, in exchange for no regressions.",
        },
      ],
    },

    future: {
      summary: "The roadmap adds richness without breaking the restraint.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Word-level karaoke fill", text: "Highlight the current word as it's sung, where word timings are available." },
            { title: "Translations", text: "An optional translated line for songs in languages I don't speak." },
            { title: "Non-notch Macs", text: "A thin strip just below the menu bar for external displays and older MacBooks." },
            { title: "Easier install", text: "A notarised download and a Homebrew cask, so updates are one command." },
          ],
        },
      ],
      decisions: [
        {
          title: "Interactions on the strip come last.",
          why: "Hover and click would make AirLyrics more capable, but less invisible. They stay behind everything else on the roadmap.",
        },
        {
          title: "Battery-aware syncing.",
          why: "On battery, the sync tick should slow down or schedule the next line change exactly. Slightly more complex timing, in exchange for an app that's safe to leave running all day.",
        },
      ],
    },
  },
};
