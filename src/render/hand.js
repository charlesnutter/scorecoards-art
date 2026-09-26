// Handwriting for the hand-filled styles (Program, Scorebook, and any
// later card a person is meant to have filled in). Same approach as the
// Vintage renderer: seeded randomness so a game always redraws the same,
// per-glyph tilt and bounce, slow baseline drift and a slant that varies
// word to word, pencil strokes for base paths, circles and hatching.
//
// Presentation (which face, which colour) comes from the `cls` the caller
// passes; this module only emits geometry and classes, like the rest of
// the renderers. Callers create a context with makeHand(seed) and pass
// it to every call so the sequence of random draws is stable.
import { esc } from "./common.js";

export function mulberry32(a) {
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

export function makeHand(seed) {
  const R = mulberry32(seed);
  return { R, rnd: (a, b) => a + (b - a) * R() };
}

// Approximate advance per character as a fraction of font size, per
// face; used to shrink long strings to a maximum width the way a scorer
// crams a long name into a box.
const EM = { marks: 0.37, words: 0.58 };

// Handwritten text. `face` is "marks" (numerals, codes: tighter, more
// tilt) or "words" (names, notes: gentler jitter, slow drift, per-word
// slant). Returns an SVG <text> string.
export function handText(
  h,
  x,
  y,
  str,
  size,
  { anchor = "start", tilt = 1.6, fit = 0, face = "marks", cls = "hd-text", accents = false } = {}
) {
  str = String(str ?? "");
  if (!accents) str = str.normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!str) return "";
  const { rnd } = h;
  const words = face === "words";
  const em = EM[face] ?? EM.marks;
  let s = size * rnd(0.95, 1.05);
  if (fit && str.length * em * s > fit) s = fit / (str.length * em);
  const bx = x + rnd(-0.8, 0.8);
  const by = y + rnd(-1, 1);
  const maxTilt = (Math.atan(3 / Math.max(str.length * em * s, 1)) * 180) / Math.PI;
  const angle = rnd(-1, 1) * Math.min(tilt, maxTilt);
  const chars = [...str];
  const rotAmp = words ? 2.2 : 4;
  const rot = chars.map(() => f1(rnd(-rotAmp, rotAmp))).join(" ");
  const bounce = words ? 0.022 : 0.045;
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
  const mirror = str === "ꓘ";
  const body = mirror ? "K" : str;
  let tf = mirror
    ? `matrix(-1 0 0 1 ${f1(2 * bx)} 0) rotate(${f1(-angle)} ${f1(bx)} ${f1(by)})`
    : `rotate(${f1(angle)} ${f1(bx)} ${f1(by)})`;
  if (words) {
    const slant = rnd(-3, 3);
    tf += ` skewX(${f1(-slant)}) translate(${f1(by * Math.tan((slant * Math.PI) / 180))},0)`;
  }
  return (
    `<text x="${f1(bx)}" y="${f1(by)}" class="${cls}" font-size="${f1(s)}" text-anchor="${anchor}" ` +
    `transform="${tf}" rotate="${rot}"${dx ? ` dx="${dx}"` : ""} dy="${dy}">${esc(body)}</text>`
  );
}

// A pencil line through points: each segment bows slightly and every
// point lands a little off target.
export function handPath(h, pts, { jitter = 1.1, bow = 1.2, cls = "hd-stroke" } = {}) {
  const { rnd } = h;
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
  return `<path class="${cls}" d="${d}"/>`;
}

// Loose hand-drawn loop: starts anywhere, wobbles, overlaps its start.
export function handCircle(h, cx, cy, r, cls = "hd-stroke hd-stroke--thin") {
  const { rnd } = h;
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
  return `<polyline class="${cls}" points="${pts.join(" ")}"/>`;
}

// Scribbled-in diamond (a run scored), back and forth across it.
export function handHatch(h, cx, cy, r, cls = "hd-stroke hd-stroke--hatch") {
  const { rnd } = h;
  const H = [cx, cy + r];
  const F = [cx + r, cy];
  const T = [cx - r, cy];
  const P = (s, t) => [H[0] + s * (F[0] - H[0]) + t * (T[0] - H[0]), H[1] + s * (F[1] - H[1]) + t * (T[1] - H[1])];
  const pts = [];
  const steps = Math.max(6, Math.round(r / 1.9));
  for (let i = 0; i <= steps; i++) {
    const t = 0.06 + (0.88 * i) / steps;
    const s = i % 2 ? rnd(0.9, 0.98) : rnd(0.02, 0.1);
    pts.push(P(s, t + rnd(-0.02, 0.02)));
  }
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${f1(x)},${f1(y)}`).join(" ");
  return `<path class="${cls}" d="${d}"/>`;
}

// Filled-in square/box (the "shaded box = run" convention on 1950s
// program cards and spiral scorebooks): a few quick diagonal strokes.
export function handFill(h, x, y, w, hgt, cls = "hd-stroke hd-stroke--hatch") {
  const { rnd } = h;
  const parts = [];
  const step = 3.2;
  for (let d = step; d < w + hgt; d += step) {
    const x1 = Math.max(x, x + d - hgt), y1 = Math.min(y + hgt, y + d);
    const x2 = Math.min(x + w, x + d), y2 = Math.max(y, y + d - w);
    parts.push(`M${f1(x1 + rnd(-0.6, 0.6))},${f1(y1 + rnd(-0.6, 0.6))} L${f1(x2 + rnd(-0.6, 0.6))},${f1(y2 + rnd(-0.6, 0.6))}`);
  }
  return `<path class="${cls}" d="${parts.join(" ")}"/>`;
}

// Filters for pencil and pen layers; `id` prefix keeps several cards on
// one page from colliding. Callers put this inside <defs>.
export function handFilters(id, W, H, seed = 1) {
  const s = seed % 1000;
  return `
<filter id="${id}-pencil" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="1.3" numOctaves="2" seed="${s + 19}" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="0.7" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feColorMatrix in="t" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -1.1 0 0 0 1.5" result="grain"/>
  <feComposite in="d" in2="grain" operator="in"/>
</filter>
<filter id="${id}-pen" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}">
  <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="${s + 23}" result="t"/>
  <feDisplacementMap in="SourceGraphic" in2="t" scale="0.6" xChannelSelector="R" yChannelSelector="G" result="d"/>
  <feGaussianBlur in="d" stdDeviation="0.25"/>
</filter>`;
}

/* ---------- name helpers shared by hand-filled cards ---------- */

const SUFFIX = /^(jr\.?|sr\.?|ii|iii|iv)$/i;

export function lastName(full) {
  const parts = String(full || "").split(" ");
  let last = parts.pop() || "";
  if (SUFFIX.test(last) && parts.length > 1) last = `${parts.pop()} ${last}`;
  return last;
}

// Last names, with a first initial where two players on the same side
// share one ("Lowe, N"), the way a box score disambiguates.
export function nameMaker(players) {
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

// Unusual plays arrive as full event names ("Pickoff Caught Stealing
// 2B"); a scorer would jot initials.
export function shortCode(code) {
  if (!/[A-Za-z]{4,}/.test(code)) return code;
  return code
    .split(" ")
    .map((w) => (/\d/.test(w) ? w : w[0].toUpperCase()))
    .join("");
}

// "2025-10-01" -> "10/1/2025"
export function handDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? `${m}/${d}/${y}` : iso || "";
}

const NOT_AB = /^(BB|IBB|HBP|CI|SAC|SF\d*)$/;
export const IS_HIT = /^(1B|2B|3B|HR)$/;

export function slotStats(pas) {
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
export function inningEnds(side, innings) {
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
