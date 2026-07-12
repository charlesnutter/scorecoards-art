// Shared pieces for all scorecard renderers: text/escape helpers, the
// title header, the numeric linescore, lineup labels, legends, and the
// at-bat categorizer the abstract renderers key their encodings off.

export const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

export function text(x, y, str, cls, size, anchor = "middle") {
  return `<text x="${x}" y="${y}" class="${cls}" font-size="${size}" text-anchor="${anchor}">${esc(str)}</text>`;
}

// Collapse a PA into one of six visual categories. Derived from the
// scorecard code/flags so fixtures don't need regenerating when the
// abstract renderers change.
//   k | out | walk | hit (base 1-3) | hr | reach (error/FC/other safe)
export function categorize(pa) {
  const c = pa.code;
  if (c === "K" || c === "ꓘ" || c.startsWith("K")) return "k";
  if (c === "BB" || c === "IBB" || c === "HBP" || c === "CI") return "walk";
  if (c === "HR") return "hr";
  if (c === "1B" || c === "2B" || c === "3B") return "hit";
  if (!pa.out) return "reach"; // error, fielder's choice, dropped K...
  return "out";
}

export function header(norm, T) {
  const parts = [];
  let y = T.pad + 6;
  parts.push(
    text(T.pad, y, `${norm.meta.away.name} @ ${norm.meta.home.name}`, "sc-title", T.titleSize ?? 15, "start")
  );
  y += (T.titleSize ?? 15) + 4;
  parts.push(
    text(T.pad, y, `${norm.meta.date}  ·  ${norm.meta.venue}  ·  ${norm.meta.status}`, "sc-subtitle", 9.5, "start")
  );
  y += 16;
  return [parts.join(""), y - (T.pad + 6)];
}

export function linescore(norm, y0, T) {
  const { innings, totals } = norm.linescore;
  const parts = [];
  const cw = 26;
  const labelW = 150;
  const rowH = 18;
  const x0 = T.pad;
  const cols = [...innings.map((i) => String(i.num)), "R", "H", "E"];
  const rowVals = (side) => [
    ...innings.map((i) => (i[side] == null ? "-" : String(i[side]))),
    String(totals[side].runs ?? ""),
    String(totals[side].hits ?? ""),
    String(totals[side].errors ?? ""),
  ];

  cols.forEach((c, i) => {
    const cls = i >= innings.length ? "sc-ls-head sc-ls-total" : "sc-ls-head";
    parts.push(text(x0 + labelW + i * cw + cw / 2, y0 + 12, c, cls, 8.5));
  });
  [
    [norm.meta.away.name, rowVals("away")],
    [norm.meta.home.name, rowVals("home")],
  ].forEach(([name, vals], r) => {
    const y = y0 + 12 + (r + 1) * rowH;
    parts.push(text(x0, y, name, "sc-ls-team", 9.5, "start"));
    vals.forEach((v, i) => {
      const cls = i >= innings.length ? "sc-ls-val sc-ls-total" : "sc-ls-val";
      parts.push(text(x0 + labelW + i * cw + cw / 2, y, v, cls, 9.5));
    });
  });
  return [parts.join(""), 12 + 3 * rowH];
}

export function slotLabel(players, labelMode, x, y, rightEdge) {
  const parts = [];
  const starter = players[0];
  const label =
    labelMode === "numbers"
      ? `#${starter.number || "?"}`
      : starter.name.length > 18
        ? starter.name.slice(0, 17) + "…"
        : starter.name;
  parts.push(text(x, y, label, "sc-player", 10, "start"));
  parts.push(text(rightEdge, y, starter.pos, "sc-player-pos", 8, "end"));
  players.slice(1, 3).forEach((sub, i) => {
    const subLabel = labelMode === "numbers" ? `#${sub.number || "?"}` : sub.name;
    parts.push(
      text(x + 6, y + 11 + i * 10, `↳ ${subLabel} ${sub.pos}`, "sc-player-sub", 7.5, "start")
    );
  });
  return parts.join("");
}

export function maxSlot(side) {
  return Math.max(9, ...Object.keys(side.slots).map(Number));
}

// Flat, ordered list of a slot's PAs across the game.
export function slotPAs(side, slot) {
  const byInning = side.cells[slot] || {};
  return Object.keys(byInning)
    .map(Number)
    .sort((a, b) => a - b)
    .flatMap((i) => byInning[i]);
}

// Horizontal legend row. items: [{swatch: <svg fragment centered on 0,0>, label}]
// anchor "end" treats x0 as the right edge and lays the row out to end there.
export function legend(items, x0, y0, gap = 14, anchor = "start") {
  const parts = [];
  let x = x0;
  if (anchor === "end") {
    const total = items.reduce((n, it) => n + 12 + it.label.length * 5.2 + gap, -gap);
    x = x0 - total;
  }
  for (const it of items) {
    parts.push(`<g transform="translate(${x}, ${y0})">${it.swatch}</g>`);
    x += 12;
    parts.push(text(x, y0 + 3, it.label, "sc-legend-label", 8, "start"));
    x += it.label.length * 5.2 + gap;
  }
  return parts.join("");
}

// Diamond geometry shared by the diamond-grid renderers. Corners in
// base order: [home, first, second, third].
export function diamondCorners(cx, cy, r) {
  return [
    [cx, cy + r],
    [cx + r, cy],
    [cx, cy - r],
    [cx - r, cy],
  ];
}

export function diamondPathD(cx, cy, r) {
  const [H, F, S, T] = diamondCorners(cx, cy, r);
  return `M${H} L${F} L${S} L${T} Z`;
}

// Path along the bases actually reached (1-4; 4 closes at home).
export function basePathD(cx, cy, r, base) {
  const c = diamondCorners(cx, cy, r);
  c.push(c[0]);
  let d = `M${c[0]}`;
  for (let i = 1; i <= Math.min(base, 4); i++) d += ` L${c[i]}`;
  return d;
}

export function svgShell(width, height, preset, body) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" ` +
    `class="sc-card scorecard-theme" data-preset="${esc(preset)}">` +
    `<rect class="sc-bg" x="0" y="0" width="${width}" height="${height}"/>` +
    body +
    `</svg>`
  );
}
