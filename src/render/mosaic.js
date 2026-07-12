// "Mosaic" — the whole game as a dense grid of colored pips, in the
// spirit of win/loss dot-matrix posters. One pip per at-bat, color by
// outcome; a paper-colored center dot marks a run scored. Rows are
// lineup slots, columns innings — the scorecard layout, miniaturized.
import { text, categorize, header, linescore, maxSlot, legend, svgShell } from "./common.js";

const TOKENS = {
  cell: 24,
  pip: 15,
  labelWidth: 150,
  pad: 24,
  titleSize: 15,
};

function pip(pa, x, y, w, h) {
  const cat = categorize(pa);
  const cls =
    cat === "k"
      ? "sc-p-k"
      : cat === "reach"
        ? "sc-p-reach"
        : `sc-p-${cat}`; // sc-p-out / sc-p-walk / sc-p-hit / sc-p-hr
  const parts = [`<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>`];
  if (pa.scored) {
    parts.push(`<circle class="sc-p-run" cx="${x + w / 2}" cy="${y + h / 2}" r="2.4"/>`);
  }
  return parts.join("");
}

function teamGrid(side, teamMeta, homeAway, innings, labelMode, y0, T) {
  const parts = [];
  const slotCount = maxSlot(side);
  const gridX = T.pad + T.labelWidth;

  parts.push(
    text(T.pad, y0 + 11, `${teamMeta.name.toUpperCase()} — ${homeAway}`, "sc-team-name", 10, "start")
  );
  const headY = y0 + 18;
  for (let i = 1; i <= innings; i++) {
    parts.push(
      text(gridX + (i - 1) * T.cell + T.cell / 2, headY + 10, i, "sc-inning-num", 7.5)
    );
  }

  const gridY = headY + 16;
  for (let s = 1; s <= slotCount; s++) {
    const rowY = gridY + (s - 1) * T.cell;
    const players = side.slots[s];
    if (players) {
      const starter = players[0];
      const label =
        labelMode === "numbers"
          ? `#${starter.number || "?"}`
          : starter.name.length > 20
            ? starter.name.slice(0, 19) + "…"
            : starter.name;
      parts.push(text(T.pad, rowY + T.cell / 2 + 3, label, "sc-player", 8.5, "start"));
    }

    for (let i = 1; i <= innings; i++) {
      const pas = side.cells[s]?.[i];
      if (!pas?.length) continue;
      const x0 = gridX + (i - 1) * T.cell;
      const inset = (T.cell - T.pip) / 2;
      if (pas.length === 1) {
        parts.push(pip(pas[0], x0 + inset, rowY + inset, T.pip, T.pip));
      } else {
        // split the pip for multiple trips in one inning
        const w = (T.pip - 2) / 2;
        pas.slice(0, 2).forEach((pa, k) => {
          parts.push(pip(pa, x0 + inset + k * (w + 2), rowY + inset, w, T.pip));
        });
      }
    }
  }
  return [parts.join(""), gridY + slotCount * T.cell - y0];
}

const LEGEND = [
  { swatch: `<rect class="sc-p-hit" x="-5" y="-5" width="10" height="10" rx="2"/>`, label: "hit" },
  { swatch: `<rect class="sc-p-hr" x="-5" y="-5" width="10" height="10" rx="2"/>`, label: "home run" },
  { swatch: `<rect class="sc-p-walk" x="-5" y="-5" width="10" height="10" rx="2"/>`, label: "walk" },
  { swatch: `<rect class="sc-p-out" x="-5" y="-5" width="10" height="10" rx="2"/>`, label: "out" },
  { swatch: `<rect class="sc-p-k" x="-5" y="-5" width="10" height="10" rx="2"/>`, label: "strikeout" },
  {
    swatch: `<g><rect class="sc-p-hit" x="-5" y="-5" width="10" height="10" rx="2"/><circle class="sc-p-run" r="2.4"/></g>`,
    label: "run scored",
  },
];

export function renderMosaic(norm, { labelMode = "names", preset = "classic", tokens = {} } = {}) {
  const T = { ...TOKENS, ...tokens };
  const innings = norm.maxInning;
  const width = Math.max(
    T.pad * 2 + T.labelWidth + innings * T.cell,
    T.pad * 2 + 150 + (norm.linescore.innings.length + 3) * 26
  );
  const parts = [];
  let y = T.pad + 6;

  const [head, headH] = header(norm, T);
  parts.push(head);
  y += headH;

  const [lsSvg, lsH] = linescore(norm, y, T);
  parts.push(lsSvg);
  y += lsH + 20;

  const [awaySvg, awayH] = teamGrid(norm.sides.away, norm.meta.away, "AWAY", innings, labelMode, y, T);
  parts.push(awaySvg);
  y += awayH + 22;

  const [homeSvg, homeH] = teamGrid(norm.sides.home, norm.meta.home, "HOME", innings, labelMode, y, T);
  parts.push(homeSvg);
  y += homeH + 22;

  parts.push(legend(LEGEND, T.pad, y));
  y += 18 + T.pad / 2;

  return svgShell(width, y, preset, parts.join(""));
}
