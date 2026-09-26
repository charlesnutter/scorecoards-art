// Vintage: a worn, printed paper scorecard filled in by hand. Two layers
// are built side by side and styled separately:
//   print — the form itself (rules, labels, diamonds, ornaments), roughened
//           and eroded by a filter so it reads as old letterpress ink
//   hand  — everything the scorekeeper wrote, in a handwriting face with
//           per-glyph wobble and hand-drawn strokes (paths, circles, hatching)
// Randomness is seeded from the gamePk so a game always redraws identically.
import { esc, categorize, maxSlot } from "./common.js";

const CELL = 62;
const NUM_W = 30;
const NAME_W = 160;
const POS_W = 36;
const LABEL_W = NUM_W + NAME_W + POS_W;
const STAT_W = 34;
const STATS = ["AB.", "R.", "H.", "RBI."];
const HEAD_H = 26;
const TEAM_LINE_H = 40;
const TOTAL_H = 30;
const PITCH_ROW = 28;
const M = 60; // outer margin

/* ---------- seeded randomness ---------- */

function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f1 = (n) => Math.round(n * 10) / 10;
const f2 = (n) => Math.round(n * 100) / 100;

/* ---------- drawing context ---------- */

function makeCtx(seed) {
  const R = mulberry32(seed);
  const ctx = { print: [], hand: [], R };
  ctx.rnd = (a, b) => a + (b - a) * R();
  return ctx;
}

// printed text
function label(ctx, x, y, str, size, anchor = "start", cls = "vt-label") {
  ctx.print.push(
    `<text x="${f1(x)}" y="${f1(y)}" class="${cls}" font-size="${size}" text-anchor="${anchor}">${esc(str)}</text>`
  );
}

function rule(ctx, x1, y1, x2, y2, cls = "vt-rule") {
  ctx.print.push(`<line class="${cls}" x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}"/>`);
}

function box(ctx, x, y, w, h, cls = "vt-rule") {
  ctx.print.push(`<rect class="${cls}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(h)}"/>`);
}


// Handwritten text: slight tilt, size and baseline drift for the whole
// word, plus a small per-glyph rotation and bounce. `fit` shrinks the
// word to a maximum width, the way a scorer crams a long name in.
// `word` marks names and notes; when the card's words face is on (see
// renderVintage), those are written in the words face with gentler
// per-letter jitter and slower, whole-word variation instead: a baseline
// that drifts over the word, a slant that differs word to word, and
// uneven letter spacing. The words face carries several drawings of each
// letter (OpenType calt), so doubled letters come out different.
function hand(ctx, x, y, str, size, { anchor = "start", tilt = 1.6, fit = 0, word = false } = {}) {
  const words = word && ctx.words;
  // the marks face has no accented glyphs; scorers mostly skip them anyway
  str = String(str ?? "");
  if (!words) str = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (!str) return;
  const { rnd } = ctx;
  let s = size * rnd(0.95, 1.05);
  const em = words ? 0.58 : 0.37;
  if (fit && str.length * em * s > fit) s = fit / (str.length * em);
  const bx = x + rnd(-0.8, 0.8);
  const by = y + rnd(-1, 1);
  // long lines tilt less: a hand keeps a full line on its rule
  const maxTilt = (Math.atan(3 / Math.max(str.length * em * s, 1)) * 180) / Math.PI;
  const angle = rnd(-1, 1) * Math.min(tilt, maxTilt);
  const chars = [...str];
  const rotAmp = words ? 2.2 : 4;
  const rot = chars.map(() => f1(rnd(-rotAmp, rotAmp))).join(" ");
  const bounce = words ? 0.022 : 0.045;
  // slow drift: a sine over ~5-8 letters plus an overall rise or fall
  const phase = rnd(0, Math.PI * 2);
  const wl = rnd(4.5, 7.5);
  const amp = words ? 0.07 : 0;
  const lean = words ? rnd(-0.05, 0.05) : 0;
  const n = Math.max(chars.length - 1, 1);
  let prev = 0;
  const dy = chars
    .map((_, i) => {
      const o = (amp * Math.sin(phase + (i / wl) * Math.PI * 2) + lean * (i / n) + rnd(-bounce, bounce)) * s;
      const d = o - prev;
      prev = o;
      return f2(d);
    })
    .join(" ");
  const dx = words ? chars.map((_, i) => (i ? f2(rnd(-0.02, 0.02) * s) : 0)).join(" ") : "";
  // reversed K (called third strike) has no glyph in the hand face
  const mirror = str === "ꓘ";
  const body = mirror ? "K" : str;
  let tf = mirror
    ? `matrix(-1 0 0 1 ${f1(2 * bx)} 0) rotate(${f1(-angle)} ${f1(bx)} ${f1(by)})`
    : `rotate(${f1(angle)} ${f1(bx)} ${f1(by)})`;
  if (words) {
    // slant varies word to word; the translate keeps the baseline anchor put
    const slant = rnd(-3, 3);
    tf += ` skewX(${f1(-slant)}) translate(${f1(by * Math.tan((slant * Math.PI) / 180))},0)`;
  }
  ctx.hand.push(
    `<text x="${f1(bx)}" y="${f1(by)}" class="vt-hand${words ? " vt-hand--words" : ""}" font-size="${f1(s)}" text-anchor="${anchor}" ` +
      `transform="${tf}" rotate="${rot}"${dx ? ` dx="${dx}"` : ""} dy="${dy}">${esc(body)}</text>`
  );
}

