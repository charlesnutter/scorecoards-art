# Project Snapshot — MLB Scorecard

Written 2026-07-31 to let a new session pick this up cold. Read this,
then `git log --oneline --all --graph` to confirm nothing's drifted.

## What this project is

A Vite + Tailwind v4 + Alpine.js app that pulls a real MLB game from the
public MLB Stats API and renders it as an SVG scorecard/poster. No
backend — everything runs client-side, one page fetches, normalizes,
and draws.

```
npm install
npm run dev       # app at /, design harness at /design.html
npm run build     # -> dist/ (must be served, not opened as file://
                  #   — absolute /assets/ paths break under file:)
npm run preview   # serves dist/ correctly, for checking a real build
npm run smoke      node scripts/smoke.mjs <feed.json> <out.svg> [style] [layout]
```

## Branch map

```
main              — abstract layouts + Marquee style (oldest checkpoint)
poster-layout     — + paper-format layouts (Broadside/Herald/Pressbox/Tabloid), Gameday style, PNG export
scorecard-styles  — + Keepsake style, scorebook chrome, poster layout controls
team-colors       — + per-team color theming  <- HEAD, all work is here
```

Each branch was created off the previous one and is a strict superset.
`team-colors` is current; the other three are checkpoints, not
abandoned alternatives. Nothing has been merged to `main` — that's
intentional, this has all been exploratory.

**team-colors is fully committed as of this snapshot.** Latest commit:
`77b7c14 Add per-team color theming and refined title separator`.

## The architecture (why the code is shaped this way)

Two independent axes, both selected in the form:

- **Layout** (`src/renderers.js`): `classic`, `inlay`, `trace`, `facet`,
  `geometric`, `mosaic`, `timeline`, `broadside`, `herald`, `pressbox`,
  `tabloid`. Each is a pure function `(normalizedGame, options) -> svgString`.
- **Style** (`src/presets.js`): `classic`, `mono`, `blueprint`,
  `marquee`, `gameday`, `keepsake`, `midnight`, `pennant`, `mustard`,
  `harvest`. Each is CSS custom properties (`src/scorecard.css`,
  `[data-preset="..."]` blocks) plus optional per-layout geometry
  token overrides.

**Right now the form hides the Layout and Style pickers** (a
`showAllOptions: false` flag in `src/app.js`) and locks defaults to
`layoutId: "broadside"`, `presetId: "keepsake"`. All recent work has
been scoped to *only* the Broadside 24×36-landscape layout combined
with the Keepsake style — that combo is being treated as the flagship,
near-finished product, and other combinations are frozen but still
functional (flip `showAllOptions` to `true` to see them all again).

