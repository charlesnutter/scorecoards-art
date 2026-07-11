// Renders a normalized game as a single self-contained <svg> string.
// All colors go through var(--sc-*, fallback) so the page theme can
// restyle the card, but the SVG still renders standalone (export path).

const CELL = 64;
const LABEL_W = 180;
const PAD = 24;
const INK = "var(--sc-ink, #1d4a34)";
const ACCENT = "var(--sc-accent, #b8452c)";
const RBI = "var(--sc-rbi, #c99b2f)";
const LINE = "var(--sc-line, #a89f88)";
const PAPER = "var(--sc-paper, #f6f1e4)";
const FONT = "'IBM Plex Mono', ui-monospace, monospace";

const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function text(x, y, str, size, opts = {}) {
  const { fill = INK, anchor = "middle", weight = 400, halo = false } = opts;
  const haloAttr = halo
    ? ` stroke="${PAPER}" stroke-width="3" paint-order="stroke" stroke-linejoin="round"`
    : "";
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}" font-weight="${weight}"${haloAttr}>${esc(str)}</text>`;
}

// One plate appearance drawn as a diamond centered at (cx, cy).
function diamond(pa, cx, cy, r) {
  const H = [cx, cy + r];
  const F = [cx + r, cy];
  const S = [cx, cy - r];
  const T = [cx - r, cy];
  const corners = [H, F, S, T, H];
  const parts = [];

  const outline = `M${H} L${F} L${S} L${T} Z`;
  const fill = pa.scored ? `fill="${INK}" fill-opacity="0.12"` : `fill="none"`;
  parts.push(
    `<path d="${outline}" ${fill} stroke="${LINE}" stroke-width="1" stroke-dasharray="3 2.5"/>`
  );

  // Solid path along the bases actually reached.
  if (pa.base > 0) {
    let d = `M${corners[0]}`;
    for (let i = 1; i <= Math.min(pa.base, 4); i++) d += ` L${corners[i]}`;
    parts.push(
      `<path d="${d}" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`
    );
  }

  const codeSize = r > 14 ? 9.5 : 7;
  parts.push(
    text(cx, cy + codeSize / 3, pa.code, codeSize, {
      fill: pa.out ? ACCENT : INK,
      weight: 600,
      halo: true,
    })
  );

  // Circled out number, upper right.
  if (pa.out && pa.outNumber) {
    const ox = cx + r + 4;
    const oy = cy - r + 2;
    parts.push(
      `<circle cx="${ox}" cy="${oy}" r="5.5" fill="none" stroke="${ACCENT}" stroke-width="1"/>`,
      text(ox, oy + 2.5, pa.outNumber, 7, { fill: ACCENT, weight: 600 })
    );
  }

  // RBI dots, lower left.
  for (let i = 0; i < Math.min(pa.rbi, 4); i++) {
    parts.push(
      `<circle cx="${cx - r - 4}" cy="${cy + r - 2 - i * 7}" r="2.5" fill="${RBI}"/>`
    );
  }

  return parts.join("");
}

function cellContents(pas, x, y) {
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;
  if (pas.length === 1) return diamond(pas[0], cx, cy, 19);
  // Two (or more) trips in the same inning: shrink and place side by side.
  const shown = pas.slice(0, 2);
  const parts = shown.map((pa, i) =>
    diamond(pa, x + CELL * (0.28 + 0.44 * i), cy, 11)
  );
  if (pas.length > 2)
    parts.push(text(cx, y + CELL - 5, `+${pas.length - 2}`, 7, { fill: ACCENT }));
  return parts.join("");
}

function slotLabel(players, labelMode, x, y) {
  const parts = [];
  const starter = players[0];
  const label =
    labelMode === "numbers"
      ? `#${starter.number || "?"}`
      : starter.name.length > 18
        ? starter.name.slice(0, 17) + "…"
        : starter.name;
  parts.push(text(x, y, label, 10, { anchor: "start", weight: 600 }));
  parts.push(
    text(LABEL_W + PAD - 8, y, starter.pos, 8, { anchor: "end", fill: LINE })
  );
  players.slice(1, 3).forEach((sub, i) => {
    const subLabel = labelMode === "numbers" ? `#${sub.number || "?"}` : sub.name;
    parts.push(
      text(x + 6, y + 11 + i * 10, `↳ ${subLabel} ${sub.pos}`, 7.5, {
        anchor: "start",
        fill: LINE,
      })
    );
  });
  return parts.join("");
}

