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
function grid(side, teamMeta, homeAway, innings, labelMode, x0, y0, T, score) {
  const parts = [];
  const slotCount = maxSlot(side);
  const gridX = x0 + T.labelWidth;
  const w = T.labelWidth + innings * T.cell;

  const BAR_H = 42;
  const displayName = T.cityNames ? teamMeta.city || teamMeta.name : teamMeta.name;
  const attached = T.barStyle === "attached";
  if (T.teamHeaderBar) {
    if (attached) {
      // bar joins the grid chrome: darker fill, bordered on three sides —
      // the header row below supplies the shared bottom line
      parts.push(`<rect class="sc-cell--empty" x="${x0}" y="${y0}" width="${w}" height="${BAR_H}"/>`);
      parts.push(
        `<path class="sc-cell" d="M${x0},${y0 + BAR_H} L${x0},${y0} L${x0 + w},${y0} L${x0 + w},${y0 + BAR_H}"/>`
      );
    } else {
      // tall translucent bar, large sentence-case team name
      parts.push(`<rect class="sc-team-bar" x="${x0}" y="${y0}" width="${w}" height="${BAR_H}"/>`);
    }
    parts.push(
      `<text x="${x0 + 16}" y="${y0 + 28}" class="sc-team-bar-label" font-size="20" text-anchor="start">${esc(displayName)}</text>`
    );
    if (T.teamHeaderScore) {
      // tag inline after the name; score centered on the final cell column
      const nameW = displayName.length * 10.8;
      parts.push(text(x0 + 16 + nameW + 14, y0 + 25, homeAway, "sc-team-bar-tag", 10, "start"));
      if (score != null) {
        const scoreX = x0 + T.labelWidth + (innings - 0.5) * T.cell;
        parts.push(
          `<text x="${scoreX}" y="${y0 + 28}" class="sc-team-bar-label" font-size="20" text-anchor="middle">${esc(score)}</text>`
        );
      }
    } else {
      parts.push(text(x0 + w - 16, y0 + 25, homeAway, "sc-team-bar-tag", 10, "end"));
    }
  } else {
    parts.push(text(x0, y0 + 12, `${displayName.toUpperCase()} — ${homeAway}`, "sc-team-name", 11, "start"));
  }
  const headY = y0 + (T.teamHeaderBar ? BAR_H + (attached ? 0 : T.barGap ?? 12) : 22);
  // scorebook chrome: boxed header row and boxed #/name/pos columns
  const chrome = T.gridChrome;
  const numW = 24;
  const posW = 30;
  const nameW = T.labelWidth - numW - posW;
  if (chrome) {
    parts.push(`<rect class="sc-cell sc-cell--empty" x="${x0}" y="${headY}" width="${numW}" height="20"/>`);
    parts.push(text(x0 + numW / 2, headY + 14, "#", "sc-inning-num", 8));
    parts.push(`<rect class="sc-cell sc-cell--empty" x="${x0 + numW}" y="${headY}" width="${nameW}" height="20"/>`);
    parts.push(text(x0 + numW + 8, headY + 14, "BATTER", "sc-inning-num", 8, "start"));
    parts.push(`<rect class="sc-cell sc-cell--empty" x="${x0 + numW + nameW}" y="${headY}" width="${posW}" height="20"/>`);
    parts.push(text(x0 + numW + nameW + posW / 2, headY + 14, "POS", "sc-inning-num", 8));
  }
  for (let i = 1; i <= innings; i++) {
    if (chrome) {
      parts.push(
        `<rect class="sc-cell sc-cell--empty" x="${gridX + (i - 1) * T.cell}" y="${headY}" width="${T.cell}" height="20"/>`
      );
    }
    parts.push(text(gridX + (i - 1) * T.cell + T.cell / 2, headY + 14, i, "sc-inning-num", 9));
  }

  const gridY = headY + 20;
  const trunc = (str, n) => (str.length > n ? str.slice(0, n - 1) + "…" : str);
  for (let s = 1; s <= slotCount; s++) {
    const rowY = gridY + (s - 1) * T.cell;
    const players = side.slots[s];
    if (chrome) {
      // # cell (darker), then name + pos cells ruled into three lines
      parts.push(`<rect class="sc-cell sc-cell--empty" x="${x0}" y="${rowY}" width="${numW}" height="${T.cell}"/>`);
      parts.push(text(x0 + numW / 2, rowY + T.cell / 2 + 3, s, "sc-slot-num", 10));
      parts.push(`<rect class="sc-cell" x="${x0 + numW}" y="${rowY}" width="${nameW}" height="${T.cell}"/>`);
      parts.push(`<rect class="sc-cell" x="${x0 + numW + nameW}" y="${rowY}" width="${posW}" height="${T.cell}"/>`);
      const third = T.cell / 3;
      for (let k = 1; k <= 2; k++) {
        parts.push(
          `<line class="sc-subrule" x1="${x0 + numW}" y1="${rowY + k * third}" x2="${x0 + T.labelWidth}" y2="${rowY + k * third}"/>`
        );
      }
      (players || []).slice(0, 3).forEach((p, k) => {
        const ly = rowY + (k + 0.5) * third + 3;
        const label = labelMode === "numbers" ? `#${p.number || "?"}` : trunc(p.name, 20);
        parts.push(text(x0 + numW + 6, ly, label, k === 0 ? "sc-player" : "sc-player-sub", k === 0 ? 9.5 : 9, "start"));
        parts.push(text(x0 + numW + nameW + posW / 2, ly, p.pos, "sc-player-pos", 8));
      });
    } else {
      parts.push(text(x0 + 2, rowY + T.cell / 2 - 2, s, "sc-slot-num", 10, "start"));
      if (players)
        parts.push(slotLabel(players, labelMode, x0 + 16, rowY + T.cell / 2 - 2, x0 + T.labelWidth - 8));
    }

    for (let i = 1; i <= innings; i++) {
      const x = gridX + (i - 1) * T.cell;
      const pas = side.cells[s]?.[i];
      const cls = pas?.length ? "sc-cell" : "sc-cell sc-cell--empty";
      parts.push(`<rect class="${cls}" x="${x}" y="${rowY}" width="${T.cell}" height="${T.cell}"/>`);
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

// One line per scoring play, never wrapped: "Story 1B · 3 RBI · 3-2".
function scoringLines(norm, maxChars = 105) {
  return (norm.scoring || []).slice(0, 12).map((s) => {
    const text = s.short
      ? `${s.short}${s.rbi ? ` · ${s.rbi} RBI` : ""} · ${s.score}`
      : s.desc;
    return {
      tag: s.inning,
      text: text.length > maxChars ? text.slice(0, maxChars - 1) + "…" : text,
      indent: 34,
    };
  });
}

// Pack whole items onto lines separated by "; " — an item never splits
// across lines unless it alone exceeds the width (then it word-wraps).
function packItems(items, maxChars) {
  const lines = [];
  let line = "";
  for (const item of items) {
    const candidate = line ? `${line}; ${item}` : item;
    if (candidate.length <= maxChars) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    if (item.length > maxChars) {
      const wrapped = wrap(item, maxChars);
      lines.push(...wrapped.slice(0, -1));
      line = wrapped[wrapped.length - 1];
    } else {
      line = item;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Per-team box-score footnotes as newspaper-style lines, tagged with the
// team abbreviation; items are packed, never split mid-item.
function gameNoteLines(norm, maxChars) {
  const lines = [];
  for (const side of ["away", "home"]) {
    const items = norm.battingNotes?.[side];
    if (!items?.length) continue;
    packItems(items, maxChars).forEach((l, i) =>
      lines.push({ tag: i === 0 ? norm.meta[side].abbr || "" : "", text: l, indent: 34 })
    );
  }
  return lines;
}

// AT THE PARK panel: one labeled fact per line, plus an optional personal
// note separated by a blank line.
function parkLines(norm, note, maxChars) {
  const d = norm.gameInfoDetail || {};
  const rows = [
    ["First Pitch", d.firstPitch],
    ["Time", d.duration],
    ["Attendance", d.attendance],
    ["Temperature", d.temp],
    ["Conditions", [d.sky, d.wind].filter(Boolean).join(" · ")],
  ];
  const lines = rows.filter(([, v]) => v).map(([l, v]) => ({ text: `${l}: ${v}` }));
  if (note) {
    if (lines.length) lines.push({ text: "" });
    wrap(note, maxChars).forEach((l) => lines.push({ text: l }));
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
  const cols = [["IP", 40], ["H", 34], ["R", 34], ["ER", 36], ["BB", 36], ["K", 34], ["HR", 36], ["P-S", 54]];
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

  drawRow([["PITCHERS", nameW, "start"], ...cols.map(([l, cw]) => [l, cw])], y0, true);
  rows.forEach((r, i) => {
    const name = r.note ? `${r.name} · ${r.note}` : r.name;
    const ps = r.strikes !== "" && r.strikes != null ? `${r.p}-${r.strikes}` : r.p;
    drawRow(
      [[name, nameW, "start"], [r.ip, 40], [r.h, 34], [r.r, 34], [r.er, 36], [r.bb, 36], [r.so, 34], [r.hr, 36], [ps, 54]],
      y0 + (i + 1) * rowH
    );
  });

  const h = (rows.length + 1) * rowH;
  return [parts.join(""), w, h];
}

/* ---------- Broadside: 24×36 landscape ---------- */

// One-line game facts: "First pitch: 6:10 PM · T: 2:50 · Att: 47,993 ·
// 68°, Clear · 10 mph, L To R" — trailing items dropped if it overflows.
function conditionsLine(norm, maxChars) {
  if (!norm.gameInfo?.length) return "";
  const items = norm.gameInfo.map((s) => s.replace(" degrees", "°"));
  let line = items.join(" · ");
  while (items.length > 1 && line.length > maxChars) {
    items.pop();
    line = items.join(" · ");
  }
  return line;
}

// "bases reached" legend swatch as a mini diamond with a line to first,
// matching the card's own notation (opt in via T.legendDiamondReach).
const REACH_LEGEND = CLASSIC_LEGEND.map((it) =>
  it.label === "bases reached"
    ? {
        swatch: `<g><path class="sc-diamond" d="M0,7 L7,0 L0,-7 L-7,0 Z"/><path class="sc-basepath" d="M0,7 L7,0"/></g>`,
        label: it.label,
        w: 14,
      }
    : it
);

export function renderBroadside(
  norm,
  { labelMode = "names", preset = "classic", tokens = {}, legendCol, infoPos, bottomOrder, notesOrder, pads = {}, note = "", barStyle, gridOrder } = {}
) {
  const T = {
    ...DEFAULT_TOKENS,
    cell: 64,
    labelWidth: 170,
    pad: 48,
    paper: [36, 24],
    padTop: 44,
    padHeader: 34,
    padPitch: 34,
    padBottom: 52,
    ...tokens,
  };
  // vertical padding, user-adjustable: frame->title, header->grids,
  // grids->bottom row, bottom row->frame
  const P = {
    top: pads.top ?? T.padTop,
    header: pads.header ?? T.padHeader,
    pitch: pads.pitch ?? T.padPitch,
    bottom: pads.bottom ?? T.padBottom,
  };
  T.barGap = pads.bar ?? T.barGap ?? 12;
  if (barStyle) T.barStyle = barStyle;
  const F = 22; // poster frame inset
  const innings = norm.maxInning;
  const gridW = T.labelWidth + innings * T.cell;
  const gap = 56;
  const cw = T.pad * 2 + gridW * 2 + gap;
  const nameOf = (meta) => (T.cityNames ? meta.city || meta.name : meta.name);
  const parts = [];

  // refined title (keepsake): traditional case, larger title and meta
  const refined = T.refinedTitle;
  const titleSize = refined ? 42 : 36;
  const capH = Math.round(titleSize * 0.72);
  const metaSize = refined ? 16 : 11;
  const metaGap = refined ? 32 : 24;
  const titleText = refined
    ? `${norm.meta.away.name} @ ${norm.meta.home.name}`
    : `${norm.meta.away.name} @ ${norm.meta.home.name}`.toUpperCase();
  let y = F + P.top + capH; // title baseline
  parts.push(text(T.pad, y, titleText, "sc-title", titleSize, "start"));
  parts.push(text(T.pad, y + metaGap, subtitleOf(norm), "sc-subtitle", metaSize, "start"));

  const probe = linescoreBoxed(norm, 0, 0);
  // box top aligned with the title's cap height
  const lsY = y - capH;
  const [lsSvg] = linescoreBoxed(norm, cw - T.pad - probe[1], lsY);
  parts.push(lsSvg);

  y = Math.max(y + metaGap, lsY + probe[2]) + P.header;
  const scores = norm.linescore?.totals || {};
  // away card leads by default; "home-first" swaps the two scorecards
  const homeFirst = (gridOrder ?? T.gridOrder) === "home-first";
  const leftX = T.pad;
  const rightX = T.pad + gridW + gap;
  const [awaySvg, , gridH] = grid(
    norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, homeFirst ? rightX : leftX, y, T, scores.away?.runs
  );
  const [homeSvg] = grid(
    norm.sides.home, norm.meta.home, "HOME", innings, labelMode, homeFirst ? leftX : rightX, y, T, scores.home?.runs
  );
  parts.push(awaySvg, homeSvg);
  y += gridH + P.pitch;

  // bottom row, three equal columns; the notes column splits into two
  // internal 50% sub-columns
  if (T.showNotes || T.showPitching) {
    const colGap = 40;
    const innerW = gridW * 2 + gap;
    const colW = Math.floor((innerW - 2 * colGap) / 3);
    const colHeights = [0, 0, 0];
    // "notes-first" (default): notes | away pitching | home pitching
    // "pitching-first": away pitching | home pitching | notes
    const pitchingFirst = (bottomOrder ?? T.bottomOrder) === "pitching-first";
    const colX = (i) => T.pad + i * (colW + colGap);
    const nx = pitchingFirst ? colX(2) : colX(0);
    let rowH = 0;

    if (T.showNotes) {
      const subGap = 20;
      const subW = Math.floor((colW - subGap) / 2);
      const subChars = Math.floor((subW - 34) / 5.7);
      const swap = (notesOrder ?? T.notesOrder) === "notes-first";
      let colY = y;
      let subH = 0;

      const gl = gameNoteLines(norm, subChars);
      packItems(norm.gameNotes || [], subChars).forEach((l) =>
        gl.push({ tag: "", text: l, indent: 34 })
      );

      if (T.parkPanel) {
        // AT THE PARK panel + game notes, swappable
        const parkX = swap ? nx + subW + subGap : nx;
        const notesX = swap ? nx : nx + subW + subGap;
        const plainChars = Math.floor(subW / 5.7);
        const [pn, ph] = notesColumn("AT THE PARK", parkLines(norm, note, plainChars), parkX, colY);
        parts.push(pn);
        subH = ph;
        if (gl.length) {
          const [gn, gh] = notesColumn("GAME NOTES", gl, notesX, colY);
          parts.push(gn);
          subH = Math.max(subH, gh);
        }
      } else {
        // scoring plays + game notes, with the conditions line as a
        // titled header or a column footer
        const pos = infoPos ?? T.infoPos ?? "footer";
        const info = pos === "hidden" ? "" : conditionsLine(norm, Math.floor(colW / 6.2));
        if (pos === "header" && info) {
          parts.push(text(nx, colY + 10, "AT THE PARK", "sc-note-head", 13, "start"));
          parts.push(text(nx, colY + 32, info, "sc-note-tag", 11.5, "start"));
          colY += 68;
        }
        const scoringX = swap ? nx + subW + subGap : nx;
        const gameNotesX = swap ? nx : nx + subW + subGap;
        const [sn, sh] = notesColumn("SCORING PLAYS", scoringLines(norm, subChars), scoringX, colY);
        parts.push(sn);
        subH = sh;
        if (gl.length) {
          const [gn, gh] = notesColumn("GAME NOTES", gl, gameNotesX, colY);
          parts.push(gn);
          subH = Math.max(subH, gh);
        }
        if (pos === "footer" && info) {
          parts.push(text(nx, colY + subH + 22, info, "sc-note-tag", 11.5, "start"));
          subH += 22 + 15;
        }
      }
      const nc = pitchingFirst ? 2 : 0;
      colHeights[nc] = colY - y + subH;
      rowH = colHeights[nc];
    }

    if (T.showPitching && norm.pitching) {
      [
        [colX(pitchingFirst ? 0 : 1), "away", norm.meta.away, pitchingFirst ? 0 : 1],
        [colX(pitchingFirst ? 1 : 2), "home", norm.meta.home, pitchingFirst ? 1 : 2],
      ].forEach(([x, side, meta, ci]) => {
        parts.push(text(x, y + 10, `${nameOf(meta).toUpperCase()} — PITCHING`, "sc-note-head", 13, "start"));
        const [tbl, , th] = pitchingTable(norm.pitching[side], x, y + 26, colW);
        parts.push(tbl);
        colHeights[ci] = 26 + th;
        rowH = Math.max(rowH, 26 + th);
      });
    }

    // legend tucks under whichever column the form picked; the notes
    // column ends in text (baselines sit higher than table borders), so
    // it needs less air than the pitching tables for a uniform look
    const legendItems = T.legendDiamondReach ? REACH_LEGEND : CLASSIC_LEGEND;
    const lc = Math.min(Math.max(legendCol ?? T.legendCol ?? 1, 1), 3) - 1;
    const notesColIdx = pitchingFirst ? 2 : 0;
    const legendGap = lc === notesColIdx ? 18 : 34;
    const ly = y + colHeights[lc] + legendGap;
    parts.push(legend(legendItems, colX(lc), ly));
    rowH = Math.max(rowH, colHeights[lc] + legendGap + 14);
    y += rowH;
  } else {
    parts.push(legend(T.legendDiamondReach ? REACH_LEGEND : CLASSIC_LEGEND, T.pad, y));
    y += 14;
  }

  const ch = y + P.bottom + F;
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
