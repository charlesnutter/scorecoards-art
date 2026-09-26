// "Agate" — the morning paper's box score. A sports-page column: slug
// and hairline rules, a headline drawn from the game recap, the dateline
// and story set in a text face, and beside it the box in agate: the
// linescore grouped in threes with an x for the unplayed ninth, batting
// lines AB R H BI BB SO with substitutes indented under the man they
// replaced, the footnote block (E, DP, LOB, 2B, HR, SB), pitching lines
// IP H R ER BB SO, then T and A. Typeset, not handwritten: nobody fills
// in a newspaper.
//
// 11×17 portrait. Options (`card`): paper "fresh" | "yellowed".
import { esc, text } from "./common.js";
import { battingLines, groupedLinescore, paperCanvas, rule, box, longDate, weekday } from "./cardkit.js";
import { lastName } from "./hand.js";

const W = 880;
const M = 56;
const PAGE_H = Math.round((W * 17) / 11);

// greedy word wrap by estimated width (serif body ≈ 0.5em per char)
function wrap(str, maxChars) {
  const lines = [];
  let line = "";
  for (const w of String(str || "").split(/\s+/)) {
    if (!w) continue;
    if (line && (line + " " + w).length > maxChars) { lines.push(line); line = w; }
    else line = line ? `${line} ${w}` : w;
  }
  if (line) lines.push(line);
  return lines;
}

// Agate-style name: "Refsnyder dh", subs "a-Yoshida ph-dh"
function agateName(l, subLetter) {
  const nm = lastName(l.player.name);
  return l.sub ? `${subLetter}-${nm} ${l.player.pos.toLowerCase()}` : `${nm} ${l.player.pos.toLowerCase()}`;
}

