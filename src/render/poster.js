// Poster-format layouts: same classic diamond cells, composed onto
// canvases with exact paper aspect ratios so exports map directly to
// standard print sizes. Content is measured first, then the canvas is
// padded (centered) to the target ratio — square cells set the grid's
// footprint, margins absorb the difference.
//
//   Broadside  24×36 landscape — scorebook spread: away/home side by side
//   Herald     24×36 portrait  — masthead poster: big centered title
//   Pressbox   18×24 portrait  — stacked grids + right rail with a
//                                vertical linescore tower
//   Tabloid    11×17 portrait  — compact print, the 7-2 Double Play size
import {
  esc,
  text,
  header,
  slotLabel,
  maxSlot,
  legend,
  svgShell,
} from "./common.js";
import {
  DEFAULT_TOKENS,
  cellContents,
  linescoreBoxed,
  LEGEND as CLASSIC_LEGEND,
} from "../scorecard.js";
function wrap(str, maxChars) {
  const lines = [];
  let line = "";
  for (const w of String(str).split(/\s+/)) {
    if (line && (line + " " + w).length > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Pad content out to the paper's exact aspect ratio, centered, with a
// dashed trim line at the paper edge and a dimension label so the
// preview reads as the printed sheet.
function paperCanvas(cw, ch, [pw, ph], preset, body, { valign = "center", frame = false, trim = true } = {}) {
  const target = pw / ph;
  let W = cw;
  let H = ch;
  if (cw / ch > target) H = cw / target;
  else W = ch * target;
  const ox = (W - cw) / 2;
  const oy = valign === "top" ? 0 : (H - ch) / 2;
  const inset = 7;
  const labelInset = frame ? 32 : inset + 12;
  let overlay = trim
    ? `<rect class="sc-trim" x="${inset}" y="${inset}" ` +
      `width="${(W - 2 * inset).toFixed(1)}" height="${(H - 2 * inset).toFixed(1)}"/>`
    : "";
  overlay += text(W - labelInset, H - labelInset, `${pw}″ × ${ph}″`, "sc-trim-label", 10, "end");
  if (frame) {
    // solid border around the whole poster, just inside the trim
    const fi = 22;
    overlay += `<rect class="sc-poster-frame" x="${fi}" y="${fi}" width="${(W - 2 * fi).toFixed(1)}" height="${(H - 2 * fi).toFixed(1)}"/>`;
  }
  return svgShell(
    Math.round(W),
    Math.round(H),
    preset,
    `<g transform="translate(${ox.toFixed(1)},${oy.toFixed(1)})">${body}</g>` + overlay
  );
}

// One team grid at (x0, y0). Returns [svg, width, height].
function grid(side, teamMeta, homeAway, innings, labelMode, x0, y0, T) {
  const parts = [];
  const slotCount = maxSlot(side);
  const gridX = x0 + T.labelWidth;
  const w = T.labelWidth + innings * T.cell;

  const BAR_H = 42;
  if (T.teamHeaderBar) {
    // tall translucent bar, large sentence-case team name
    parts.push(`<rect class="sc-team-bar" x="${x0}" y="${y0}" width="${w}" height="${BAR_H}"/>`);
    parts.push(
      `<text x="${x0 + 16}" y="${y0 + 28}" class="sc-team-bar-label" font-size="20" text-anchor="start">${esc(teamMeta.name)}</text>`
    );
    parts.push(text(x0 + w - 16, y0 + 25, homeAway, "sc-team-bar-tag", 10, "end"));
  } else {
    parts.push(text(x0, y0 + 12, `${teamMeta.name.toUpperCase()} — ${homeAway}`, "sc-team-name", 11, "start"));
  }
  const headY = y0 + (T.teamHeaderBar ? BAR_H + 12 : 22);
  for (let i = 1; i <= innings; i++) {
    parts.push(text(gridX + (i - 1) * T.cell + T.cell / 2, headY + 14, i, "sc-inning-num", 9));
  }

  const gridY = headY + 20;
  for (let s = 1; s <= slotCount; s++) {
    const rowY = gridY + (s - 1) * T.cell;
    parts.push(text(x0 + 2, rowY + T.cell / 2 - 2, s, "sc-slot-num", 10, "start"));
    const players = side.slots[s];
    if (players)
      parts.push(slotLabel(players, labelMode, x0 + 16, rowY + T.cell / 2 - 2, x0 + T.labelWidth - 8));

    for (let i = 1; i <= innings; i++) {
      const x = gridX + (i - 1) * T.cell;
      parts.push(`<rect class="sc-cell" x="${x}" y="${rowY}" width="${T.cell}" height="${T.cell}"/>`);
      const pas = side.cells[s]?.[i];
      if (pas?.length) parts.push(cellContents(pas, x, rowY, T));
    }
  }
  if (T.gridFrame) {
    parts.push(
      `<rect class="sc-grid-frame" x="${gridX}" y="${gridY}" width="${innings * T.cell}" height="${slotCount * T.cell}"/>`
    );
  }
  return [parts.join(""), w, gridY + slotCount * T.cell - y0];
}

// Vertical linescore: innings as rows, away/home as columns (Pressbox rail).
function linescoreTower(norm, x0, y0) {
  const { innings, totals } = norm.linescore;
  const rowH = 20;
  const labelW = 34;
  const colW = 36;
  const parts = [];
  const rows = [
    ["", norm.meta.away.abbr || "AWY", norm.meta.home.abbr || "HOM", "sc-ls-head", false],
    ...innings.map((i) => [
      String(i.num),
      i.away == null ? "-" : String(i.away),
      i.home == null ? "-" : String(i.home),
      "sc-ls-val",
      false,
    ]),
    ["R", String(totals.away.runs ?? ""), String(totals.home.runs ?? ""), "sc-ls-val", true],
    ["H", String(totals.away.hits ?? ""), String(totals.home.hits ?? ""), "sc-ls-val", true],
    ["E", String(totals.away.errors ?? ""), String(totals.home.errors ?? ""), "sc-ls-val", true],
  ];
  rows.forEach(([label, a, h, cls, bold], r) => {
    const y = y0 + r * rowH;
    const textY = y + rowH / 2 + 3;
    const lblCls = bold ? "sc-ls-head sc-ls-total" : "sc-ls-head";
    parts.push(`<rect class="sc-cell" x="${x0}" y="${y}" width="${labelW}" height="${rowH}"/>`);
    if (label) parts.push(text(x0 + labelW / 2, textY, label, lblCls, 9));
    [a, h].forEach((v, c) => {
      const x = x0 + labelW + c * colW;
      parts.push(`<rect class="sc-cell" x="${x}" y="${y}" width="${colW}" height="${rowH}"/>`);
      const vCls = r === 0 ? "sc-ls-team" : bold ? `${cls} sc-ls-total` : cls;
      parts.push(text(x + colW / 2, textY, v, vCls, 9));
    });
  });
  return [parts.join(""), labelW + colW * 2, rows.length * rowH];
}

function legendColumn(items, x0, y0, rowH = 26) {
  const parts = [];
  items.forEach((it, i) => {
    const y = y0 + i * rowH;
    parts.push(`<g transform="translate(${x0 + 8},${y}) scale(1.15)">${it.swatch}</g>`);
    parts.push(text(x0 + 26, y + 3.5, it.label, "sc-legend-label", 9.5, "start"));
  });
  return [parts.join(""), items.length * rowH];
}

// Wrap a long team name into lines that fit the rail.
function wrapWords(name, maxChars) {
  const lines = [];
  let line = "";
  for (const w of name.toUpperCase().split(" ")) {
    if (line && (line + " " + w).length > maxChars) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2025-10-01" -> "October 1st, 2025"
function longDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  if (!y || !m || !d) return iso || "";
  const suffix =
    d % 100 >= 11 && d % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[d % 10] || "th";
  return `${MONTHS[m - 1]} ${d}${suffix}, ${y}`;
}

const subtitleOf = (norm) =>
  `${longDate(norm.meta.date)}  ·  ${norm.meta.venue}  ·  ${norm.meta.status}`;

// One headed column of wrapped note lines. Returns [svg, height].
function notesColumn(head, lines, x0, y0, lineH = 16) {
  const parts = [text(x0, y0 + 10, head, "sc-note-head", 13, "start")];
  lines.forEach((l, i) => {
    const y = y0 + 34 + i * lineH;
    if (l.tag) parts.push(text(x0, y, l.tag, "sc-note-tag", 11, "start"));
    parts.push(
      text(x0 + (l.indent || 0), y, l.text, l.bold ? "sc-note sc-note-head" : "sc-note", 11, "start")
    );
  });
  return [parts.join(""), 34 + lines.length * lineH];
}

function scoringLines(norm, maxChars = 105) {
  const lines = [];
  for (const s of (norm.scoring || []).slice(0, 6)) {
    wrap(s.desc, maxChars).forEach((l, i) =>
      lines.push({ tag: i === 0 ? s.inning : "", text: l, indent: 34 })
    );
  }
  return lines;
}

function recapLines(norm) {
  const recap = norm.recap || {};
  if (!recap.headline && !recap.blurb) return [];
  return [
    ...wrap(recap.headline || "", 88).map((l) => ({ tag: "", text: l, bold: true })),
    ...wrap(recap.blurb || "", 105).slice(0, 6).map((l) => ({ tag: "", text: l })),
  ];
}

// Conventional pitching box: name + IP H R ER BB K HR P, boxed like the
// linescore. `w` sets the table's total width. Returns [svg, width, height].
function pitchingTable(rows, x0, y0, w = 490) {
  const cols = [["IP", 40], ["H", 34], ["R", 34], ["ER", 36], ["BB", 36], ["K", 34], ["HR", 36], ["P", 40]];
  const nameW = w - cols.reduce((n, c) => n + c[1], 0);
  const rowH = 21;
  const parts = [];

  const drawRow = (cells, rowY, headRow) => {
    let x = x0;
    cells.forEach(([label, cellW, anchor], i) => {
      parts.push(`<rect class="sc-cell" x="${x}" y="${rowY}" width="${cellW}" height="${rowH}"/>`);
      const cls = headRow ? "sc-ls-head" : i === 0 ? "sc-ls-team" : "sc-ls-val";
      const tx = anchor === "start" ? x + 8 : x + cellW / 2;
      if (label !== "") parts.push(text(tx, rowY + rowH / 2 + 3.5, label, cls, 10.5, anchor || "middle"));
      x += cellW;
    });
  };

  drawRow([["PITCHING", nameW, "start"], ...cols.map(([l, cw]) => [l, cw])], y0, true);
  rows.forEach((r, i) => {
    const name = r.note ? `${r.name} · ${r.note}` : r.name;
    drawRow(
      [[name, nameW, "start"], [r.ip, 40], [r.h, 34], [r.r, 34], [r.er, 36], [r.bb, 36], [r.so, 34], [r.hr, 36], [r.p, 40]],
      y0 + (i + 1) * rowH
    );
  });

  const h = (rows.length + 1) * rowH;
  return [parts.join(""), w, h];
}

/* ---------- Broadside: 24×36 landscape ---------- */

export function renderBroadside(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...DEFAULT_TOKENS, cell: 64, labelWidth: 170, pad: 48, paper: [36, 24], ...tokens };
  const innings = norm.maxInning;
  const gridW = T.labelWidth + innings * T.cell;
  const gap = 56;
  const cw = T.pad * 2 + gridW * 2 + gap;
  const parts = [];

  let y = T.pad + 44;
  parts.push(
    text(T.pad, y, `${norm.meta.away.name} @ ${norm.meta.home.name}`.toUpperCase(), "sc-title", 36, "start")
  );
  parts.push(text(T.pad, y + 24, subtitleOf(norm), "sc-subtitle", 11, "start"));

  const probe = linescoreBoxed(norm, 0, 0);
  // box top aligned with the title's cap height
  const lsY = T.pad + 18;
  const [lsSvg] = linescoreBoxed(norm, cw - T.pad - probe[1], lsY);
  parts.push(lsSvg);

  y = lsY + probe[2] + 34;
  const [awaySvg, , gridH] = grid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, T.pad, y, T);
  const [homeSvg] = grid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, T.pad + gridW + gap, y, T);
  parts.push(awaySvg, homeSvg);
  y += gridH + 34;

  // bottom row, three equal columns: scoring plays | away pitching | home pitching
  if (T.showNotes || T.showPitching) {
    const colGap = 40;
    const innerW = gridW * 2 + gap;
    const colW = Math.floor((innerW - 2 * colGap) / 3);
    let rowH = 0;

    if (T.showNotes) {
      const maxChars = Math.floor((colW - 34) / 5.7);
      const [sn, sh] = notesColumn("SCORING PLAYS", scoringLines(norm, maxChars), T.pad, y);
      parts.push(sn);
      rowH = sh;
    }

    if (T.showPitching && norm.pitching) {
      [
        [T.pad + colW + colGap, "away", norm.meta.away],
        [T.pad + (colW + colGap) * 2, "home", norm.meta.home],
      ].forEach(([x, side, meta]) => {
        parts.push(text(x, y + 10, `${meta.name.toUpperCase()} — PITCHING`, "sc-note-head", 13, "start"));
        const [tbl, , th] = pitchingTable(norm.pitching[side], x, y + 26, colW);
        parts.push(tbl);
        rowH = Math.max(rowH, 26 + th);
      });
    }
    y += rowH + 26;
  }

  parts.push(legend(CLASSIC_LEGEND, T.pad, y));
  const ch = y + 16 + T.pad;
  return paperCanvas(cw, ch, T.paper, preset, parts.join(""), {
    valign: T.valign,
    frame: T.posterFrame,
    trim: T.trimGuide !== false,
  });
}

/* ---------- Herald: 24×36 portrait ---------- */

export function renderHerald(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...DEFAULT_TOKENS, cell: 64, labelWidth: 200, pad: 56, paper: [24, 36], ...tokens };
  const innings = norm.maxInning;
  const gridW = T.labelWidth + innings * T.cell;
  const cw = T.pad * 2 + gridW;
  const cx = cw / 2;
  const parts = [];

  let y = T.pad + 42;
  parts.push(text(cx, y, norm.meta.away.name.toUpperCase(), "sc-title", 38));
  y += 26;
  parts.push(text(cx, y, "AT", "sc-subtitle", 12));
  y += 34;
  parts.push(text(cx, y, norm.meta.home.name.toUpperCase(), "sc-title", 38));
  y += 24;
  parts.push(text(cx, y, subtitleOf(norm), "sc-subtitle", 11));
  y += 28;

  const probe = linescoreBoxed(norm, 0, 0);
  const [lsSvg, , lsH] = linescoreBoxed(norm, cx - probe[1] / 2, y);
  parts.push(lsSvg);
  y += lsH + 40;

  const [awaySvg, , gridH] = grid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, T.pad, y, T);
  parts.push(awaySvg);
  y += gridH + 44;
  const [homeSvg] = grid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, T.pad, y, T);
  parts.push(homeSvg);
  y += gridH + 34;

  parts.push(legend(CLASSIC_LEGEND, cw - T.pad, y, 14, "end"));
  const ch = y + 16 + T.pad;
  return paperCanvas(cw, ch, T.paper, preset, parts.join(""));
}

