# MLB Scorecard

Generates a traditional paper-style baseball scorecard for any MLB game,
drawn as a single SVG, with data pulled live from the public MLB Stats API.

## Stack

- [Vite](https://vitejs.dev) build pipeline
- [Tailwind CSS v4](https://tailwindcss.com) (CSS-first config, `@tailwindcss/vite` plugin)
- [Alpine.js](https://alpinejs.dev) for form state and reactivity
- No other runtime dependencies; the scorecard renderer is plain string-built SVG

## Commands

```sh
npm install
npm run dev       # local dev server
npm run build     # production build to dist/
npm run smoke     # node scripts/smoke.mjs <feed.json> <out.svg> — render a
                  # downloaded GUMBO feed without a browser
```

## Architecture

```
src/api.js        MLB Stats API fetchers (teams by season, schedule, live feed, editorial content)
src/normalize.js  GUMBO live feed -> minimal scorecard model (slots, PAs per inning, linescore, scoring plays)
src/scorecard.js  model -> one self-contained <svg> string
src/app.js        Alpine component wiring form state to the above
src/data/mlbcolors.json  vendored official team colors (palewire/mlbcolors), keyed by abbreviation
```

Design decisions worth knowing:

- **Season-aware team list.** The team dropdown is populated from
  `/api/v1/teams?sportId=1&season=YYYY` for the chosen date's season, so
  historical dates show era-correct franchises (Expos, Devil Rays, etc.).
- **Single-SVG scorecard.** The whole card is one `<svg>` document rather than
  an HTML grid of small SVGs. This makes future poster export nearly free:
  serialize the SVG for a vector file, rasterize to canvas at any DPI for PNG,
  or feed it to svg2pdf.js for vector PDF.
- **Theme scoping.** All card colors are `var(--sc-*, fallback)` references.
  The variables are defined on the preview pane element (`.scorecard-theme`),
  and the classic/monochrome toggle flips a `data-theme` attribute there — the
  form column is never affected. The fallbacks mean the SVG also renders
  correctly standalone (outside the page), which the export path will rely on.
- **Historical coverage.** Verified working back to at least 1998 via the same
  API and pipeline (full play-by-play). Coverage should be expected to thin in
  earlier decades; Retrosheet remains the planned fallback for games the Stats
  API can't serve.

## Scorecard notation

Hits: `1B 2B 3B HR` · strikeout swinging `K`, looking `ꓘ` · walks `BB IBB` ·
outs by fielding credits (`6-3`, `F7`, `L9`, `P4`, `3U`) · `E5 FC SF8 SAC HBP CI`.
Solid diamond path = bases the batter reached on his own PA; shaded diamond =
scored; circled red number = which out; gold dots = RBIs. Known simplification:
advancement caused by later batters (steals, wild pitches) is not back-filled
onto the earlier batter's cell.

## Roadmap

- Poster export: SVG download, high-DPI PNG via canvas, vector PDF via svg2pdf.js + jsPDF
- Team-color styling using `src/data/mlbcolors.json` (defunct franchises need a fallback palette)
- Textures/raster art inside the SVG (`<pattern>` fills, `<image>` with data URIs, `feTurbulence` paper grain)
- Retrosheet ingestion for games predating Stats API play-by-play coverage
