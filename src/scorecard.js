// Renders a normalized game as a single self-contained <svg> string.
//
// Separation of concerns for the design system:
//   - This module emits GEOMETRY ONLY (positions, sizes, path data) plus
//     semantic sc-* classes. All presentation (color, stroke, dash, font,
//     opacity) lives in src/scorecard.css, driven by --sc-* variables.
//   - Per-preset GEOMETRY (cell size, radii, decorations) comes in through
//     the `tokens` option; see src/presets.js.
//
// The <svg> root carries class="sc-card scorecard-theme" and the active
// data-preset, so the same stylesheet applies whether the SVG sits in the
// page or is exported standalone with the CSS embedded in a <style> block.

export const DEFAULT_TOKENS = {
  cell: 64, // grid cell width/height
  labelWidth: 180, // lineup label column
  pad: 24, // outer margin
  diamondRadius: 19, // full-size diamond
  smallRadius: 11, // when 2+ PAs share a cell
  codeSize: 9.5, // play-code font size (full / small diamond)
  smallCodeSize: 7,
  titleSize: 15,
  showOutBadge: true, // circled out number, upper right
  showRbiDots: true, // one dot per RBI, lower left
  badgeMargin: 9.5, // out badge / RBI dot distance from the cell corner
  linescorePos: "top", // "top" (own row) or "right" (beside the title)
  linescoreGrid: false, // box the linescore cells like the grid
  legendAlign: "start", // "start" (left) or "end" (right edge)
};

import { esc, text, linescore, slotLabel, legend } from "./render/common.js";

export const LEGEND = [
  {
    swatch: `<text class="sc-code" font-size="8" text-anchor="middle" y="3">1B</text>`,
    label: "hit",
    w: 13,
  },
  {
    swatch: `<text class="sc-code sc-code--out" font-size="8" text-anchor="middle" y="3">6-3</text>`,
    label: "out, by fielders",
    w: 19,
  },
  { swatch: `<path class="sc-basepath" d="M-6,6 L6,-6"/>`, label: "bases reached", w: 12 },
  {
    swatch: `<path class="sc-diamond sc-diamond--scored" d="M0,7 L7,0 L0,-7 L-7,0 Z"/>`,
    label: "scored",
    w: 14,
  },
  {
    swatch: `<g><circle class="sc-out-badge" r="5"/><text class="sc-out-num" font-size="7" text-anchor="middle" y="2.5">2</text></g>`,
    label: "out number",
    w: 10,
  },
  { swatch: `<circle class="sc-rbi" r="2.5"/>`, label: "RBI", w: 5 },
];

// One plate appearance drawn as a diamond centered at (cx, cy).
// badgeAt/rbiAt override where the out badge and RBI dots sit (defaults
// hug the diamond; single-PA cells anchor them to the cell corners).
function diamond(pa, cx, cy, r, T, badgeAt, rbiAt) {
  const H = [cx, cy + r];
  const F = [cx + r, cy];
  const S = [cx, cy - r];
  const Th = [cx - r, cy];
  const corners = [H, F, S, Th, H];
  const parts = [];

  const scored = pa.scored ? " sc-diamond--scored" : "";
  parts.push(
    `<path class="sc-diamond${scored}" d="M${H} L${F} L${S} L${Th} Z"/>`
  );

  // Solid path along the bases actually reached.
  if (pa.base > 0) {
    let d = `M${corners[0]}`;
    for (let i = 1; i <= Math.min(pa.base, 4); i++) d += ` L${corners[i]}`;
    parts.push(`<path class="sc-basepath" d="${d}"/>`);
  }

  const codeSize = r > 14 ? T.codeSize : T.smallCodeSize;
  const codeCls = pa.out ? "sc-code sc-code--out" : "sc-code";
  // compound codes ("6-4-3 DP") stack the suffix on a second line so the
  // fielder sequence doesn't run past the diamond
  const [main, suffix] = pa.code.split(" ");
  if (suffix) {
    parts.push(text(cx, cy + 0.5, main, codeCls, codeSize));
    parts.push(text(cx, cy + codeSize * 1.05, suffix, codeCls, codeSize * 0.78));
  } else {
    parts.push(text(cx, cy + codeSize / 3, pa.code, codeCls, codeSize));
  }

  if (T.showOutBadge && pa.out && pa.outNumber) {
    const [ox, oy] = badgeAt || [cx + r + 4, cy - r + 2];
    parts.push(
      `<circle class="sc-out-badge" cx="${ox}" cy="${oy}" r="5.5"/>`,
      text(ox, oy + 2.5, pa.outNumber, "sc-out-num", 7)
    );
  }

  if (T.showRbiDots) {
    const [rx, ry] = rbiAt || [cx - r - 4, cy + r - 2];
    for (let i = 0; i < Math.min(pa.rbi, 4); i++) {
      parts.push(`<circle class="sc-rbi" cx="${rx}" cy="${ry - i * 7}" r="2.5"/>`);
    }
  }

  return parts.join("");
}

export function cellContents(pas, x, y, T) {
  const cx = x + T.cell / 2;
  const cy = y + T.cell / 2;
  if (pas.length === 1) {
    // out badge and RBI dots equidistant from their cell corners
    const m = T.badgeMargin;
    return diamond(pas[0], cx, cy, T.diamondRadius, T,
      [x + T.cell - m, y + m], [x + m, y + T.cell - m]);
  }
  // Two (or more) trips in the same inning: shrink and place side by side.
  const shown = pas.slice(0, 2);
  const parts = shown.map((pa, i) =>
    diamond(pa, x + T.cell * (0.28 + 0.44 * i), cy, T.smallRadius, T)
  );
  if (pas.length > 2)
    parts.push(text(cx, y + T.cell - 5, `+${pas.length - 2}`, "sc-overflow", 7));
  return parts.join("");
}

