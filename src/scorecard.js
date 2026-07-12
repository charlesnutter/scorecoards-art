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
};

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function text(x, y, str, cls, size, anchor = "middle") {
  return `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" text-anchor="${anchor}">${esc(str)}</text>`;
}

// One plate appearance drawn as a diamond centered at (cx, cy).
function diamond(pa, cx, cy, r, T) {
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
  parts.push(text(cx, cy + codeSize / 3, pa.code, codeCls, codeSize));

  if (T.showOutBadge && pa.out && pa.outNumber) {
    const ox = cx + r + 4;
    const oy = cy - r + 2;
    parts.push(
      `<circle class="sc-out-badge" cx="${ox}" cy="${oy}" r="5.5"/>`,
      text(ox, oy + 2.5, pa.outNumber, "sc-out-num", 7)
    );
  }

  if (T.showRbiDots) {
    for (let i = 0; i < Math.min(pa.rbi, 4); i++) {
      parts.push(
        `<circle class="sc-rbi" cx="${cx - r - 4}" cy="${cy + r - 2 - i * 7}" r="2.5"/>`
      );
    }
  }

  return parts.join("");
}

function cellContents(pas, x, y, T) {
  const cx = x + T.cell / 2;
  const cy = y + T.cell / 2;
  if (pas.length === 1) return diamond(pas[0], cx, cy, T.diamondRadius, T);
  // Two (or more) trips in the same inning: shrink and place side by side.
  const shown = pas.slice(0, 2);
  const parts = shown.map((pa, i) =>
    diamond(pa, x + T.cell * (0.28 + 0.44 * i), cy, T.smallRadius, T)
  );
  if (pas.length > 2)
    parts.push(text(cx, y + T.cell - 5, `+${pas.length - 2}`, "sc-overflow", 7));
  return parts.join("");
}

function slotLabel(players, labelMode, x, y, T) {
  const parts = [];
  const starter = players[0];
  const label =
    labelMode === "numbers"
      ? `#${starter.number || "?"}`
      : starter.name.length > 18
        ? starter.name.slice(0, 17) + "…"
        : starter.name;
  parts.push(text(x, y, label, "sc-player", 10, "start"));
  parts.push(
    text(T.labelWidth + T.pad - 8, y, starter.pos, "sc-player-pos", 8, "end")
  );
  players.slice(1, 3).forEach((sub, i) => {
    const subLabel = labelMode === "numbers" ? `#${sub.number || "?"}` : sub.name;
    parts.push(
      text(x + 6, y + 11 + i * 10, `↳ ${subLabel} ${sub.pos}`, "sc-player-sub", 7.5, "start")
    );
  });
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
    parts.push(text(T.pad + 2, rowY + T.cell / 2 + 3, s, "sc-slot-num", 10, "start"));
    const players = side.slots[s];
    if (players) parts.push(slotLabel(players, labelMode, T.pad + 16, rowY + T.cell / 2 - 2, T));

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

function linescore(norm, y0, T) {
  const { innings, totals } = norm.linescore;
  const parts = [];
  const cw = 26;
  const labelW = 150;
  const rowH = 18;
  const x0 = T.pad;
  const cols = [...innings.map((i) => String(i.num)), "R", "H", "E"];
  const rowVals = (side) => [
    ...innings.map((i) => (i[side] == null ? "-" : String(i[side]))),
    String(totals[side].runs ?? ""),
    String(totals[side].hits ?? ""),
    String(totals[side].errors ?? ""),
  ];

  cols.forEach((c, i) => {
    const cls = i >= innings.length ? "sc-ls-head sc-ls-total" : "sc-ls-head";
    parts.push(text(x0 + labelW + i * cw + cw / 2, y0 + 12, c, cls, 8.5));
  });
  [
    [norm.meta.away.name, rowVals("away")],
    [norm.meta.home.name, rowVals("home")],
  ].forEach(([name, vals], r) => {
    const y = y0 + 12 + (r + 1) * rowH;
    parts.push(text(x0, y, name, "sc-ls-team", 9.5, "start"));
    vals.forEach((v, i) => {
      const cls = i >= innings.length ? "sc-ls-val sc-ls-total" : "sc-ls-val";
      parts.push(text(x0 + labelW + i * cw + cw / 2, y, v, cls, 9.5));
    });
  });
  return [parts.join(""), 12 + 3 * rowH];
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

  const [lsSvg, lsH] = linescore(norm, y, T);
  parts.push(lsSvg);
  y += lsH + 22;

  const [awaySvg, awayH] = teamGrid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, y, T);
  parts.push(awaySvg);
  y += awayH + 30;

  const [homeSvg, homeH] = teamGrid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, y, T);
  parts.push(homeSvg);
  y += homeH + T.pad;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${y}" ` +
    `class="sc-card scorecard-theme" data-preset="${esc(preset)}">` +
    `<rect class="sc-bg" x="0" y="0" width="${width}" height="${y}"/>` +
    parts.join("") +
    `</svg>`
  );
}
