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
npm run dev       # local dev server; /design.html is the design harness
npm run build     # production build to dist/
npm run smoke     # node scripts/smoke.mjs <feed.json> <out.svg> [preset] —
                  # render a downloaded GUMBO feed to a styled standalone SVG
                  # node scripts/make-fixture.mjs <gamePk> <out.json> —
                  # regenerate a design-harness fixture
```

## Architecture

```
src/api.js        MLB Stats API fetchers (teams by season, schedule, live feed, editorial content)
src/normalize.js  GUMBO live feed -> minimal scorecard model (plain JSON: slots, PAs per inning,
                  linescore, scoring plays; runner advancement/runs back-filled onto each PA)
src/scorecard.js  classic renderer: model -> traditional diamond-grid <svg>
src/render/       common.js (shared helpers + at-bat categorizer) and the abstract
                  renderers: geometric.js, mosaic.js, timeline.js
src/renderers.js  layout registry — the LAYOUT axis of the design system
src/scorecard.css all scorecard presentation, driven by --sc-* variables; one block per style
src/presets.js    color styles — the STYLE axis; optional per-renderer geometry tokens
src/app.js        Alpine component wiring form state to the above
src/design.js     design-harness entry (design.html): renders fixtures, no network
src/fixtures/     normalized games checked in as harness data (9-inning and 11-inning)
src/data/mlbcolors.json  vendored official team colors (palewire/mlbcolors), keyed by abbreviation
```

## Designing scorecards

The renderer emits geometry and semantic classes only; every visual decision
lives in `src/scorecard.css` (style: colors, strokes, dashes, fonts, opacity)
and `src/presets.js` (geometry: cell size, diamond radii, decoration toggles).
A new design = one `[data-preset="<id>"]` variable block in the CSS + one
entry in `presets.js`. Nothing in the renderer changes.

Workflow: run `npm run dev` and open `/design.html`. It renders two
checked-in fixture games (a 9-inning game and an 11-inning game, so extra
innings are always visible) from local JSON with a preset and label-mode
switcher — no network, and Vite hot-reloads CSS edits on save. Restyle live
in browser dev tools, then transcribe into the preset. For free-form
aesthetic exploration, `npm run smoke <feed.json> out.svg <preset>` produces
a fully styled standalone SVG (stylesheet embedded in a `<style>` block, the
same technique poster export will use) that opens directly in Figma,
Illustrator, or Inkscape.

Design decisions worth knowing:

- **Season-aware team list.** The team dropdown is populated from
  `/api/v1/teams?sportId=1&season=YYYY` for the chosen date's season, so
  historical dates show era-correct franchises (Expos, Devil Rays, etc.).
- **Single-SVG scorecard.** The whole card is one `<svg>` document rather than
  an HTML grid of small SVGs. This makes future poster export nearly free:
  serialize the SVG for a vector file, rasterize to canvas at any DPI for PNG,
  or feed it to svg2pdf.js for vector PDF.
- **Theme scoping.** The `--sc-*` variables are defined on both the preview
  pane (`.scorecard-theme`) and the SVG root (`.sc-card`); the style picker
  flips a `data-preset` attribute on the pane, so the form column is never
  affected. Standalone SVGs (smoke script, future export) embed
  `scorecard.css` in a `<style>` block and carry `data-preset` on the root,
  rendering identically outside the page.
- **Historical coverage.** Verified working back to at least 1998 via the same
  API and pipeline (full play-by-play). Coverage should be expected to thin in
  earlier decades; Retrosheet remains the planned fallback for games the Stats
  API can't serve.

## Scorecard notation

Hits: `1B 2B 3B HR` · strikeout swinging `K`, looking `ꓘ` · walks `BB IBB` ·
outs by fielding credits (`6-3`, `F7`, `L9`, `P4`, `3U`) · `E5 FC SF8 SAC HBP CI`.
Solid diamond path = bases reached, including advancement caused by later
plays; shaded diamond = scored; circled red number = which out; gold dots =
RBIs. Pinch runners are the one gap: a run scored by a replacement runner is
not traced back to the original batter's cell.

## Layouts

Seven renderers share the same normalized model and style system.
Diamond-grid family (boxed cells, dashed diamonds, traced base paths):

- **Classic** — traditional: play codes, fielding credits, out numbers, RBI dots
- **Inlay** — diamond + base path kept, the text code replaced by a small
  geometric glyph (circle = hit sized by bases, half-disc walk, × K, wedge out)
- **Trace** — path marks only: colored base paths (ink hit / sage walk /
  dashed reach), × at home for strikeouts, outs as a stub cut short by a tick
- **Facet** — the diamond itself is the datum: quadrants fill with bases
  reached, quilt-style; ring = scored

Freer poster layouts:

- **Geometric** — floating Bauhaus glyphs, hairline rules, no boxes
- **Mosaic** — one colored pip per at-bat, dot-matrix poster style
- **Timeline** — rounded bars per batter, length = how far they got

Color styles: Classic, Monochrome, Blueprint, Midnight, Pennant, Mustard,
Harvest. Poster styles set display faces via `--sc-font-display`:
Jost (Bauhaus/Futura homage), Space Grotesk, and Oswald.

## Roadmap

- Poster export: SVG download, high-DPI PNG via canvas, vector PDF via svg2pdf.js + jsPDF
- Team-color styling using `src/data/mlbcolors.json` (defunct franchises need a fallback palette)
- Textures/raster art inside the SVG (`<pattern>` fills, `<image>` with data URIs, `feTurbulence` paper grain)
- Retrosheet ingestion for games predating Stats API play-by-play coverage
