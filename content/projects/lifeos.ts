import type { Project } from "../types";

export const lifeOS: Project = {
  slug: "lifeos",
  title: "LifeOS",
  tagline: "A personal chief of staff that captures, prioritises and schedules my life from a single conversation.",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "Telegram bot + web app",
  stack: ["TypeScript", "Next.js 16", "grammY", "Notion API", "Google Calendar API", "Gemini / Gemma", "Ollama", "Prisma + Postgres", "NextAuth"],
  disc: "/projects/lifeos/disc.jpg",
  links: [{ label: "GitHub", url: "https://github.com/Debashish21/LifeOS" }],
  lenses: {
    problem: {
      summary:
        "My work, side projects, finances, health and ideas lived in different apps. Capturing a thought took too many taps, and deciding what to do next needed a coach, not another list.",
      blocks: [
        {
          kind: "p",
          text: "Task apps are good at storing things and bad at judgement. They'll happily hold a dozen “important” tasks for today, let ideas pile up next to commitments, and never notice that a whole area of life, like health or relationships, has gone quiet for weeks. The calendar sits in another app entirely, so scheduling is a separate chore.",
        },
        {
          kind: "list",
          items: [
            "Capture has to be instant and in plain language, from wherever I am.",
            "Ideas, commitments and habits are different things and should be treated differently.",
            "Planning should respect energy and time of day, not just due dates.",
            "Life balance matters: work shouldn't silently crowd out everything else.",
          ],
        },
        {
          kind: "callout",
          text: "The framing that shaped everything: LifeOS is a chief of staff, not a task app.",
        },
      ],
      decisions: [
        {
          title: "Conversation as the primary interface.",
          why: "Typing “call the bank about the card tomorrow” is faster than any form. The cost is that understanding intent becomes the hardest part of the product.",
        },
        {
          title: "Keep Notion as the system of record.",
          why: "Tasks live in a Notion database I already trust and can open anywhere. LifeOS adds intelligence on top instead of asking me to migrate, at the cost of working within Notion's API limits.",
        },
      ],
    },

    product: {
      summary:
        "LifeOS started as a Telegram bot for capture and grew into a web app where an assistant plans with me, against my real calendar, with a dashboard that surfaces what needs attention.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Natural-language capture", text: "Write anything; it's cleaned into an actionable task, sorted into a life area, and typed as a commitment, an idea or a recurring habit, with no confirmation questions." },
            { title: "A chat that plans", text: "Ask what to do today, schedule deep work, or find a free slot. The assistant checks the calendar first and explains why a slot fits." },
            { title: "Time-aware behaviour", text: "Mornings focus on planning, deep-work hours keep chat minimal, evenings close loops, and late night only captures, never schedules." },
            { title: "Personal context", text: "Peak hours, working hours, protected time, working style, a daily limit on meaningful tasks, and the areas I want nudging toward." },
            { title: "Dashboard signals", text: "Active work, this week's progress and momentum, a per-area breakdown, and signals for stuck tasks, repeatedly snoozed tasks and high-value ideas not yet started." },
            { title: "Calendar and profile", text: "A week view synced with Google Calendar, a profile to tune context, Google sign-in, and a switcher between local and cloud AI models." },
          ],
        },
        {
          kind: "diagram",
          diagram: {
            title: "The day has modes",
            caption: "The same message gets a different kind of help depending on when it's sent.",
            stages: [
              { label: "Early", nodes: [{ title: "Morning planning", sub: "What's the one thing today?" }] },
              { label: "Late morning", nodes: [{ title: "Deep work", sub: "Capture fast, don't over-chat", tone: "accent" }] },
              { label: "Afternoon", nodes: [{ title: "Admin", sub: "Batch shallow tasks" }] },
              { label: "Evening", nodes: [{ title: "Wind down", sub: "Close open loops" }] },
              { label: "Night", nodes: [{ title: "Capture only", sub: "Never schedule tonight", tone: "muted" }] },
            ],
          },
        },
        {
          kind: "p",
          text: "The visual language, “Quiet Intelligence”, follows the same idea: dark-first with an equal light theme, one ember accent, life-area colours only where they help scanning, one clearly stated number over five competing ones, and motion that confirms rather than entertains.",
        },
      ],
      decisions: [
        {
          title: "A hard daily limit on meaningful tasks.",
          why: "The assistant will never schedule more than the limit I set for one day, and flags overwhelm when the list grows. It sometimes says no, which is exactly the point.",
        },
        {
          title: "Reason with frameworks, never quote them.",
          why: "Next actions, importance over urgency, deep vs shallow work and essentialism shape every suggestion, but the replies stay short and human. Less visible “smartness”, more useful advice.",
        },
      ],
    },

    engineering: {
      summary:
        "Two surfaces sharing one Notion workspace: a Telegram bot with a two-stage AI pipeline, and a Next.js app with a tool-calling agent that can read and act on tasks and the calendar.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "Telegram capture pipeline (Sprint 1)",
            stages: [
              { label: "In", nodes: [{ title: "Telegram message", sub: "Free text or a command" }], arrow: "stage 1" },
              { label: "Understand", nodes: [{ title: "Intent detection", sub: "Capture · query · unknown", tone: "accent" }], arrow: "stage 2" },
              {
                label: "Act",
                nodes: [
                  { title: "Classify + save", sub: "Area and type, deduped" },
                  { title: "Query + reply", sub: "Grouped by area" },
                  { title: "Ask", sub: "Inline buttons to disambiguate", tone: "muted" },
                ],
                arrow: "read / write",
              },
              { label: "Store", nodes: [{ title: "Notion database" }] },
            ],
          },
        },
        {
          kind: "diagram",
          diagram: {
            title: "Web agent loop",
            caption: "The model calls tools until it can answer; tool calls in one turn run in parallel.",
            stages: [
              { nodes: [{ title: "Message", sub: "Recent history + session summaries" }], arrow: "build prompt" },
              { nodes: [{ title: "Dynamic system prompt", sub: "Time mode, day mode, my context, relevant memories" }], arrow: "call" },
              { nodes: [{ title: "Model", sub: "Local or cloud, switchable", tone: "accent" }], arrow: "tool calls" },
              { nodes: [{ title: "Tools", sub: "Tasks · calendar · free slots · events" }], arrow: "answer" },
              { nodes: [{ title: "Reply", sub: "Then memory extraction in the background" }] },
            ],
            loop: "tool results go back to the model until it's done",
          },
        },
        {
          kind: "steps",
          items: [
            { title: "Tools, not descriptions", text: "The agent has a small toolset: get, create, find and complete tasks, read the calendar, find free slots, create events. The prompt insists it act through tools rather than describe what it would do." },
            { title: "Memory that stays small", text: "A lightweight model extracts durable facts in the background, like scheduling preferences or a neglected area. Only the few facts relevant to the current message are injected, so prompts never bloat." },
            { title: "Long conversations without long prompts", text: "Recent messages are kept verbatim and older ones are folded into per-session summaries." },
            { title: "Provider-agnostic", text: "A single OpenAI-compatible client layer talks to a local model or Google's models, chosen per conversation from the model switcher." },
            { title: "No duplicate tasks", text: "Each capture carries a source hash, so the same message sent twice doesn't create two tasks." },
          ],
        },
      ],
      decisions: [
        {
          title: "Keyword relevance before vector search.",
          why: "Memory facts are selected by simple keyword overlap, which is fast and dependency-free at personal scale. Embeddings wait until memory grows large enough to need them.",
        },
        {
          title: "Support a local model alongside cloud models.",
          why: "A local model keeps personal planning private and free to run. Supporting both means designing prompts and tools that work across different models, at the cost of uneven quality between them.",
        },
      ],
    },

    result: {
      summary:
        "A working personal assistant across two surfaces: instant capture on Telegram, and a web app for planning, scheduling and reflection.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Sprint 1: capture & categorisation", text: "Telegram bot with natural-language capture, an ideas inbox, task lists by area and completion commands." },
            { title: "Web app", text: "Chat with the agent, a signals dashboard, a synced calendar view and a profile for personal context." },
            { title: "Agent with real actions", text: "Creates and completes tasks and books calendar events, not just suggestions." },
            { title: "A documented design system", text: "Colour, type, motion and component rules written down, so every screen feels like one product." },
          ],
        },
        {
          kind: "p",
          text: "The project was planned in sprints, like a product backlog: capture first, because nothing else matters if capture is slow, then prioritisation, review and intelligence, each building on real use of the last.",
        },
      ],
      decisions: [
        {
          title: "Ship capture before intelligence.",
          why: "Sprint 1 only captured and categorised. It looked modest, but it fed the data every later feature depends on.",
        },
        {
          title: "Redesign once the product's character was clear.",
          why: "The “Quiet Intelligence” redesign came after the assistant's behaviour had settled, so the visuals express what it actually is. That meant living with a rougher UI for a while.",
        },
      ],
    },

    future: {
      summary: "The sprint plan continues from capture toward a genuine weekly operating rhythm.",
      blocks: [
        {
          kind: "steps",
          items: [
            { title: "Sprint 2: prioritisation & triage", text: "Use value, confidence and effort scoring with snooze patterns to recommend what to do, defer or drop." },
            { title: "Sprint 3: weekly review & scheduling", text: "A guided Friday review and Monday intentions, with important-but-not-urgent work booked into the week automatically." },
            { title: "Sprint 4: intelligence & optimisation", text: "Learn from what actually gets done: best times for deep work, realistic daily limits, and balance across life areas over months." },
          ],
        },
      ],
      decisions: [
        {
          title: "Earn autonomy gradually.",
          why: "The assistant suggests before it schedules on its own. Automation grows as trust does, at the cost of a few extra confirmations early on.",
        },
        {
          title: "Measure balance, not just throughput.",
          why: "Success is a week where neglected areas got attention, not just more tasks closed. Harder to quantify, and closer to why LifeOS exists.",
        },
      ],
    },
  },
};
