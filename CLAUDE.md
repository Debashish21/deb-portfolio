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
| `npm test` | ✅ 87/87 pass |

### SEO / AEO (2026-10-23)

Live at https://debashish-profile.vercel.app (`site.url` in `content/site.ts`; change it there if the domain changes).

- Full name "Debashish Ram" in title, description, nav (surname hidden under 420px), footer.
- `app/layout.tsx` metadata: canonical, Open Graph (profile), Twitter card, robots.
- `app/opengraph-image.tsx` share card; `app/robots.ts`; `app/sitemap.ts`.
- JSON-LD (Person, WebSite, ProfilePage with projects) from `lib/seo.ts`, rendered in `app/page.tsx`.
- `app/llms.txt/route.ts`: Markdown summary for AI answer engines, built from `content/`.
- `public/google47653a6a919e1e9f.html`: Google Search Console verification file. **Don't delete it**; Google re-checks it.

**Search engine setup (done 2026-10-23):**
- Google Search Console: URL-prefix property verified, `sitemap.xml` submitted (showed "Couldn't fetch" right after, a known new-property quirk; the sitemap serves 200 to Googlebot). If still failing after a few days, resubmit as `sitemap.xml?v=1`.
- Bing Webmaster Tools: imported from GSC. Manual sitemap submit hit Bing's own "unexpected error on the server side"; robots.txt advertises the sitemap so Bing finds it anyway. Retry the submit later if it isn't listed.

### Open items

**Later (agreed with owner):**
- Check GSC/Bing sitemap status went to Success; request indexing of the homepage if not done.
- Owner: add the site URL to LinkedIn (contact + Featured), GitHub profile/README and the CV.
- Optional: rename Vercel subdomain to `debashishram.vercel.app` (free) or buy a custom .com; then update `site.url` and re-add in GSC/Bing.
- Per-project pages (`/projects/[slug]`) so case-study text is crawlable and each project ranks on its own; add them to `app/sitemap.ts`.
- IndexNow for Bing (ping on deploy), worth it once there are more pages.

**Code:**
- **Next.js security advisory**: `next build` warns 16.4.0 has a known vulnerability. Upgrade with `next upgrade --agent=security`.
- Contact details (`content/site.ts`) and the CV (`public/Debashish-CV.pdf`) are real; no placeholders left.
- Vitest warns `vitest.config.ts` uses ESM in a CJS package (harmless; rename to `.mts` to silence).
- Deploy: Vercel auto-deploys `main` from `github.com/Debashish21/deb-portfolio` to https://debashish-profile.vercel.app.
