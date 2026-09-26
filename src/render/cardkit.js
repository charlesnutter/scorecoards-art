// Shared pieces for the printed-form card styles (Ten Cents, Foil,
// Spiral, Agate, Scoreboard): a lineup grid whose chrome is supplied by
// the style through callbacks, hand-drawn cell marks on top of the
// handwriting module, box-score arithmetic, and a paper canvas padded to
// an exact print ratio. Like the other renderers this emits geometry and
// classes only; each style's [data-preset] block in scorecard.css owns
// colour, stroke and type.
import { esc, text, categorize } from "./common.js";
import {
  handText,
  handPath,
  handCircle,
  handHatch,
  shortCode,
  slotStats,
  IS_HIT,
} from "./hand.js";

const f1 = (n) => Math.round(n * 10) / 10;

export const rule = (x1, y1, x2, y2, cls) =>
  `<line class="${cls}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`;
export const box = (x, y, w, h, cls) =>
  `<rect class="${cls}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`;
export { text };

// Pad content (cw × ch) out to paper ratio [pw, ph], centred or
// top-aligned. Returns the full <svg>. `attrs` lands on the root.
export function paperCanvas(cw, ch, [pw, ph], preset, body, { valign = "center", attrs = "", defs = "", cls = "" } = {}) {
  const target = pw / ph;
  let W = cw;
  let H = ch;
  if (cw / ch > target) H = cw / target;
  else W = ch * target;
  const ox = (W - cw) / 2;
  const oy = valign === "top" ? 0 : (H - ch) / 2;
  W = Math.round(W);
  H = Math.round(H);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="sc-card scorecard-theme ${cls}" ` +
    `data-preset="${esc(preset)}"${attrs}>` +
    (defs ? `<defs>${defs}</defs>` : "") +
    `<rect class="sc-bg" x="0" y="0" width="${W}" height="${H}"/>` +
    `<g transform="translate(${ox.toFixed(1)},${oy.toFixed(1)})">${body}</g>` +
    `</svg>`
  );
}

/* ---------- lineup grid ---------- */

// A lineup grid. `spec`:
//   x, y            top-left
//   side, innings   normalized side + inning count
//   cell            inning cell width; rowH row height
//   cols            [{ key, w }] label columns in order (num | name | pos)
//   stats           [{ key, label, w }] right-hand stat columns (ab r h rbi)
//   headH           header row height
//   subLines        1 = starter only, 2 = one sub line, 3 = two sub lines
//   totals          draw a totals row (height totalsH)
//   chrome          { headCell(x,y,w,h,label,kind), cell(x,y,w,h,kind,info),
//                     name(x,y,w,h,player,k,slot), stat(x,y,w,h,val,kind),
//                     mark(pa, cellRect, k, n), total(x,y,w,h,val,kind),
//                     frame(x,y,w,h) }
// Every chrome callback returns an svg string (or ""). Returns
// { svg, w, h, totals } with totals = { ab, r, h, rbi }.
export function lineupGrid(spec) {
  const {
    x, y, side, innings, cell, rowH, cols, stats = [], headH = 22, subLines = 2, totals = true,
    totalsH = rowH * 0.5, chrome = {}, slotCount, labels = {},
  } = spec;
  const C = {
    headCell: () => "",
    cell: () => "",
    name: () => "",
    stat: () => "",
    mark: () => "",
    total: () => "",
    frame: () => "",
    ...chrome,
  };
  const slots = slotCount || Math.max(9, ...Object.keys(side.slots).map(Number));
  const labelW = cols.reduce((n, c) => n + c.w, 0);
  const statW = stats.reduce((n, c) => n + c.w, 0);
  const w = labelW + innings * cell + statW;
  const bodyH = slots * rowH;
  const h = headH + bodyH + (totals ? totalsH : 0);
  const parts = [];
  const gridX = x + labelW;
  const statX = gridX + innings * cell;

  // header
  let hx = x;
  for (const c of cols) {
    parts.push(C.headCell(hx, y, c.w, headH, labels[c.key] ?? c.key.toUpperCase(), c.key));
    hx += c.w;
  }
  for (let i = 1; i <= innings; i++) parts.push(C.headCell(gridX + (i - 1) * cell, y, cell, headH, String(i), "inning"));
  hx = statX;
  for (const s of stats) {
    parts.push(C.headCell(hx, y, s.w, headH, s.label ?? s.key.toUpperCase(), "stat"));
    hx += s.w;
  }

  const sum = { ab: 0, r: 0, h: 0, rbi: 0 };
  for (let s = 1; s <= slots; s++) {
    const ry = y + headH + (s - 1) * rowH;
    const players = side.slots[s] || [];
    // label cells
    let lx = x;
    for (const c of cols) {
      parts.push(C.cell(lx, ry, c.w, rowH, c.key, { slot: s, players }));
      lx += c.w;
    }
    // names: starter on line 0, subs on lines 1..subLines-1
    const lineH = rowH / subLines;
    const overflow = players.length > subLines && subLines > 1;
    players.slice(0, subLines).forEach((p, k) => {
      if (overflow && k === subLines - 1) {
        // more subs than lines: the last line names this sub and counts the rest
        const extra = players.length - subLines;
        parts.push(C.name(x, ry + k * lineH, labelW, lineH, { ...p, more: extra }, k, s, cols, true));
      } else {
        parts.push(C.name(x, ry + k * lineH, labelW, lineH, p, k, s, cols));
      }
    });
    const allPas = [];
    for (let i = 1; i <= innings; i++) {
      const cx = gridX + (i - 1) * cell;
      const pas = side.cells[s]?.[i] || [];
      allPas.push(...pas);
      parts.push(C.cell(cx, ry, cell, rowH, "inning", { slot: s, inning: i, pas }));
      const shown = pas.slice(0, 2);
      shown.forEach((pa, k) => parts.push(C.mark(pa, { x: cx, y: ry, w: cell, h: rowH }, k, shown.length)));
    }
    const st = slotStats(allPas);
    for (const k of Object.keys(sum)) sum[k] += st[k];
    let sx = statX;
    for (const c of stats) {
      parts.push(C.cell(sx, ry, c.w, rowH, "stat", { slot: s }));
      parts.push(C.stat(sx, ry, c.w, rowH, st[c.key], c.key));
      sx += c.w;
    }
  }
  if (totals) {
    const ty = y + headH + bodyH;
    parts.push(C.cell(x, ty, labelW, totalsH, "totals-label", {}));
    for (let i = 1; i <= innings; i++) {
      const cx = gridX + (i - 1) * cell;
      let runs = 0, hits = 0;
      for (const slot of Object.keys(side.cells)) {
        const pas = side.cells[slot][i] || [];
        runs += pas.filter((pa) => pa.scored).length;
        hits += pas.filter((pa) => IS_HIT.test(pa.code)).length;
      }
      const played = Object.values(side.cells).some((m) => (m[i] || []).length);
      parts.push(C.cell(cx, ty, cell, totalsH, "totals-inning", { inning: i }));
      if (played) parts.push(C.total(cx, ty, cell, totalsH, { runs, hits }, "inning"));
    }
    let sx = statX;
    for (const c of stats) {
      parts.push(C.cell(sx, ty, c.w, totalsH, "totals-stat", {}));
      parts.push(C.total(sx, ty, c.w, totalsH, sum[c.key], c.key));
      sx += c.w;
    }
  }
  parts.push(C.frame(x, y, w, h, { labelW, statW, gridX, statX, headH, bodyH, totalsH: totals ? totalsH : 0, slots, rowH, cell, innings }));
  return { svg: parts.join(""), w, h, totals: sum };
}

/* ---------- hand marks inside a cell ---------- */

// Pencil marks for one plate appearance: base path traced over the
// printed diamond, scribble for a run, the code written large for an out
// or small in the corner for a hit/walk, circled out number, RBI dots.
// `k`/`n` place the second of two PAs in the same inning side by side.
// cls = { text, stroke, dot } class names for the style.
export function handMarks(h, pa, rect, k = 0, n = 1, { cls, r: rIn, codeSize = 1 } = {}) {
  const c = cls;
  const { x, y, w, h: hgt } = rect;
  const small = n > 1;
  const cx = small ? x + w * (0.28 + 0.44 * k) : x + w / 2;
  const cy = small ? y + hgt / 2 - 3 : y + hgt / 2;
  const r = rIn ?? (small ? Math.min(w, hgt) * 0.15 : Math.min(w, hgt) * 0.24);
  const parts = [];
  if (pa.base > 0) {
    const corners = [[cx, cy + r], [cx + r, cy], [cx, cy - r], [cx - r, cy], [cx, cy + r]];
    parts.push(handPath(h, corners.slice(0, Math.min(pa.base, 4) + 1), { jitter: small ? 0.7 : 1.1, cls: c.stroke }));
  }
  if (pa.scored) parts.push(handHatch(h, cx, cy, r * 0.9, `${c.stroke} ${c.stroke}--hatch`));
  const cat = categorize(pa);
  const code = shortCode(pa.code);
  const [main, suffix] = code.split(" ");
  const S = Math.min(w, hgt) * codeSize;
  const t = (tx, ty, str, size, o) => handText(h, tx, ty, str, size, { cls: c.text, ...o });
  if (small) {
    parts.push(t(cx, y + hgt - 4, main, S * 0.27, { anchor: "middle", fit: w * 0.44 }));
  } else if (cat === "out" || cat === "k") {
    const s = cat === "k" ? S * 0.8 : S * 0.58;
    parts.push(t(cx, cy + s * 0.28, main, s, { anchor: "middle", fit: w - 12 }));
    if (suffix) parts.push(t(x + w - 5, y + hgt - 5, suffix, S * 0.27, { anchor: "end", fit: w * 0.5 }));
  } else {
    parts.push(t(x + w - 5, y + hgt - 5, code, S * 0.35, { anchor: "end", fit: w - 10 }));
  }
  if (pa.out && pa.outNumber) {
    const ox = small ? cx + r + 3 : x + w - 12;
    const oy = small ? y + 10 : y + 12;
    parts.push(t(ox, oy + 5, pa.outNumber, small ? S * 0.24 : S * 0.29, { anchor: "middle", tilt: 4 }));
    parts.push(handCircle(h, ox, oy, small ? 6 : 8, `${c.stroke} ${c.stroke}--thin`));
  }
  for (let i = 0; i < Math.min(pa.rbi || 0, 4); i++) {
    const rx = (small ? cx - r - 3 : x + 8) + h.rnd(-0.6, 0.6);
    const ry = (small ? y + hgt - 16 : y + hgt - 9) - i * 6 + h.rnd(-0.6, 0.6);
    parts.push(`<circle class="${c.dot}" cx="${f1(rx)}" cy="${f1(ry)}" r="${f1(h.rnd(1.5, 2.1))}"/>`);
  }
  return parts.join("");
}

// Printed diamond centred in a cell (form chrome, not a mark).
export function printedDiamond(cx, cy, r, cls) {
  return `<path class="${cls}" d="M${f1(cx)},${f1(cy + r)} L${f1(cx + r)},${f1(cy)} L${f1(cx)},${f1(cy - r)} L${f1(cx - r)},${f1(cy)} Z"/>`;
}

/* ---------- box-score arithmetic ---------- */

// Per-player batting lines in lineup order (starters then their subs),
// attributing each PA to the player whose name opens its description;
// PAs that match no one go to the starter.
export function battingLines(side) {
  const rows = [];
  const slots = Object.keys(side.slots).map(Number).sort((a, b) => a - b);
  for (const s of slots) {
    const players = side.slots[s];
    const lines = players.map((p) => ({ player: p, slot: s, sub: false, ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, pas: [] }));
    lines.forEach((l, i) => (l.sub = i > 0));
    const all = Object.values(side.cells[s] || {}).flat();
    for (const pa of all) {
      const who = lines.find((l) => pa.desc && pa.desc.startsWith(l.player.name)) || lines[0];
      if (!who) continue;
      who.pas.push(pa);
      if (!/^(BB|IBB|HBP|CI|SAC|SF\d*)$/.test(pa.code)) who.ab++;
      if (pa.scored) who.r++;
      if (IS_HIT.test(pa.code)) who.h++;
      who.rbi += pa.rbi || 0;
      if (/^(BB|IBB)$/.test(pa.code)) who.bb++;
      if (pa.code === "K" || pa.code === "ꓘ") who.so++;
    }
    rows.push(...lines);
  }
  const tot = rows.reduce((t, l) => { for (const k of ["ab", "r", "h", "rbi", "bb", "so"]) t[k] += l[k]; return t; }, { ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0 });
  return { rows, tot };
}

// Linescore innings grouped in threes: [["0","0","2"],["0","0","1"],...]
export function groupedLinescore(norm, side) {
  const inn = norm.linescore.innings;
  const n = Math.max(9, inn.length);
  const vals = [];
  for (let i = 0; i < n; i++) {
    const v = inn[i]?.[side];
    vals.push(v == null ? (i === inn.length - 1 && side === "home" && inn[i] ? "x" : i < inn.length ? "-" : "") : String(v));
  }
  const groups = [];
  for (let i = 0; i < n; i += 3) groups.push(vals.slice(i, i + 3));
  return groups;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export function longDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : iso || "";
}
export function shortDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1].slice(0, 3)}. ${d}, ${y}` : iso || "";
}
export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export function weekday(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] : "";
}
