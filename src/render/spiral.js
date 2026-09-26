// "Spiral" — the coach's wire-bound scorebook (Peterson's, Rawlings
// System-17, Wilson): a utility form in one ink on manila stock, a
// diamond pre-printed in every cell with the fielders' position numbers
// around it, ball/strike boxes in the corner, AB R H RBI totals, a
// pitcher log with a pitch tally, spare rows nobody uses, and the wire
// binding punched along the top. Filled in pencil.
//
// 17×11 landscape spread (one team per page). Options (`card`):
// form "green" | "red" | "blue"; paper "manila" | "white".
import { text } from "./common.js";
import { makeHand, handText, handFilters, nameMaker, handDate } from "./hand.js";
import { lineupGrid, handMarks, printedDiamond, paperCanvas, rule, box } from "./cardkit.js";

const M = 46;

export function renderSpiral(norm, { preset = "spiral", note = "", card = {} } = {}) {
  const form = ["green", "red", "blue"].includes(card.form) ? card.form : "green";
  const paper = card.paper === "white" ? "white" : "manila";
  const seed = Number(norm.meta.gamePk) || 1;
  const h = makeHand(seed);
  const innings = Math.max(9, norm.maxInning);
  const P = [];
  const Hd = [];
  const HC = { text: "hd-text", stroke: "hd-stroke", dot: "hd-dot" };
  const words = (x, y, s, size, o = {}) => Hd.push(handText(h, x, y, s, size, { face: "words", cls: "hd-text hd-text--words", ...o }));
  const marks = (x, y, s, size, o = {}) => Hd.push(handText(h, x, y, s, size, { cls: "hd-text", ...o }));

  const cw = 1720;
  const pageW = (cw - 2 * M - 24) / 2;
  // wire binding along the top: holes and loops
  for (let x = M + 20; x < cw - M; x += 34) {
    P.push(`<rect class="sp-hole" x="${x}" y="14" width="14" height="22" rx="4"/>`);
    P.push(`<path class="sp-wire" d="M${x + 2},36 C${x - 4},26 ${x - 4},2 ${x + 7},2 C${x + 18},2 ${x + 18},26 ${x + 12},36"/>`);
  }
  const top = 58;

  const page = (sideKey, px) => {
    const side = norm.sides[sideKey];
    const meta = norm.meta[sideKey];
    const opp = norm.meta[sideKey === "away" ? "home" : "away"];
    const nameOf = nameMaker(Object.values(side.slots).flat());
    let y = top;
    // form header: boxes with labels in the corner, filled by hand
    const field = (x, w, label, val, hand = true) => {
      P.push(box(x, y, w, 34, "sp-box"));
      P.push(text(x + 4, y + 10, label, "sp-label", 8, "start"));
      if (val) hand ? words(x + 8, y + 28, val, 22, { fit: w - 14 }) : P.push(text(x + 8, y + 26, val, "sp-form", 12, "start"));
    };
    P.push(text(px, y - 8, "BASEBALL SCOREBOOK", "sp-title", 20, "start"));
    P.push(text(px + pageW, y - 8, sideKey === "away" ? "VISITING TEAM" : "HOME TEAM", "sp-title sp-title--right", 12, "end"));
    field(px, 250, "TEAM", meta.name);
    field(px + 250, 200, "VS", opp.name);
    field(px + 450, 120, "DATE", handDate(norm.meta.date));
    field(px + 570, pageW - 570, "AT", norm.meta.venue);
    y += 34;
    const d = norm.gameInfoDetail || {};
    field(px, 130, "START", d.firstPitch || "");
    field(px + 130, 130, "TIME", d.duration || "");
    field(px + 260, 200, "WEATHER", [d.temp, d.sky].filter(Boolean).join(" "));
    field(px + 460, 160, "WIND", d.wind || "");
    field(px + 620, pageW - 620, "ATTENDANCE", d.attendance || "");
    y += 34 + 14;

    // the grid: 12 rows (9 + spares), diamond with position digits
    const cell = 48;
    const rowH = 48;
    const slots = Math.max(11, ...Object.keys(side.slots).map(Number));
    const g = lineupGrid({
      x: px, y, side, innings, cell, rowH, headH: 20, subLines: 2, totalsH: 22, slotCount: slots,
      cols: [{ key: "num", w: 26 }, { key: "name", w: 124 }, { key: "pos", w: 26 }],
      labels: { num: "#", name: "PLAYER", pos: "P" },
      stats: [{ key: "ab", w: 24 }, { key: "r", w: 24 }, { key: "h", w: 24 }, { key: "rbi", w: 26, label: "RBI" }],
      chrome: {
        headCell: (cx, cy, w, hh, label) => box(cx, cy, w, hh, "sp-head") + text(cx + w / 2, cy + 14, label, "sp-head-text", 9),
        cell: (cx, cy, w, hh, kind, info) => {
          let s = box(cx, cy, w, hh, kind.startsWith("totals") ? "sp-cell sp-cell--totals" : "sp-cell");
          if (kind === "name" || kind === "num" || kind === "pos") s += rule(cx, cy + hh / 2, cx + w, cy + hh / 2, "sp-subrule");
          if (kind === "inning") {
            const ccx = cx + w / 2, ccy = cy + hh / 2 + 3, r = 13;
            s += printedDiamond(ccx, ccy, r, "sp-diamond");
            // fielders' numbers around the diamond
            const pos = [["8", ccx, ccy - r - 6], ["7", ccx - r - 2, ccy - r + 1], ["9", ccx + r + 2, ccy - r + 1], ["6", ccx - r + 1, ccy - 4], ["4", ccx + r - 1, ccy - 4], ["5", ccx - r - 3, ccy + 8], ["3", ccx + r + 3, ccy + 8], ["1", ccx, ccy + 2], ["2", ccx, ccy + r + 8]];
            for (const [n, x1, y1] of pos) s += text(x1, y1, n, "sp-posnum", 5.5);
            // ball / strike boxes, top-left
            for (let b = 0; b < 3; b++) s += box(cx + 2 + b * 6, cy + 2, 5, 5, "sp-bs");
            for (let k = 0; k < 2; k++) s += box(cx + 2 + k * 6, cy + 9, 5, 5, "sp-bs");
          }
          return s;
        },
        name: (cx, cy, w, hh, p, k, slot, cols, more) => {
          const by = cy + hh * 0.74;
          const size = k === 0 ? 20 : 17;
          const out = [];
          if (p.number) out.push(handText(h, cx + cols[0].w / 2, by, p.number, size * 0.85, { anchor: "middle", cls: "hd-text" }));
          out.push(handText(h, cx + cols[0].w + 5, by, nameOf(p.name) + (more ? ` +${p.more}` : ""), size, { face: "words", cls: "hd-text hd-text--words", fit: cols[1].w - 10 }));
          if (p.pos) out.push(handText(h, cx + cols[0].w + cols[1].w + cols[2].w / 2, by, p.pos, size * 0.75, { anchor: "middle", cls: "hd-text", fit: cols[2].w - 4 }));
          Hd.push(out.join(""));
          return "";
        },
        mark: (pa, r, k, n) => { Hd.push(handMarks(h, pa, r, k, n, { cls: HC, r: n > 1 ? 8 : 13, codeSize: 0.9 })); return ""; },
        stat: (cx, cy, w, hh, v) => { Hd.push(handText(h, cx + w / 2, cy + hh / 2 + 6, v, 18, { anchor: "middle", cls: "hd-text" })); return ""; },
        total: (cx, cy, w, hh, v, kind) => {
          Hd.push(handText(h, cx + w / 2, cy + hh / 2 + 6, kind === "inning" ? `${v.runs}/${v.hits}` : String(v), 16, { anchor: "middle", cls: "hd-text" }));
          return "";
        },
        frame: (fx, fy, fw, fh) => box(fx, fy, fw, fh, "sp-frame"),
      },
    });
    P.push(g.svg);
    P.push(text(px + 4, y + g.h - 7, "R / H", "sp-label", 8, "start"));
    y += g.h + 16;

    // pitcher log with pitch tally
    const list = norm.pitching?.[sideKey] || [];
    const pn = nameMaker(list.map((p) => ({ name: p.name })));
    const rows = Math.max(5, list.length);
    const cols = [["PITCHER", 150], ["W/L", 30], ["IP", 34], ["H", 26], ["R", 26], ["ER", 26], ["BB", 26], ["SO", 26], ["HR", 26], ["PITCHES", g.w - 150 - 30 - 34 - 26 * 6]];
    const rh = 20;
    P.push(box(px, y, g.w, rh * (rows + 1), "sp-frame"));
    P.push(box(px, y, g.w, rh, "sp-head"));
    let cx = px;
    cols.forEach(([l, w], i) => {
      if (i) P.push(rule(cx, y, cx, y + rh * (rows + 1), "sp-cell"));
      P.push(text(i === 0 ? cx + 6 : cx + w / 2, y + 14, l, "sp-head-text", 9, i === 0 ? "start" : "middle"));
      cx += w;
    });
    for (let r = 1; r <= rows; r++) {
      P.push(rule(px, y + r * rh, px + g.w, y + r * rh, "sp-cell"));
      const p = list[r - 1];
      if (!p) continue;
      const yy = y + r * rh + 15;
      let x = px;
      const vals = [pn(p.name), p.note, p.ip, p.h, p.r, p.er, p.bb, p.so, p.hr];
      vals.forEach((v, i) => {
        const w = cols[i][1];
        if (i === 0) words(x + 6, yy, v, 17, { fit: w - 12 });
        else marks(x + w / 2, yy, v, 16, { anchor: "middle" });
        x += w;
      });
      // tally marks for pitches: groups of five, then the count
      const n = Number(p.p) || 0;
      const tallyW = cols[9][1];
      const groups = Math.min(Math.floor(n / 5), Math.floor((tallyW - 40) / 14));
      let tx = x + 6;
      for (let gI = 0; gI < groups; gI++) {
        const pts = [];
        for (let k = 0; k < 4; k++) pts.push(`M${(tx + k * 2.6).toFixed(1)},${yy - 11} L${(tx + k * 2.6 + h.rnd(-0.5, 0.5)).toFixed(1)},${yy + 1}`);
        pts.push(`M${(tx - 1.5).toFixed(1)},${yy - 2} L${(tx + 10.5).toFixed(1)},${yy - 9}`);
        Hd.push(`<path class="hd-stroke hd-stroke--thin" d="${pts.join(" ")}"/>`);
        tx += 14;
      }
      marks(x + tallyW - 6, yy, n ? String(n) : "", 15, { anchor: "end" });
    }
    y += rh * (rows + 1) + 12;
    if (sideKey === "home" && note) {
      P.push(text(px, y + 10, "NOTES", "sp-label", 8, "start"));
      P.push(rule(px + 36, y + 13, px + g.w, y + 13, "sp-subrule"));
      words(px + 42, y + 10, note, 19, { fit: g.w - 50 });
    }
    return y + 20;
  };
  const yA = page("away", M);
  const yB = page("home", M + pageW + 24);
  const H = Math.max(yA, yB) + M * 0.5;

  const attrs = ` data-form="${form}" data-paper="${paper}"`;
  const body = `<g class="sp-print">${P.join("")}</g><g class="hd-layer" filter="url(#sp-pencil)">${Hd.join("")}</g>`;
  return paperCanvas(cw, H, [17, 11], preset, body, { valign: "top", attrs, defs: handFilters("sp", 4000, 3000, seed), cls: "hd-card" });
}
