// Three abstract layouts that keep the classic scorecard bones — boxed
// grid cells, dashed diamonds, solid base paths — and vary only how the
// outcome is drawn inside the cell:
//
//   Inlay  diamond + base path, with a small geometric glyph at center
//          instead of the scribbled play code
//   Trace  nothing but path marks: colored base paths, an × at home for
//          strikeouts, and outs drawn as a stub cut short with a tick
//   Facet  the diamond itself is the datum — its four quadrants fill
//          with how far the batter got, quilt-style
import {
  text,
  categorize,
  header,
  linescore,
  slotLabel,
  maxSlot,
  legend,
  svgShell,
  diamondCorners,
  diamondPathD,
  basePathD,
} from "./common.js";

const TOKENS = {
  cell: 56,
  labelWidth: 180,
  pad: 24,
  diamondRadius: 17,
  titleSize: 15,
};

// Shared grid scaffold: classic layout, pluggable cell drawer.
function teamGrid(side, teamMeta, homeAway, innings, labelMode, y0, T, drawPA) {
  const parts = [];
  const slotCount = maxSlot(side);
  const gridX = T.pad + T.labelWidth;

  parts.push(
    text(T.pad, y0 + 12, `${teamMeta.name.toUpperCase()} — ${homeAway}`, "sc-team-name", 11, "start")
  );
  const headY = y0 + 22;
  for (let i = 1; i <= innings; i++) {
    parts.push(text(gridX + (i - 1) * T.cell + T.cell / 2, headY + 14, i, "sc-inning-num", 9));
  }

  const gridY = headY + 20;
  for (let s = 1; s <= slotCount; s++) {
    const rowY = gridY + (s - 1) * T.cell;
    parts.push(text(T.pad + 2, rowY + T.cell / 2 + 3, s, "sc-slot-num", 10, "start"));
    const players = side.slots[s];
    if (players)
      parts.push(slotLabel(players, labelMode, T.pad + 16, rowY + T.cell / 2 - 2, T.pad + T.labelWidth - 8));

    for (let i = 1; i <= innings; i++) {
      const x = gridX + (i - 1) * T.cell;
      parts.push(
        `<rect class="sc-cell" x="${x}" y="${rowY}" width="${T.cell}" height="${T.cell}"/>`
      );
      const pas = side.cells[s]?.[i];
      if (!pas?.length) continue;
      const cy = rowY + T.cell / 2;
      if (pas.length === 1) {
        parts.push(drawPA(pas[0], x + T.cell / 2, cy, T.diamondRadius));
      } else {
        pas.slice(0, 2).forEach((pa, k) => {
          parts.push(drawPA(pa, x + T.cell * (0.28 + 0.44 * k), cy, T.diamondRadius * 0.58));
        });
      }
    }
  }
  return [parts.join(""), gridY + slotCount * T.cell - y0];
}

function makeRenderer(drawPA, legendItems, defaults = {}) {
  return function render(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
    const T = { ...TOKENS, ...defaults, ...tokens };
    const innings = norm.maxInning;
    const width = T.pad * 2 + T.labelWidth + innings * T.cell;
    const parts = [];
    let y = T.pad + 6;

    const [head, headH] = header(norm, T);
    parts.push(head);
    y += headH;

    const [lsSvg, lsH] = linescore(norm, y, T);
    parts.push(lsSvg);
    y += lsH + 22;

    const [awaySvg, awayH] = teamGrid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, y, T, drawPA);
    parts.push(awaySvg);
    y += awayH + 30;

    const [homeSvg, homeH] = teamGrid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, y, T, drawPA);
    parts.push(homeSvg);
    y += homeH + 24;

    parts.push(legend(legendItems, T.pad, y));
    y += 20 + T.pad / 2;

    return svgShell(width, y, preset, parts.join(""));
  };
}

/* ---------- Inlay: diamond + path + center glyph ---------- */

