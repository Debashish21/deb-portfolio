# Portfolio v3: design spec

**Date:** 2026-10-14
**Status:** Draft, awaiting review
**Source design:** `design-v3/portfolio-with-animated-character/project/Portfolio v3.dc.html` (Claude Design handoff)
**Brainstorm decisions:** audience, headline and scope recorded in this conversation and in memory

## 1. Goal

Rebuild the site as **one continuous page that tells Debashish's story through his own verb:
Spot it → Shape it → Ship it.** The hero lets visitors *do* the verbs, the scroll *ships* an idea into
a disc that becomes the projects carousel, and the footer hands the visitor their turn.

**Audiences:** hiring managers for PM/PO roles (they need the CV and proof) and clients (they need
to share an idea). **Success:** both find their next step within one scroll, and the site feels
crafted and memorable rather than templated.

## 2. Scope

**In**
- One scrolling page: Nav → Hero → Special Delivery transition → Projects carousel → Footer.
- The existing case-study overlay and all seven written case studies, unchanged in content.
- Download CV (a static PDF) from the nav and the footer.

**Out (for now)**
- A résumé or experience page, an About section, separate Projects/Contact screens.
- The mascot (video clips, `components/Mascot.tsx`, `public/mascot/`, `content/mascot.ts`,
  `scripts/process-mascot-clips.sh`, `docs/mascot-production.md`): removed.
- A server-side contact form (the footer uses `mailto:`; a form can come later).

**Left from the prototype on purpose:** its separate "projects" and "contact" screens, the bitmoji
"bye" bubble, and the placeholder "Project 01–10" discs. They predate the agreed design.

## 3. Page structure and behaviour

