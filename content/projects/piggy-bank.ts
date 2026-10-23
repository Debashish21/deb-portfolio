import type { Project } from "../types";

export const piggyBank: Project = {
  slug: "piggy-bank",
  title: "Piggy Bank",
  tagline: "A personal finance tracker that turns bank alert emails into an honest answer to “where did my money actually go?”",
  role: "Product Owner & Builder",
  year: "2026",
  team: "Solo",
  platform: "Web app + data pipeline",
  stack: ["Python", "Gmail API", "Gemini Flash Lite", "Supabase (Postgres)", "Next.js 15", "Tailwind", "GitHub Actions", "Vercel"],
  disc: "/projects/piggy-bank/disc.jpg",
  links: [],
  lenses: {
    problem: {
      summary:
        "Banks in India don't offer individuals an API. The only complete, real-time record of my spending was the alert email the bank sends after every transaction. And every finance app I tried answered the wrong question.",
      blocks: [
        {
          kind: "p",
          text: "Most trackers lead with one number: money out. But money leaving my account isn't the same as money I spent. A credit card bill payment settles purchases that were already counted when I made them. A monthly SIP is saving, not spending. Rent shared with flatmates leaves my account in full, but only my share is mine. Add those together and the headline figure is noise.",
        },
        {
          kind: "callout",
          text: "The real question is narrower: of everything that left my account, how much did I actually spend, and how much of that was a choice I could change?",
        },
        {
          kind: "list",
          items: [
            "No bank API, so the data has to come from email, which means parsing several different alert templates reliably.",
            "Merchant names arrive raw and inconsistent, so categories need resolving before anything is useful.",
            "The tracker has to be trustworthy. A good-looking dashboard with wrong numbers is worse than having no dashboard.",
          ],
        },
      ],
      decisions: [
        {
          title: "Define the product around one question, not a feature list.",
          why: "“Where did my money go, and how much of it was my choice?” became the test for every screen. If a feature didn't help answer it, it waited.",
        },
        {
          title: "Personal infrastructure, not a product for others.",
          why: "I deliberately skipped multi-user accounts, onboarding and SaaS scaffolding. That kept every decision about one real person's money, at the cost of anything shareable for now.",
        },
      ],
    },

    product: {
      summary:
        "The product is built around one idea: separate what the bank did from what I spent, and make the part I can control the most visible number.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "Money out is not money spent",
            caption: "Every debit gets a flow type. Only expenses count as spending; the rest stay visible beside it but are never added in.",
            stages: [
              { label: "From the bank", nodes: [{ title: "Money out", sub: "Every debit alert" }], arrow: "classified as" },
              {
                label: "Flow type",
                nodes: [
                  { title: "Expense", sub: "Real consumption", tone: "accent" },
                  { title: "Transfer", sub: "Card bill payments, self-transfers", tone: "muted" },
                  { title: "Investment", sub: "SIPs and savings", tone: "muted" },
                ],
                arrow: "only expenses",
              },
              {
                label: "What I see",
                nodes: [
                  { title: "Spent", sub: "The headline", tone: "accent" },
                  { title: "Fixed vs usual flow", sub: "Commitments vs choices" },
                ],
              },
            ],
          },
        },
        {
          kind: "features",
          items: [
            { title: "Spend overview", text: "Three numbers frame the month without scrolling: what I spent, how much was fixed (rent, help at home), and my usual flow, the discretionary part I can act on." },
            { title: "Payment rails", text: "A glance at how money left: debit card, credit card and UPI side by side. The credit figure doubles as what I'm about to owe." },
            { title: "Category drill-down", text: "Tap a category to see the layer that matters, like dining out vs ordered in, or a real grocery shop vs quick-commerce apps, then the merchants behind it." },
            { title: "Review deck", text: "Unknown merchants queue up as cards. One decision labels the merchant for good, so the queue gets shorter instead of refilling every month." },
            { title: "Ledger", text: "Every transaction grouped by day, with inline edits, an All / Splits filter, and a running total that reports what the bank actually did." },
            { title: "Splits & manual expenses", text: "Record my share of a shared bill without changing the bank's amount, and add cash or other-account spending the bank never saw." },
          ],
        },
        {
          kind: "p",
          text: "The design brief I wrote for the UI was as much about boundaries as features. The app has no income data and no balance, so it never pretends to. No savings rings or income-vs-expense charts, only screens the data can honestly support.",
        },
      ],
      decisions: [
        {
          title: "The headline is spending only, and fixed vs usual flow sits right under it.",
          why: "A total alone never told me what to change. Splitting out commitments shows the one number I can actually move.",
        },
        {
          title: "Store the bank's fact and my judgement side by side.",
          why: "A split records my share next to the original amount instead of overwriting it. The Ledger and the spend view can each stay honest about what they report, at the cost of explaining two totals.",
        },
      ],
    },

    engineering: {
      summary:
        "A Python pipeline runs every night on a GitHub Actions schedule, reads new alert emails, and writes clean, deduplicated transactions to Postgres. A Next.js app reads them on the server.",
      blocks: [
        {
          kind: "diagram",
          diagram: {
            title: "Nightly ingestion pipeline",
            stages: [
              { label: "Source", nodes: [{ title: "Gmail API", sub: "Bank alerts only, OTPs excluded" }], arrow: "fetch new" },
              { label: "Parse", nodes: [{ title: "Template parser", sub: "Amount, date, mode, merchant, reference" }], arrow: "rows" },
              { label: "Clean", nodes: [{ title: "Deduplicate", sub: "Message id, bank reference, autopay pairs" }], arrow: "unique rows" },
              { label: "Enrich", nodes: [{ title: "Merchant resolution", sub: "Category + flow type", tone: "accent" }], arrow: "write" },
              { label: "Store", nodes: [{ title: "Supabase Postgres", sub: "Transactions, merchant map, run log" }], arrow: "read" },
              { label: "Use", nodes: [{ title: "Next.js app", sub: "Server Components read, Server Actions write" }] },
            ],
          },
        },
        {
          kind: "diagram",
          diagram: {
            title: "Merchant resolution chain",
            caption: "Cheapest and most certain first. AI only sees what the curated map can't answer, and its guess never becomes ground truth on its own.",
            stages: [
              { nodes: [{ title: "Seed: exact match", sub: "Human-curated merchant map" }], arrow: "miss" },
              { nodes: [{ title: "Seed: substring", sub: "Word-boundary match" }], arrow: "miss" },
              { nodes: [{ title: "AI fallback", sub: "Closed category list, cached, capped per run", tone: "accent" }], arrow: "unsure" },
              { nodes: [{ title: "Unclassified", sub: "Goes to the Review deck", tone: "muted" }] },
            ],
            loop: "a human decision in Review promotes the merchant into the seed",
          },
        },
        {
          kind: "steps",
          items: [
            { title: "Deduplication runs before resolution", text: "Duplicates are dropped before any AI call, so a re-run over the same window costs nothing and can't double-count." },
            { title: "One bad email never kills a run", text: "Parse failures are caught per email and logged, so a changed bank template skips one email instead of the whole night." },
            { title: "Narrow, evidence-based classification", text: "Only unambiguous patterns are auto-labelled as transfers or investments. Everything else defaults to expense, because a wrong “expense” is visible and fixable, while a wrong “transfer” silently hides real spending." },
            { title: "Security over convenience", text: "No database key in the browser: reads and writes go through the server, behind a single-password gate. I chose the framework version for its security fixes, not for familiarity." },
          ],
        },
      ],
      decisions: [
        {
          title: "Humans write the ground truth; machines only write guesses.",
          why: "AI suggestions live on individual transactions and never in the merchant map. One confident mistake can't spread to every future transaction.",
        },
        {
          title: "Platform first: no chart library, no UI kit until one is needed.",
          why: "Bars are plain elements, trends are inline SVG, and the modal is a native dialog. The app stays light and fast, at the cost of hand-building things a library would hand me, with a clear trigger for when to adopt one.",
        },
      ],
    },

    result: {
      summary:
        "A working personal finance tool that runs itself: transactions land automatically every night, and the app answers the question it was built for.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Automated ingestion", text: "A nightly scheduled pipeline with a self-healing overlap window, so a missed night catches up on the next run." },
            { title: "Spend, Review, Ledger, Profile", text: "Four working screens, plus public privacy and terms pages for the Google consent screen." },
            { title: "A review queue that empties", text: "Decisions made in Review feed back into the pipeline, so each merchant only needs labelling once." },
            { title: "A distinctive design", text: "A dark, high-contrast “pop” visual language with tactile buttons, designed from a written brief and then built on live data." },
          ],
        },
        {
          kind: "p",
          text: "The biggest outcome wasn't a screen. It was trust. Every spending query goes through one flow-type rule and one “my share” helper, so the number on the overview, the drill-down and the ledger all agree.",
        },
      ],
      decisions: [
        {
          title: "Gate each phase on real data before building the next.",
          why: "The dashboard waited until the pipeline had produced clean data for a full week. Slower to start, but the UI was designed around real merchants and real edge cases, not imagined ones.",
        },
        {
          title: "Manual entries made the database the only source of truth.",
          why: "Supporting cash spending means the data can no longer be rebuilt from email alone. That turned CSV export from a nice-to-have into the backup plan.",
        },
      ],
    },

    future: {
      summary: "The core loop works. What comes next makes it more complete and more resilient, not bigger.",
      blocks: [
        {
          kind: "features",
          items: [
            { title: "Trends", text: "Month-over-month views that only ever compare complete months, or equal windows. Never a half month against a whole one." },
            { title: "Splitwise push", text: "Marking a split also creates the expense in Splitwise. A one-way push with a stored sync state, so a failed push never blocks recording my share." },
            { title: "CSV export", text: "A one-tap export as the durable backup, now that manual entries exist only in the database." },
            { title: "Continuous integration", text: "Run the pipeline and web test suites on every push, so a web regression can't hide behind a healthy nightly job." },
          ],
        },
        {
          kind: "p",
          text: "Some things are parked on purpose: absence detection (“rent hasn't been paid this month”) needs a stored expectation, not just a flag, and a deeper subcategory scheme can wait until the labels need one.",
        },
      ],
      decisions: [
        {
          title: "Keep Splitwise to a one-way push.",
          why: "Reading balances and tracking repayments was left out of scope. The feature stays small and dependable, at the cost of reconciliation happening in Splitwise rather than here.",
        },
        {
          title: "Revisit sharing it with others only after months of personal use.",
          why: "Productising too early would pull decisions toward imagined users. Waiting means no growth for now, but a sharper product if and when it opens up.",
        },
      ],
    },
  },
};
