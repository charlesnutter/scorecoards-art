// Layout/visualization renderers — the second axis of the design system,
// independent of color styles (src/presets.js). Every renderer consumes
// the same normalized game model and returns one self-contained <svg>.
import { renderScorecard } from "./scorecard.js";
import { renderInlay, renderTrace, renderFacet } from "./render/diamonds.js";
import { renderGeometric } from "./render/geometric.js";
import { renderMosaic } from "./render/mosaic.js";
import { renderTimeline } from "./render/timeline.js";
import {
  renderBroadside,
  renderHerald,
  renderPressbox,
  renderTabloid,
} from "./render/poster.js";
import { renderVintage } from "./render/vintage.js";
import { renderRings } from "./render/rings.js";
import { renderHomage } from "./render/homage.js";
import { renderTenCents } from "./render/tencents.js";
import { renderSpiral } from "./render/spiral.js";
import { renderFoil } from "./render/foil.js";
import { renderAgate } from "./render/agate.js";
import { renderScoreboard } from "./render/scoreboard.js";

export const RENDERERS = [
  { id: "classic", label: "Classic", render: renderScorecard },
  { id: "broadside", label: "Broadside 24×36 L", render: renderBroadside },
  { id: "herald", label: "Herald 24×36 P", render: renderHerald },
  { id: "pressbox", label: "Pressbox 18×24 P", render: renderPressbox },
  { id: "tabloid", label: "Tabloid 11×17 P", render: renderTabloid },
  { id: "vintage", label: "Vintage 17×11 L", render: renderVintage },
  { id: "tencents", label: "Ten Cents 17×11 L", render: renderTenCents },
  { id: "spiral", label: "Spiral 17×11 L", render: renderSpiral },
  { id: "foil", label: "Foil 17×11 L", render: renderFoil },
  { id: "agate", label: "Agate 11×17 P", render: renderAgate },
  { id: "scoreboard", label: "Scoreboard 24×12 L", render: renderScoreboard },
  { id: "rings", label: "Rings 18×24 P", render: renderRings },
  { id: "homage", label: "Homage 18×24 P", render: renderHomage },
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