All measurements and colours come from the prototype unless stated. Visual tokens stay as today:
background `oklch(0.13 0.008 290)` (#07070a), text `oklch(0.96 0.006 290)`, muted
`oklch(0.74 0.01 290)`, one accent `oklch(0.72 0.19 295)` with a darker button shade, fonts Geist,
Geist Mono and Permanent Marker (footer handwriting only).

### 3.1 Nav
- Left: dot + "Debashish" (scrolls to top).
- Right: **Projects** (scrolls to the carousel in its settled, post-burn state), **Contact**
  (scrolls to the footer), pill **Download CV ↓** (label "CV ↓" under 560px), which downloads
  `/Debashish-CV.pdf`.
- Sits above the page; the active dot follows the section in view.

### 3.2 Hero ("Live verbs")
- Eyebrow **PRODUCT OWNER**; headline in three lines **Spot it. / Shape it. / Ship it.** (Geist 300,
  `clamp(48px, min(9vw,13vh), 140px)`, accent full stops); sub-line *"From an everyday annoyance to
  a product people want, with the customer, the tech and the numbers in view."*; buttons
  **See what I've shipped →** (runs the delivery, §3.3) and **Say hello** (scrolls to the footer);
  "Scroll" cue at the bottom.
- **Seven doodles** (thin hand-drawn line art, two offset stroke layers, base opacity 0.08) at the
  prototype's positions: chat bubble, receipt, lightbulb, headphones, calendar, coffee mug, sticky
  note.
- **Spot it → torch.** Hovering "Spot it" turns the cursor into a torch with a soft spotlight
  (240px). Doodles brighten with distance-based falloff and wobble when lit; once found, a doodle
  stays slightly brighter and becomes hoverable. Hovering a found doodle opens a **"Noticed" note**
  (dark card, accent border, -2° tilt, springy pop-in, one at a time). Notes:
  - chat → "Could a social app be built to give you your attention back?"
  - receipt → "Money out isn't money spent. Why does every app pretend it is?"
  - lightbulb → "Good ideas rarely show up at the desk. Mine arrive in queues."
  - headphones → "Why do lyrics live in another window, not where my eyes already are?"
  - calendar → "Why does a two-week sprint always feel like four days?"
  - coffee → "How much caffeine is 'enough'? Still collecting data."
  - sticky note → "If everything's a priority, which note survives Friday?"
- **Shape it → pencil.** Hovering turns the cursor into a pencil and morphs "Shape it" into an
  outlined, slightly rotated sketch with construction lines, a selection box with corner handles and
  a "sketch_v0.1" tag. Moving draws a rough pencil line (1.5px plus a jittered 0.7px echo) on a canvas
  over the hero. Each stroke **fades after 6s** (configurable). Total visible ink is capped at
  2400px of stroke; the oldest fades first.
- **Ship it → paper plane.** Hovering "Ship it" turns the cursor into a paper plane; the word
  whooshes off to the right with motion streaks and returns from the left (1.15s) while the plane
  flies with it. **Clicking "Ship it"** (or "See what I've shipped") runs the delivery (§3.3).
- **Touch:** tapping Spot it makes the torch roam on its own for about 4s; tapping a doodle toggles
  its note; tapping Shape it shows the sketch state briefly; drawing happens only while a finger is
  pressed on the headline (normal scrolling elsewhere). On touch devices the torch also roams once
  about 1s after load, so people discover the doodles.

### 3.3 Special Delivery (hero → projects)
A scroll-linked sequence; the same choreography plays whether the visitor scrolls or clicks.
- **Layout:** the hero is sticky inside a runway of 1.6 viewports; the projects panel is sticky
  inside a runway of 3 viewports (1.2 landing + a 0.8 "hold" where the settled projects stay pinned; scrolling that pauses near it springs into place in the direction of travel). Progress values (H = viewport height, S = scroll position):
  `u = clamp(S / 1.6H)` (flight), `v = clamp((S − 1.6H) / 1.2H)` (landing),
  `b = clamp((v − 0.12) / 0.6)` (burn), `r = smoothstep(clamp((v − 0.8) / 0.2))` (carousel reveal).
- **Flight (u):** the paper plane follows a cubic Bézier from just after "Ship it" to the hub of
  the waiting disc, rotated along the path, with a fading dotted trail (30 dots).
- **Landing:** at the start of `v` the plane shrinks, spins and fades into the hub; the hub glows.
- **Burn (b):** the waiting disc is the front project disc, shown **blank silver**. An accent laser
  ring grows from the hub to the rim; behind it the track rings darken (radial mask). The seven
  doodles, and any pencil strokes still visible as the plane nears the disc, spiral into
  the hub (1.8 turns, shrinking and fading). The disc spins up as it burns.
- **Burned:** a shimmer sweeps the disc and a "Burned" label flashes beneath it.
- **Reveal (r):** the other discs fan out from behind into the existing diagonal 3D carousel; the
  "Shipped / Projects" heading, the counter, title and controls fade up.
- **Auto-launch:** "Ship it" and "See what I've shipped" scroll the page in two legs (flight
  `1.8s`, ease-in-out-cubic; burn `2.4s`, sine), so the visitor watches the whole story. Any wheel
  or touch input cancels the auto-scroll and hands control back.
- **Reversible:** scrolling back up plays everything in reverse.

**Decision for review:** the burned disc **reveals the project's own disc art** (its screenshot) as
the laser passes, so "burning" literally writes the product onto the disc. Projects without art
burn to the dark track pattern from the prototype.

### 3.4 Projects carousel and case studies
- The existing carousel, project data and case-study overlay (lift-off intro, lens nav, diagrams,
  galleries, videos) carry over unchanged, now living inside the settled projects panel.
- Seven real projects in the current order; counter "01 / 07"; prev/next buttons, clicking a side
  disc and the arrow keys step the carousel. The mouse wheel **scrolls the page** (no wheel stepping),
  so visitors can never get trapped in the carousel on their way to the footer.

### 3.5 Footer ("Your idea's next")
- Eyebrow **YOUR TURN**; headline *"Got something bugging you? Let's ship it."*
  (`clamp(40px, 6vw, 88px)`).
- **The writable disc:** a blank silver disc (slow 40s spin) with a pen beside it. Clicking it
  (marker cursor) focuses a hidden input (max 80 characters); the text appears **handwritten in
  Permanent Marker along curved paths** on the disc (1 to 3 lines, auto-fitted), with a blinking
  accent caret. Hint "Click the disc to write" when empty.
- **Ship it →** (or Enter): the disc tilts, a paper sleeve folds over it into the plane, the plane
  flies off top-right with its trail, then `mailto:` opens with subject "An idea worth shipping" and
  the idea as the body; "Opening your mail app ✓" confirms.
- **Hiring?** → **Download CV ↓**. **Just say hi** → the email address set large; clicking copies it
  ("Copied ✓", with a fallback for browsers without the clipboard API); an accent underline draws in
  on hover.
- **Bottom bar:** "© 2026 Debashish · LinkedIn · GitHub · Bootstrapping ideas, one sprint at a time."
  and **Back to top ↑**, where the plane flies up along a curve while the page eases to the top (2s).
- **Mobile:** the disc grows while writing and the page scrolls it into view above the keyboard.

### 3.6 Reduced motion
No torch, pencil or plane cursors; doodles shown at 0.18 opacity and their notes open on hover or tap
as plain text; no flight, burn or spiral (hero fades out and the carousel fades in by scroll); "Ship
it" in the footer opens the email directly; back to top jumps.

## 4. Architecture

- **One page component** composed of focused parts, each owning its own state and refs:
  - `Hero` (verbs, doodles, notes, cursors, ink canvas)
  - `Delivery` (scroll runway, plane, trail, spiral layer, burn, reveal), which drives `DiscStage`
  - `DiscStage` (carousel discs and the burn layers; reused for the settled carousel)
  - `CaseStudy` (existing overlay, extracted from `Portfolio.tsx`)
  - `Footer` (writable disc, sleeve, mail, copy, back to top)
  - small shared pieces: `PaperPlane`, `Doodle` SVGs, a `useReducedMotion` hook, a
    `useScrollProgress` helper and a `flyAlong(bezier)` animation utility
- **Scrolling:** native document scrolling (not the prototype's inner scroll container), so browser
  chrome, keyboard scrolling and accessibility behave normally. Scroll-linked effects are written
  directly to the DOM in a single `requestAnimationFrame` painter, porting the prototype's maths; no
  React re-render per frame. No GSAP needed.
- **Content:** doodle notes, hero copy, footer copy, email, social links and timings in
  `content/site.ts`; projects stay in `content/projects/`.
- **Assets:** `public/Debashish-CV.pdf`; fonts via `next/font` (add Permanent Marker).
- **Removed:** `Mascot.tsx`, mascot content, clips, script and docs; the about/projects/contact
  screen switching in `Portfolio.tsx`; `ImageSlot` stays for disc art.

## 5. Accessibility and performance
- The headline has an accessible label; the verbs stay real text; doodle notes use `role="status"`;
  the writable disc has a labelled input; every interactive element works by keyboard (Tab to the
  verbs; Enter on "Ship it" runs the delivery).
- Cursors are decorative overlays (`aria-hidden`); the native cursor returns whenever a mode ends.
- Canvas sizes follow the device pixel ratio; animation loops stop when idle; listeners are passive
  except where scrolling must be prevented.
- Target: smooth 60fps on a mid-range laptop; Lighthouse performance 90+ on mobile.

## 6. Testing and verification
- Typecheck, lint and production build pass.
- Browser checks (desktop 1440 and phone 390): each verb's cursor and effect, notes, ink fade and
  cap, delivery by scroll and by click (forward and reverse), auto-scroll cancelled by user input,
  carousel and case study, footer write → ship → mailto, copy email, back to top, reduced motion,
  no console errors.

## 7. Open items needed from Debashish
- **Email address** (placeholder `hello@debashish.com`).
- **LinkedIn and GitHub URLs.**
- **CV PDF.**
