// License-safe team palettes — standard screen-printing / web-safe values
// that evoke each club without copying MLB's proprietary Pantone guides
// (sourced from generic industry color charts; see idline.com standard
// screen printing colors, teampalettes.com, apparelnbags.com PMS charts).
//
// `palette` is the raw safe-color list, shown as swatches in the form.
// `roles` is the semantic config the theme builder derives everything
// from: `paper` must be dark enough to carry white text, `accent` is the
// pop color (out badges, HR), optional `accent2` seeds walk/RBI hues,
// optional `ink` overrides the derived near-white text tint.
// `altPaper` marks a second viable dark background (not yet surfaced in
// the UI) for teams whose palette supports two sheet colors.
// Keyed by current Stats API abbreviation.

export const TEAM_THEMES = {
  // ---- AL East ----
  BAL: {
    name: "Orioles",
    palette: ["#FF6600", "#000000", "#FFFFFF"],
    roles: { paper: "#101010", accent: "#FF6600" },
  },
  BOS: {
    name: "Red Sox",
    palette: ["#CC0000", "#002244", "#FFFFFF"],
    roles: { paper: "#002244", accent: "#CC0000" },
    altPaper: "#CC0000",
  },
  NYY: {
    name: "Yankees",
    palette: ["#001F3F", "#AAAAAA", "#FFFFFF"],
    roles: { paper: "#001F3F", accent: "#C4CED4", accent2: "#AAAAAA" },
  },
  TB: {
    name: "Rays",
    palette: ["#002147", "#00A8B5", "#71A6D2"],
    roles: { paper: "#002147", accent: "#00A8B5", accent2: "#71A6D2" },
  },
  TOR: {
    name: "Blue Jays",
    palette: ["#004499", "#4192D9", "#DD2222"],
    roles: { paper: "#004499", accent: "#DD2222", accent2: "#4192D9" },
    altPaper: "#DD2222",
  },

  // ---- AL Central ----
  CWS: {
    name: "White Sox",
    palette: ["#111111", "#555555", "#FFFFFF"],
    roles: { paper: "#111111", accent: "#C4CED4", accent2: "#AAAAAA" },
  },
  CLE: {
    name: "Guardians",
    palette: ["#0A1C3A", "#C8102E", "#FFFFFF"],
    roles: { paper: "#0A1C3A", accent: "#C8102E" },
    altPaper: "#C8102E",
  },
  DET: {
    name: "Tigers",
    palette: ["#001830", "#FF5500", "#FFFFFF"],
    roles: { paper: "#001830", accent: "#FF5500" },
  },
  KC: {
    name: "Royals",
    palette: ["#0055A5", "#D4AF37", "#FFFFFF"],
    // royal blue is bright for a sheet; darkened royal keeps the vibe
    roles: { paper: "#003B73", accent: "#D4AF37" },
    altPaper: "#0055A5",
  },
  MIN: {
    name: "Twins",
    palette: ["#0B2341", "#BA0C2F", "#F5F2EB"],
    roles: { paper: "#0B2341", accent: "#BA0C2F", ink: "#F5F2EB" },
    altPaper: "#BA0C2F",
  },

  // ---- AL West ----
  HOU: {
    name: "Astros",
    palette: ["#002D62", "#FA4616", "#FFFFFF"],
    roles: { paper: "#002D62", accent: "#FA4616" },
  },
  LAA: {
    name: "Angels",
    palette: ["#BA0C2F", "#A6A9AA", "#0C2340"],
    roles: { paper: "#BA0C2F", accent: "#C4CED4", accent2: "#A6A9AA" },
    altPaper: "#0C2340",
  },
  ATH: {
    name: "Athletics",
    palette: ["#004831", "#FFCD00", "#FFFFFF"],
    roles: { paper: "#004831", accent: "#FFCD00" },
  },
  SEA: {
    name: "Mariners",
    palette: ["#0C2340", "#005C5C", "#C4CED4"],
    roles: { paper: "#0C2340", accent: "#35B0AB", accent2: "#C4CED4" },
    altPaper: "#005C5C",
  },
  TEX: {
    name: "Rangers",
    palette: ["#0033A0", "#C8102E", "#FFFFFF"],
    roles: { paper: "#0033A0", accent: "#C8102E" },
    altPaper: "#C8102E",
  },

  // ---- NL East ----
  ATL: {
    name: "Braves",
    palette: ["#13274F", "#CE1141", "#FFFFFF"],
    roles: { paper: "#13274F", accent: "#CE1141" },
    altPaper: "#CE1141",
  },
  MIA: {
    name: "Marlins",
    palette: ["#000000", "#00A3E0", "#FF4812"],
    roles: { paper: "#0B0B0D", accent: "#00A3E0", accent2: "#FF4812" },
  },
  NYM: {
    name: "Mets",
    palette: ["#002D62", "#FF5912", "#FFFFFF"],
    roles: { paper: "#002D62", accent: "#FF5912" },
  },
  PHI: {
    name: "Phillies",
    palette: ["#E4002B", "#003087", "#FFFFFF"],
    roles: { paper: "#003087", accent: "#E4002B" },
    altPaper: "#E4002B",
  },
  WSH: {
    name: "Nationals",
    palette: ["#AB0003", "#112244", "#FFFFFF"],
    roles: { paper: "#112244", accent: "#AB0003" },
    altPaper: "#AB0003",
  },

  // ---- NL Central ----
  CHC: {
    name: "Cubs",
    palette: ["#0033A0", "#CC0000", "#FFFFFF"],
    roles: { paper: "#0033A0", accent: "#CC0000" },
    altPaper: "#CC0000",
  },
  CIN: {
    name: "Reds",
    palette: ["#C6011F", "#111111", "#FFFFFF"],
    roles: { paper: "#C6011F", accent: "#F2F2F2" },
    altPaper: "#111111",
  },
  MIL: {
    name: "Brewers",
    palette: ["#0A2342", "#D3BC8D", "#FFFFFF"],
    roles: { paper: "#0A2342", accent: "#D3BC8D" },
  },
  PIT: {
    name: "Pirates",
    palette: ["#000000", "#FDB827", "#FFFFFF"],
    roles: { paper: "#0F0F10", accent: "#FDB827" },
  },
  STL: {
    name: "Cardinals",
    palette: ["#C41230", "#0C2340", "#FED141"],
    roles: { paper: "#C41230", accent: "#FED141", accent2: "#0C2340" },
    altPaper: "#0C2340",
  },

  // ---- NL West ----
  AZ: {
    name: "Diamondbacks",
    palette: ["#A71930", "#D1B07A", "#000000"],
    roles: { paper: "#A71930", accent: "#D1B07A" },
    altPaper: "#101010",
  },
  COL: {
    name: "Rockies",
    palette: ["#330066", "#555555", "#FFFFFF"],
    roles: { paper: "#330066", accent: "#B18BE8", accent2: "#C4CED4" },
  },
  LAD: {
    name: "Dodgers",
    palette: ["#005A9C", "#EF3E42", "#FFFFFF"],
    roles: { paper: "#005A9C", accent: "#EF3E42" },
  },
  SD: {
    name: "Padres",
    // source material mislabeled #2F2440 "chocolate brown" — that hex is
    // actually a dark violet (B channel dominant); swapped for a true brown
    palette: ["#4A3728", "#FFC72C", "#FFFFFF"],
    roles: { paper: "#4A3728", accent: "#FFC72C" },
  },
  SF: {
    name: "Giants",
    palette: ["#FA4616", "#000000", "#F4F0E6"],
    roles: { paper: "#101010", accent: "#FA4616", ink: "#F4F0E6" },
  },
};

// older feeds use OAK/ARI abbreviations
const ALIASES = { OAK: "ATH", ARI: "AZ" };

export function teamThemeFor(abbr) {
  return TEAM_THEMES[abbr] || TEAM_THEMES[ALIASES[abbr]] || null;
}