// A pencil line through points: each segment bows slightly and every
// point lands a little off target.
function handPath(ctx, pts, { jitter = 1.1, bow = 1.2, cls = "vt-stroke" } = {}) {
  const { rnd } = ctx;
  const p = pts.map(([x, y]) => [x + rnd(-jitter, jitter), y + rnd(-jitter, jitter)]);
  let d = `M${f1(p[0][0])},${f1(p[0][1])}`;
  for (let i = 1; i < p.length; i++) {
    const [x0, y0] = p[i - 1];
    const [x1, y1] = p[i];
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const b = rnd(-bow, bow);
    const mx = (x0 + x1) / 2 + (-(y1 - y0) / len) * b;
    const my = (y0 + y1) / 2 + ((x1 - x0) / len) * b;
    d += ` Q${f1(mx)},${f1(my)} ${f1(x1)},${f1(y1)}`;
  }
  ctx.hand.push(`<path class="${cls}" d="${d}"/>`);
}

// Loose hand-drawn loop: starts anywhere, wobbles, overlaps its start.
function handCircle(ctx, cx, cy, r) {
  const { rnd } = ctx;
  const a0 = rnd(0, Math.PI * 2);
  const sweep = Math.PI * 2 + rnd(0.25, 0.6);
  const sx = rnd(0.92, 1.12);
  const sy = rnd(0.9, 1.05);
  const pts = [];
  for (let i = 0; i <= 16; i++) {
    const a = a0 + (sweep * i) / 16;
    const rr = r * (1 + rnd(-0.06, 0.06) + (i / 16) * 0.08);
    pts.push(`${f1(cx + Math.cos(a) * rr * sx)},${f1(cy + Math.sin(a) * rr * sy)}`);
  }
  ctx.hand.push(`<polyline class="vt-stroke vt-stroke--thin" points="${pts.join(" ")}"/>`);
}

