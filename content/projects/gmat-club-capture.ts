import type { Project } from "../types";

export const gmatClubCapture: Project = {
  slug: "gmat-club-capture",
  title: "GMAT Club Capture",
  tagline: "A private Chrome extension that quietly archives every practice-test question I take, then helps explain why the wrong options were tempting.",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "Chrome extension (personal, unpublished)",
  stack: ["TypeScript", "Chrome MV3", "Vite", "Dexie (IndexedDB)", "Supabase", "KaTeX", "Vitest"],
  disc: "/projects/gmat-club-capture/disc.jpg",
  links: [],
  lenses: {
    problem: {
      summary:
        "Online mock tests show each question once. When the section ends, I'm left with a score, but no personal record of what I saw, what I chose, or why a wrong answer looked right in the moment.",
      blocks: [
        {
          kind: "p",
          text: "Self-study has no coach. The single most useful question after a mock is “why was that wrong option tempting?”, and a percentage can't answer it. To answer it I needed two things the test platform doesn't give back in a usable form: an archive of the questions as I saw them, and a record of my own choices and timing.",
        },
        {
          kind: "list",
          items: [
            "During a timed section, answers and explanations aren't available, so any archive starts incomplete and has to be completed later.",
            "Capture must never interfere with a live, timed exam. A bug that costs a real answer is unacceptable.",
            "The content is copyrighted, so whatever I build has to stay private to me.",
          ],
        },
        {
          kind: "callout",
          text: "An archive first, a coach second, and never a scoreboard.",
        },
      ],
      decisions: [
        {
          title: "Personal and unpublished by design.",
          why: "Loaded unpacked, never on the Chrome Web Store, with captured content kept on my own machine and private storage. It can't be shared with anyone, and that's deliberate.",
        },
        {
          title: "Explicit non-goals written down before any code.",
          why: "No answers during a live question, no score predictions, no streaks or gamification. Writing the boundaries first kept the tool on the side of learning.",
        },
      ],
    },

    product: {
      summary:
        "The extension works in the background while I take a test, completes its records afterwards, and turns them into a searchable archive and a growing body of evidence about my mistakes.",
      blocks: [
        {
          kind: "steps",
          items: [
            { title: "Capture while I test", text: "Each question is saved as it appears, with passages, tables and math intact. Nothing on the page changes." },
            { title: "Complete it afterwards", text: "When a section ends, the extension automatically fills in the correct answers and official explanations from the review pages, paced politely in the background. A manual “Backfill” button covers sessions where that didn't happen." },
            { title: "Read it back", text: "An options-page archive with search, filters and properly rendered math, plus a popup with quick counts." },
            { title: "Share with my practice app", text: "Completed questions sync into the same question bank Mission W uses, so a mock test becomes future practice material." },
            { title: "Learn from my choices", text: "It also records which option I picked and how long I took, so a wrong answer can be studied alongside the moment it happened." },
          ],
        },
        {
          kind: "p",
          text: "Accuracy alone hides the most useful signal, so time became the second axis. Each attempt falls into one of four quadrants, measured against my own usual pace for that question type:",
        },
        {
          kind: "features",
          items: [
            { title: "Fast + wrong", text: "Misread or rushed. The fix is attention, not more content." },
            { title: "Slow + wrong", text: "A genuine knowledge gap. Worth studying the concept." },
            { title: "Slow + right", text: "Fragile mastery that will crack under exam timing. Often the most actionable signal of all." },
            { title: "Fast + right", text: "Solid. Spend less time here." },
          ],
        },
      ],
      decisions: [
        {
          title: "Correctness is derived, never guessed.",
          why: "An attempt stays “unknown” until the official answer is archived, then it's compared. Unknown is never treated as wrong, at the cost of some attempts waiting a while to settle.",
        },
        {
          title: "Pace is relative to my own history, per question type.",
          why: "Reading questions and quick math have nothing in common pace-wise. A personal median with a dead band avoids labelling half of everything “slow”, but a type needs enough history before it gets a pace at all.",
        },
      ],
    },

    engineering: {
      summary:
        "A Manifest V3 extension written in TypeScript, structured so that everything fragile is isolated and everything important is testable without a browser.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "From test page to question bank",
            stages: [
              { label: "Page", nodes: [{ title: "Test in progress" }], arrow: "observe" },
              { label: "Capture", nodes: [{ title: "Content scripts", sub: "Extract question, choice and time; read-only" }], arrow: "message" },
              { label: "Local", nodes: [{ title: "IndexedDB archive", sub: "Merge rules: enrich, never downgrade", tone: "accent" }], arrow: "after section" },
              { label: "Complete", nodes: [{ title: "Backfill", sub: "Answers + explanations from review pages" }], arrow: "sync" },
              { label: "Shared", nodes: [{ title: "Question bank", sub: "Insert-only, deduped by content hash" }, { title: "Attempts", sub: "Private schema, per user" }] },
            ],
          },
        },
        {
          kind: "steps",
          items: [
            { title: "Observe, never interfere", text: "The capture layer only reads. It never alters or delays what the page sends, and every failure is swallowed, so a bug can at worst lose a record, never an answer." },
            { title: "One place for fragile selectors", text: "Every page selector lives in a single file, so a site redesign is a one-file fix rather than a hunt." },
            { title: "Merge rules that only add", text: "A record can be enriched as more information arrives but never downgraded, so a partial capture can't overwrite a complete one." },
            { title: "Sync that can't corrupt the bank", text: "Uploads are insert-only and keyed on the same content hash the practice app uses, so the first complete copy wins and nothing is lost if a sync fails halfway." },
            { title: "Golden tests against real output", text: "The export mapping is tested against a reference fixture produced by the original Python prototype, so the TypeScript port can't drift silently." },
          ],
        },
        {
          kind: "diagram",
          diagram: {
            title: "Classify, then narrate",
            caption: "Counting happens before any AI is involved. A model only ever writes about numbers that have cleared a minimum sample size.",
            stages: [
              { nodes: [{ title: "Attempts", sub: "Choice, time, question type" }], arrow: "resolve" },
              { nodes: [{ title: "Deterministic aggregation", sub: "Counts, pace vs my median, thresholds in code", tone: "accent" }], arrow: "enough data?" },
              { nodes: [{ title: "Narration", sub: "Guidance grounded in the official explanation" }, { title: "“Not enough data yet”", tone: "muted" }] },
            ],
          },
        },
      ],
      decisions: [
        {
          title: "Thresholds live in code, not in a prompt.",
          why: "Minimum attempts per topic, per type and per trend are enforced where the data is queried. A thin slice can't become a confident-sounding weakness, at the cost of the coach staying quiet early on.",
        },
        {
          title: "Aggregation in TypeScript rather than SQL.",
          why: "It runs and is tested without a database round trip, and stays portable if the analysis UI ever becomes a standalone app. The trade-off is more data moved to the client.",
        },
      ],
    },

    result: {
      summary:
        "A reliable, invisible capture tool that turns every mock test into a permanent, searchable archive and into practice material for Mission W.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Capture + backfill", text: "Complete question records, including answers and explanations, without any manual copying." },
            { title: "Archive reader", text: "Search, filter and read every question back with math and tables rendered properly." },
            { title: "Bank sync", text: "Questions flow into the shared practice bank automatically, deduplicated against everything already there." },
            { title: "Attempt tracking + aggregation", text: "My choices and timing are recorded and summarised deterministically, ready for the coaching layer." },
          ],
        },
        {
          kind: "p",
          text: "Just as important are the guardrails that held: capture is passive, sessions are never double-counted, and incomplete records stay local until they're whole.",
        },
      ],
      decisions: [
        {
          title: "Build the counting layer before the AI layer.",
          why: "Shipping deterministic aggregation first means every future AI sentence can be traced back to a number. Slower to show something “smart”, but far more trustworthy.",
        },
        {
          title: "Keep the raw capture, always.",
          why: "Parsers can be re-run over raw data, but data lost at capture is gone. Storing raw payloads costs space, and buys the freedom to fix mistakes later.",
        },
      ],
    },

    future: {
      summary: "With the evidence in place, the next layer is the coach.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Mistake classification", text: "Tag each wrong answer with one label from a fixed error taxonomy (scope trap, reversed logic, extreme language, computation error and more), with a one-line reason grounded in the official explanation." },
            { title: "Section debriefs", text: "A per-mock debrief, a trend view across mocks, and a drill-down to each wrong answer." },
            { title: "Review in Mission W", text: "Send tagged mistakes into the practice app's review pool, so the coach and the practice loop share one queue." },
          ],
        },
      ],
      decisions: [
        {
          title: "A fixed taxonomy over free-form diagnosis.",
          why: "Free-form AI feedback can't be counted and contradicts itself week to week. A fixed set of tags can be aggregated, at the cost of extending it deliberately rather than ad hoc.",
        },
        {
          title: "One AI request per section, not per question.",
          why: "Batching after backfill respects free-tier limits and keeps costs predictable. Feedback arrives after the section rather than instantly, which is fine for reflection.",
        },
      ],
    },
  },
};
