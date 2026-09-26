// "Homage" — one nested-square tile per inning, after Josef Albers'
// Homage to the Square. In each tile the outer band is the top half
// (away batting) and the band inside it the bottom half (home batting);
// band width is how many batters came up, band colour is how many runs
// scored (a five-step scale per team, palest for none). The squares sit
// low in the tile, the way Albers set his. Nine innings make a 3×3;
// extra innings add a row. The only words are the teams and date along
// the left edge.
//
// 18×24 portrait. `poster.ground` picks "warm" (default) or "stark".
import { esc } from "./common.js";

const W = 1200;
const H = 1600;
const f1 = (n) => Math.round(n * 10) / 10;

function halfStats(side, inning, runs) {
  let pas = 0;
  for (const slot of Object.keys(side.cells)) pas += (side.cells[slot][inning] || []).length;
  return { pas, runs: runs ?? null };
}

export function renderHomage(norm, { preset = "homage", poster = {} } = {}) {
  const ground = poster.ground === "stark" ? "stark" : "warm";
  const innings = Math.max(9, norm.maxInning);
  const cols = 3;
  const rows = Math.ceil(innings / cols);
  const gap = 34;
  const left = 150;
  const right = W - 72;
  const top = 96;
  const bottom = H - 96;
  const tile = Math.min((right - left - (cols - 1) * gap) / cols, (bottom - top - (rows - 1) * gap) / rows);
  const gridW = cols * tile + (cols - 1) * gap;
  const gridH = rows * tile + (rows - 1) * gap;
  const gx = left + (right - left - gridW) / 2;
  const gy = top + (bottom - top - gridH) / 2;
  const parts = [];

  const lsInn = norm.linescore?.innings || [];
  for (let i = 1; i <= innings; i++) {
    const c = (i - 1) % cols;
    const r = Math.floor((i - 1) / cols);
    const x = gx + c * (tile + gap);
    const y = gy + r * (tile + gap);
    const ls = lsInn[i - 1] || {};
    const away = halfStats(norm.sides.away, i, ls.away);
    const home = halfStats(norm.sides.home, i, ls.home);
    // band width from batters faced: 3 batters thin, 8+ thick
    const bw = (pas) => tile * Math.min(0.28, 0.07 + 0.024 * Math.max(0, pas - 3));
    const step = (runs) => Math.min(4, Math.max(0, runs ?? 0));
    // outer square: away
    parts.push(`<rect class="hm-sq hm-aw hm-aw--${step(away.runs)}" x="${f1(x)}" y="${f1(y)}" width="${f1(tile)}" height="${f1(tile)}"/>`);
    const tA = away.pas ? bw(away.pas) : tile * 0.07;
    // inner square (home) sits low: 30% of the shrink above… no, Albers
    // pushes the inner squares down: 3/4 of the shrink goes above
    const sB = tile - 2 * tA;
    const xB = x + tA;
    const yB = y + tA * 1.5;
    if (home.pas) {
      parts.push(`<rect class="hm-sq hm-hm hm-hm--${step(home.runs)}" x="${f1(xB)}" y="${f1(yB)}" width="${f1(sB)}" height="${f1(sB)}"/>`);
      const tB = bw(home.pas);
      const sC = sB - 2 * tB;
      parts.push(`<rect class="hm-sq hm-core" x="${f1(xB + tB)}" y="${f1(yB + tB * 1.5)}" width="${f1(sC)}" height="${f1(sC)}"/>`);
    } else {
      // bottom half not played: the core shows straight through
      parts.push(`<rect class="hm-sq hm-core" x="${f1(xB)}" y="${f1(yB)}" width="${f1(sB)}" height="${f1(sB)}"/>`);
    }
  }

  // caption along the left edge, reading upward, lowercase
  const { away, home, date } = norm.meta;
  parts.push(
    `<text class="hm-title" transform="translate(96,${H - 96}) rotate(-90)" font-size="34" text-anchor="start">` +
      `${esc(away.name.toLowerCase())} <tspan class="hm-title-at">at</tspan> ${esc(home.name.toLowerCase())}` +
      `<tspan class="hm-title-date" dx="28">${esc(longDate(date).toLowerCase())}</tspan></text>`
  );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="sc-card scorecard-theme ab-card" ` +
    `data-preset="${esc(preset)}" data-ground="${ground}">` +
    `<rect class="sc-bg" x="0" y="0" width="${W}" height="${H}"/>` +
    parts.join("") +
    `</svg>`
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function longDate(iso) {
  const [y, m, d] = String(iso || "").split("-").map(Number);
  return y && m && d ? `${MONTHS[m - 1]} ${d}, ${y}` : iso || "";
}