// Scored run: the diamond scribbled in, back and forth.
function handHatch(ctx, cx, cy, r) {
  const { rnd } = ctx;
  const H = [cx, cy + r];
  const F = [cx + r, cy];
  const T = [cx - r, cy];
  // P(s, t) = H + s(F - H) + t(T - H), both in [0, 1]
  const P = (s, t) => [H[0] + s * (F[0] - H[0]) + t * (T[0] - H[0]), H[1] + s * (F[1] - H[1]) + t * (T[1] - H[1])];
  const pts = [];
  const steps = Math.max(6, Math.round(r / 1.9));
  for (let i = 0; i <= steps; i++) {
    const t = 0.06 + (0.88 * i) / steps;
    const s = i % 2 ? rnd(0.9, 0.98) : rnd(0.02, 0.1);
    pts.push(P(s, t + rnd(-0.02, 0.02)));
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)},${f1(y)}`).join(" ");
  ctx.hand.push(`<path class="vt-stroke vt-stroke--hatch" d="${d}"/>`);
}

/* ---------- names and numbers ---------- */

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;

function lastName(full) {
  const parts = String(full || "").split(" ");
  let last = parts.pop() || "";
  if (SUFFIX.test(last) && parts.length > 1) last = `${parts.pop()} ${last}`;
  return last;
}

// Last names, with a first initial where two players on the same side
// share one ("Lowe, N"), the way a box score disambiguates.
function nameMaker(players) {
  const counts = {};
  for (const p of players) {
    const l = lastName(p.name);
    counts[l] = (counts[l] || 0) + 1;
  }
  return (full) => {
    const l = lastName(full);
    return counts[l] > 1 ? `${l}, ${String(full)[0]}` : l;
  };
}

// "2025-10-01" -> "10/1/2025"
function handDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? `${m}/${d}/${y}` : iso || "";
}

// Unusual plays arrive as full event names ("Pickoff Caught Stealing
// 2B"); a scorer would jot initials.
function shortCode(code) {
  if (!/[A-Za-z]{4,}/.test(code)) return code;
  return code
    .split(" ")
    .map((w) => (/\d/.test(w) ? w : w[0].toUpperCase()))
    .join("");
}

const NOT_AB = /^(BB|IBB|HBP|CI|SAC|SF\d*)$/;
const IS_HIT = /^(1B|2B|3B|HR)$/;

function slotStats(pas) {
  const st = { ab: 0, r: 0, h: 0, rbi: 0 };
  for (const pa of pas) {
    if (!NOT_AB.test(pa.code)) st.ab++;
    if (pa.scored) st.r++;
    if (IS_HIT.test(pa.code)) st.h++;
    st.rbi += pa.rbi || 0;
  }
  return st;
}

// Which slot made the last plate appearance of each inning — the scorer
// slashes that cell to close the half. Batters cycle 1-9, so the half
// ends `n - 1` slots after it started, where n is its PA count.
function inningEnds(side, innings) {
  const ends = {};
  let prevEnd = 0;
  for (let i = 1; i <= innings; i++) {
    let n = 0;
    let threeOuts = false;
    for (const slot of Object.keys(side.cells)) {
      const pas = side.cells[slot][i] || [];
      n += pas.length;
      if (pas.some((pa) => pa.outNumber === 3)) threeOuts = true;
    }
    if (!n) continue;
    const end = ((prevEnd + n - 1) % 9) + 1;
    if (threeOuts) ends[i] = end;
    prevEnd = end;
  }
  return ends;
}

/* ---------- printed ornaments ---------- */

// Symmetric scrollwork rule, drawn from its center outward.
function flourish(ctx, cx, cy, half) {
  const k = half / 300;
  const side =
    `M14,0 C60,-9 120,9 180,2 C230,-4 262,-3 292,4 C310,8 322,-2 316,-9 ` +
    `C310,-15 298,-9 302,-3 C305,1 311,0 312,-3 ` +
    `M40,6 C90,12 150,2 200,8 C230,11 250,10 266,8`;
  const g = (sx) =>
    `<path class="vt-ornament" transform="translate(${f1(cx)},${f1(cy)}) scale(${f2(sx * k)},${f2(k)})" d="${side}"/>`;
  ctx.print.push(g(1), g(-1));
  // center diamond with a dot either side
  ctx.print.push(
    `<path class="vt-ornament-fill" d="M${cx},${cy - 6} L${cx + 6},${cy} L${cx},${cy + 6} L${cx - 6},${cy} Z"/>`,
    `<circle class="vt-ornament-fill" cx="${cx - 12}" cy="${cy + 1}" r="1.8"/>`,
    `<circle class="vt-ornament-fill" cx="${cx + 12}" cy="${cy + 1}" r="1.8"/>`
  );
}

// Two bats, knobs to a ball in the middle, barrels facing out (Ballpark's
// rule under the title). Profile in local units, barrel end at x=0.
function bats(ctx, cx, cy, half) {
  const L = half - 30;
  const bat =
    `M5.5,-5.5 L${0.3 * L},-5.5 C${0.52 * L},-5.5 ${0.6 * L},-1.9 ${0.8 * L},-1.9 ` +
    `L${0.95 * L},-1.9 C${0.965 * L},-1.9 ${0.97 * L},-3.6 ${L - 2},-3.6 Q${L},-3.6 ${L},0 ` +
    `Q${L},3.6 ${L - 2},3.6 C${0.97 * L},3.6 ${0.965 * L},1.9 ${0.95 * L},1.9 ` +
    `L${0.8 * L},1.9 C${0.6 * L},1.9 ${0.52 * L},5.5 ${0.3 * L},5.5 L5.5,5.5 A5.5,5.5 0 0 1 5.5,-5.5 Z`;
  for (const sx of [1, -1]) {
    ctx.print.push(
      // knob toward the ball, barrel facing out
      `<path class="vt-ornament-fill" transform="translate(${f1(cx + sx * (15 + L))},${f1(cy)}) scale(${-sx},1)" d="${bat}"/>`
    );
  }
  ctx.print.push(
    `<circle class="vt-ball" cx="${cx}" cy="${cy}" r="8"/>`,
    `<path class="vt-ball-stitch" d="M${cx - 3.4},${cy - 7} Q${cx - 0.6},${cy} ${cx - 3.4},${cy + 7} M${cx + 3.4},${cy - 7} Q${cx + 0.6},${cy} ${cx + 3.4},${cy + 7}"/>`
  );
}

// Ballfield diagram with the starting nine written in at their positions.
const FIELD_SPOTS = {
  C: [0, 24],
  P: [0, -38],
  "1B": [64, -50],
  "2B": [36, -100],
  SS: [-36, -100],
  "3B": [-64, -50],
  LF: [-96, -140],
  CF: [0, -178],
  RF: [96, -140],
};

function fieldDiagram(ctx, cx, hy, side, meta, pitching, nameOf) {
  const p = [];
  const F = 112; // foul line length to the arc
  const R = F * Math.SQRT2;
  p.push(
    `<path class="vt-field-grass" d="M${cx},${hy} L${f1(cx - F)},${f1(hy - F)} A${f1(R)},${f1(R)} 0 0 1 ${f1(cx + F)},${f1(hy - F)} Z"/>`,
    `<path class="vt-field-infield" d="M${cx},${hy} L${cx + 44},${hy - 44} L${cx},${hy - 88} L${cx - 44},${hy - 44} Z"/>`,
    `<circle class="vt-field-base" cx="${cx}" cy="${hy - 44}" r="3"/>`
  );
  ctx.print.push(p.join(""));
  // a short printed rule under each position, the name written on it
  const starters = {};
  for (const players of Object.values(side.slots)) {
    const s = players?.[0];
    if (s && FIELD_SPOTS[s.pos]) starters[s.pos] = s.name;
  }
  if (!starters.P && pitching?.[0]) starters.P = pitching[0].name;
  for (const [pos, [dx, dy]] of Object.entries(FIELD_SPOTS)) {
    const x = cx + dx;
    const y = hy + dy;
    rule(ctx, x - 31, y + 4, x + 31, y + 4, "vt-rule vt-rule--thin");
    label(ctx, x - 33, y + 3, pos, 10, "end", "vt-label vt-label--tiny");
    if (starters[pos]) hand(ctx, x, y, nameOf(starters[pos]), 22, { anchor: "middle", fit: 68, word: true });
  }
  const nick = meta.name.replace(meta.city || "", "").trim() || meta.name;
  hand(ctx, cx, hy + 60, nick, 28, { anchor: "middle", word: true });
  rule(ctx, cx - 70, hy + 64, cx + 70, hy + 64, "vt-rule vt-rule--thin");
}

/* ---------- linescore ---------- */

function linescore(ctx, norm, cx, y0) {
  const { innings, totals } = norm.linescore;
  const n = Math.max(9, innings.length);
  const teamW = 196;
  const iw = 26;
  const tw = 30;
  const rowH = 26;
  const w = teamW + n * iw + 3 * tw;
  const x0 = cx - w / 2;
  box(ctx, x0, y0, w, rowH * 3, "vt-rule vt-rule--heavy");
  for (let r = 1; r < 3; r++) rule(ctx, x0, y0 + r * rowH, x0 + w, y0 + r * rowH);
  let x = x0 + teamW;
  label(ctx, x0 + teamW / 2, y0 + 18, "TEAMS.", 13, "middle");
  const cols = [...Array.from({ length: n }, (_, i) => `${i + 1}.`), "R.", "H.", "E."];
  const lastInning = innings.length;
  cols.forEach((c, i) => {
    const cw = i < n ? iw : tw;
    rule(ctx, x, y0, x, y0 + rowH * 3, i === n ? "vt-rule vt-rule--heavy" : "vt-rule");
    label(ctx, x + cw / 2, y0 + 18, c, 12, "middle");
    [["away", 1], ["home", 2]].forEach(([s, r]) => {
      let v = "";
      if (i < n) {
        const inn = innings[i];
        if (inn) v = inn[s] == null ? (i === lastInning - 1 && s === "home" ? "X" : "") : inn[s];
      } else {
        v = [totals[s].runs, totals[s].hits, totals[s].errors][i - n];
      }
      hand(ctx, x + cw / 2, y0 + r * rowH + 21, v, 27, { anchor: "middle" });
    });
    x += cw;
  });
  hand(ctx, x0 + 10, y0 + rowH + 21, norm.meta.away.name, 26, { fit: teamW - 18, word: true });
  hand(ctx, x0 + 10, y0 + 2 * rowH + 21, norm.meta.home.name, 26, { fit: teamW - 18, word: true });
  return rowH * 3;
}

/* ---------- one team's grid ---------- */

function paMarks(ctx, pa, cx, cy, r, x, y, rh, small) {
  // base path traced over the printed diamond
  if (pa.base > 0) {
    const c = [[cx, cy + r], [cx + r, cy], [cx, cy - r], [cx - r, cy], [cx, cy + r]];
    handPath(ctx, c.slice(0, Math.min(pa.base, 4) + 1), { jitter: small ? 0.7 : 1.1 });
  }
  if (pa.scored) handHatch(ctx, cx, cy, r * 0.9);

  const cat = categorize(pa);
  const code = shortCode(pa.code);
  const [main, suffix] = code.split(" ");
  if (small) {
    hand(ctx, cx, y + rh - 5, main, 17, { anchor: "middle", fit: CELL * 0.44 });
  } else if (cat === "out" || cat === "k") {
    // the out is the whole story of the at-bat: written big, center
    const s = cat === "k" ? 50 : 36;
    hand(ctx, cx, cy + s * 0.28, main, s, { anchor: "middle", fit: CELL - 12 });
    if (suffix) hand(ctx, x + CELL - 5, y + rh - 5, suffix, 17, { anchor: "end", fit: CELL * 0.5 });
  } else {
    hand(ctx, x + CELL - 5, y + rh - 5, code, 22, { anchor: "end", fit: CELL - 10 });
  }

  if (pa.out && pa.outNumber) {
    const ox = small ? cx + r + 3 : x + CELL - 12;
    const oy = small ? y + 10 : y + 12;
    hand(ctx, ox, oy + 5.5, pa.outNumber, small ? 15 : 18, { anchor: "middle", tilt: 4 });
    handCircle(ctx, ox, oy, small ? 6.5 : 8.5);
  }
  for (let i = 0; i < Math.min(pa.rbi || 0, 4); i++) {
    const rx = (small ? cx - r - 3 : x + 8) + ctx.rnd(-0.6, 0.6);
    const ry = (small ? y + rh - 16 : y + rh - 9) - i * 6 + ctx.rnd(-0.6, 0.6);
    ctx.hand.push(`<circle class="vt-dot" cx="${f1(rx)}" cy="${f1(ry)}" r="${f1(ctx.rnd(1.5, 2.1))}"/>`);
  }
}

function gridSize(side, innings, rh = CELL) {
  const slots = maxSlot(side);
  return {
    w: LABEL_W + innings * CELL + STATS.length * STAT_W,
    h: TEAM_LINE_H + HEAD_H + slots * rh + TOTAL_H,
    slots,
  };
}

function grid(ctx, norm, sideKey, innings, x0, y0, rh) {
  const side = norm.sides[sideKey];
  const meta = norm.meta[sideKey];
  const { w, slots } = gridSize(side, innings, rh);
  const gridX = x0 + LABEL_W;
  const statX = gridX + innings * CELL;
  const allPlayers = Object.values(side.slots).flat();
  const nameOf = nameMaker(allPlayers);

  // "VISITORS ________ Boston Red Sox"
  label(ctx, x0, y0 + 24, sideKey === "away" ? "VISITORS" : "HOME CLUB", 14);
  const lineX = x0 + (sideKey === "away" ? 100 : 112);
  rule(ctx, lineX, y0 + 27, lineX + 330, y0 + 27, "vt-rule vt-rule--thin");
  hand(ctx, lineX + 10, y0 + 23, meta.name, 32, { word: true });

  // header row
  const hy = y0 + TEAM_LINE_H;
  const bodyY = hy + HEAD_H;
  const bodyH = slots * rh;
  const totalY = bodyY + bodyH;
  const h = HEAD_H + bodyH + TOTAL_H;
  box(ctx, x0, hy, w, h, "vt-rule vt-rule--heavy");
  rule(ctx, x0, bodyY, x0 + w, bodyY, "vt-rule vt-rule--heavy");
  rule(ctx, x0, totalY, x0 + w, totalY, "vt-rule vt-rule--heavy");
  label(ctx, x0 + NUM_W / 2, hy + 18, "NO.", 11, "middle");
  label(ctx, x0 + NUM_W + NAME_W / 2, hy + 18, "PLAYERS.", 13, "middle");
  label(ctx, x0 + NUM_W + NAME_W + POS_W / 2, hy + 18, "POS.", 11, "middle");
  for (const cx of [x0 + NUM_W, x0 + NUM_W + NAME_W]) rule(ctx, cx, hy, cx, totalY);
  rule(ctx, gridX, hy, gridX, totalY + TOTAL_H, "vt-rule vt-rule--heavy");
  rule(ctx, statX, hy, statX, totalY + TOTAL_H, "vt-rule vt-rule--heavy");
  for (let i = 0; i < innings; i++) {
    const x = gridX + i * CELL;
    if (i) rule(ctx, x, hy, x, totalY + TOTAL_H);
    label(ctx, x + CELL / 2, hy + 18, `${i + 1}.`, 13, "middle");
  }
  STATS.forEach((s, i) => {
    const x = statX + i * STAT_W;
    if (i) rule(ctx, x, hy, x, totalY + TOTAL_H);
    label(ctx, x + STAT_W / 2, hy + 18, s, 10.5, "middle");
  });

  // batting slots
  const ends = inningEnds(side, innings);
  const totals = { ab: 0, r: 0, h: 0, rbi: 0 };
  for (let s = 1; s <= slots; s++) {
    const ry = bodyY + (s - 1) * rh;
    if (s > 1) rule(ctx, x0, ry, x0 + w, ry);
    // name column ruled in two: starter above, substitutes below
    rule(ctx, x0, ry + rh / 2, gridX, ry + rh / 2, "vt-rule vt-rule--faint");
    const players = side.slots[s] || [];
    const starter = players[0];
    const subs = players.slice(1);
    if (starter) {
      hand(ctx, x0 + NUM_W / 2, ry + 24, starter.number, 23, { anchor: "middle" });
      hand(ctx, x0 + NUM_W + 7, ry + 24, nameOf(starter.name), 29, { fit: NAME_W - 12, word: true });
      hand(ctx, x0 + NUM_W + NAME_W + POS_W / 2, ry + 24, starter.pos, 22, { anchor: "middle", fit: POS_W - 6 });
    }
    if (subs.length) {
      const subY = ry + rh / 2 + 24;
      hand(ctx, x0 + NUM_W / 2, subY, subs[0].number, 21, { anchor: "middle" });
      const more = subs.length > 2 ? ` +${subs.length - 2}` : "";
      hand(ctx, x0 + NUM_W + 7, subY, subs.slice(0, 2).map((p) => nameOf(p.name)).join(", ") + more, 26, {
        fit: NAME_W - 12,
        word: true,
      });
      hand(ctx, x0 + NUM_W + NAME_W + POS_W / 2, subY, subs.slice(0, 2).map((p) => p.pos).join("-"), 20, {
        anchor: "middle",
        fit: POS_W - 4,
      });
    }

    const allPas = [];
    for (let i = 1; i <= innings; i++) {
      const x = gridX + (i - 1) * CELL;
      const cx = x + CELL / 2;
      const cy = ry + rh / 2;
      const pas = side.cells[s]?.[i] || [];
      allPas.push(...pas);
      if (pas.length <= 1) {
        ctx.print.push(
          `<path class="vt-diamond" d="M${cx},${cy + 14} L${cx + 14},${cy} L${cx},${cy - 14} L${cx - 14},${cy} Z"/>`
        );
        if (pas[0]) paMarks(ctx, pas[0], cx, cy, 14, x, ry, rh, false);
      } else {
        // batted around: two small diamonds side by side
        pas.slice(0, 2).forEach((pa, k) => {
          const sx = x + CELL * (0.28 + 0.44 * k);
          const sy = cy - 4;
          ctx.print.push(
            `<path class="vt-diamond" d="M${sx},${sy + 9} L${sx + 9},${sy} L${sx},${sy - 9} L${sx - 9},${sy} Z"/>`
          );
          paMarks(ctx, pa, sx, sy, 9, x, ry, rh, true);
        });
      }
      if (ends[i] === s) {
        // end-of-inning slash across the lower-right corner
        handPath(ctx, [[x + CELL - 17, ry + rh + 3], [x + CELL + 3, ry + rh - 17]], { jitter: 1.2, bow: 0.8 });
      }
    }
    const st = slotStats(allPas);
    for (const k of Object.keys(totals)) totals[k] += st[k];
    [st.ab, st.r, st.h, st.rbi].forEach((v, i) =>
      hand(ctx, statX + i * STAT_W + STAT_W / 2, ry + rh / 2 + 8, v, 25, { anchor: "middle" })
    );
  }

  // totals row: runs/hits per inning
  label(ctx, x0 + NUM_W + 8, totalY + 20, "RUNS / HITS", 12);
  for (let i = 1; i <= innings; i++) {
    const inn = norm.linescore.innings[i - 1];
    const runs = inn?.[sideKey];
    if (runs == null) continue;
    let hits = 0;
    for (const slot of Object.keys(side.cells))
      hits += (side.cells[slot][i] || []).filter((pa) => IS_HIT.test(pa.code)).length;
    hand(ctx, gridX + (i - 0.5) * CELL, totalY + 23, `${runs}/${hits}`, 24, { anchor: "middle" });
  }
  [totals.ab, totals.r, totals.h, totals.rbi].forEach((v, i) =>
    hand(ctx, statX + i * STAT_W + STAT_W / 2, totalY + 23, v, 25, { anchor: "middle" })
  );
  return nameOf;
}

/* ---------- pitchers ---------- */

const PITCH_COLS = [["W/L", 34], ["IP.", 40], ["H.", 32], ["R.", 32], ["ER.", 34], ["BB.", 34], ["K.", 32], ["HR.", 34]];

function pitchingSize(rows) {
  const w = 190 + PITCH_COLS.reduce((n, c) => n + c[1], 0);
  return { w, h: (rows + 1) * PITCH_ROW };
}

function pitchers(ctx, list, rows, x0, y0, nameOf) {
  const { w, h } = pitchingSize(rows);
  const nameW = 190;
  box(ctx, x0, y0, w, h, "vt-rule vt-rule--heavy");
  rule(ctx, x0, y0 + PITCH_ROW, x0 + w, y0 + PITCH_ROW, "vt-rule vt-rule--heavy");
  for (let r = 2; r <= rows; r++) rule(ctx, x0, y0 + r * PITCH_ROW, x0 + w, y0 + r * PITCH_ROW);
  label(ctx, x0 + 10, y0 + 19, "PITCHERS.", 13);
  let x = x0 + nameW;
  PITCH_COLS.forEach(([l, cw]) => {
    rule(ctx, x, y0, x, y0 + h);
    label(ctx, x + cw / 2, y0 + 19, l, 11.5, "middle");
    x += cw;
  });
  list.slice(0, rows).forEach((p, i) => {
    const y = y0 + (i + 1) * PITCH_ROW + 20;
    hand(ctx, x0 + 10, y + 1, nameOf(p.name), 27, { fit: nameW - 18, word: true });
    let cx = x0 + nameW;
    [p.note, p.ip, p.h, p.r, p.er, p.bb, p.so, p.hr].forEach((v, k) => {
      const cw = PITCH_COLS[k][1];
      hand(ctx, cx + cw / 2, y + 1, v, 24, { anchor: "middle" });
      cx += cw;
    });
  });
}

/* ---------- notes block ---------- */

function notesBlock(ctx, norm, note, x0, y0, w, h) {
  const d = norm.gameInfoDetail || {};
  const fields = [
    ["FIRST PITCH", d.firstPitch],
    ["TIME OF GAME", d.duration],
    ["ATTENDANCE", d.attendance],
    ["WEATHER", [d.temp, d.sky, d.wind].filter(Boolean).join(", ")],
  ];
  const lineH = 30;
  let y = y0 + 20;
  const labelW = 150;
  for (const [l, v] of fields) {
    label(ctx, x0, y, `${l}:`, 13);
    rule(ctx, x0 + labelW, y + 3, x0 + w, y + 3, "vt-rule vt-rule--thin");
    hand(ctx, x0 + labelW + 8, y, v || "", 27, { fit: w - labelW - 16, word: true });
    y += lineH;
  }
  label(ctx, x0, y, "NOTES:", 13);
  // written notes: the personal note first, then the notable plays
  const items = [];
  if (note) items.push(note);
  for (const side of ["away", "home"]) {
    for (const n of norm.battingNotes?.[side] || []) {
      if (/^(HR|2B|3B|SB|E):/.test(n)) items.push(`${norm.meta[side].abbr} ${n}`);
    }
  }
  const lines = [];
  const maxW = w - 16;
  let line = "";
  for (const item of items) {
    const cand = line ? `${line};  ${item}` : item;
    if (cand.length * (ctx.words ? 0.58 : 0.4) * 25 <= maxW && line !== note) line = cand;
    else {
      if (line) lines.push(line);
      line = item;
    }
  }
  if (line) lines.push(line);
  const firstX = x0 + 70;
  let ly = y;
  let k = 0;
  while (ly + 3 <= y0 + h) {
    const lx = k === 0 ? firstX : x0;
    rule(ctx, lx, ly + 3, x0 + w, ly + 3, "vt-rule vt-rule--thin");
    if (lines[k]) hand(ctx, lx + 8, ly, lines[k], 25, { fit: x0 + w - lx - 14, word: true });
    ly += lineH;
    k++;
  }
}

/* ---------- paper ---------- */

// Aging per paper condition. worn/light tint everything a warm brown;
// good is a near-new sheet: neutral tint, barely-there stains, and
// clean printing with only a trace of ink texture.
const WEAR = {
  worn: {
    tint: [0.48, 0.33, 0.15], grainTint: [0.36, 0.27, 0.16], edgeColor: "#6b4a24", vignette: "#5c3e1c",
    stain: 0.22, grain: 0.3, spots: 10, vignetteOp: 0.22, edge: [36, 0.2, 22],
    displace: 0.9, pits: "-1.6 0 0 0 1.95", fade: "0.5 0 0 0 0.72",
  },
  light: {
    tint: [0.48, 0.33, 0.15], grainTint: [0.36, 0.27, 0.16], edgeColor: "#6b4a24", vignette: "#5c3e1c",
    stain: 0.12, grain: 0.2, spots: 4, vignetteOp: 0.12, edge: [28, 0.12, 16],
    displace: 0.6, pits: "-1.2 0 0 0 1.9", fade: "0.3 0 0 0 0.85",
  },
  // Ballpark's "lightly aged": a touch warmer and softer than good,
  // well short of Vintage's light
  aged: {
    tint: [0.46, 0.39, 0.3], grainTint: [0.36, 0.31, 0.25], edgeColor: "#6a5a44", vignette: "#6a5a44",
    stain: 0.08, grain: 0.18, spots: 2, vignetteOp: 0.08, edge: [26, 0.08, 15],
    displace: 0.45, pits: "-0.8 0 0 0 1.65", fade: "0.2 0 0 0 0.9",
  },
  good: {
    tint: [0.42, 0.4, 0.36], grainTint: [0.35, 0.34, 0.32], edgeColor: "#5e5a52", vignette: "#5e5a52",
    stain: 0.05, grain: 0.14, spots: 0, vignetteOp: 0.06, edge: [24, 0.06, 14],
    displace: 0.35, pits: "-0.5 0 0 0 1.5", fade: "0.15 0 0 0 0.95",
  },
};

function defs(W, H, seed, wear) {
  const w = WEAR[wear];
  const s = seed % 1000;
  return `<defs>