/* ---------- Pressbox: 18×24 portrait, right rail ---------- */

export function renderPressbox(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...DEFAULT_TOKENS, cell: 60, labelWidth: 190, pad: 48, paper: [18, 24], ...tokens };
  const innings = norm.maxInning;
  const gridW = T.labelWidth + innings * T.cell;
  const railW = 190;
  const railGap = 44;
  const cw = T.pad * 2 + gridW + railGap + railW;
  const railX = T.pad + gridW + railGap;
  const parts = [];

  let y = T.pad + 8;
  const [awaySvg, , gridH] = grid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, T.pad, y, T);
  parts.push(awaySvg);
  const [homeSvg] = grid(
    norm.sides.home, norm.meta.home, "HOME", innings, labelMode, T.pad, y + gridH + 40, T
  );
  parts.push(homeSvg);
  const gridsBottom = y + gridH * 2 + 40;

  // rail: stacked title words, subtitle, linescore tower, legend column
  let ry = T.pad + 26;
  const titleLines = [
    ...wrapWords(norm.meta.away.name, 12),
    "AT",
    ...wrapWords(norm.meta.home.name, 12),
  ];
  for (const line of titleLines) {
    const isAt = line === "AT";
    parts.push(text(railX, ry, line, isAt ? "sc-subtitle" : "sc-title", isAt ? 11 : 22, "start"));
    ry += isAt ? 20 : 26;
  }
  ry += 2;
  parts.push(text(railX, ry, norm.meta.date, "sc-subtitle", 10, "start"));
  ry += 14;
  parts.push(text(railX, ry, norm.meta.venue, "sc-subtitle", 10, "start"));
  ry += 26;

  const [towerSvg, , towerH] = linescoreTower(norm, railX, ry);
  parts.push(towerSvg);
  ry += towerH + 30;

  const [legSvg] = legendColumn(CLASSIC_LEGEND, railX, ry);
  parts.push(legSvg);

  const ch = gridsBottom + T.pad;
  return paperCanvas(cw, ch, T.paper, preset, parts.join(""));
}

