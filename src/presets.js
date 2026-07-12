// Design presets. Each preset is:
//   - a [data-preset="<id>"] variable block in src/scorecard.css (style)
//   - a `tokens` object here, merged over DEFAULT_TOKENS (geometry and
//     decoration toggles; see src/scorecard.js for the full token list)
// Adding a design means adding one entry here and one CSS block there.

export const DESIGN_PRESETS = [
  {
    id: "classic",
    label: "Classic",
    tokens: {},
  },
  {
    id: "mono",
    label: "Monochrome",
    tokens: {},
  },
  {
    id: "blueprint",
    label: "Blueprint",
    // roomier grid to show that geometry is per-preset too
    tokens: { cell: 72, diamondRadius: 22, smallRadius: 13, codeSize: 10 },
  },
];

export function getPreset(id) {
  return DESIGN_PRESETS.find((p) => p.id === id) || DESIGN_PRESETS[0];
}
