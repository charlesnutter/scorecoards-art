// "Scoreboard" — the hand-operated board at Fenway (1934) and Wrigley
// (1937): a green wall, white numerals on steel plates hung in slots,
// yellow for the number that matters, white gridlines between innings,
// pitcher-number slots, and a row of lights for balls, strikes and outs.
// The linescore is the board's whole purpose, so it leads; beneath it,
// two lineup boards hang each batter's number and a small plate per
// inning carrying the play, yellow where the run came home. The inning
// in which the winner took the lead for good is the yellow number.
// Typeset: an operator hangs plates, nobody writes on the wall.
//
// 24×16 landscape. Options (`card`): wall "green" | "brown" | "black".
import { esc, text } from "./common.js";
import { paperCanvas, rule, box, longDate } from "./cardkit.js";
import { lastName, nameMaker, shortCode } from "./hand.js";
import { categorize } from "./common.js";

const f1 = (n) => Math.round(n * 10) / 10;

// inning after which the winner led for the rest of the game
function decidingInning(norm) {
  const inn = norm.linescore.innings;
  const t = norm.linescore.totals;
  const winner = (t.home.runs ?? 0) > (t.away.runs ?? 0) ? "home" : "away";
  let a = 0, h = 0, last = 0;
  inn.forEach((i) => {
    a += i.away || 0;
    h += i.home || 0;
    const lead = winner === "home" ? h - a : a - h;
    if (lead <= 0) last = i.num; // still tied or behind after this inning
  });
  return Math.min(last + 1, inn.length);
}

