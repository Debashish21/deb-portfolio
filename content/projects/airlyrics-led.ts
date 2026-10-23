import type { Project } from "../types";

export const airLyricsLed: Project = {
  slug: "airlyrics-led",
  title: "AirLyrics × LED",
  tagline: "The lyric beside my notch, mirrored live to a 32×32 Bluetooth LED panel on my desk.",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "macOS feature + Python daemon + BLE hardware",
  stack: ["Swift", "Unix sockets", "Python asyncio", "Bluetooth LE", "Pillow", "Bitmap fonts", "Animated GIF"],
  links: [],
  disc: "/projects/airlyrics-led/disc.jpg",
  video: "/projects/airlyrics-led/panel.mp4",
  poster: "/projects/airlyrics-led/poster.jpg",
  lenses: {
    problem: {
      summary:
        "AirLyrics put the current lyric beside the notch. The next question was whether the same line could leave the screen entirely and live on a small pixel display on the desk.",
      blocks: [
        {
          kind: "p",
          text: "A 32×32 LED panel is a harsh canvas: 1,024 pixels, no anti-aliasing, a Bluetooth link that only one device can hold, and firmware with quirks nobody documents. A lyric line has to be readable at a glance from across the desk, keep pace with the song, and look good when nothing is being sung.",
        },
        {
          kind: "list",
          items: [
            "Readability: a full lyric line rarely fits, so text has to wrap and page without losing words.",
            "Timing: pages must change in step with the song, not on a fixed clock.",
            "Isolation: the Mac app must never slow down, block or crash because a gadget on the desk is unplugged.",
            "Delight: the panel should still feel alive between lines, not just go dark.",
          ],
        },
      ],
      decisions: [
        {
          title: "Treat it as a hardware spike, run like a product.",
          why: "Each phase had a visible proof on the real panel before the next began. Slower than building the whole thing in one go, but no time was spent on a pipeline the hardware couldn't support.",
        },
        {
          title: "Strictly additive and off by default.",
          why: "With the mirror off, or the bridge not running, AirLyrics behaves exactly as before. The feature carries no risk for anyone without a panel.",
        },
      ],
    },

    product: {
      summary:
        "Turn on the mirror in AirLyrics settings, and the panel shows the same line as the notch, paged to fit and paced to the song, with a now-playing card between lines.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "De-risked in phases",
            caption: "Every phase ended with something visibly working on the physical panel.",
            stages: [
              { label: "Phase 0", nodes: [{ title: "Handshake", sub: "Find the panel safely, then connect and prove control" }], arrow: "works" },
              { label: "Phase 1", nodes: [{ title: "Render text", sub: "Crisp bitmap-font frames, wrapping and paging" }], arrow: "readable" },
              { label: "Phase 2", nodes: [{ title: "Bridge daemon", sub: "Persistent link, live lyrics from the app", tone: "accent" }], arrow: "polished" },
              { label: "Idle", nodes: [{ title: "Now-playing card", sub: "Title + animated equalizer" }] },
            ],
          },
        },
        {
          kind: "features",
          items: [
            { title: "Readable at 32×32", text: "Proper pixel fonts rather than squashed vector text, word-aware wrapping, and long words broken cleanly across rows." },
            { title: "Paced to the song", text: "Long lines are spread across pages using the time until the next lyric, so the last page lands just before the line changes." },
            { title: "Vivid but legible", text: "Each line gets a fresh gradient hue, with readability guards so colour never costs contrast." },
            { title: "A now-playing card", text: "Between lines the panel shows a play icon, the song title (gently scrolling back and forth if it's long) and a looping equalizer." },
          ],
        },
        {
          kind: "gallery",
          items: [
            { src: "/projects/airlyrics-led/lyric-1.jpg", alt: "LED panel showing 'lost in the echo tonight' in a magenta-to-red gradient", caption: "A lyric line, wrapped and coloured with a per-line gradient." },
            { src: "/projects/airlyrics-led/lyric-2.jpg", alt: "LED panel showing 'city lights' in a blue gradient", caption: "Each new line shifts hue, with a brightness floor so text stays readable." },
            { src: "/projects/airlyrics-led/lyric-3.jpg", alt: "LED panel showing a four-row line in green", caption: "Long lines wrap across rows, then page if they still don't fit." },
            { src: "/projects/airlyrics-led/idle-card.jpg", alt: "LED panel idle card with a play icon, song title and an equalizer", caption: "The now-playing idle card between lines." },
          ],
        },
        {
          kind: "p",
          text: "Every frame here comes from the bridge's own renderer, the same code that drives the physical panel.",
        },
        {
          kind: "p",
          text: "Not every idea survived contact with the hardware. Drop shadows, vignettes and a drifting starfield all looked great in mock-ups and muddy on 32×32 pixels. They were removed completely, code and settings included, and only the gradient text stayed.",
        },
      ],
      decisions: [
        {
          title: "Cut effects that didn't read on the real panel.",
          why: "Judging on hardware rather than on screen previews meant shipping less, and a cleaner result. The cost was throwing away work that looked good in isolation.",
        },
        {
          title: "Skip pages rather than flash them.",
          why: "If there isn't time to read every page before the next line, fewer pages are shown. Missing the tail of a long line is better than a flicker nobody can read.",
        },
      ],
    },

    engineering: {
      summary:
        "Two processes with a tiny contract between them: the Swift app publishes lyric events, and a Python daemon owns the Bluetooth link and everything about rendering.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "From notch to panel",
            stages: [
              { label: "AirLyrics", nodes: [{ title: "Sync engine", sub: "Active line + time to next line" }], arrow: "changes" },
              { label: "Mirror", nodes: [{ title: "LED mirror service", sub: "Off the main thread, fire-and-forget" }], arrow: "JSON lines" },
              { label: "Local", nodes: [{ title: "Unix socket", sub: "text · clear · meta · config" }], arrow: "events" },
              { label: "Bridge", nodes: [{ title: "Bridge daemon", sub: "Latest-wins, idle/active state machine, renderer", tone: "accent" }], arrow: "BLE" },
              { label: "Desk", nodes: [{ title: "32×32 LED panel", sub: "Frames for lyrics, firmware GIF for idle" }] },
            ],
          },
        },
        {
          kind: "steps",
          items: [
            { title: "A contract small enough to trust", text: "Newline-delimited JSON over a local socket with four events: show text (with a time budget), clear, now-playing metadata, and live config. Unknown fields are ignored and malformed lines skipped, so either side can evolve." },
            { title: "Latest wins, never a backlog", text: "The daemon holds a single pending slot. A burst of line changes collapses to the newest, so the panel is always current and never replays the past." },
            { title: "One persistent connection", text: "Connect once, push many frames, reconnect with backoff if the link drops. Each lyric frame reaches the panel almost instantly." },
            { title: "Let the firmware animate idle", text: "Testing showed the panel can loop GIFs on its own and switch between GIF and direct frames almost instantly. The idle card is uploaded once and played on the device, costing nothing while it runs." },
            { title: "Design around firmware quirks", text: "A fully black frame makes the panel drop out of drawing mode, so “clear” sends a near-black frame instead. Every GIF frame repaints fully, because partial frames ghost." },
          ],
        },
      ],
      decisions: [
        {
          title: "A separate daemon instead of Bluetooth inside the app.",
          why: "The Mac app never blocks on hardware, and the renderer can be iterated in Python at speed. The cost is a second process to start, which a future helper launcher will hide.",
        },
        {
          title: "Measure the hardware instead of trusting folklore.",
          why: "Community notes claimed GIFs over a tiny size fail. A dedicated spike proved this panel handles far larger ones, which unlocked the animated idle card. A day spent measuring saved a compromised design.",
        },
      ],
    },

    result: {
      summary:
        "A working end-to-end pipeline from the notch to a physical display, with an idle experience that makes the panel feel like a small product of its own.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Live lyric mirroring", text: "The panel follows the notch line by line, paged and paced to the song." },
            { title: "Now-playing idle card", text: "Track title plus a seamless looping equalizer between lines." },
            { title: "Zero impact when off", text: "Default-off toggle; the core app's behaviour is unchanged without the panel." },
            { title: "Handover-ready", text: "Every phase, protocol event, config option and hardware finding documented so the work can be picked up cold." },
          ],
        },
        {
          kind: "p",
          text: "It also became the closing beat of the AirLyrics product film: after the quiet notch reveal, the same lyric lights up in colour on the desk.",
        },
      ],
      decisions: [
        {
          title: "Document as if handing it to someone else.",
          why: "A full handover note with architecture, phase history and gotchas took real time to write. Coming back after a break, it made the project restartable in minutes.",
        },
        {
          title: "Keep exploration separate from the product.",
          why: "Background look-dev and hardware probes live in their own folders and never touch the bridge. Experiments stay cheap and the shipped path stays clean.",
        },
      ],
    },

    future: {
      summary: "The next steps make it effortless to set up and richer to watch.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "One-click setup", text: "Have AirLyrics launch and manage the bridge itself, so there's no second process to start." },
            { title: "Word-level highlights", text: "Karaoke-style emphasis on the current word, matching the roadmap for the notch strip." },
            { title: "Atmospheric backgrounds", text: "A dim, mood-matched gradient behind the text, already explored as stills, if it can stay readable on real hardware." },
            { title: "More panels", text: "Support for other sizes and devices through the same socket contract." },
          ],
        },
      ],
      decisions: [
        {
          title: "Readability gates every visual addition.",
          why: "Any new effect has to pass on the physical panel before it ships. Fewer flashy features, but nothing that turns the lyric into noise.",
        },
        {
          title: "Keep the socket contract as the stable seam.",
          why: "New panels or renderers plug in behind the same four events, so the Mac app doesn't change. That means designing every feature to fit the contract, not around it.",
        },
      ],
    },
  },
};
