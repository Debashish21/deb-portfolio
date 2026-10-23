import type { Project } from "../types";

export const adoSprintPlanner: Project = {
  slug: "ado-sprint-planner",
  title: "ADO Sprint Planner",
  tagline: "A Raycast extension that turns my Azure DevOps sprint into a day-by-day plan I can actually finish.",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "Raycast extension (macOS)",
  stack: ["TypeScript", "React", "Raycast API", "Azure DevOps REST API", "Gemini (optional)"],
  links: [{ label: "GitHub", url: "https://github.com/Debashish21/ado-sprint-planner" }],
  disc: "/projects/ado-sprint-planner/disc.jpg",
  cover: "/projects/ado-sprint-planner/cover.jpg",
  lenses: {
    problem: {
      summary:
        "Azure DevOps is built around the team's board. As a Product Owner, the question I ask every morning is personal: what should I do today so my sprint commitments actually close?",
      blocks: [
        {
          kind: "p",
          text: "The board shows what's assigned and what state it's in. It doesn't show my own progress, it doesn't roll yesterday's unfinished work into today, and it only reveals that something won't fit when the sprint is already ending. Tickets outside the current sprint quietly rot because no view ever surfaces them.",
        },
        {
          kind: "list",
          items: [
            "No personal “done / total” for the sprint, just team-level states.",
            "No day-by-day view: the sprint is one undivided list of work.",
            "Spillover risk is invisible until the last day.",
            "Updating ADO's state just to track my own progress pollutes the team's board.",
          ],
        },
        {
          kind: "callout",
          text: "I wanted a personal planning layer on top of ADO: fast to open from the keyboard, honest about what fits, and careful never to write to the team's board unless I ask it to.",
        },
      ],
      decisions: [
        {
          title: "Build it where I already work: Raycast.",
          why: "A keystroke away, no browser tab, no context switch. The trade-off is macOS only, which matched how I and many developers work.",
        },
        {
          title: "Personal layer first, team board second.",
          why: "My status, deferrals and plan live only on my machine. ADO is read freely but written only on an explicit action, so trying the tool can never disrupt the team.",
        },
      ],
    },

    product: {
      summary:
        "Five commands, each answering one question in my day, from “what's in my sprint” to “what's left right now”.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "My Sprint", text: "Current-sprint items grouped by my own status, with my personal done/total in the title and a muted tag showing ADO's state." },
            { title: "My Tickets", text: "Every open item assigned to me across the project, whatever sprint or team it's in, grouped by iteration, with a Deferred shelf." },
            { title: "Plan Sprint", text: "A rolling plan across the remaining working days, with a fit summary, an “at risk of spillover” section and one-tap Defer." },
            { title: "Today's To-Do", text: "Today's slice of the plan. Unfinished work rolls into today automatically, and quick notes capture ad-hoc tasks alongside." },
            { title: "Sprint Glance", text: "A menu-bar count of what's left today, one click from any item." },
            { title: "Push to ADO, when I choose", text: "“Mark done in ADO” or “Also push” are explicit actions. Everything else stays personal." },
          ],
        },
        {
          kind: "gallery",
          items: [
            { src: "/projects/ado-sprint-planner/commands.jpg", alt: "Raycast root search listing the five Sprint Planner commands", caption: "Five commands, one keystroke away in Raycast.", wide: true },
            { src: "/projects/ado-sprint-planner/today.jpg", alt: "Today's To-Do with quick notes above the day's sprint items", caption: "Today's To-Do: quick notes plus today's slice of the plan." },
            { src: "/projects/ado-sprint-planner/my-tickets.jpg", alt: "My Tickets grouped by iteration, with backlog items and ADO states", caption: "My Tickets: every open item, whatever sprint it's in." },
            { src: "/projects/ado-sprint-planner/status.jpg", alt: "My Sprint with the Set Status dropdown open on an item", caption: "Personal status, set with Tab, without touching ADO." },
            { src: "/projects/ado-sprint-planner/quick-note.jpg", alt: "Quick Note form for capturing ad-hoc tasks", caption: "Quick notes: capture several points in one go." },
          ],
        },
        {
          kind: "diagram",
          diagram: {
            title: "What's local vs what touches ADO",
            stages: [
              {
                label: "Only on my Mac",
                nodes: [
                  { title: "My status", sub: "Not started · In progress · Done" },
                  { title: "Deferred shelf" },
                  { title: "Daily plan + quick notes" },
                ],
                arrow: "explicit push only",
              },
              { label: "Azure DevOps", nodes: [{ title: "Work items", sub: "Read always; written only when I ask", tone: "accent" }] },
            ],
          },
        },
        {
          kind: "p",
          text: "Planning is honest about capacity. Set how many items a day is realistic, and the plan spreads work at an even pace across the days left. Whatever doesn't fit is listed as at risk, never piled onto the last day. By default it also pulls in my open tickets from outside the sprint, ranked behind sprint work, so nothing rots in the backlog.",
        },
      ],
      decisions: [
        {
          title: "A rolling queue instead of fixed dates.",
          why: "Items aren't pinned to a calendar day, so unfinished work never strands on a past date. It simply rolls into today. The trade-off is that the plan shifts as I go, by design.",
        },
        {
          title: "Surface spillover early instead of hiding it.",
          why: "An explicit “at risk” section forces the conversation (defer, re-prioritise, or raise capacity) mid-sprint, when it can still change the outcome.",
        },
      ],
    },

    engineering: {
      summary:
        "TypeScript and React on the Raycast API, with planning logic kept as pure, deterministic functions, and AI allowed to influence exactly one thing: the order.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "How a plan is made",
            stages: [
              { label: "Fetch", nodes: [{ title: "ADO work items", sub: "Open states only, cached" }], arrow: "my items" },
              {
                label: "Order",
                nodes: [
                  { title: "Deterministic", sub: "In-progress → priority → Bug, Story, Task" },
                  { title: "AI (optional)", sub: "Order only, validated against real ids", tone: "muted" },
                ],
                arrow: "queue",
              },
              { label: "Project", nodes: [{ title: "Capacity × working days", sub: "Even pace, overflow kept separate", tone: "accent" }], arrow: "views" },
              { label: "Show", nodes: [{ title: "Today" }, { title: "At risk of spillover" }, { title: "Menu-bar glance" }] },
            ],
          },
        },
        {
          kind: "steps",
          items: [
            { title: "AI decides order, never the rules", text: "With a Gemini key, re-planning asks the model for a smarter sequence that keeps related items together. Its answer must be a list of ids, filtered to known items and de-duplicated, so it can't invent or drop work. Capacity, fit and spillover stay deterministic, and any failure falls back silently." },
            { title: "“Open” means what the process says", text: "Rather than hard-coding state names, the extension reads the project's state categories from ADO and caches them for a week, so it works across Agile, Scrum and custom processes, with a setting for rework states like Failed." },
            { title: "Polite to the API", text: "Responses are cached for 30 minutes, detail requests are batched within ADO's limits and sent one after another to avoid throttling, and any write clears the cache." },
            { title: "Safe across commands", text: "Raycast runs each command as its own process, so every status, deferral, note and plan rank is stored under its own key. Two commands editing different items can never overwrite each other." },
            { title: "Calendar-correct", text: "Sprint dates are treated as local calendar days, so the first and last day of a sprint never shift near midnight in other time zones." },
          ],
        },
      ],
      decisions: [
        {
          title: "Deterministic by default, AI as an opt-in.",
          why: "The default planner works offline and sends nothing anywhere. Smarter AI ordering is available with a key and a clear privacy note. Less magic out of the box, but trust from the first run.",
        },
        {
          title: "Per-item storage keys over one shared blob.",
          why: "It took a refactor during review, but it removed a whole class of lost-update bugs between commands, at the cost of a slightly more complex storage layer.",
        },
      ],
    },

    result: {
      summary:
        "A complete, polished extension with five commands, prepared and submitted for the Raycast Store, with a custom icon and store screenshots.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Five commands", text: "Sprint, tickets, planning, today and a menu-bar glance, all keyboard-first." },
            { title: "Store-ready", text: "Lint-clean against Raycast's publishing rules, with a changelog, icon and a curated screenshot set." },
            { title: "Hardened through review", text: "Store review feedback led to batched fetching, timezone-safe dates, a response cache and per-item storage." },
            { title: "Works with any process", text: "Agile, Scrum, Basic or custom: open and done states adapt to the project." },
          ],
        },
        {
          kind: "p",
          text: "Building it as a Product Owner meant the backlog was my own. Every command exists because of a real moment in a sprint, and every non-feature (no auto-writes, no dumping onto the last day) is a decision about trust.",
        },
      ],
      decisions: [
        {
          title: "Treat store review as a product gate.",
          why: "Instead of patching only what reviewers flagged, I fixed the underlying patterns: concurrency, batching, dates. Slower to publish, but far more robust in other people's hands.",
        },
        {
          title: "Remove internal docs and mock data before publishing.",
          why: "Screenshot mocks and working notes were stripped from the public repo. The published extension stays small and clean, at the cost of keeping that history elsewhere.",
        },
      ],
    },

    future: {
      summary: "The roadmap deepens planning without breaking the “personal layer” promise.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Story-point capacity", text: "Plan by effort rather than item count, for teams that estimate." },
            { title: "Parent-child clustering", text: "Group a story with its tasks and bugs, which also sharpens AI ordering." },
            { title: "Ticket detail view", text: "Read the description and acceptance criteria without leaving Raycast." },
            { title: "PRs and builds", text: "Reuse the same auth and fetch layer for pull request and pipeline views." },
          ],
        },
      ],
      decisions: [
        {
          title: "Grow outward from the sprint, not into a full ADO client.",
          why: "Each addition must help answer “what do I do today?”. That keeps the extension focused, at the cost of leaving plenty of ADO to the browser.",
        },
        {
          title: "Keep AI's role narrow even as it grows.",
          why: "Clustering will make AI ordering smarter, but guardrails stay deterministic. Predictable plans matter more than clever ones.",
        },
      ],
    },
  },
};