function inlayGlyph(pa, cx, cy, r) {
  const cat = categorize(pa);
  const s = r / 17; // glyphs sized relative to the full diamond
  switch (cat) {
    case "hr":
      return `<circle class="sc-g-hr" cx="${cx}" cy="${cy}" r="${9 * s}"/>`;
    case "hit":
      return `<circle class="sc-g-hit" cx="${cx}" cy="${cy}" r="${[0, 4, 5.5, 7][pa.base] * s || 4 * s}"/>`;
    case "walk": {
      const w = 5.5 * s;
      return `<path class="sc-g-walk" d="M${cx - w},${cy + 1} A${w} ${w} 0 0 1 ${cx + w},${cy + 1} Z"/>`;
    }
    case "reach":
      return `<circle class="sc-g-reach" cx="${cx}" cy="${cy}" r="${4.5 * s}"/>`;
    case "k": {
      const a = 4.5 * s;
      return `<path class="sc-g-k" d="M${cx - a},${cy - a} L${cx + a},${cy + a} M${cx - a},${cy + a} L${cx + a},${cy - a}"/>`;
    }
    default: {
      const w = 6 * s;
      return `<path class="sc-g-out" d="M${cx},${cy - w / 2} L${cx + w},${cy - w / 2} A${w} ${w} 0 0 1 ${cx},${cy + w / 2} Z"/>`;
    }
  }
}

function drawInlay(pa, cx, cy, r) {
  const parts = [];
  const scored = pa.scored ? " sc-diamond--scored" : "";
  parts.push(`<path class="sc-diamond${scored}" d="${diamondPathD(cx, cy, r)}"/>`);
  if (pa.base > 0)
    parts.push(`<path class="sc-basepath" d="${basePathD(cx, cy, r, pa.base)}"/>`);
  parts.push(inlayGlyph(pa, cx, cy, r));
  return parts.join("");
}

const INLAY_LEGEND = [
  { swatch: `<circle class="sc-g-hit" r="4.5"/>`, label: "hit (size = bases)" },
  { swatch: `<circle class="sc-g-hr" r="6.5"/>`, label: "home run" },
  { swatch: `<path class="sc-g-walk" d="M-5,2 A5 5 0 0 1 5,2 Z"/>`, label: "walk" },
  { swatch: `<path class="sc-g-k" d="M-4,-4 L4,4 M-4,4 L4,-4"/>`, label: "strikeout" },
  { swatch: `<path class="sc-g-out" d="M0,-3 L6,-3 A6 6 0 0 1 0,3 Z"/>`, label: "out" },
  { swatch: `<path class="sc-diamond sc-diamond--scored" d="M0,7 L7,0 L0,-7 L-7,0 Z"/>`, label: "scored" },
];

export const renderInlay = makeRenderer(drawInlay, INLAY_LEGEND);

/* ---------- Trace: path marks only ---------- */

function drawTrace(pa, cx, cy, r) {
  const cat = categorize(pa);
  const parts = [];
  const scored = pa.scored ? " sc-diamond--scored" : "";
  parts.push(`<path class="sc-diamond${scored}" d="${diamondPathD(cx, cy, r)}"/>`);

  if (pa.base > 0) {
    const cls =
      cat === "walk" ? "sc-basepath sc-basepath--walk"
      : cat === "reach" ? "sc-basepath sc-basepath--reach"
      : "sc-basepath";
    parts.push(`<path class="${cls}" d="${basePathD(cx, cy, r, pa.base)}"/>`);
  }

  if (cat === "k") {
    const a = r * 0.28;
    const ky = cy + r * 0.45; // × sits by home plate
    parts.push(
      `<path class="sc-g-k" d="M${cx - a},${ky - a} L${cx + a},${ky + a} M${cx - a},${ky + a} L${cx + a},${ky - a}"/>`
    );
  } else if (pa.out) {
    // out on the way to the next base: stub cut short with a tick
    const c = diamondCorners(cx, cy, r);
    c.push(c[0]);
    const [x1, y1] = c[Math.min(pa.base, 3)];
    const [x2, y2] = c[Math.min(pa.base, 3) + 1];
    const t = 0.45;
    const mx = x1 + (x2 - x1) * t;
    const my = y1 + (y2 - y1) * t;
    // perpendicular tick at the stub's end
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * r * 0.22;
    const py = (dx / len) * r * 0.22;
    parts.push(
      `<path class="sc-basepath-out" d="M${x1},${y1} L${mx},${my} M${mx - px},${my - py} L${mx + px},${my + py}"/>`
    );
  }
  return parts.join("");
}

