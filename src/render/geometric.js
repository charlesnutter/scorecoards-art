// "Geometric" — the classic grid, but each at-bat is a Bauhaus-style
// glyph instead of a diamond + scribbled code. Encoding:
//   hit   filled circle, radius grows with bases (1B < 2B < 3B)
//   HR    large disc in the home-run color
//   walk  half-disc (gate half open)
//   K     thin ×
//   out   quarter-circle wedge
//   reach outline circle (error, fielder's choice)
//   run   thin ring around whatever glyph scored
import { text, categorize, header, linescore, slotLabel, maxSlot, legend, svgShell } from "./common.js";

const TOKENS = {
  cell: 56,
  labelWidth: 180,
  pad: 24,
  titleSize: 15,
};

function glyph(pa, cx, cy, scale = 1) {
  const parts = [];
  const cat = categorize(pa);
  const s = (v) => v * scale;
  let ringR = 0;

  switch (cat) {
    case "hr":
      parts.push(`<circle class="sc-g-hr" cx="${cx}" cy="${cy}" r="${s(16)}"/>`);
      ringR = s(16);
      break;
    case "hit": {
      const r = s([0, 6, 9, 12][pa.base] || 6);
      parts.push(`<circle class="sc-g-hit" cx="${cx}" cy="${cy}" r="${r}"/>`);
      ringR = r;
      break;
    }
    case "walk": {
      const r = s(9);
      parts.push(
        `<path class="sc-g-walk" d="M${cx - r},${cy} A${r} ${r} 0 0 1 ${cx + r},${cy} Z"/>`
      );
      ringR = r;
      break;
    }
    case "reach": {
      const r = s(7);
      parts.push(`<circle class="sc-g-reach" cx="${cx}" cy="${cy}" r="${r}"/>`);
      ringR = r;
      break;
    }
    case "k": {
      const a = s(7);
      parts.push(
        `<path class="sc-g-k" d="M${cx - a},${cy - a} L${cx + a},${cy + a} M${cx - a},${cy + a} L${cx + a},${cy - a}"/>`
      );
      ringR = a;
      break;
    }
    default: {
      // quarter wedge, opening lower-right
      const r = s(11);
      parts.push(
        `<path class="sc-g-out" d="M${cx},${cy - r / 2} L${cx + r},${cy - r / 2} A${r} ${r} 0 0 1 ${cx},${cy + r / 2} Z"/>`
      );
      ringR = r * 0.7;
    }
  }

  if (pa.scored) {
    parts.push(`<circle class="sc-g-run" cx="${cx}" cy="${cy}" r="${ringR + s(4)}"/>`);
  }
  return parts.join("");
}

function teamGrid(side, teamMeta, homeAway, innings, labelMode, y0, T) {
  const parts = [];
  const slotCount = maxSlot(side);
  const gridX = T.pad + T.labelWidth;
  const gridW = innings * T.cell;

  parts.push(
    text(T.pad, y0 + 12, `${teamMeta.name.toUpperCase()} — ${homeAway}`, "sc-team-name", 11, "start")
  );
  const headY = y0 + 22;
  for (let i = 1; i <= innings; i++) {
    parts.push(
      text(gridX + (i - 1) * T.cell + T.cell / 2, headY + 14, i, "sc-inning-num", 9)
    );
  }

  const gridY = headY + 20;
  for (let s = 1; s <= slotCount; s++) {
    const rowY = gridY + (s - 1) * T.cell;
    // hairline row separators only — no boxed cells
    parts.push(
      `<line class="sc-rule" x1="${T.pad}" y1="${rowY}" x2="${gridX + gridW}" y2="${rowY}"/>`
    );
    parts.push(text(T.pad + 2, rowY + T.cell / 2 + 3, s, "sc-slot-num", 10, "start"));
    const players = side.slots[s];
    if (players)
      parts.push(slotLabel(players, labelMode, T.pad + 16, rowY + T.cell / 2 - 2, T.pad + T.labelWidth - 8));

    for (let i = 1; i <= innings; i++) {
      const pas = side.cells[s]?.[i];
      if (!pas?.length) continue;
      const x = gridX + (i - 1) * T.cell;
      const cy = rowY + T.cell / 2;
      if (pas.length === 1) {
        parts.push(glyph(pas[0], x + T.cell / 2, cy));
      } else {
        pas.slice(0, 2).forEach((pa, k) => {
          parts.push(glyph(pa, x + T.cell * (0.3 + 0.4 * k), cy, 0.6));
        });
      }
    }
  }
  const bottom = gridY + slotCount * T.cell;
  parts.push(
    `<line class="sc-rule" x1="${T.pad}" y1="${bottom}" x2="${gridX + gridW}" y2="${bottom}"/>`
  );
  return [parts.join(""), bottom - y0];
}

const LEGEND = [
  { swatch: `<circle class="sc-g-hit" r="5"/>`, label: "hit (size = bases)" },
  { swatch: `<circle class="sc-g-hr" r="7"/>`, label: "home run" },
  { swatch: `<path class="sc-g-walk" d="M-6,2 A6 6 0 0 1 6,2 Z"/>`, label: "walk" },
  { swatch: `<path class="sc-g-k" d="M-4,-4 L4,4 M-4,4 L4,-4"/>`, label: "strikeout" },
  { swatch: `<path class="sc-g-out" d="M0,-4 L8,-4 A8 8 0 0 1 0,4 Z"/>`, label: "out" },
  { swatch: `<circle class="sc-g-run" r="6"/>`, label: "scored" },
];

export function renderGeometric(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...TOKENS, ...tokens };
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

  const [awaySvg, awayH] = teamGrid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, y, T);
  parts.push(awaySvg);
  y += awayH + 30;

  const [homeSvg, homeH] = teamGrid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, y, T);
  parts.push(homeSvg);
  y += homeH + 24;

  parts.push(legend(LEGEND, T.pad, y));
  y += 20 + T.pad / 2;

  return svgShell(width, y, preset, parts.join(""));
}