<filter id="vt-grain" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="${s}"/>
  <feColorMatrix type="matrix" values="0 0 0 0 ${w.grainTint[0]}  0 0 0 0 ${w.grainTint[1]}  0 0 0 0 ${w.grainTint[2]}  0.75 0 0 0 -0.3"/>
</filter>
<filter id="vt-stain" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="0.0028 0.0036" numOctaves="4" seed="${s + 7}"/>
  <feColorMatrix type="matrix" values="0 0 0 0 ${w.tint[0]}  0 0 0 0 ${w.tint[1]}  0 0 0 0 ${w.tint[2]}  2.6 0 0 0 -1.25"/>
</filter>
<filter id="vt-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4"/></filter>
<filter id="vt-edge" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="${w.edge[2]}"/></filter>
<filter id="vt-print" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" seed="${s + 11}" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="${w.displace}" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="1" seed="${s + 13}" result="e"/>
  <feColorMatrix in="e" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${w.pits}" result="pits"/>
  <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="2" seed="${s + 17}" result="l"/>
  <feColorMatrix in="l" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${w.fade}" result="fade"/>
  <feComposite in="pits" in2="fade" operator="arithmetic" k1="1" result="mask"/>
  <feComposite in="d" in2="mask" operator="in"/>
</filter>
<filter id="vt-pencil" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="${s + 19}" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="0.7" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 1.5" result="grain"/>
  <feComposite in="d" in2="grain" operator="in"/>