const TRACE_LEGEND = [
  { swatch: `<path class="sc-basepath" d="M-6,6 L6,-6" />`, label: "hit" },
  { swatch: `<path class="sc-basepath sc-basepath--walk" d="M-6,6 L6,-6"/>`, label: "walk" },
  { swatch: `<path class="sc-basepath sc-basepath--reach" d="M-6,6 L6,-6"/>`, label: "error / FC" },
  { swatch: `<path class="sc-basepath-out" d="M-6,6 L2,-2 M-1,-5 L5,1"/>`, label: "out running" },
  { swatch: `<path class="sc-g-k" d="M-4,-4 L4,4 M-4,4 L4,-4"/>`, label: "strikeout" },
  { swatch: `<path class="sc-diamond sc-diamond--scored" d="M0,7 L7,0 L0,-7 L-7,0 Z"/>`, label: "scored" },
];

export const renderTrace = makeRenderer(drawTrace, TRACE_LEGEND);

/* ---------- Facet: quadrant-filled diamonds ---------- */

function facetQuadrants(pa, cx, cy, r) {
  const cat = categorize(pa);
  const fillCls =
    cat === "hr" ? "sc-g-hr" : cat === "walk" || cat === "reach" ? "sc-g-walk" : "sc-g-hit";
  const c = diamondCorners(cx, cy, r);
  c.push(c[0]);
  const parts = [];
  for (let q = 0; q < Math.min(pa.base, 4); q++) {
    parts.push(
      `<path class="${fillCls}" d="M${cx},${cy} L${c[q]} L${c[q + 1]} Z"/>`
    );
  }
  return parts.join("");
}

function drawFacet(pa, cx, cy, r) {
  const cat = categorize(pa);
  const parts = [];
  parts.push(`<path class="sc-diamond" d="${diamondPathD(cx, cy, r)}"/>`);
  if (pa.base > 0) parts.push(facetQuadrants(pa, cx, cy, r));
  if (cat === "k") {
    const a = r * 0.3;
    parts.push(
      `<path class="sc-g-k" d="M${cx - a},${cy - a} L${cx + a},${cy + a} M${cx - a},${cy + a} L${cx + a},${cy - a}"/>`
    );
  } else if (pa.out && pa.base === 0) {
    parts.push(`<circle class="sc-g-out" cx="${cx}" cy="${cy}" r="${r * 0.18}"/>`);
  }
  if (pa.scored)
    parts.push(`<path class="sc-f-run" d="${diamondPathD(cx, cy, r + 3.5)}"/>`);
  return parts.join("");
}

const FACET_LEGEND = [
  {
    swatch: `<g><path class="sc-diamond" d="M0,7 L7,0 L0,-7 L-7,0 Z"/><path class="sc-g-hit" d="M0,0 L0,7 L7,0 Z"/></g>`,
    label: "hit (quarters = bases)",
  },
  { swatch: `<path class="sc-g-hr" d="M0,7 L7,0 L0,-7 L-7,0 Z"/>`, label: "home run" },
  {
    swatch: `<g><path class="sc-diamond" d="M0,7 L7,0 L0,-7 L-7,0 Z"/><path class="sc-g-walk" d="M0,0 L0,7 L7,0 Z"/></g>`,
    label: "walk / reached",
  },
  { swatch: `<circle class="sc-g-out" r="2.5"/>`, label: "out" },
  { swatch: `<path class="sc-g-k" d="M-4,-4 L4,4 M-4,4 L4,-4"/>`, label: "strikeout" },
  {
    swatch: `<g><path class="sc-g-hit" d="M0,6 L6,0 L0,-6 L-6,0 Z"/><path class="sc-f-run" d="M0,9 L9,0 L0,-9 L-9,0 Z"/></g>`,
    label: "scored",
  },
];

export const renderFacet = makeRenderer(drawFacet, FACET_LEGEND);