export function renderScoreboard(norm, { preset = "scoreboard", note = "", card = {} } = {}) {
  const wall = ["green", "brown", "black"].includes(card.wall) ? card.wall : "green";
  const P = [];
  const innings = Math.max(10, norm.maxInning);
  const ls = norm.linescore;
  const t = ls.totals;
  const decide = decidingInning(norm);
  const M = 70;

  // plate helpers: a steel plate with a numeral, or an empty dark slot
  const plate = (x, y, w, h, s, cls = "sb-num", size = h * 0.72) =>
    box(x, y, w, h, "sb-plate") + (s !== "" && s != null ? text(x + w / 2, y + h / 2 + size * 0.36, s, cls, size) : "");
  const slot = (x, y, w, h) => box(x, y, w, h, "sb-slot");

  /* ---- the linescore board ---- */
  const labelW = 300;
  const cellW = 68;
  const cellH = 78;
  const gap = 12;
  const totW = 76;
  const boardW = labelW + innings * (cellW + gap) + 3 * (totW + gap) + 20;
  const bx = M;
  let y = M;
  // header row: inning numbers painted on the wall, R H E
  P.push(text(bx + 8, y + 36, longDate(norm.meta.date).toUpperCase(), "sb-paint", 22, "start"));
  P.push(text(bx + 8, y + 64, norm.meta.venue.toUpperCase(), "sb-paint sb-paint--dim", 16, "start"));
  for (let i = 1; i <= innings; i++) {
    const x = bx + labelW + (i - 1) * (cellW + gap);
    P.push(text(x + cellW / 2, y + 52, String(i), "sb-paint", 30));
  }
  ["R", "H", "E"].forEach((l, i) => {
    const x = bx + labelW + innings * (cellW + gap) + 20 + i * (totW + gap);
    P.push(text(x + totW / 2, y + 52, l, "sb-paint", 30));
  });
  y += 80;
  P.push(rule(bx, y - 4, bx + boardW, y - 4, "sb-grid"));
  for (const sideKey of ["away", "home"]) {
    const meta = norm.meta[sideKey];
    // team name plate: painted letters on a long plate
    P.push(box(bx, y, labelW - 16, cellH, "sb-plate sb-plate--name"));
    P.push(text(bx + 16, y + cellH / 2 + 12, meta.name.toUpperCase(), "sb-name", 30, "start"));
    for (let i = 1; i <= innings; i++) {
      const x = bx + labelW + (i - 1) * (cellW + gap);
      const inn = ls.innings[i - 1];
      const v = inn ? inn[sideKey] : null;
      if (v == null) {
        // unplayed half (bottom of the ninth, or beyond the game) is an empty slot
        P.push(slot(x, y, cellW, cellH));
        if (inn && sideKey === "home" && i === ls.innings.length) P.push(text(x + cellW / 2, y + cellH / 2 + 12, "X", "sb-num sb-num--dim", 34));
      } else {
        P.push(plate(x, y, cellW, cellH, String(v), i === decide ? "sb-num sb-num--yellow" : "sb-num"));
      }
    }
    [t[sideKey].runs, t[sideKey].hits, t[sideKey].errors].forEach((v, i) => {
      const x = bx + labelW + innings * (cellW + gap) + 20 + i * (totW + gap);
      P.push(plate(x, y, totW, cellH, String(v ?? ""), i === 0 ? "sb-num sb-num--yellow" : "sb-num"));
    });
    y += cellH + gap;
  }
  // gridlines between innings (the 1987 Wrigley addition)
  for (let i = 0; i <= innings; i++) {
    const x = bx + labelW + i * (cellW + gap) - gap / 2;
    P.push(rule(x, y - 2 * (cellH + gap) - 84, x, y - gap + 6, "sb-grid"));
  }
  y += 10;
  // lights row: BALL STRIKE OUT, final state
  const lights = (x, label, n, max, color) => {
    P.push(text(x, y + 30, label, "sb-paint", 22, "start"));
    for (let k = 0; k < max; k++) P.push(`<circle class="sb-light ${k < n ? `sb-light--${color}` : ""}" cx="${x + 110 + k * 30}" cy="${y + 22}" r="9"/>`);
    return 110 + max * 30 + 60;
  };
  let lx = bx + 8;
  lx += lights(lx, "BALL", 0, 3, "green");
  lx += lights(lx, "STRIKE", 0, 2, "red");
  lx += lights(lx, "OUT", 3, 3, "red");
  lx += lights(lx, "H", 0, 1, "green") - 40;
  lx += lights(lx, "E", 0, 1, "red") - 40;
  P.push(text(bx + boardW, y + 30, `FINAL`, "sb-paint sb-paint--yellow", 22, "end"));
  y += 64;
  P.push(rule(bx, y, bx + boardW, y, "sb-grid"));
  y += 30;

  /* ---- lineup boards, stacked full width ---- */
  const half = boardW;
  const ph = 38;
  const numW = 64;
  const nameW = 300;
  const pw = Math.floor((half - numW - 12 - nameW - 6) / innings) - 6; // plate width per inning
  const board = (sideKey, x0) => {
    const side = norm.sides[sideKey];
    const meta = norm.meta[sideKey];
    const nameOf = nameMaker(Object.values(side.slots).flat());
    let yy = y;
    P.push(text(x0, yy + 20, `${meta.name.toUpperCase()} — BATTING ORDER`, "sb-paint sb-paint--dim", 16, "start"));
    yy += 34;
    const slots = Math.max(9, ...Object.keys(side.slots).map(Number));
    for (let s = 1; s <= slots; s++) {
      const players = side.slots[s] || [];
      const starter = players[0];
      const rowY = yy + (s - 1) * (ph + 8);
      // uniform number plate, name painted beside it, subs after a slash
      P.push(plate(x0, rowY, numW, ph, starter?.number || "", "sb-num", 26));
      const label = players.map((p) => nameOf(p.name)).join(" / ");
      P.push(text(x0 + numW + 10, rowY + ph / 2 + 6, label.toUpperCase(), "sb-name sb-name--small", 15, "start"));
      P.push(text(x0 + numW + nameW, rowY + ph / 2 + 6, starter?.pos || "", "sb-paint sb-paint--dim", 13, "end"));
      for (let i = 1; i <= innings; i++) {
        const cx = x0 + numW + 12 + nameW + (i - 1) * (pw + 6);
        const pas = side.cells[s]?.[i] || [];
        if (!pas.length) { P.push(slot(cx, rowY, pw, ph)); continue; }
        const pa = pas[0];
        const code = shortCode(pa.code).split(" ")[0];
        const cat = categorize(pa);
        const cls = pa.scored ? "sb-num sb-num--yellow" : cat === "out" || cat === "k" ? "sb-num sb-num--dim" : "sb-num";
        P.push(plate(cx, rowY, pw, ph, code, cls, code.length > 3 ? 15 : code.length > 2 ? 18 : 22));
        if (pas.length > 1) P.push(text(cx + pw - 4, rowY + 10, `+${pas.length - 1}`, "sb-paint sb-paint--dim", 9, "end"));
      }
    }
    yy += slots * (ph + 8) + 10;
    // pitchers: a row of small plates with the staff, like the P slots
    const pn = nameMaker((norm.pitching?.[sideKey] || []).map((p) => ({ name: p.name })));
    P.push(text(x0, yy + 16, "P", "sb-paint", 16, "start"));
    let px = x0 + 26;
    for (const p of norm.pitching?.[sideKey] || []) {
      const label = `${pn(p.name).toUpperCase()}${p.note ? ` · ${p.note}` : ""}`;
      const w = label.length * 9 + 24;
      if (px + w > x0 + half) break;
      P.push(box(px, yy, w, 26, "sb-plate"));
      P.push(text(px + w / 2, yy + 18, label, "sb-name sb-name--small", 13));
      px += w + 6;
    }
    return yy + 26;
  };
  y = board("away", bx) + 36;
  P.push(rule(bx, y - 18, bx + boardW, y - 18, "sb-grid"));
  y = board("home", bx) + 40;
  if (note) { P.push(text(bx + boardW / 2, y, note.toUpperCase(), "sb-paint sb-paint--yellow", 18)); y += 30; }

  const attrs = ` data-wall="${wall}"`;
  const cw = boardW + 2 * M;
  const defs = `<filter id="sb-paintfx" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" result="t"/><feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.9 0 0 0 1.35" result="g"/><feComposite in="SourceGraphic" in2="g" operator="in"/></filter>`;
  const body = `<rect class="sb-wall-grain" x="0" y="0" width="${cw}" height="${y + M}"/>` + `<g filter="url(#sb-paintfx)">${P.join("")}</g>`;
  return paperCanvas(cw, y + M, [24, 16], preset, body, { valign: "center", attrs, defs });
}
