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

const FIELD_SPOTS = { C: [0, 26], P: [0, -40], "1B": [82, -52], "2B": [50, -104], SS: [-50, -104], "3B": [-82, -52], LF: [-112, -142], CF: [0, -180], RF: [112, -142] };

const ord = (n) => (n % 100 >= 11 && n % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th");

// inning a substitute first batted, judged by whose name opens the play
function entryInning(side, slot, p) {
  const cells = side.cells[slot] || {};
  for (const i of Object.keys(cells).map(Number).sort((a, b) => a - b)) {
    if (cells[i].some((pa) => pa.desc && pa.desc.startsWith(p.name))) return i;
  }
  return null;
}

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
  // roundel centred on the date line
  const rcY = y + 60;
  P.push(`<circle class="tc-roundel" cx="${cw - M - 46}" cy="${rcY}" r="46"/>`);
  P.push(`<text x="${cw - M - 46}" y="${rcY + 12}" class="tc-price" font-size="32" text-anchor="middle">10<tspan class="tc-price-cent" font-size="28" dy="-5" dx="1">¢</tspan></text>`);
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
  // date beside the roundel: DATE on the venue line, its rule level with
  // the vs. rule, the date written on it
  const dW = 130;
  const dX = cw - M - 92 - 28 - dW;
  P.push(text(dX - 12, y + 76, "DATE", "tc-ad-head", 17, "end"));
  P.push(rule(dX, y + 80, dX + dW, y + 80, "tc-rule"));
  marks(dX + dW / 2, y + 75, handDate(norm.meta.date), 30, { anchor: "middle" });
  y += 150;

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
          const entered = k > 0 ? entryInning(side, slot, p) : null;
          const nm = nameOf(p.name) + (more ? ` +${p.more}` : "");
          const fitW = cols[1].w - 12 - (entered ? 34 : 0);
          out.push(handText(h, nameX, by, nm, size, { face: "words", cls: "hd-text hd-text--words", fit: fitW }));
          if (entered) {
            const nmW = Math.min(nm.length * 0.58 * size, fitW);
            out.push(handText(h, nameX + nmW + 5, by, `${entered}${ord(entered)}`, size * 0.62, { cls: "hd-text" }));
          }
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
  P.push(away.svg, homeG.svg);
  const totalW = away.w + gapX + homeG.w;
  let gy = y + Math.max(away.h, homeG.h) + 26;

  /* ---- bottom band: linescore + notes left, pitchers + fields right ---- */
  const ls = norm.linescore;
  const lsInn = Math.max(9, ls.innings.length);
  const lsX = M;
  const rowW = gx0 + totalW - M;
  const pw = Math.floor((rowW - 30) / 2);
  const lsW = rowW - 30 - pw;
  P.push(text(lsX, gy + 14, "SCORE BY INNINGS", "tc-eyebrow", 13, "start"));
  const lsY = gy + 22;
  const rowHh = 34;
  const labelW = 170;
  const totW = 44;
  const cwid = (lsW - labelW - 3 * totW) / lsInn;
  P.push(box(lsX, lsY, lsW, rowHh * 3, "tc-frame"));
  P.push(box(lsX, lsY, lsW, rowHh, "tc-head"));
  let lx = lsX + labelW;
  const cols = [...Array.from({ length: lsInn }, (_, i) => String(i + 1)), "R", "H", "E"];
  cols.forEach((c, i) => {
    const w = i < lsInn ? cwid : totW;
    P.push(rule(lx, lsY, lx, lsY + rowHh * 3, i === lsInn ? "tc-frame" : "tc-cell"));
    P.push(text(lx + w / 2, lsY + 18, c, "tc-head-text", 10.5));
    [["away", 1], ["home", 2]].forEach(([sd, r]) => {
      let v = "";
      if (i < lsInn) { const inn = ls.innings[i]; if (inn) v = inn[sd] == null ? (sd === "home" && i === ls.innings.length - 1 ? "X" : "") : inn[sd]; }
      else v = [ls.totals[sd].runs, ls.totals[sd].hits, ls.totals[sd].errors][i - lsInn];
      marks(lx + w / 2, lsY + r * rowHh + 20, v, 22, { anchor: "middle" });
    });
    lx += w;
  });
  P.push(rule(lsX, lsY + rowHh * 2, lsX + lsW, lsY + rowHh * 2, "tc-cell"));
  words(lsX + 10, lsY + rowHh + 20, norm.meta.away.name, 22, { fit: labelW - 18 });
  P.push(text(lsX + 10, lsY + rowHh * 2 + 19, home.name.toUpperCase(), "tc-head-text tc-head-text--dark", 10.5, "start"));

  // pitchers' record ad box, right
  const px = lsX + lsW + 30;
  const pRows = Math.max(norm.pitching?.away?.length || 0, norm.pitching?.home?.length || 0);
  const ph = 66 + Math.max(4, pRows) * 21 + 18;
  const py0 = lsY;
  P.push(text(px, gy + 14, "THE PITCHERS' RECORD", "tc-eyebrow", 13, "start"));
  P.push(box(px, py0, pw, ph, "tc-ad"));
  P.push(box(px + 5, py0 + 5, pw - 10, ph - 10, "tc-ad-inner"));
  const pPad = 28; // box edge to column, and between the two columns
  const colW = (pw - 3 * pPad) / 2;
  [["away", norm.meta.away], ["home", home]].forEach(([sd, meta], ci) => {
    const cx = px + pPad + ci * (colW + pPad);
    const pn = nameMaker((norm.pitching?.[sd] || []).map((p) => ({ name: p.name })));
    if (sd === "home") {
      P.push(text(cx, py0 + 34, meta.name.toUpperCase(), "tc-eyebrow", 12, "start"));
    } else {
      P.push(rule(cx, py0 + 38, cx + colW, py0 + 38, "tc-rule"));
      words(cx + 2, py0 + 33, meta.name, 22, { fit: colW - 40 });
    }
    const statCols = ["IP", "H", "R", "ER", "BB", "SO"];
    const sx0 = cx + colW - statCols.length * 28;
    P.push(text(cx, py0 + 56, "PITCHER", "tc-ad-small", 8.5, "start"));
    statCols.forEach((l, k) => P.push(text(sx0 + k * 28 + 14, py0 + 56, l, "tc-ad-small", 8.5)));
    P.push(rule(cx, py0 + 62, cx + colW, py0 + 62, "tc-rule"));
    (norm.pitching?.[sd] || []).forEach((p, i) => {
      const yy = py0 + 82 + i * 21;
      words(cx, yy, `${pn(p.name)}${p.note ? ` (${p.note})` : ""}`, 19, { fit: sx0 - cx - 10 });
      [p.ip, p.h, p.r, p.er, p.bb, p.so].forEach((v, k) => marks(sx0 + k * 28 + 14, yy, v, 18, { anchor: "middle" }));
    });
  });

  // GAME NOTES: the personal note on the first rule, a skipped rule,
  // then the scoring plays two to a rule with the score after each. The
  // box-score tail (SB, E, GIDP, WP, HBP) is left off: a scorer at the
  // park records the scoring plays as they happen, and the rest is what
  // the paper compiles afterwards.
  const nY = lsY + rowHh * 3 + 26;
  const lineH = 27;
  const plays = (norm.scoring || []).map((sc) => {
    const inn = sc.inning.replace(/^T/, "Top ").replace(/^B/, "Bot. ");
    return `${inn}: ${sc.short}${sc.rbi ? `, ${sc.rbi} RBI` : ""} (${sc.score})`;
  });
  const noteLines = [];
  const playRows = Math.ceil(plays.length / 2);
  const rows = [];
  for (let r = 0; r < playRows; r++) rows.push({ l: plays[r * 2], r: plays[r * 2 + 1] });
  if (note) rows.push({}, { full: note });
  rows.push({}); // one spare rule for the pencil
  P.push(text(lsX, nY + 14, "GAME NOTES", "tc-eyebrow", 13, "start"));
  {
    let ny = nY + 22 + lineH;
    const colW = (lsW - 24) / 2;
    for (const row of rows) {
      P.push(rule(lsX, ny, lsX + lsW, ny, "tc-subrule"));
      if (row.full) words(lsX + 6, ny - 4, row.full, 19, { fit: lsW - 12 });
      if (row.l) words(lsX + 6, ny - 4, row.l, 19, { fit: colW - 12 });
      if (row.r) words(lsX + colW + 24 + 6, ny - 4, row.r, 19, { fit: colW - 12 });
      ny += lineH;
    }
  }
  const notesEnd = nY + 22 + lineH * rows.length;
  const k = 0.75;
  const fieldTop = py0 + ph + 10;
  const fieldH = 196;

  // FINAL SCORE in a double-ruled ad box like the three on the left,
  // left-aligned under the notes and only as wide as it needs to be:
  //   FINAL SCORE   ______ __ ( – )   HOME CLUB __ ( – )
  {
    const FINAL_BOX = true; // true: the double-ruled ad box; false: open, Bowlby heading
    const nameW = 200;
    const slotW = 44 + 10 + 38 + 12 + 36;
    const homeW = home.name.length * 9.4 + 14;
    const headW = FINAL_BOX ? 150 : 214;
    const inner = headW + nameW + 14 + slotW + 26 + homeW + slotW;
    const bw = inner + 40;
    const bh = 64;
    const bx = lsX;
    // bottom edge level with the foot of the field diagrams; never
    // closer than 30 to the last notes rule
    const by0 = Math.max(fieldTop + fieldH + 6 - bh - 6, notesEnd + 30);
    if (FINAL_BOX) {
      P.push(box(bx, by0, bw, bh, "tc-ad"));
      P.push(box(bx + 5, by0 + 5, bw - 10, bh - 10, "tc-ad-inner"));
    }
    const fy = by0 + bh / 2 + 12; // the writing rule
    const bl = fy - 5;
    let x = FINAL_BOX ? bx + 20 : bx;
    if (FINAL_BOX) P.push(text(x, bl, "FINAL SCORE", "tc-ad-head", 17, "start"));
    else P.push(text(x, bl + 2, "FINAL SCORE", "tc-final-head", 26, "start"));
    x += headW;
    P.push(rule(x, fy, x + nameW, fy, "tc-rule"));
    words(x + 4, bl, norm.meta.away.name, 22, { fit: nameW - 8 });
    x += nameW + 14;
    const scoreSlot = (sd) => {
      P.push(rule(x, fy, x + 36, fy, "tc-rule"));
      marks(x + 18, bl + 1, ls.totals[sd].runs ?? "", 26, { anchor: "middle" });
      x += 44;
      const rec = norm.meta[sd].record;
      P.push(text(x, bl, "(", "tc-eyebrow", 15, "start"));
      x += 10;
      P.push(rule(x, fy, x + 34, fy, "tc-subrule"));
      if (rec) marks(x + 17, bl, rec.wins, 20, { anchor: "middle" });
      x += 38;
      P.push(text(x, bl, "–", "tc-eyebrow", 13, "start"));
      x += 12;
      P.push(rule(x, fy, x + 34, fy, "tc-subrule"));
      if (rec) marks(x + 17, bl, rec.losses, 20, { anchor: "middle" });
      x += 36;
      P.push(text(x, bl, ")", "tc-eyebrow", 15, "start"));
    };
    scoreSlot("away");
    x += 26;
    P.push(text(x, bl, home.name.toUpperCase(), "tc-eyebrow", 12, "start"));
    x += homeW;
    scoreSlot("home");
    var finalBottom = by0 + bh;
  }
  const notesBottom = Math.max(finalBottom, fieldTop + fieldH + 6);

  // two ballfield diagrams under the pitchers, fielders written at their spots
  const field = (sideKey, x0, w) => {
    const fcx = x0 + w - 150;
    const side = norm.sides[sideKey];
    const meta = norm.meta[sideKey];
    const nameOf = nameMaker(Object.values(side.slots).flat());
    // home plate placed so the catcher's rule (the diagram's foot) sits
    // on the bottom edge of the FINAL SCORE box
    const hy = fieldTop + fieldH + 6 - 22.5;
    const F = 112 * k;
    const R = F * Math.SQRT2;
    P.push(`<path class="tc-field-grass" d="M${fcx},${hy} L${(fcx - F).toFixed(1)},${(hy - F).toFixed(1)} A${R.toFixed(1)},${R.toFixed(1)} 0 0 1 ${(fcx + F).toFixed(1)},${(hy - F).toFixed(1)} Z"/>`);
    const d1 = 44 * k;
    P.push(`<path class="tc-field-infield" d="M${fcx},${hy} L${fcx + d1},${hy - d1} L${fcx},${hy - 2 * d1} L${fcx - d1},${hy - d1} Z"/>`);
    const starters = {};
    for (const players of Object.values(side.slots)) {
      const st = players?.[0];
      if (st && FIELD_SPOTS[st.pos]) starters[st.pos] = st.name;
    }
    if (!starters.P && norm.pitching?.[sideKey]?.[0]) starters.P = norm.pitching[sideKey][0].name;
    for (const [pos, [dx, dy]] of Object.entries(FIELD_SPOTS)) {
      const x = fcx + dx * k;
      const yy = hy + dy * k;
      P.push(rule(x - 30, yy + 3, x + 30, yy + 3, "tc-subrule"));
      P.push(text(x - 32, yy + 2, pos, "tc-ad-small", 7, "end"));
      if (starters[pos]) words(x, yy, nameOf(starters[pos]), 17, { anchor: "middle", fit: 62 });
    }
    // team label beside the diagram, midway up: the home club printed on
    // two lines, the visitors written on a rule
    const lx0 = x0 + 12;
    const lw = w - 150 - 150 - 12;
    const ly = hy - 74;
    if (sideKey === "home") {
      P.push(text(lx0, ly - 6, "HOME", "tc-ad-small", 8.5, "start"));
      P.push(rule(lx0, ly + 22, lx0 + lw, ly + 22, "tc-rule"));
      P.push(text(lx0, ly + 17, meta.name.toUpperCase(), "tc-eyebrow", 11, "start"));
      P.push(text(lx0, ly + 40, "IN THE FIELD", "tc-ad-small", 8.5, "start"));
    } else {
      P.push(text(lx0, ly - 6, "VISITORS", "tc-ad-small", 8.5, "start"));
      P.push(rule(lx0, ly + 22, lx0 + lw, ly + 22, "tc-rule"));
      words(lx0 + 2, ly + 17, meta.name, 21, { fit: lw - 6 });
      P.push(text(lx0, ly + 40, "IN THE FIELD", "tc-ad-small", 8.5, "start"));
    }
  };
  field("away", px, pw / 2);
  field("home", px + pw / 2, pw / 2);

  /* ---- ad column on the left: three equal boxes spanning the card ---- */
  const adGap = 18;
  const gridBottom = y + Math.max(away.h, homeG.h);
  const souvenirH = 116;
  const parkH = 122;
  const howH = gridBottom - y - souvenirH - parkH - 2 * adGap;
  const ad = (x, ay, w, hgt, head, lines) => {
    P.push(box(x, ay, w, hgt, "tc-ad"));
    P.push(box(x + 5, ay + 5, w - 10, hgt - 10, "tc-ad-inner"));
    let ly = ay + 34;
    P.push(text(x + w / 2, ly, head, "tc-ad-head", 17));
    ly += 10;
    P.push(rule(x + 24, ly, x + w - 24, ly, "tc-rule"));
    for (const l of lines) {
      if (l.bottom) { ly = ay + hgt - 20; }
      else ly += l.gap ?? 15;
      if (l.field) {
        // printed label at the left, a rule beside it, the value written on the rule
        const lw = 96;
        P.push(text(x + 20, ly, l.field, "tc-ad-small", 9.5, "start"));
        P.push(rule(x + 20 + lw, ly + 4, x + w - 20, ly + 4, "tc-subrule"));
        if (l.text) words(x + 24 + lw, ly, l.text, 20, { fit: w - 48 - lw });
      } else if (l.ruleLine) { P.push(rule(x + 20, ly + 4, x + w - 20, ly + 4, "tc-subrule")); if (l.text) words(x + 24, ly, l.text, 20, { fit: w - 48 }); }
      else if (l.hand) words(x + w / 2, ly, l.text, 20, { anchor: "middle", fit: w - 40 });
      else if (l.text) P.push(text(x + w / 2, ly, l.text, l.small ? "tc-ad-small" : "tc-ad-copy", l.small ? 9.5 : 12));
    }
    return hgt;
  };
  const d = norm.gameInfoDetail || {};
  let ay = y;
  // souvenir: keep this card, one line for the scorer's name
  ay += ad(M, ay, adW, souvenirH, "SOUVENIR", [
    { text: "KEEP THIS CARD", small: true },
    { ruleLine: true, text: "", gap: 28 },
    { text: "SCORED BY", small: true, gap: 15 },
  ]) + adGap;
  const howGap = Math.max(17, Math.min(24, Math.floor((howH - 70) / 10)));
  ay += ad(M, ay, adW, howH, "HOW TO SCORE", [
    { text: "1 PITCHER · 2 CATCHER", gap: howGap + 2 },
    { text: "3 FIRST · 4 SECOND · 5 THIRD", gap: howGap },
    { text: "6 SHORT · 7 LEFT", gap: howGap },
    { text: "8 CENTER · 9 RIGHT", gap: howGap },
    { text: "1B 2B 3B HR HITS · BB WALK", gap: howGap + 10 },
    { text: "K STRUCK OUT · F FLY · L LINER", gap: howGap },
    { text: "6-3 FIELDED BY 6, THROWN TO 3", gap: howGap },
    { text: "SHADE THE DIAMOND FOR A RUN", small: true, gap: howGap + 8 },
    { text: "CIRCLE THE OUT NUMBER", small: true, gap: howGap - 2 },
  ]) + adGap;
  ay += ad(M, ay, adW, parkH, "AT THE PARK", [
    { field: "FIRST PITCH", text: d.firstPitch || "", gap: 24 },
    { field: "TIME OF GAME", text: d.duration || "", gap: 26 },
  ]);

  // bottom margin matches the top: the OFFICIAL line sits 11 below M
  const H = notesBottom + M + 11;

  const attrs = ` data-ink="${ink}" data-scheme="${scheme}"`;
  const body =
    `<g class="tc-print">${P.join("")}</g>` +
    `<g class="hd-layer" filter="url(#tc-${ink})">${Hd.join("")}</g>`;
  return paperCanvas(cw, H, [17, 11], preset, body, { valign: "center", attrs, defs: handFilters("tc", 4000, 3000, seed), cls: "hd-card" });
}
