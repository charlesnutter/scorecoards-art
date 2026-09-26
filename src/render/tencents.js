// "Ten Cents" — the team-issued Official Score Card of 1937–1968: a
// cheap two-colour interior spread (one spot colour plus a dark) on
// cream stock, square cells with a half-row under every starter for the
// substitute, AB R H at the right, and an advertisement in every margin.
// Ours keep the ad boxes but sell the game instead of cigars: the park
// facts, the pitchers' records, a how-to-score key and a souvenir note.
// The home club is printed; the visitors, the date and every play are
// written in by hand.
//
// 17×11 landscape spread. Options (`card`): ink "pen" | "pencil";
// scheme "vermilion" | "kelly" | "royal".
import { esc, text } from "./common.js";
import { makeHand, handText, handFilters, nameMaker, handDate } from "./hand.js";
import { lineupGrid, handMarks, paperCanvas, rule, box, longDate } from "./cardkit.js";

const M = 54;

export function renderTenCents(norm, { preset = "tencents", note = "", card = {} } = {}) {
  const ink = card.ink === "pencil" ? "pencil" : "pen";
  const scheme = ["vermilion", "kelly", "royal"].includes(card.scheme) ? card.scheme : "vermilion";
  const seed = Number(norm.meta.gamePk) || 1;
  const h = makeHand(seed);
  const innings = Math.max(9, norm.maxInning);
  const P = []; // print layer
  const Hd = []; // hand layer
  const HC = { text: "hd-text", stroke: "hd-stroke", dot: "hd-dot" };
  const words = (x, y, s, size, o = {}) => Hd.push(handText(h, x, y, s, size, { face: "words", cls: "hd-text hd-text--words", ...o }));
  const marks = (x, y, s, size, o = {}) => Hd.push(handText(h, x, y, s, size, { cls: "hd-text", ...o }));

  /* ---- masthead ---- */
  const adW = 250;
  const cell = 52;
  const gridW = 30 + 150 + 32 + innings * cell + 30 + 30 + 30 + 34;
  const gapX = 34;
  const cw = M + adW + 30 + gridW * 2 + gapX + M;
  let y = M;
  // price roundel, top right
  P.push(`<circle class="tc-roundel" cx="${cw - M - 46}" cy="${y + 46}" r="46"/>`);
  P.push(text(cw - M - 46, y + 62, "10¢", "tc-price", 40));
  P.push(text(M, y + 22, "OFFICIAL", "tc-eyebrow", 15, "start"));
  P.push(text(M, y + 78, "SCORE CARD", "tc-title", 66, "start"));
  P.push(box(M, y + 88, 470, 8, "tc-bar"));
  P.push(box(M, y + 100, 300, 4, "tc-bar"));
  // home club printed, visitors written in
  const home = norm.meta.home;
  P.push(text(cw / 2, y + 34, home.name.toUpperCase(), "tc-club", 30));
  P.push(text(cw / 2, y + 58, `${norm.meta.venue.toUpperCase()}`, "tc-eyebrow", 13));
  P.push(text(cw / 2 - 160, y + 96, "VS.", "tc-eyebrow", 13, "end"));
  P.push(rule(cw / 2 - 150, y + 100, cw / 2 + 150, y + 100, "tc-rule"));
  words(cw / 2, y + 95, norm.meta.away.name, 30, { anchor: "middle", fit: 290 });
  P.push(text(cw - M - 110, y + 118, "DATE", "tc-eyebrow", 12, "end"));
  P.push(rule(cw - M - 100, y + 122, cw - M + 4, y + 122, "tc-rule"));
  marks(cw - M - 48, y + 117, handDate(norm.meta.date), 24, { anchor: "middle" });
  y += 150;

  /* ---- ad column on the left ---- */
  const adGap = 18;
  const ad = (x, ay, w, hgt, head, lines, { big = "" } = {}) => {
    P.push(box(x, ay, w, hgt, "tc-ad"));
    P.push(box(x + 5, ay + 5, w - 10, hgt - 10, "tc-ad-inner"));
    let ly = ay + 34;
    P.push(text(x + w / 2, ly, head, "tc-ad-head", 17));
    ly += 10;
    P.push(rule(x + 24, ly, x + w - 24, ly, "tc-rule"));
    if (big) {
      ly += 46;
      P.push(text(x + w / 2, ly, big, "tc-ad-big", 34));
      ly += 4;
    }
    for (const l of lines) {
      ly += 19;
      if (l.hand) words(x + w / 2, ly, l.text, 20, { anchor: "middle", fit: w - 40 });
      else P.push(text(x + w / 2, ly, l.text, l.small ? "tc-ad-small" : "tc-ad-copy", l.small ? 9.5 : 12));
    }
    return hgt;
  };
  const d = norm.gameInfoDetail || {};
  let ay = y;
  ay += ad(M, ay, adW, 178, "AT THE PARK", [
    { text: d.firstPitch ? `FIRST PITCH ${d.firstPitch}` : "" },
    { text: d.duration ? `TIME OF GAME ${d.duration}` : "" },
    { text: d.temp ? `${d.temp} · ${d.sky || ""}`.replace(/ · $/, "") : "" },
    { text: d.wind ? `WIND ${d.wind.toUpperCase()}` : "" },
    { text: "", small: true },
  ].filter((l) => l.text !== undefined), { big: d.attendance ? d.attendance : "" }) + adGap;
  if (d.attendance) P.push(text(M + adW / 2, y + 100, "PAID ATTENDANCE", "tc-ad-small", 9.5));
  ay += ad(M, ay, adW, 236, "HOW TO SCORE", [
    { text: "1 PITCHER · 2 CATCHER" },
    { text: "3 FIRST · 4 SECOND · 5 THIRD" },
    { text: "6 SHORT · 7 LEFT · 8 CENTER · 9 RIGHT" },
    { text: "" },
    { text: "1B 2B 3B HR HITS · BB WALK" },
    { text: "K STRUCK OUT · F FLY · L LINER" },
    { text: "6-3 FIELDED BY 6, THROWN TO 3" },
    { text: "SHADE THE DIAMOND FOR A RUN", small: true },
  ]) + adGap;
  ay += ad(M, ay, adW, 190, "SOUVENIR", [
    { text: "KEEP THIS CARD", small: true },
    { text: note || " ", hand: true },
    { text: " " },
    { text: "SCORED BY", small: true },
  ]);
  P.push(rule(M + 30, ay - 18, M + adW - 30, ay - 18, "tc-rule"));
  ay += adGap;

  /* ---- the two grids ---- */
  const gx0 = M + adW + 30;
  const rowH = 58;
  const gridSpec = (side, x) => {
    const nameOf = nameMaker(Object.values(side.slots).flat());
    return lineupGrid({
      x, y, side, innings, cell, rowH, headH: 24, subLines: 2, totalsH: 26,
      cols: [{ key: "num", w: 30 }, { key: "name", w: 150 }, { key: "pos", w: 32 }],
      labels: { num: "NO.", name: "PLAYER", pos: "POS" },
      stats: [{ key: "ab", w: 30 }, { key: "r", w: 30 }, { key: "h", w: 30 }, { key: "rbi", w: 34 }],
      chrome: {
        headCell: (cx, cy, w, hh, label) => box(cx, cy, w, hh, "tc-head") + text(cx + w / 2, cy + 16, label, "tc-head-text", 10.5),
        cell: (cx, cy, w, hh, kind) => {
          let s = box(cx, cy, w, hh, kind.startsWith("totals") ? "tc-cell tc-cell--totals" : "tc-cell");
          if (kind === "name" || kind === "num" || kind === "pos") s += rule(cx, cy + hh / 2, cx + w, cy + hh / 2, "tc-subrule");
          if (kind === "inning") s += rule(cx + 4, cy + hh - 4, cx + 4, cy + hh - 4, "");
          return s;
        },
        name: (cx, cy, w, hh, p, k, slot, cols, more) => {
          const numX = cx + cols[0].w / 2;
          const nameX = cx + cols[0].w + 7;
          const posX = cx + cols[0].w + cols[1].w + cols[2].w / 2;
          const by = cy + hh * 0.72;
          const size = k === 0 ? 24 : 20;
          const out = [];
          if (p.number) out.push(handText(h, numX, by, p.number, size * 0.85, { anchor: "middle", cls: "hd-text" }));
          out.push(handText(h, nameX, by, nameOf(p.name) + (more ? ` +${p.more}` : ""), size, { face: "words", cls: "hd-text hd-text--words", fit: cols[1].w - 12 }));
          if (p.pos) out.push(handText(h, posX, by, p.pos, size * 0.8, { anchor: "middle", cls: "hd-text", fit: cols[2].w - 6 }));
          Hd.push(out.join(""));
          return "";
        },
        mark: (pa, r, k, n) => { Hd.push(handMarks(h, pa, r, k, n, { cls: HC })); return ""; },
        stat: (cx, cy, w, hh, v) => { Hd.push(handText(h, cx + w / 2, cy + hh / 2 + 7, v, 21, { anchor: "middle", cls: "hd-text" })); return ""; },
        total: (cx, cy, w, hh, v, kind) => {
          const s = kind === "inning" ? `${v.runs}` : String(v);
          Hd.push(handText(h, cx + w / 2, cy + hh / 2 + 7, s, 20, { anchor: "middle", cls: "hd-text" }));
          return "";
        },
        frame: (fx, fy, fw, fh) => box(fx, fy, fw, fh, "tc-frame"),
      },
    });
  };
  const away = gridSpec(norm.sides.away, gx0);
  const homeG = gridSpec(norm.sides.home, gx0 + away.w + gapX);
  // team captions above each grid
  P.push(text(gx0, y - 8, "VISITORS", "tc-eyebrow", 13, "start"));
  P.push(text(gx0 + away.w + gapX, y - 8, home.name.toUpperCase(), "tc-eyebrow", 13, "start"));
  P.push(text(gx0 + away.w, y - 8, "RUNS", "tc-eyebrow", 10, "end"));
  P.push(text(gx0 + away.w + gapX + homeG.w, y - 8, "RUNS", "tc-eyebrow", 10, "end"));
  P.push(away.svg, homeG.svg);
  const totalW = away.w + gapX + homeG.w;
  let gy = y + Math.max(away.h, homeG.h) + 26;

  /* ---- bottom strip: score by innings + pitchers as ads ---- */
  const ls = norm.linescore;
  const lsInn = Math.max(9, ls.innings.length);
  const lsW = 150 + lsInn * 30 + 3 * 34;
  const lsX = gx0;
  P.push(text(lsX, gy + 14, "SCORE BY INNINGS", "tc-eyebrow", 13, "start"));
  const lsY = gy + 22;
  const rowHh = 26;
  P.push(box(lsX, lsY, lsW, rowHh * 3, "tc-frame"));
  P.push(box(lsX, lsY, lsW, rowHh, "tc-head"));
  let lx = lsX + 150;
  const cols = [...Array.from({ length: lsInn }, (_, i) => String(i + 1)), "R", "H", "E"];
  cols.forEach((c, i) => {
    const w = i < lsInn ? 30 : 34;
    P.push(rule(lx, lsY, lx, lsY + rowHh * 3, i === lsInn ? "tc-frame" : "tc-cell"));
    P.push(text(lx + w / 2, lsY + 17, c, "tc-head-text", 10.5));
    [["away", 1], ["home", 2]].forEach(([s, r]) => {
      let v = "";
      if (i < lsInn) { const inn = ls.innings[i]; if (inn) v = inn[s] == null ? (s === "home" && i === ls.innings.length - 1 ? "X" : "") : inn[s]; }
      else v = [ls.totals[s].runs, ls.totals[s].hits, ls.totals[s].errors][i - lsInn];
      marks(lx + w / 2, lsY + r * rowHh + 19, v, 21, { anchor: "middle" });
    });
    lx += w;
  });
  P.push(rule(lsX, lsY + rowHh * 2, lsX + lsW, lsY + rowHh * 2, "tc-cell"));
  words(lsX + 8, lsY + rowHh + 19, norm.meta.away.name, 21, { fit: 134 });
  P.push(text(lsX + 8, lsY + rowHh * 2 + 18, home.name.toUpperCase(), "tc-head-text tc-head-text--dark", 10.5, "start"));

  // pitchers' record ad box to the right of the linescore
  const px = lsX + lsW + 30;
  const pw = gx0 + totalW - px;
  const pRows = Math.max(norm.pitching?.away?.length || 0, norm.pitching?.home?.length || 0);
  const ph = 58 + Math.max(4, pRows) * 21 + 18;
  P.push(box(px, gy, pw, ph, "tc-ad"));
  P.push(box(px + 5, gy + 5, pw - 10, ph - 10, "tc-ad-inner"));
  P.push(text(px + pw / 2, gy + 26, "THE PITCHERS' RECORD", "tc-ad-head", 15));
  const colW = (pw - 40) / 2;
  [["away", norm.meta.away], ["home", home]].forEach(([s, meta], ci) => {
    const cx = px + 20 + ci * colW;
    const pn = nameMaker((norm.pitching?.[s] || []).map((p) => ({ name: p.name })));
    P.push(text(cx, gy + 48, meta.name.toUpperCase(), "tc-ad-small", 9.5, "start"));
    const statCols = ["IP", "H", "R", "ER", "BB", "SO"];
    const sx0 = cx + colW - 30 - statCols.length * 26;
    statCols.forEach((l, k) => P.push(text(sx0 + k * 26 + 13, gy + 48, l, "tc-ad-small", 9.5)));
    P.push(rule(cx, gy + 54, cx + colW - 30, gy + 54, "tc-rule"));
    (norm.pitching?.[s] || []).forEach((p, i) => {
      const yy = gy + 74 + i * 21;
      words(cx, yy, `${pn(p.name)}${p.note ? ` (${p.note})` : ""}`, 19, { fit: sx0 - cx - 10 });
      [p.ip, p.h, p.r, p.er, p.bb, p.so].forEach((v, k) => marks(sx0 + k * 26 + 13, yy, v, 18, { anchor: "middle" }));
    });
  });
  gy += Math.max(rowHh * 3 + 22, ph) + M * 0.6;

  const H = Math.max(gy, ay + M);
  const attrs = ` data-ink="${ink}" data-scheme="${scheme}"`;
  const body =
    `<g class="tc-print">${P.join("")}</g>` +
    `<g class="hd-layer" filter="url(#tc-${ink})">${Hd.join("")}</g>`;
  return paperCanvas(cw, H, [17, 11], preset, body, { valign: "top", attrs, defs: handFilters("tc", 4000, 3000, seed), cls: "hd-card" });
}