// One team's grid. Returns [svgString, heightUsed].
function teamGrid(side, teamMeta, homeAway, innings, labelMode, y0, T) {
  const parts = [];
  const slotNums = Object.keys(side.slots).map(Number);
  const slotCount = Math.max(9, ...slotNums);
  const gridX = T.pad + T.labelWidth;

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
    // same baseline as the player name so slot number and name align
    parts.push(text(T.pad + 2, rowY + T.cell / 2 - 2, s, "sc-slot-num", 10, "start"));
    const players = side.slots[s];
    if (players)
      parts.push(slotLabel(players, labelMode, T.pad + 16, rowY + T.cell / 2 - 2, T.pad + T.labelWidth - 8));

    for (let i = 1; i <= innings; i++) {
      const x = gridX + (i - 1) * T.cell;
      parts.push(
        `<rect class="sc-cell" x="${x}" y="${rowY}" width="${T.cell}" height="${T.cell}"/>`
      );
      const pas = side.cells[s]?.[i];
      if (pas?.length) parts.push(cellContents(pas, x, rowY, T));
    }
  }

  return [parts.join(""), gridY + slotCount * T.cell - y0];
}

// Compact, boxed linescore for linescorePos: "right" — team abbreviations,
// grid lines matching the scorecard table. Returns [svg, width, height].
export function linescoreBoxed(norm, x0, y0) {
  const { innings, totals } = norm.linescore;
  const labelW = 46;
  const cw = 24;
  const rowH = 20;
  const cols = [...innings.map((i) => String(i.num)), "R", "H", "E"];
  const w = labelW + cols.length * cw;
  const h = rowH * 3;
  const parts = [];

  const rowVals = (side) => [
    ...innings.map((i) => (i[side] == null ? "-" : String(i[side]))),
    String(totals[side].runs ?? ""),
    String(totals[side].hits ?? ""),
    String(totals[side].errors ?? ""),
  ];
  const rows = [
    [null, cols, "sc-ls-head"],
    [norm.meta.away.abbr || norm.meta.away.name, rowVals("away"), "sc-ls-val"],
    [norm.meta.home.abbr || norm.meta.home.name, rowVals("home"), "sc-ls-val"],
  ];

  rows.forEach(([label, vals, cls], r) => {
    const cellY = y0 + r * rowH;
    const textY = cellY + rowH / 2 + 3;
    // header row can take a darker fill via --sc-ls-head-fill
    const cellCls = r === 0 ? "sc-cell sc-ls-headcell" : "sc-cell";
    parts.push(`<rect class="${cellCls}" x="${x0}" y="${cellY}" width="${labelW}" height="${rowH}"/>`);
    if (label) parts.push(text(x0 + labelW / 2, textY, label, "sc-ls-team", 9));
    vals.forEach((v, i) => {
      const cellX = x0 + labelW + i * cw;
      parts.push(`<rect class="${cellCls}" x="${cellX}" y="${cellY}" width="${cw}" height="${rowH}"/>`);
      const bold = i >= innings.length;
      parts.push(text(cellX + cw / 2, textY, v, bold ? `${cls} sc-ls-total` : cls, 9));
    });
  });
  return [parts.join(""), w, h];
}

export function renderScorecard(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...DEFAULT_TOKENS, ...tokens };
  const innings = norm.maxInning;
  const width = T.pad * 2 + T.labelWidth + innings * T.cell;
  const parts = [];
  let y = T.pad + 6;

  parts.push(
    text(T.pad, y, `${norm.meta.away.name} @ ${norm.meta.home.name}`, "sc-title", T.titleSize, "start")
  );
  y += 18;
  parts.push(
    text(T.pad, y, `${norm.meta.date}  ·  ${norm.meta.venue}  ·  ${norm.meta.status}`, "sc-subtitle", 9.5, "start")
  );
  y += 16;

  if (T.linescorePos === "right") {
    // linescore sits beside the title block, flush right
    const probe = linescoreBoxed(norm, 0, 0);
    const lsX = width - T.pad - probe[1];
    const [lsSvg, , lsH] = linescoreBoxed(norm, lsX, T.pad);
    parts.push(lsSvg);
    y = Math.max(y, T.pad + lsH + 8) + 14;
  } else {
    const [lsSvg, lsH] = linescore(norm, y, T);
    parts.push(lsSvg);
    y += lsH + 22;
  }

  const [awaySvg, awayH] = teamGrid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, y, T);
  parts.push(awaySvg);
  y += awayH + 30;

  const [homeSvg, homeH] = teamGrid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, y, T);
  parts.push(homeSvg);
  y += homeH + 24;

  parts.push(
    legend(LEGEND, T.legendAlign === "end" ? width - T.pad : T.pad, y, 14, T.legendAlign)
  );
  y += 20 + T.pad / 2;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${y}" ` +
    `class="sc-card scorecard-theme" data-preset="${esc(preset)}">` +
    `<rect class="sc-bg" x="0" y="0" width="${width}" height="${y}"/>` +
    parts.join("") +
    `</svg>`
  );
}
