// Color/style presets — one axis of the design system. Each style is a
// [data-preset="<id>"] variable block in src/scorecard.css. `tokens` is
// optional per-RENDERER geometry overrides, keyed by renderer id (see
// src/renderers.js), merged over that renderer's own defaults.
//
// Palette inspirations: classic = pencil-on-paper scorebook; pennant =
// cream/royal/red win-loss posters; midnight + harvest = mid-century
// "laws of UX"-style geometric prints; mustard = Bauhaus yellow;
// blueprint = engineering drawing.

export const STYLE_PRESETS = [
  { id: "classic", label: "Classic", tokens: {} },
  { id: "mono", label: "Monochrome", tokens: {} },
  {
    id: "blueprint",
    label: "Blueprint",
    tokens: { classic: { cell: 72, diamondRadius: 22, smallRadius: 13, codeSize: 10 } },
  },
  {
    id: "marquee",
    label: "Marquee",
    // blueprint geometry plus: roomier corner margins, linescore boxed
    // beside the title, legend flush right
    tokens: {
      classic: {
        cell: 72,
        diamondRadius: 22,
        smallRadius: 13,
        codeSize: 10,
        badgeMargin: 13,
        linescorePos: "right",
        linescoreGrid: true,
        legendAlign: "end",
      },
    },
  },
  {
    id: "gameday",
    label: "Gameday",
    // Marquee duplicate for Broadside poster experiments
    tokens: {
      classic: {
        cell: 72,
        diamondRadius: 22,
        smallRadius: 13,
        codeSize: 10,
        badgeMargin: 13,
        linescorePos: "right",
        linescoreGrid: true,
        legendAlign: "end",
      },
      broadside: {
        valign: "top",
        showNotes: true,
        showPitching: true,
        teamHeaderBar: true,
        posterFrame: true,
        trimGuide: false,
      },
    },
  },
  {
    id: "keepsake",
    label: "Keepsake",
    // Gameday duplicate for keepsake-poster experiments: AT THE PARK
    // panel + personal note, bar scores, city-only names
    tokens: {
      classic: {
        cell: 72,
        diamondRadius: 22,
        smallRadius: 13,
        codeSize: 10,
        badgeMargin: 13,
        linescorePos: "right",
        linescoreGrid: true,
        legendAlign: "end",
      },
      broadside: {
        valign: "top",
        showNotes: true,
        showPitching: true,
        teamHeaderBar: true,
        posterFrame: true,
        trimGuide: false,
        parkPanel: true,
        cityNames: true,
        legendDiamondReach: true,
        gridChrome: true,
        refinedTitle: true,
      },
    },
  },
  {
    id: "vintage",
    label: "Vintage",
    // aged paper filled in by hand; pairs with the vintage renderer,
    // which draws its own sheet (see .vt-* in scorecard.css)
    tokens: { vintage: { paper: [17, 11] } },
  },
  {
    id: "ballpark",
    label: "Ballpark",
    // Vintage duplicate with a contemporary condensed-sans title, so the
    // card reads as a recent game kept by hand rather than a period piece
    tokens: { vintage: { paper: [17, 11] } },
  },
  // abstract posters: each pairs with its own layout and draws its own
  // colours from the [data-preset] block; variants via data-ground
  // hand-filled printed forms; each pairs with its own layout
  { id: "tencents", label: "Ten Cents", tokens: {} },
  { id: "spiral", label: "Spiral", tokens: {} },
  { id: "foil", label: "Foil", tokens: {} },
  // typeset cards
  { id: "agate", label: "Agate", tokens: {} },
  { id: "scoreboard", label: "Scoreboard", tokens: {} },
  { id: "rings", label: "Rings", tokens: {} },
  { id: "homage", label: "Homage", tokens: {} },
  { id: "midnight", label: "Midnight", tokens: {} },
  { id: "pennant", label: "Pennant", tokens: {} },
  { id: "mustard", label: "Mustard", tokens: {} },
  { id: "harvest", label: "Harvest", tokens: {} },
];

export function getPreset(id) {
  return STYLE_PRESETS.find((p) => p.id === id) || STYLE_PRESETS[0];
}
