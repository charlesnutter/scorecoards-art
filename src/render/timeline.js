// "Timeline" — each batter's game as a row of rounded bars, like lines
// of redacted code. Bar width scales with how far the batter got
// (outs short, home runs long); color encodes the outcome; a dot caps
// bars that came around to score. Small numerals mark the inning each
// bar happened in.
import { text, categorize, header, linescore, slotLabel, maxSlot, slotPAs, legend, svgShell } from "./common.js";

const TOKENS = {
  unit: 13, // width of one "base unit"
  barH: 12,
  rowH: 36,
  gap: 5, // gap between bars
  labelWidth: 180,
  pad: 24,
  titleSize: 15,
};

const WIDTH_UNITS = { out: 1, k: 1, walk: 1.5, reach: 1.5, hit: 0, hr: 5.5 };

function barUnits(pa) {
  const cat = categorize(pa);
  if (cat === "hit") return 1 + pa.base; // 1B=2, 2B=3, 3B=4
  return WIDTH_UNITS[cat];
}

function barClass(pa) {
  const cat = categorize(pa);
  const base = cat === "k" ? "sc-b-k" : `sc-b-${cat}`;
  return pa.scored ? `${base} sc-b--run` : base;
}

function teamBlock(side, teamMeta, homeAway, labelMode, y0, T) {
  const parts = [];
  const slotCount = maxSlot(side);
  const x0 = T.pad + T.labelWidth;

  parts.push(
    text(T.pad, y0 + 12, `${teamMeta.name.toUpperCase()} — ${homeAway}`, "sc-team-name", 11, "start")
  );
  const rowsY = y0 + 24;
  let maxX = x0;

  for (let s = 1; s <= slotCount; s++) {
    const rowY = rowsY + (s - 1) * T.rowH;
    const cy = rowY + T.rowH / 2 + 3;
    parts.push(text(T.pad + 2, cy + 3, s, "sc-slot-num", 10, "start"));
    const players = side.slots[s];
    if (players)
      parts.push(slotLabel(players, labelMode, T.pad + 16, cy, T.pad + T.labelWidth - 8));

    let x = x0;
    let lastInning = 0;
    for (const pa of slotPAs(side, s)) {
      const w = barUnits(pa) * T.unit;
      if (pa.inning !== lastInning) {
        parts.push(text(x + 1, cy - T.barH / 2 - 4, pa.inning, "sc-inning-num", 6.5, "start"));
        lastInning = pa.inning;
      }
      parts.push(
        `<rect class="${barClass(pa)}" x="${x}" y="${cy - T.barH / 2}" width="${w}" height="${T.barH}" rx="${T.barH / 2}"/>`
      );
      if (pa.scored) {
        parts.push(`<circle class="sc-p-run" cx="${x + w - T.barH / 2}" cy="${cy}" r="2.4"/>`);
      }
      x += w + T.gap;
    }
    maxX = Math.max(maxX, x);
  }
  return [parts.join(""), rowsY + slotCount * T.rowH - y0, maxX];
}

const LEGEND = [
  { swatch: `<rect class="sc-b-hit" x="-9" y="-5" width="18" height="10" rx="5"/>`, label: "hit (length = bases)" },
  { swatch: `<rect class="sc-b-hr" x="-12" y="-5" width="24" height="10" rx="5"/>`, label: "home run" },
  { swatch: `<rect class="sc-b-walk" x="-7" y="-5" width="14" height="10" rx="5"/>`, label: "walk" },
  { swatch: `<rect class="sc-b-out" x="-5" y="-5" width="10" height="10" rx="5"/>`, label: "out" },
  { swatch: `<rect class="sc-b-k" x="-5" y="-5" width="10" height="10" rx="5"/>`, label: "strikeout" },
  {
    swatch: `<g><rect class="sc-b-hit sc-b--run" x="-9" y="-5" width="18" height="10" rx="5"/><circle class="sc-p-run" cx="4" r="2.4"/></g>`,
    label: "run scored",
  },
];

export function renderTimeline(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...TOKENS, ...tokens };
  const parts = [];
  let y = T.pad + 6;

  const [head, headH] = header(norm, T);
  parts.push(head);
  y += headH;

  const [lsSvg, lsH] = linescore(norm, y, T);
  parts.push(lsSvg);
  y += lsH + 22;

  const [awaySvg, awayH, awayMax] = teamBlock(norm.sides.away, norm.meta.away, "AWAY", labelMode, y, T);
  parts.push(awaySvg);
  y += awayH + 26;

  const [homeSvg, homeH, homeMax] = teamBlock(norm.sides.home, norm.meta.home, "HOME", labelMode, y, T);
  parts.push(homeSvg);
  y += homeH + 24;

  parts.push(legend(LEGEND, T.pad, y, 18));
  y += 20 + T.pad / 2;

  const width = Math.max(awayMax, homeMax, T.pad + T.labelWidth + 420) + T.pad;
  return svgShell(width, y, preset, parts.join(""));
}