Data flow: `src/api.js` (MLB Stats API fetchers) → `src/normalize.js`
(GUMBO feed → plain-JSON model: lineups, plate-appearance grid,
linescore, pitching lines, box-score notes, game facts) →
`src/renderers.js` picks the layout function → SVG string → `x-html`
in `index.html`. `src/export.js` rasterizes the SVG to a high-res PNG
client-side (inlines webfonts as data URIs since `<img>`-rendered SVG
can't fetch external resources).

## Broadside/Keepsake feature set (built incrementally, all live)

This is the part that took most of the conversation. In rough order:

1. Exact-paper-ratio canvas (`paperCanvas()` in `poster.js`) — content
   measured first, canvas padded to the true 36:24 ratio, dashed trim
   guide + `36″ × 24″` label (trim hidden on Keepsake via a token).
2. Team header bars (translucent → later "attached" scorebook-chrome
   variant), HOME/AWAY tag at bar-right, city-only names option.
3. Bottom band: three equal columns, first column splits 50/50 into
   **Scoring Plays** (one-line synthesized: `Story HR · 1 RBI · 3-3`)
   and **Game Notes** (real MLB box-score footnotes — `HR:`, `SAC:`,
   `GIDP:`, `WP:`, `HBP:` — packed so an item never splits mid-line
   across a wrap). Pitching tables (`PITCHERS | IP H R ER BB K HR P-S`)
   for both teams. All three swappable/reorderable via form controls.
4. **AT THE PARK panel** (Keepsake only) replaces Scoring Plays: five
   labeled facts (First Pitch, Time, Attendance, Temperature,
   Conditions) plus a blank line and an optional user-typed personal
   note (`customNote` in the form).
5. Scorebook chrome (Keepsake only): boxed inning-number header row,
   ruled `#`/`BATTER`/`POS` columns, **three ruled lines per batting
   slot** — starter on line 1, substitutes below — matching real paper
   scorecards. Empty cells get a subtle darker wash
   (`--sc-cell-empty`).
6. Five independent poster-padding controls (`padTop`, `padHeader`,
   `padBar`, `padPitch`, `padBottom`) plus a Floating/Attached title-bar
   toggle, because different games produce different content heights
   and the old fixed margins either crushed content or left dead space.
7. Legend: width-aware spacing (was uneven before — fixed via a
   character-class text-width estimator in `common.js`), placeable in
   any of the three bottom columns (`legendCol`), "bases reached"
   swatch redrawn as a mini diamond-with-basepath to match the card's
   own notation.
8. Scorecard order swap (away-first/home-first), title in traditional
   case with "**at**" (not "@") in the subtitle's muted color, true
   white title text, linescore header row shares the darker cell wash.
9. **Per-team color theming** (this session, `team-colors` branch):
   `src/data/teamThemes.js` has license-safe palettes for all 30 teams
   (industry-standard colors, not MLB's proprietary Pantones — see the
   file header for sourcing rationale). `src/theme.js` derives the
   full ~20-variable `--sc-*` set from three roles (`paper`, `accent`,
   optional `accent2`/`ink`) with one formula, so every team
   automatically gets Keepsake's "dark sheet, muted lines, one pop
   color" feel without bespoke CSS. Teams with a second viable
   background (e.g. Red Sox navy *or* red) get an `altPaper` entry and
   show up as a second option. Injected as inline `style=""` on the
   SVG root so PNG exports keep the chosen colors. Form: new "Colors"
   section lists both loaded teams' palettes as swatch-preview radios,
   defaults to Keepsake's own blue.

## Known-good verified facts (don't re-derive, just trust these)

- MLB Stats API team/schedule endpoints work back to at least 1998
  (verified with a real 1998 Yankees–Expos game) and the app fetches
  era-correct team lists per season.
- All 30 teams' safe-color hex values were individually checked by
  HSL against their labels. **One real bug was found and fixed**: the
  source research mislabeled `#2F2440` (an actual violet) as Padres
  "chocolate brown" — corrected to `#4A3728`, a true brown. Every
  other flagged color turned out to be a false positive from a crude
  first-pass classifier (Astros/Giants orange, Braves red, Brewers
  muted yellow, Pirates yellow, Diamondbacks sand, Giants cream — all
  legitimate on manual RGB/HSL review).
- `dist/index.html` uses **absolute** `/assets/...` paths from Vite's
  default `base: "/"` — opening it via `file://` (double-click) 404s
  every asset silently, which looks like "no styles loaded." Always
  serve it (`npm run dev` for source, `npm run preview` for a real
  build) rather than opening the HTML file directly.
- User's standing preference: **no AI/Claude attribution in commit
  messages**, keep commit bodies succinct (bullets, not prose).

## Two fixture games (for the design harness, `/design.html`)

`src/fixtures/game-nine-innings.json` — 2025-10-01 Red Sox @ Yankees
(AL Wild Card), `src/fixtures/game-extra-innings.json` — 2025-09-20
Nationals @ Mets (11 innings). Regenerate with
`node scripts/make-fixture.mjs <gamePk> <out-path>` after any
`normalize.js` change — the smoke script and harness both read these
files directly, they're not fetched live.

## Where things were left off

The team-color system is built, tested (Red Sox, Yankees, Padres,
Cardinals rendered and visually checked), and committed. The user was
about to do a manual **failure survey**: click through team/alt-team
combinations in the running app and flag any where a dark accent on a
bright sheet (or similar) makes something unreadable — the known risk
case is dark accents (navy/royal) on the bright alt-paper variants
(e.g. Red Sox-red, Cubs-red, Rangers-red), which was flagged but not
yet fixed pending that survey. **Next step if resuming**: ask whether
that survey happened / what failed, or re-run it — likely fix is a
luminance-based rule in `theme.js`'s `buildThemeVars()` (something
like "if accent's contrast against paper is too low, fall back to
white for the badge fill"), not a per-team hack.

Beyond that, no open bugs or half-finished features — every item asked
for in this conversation was implemented, verified with a rendered
screenshot, and left in a working state.
