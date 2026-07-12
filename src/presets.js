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
  { id: "midnight", label: "Midnight", tokens: {} },
  { id: "pennant", label: "Pennant", tokens: {} },
  { id: "mustard", label: "Mustard", tokens: {} },
  { id: "harvest", label: "Harvest", tokens: {} },
];

export function getPreset(id) {
  return STYLE_PRESETS.find((p) => p.id === id) || STYLE_PRESETS[0];
}
