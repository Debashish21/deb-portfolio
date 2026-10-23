# Debashish — Portfolio

Next.js implementation of the Claude Design file `Portfolio with animated character/Portfolio v2.dc.html`.

```bash
npm install
npm run dev
```

## Editing content

- Copy, links, doodles and timings: `content/site.ts` (email, LinkedIn, GitHub, CV path)
- Case studies: one file per project in `content/projects/`, ordered in `content/projects/index.ts`
- Replace `public/Debashish-CV.pdf` with the real CV

## Adding assets (later)

Drop files into `public/` and reference them from `content/portfolio.ts`:

- **Disc screenshots**: set `disc` in a project's file, e.g. `"/projects/airlyrics.png"` (square works best).
- **Case-study videos**: set `video` in a project's file, e.g. `"/projects/airlyrics.mp4"`.

Any asset left unset shows its placeholder.

The AirLyrics, AirLyrics × LED and ADO Sprint Planner assets in `public/projects/` are generated from those repos by `scripts/build-project-assets.py` (needs ffmpeg and the AirLyrics spike's Python venv). Projects can also set `poster` (video still), `cover` (16:9 hero image when there's no video) and `gallery` blocks.

## Structure

- `components/Portfolio.tsx`: the single page (nav, hero, projects, footer, case study)
- `components/hero/Hero.tsx`: "Spot it. Shape it. Ship it." live verbs
- `components/delivery/Delivery.tsx`: the scroll-linked paper-plane → burn → carousel sequence
- `components/DiscStage.tsx`, `components/CaseStudy.tsx`: projects carousel and case-study overlay
- `components/footer/Footer.tsx`: "Your idea's next" footer
- `lib/`: pure, unit-tested maths (`npm test`)