</filter>
<filter id="vt-pen" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="${s + 23}" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="0.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="0.25"/>
</filter>
<radialGradient id="vt-vignette" cx="50%" cy="50%" r="72%">
  <stop offset="0.55" stop-color="${w.vignette}" stop-opacity="0"/>
  <stop offset="1" stop-color="${w.vignette}" stop-opacity="${w.vignetteOp}"/>
</radialGradient>
<clipPath id="vt-sheet"><rect x="0" y="0" width="${W}" height="${H}" rx="7"/></clipPath>
</defs>`;
}

// Paper sheet: base tone, faint stains, grain, a few age spots, and
// softly darkened edges. Returns svg drawn beneath everything else.
function paper(W, H, R, wear) {
  const w = WEAR[wear];
  const parts = [`<rect class="vt-paper" x="0" y="0" width="${W}" height="${H}"/>`];
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" filter="url(#vt-stain)" opacity="${w.stain}"/>`);
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" filter="url(#vt-grain)" opacity="${w.grain}"/>`);
  // foxing: small rust-brown age spots
  for (let i = 0; i < w.spots; i++) {
    const edgey = R() < 0.6;
    const x = edgey ? (R() < 0.5 ? R() * W * 0.14 : W - R() * W * 0.14) : R() * W;
    const y = R() * H;
    parts.push(
      `<circle class="vt-fox" cx="${f1(x)}" cy="${f1(y)}" r="${f1(0.8 + R() * 3.6)}" opacity="${f2(0.06 + R() * 0.12)}" filter="url(#vt-soft)"/>`
    );
  }
  parts.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="url(#vt-vignette)"/>`);
  parts.push(
    `<rect x="0" y="0" width="${W}" height="${H}" fill="none" stroke="${w.edgeColor}" stroke-width="${w.edge[0]}" opacity="${w.edge[1]}" filter="url(#vt-edge)"/>`
  );
  return parts.join("");
}

/* ---------- the card ---------- */

export function renderVintage(norm, { preset = "vintage", tokens = {}, note = "", vintage = {} } = {}) {
  const ink = vintage.ink === "pen" ? "pen" : "pencil";
  const wear = WEAR[vintage.wear] ? vintage.wear : "worn";
  const paperSize = tokens.paper || [17, 11];
  const seed = Number(norm.meta.gamePk) || 1;
  const innings = Math.max(9, norm.maxInning);

  const away = gridSize(norm.sides.away, innings);
  const home = gridSize(norm.sides.home, innings);
  const gridW = Math.max(away.w, home.w);
  const slots = Math.max(away.slots, home.slots);
  let gridH = Math.max(away.h, home.h);
  const gap = 64;
  const pRows = Math.max(5, norm.pitching?.away?.length || 0, norm.pitching?.home?.length || 0);
  const pitch = pitchingSize(pRows);

  // content size before stretching to the paper ratio
  const headerH = 250;
  const cw = M * 2 + gridW * 2 + gap;
  const baseGaps = [24, 34];
  const ch = M + headerH + baseGaps[0] + gridH + baseGaps[1] + pitch.h + M;
  const ratio = paperSize[0] / paperSize[1];
  let W = cw;
  let H = ch;
  if (cw / ch > ratio) H = cw / ratio;
  else W = ch * ratio;
  // spare height goes first to taller rows (up to a third more), then
  // to the gaps around the grids
  let extra = H - ch;
  const rh = CELL + Math.min((extra * 0.75) / slots, CELL * 0.55);
  extra -= (rh - CELL) * slots;
  gridH += (rh - CELL) * slots;
  const top = M + extra * 0.18;
  const g1 = baseGaps[0] + extra * 0.3;
  const g2 = baseGaps[1] + extra * 0.3;
  const ox = (W - cw) / 2;

  const ctx = makeCtx(seed);
  // words face (names, notes) is opt-in; marks keep the default hand
  ctx.words = vintage.words === "mansalva";
  const cx = W / 2;

  // header: title, ornament, where/when, linescore
  label(ctx, cx, top + 40, "SCORE CARD", 50, "middle", "vt-title");
  if (preset === "ballpark") bats(ctx, cx, top + 68, 250);
  else flourish(ctx, cx, top + 66, 250);
  const metaY = top + 104;
  label(ctx, cx - 250, metaY, "AT", 14);
  rule(ctx, cx - 226, metaY + 3, cx + 60, metaY + 3, "vt-rule vt-rule--thin");
  hand(ctx, cx - 216, metaY, norm.meta.venue, 30, { fit: 270, word: true });
  label(ctx, cx + 80, metaY, "DATE", 14);
  rule(ctx, cx + 126, metaY + 3, cx + 250, metaY + 3, "vt-rule vt-rule--thin");
  hand(ctx, cx + 136, metaY, handDate(norm.meta.date), 30);
  linescore(ctx, norm, cx, metaY + 22);
  label(ctx, W - ox - M, top - 22, `No. ${norm.meta.gamePk || ""}`, 13, "end", "vt-imprint");

  const leftX = ox + M;
  const rightX = ox + M + gridW + gap;
  const fieldHy = top + 190;
  const awayNames = nameMaker(Object.values(norm.sides.away.slots).flat());
  const homeNames = nameMaker(Object.values(norm.sides.home.slots).flat());
  fieldDiagram(ctx, leftX + 140, fieldHy, norm.sides.away, norm.meta.away, norm.pitching?.away, awayNames);
  fieldDiagram(ctx, rightX + gridW - 140, fieldHy, norm.sides.home, norm.meta.home, norm.pitching?.home, homeNames);

  // grids
  const gy = top + headerH + g1;
  grid(ctx, norm, "away", innings, leftX, gy, rh);
  grid(ctx, norm, "home", innings, rightX, gy, rh);

  // pitchers under each grid, notes between them
  const py = gy + gridH + g2;
  const pitcherNames = (side) => nameMaker((norm.pitching?.[side] || []).map((p) => ({ name: p.name })));
  pitchers(ctx, norm.pitching?.away || [], pRows, leftX, py, pitcherNames("away"));
  pitchers(ctx, norm.pitching?.home || [], pRows, rightX + gridW - pitch.w, py, pitcherNames("home"));
  const nx = leftX + pitch.w + 50;
  const nw = rightX + gridW - pitch.w - 50 - nx;
  if (nw > 220) notesBlock(ctx, norm, note, nx, py, nw, pitch.h);

  W = Math.round(W);
  H = Math.round(H);
  const R = mulberry32(seed ^ 0x5bd1e995);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="vt-card" ` +
    `data-preset="${esc(preset)}" data-ink="${ink}" data-wear="${wear}"${ctx.words ? ' data-words="mansalva"' : ""}>` +
    defs(W, H, seed, wear) +
    `<g clip-path="url(#vt-sheet)">` +
    paper(W, H, R, wear) +
    `<g class="vt-print-layer" filter="url(#vt-print)">${ctx.print.join("")}</g>` +
    `<g class="vt-hand-layer" filter="url(#vt-${ink})">${ctx.hand.join("")}</g>` +
    `</g></svg>`
  );
}
