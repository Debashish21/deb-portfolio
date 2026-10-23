@AGENTS.md

# Debashish — Portfolio

Single-page portfolio for a Product Owner: Nav → Hero "live verbs" → Special Delivery (paper plane → burn) → 3D disc carousel → "Your idea's next" footer. Headline: "Spot it. Shape it. Ship it."

- **Stack:** Next.js 16.4 (App Router), React 19.3, TypeScript, plain CSS (`app/styles/`), Vitest for pure logic. No animation library.
- **Spec:** `docs/superpowers/specs/2026-10-14-portfolio-v3-design.md`
- **Plan:** `docs/superpowers/plans/2026-10-14-portfolio-v3.md`
- **Design source:** `design-v3/portfolio-with-animated-character/project/Portfolio v3.dc.html` (older v2 in `Portfolio with animated character/`)

## Commands

```bash
npm run dev     # local dev server
npm run build   # production build (static export of /)
npm run lint
npm test        # vitest, lib/ only
npx tsc --noEmit
```

## Conventions

- Scroll-linked motion is computed by pure functions in `lib/` and applied by one `requestAnimationFrame` painter writing to the DOM. Don't re-render React per frame.
- Every effect needs a reduced-motion path (`hooks/useReducedMotion.ts`).
- Content and copy live in `content/` (`site.ts`, `projects/*.ts`), not in components.
- Project assets in `public/projects/` come from `scripts/build-project-assets.py`.

## Progress (checked 2026-10-23)

All six plan tasks are built: lib maths + tests, page shell (nav, carousel, case study), hero live verbs (torch, doodles, shape-drawing pile), Special Delivery, footer, reduced motion/a11y.

| Check | Result |
| --- | --- |
| `tsc --noEmit` | ✅ clean |
| `npm run lint` | ✅ 0 errors; 7 warnings, all in the gitignored `.playwright-mcp/` scratch scripts |
| `npm run build` | ✅ builds, `/` prerendered static |
| `npm test` | ⚠️ 80/82 pass |

### Open items

- **Failing tests in `lib/recognize.test.ts`**: "ignores a straight line and an open zigzag" and "ignores random scribbles". `THRESHOLD` in `lib/recognize.ts` was lowered to 0.4 after the tests were written, so a zigzag scores as a star (0.497) and 20/50 random scribbles match. Decide: raise the threshold back, or update the tests to match the looser hero detection.
- **Next.js security advisory**: `next build` warns 16.4.0 has a known vulnerability. Upgrade with `next upgrade --agent=security`.
- **Placeholders to fill in** (`content/site.ts`): email `hello@debashish.com` and LinkedIn URL (GitHub is set to `Debashish21`). `public/Debashish-CV.pdf` is a placeholder; replace with the real CV.
- Vitest warns `vitest.config.ts` uses ESM in a CJS package (harmless; rename to `.mts` to silence).
- Not yet deployed.
