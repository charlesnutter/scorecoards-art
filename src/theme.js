// Derives a full scorecard color theme (--sc-* variables) from a team's
// semantic roles — one formula set for every team, no bespoke CSS. The
// formulas are calibrated so that applying them to Keepsake's own navy
// reproduces Keepsake's palette closely.

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

// mix `hex` toward `toward` by t (0..1)
function mix(hex, toward, t) {
  const a = hexToRgb(hex);
  const b = hexToRgb(toward);
  return rgbToHex(a.map((v, i) => v + (b[i] - v) * t));
}

// rough relative luminance (0..1)
function lum(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => v / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Build the color variable set for a team's roles.
export function buildThemeVars({ paper, accent, accent2, ink }) {
  // keep the pop color readable against the dark sheet
  const pop = lum(accent) < 0.18 ? mix(accent, "#ffffff", 0.2) : accent;
  const soft = accent2 ?? mix(pop, "#ffffff", 0.35);
  return {
    "--sc-paper": paper,
    "--sc-ink": ink ?? mix(paper, "#ffffff", 0.85),
    "--sc-accent": pop,
    "--sc-rbi": soft,
    "--sc-line": mix(paper, "#ffffff", 0.3),
    "--sc-cat-hit": mix(paper, "#ffffff", 0.55),
    "--sc-cat-hr": pop,
    "--sc-cat-walk": soft,
    "--sc-cat-out": mix(paper, "#ffffff", 0.12),
    "--sc-cat-run": pop,
    "--sc-badge-fill": pop,
    "--sc-badge-num-color": paper,
    "--sc-title-color": "#ffffff",
    "--sc-code-color": "#ffffff",
    "--sc-code-out-color": "#ffffff",
    "--sc-header-bar": "#ffffff",
    "--sc-header-bar-opacity": "0.22",
    "--sc-header-bar-text": "#ffffff",
    "--sc-grid-frame": "#ffffff",
    "--sc-cell-empty": "rgba(0, 0, 0, 0.14)",
    "--sc-ls-head-fill": "rgba(0, 0, 0, 0.14)",
  };
}

// Roles for a team's primary or alternate-background variant. When the
// alternate paper is the team's own accent color, the old paper becomes
// the accent so the pop color never matches the sheet.
export function variantRoles(theme, alt = false) {
  if (!alt || !theme.altPaper) return theme.roles;
  const r = theme.roles;
  const paper = theme.altPaper;
  const accent = r.accent.toLowerCase() === paper.toLowerCase() ? r.paper : r.accent;
  return { paper, accent, accent2: r.accent2, ink: r.ink };
}

export function varsToStyle(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}