export function renderAgate(norm, { preset = "agate", note = "", card = {} } = {}) {
  const paper = card.paper === "yellowed" ? "yellowed" : "fresh";
  const P = [];
  const { away, home, date, venue } = norm.meta;
  const t = norm.linescore.totals;
  const winner = (t.home.runs ?? 0) > (t.away.runs ?? 0) ? home : away;
  const loser = winner === home ? away : home;
  const wr = winner === home ? t.home.runs : t.away.runs;
  const lr = winner === home ? t.away.runs : t.home.runs;
  let y = M;

  /* ---- section slug ---- */
  P.push(rule(M, y, W - M, y, "ag-rule ag-rule--heavy"));
  P.push(text(M, y + 22, "BASEBALL", "ag-slug", 13, "start"));
  P.push(text(W - M, y + 22, `${weekday(date).toUpperCase()}, ${longDate(date).toUpperCase()}`, "ag-slug", 11, "end"));
  P.push(rule(M, y + 30, W - M, y + 30, "ag-rule"));
  y += 30;

  /* ---- headline ---- */
  const recap = norm.recap || {};
  const headline = recap.headline || `${lastName(winner.name)} ${wr}, ${lastName(loser.name)} ${lr}`;
  const headLines = wrap(headline, 30).slice(0, 3);
  y += 58;
  for (const l of headLines) { P.push(text(M, y, l, "ag-head", 46, "start")); y += 50; }
  y -= 8;
  // deck: the score line
  P.push(text(M, y + 22, `${winner.name} ${wr}, ${loser.name} ${lr}`, "ag-deck", 20, "start"));
  y += 44;
  P.push(rule(M, y, W - M, y, "ag-rule"));
  y += 22;

  /* ---- two regions: story left (one column), box right ---- */
  const boxW = 320;
  const boxX = W - M - boxW;
  const gutter = 26;
  const colW = boxX - gutter - M;
  const bodySize = 13.5;
  const lineH = 18;
  const charsPer = Math.floor(colW / (bodySize * 0.56));
  // story text: blurb, then "How they scored" from the scoring plays,
  // then the park facts as a closing paragraph
  const paras = [];
  if (recap.blurb) paras.push(recap.blurb.replace(/\s*–\s*$/, "."));
  const sc = norm.scoring || [];
  if (sc.length) {
    paras.push({ head: "How they scored" });
    for (const s of sc) paras.push(`${s.inning.replace(/^T/, "Top ").replace(/^B/, "Bottom ")}: ${s.desc} (${s.score}).`);
  }
  const d = norm.gameInfoDetail || {};
  const facts = [d.firstPitch && `First pitch ${d.firstPitch}`, d.duration && `time of game ${d.duration}`, d.attendance && `attendance ${d.attendance}`, d.temp && `${d.temp} and ${(d.sky || "").toLowerCase()}`, d.wind && `wind ${d.wind.toLowerCase()}`].filter(Boolean);
  if (facts.length) paras.push(`${facts.join(", ")}, at ${venue}.`);
  if (note) paras.push({ note });
  const lines = [];
  paras.forEach((p, i) => {
    if (typeof p === "object" && p.head) { lines.push({ t: "" }); lines.push({ t: p.head.toUpperCase(), cls: "ag-subhead" }); return; }
    if (typeof p === "object" && p.note) { lines.push({ t: "" }); wrap(p.note, charsPer - 2).forEach((l) => lines.push({ t: l, cls: "ag-body ag-body--italic" })); return; }
    const ws = wrap(p, charsPer);
    ws.forEach((l, k) => lines.push({ t: l, cls: "ag-body", indent: k === 0 && i > 0 ? 14 : 0 }));
  });
  // column-fill: as many lines as the box column is tall, computed after
  // the box; the box is laid out first into its own array
  const B = [];
  let by = y;
  const bx = boxX;
  const agate = (x, yy, s, cls = "ag-agate", a = "start", size = 10.5) => B.push(text(x, yy, s, cls, size, a));
  const colsX = [bx + boxW - 150, bx + boxW - 122, bx + boxW - 94, bx + boxW - 66, bx + boxW - 38, bx + boxW - 10];
  let letter = 0;
  const teamBox = (sideKey) => {
    const meta = norm.meta[sideKey];
    const { rows, tot } = battingLines(norm.sides[sideKey]);
    agate(bx, by, meta.name.toUpperCase(), "ag-agate ag-agate--bold", "start", 11);
    ["AB", "R", "H", "BI", "BB", "SO"].forEach((l, i) => agate(colsX[i], by, l, "ag-agate ag-agate--bold", "end", 10));
    by += 6;
    B.push(rule(bx, by, bx + boxW, by, "ag-hair"));
    by += 12;
    const letters = "abcdefghijklmnop";
    const notes = [];
    for (const l of rows) {
      const sub = l.sub ? letters[letter++] : "";
      agate(bx + (l.sub ? 10 : 0), by, agateName(l, sub), "ag-agate");
      [l.ab, l.r, l.h, l.rbi, l.bb, l.so].forEach((v, i) => agate(colsX[i], by, String(v), "ag-agate", "end"));
      if (l.sub) {
        // footnote for the sub: who he replaced and when
        const first = l.pas[0];
        const starter = rows.find((r) => r.slot === l.slot && !r.sub);
        notes.push(`${sub}-${first ? (l.player.pos === "PH" ? "pinch hit" : l.player.pos === "PR" ? "pinch ran" : "replaced " + lastName(starter.player.name)) : "replaced " + lastName(starter.player.name)}${first ? ` in the ${first.inning}${ord(first.inning)}` : ""}.`);
      }
      by += 13;
    }
    agate(bx, by, "Totals", "ag-agate ag-agate--bold");
    [tot.ab, tot.r, tot.h, tot.rbi, tot.bb, tot.so].forEach((v, i) => agate(colsX[i], by, String(v), "ag-agate ag-agate--bold", "end"));
    by += 16;
    return notes;
  };
  const notesA = teamBox("away");
  by += 4;
  const notesH = teamBox("home");
  // linescore grouped in threes
  by += 2;
  B.push(rule(bx, by - 10, bx + boxW, by - 10, "ag-hair"));
  const lsRow = (sideKey) => {
    const g = groupedLinescore(norm, sideKey);
    const s = g.map((grp) => grp.join("")).join(" ");
    const tt = t[sideKey];
    agate(bx, by, lastName(norm.meta[sideKey].name), "ag-agate ag-agate--bold");
    agate(bx + 118, by, s, "ag-agate ag-agate--mono");
    agate(bx + boxW, by, `— ${tt.runs} ${tt.hits} ${tt.errors}`, "ag-agate ag-agate--bold", "end");
    by += 13;
  };
  lsRow("away");
  lsRow("home");
  by += 4;
  // footnotes
  const foot = [];
  for (const n of [...notesA, ...notesH]) foot.push(n);
  const bn = norm.battingNotes || {};
  const tag = (label) => {
    const items = [];
    for (const side of ["away", "home"]) for (const s of bn[side] || []) if (s.startsWith(label + ":")) items.push(s.slice(label.length + 1).trim());
    return items.length ? `${label}—${items.join("; ")}.` : "";
  };
  ["E", "DP", "2B", "3B", "HR", "SB", "CS", "SF", "SAC", "GIDP"].forEach((l) => { const s = tag(l); if (s) foot.push(s); });
  foot.push(`LOB—${lastName(away.name)} ${t.away.leftOnBase ?? "-"}, ${lastName(home.name)} ${t.home.leftOnBase ?? "-"}.`);
  const footChars = Math.floor(boxW / (10.5 * 0.46));
  for (const f of foot) for (const l of wrap(f, footChars)) { agate(bx, by, l, "ag-agate"); by += 12.5; }
  by += 8;
  // pitching
  B.push(rule(bx, by - 8, bx + boxW, by - 8, "ag-hair"));
  ["IP", "H", "R", "ER", "BB", "SO"].forEach((l, i) => agate(colsX[i], by, l, "ag-agate ag-agate--bold", "end", 10));
  by += 13;
  for (const sideKey of ["away", "home"]) {
    agate(bx, by, norm.meta[sideKey].name.toUpperCase(), "ag-agate ag-agate--bold", "start", 10.5);
    by += 13;
    for (const p of norm.pitching?.[sideKey] || []) {
      const dec = p.note ? ` ${p.note === "W" ? "W" : p.note === "L" ? "L" : "S"},` : "";
      agate(bx, by, `${lastName(p.name)}${dec}`, "ag-agate");
      [p.ip, p.h, p.r, p.er, p.bb, p.so].forEach((v, i) => agate(colsX[i], by, String(v), "ag-agate", "end"));
      by += 13;
    }
  }
  by += 4;
  const gn = (norm.gameNotes || []).join(" ");
  const tail = [gn, `T—${d.duration || "-"}. A—${d.attendance || "-"}.`].filter(Boolean).join(" ");
  for (const l of wrap(tail, footChars)) { agate(bx, by, l, "ag-agate"); by += 12.5; }
  B.push(rule(bx, by + 2, bx + boxW, by + 2, "ag-rule"));
  P.push(rule(boxX - gutter / 2, y - 12, boxX - gutter / 2, by + 2, "ag-hair"));

  // now flow the story into two columns as tall as the box
  const availLines = Math.max(10, Math.floor((by - y) / lineH));
  const col = lines.slice(0, availLines);
  const overflow = lines.length > availLines;
  col.forEach((l, i) => {
    if (!l.t) return;
    P.push(text(M + (l.indent || 0), y + 12 + i * lineH, l.t, l.cls || "ag-body", l.cls === "ag-subhead" ? 11 : bodySize, "start"));
  });
  if (overflow) P.push(text(M + colW, y + 12 + (availLines - 1) * lineH + 14, "Continued on the back", "ag-agate ag-agate--italic", 9.5, "end"));
  P.push(B.join(""));
  y = by + 30;

  /* ---- foot slug, pinned to the bottom of the sheet ---- */
  y = Math.max(y, PAGE_H - M - 34);
  P.push(rule(M, y, W - M, y, "ag-rule ag-rule--heavy"));
  P.push(text(M, y + 18, `${away.abbr} AT ${home.abbr} · ${venue.toUpperCase()}`, "ag-slug", 10, "start"));
  P.push(text(W - M, y + 18, `SCORECARD № ${norm.meta.gamePk || ""}`, "ag-slug", 10, "end"));
  y += 34;

  const attrs = ` data-paper="${paper}"`;
  const defs = `<linearGradient id="ag-age" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#c9a961" stop-opacity="0.32"/><stop offset="0.5" stop-color="#c9a961" stop-opacity="0.05"/><stop offset="1" stop-color="#b78d43" stop-opacity="0.35"/></linearGradient>`;
  const body = `<rect class="ag-age" x="-200" y="-200" width="${W + 400}" height="${y + 400}" fill="url(#ag-age)"/>` + P.join("");
  return paperCanvas(W, Math.max(y + M, PAGE_H), [11, 17], preset, body, { valign: "top", attrs, defs });
}

function ord(n) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