// One team's grid. Returns [svgString, heightUsed].
function teamGrid(side, teamMeta, homeAway, innings, labelMode, y0) {
  const parts = [];
  const slotCount = Math.max(9, ...side.slots.keys());
  const gridX = PAD + LABEL_W;

  parts.push(
    text(PAD, y0 + 12, `${teamMeta.name.toUpperCase()} — ${homeAway}`, 11, {
      anchor: "start",
      weight: 700,
    })
  );
  const headY = y0 + 22;
  for (let i = 1; i <= innings; i++) {
    parts.push(text(gridX + (i - 1) * CELL + CELL / 2, headY + 14, i, 9, { fill: LINE, weight: 600 }));
  }

  const gridY = headY + 20;
  for (let s = 1; s <= slotCount; s++) {
    const rowY = gridY + (s - 1) * CELL;
    parts.push(text(PAD + 2, rowY + CELL / 2 + 3, s, 10, { anchor: "start", fill: LINE, weight: 700 }));
    const players = side.slots.get(s);
    if (players) parts.push(slotLabel(players, labelMode, PAD + 16, rowY + CELL / 2 - 2));

    for (let i = 1; i <= innings; i++) {
      const x = gridX + (i - 1) * CELL;
      parts.push(
        `<rect x="${x}" y="${rowY}" width="${CELL}" height="${CELL}" fill="none" stroke="${LINE}" stroke-width="0.75"/>`
      );
      const pas = side.cells.get(s)?.get(i);
      if (pas?.length) parts.push(cellContents(pas, x, rowY));
    }
  }

  return [parts.join(""), gridY + slotCount * CELL - y0];
}

function linescore(norm, y0) {
  const { innings, totals } = norm.linescore;
  const parts = [];
  const cw = 26;
  const labelW = 150;
  const rowH = 18;
  const x0 = PAD;
  const cols = [...innings.map((i) => String(i.num)), "R", "H", "E"];
  const rowVals = (side) => [
    ...innings.map((i) => (i[side] == null ? "-" : String(i[side]))),
    String(totals[side].runs ?? ""),
    String(totals[side].hits ?? ""),
    String(totals[side].errors ?? ""),
  ];

  cols.forEach((c, i) => {
    const bold = i >= innings.length;
    parts.push(text(x0 + labelW + i * cw + cw / 2, y0 + 12, c, 8.5, { fill: bold ? INK : LINE, weight: 700 }));
  });
  [
    [norm.meta.away.name, rowVals("away")],
    [norm.meta.home.name, rowVals("home")],
  ].forEach(([name, vals], r) => {
    const y = y0 + 12 + (r + 1) * rowH;
    parts.push(text(x0, y, name, 9.5, { anchor: "start", weight: 600 }));
    vals.forEach((v, i) => {
      const bold = i >= innings.length;
      parts.push(text(x0 + labelW + i * cw + cw / 2, y, v, 9.5, { weight: bold ? 700 : 400 }));
    });
  });
  return [parts.join(""), 12 + 3 * rowH];
}

export function renderScorecard(norm, { labelMode = "names" } = {}) {
  const innings = norm.maxInning;
  const width = PAD * 2 + LABEL_W + innings * CELL;
  const parts = [];
  let y = PAD + 6;

  parts.push(
    text(PAD, y, `${norm.meta.away.name} @ ${norm.meta.home.name}`, 15, { anchor: "start", weight: 700 })
  );
  y += 18;
  parts.push(
    text(PAD, y, `${norm.meta.date}  ·  ${norm.meta.venue}  ·  ${norm.meta.status}`, 9.5, { anchor: "start", fill: LINE })
  );
  y += 16;

  const [lsSvg, lsH] = linescore(norm, y);
  parts.push(lsSvg);
  y += lsH + 22;

  const [awaySvg, awayH] = teamGrid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, y);
  parts.push(awaySvg);
  y += awayH + 30;

  const [homeSvg, homeH] = teamGrid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, y);
  parts.push(homeSvg);
  y += homeH + PAD;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${y}" ` +
    `style="width:100%;height:auto;display:block" font-family="${FONT}">` +
    `<rect x="0" y="0" width="${width}" height="${y}" fill="${PAPER}"/>` +
    parts.join("") +
    `</svg>`
  );
}
