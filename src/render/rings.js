// "Rings" — the game as concentric rings, after Josef Müller-Brockmann's
// Musica Viva posters. Inning 1 is the innermost ring. Each ring's upper
// arc is the top half (away batting), its lower arc the bottom half
// (home batting); both start at nine o'clock. Every plate appearance is
// one fixed-angle segment, so a long inning visibly swells around the
// ring while a 1-2-3 inning stays a short stub. Segments take one of
// three tones — out, on base, home run — and a bead sits on any segment
// whose batter came around to score. Nothing is labelled beyond the
// teams and date along the edge.
//
// 18×24 portrait. `poster.ground` picks the variant: "dark" (default) or
// "light"; colours live in scorecard.css under [data-preset="rings"].
import { esc, categorize } from "./common.js";

const W = 1200;
const H = 1600;
const PA_DEG = 15; // one plate appearance
const SEG_GAP = 2.4; // degrees between segments

const f1 = (n) => Math.round(n * 10) / 10;

function polar(cx, cy, r, deg) {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

// Arc path from a0 to a1 degrees (either direction), stroked ring segment.
function arc(cx, cy, r, a0, a1, cls, width) {
  const [x0, y0] = polar(cx, cy, r, a0);
  const [x1, y1] = polar(cx, cy, r, a1);
  const sweep = a1 > a0 ? 1 : 0;
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `<path class="${cls}" d="M${f1(x0)},${f1(y0)} A${r},${r} 0 ${large} ${sweep} ${f1(x1)},${f1(y1)}" stroke-width="${f1(width)}"/>`;
}

// PAs of one half inning in batting order (slot order within the inning
// is the order the lineup came up, which is how the cells were filled).
function halfInning(side, inning) {
  const out = [];
  const slots = Object.keys(side.cells).map(Number).sort((a, b) => a - b);
  // batters cycle: find who led off by looking for the slot whose PA in
  // this inning has the earliest position; simplest faithful order is
  // by slot starting from the leadoff slot, which we take as the slot
  // after last inning's final batter (unknown here), so fall back to
  // walking slots from the one with the most PAs' predecessor. Cells
  // only carry per-slot lists, so we order by slot and rotate so the
  // slot with a second PA (batted around) ends the sequence.
  const per = slots.map((s) => [s, side.cells[s][inning] || []]).filter(([, l]) => l.length);
  if (!per.length) return out;
  // rotate: the leadoff slot is the one after the previous inning's
  // last out; approximate by starting at the lowest slot that has as
  // many PAs as the max (batted-around slots are the earliest batters)
  const max = Math.max(...per.map(([, l]) => l.length));
  const startIdx = per.findIndex(([, l]) => l.length === max);
  const ordered = [...per.slice(startIdx), ...per.slice(0, startIdx)];
  // first pass: each slot's first PA in order; second pass: second PAs
  for (let k = 0; k < max; k++) for (const [, l] of ordered) if (l[k]) out.push(l[k]);
  return out;
}

function segClass(pa) {
  const c = categorize(pa);
  if (c === "hr") return "rg-seg rg-seg--hr";
  if (c === "out" || c === "k") return "rg-seg rg-seg--out";
  return "rg-seg rg-seg--on";
}

export function renderRings(norm, { preset = "rings", poster = {} } = {}) {
  const ground = poster.ground === "light" ? "light" : "dark";
  const innings = Math.max(9, norm.maxInning);
  const cx = W / 2;
  const cy = 700;
  // ring geometry scaled so the outer ring fits: inner radius, ring
  // thickness and gap all shrink together for extra innings
  const outerMax = 520;
  const unit = Math.min(50, (outerMax - 80) / innings);
  const ringW = unit * 0.68;
  const r0 = 80 + unit * 0.5;
  const parts = [];

  for (let i = 1; i <= innings; i++) {
    const r = r0 + (i - 1) * unit;
    parts.push(`<circle class="rg-guide" cx="${cx}" cy="${cy}" r="${f1(r)}"/>`);
    for (const [side, centre] of [["away", 270], ["home", 90]]) {
      const pas = halfInning(norm.sides[side], i);
      if (!pas.length) continue;
      // segments centred on twelve (away) or six (home) o'clock, so a
      // long inning swells out symmetrically toward the seam; more than
      // 12 batters would cross the seam, so cap the visible span there
      const shown = pas.slice(0, 12);
      let a = centre - (shown.length * PA_DEG) / 2;
      for (const pa of shown) {
        const a0 = a + SEG_GAP * 0.5;
        const a1 = a + PA_DEG - SEG_GAP * 0.5;
        parts.push(arc(cx, cy, r, a0, a1, segClass(pa), ringW));
        if (pa.scored) {
          const [bx, by] = polar(cx, cy, r, (a0 + a1) / 2);
          parts.push(`<circle class="rg-run" cx="${f1(bx)}" cy="${f1(by)}" r="${f1(ringW * 0.26)}"/>`);
        }
        a += PA_DEG;
      }
    }
  }
  // the horizontal seam where the two halves meet
  const rOut = r0 + (innings - 1) * unit + ringW / 2 + 10;
  parts.push(`<line class="rg-seam" x1="${cx - rOut}" y1="${cy}" x2="${cx - r0 + ringW / 2 + 10}" y2="${cy}"/>`);
  parts.push(`<line class="rg-seam" x1="${cx + r0 - ringW / 2 - 10}" y1="${cy}" x2="${cx + rOut}" y2="${cy}"/>`);

  // caption: vertical along the right edge, reading upward
  const { away, home, date, venue } = norm.meta;
  const t = norm.linescore?.totals || {};
  const capX = W - 96;
  parts.push(
    `<text class="rg-title" transform="translate(${capX},${H - 96}) rotate(-90)" font-size="54" text-anchor="start">` +
      `${esc(away.name.toUpperCase())}<tspan class="rg-title-sep"> · </tspan>${esc(home.name.toUpperCase())}</text>`
  );
  parts.push(
    `<text class="rg-caption" transform="translate(${capX + 46},${H - 96}) rotate(-90)" font-size="20" text-anchor="start" letter-spacing="0.18em">` +
      `${esc(longDate(date).toUpperCase())}  ·  ${esc(venue.toUpperCase())}</text>`
  );
  // final score, small, bottom left
  if (t.away?.runs != null) {
    parts.push(
      `<text class="rg-caption" x="96" y="${H - 96}" font-size="20" text-anchor="start" letter-spacing="0.18em">${t.away.runs}  –  ${t.home.runs}</text>`
    );
  }

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