/* ---------- Tabloid: 11×17 portrait ---------- */

export function renderTabloid(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...DEFAULT_TOKENS, cell: 56, labelWidth: 170, pad: 40, paper: [11, 17], ...tokens };
  const innings = norm.maxInning;
  const gridW = T.labelWidth + innings * T.cell;
  const cw = T.pad * 2 + gridW;
  const parts = [];

  let y = T.pad + 24;
  parts.push(
    text(T.pad, y, `${norm.meta.away.name} @ ${norm.meta.home.name}`.toUpperCase(), "sc-title", 20, "start")
  );
  parts.push(text(T.pad, y + 16, subtitleOf(norm), "sc-subtitle", 9.5, "start"));
  y += 34;

  // linescore on its own row (right-aligned) — beside the title it
  // collides with long team names at this scale
  const probe = linescoreBoxed(norm, 0, 0);
  const [lsSvg, , lsH] = linescoreBoxed(norm, cw - T.pad - probe[1], y);
  parts.push(lsSvg);
  y += lsH + 26;

  const [awaySvg, , gridH] = grid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, T.pad, y, T);
  parts.push(awaySvg);
  y += gridH + 34;
  const [homeSvg] = grid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, T.pad, y, T);
  parts.push(homeSvg);
  y += gridH + 28;

  parts.push(legend(CLASSIC_LEGEND, cw - T.pad, y, 14, "end"));
  const ch = y + 14 + T.pad;
  return paperCanvas(cw, ch, T.paper, preset, parts.join(""));
}
