// "Foil" — the designer-stationery scorebook (Eephus League, Numbers
// Game, Bob Carpenter's book): bright white stock, a single spot ink, a
// foil-stamped wordmark and almost nothing else printed. Nine slots with
// two substitution lines each, blank cells, a spare box under every
// inning column, a nine-row pitcher block. Filled in a fine black gel pen.
//
// 17×11 landscape spread. Options (`card`): ink "green" | "black" | "navy"
// (the spot colour); foil "gold" | "copper".
import { text } from "./common.js";
import { makeHand, handText, handFilters, nameMaker, handDate } from "./hand.js";
import { lineupGrid, handMarks, paperCanvas, rule, box, longDate } from "./cardkit.js";

const M = 64;

export function renderFoil(norm, { preset = "foil", note = "", card = {} } = {}) {
  const ink = ["green", "black", "navy"].includes(card.ink) ? card.ink : "green";
  const foil = card.foil === "copper" ? "copper" : "gold";
  const seed = Number(norm.meta.gamePk) || 1;
  const h = makeHand(seed);
  const innings = Math.max(9, norm.maxInning);
  const P = [];
  const Hd = [];
  const HC = { text: "hd-text", stroke: "hd-stroke", dot: "hd-dot" };
  const words = (x, y, s, size, o = {}) => Hd.push(handText(h, x, y, s, size, { face: "words", cls: "hd-text hd-text--words", ...o }));
  const marks = (x, y, s, size, o = {}) => Hd.push(handText(h, x, y, s, size, { cls: "hd-text", ...o }));
  const lbl = (x, y, s, size = 8.5, a = "start") => P.push(text(x, y, s, "fl-label", size, a));

  const cw = 1720;
  let y = M;
  // foil wordmark + hairline fields
  P.push(`<text x="${M}" y="${y + 44}" class="fl-mark" font-size="54" text-anchor="start">Scorebook</text>`);
  P.push(text(M + 268, y + 44, "No. 22", "fl-label", 9.5, "start"));
  const field = (x, w, label, val, size = 22) => {
    lbl(x, y + 12, label);
    P.push(rule(x, y + 46, x + w, y + 46, "fl-rule"));
    if (val) words(x + 2, y + 40, val, size, { fit: w - 8 });
  };
  field(cw / 2 - 40, 300, "VISITING CLUB", norm.meta.away.name);
  field(cw / 2 + 290, 300, "HOME CLUB", norm.meta.home.name);
  field(cw - M - 150, 150, "DATE", handDate(norm.meta.date));
  y += 76;
  const d = norm.gameInfoDetail || {};
  const cell = 54;
  const rowH = 66;
  field(M, 220, "BALLPARK", norm.meta.venue, 20);
  field(M + 250, 110, "FIRST PITCH", d.firstPitch || "", 20);
  field(M + 390, 110, "TIME", d.duration || "", 20);
  field(M + 530, 130, "ATTENDANCE", d.attendance || "", 20);
  field(M + 690, 260, "WEATHER", [d.temp, d.sky, d.wind].filter(Boolean).join(", "), 20);
  field(M + 980, cw - 2 * M - 980, "SCORER'S NOTE", note || "", 20);
  y += 78;

  const gridFor = (sideKey, x) => {
    const side = norm.sides[sideKey];
    const nameOf = nameMaker(Object.values(side.slots).flat());
    lbl(x, y - 10, sideKey === "away" ? "VISITING CLUB — BATTING" : "HOME CLUB — BATTING", 9);
    return lineupGrid({
      x, y, side, innings, cell, rowH, headH: 18, subLines: 3, totalsH: 22,
      cols: [{ key: "num", w: 26 }, { key: "name", w: 150 }, { key: "pos", w: 28 }],
      labels: { num: "", name: "", pos: "" },
      stats: [{ key: "ab", w: 26 }, { key: "r", w: 26 }, { key: "h", w: 26 }, { key: "rbi", w: 28 }],
      chrome: {
        headCell: (cx, cy, w, hh, label, kind) => (label ? text(cx + w / 2, cy + 12, label, "fl-label", 8.5) : ""),
        cell: (cx, cy, w, hh, kind) => {
          if (kind === "inning") return box(cx, cy, w, hh, "fl-cell");
          if (kind === "stat") return box(cx, cy, w, hh, "fl-cell fl-cell--tint");
          if (kind.startsWith("totals")) return box(cx, cy, w, hh, "fl-cell fl-cell--tint");
          // label cells: three hairlines for starter + two subs
          let s = box(cx, cy, w, hh, "fl-cell");
          s += rule(cx, cy + hh / 3, cx + w, cy + hh / 3, "fl-hair") + rule(cx, cy + (2 * hh) / 3, cx + w, cy + (2 * hh) / 3, "fl-hair");
          return s;
        },
        name: (cx, cy, w, hh, p, k, slot, cols, more) => {
          const by = cy + hh * 0.78;
          const size = k === 0 ? 18 : 16;
          const out = [];
          if (p.number) out.push(handText(h, cx + cols[0].w / 2, by, p.number, size * 0.85, { anchor: "middle", cls: "hd-text" }));
          out.push(handText(h, cx + cols[0].w + 5, by, nameOf(p.name) + (more ? ` +${p.more}` : ""), size, { face: "words", cls: "hd-text hd-text--words", fit: cols[1].w - 10 }));
          if (p.pos) out.push(handText(h, cx + cols[0].w + cols[1].w + cols[2].w / 2, by, p.pos, size * 0.75, { anchor: "middle", cls: "hd-text", fit: cols[2].w - 4 }));
          Hd.push(out.join(""));
          return "";
        },
        mark: (pa, r, k, n) => { Hd.push(handMarks(h, pa, r, k, n, { cls: HC, codeSize: 0.95 })); return ""; },
        stat: (cx, cy, w, hh, v) => { Hd.push(handText(h, cx + w / 2, cy + hh / 2 + 6, v, 18, { anchor: "middle", cls: "hd-text" })); return ""; },
        total: (cx, cy, w, hh, v, kind) => {
          Hd.push(handText(h, cx + w / 2, cy + hh / 2 + 6, kind === "inning" ? `${v.runs}` : String(v), 16, { anchor: "middle", cls: "hd-text" }));
          return "";
        },
        frame: (fx, fy, fw, fh, g) => {
          // the spare box under each inning column reads as the totals
          // row; label it in the margin
          return text(fx + 4, fy + fh - 7, "R", "fl-label", 8, "start") + box(fx, fy + g.headH, fw, fh - g.headH, "fl-frame");
        },
      },
    });
  };
  const A = gridFor("away", M);
  const gap = 40;
  const B = gridFor("home", M + A.w + gap);
  P.push(A.svg, B.svg);
  y += Math.max(A.h, B.h) + 40;

  // pitcher blocks under each grid, nine rows
  const pitcherBlock = (sideKey, x, w) => {
    const list = norm.pitching?.[sideKey] || [];
    const pn = nameMaker(list.map((p) => ({ name: p.name })));
    const cols = [["PITCHER", w - 8 * 34], ["DEC", 34], ["IP", 34], ["H", 34], ["R", 34], ["ER", 34], ["BB", 34], ["SO", 34], ["NP", 34]];
    const rh = 24;
    const rows = Math.max(6, list.length);
    let cx = x;
    cols.forEach(([l, cwid], i) => { lbl(i === 0 ? cx : cx + cwid / 2, y - 6, l, 8, i === 0 ? "start" : "middle"); cx += cwid; });
    for (let r = 0; r <= rows; r++) P.push(rule(x, y + r * rh, x + w, y + r * rh, r === 0 ? "fl-rule" : "fl-hair"));
    list.slice(0, rows).forEach((p, i) => {
      const yy = y + (i + 1) * rh - 6;
      let px = x;
      [pn(p.name), p.note, p.ip, p.h, p.r, p.er, p.bb, p.so, p.p].forEach((v, k) => {
        const cwid = cols[k][1];
        if (k === 0) words(px + 2, yy, v, 17, { fit: cwid - 10 });
        else marks(px + cwid / 2, yy, v, 16, { anchor: "middle" });
        px += cwid;
      });
    });
    return rows * rh;
  };
  const lsW = 430;
  const pbW = A.w - lsW - 40;
  const ph = pitcherBlock("away", M, pbW);
  pitcherBlock("home", M + A.w + gap, B.w);
  // linescore, hairline, beside the visiting pitchers
  const lx = M + pbW + 40;
  const ls = norm.linescore;
  const n = Math.max(9, ls.innings.length);
  const cwid = (lsW - 120) / (n + 3);
  lbl(lx, y - 6, "LINESCORE", 8);
  for (let i = 0; i < n + 3; i++) lbl(lx + 120 + i * cwid + cwid / 2, y - 6, i < n ? String(i + 1) : ["R", "H", "E"][i - n], 8, "middle");
  for (let r = 0; r <= 2; r++) P.push(rule(lx, y + r * 24, lx + lsW, y + r * 24, r === 0 ? "fl-rule" : "fl-hair"));
  [["away", 1], ["home", 2]].forEach(([s, r]) => {
    words(lx + 2, y + r * 24 - 6, norm.meta[s].name, 16, { fit: 112 });
    for (let i = 0; i < n + 3; i++) {
      let v = "";
      if (i < n) { const inn = ls.innings[i]; if (inn) v = inn[s] == null ? (s === "home" && i === ls.innings.length - 1 ? "x" : "") : inn[s]; }
      else v = [ls.totals[s].runs, ls.totals[s].hits, ls.totals[s].errors][i - n];
      marks(lx + 120 + i * cwid + cwid / 2, y + r * 24 - 6, v, 16, { anchor: "middle" });
    }
  });
  y += ph + M;
  // foil rule at the foot
  P.push(rule(M, y - 30, cw - M, y - 30, "fl-foil-rule"));
  P.push(text(cw - M, y - 38, longDate(norm.meta.date).toUpperCase(), "fl-label", 8.5, "end"));

  const attrs = ` data-ink="${ink}" data-foil="${foil}"`;
  const defs = handFilters("fl", 4000, 3000, seed) +
    `<linearGradient id="fl-foil-gold" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e6c979"/><stop offset="0.45" stop-color="#b8923a"/><stop offset="0.6" stop-color="#f1dc9a"/><stop offset="1" stop-color="#a67c2c"/></linearGradient>` +
    `<linearGradient id="fl-foil-copper" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#e2a27a"/><stop offset="0.45" stop-color="#a95f3a"/><stop offset="0.6" stop-color="#f0c1a0"/><stop offset="1" stop-color="#8f4b2c"/></linearGradient>`;
  const body = `<g class="fl-print">${P.join("")}</g><g class="hd-layer" filter="url(#fl-pen)">${Hd.join("")}</g>`;
  return paperCanvas(cw, y, [17, 11], preset, body, { valign: "top", attrs, defs, cls: "hd-card" });
}
