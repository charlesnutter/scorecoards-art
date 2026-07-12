// Layout/visualization renderers — the second axis of the design system,
// independent of color styles (src/presets.js). Every renderer consumes
// the same normalized game model and returns one self-contained <svg>.
import { renderScorecard } from "./scorecard.js";
import { renderInlay, renderTrace, renderFacet } from "./render/diamonds.js";
import { renderGeometric } from "./render/geometric.js";
import { renderMosaic } from "./render/mosaic.js";
import { renderTimeline } from "./render/timeline.js";

export const RENDERERS = [
  { id: "classic", label: "Classic", render: renderScorecard },
  { id: "inlay", label: "Inlay", render: renderInlay },
  { id: "trace", label: "Trace", render: renderTrace },
  { id: "facet", label: "Facet", render: renderFacet },
  { id: "geometric", label: "Geometric", render: renderGeometric },
  { id: "mosaic", label: "Mosaic", render: renderMosaic },
  { id: "timeline", label: "Timeline", render: renderTimeline },
];

export function getRenderer(id) {
  return RENDERERS.find((r) => r.id === id) || RENDERERS[0];
}
