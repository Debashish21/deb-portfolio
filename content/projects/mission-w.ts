import type { Project } from "../types";

export const missionW: Project = {
  slug: "mission-w",
  title: "Mission W",
  tagline: "A phone-first GMAT practice app built around one daily habit, where every mistake becomes tomorrow's work.",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "Mobile-first web app",
  stack: ["Next.js 16", "React 19", "TypeScript", "Tailwind v4", "Supabase (Postgres, Auth, RLS)", "KaTeX", "Recharts", "Vitest", "Vercel"],
  disc: "/projects/mission-w/disc.jpg",
  links: [],
  lenses: {
    problem: {
      summary:
        "Preparing for the GMAT alongside a full-time job meant studying in short windows, mostly on my phone. The tools I had were built for long desktop sessions and for scores, not for a daily habit.",
      blocks: [
        {
          kind: "p",
          text: "Getting questions was never the hard part. The hard part was the loop around them: practising every day without friction, making sure a wrong answer comes back until it's understood, and seeing whether the effort is paying off. Most prep tools answer “what's my score?” I needed answers to “what should I do today?” and “what keeps going wrong?”",
        },
        {
          kind: "list",
          items: [
            "Study happens in 10 to 20 minute gaps, on a phone, so every flow has to work one-handed at phone width.",
            "Mistakes disappear after a test. Nothing guarantees they get revisited.",
            "Some days call for focus, other days for something lighter, but most tools offer one mode.",
            "Exam content is dense: math notation, tables, multi-part Data Insights items and long reading passages all have to render properly on a small screen.",
          ],
        },
        {
          kind: "callout",
          text: "The goal: make daily practice the easiest thing to open, and make every wrong answer turn into the next session's work automatically.",
        },
      ],
      decisions: [
        {
          title: "Design for the habit, not the session.",
          why: "Streaks, a review pool that fills itself and a dashboard of trends all exist to bring me back tomorrow, not to maximise one sitting.",
        },
        {
          title: "Keep question generation outside the app.",
          why: "Questions arrive as a daily JSON file under a strict contract, so the app stays focused on practice. The cost is an extra step each day, which the question bank later removed.",
        },
      ],
    },

    product: {
      summary:
        "The core is a tight daily loop. Around it sit three ways to practise, matched to how much energy I have that day, and a growing question bank that feeds all of them.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "The daily loop",
            caption: "Every wrong answer from any mode lands in the review pool, so the loop closes on its own.",
            stages: [
              { nodes: [{ title: "Get today's set", sub: "Upload a file or build from the bank" }], arrow: "start" },
              { nodes: [{ title: "Practise", sub: "Exam-style, no feedback until submit", tone: "accent" }], arrow: "submit" },
              { nodes: [{ title: "Reveal", sub: "Score, my choice vs correct, explanations" }], arrow: "wrong ones" },
              { nodes: [{ title: "Review pool", sub: "Redo until each one is resolved" }], arrow: "progress" },
              { nodes: [{ title: "Dashboard", sub: "Accuracy, sections, types, volume, streak" }] },
            ],
            loop: "tomorrow starts with what's still pending",
          },
        },
        {
          kind: "diagram",
          diagram: {
            title: "Three modes, three intents",
            variant: "compare",
            stages: [
              { label: "Focused", nodes: [{ title: "Practice", sub: "Count-up timer, navigate freely, reveal at the end" }] },
              { label: "Timed", nodes: [{ title: "Quiz", sub: "Countdown I set, auto-submit with a grace moment", tone: "accent" }] },
              { label: "Casual", nodes: [{ title: "Reel", sub: "Swipe feed, instant feedback, combos" }] },
            ],
          },
        },
        {
          kind: "features",
          items: [
            { title: "Exam runner", text: "One question at a time with a navigator, soft per-question timing, and a confirm before submitting with questions unanswered." },
            { title: "Reel mode", text: "A full-screen, swipe-up feed that competes with idle scrolling: tap an answer, see the result instantly, expand “why?” if needed, swipe on." },
            { title: "Quiz mode", text: "Timed practice for exam conditions, with a countdown that pauses when the app is in the background and a short “all the best” wish before every run." },
            { title: "Review pool", text: "Every wrong answer is queued automatically. Getting it right in review resolves it, and the badge in the nav keeps the backlog visible." },
            { title: "Question bank & set builder", text: "Uploads can go straight into the bank. A set builder filters by section, type and difficulty with a live match count, then picks the most useful questions." },
            { title: "Dashboard", text: "Accuracy trend, section and type breakdowns, volume and streak, with reel stats kept separate so casual play never dilutes focused-practice numbers." },
          ],
        },
        {
          kind: "p",
          text: "Gamification is deliberately gentle: a combo chip that resets softly, confetti on a correct answer, a card that shimmies on a miss instead of flashing red, and haptics where the phone supports them. Leaderboards, XP and leagues were explicitly kept out.",
        },
      ],
      decisions: [
        {
          title: "Add Reel as a second front door, not a replacement.",
          why: "Practice stays the serious, reveal-at-the-end experience. Reel is the low-effort way in on tired days. Two modes to maintain, but far more days with some practice.",
        },
        {
          title: "Smart selection over pure randomness.",
          why: "Both Reel and the set builder favour fresh questions, then pending reviews, then the least recently seen. The questions you need surface first, at the cost of a less “surprising” feed.",
        },
      ],
    },

    engineering: {
      summary:
        "A Next.js App Router app on Supabase. Server actions do the writing and authoritative grading, and the interesting logic lives in small pure modules that are unit-tested.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "How a question reaches a run",
            stages: [
              { label: "In", nodes: [{ title: "Daily JSON upload" }, { title: "Capture extension", sub: "Feeds the same bank", tone: "muted" }], arrow: "validate" },
              { label: "Check", nodes: [{ title: "Contract validator", sub: "Enums, answer in options, unique ids" }, { title: "Content hash", sub: "Dedupe across uploads" }], arrow: "upsert" },
              { label: "Store", nodes: [{ title: "Shared question bank", sub: "One copy of each question", tone: "accent" }, { title: "Per-user progress", sub: "Sessions, attempts, reviews (RLS)" }], arrow: "select" },
              { label: "Play", nodes: [{ title: "Practice · Quiz · Reel", sub: "Server re-grades on submit" }] },
            ],
          },
        },
        {
          kind: "steps",
          items: [
            { title: "A strict contract at the edge", text: "Every upload is validated before anything is saved, with clear errors for wrong enums, answers that aren't among the options, empty sets and duplicate ids." },
            { title: "Shared bank, private progress", text: "Questions are stored once and shared. Sessions, attempts and review items are scoped to each user by row-level security, so only the browser-safe key ever reaches the client." },
            { title: "Grading is never trusted to the client", text: "Reel shows correctness instantly for feel, but every answer is re-graded on the server from the stored answer key." },
            { title: "Time that means something", text: "An engaged-time timer only counts while the card is visible and the app is in the foreground, so stats reflect thinking time, not a phone left on the desk." },
            { title: "No new tables for new modes", text: "Quiz and Reel are sessions with a different mode, and best combo is derived from the order of attempts, so features shipped without schema migrations." },
            { title: "Real exam content, rendered properly", text: "Math is rendered with KaTeX, tables and HTML are sanitised, multi-part Data Insights items are grouped into single exam items, and reading passages sit beside their questions on wider screens." },
          ],
        },
        {
          kind: "p",
          text: "Each feature went through a written spec and an implementation plan before any code: feed ordering, combo logic, quiz timing and bank selection are pure functions with tests beside them. That kept the UI work thin and made later fixes, like paging through a bank that outgrew a single query, quick to verify.",
        },
      ],
      decisions: [
        {
          title: "Extend the existing exam runner instead of building a new one.",
          why: "Quiz is a third variant of the same runner with an optional time limit. One component to get right on mobile, at the cost of a slightly more general runner.",
        },
        {
          title: "Count matches on the client, select on the server.",
          why: "The set builder ships a lightweight index (section, type, difficulty) so the match count updates instantly. The real selection stays on the server, so full questions never load in bulk.",
        },
      ],
    },

    result: {
      summary:
        "A complete, phone-first practice companion, and a question bank that keeps growing from two sources.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Daily practice loop", text: "Upload, run, reveal, review, track, all usable one-handed at phone width." },
            { title: "Three practice modes", text: "Practice, Quiz and Reel, each shipped from its own spec with tests for the logic underneath." },
            { title: "A bank that compounds", text: "Uploads and the GMAT Club Capture extension feed one deduplicated bank, which powers Reel and the set builder." },
            { title: "Exam-faithful rendering", text: "Math, tables, multi-part items and reading passages display the way the real exam presents them." },
          ],
        },
        {
          kind: "p",
          text: "The product changes the shape of practice rather than adding to it. Mistakes come back on their own, and on a low-energy day there's still a two-minute way to keep the streak alive.",
        },
      ],
      decisions: [
        {
          title: "Keep reel numbers out of the quality charts.",
          why: "Casual swiping would quietly inflate or drag down accuracy trends. Separating them keeps the dashboard honest, at the cost of a second set of stats to read.",
        },
        {
          title: "Ship the bank before an adaptive engine.",
          why: "A large, clean bank with filters delivered value immediately. Smarter adaptive selection was deferred until there was enough attempt history to justify it.",
        },
      ],
    },

    future: {
      summary: "The next steps make practice adapt to me, using the attempt history the app already collects.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Adaptive sets", text: "Build sets weighted toward the sections, types and error patterns where I'm weakest." },
            { title: "Spaced repetition", text: "Bring resolved questions back at growing intervals so “resolved” means retained, not just answered once." },
            { title: "Mistake coaching", text: "Bring in the “why was that option tempting?” analysis from the capture extension, so review explains patterns, not just answers." },
            { title: "Full-section mocks", text: "A longer timed mode that mirrors a real section, for the weeks just before the exam." },
          ],
        },
      ],
      decisions: [
        {
          title: "Adaptivity before more content.",
          why: "The bank is already large. The next gain is choosing better, not adding more, so new questions take a back seat to selection quality.",
        },
        {
          title: "Stay single-user for now.",
          why: "Built for one learner, decisions stay sharp and the data model stays simple. Opening it up would mean onboarding, content rights and support I've chosen not to take on yet.",
        },
      ],
    },
  },
};
