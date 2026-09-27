import { fetchTeams, fetchSchedule, fetchFeed, fetchNotes } from "./api.js";
import { normalizeGame } from "./normalize.js";
import { STYLE_PRESETS, getPreset } from "./presets.js";
import { RENDERERS, getRenderer } from "./renderers.js";
import { downloadPNG } from "./export.js";
import { teamThemeFor } from "./data/teamThemes.js";
import { buildThemeVars, varsToStyle, variantRoles } from "./theme.js";

// Top-level looks offered in the Style dropdown. Each pairs a layout
// with a color preset and lists the form sections it uses; switching
// styles leaves every other style's settings untouched, so they come
// back as they were when the user switches back.
const LOOKS = [
  { id: "keepsake", label: "Keepsake", layoutId: "broadside", presetId: "keepsake" },
  { id: "vintage", label: "Vintage", layoutId: "vintage", presetId: "vintage" },
  { id: "ballpark", label: "Ballpark", layoutId: "vintage", presetId: "ballpark" },
  { id: "tencents", label: "Ten Cents", layoutId: "tencents", presetId: "tencents" },
  { id: "spiral", label: "Spiral", layoutId: "spiral", presetId: "spiral" },
  { id: "foil", label: "Foil", layoutId: "foil", presetId: "foil" },
  { id: "agate", label: "Agate", layoutId: "agate", presetId: "agate" },
  { id: "scoreboard", label: "Scoreboard", layoutId: "scoreboard", presetId: "scoreboard" },
  { id: "rings", label: "Rings", layoutId: "rings", presetId: "rings" },
  { id: "homage", label: "Homage", layoutId: "homage", presetId: "homage" },
];

const PRESETS = [
  { label: "BOS @ NYY · 2025 AL Wild Card G2", date: "2025-10-01", team: 147 },
  { label: "HOU @ SF · 2012-06-13 · Matt Cain perfect game", date: "2012-06-13", team: 137 },
  { label: "Opening Day LAD · 2025-03-18", date: "2025-03-18", team: 119 },
  { label: "SF @ KC · 2014 World Series G7", date: "2014-10-29", team: 118 },
  { label: "NYM @ SF · 2013-07-08 · 16 innings", date: "2013-07-08", team: 137 },
];

export function scorecardApp() {
  return {
    // form state
    date: "2025-10-01",
    teams: [],
    teamId: "",
    games: [],
    gamePk: null,
    presets: PRESETS,
    presetChoice: "",

    // settings — the Style dropdown picks a layout+preset pair (LOOKS);
    // the raw layout/style pickers stay hidden unless showAllOptions
    showAllOptions: false,
    looks: LOOKS,
    lookId: "keepsake",
    layouts: RENDERERS,
    styles: STYLE_PRESETS,
    layoutId: "broadside",
    presetId: "keepsake",
    teamColors: "default",
    labelMode: "names",
    legendCol: 1,
    infoPos: "footer",
    bottomOrder: "notes-first",
    notesOrder: "scoring-first",
    padTop: 44,
    padHeader: 34,
    padPitch: 34,
    padBottom: 52,
    padBar: 12,
    barStyle: "floating",
    gridOrder: "away-first",
    customNote: "",
    // per-style variants; each style reads only its own keys
    tencentsInk: "pen",
    tencentsScheme: "vermilion",
    tencentsPaper: "natural",
    tencentsTitle: "",
    spiralForm: "green",
    spiralPaper: "manila",
    foilInk: "green",
    foilFoil: "gold",
    agatePaper: "fresh",
    scoreboardWall: "green",
    ringsGround: "dark",
    homageGround: "warm",
    // vintage
    vintageInk: "pencil",
    vintageWear: "worn",
    ballparkWear: "good",

    // output state
    loading: false,
    exporting: false,
    error: "",
    svg: "",
    norm: null,
    notes: { headline: "", blurb: "" },
    scoring: [],

    teamCache: {},

    async init() {
      await this.loadTeams();
      this.$watch("date", () => this.loadTeams());
      this.$watch("labelMode", () => this.redraw());
      // style can change geometry tokens, not just CSS, so re-render
      this.$watch("presetId", () => this.redraw());
      this.$watch("layoutId", () => this.redraw());
      this.$watch("lookId", (id) => {
        const look = LOOKS.find((l) => l.id === id);
        if (!look) return;
        this.layoutId = look.layoutId;
        this.presetId = look.presetId;
      });
      this.$watch("legendCol", () => this.redraw());
      this.$watch("infoPos", () => this.redraw());
      this.$watch("bottomOrder", () => this.redraw());
      this.$watch("notesOrder", () => this.redraw());
      for (const k of ["padTop", "padHeader", "padPitch", "padBottom", "padBar", "barStyle", "gridOrder", "customNote", "teamColors", "vintageInk", "vintageWear", "ballparkWear", "tencentsInk", "tencentsScheme", "tencentsPaper", "tencentsTitle", "spiralForm", "spiralPaper", "foilInk", "foilFoil", "agatePaper", "scoreboardWall", "ringsGround", "homageGround"]) {
        this.$watch(k, () => this.redraw());
      }
    },

    get season() {
      return (this.date || "").slice(0, 4);
    },

    async loadTeams() {
      if (!/^\d{4}$/.test(this.season)) return;
      try {
        if (!this.teamCache[this.season]) {
          this.teamCache[this.season] = await fetchTeams(this.season);
        }
        this.teams = this.teamCache[this.season];
        // Keep selection if the franchise still exists that season.
        if (!this.teams.some((t) => t.id === Number(this.teamId))) this.teamId = "";
      } catch (e) {
        this.error = `Could not load teams: ${e.message}`;
      }
    },

    applyPreset(p) {
      this.date = p.date;
      this.teamId = String(p.team);
      this.load();
    },

    async load() {
      if (!this.teamId) {
        this.error = "Pick a team first.";
        return;
      }
      this.loading = true;
      this.error = "";
      this.games = [];
      try {
        const games = await fetchSchedule(this.teamId, this.date);
        if (!games.length) {
          throw new Error("No game found for that team on that date.");
        }
        this.games = games;
        await this.loadGame(games[0].gamePk);
      } catch (e) {
        this.error = e.message;
        this.svg = "";
        this.norm = null;
      } finally {
        this.loading = false;
      }
    },

    // team-color options for the loaded game (only teams with safe
    // palettes in the dataset); teams with an alternate background get a
    // second entry so both sheets can be evaluated
    get themeOptions() {
      if (!this.norm) return [];
      const opts = [];
      const dots = (bg, palette) => [
        bg,
        ...palette.filter((c) => c.toLowerCase() !== bg.toLowerCase()),
      ];
      for (const side of ["away", "home"]) {
        const theme = teamThemeFor(this.norm.meta[side].abbr);
        if (!theme) continue;
        opts.push({ key: side, label: theme.name, palette: dots(theme.roles.paper, theme.palette) });
        if (theme.altPaper) {
          opts.push({
            key: `${side}-alt`,
            label: `${theme.name} · alt`,
            palette: dots(theme.altPaper, theme.palette),
          });
        }
      }
      return opts;
    },

    currentThemeStyle() {
      // team colors are a Keepsake setting
      if (this.lookId !== "keepsake") return "";
      if (this.teamColors === "default" || !this.norm) return "";
      const [side, alt] = this.teamColors.split("-");
      const meta = this.norm.meta[side];
      const theme = meta && teamThemeFor(meta.abbr);
      if (!theme) return "";
      return varsToStyle(buildThemeVars(variantRoles(theme, alt === "alt")));
    },

    get paneStyle() {
      const vars = this.currentThemeStyle();
      return `background: var(--sc-paper);${vars ? ` ${vars}` : ""}`;
    },

    async loadGame(gamePk) {
      this.teamColors = "default";
      this.gamePk = gamePk;
      const [feed, notes] = await Promise.all([
        fetchFeed(gamePk),
        fetchNotes(gamePk),
      ]);
      this.norm = normalizeGame(feed);
      // poster layouts draw the recap on the card itself
      this.norm.recap = notes;
      this.notes = notes;
      this.scoring = this.norm.scoring;
      this.redraw();
    },

    async download() {
      if (!this.svg || this.exporting) return;
      this.exporting = true;
      this.error = "";
      try {
        const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
        const meta = this.norm.meta;
        const name = `${slug(meta.away.name)}-at-${slug(meta.home.name)}-${meta.date}-${this.layoutId}-${this.presetId}.png`;
        await downloadPNG(this.svg, name);
      } catch (e) {
        this.error = `Export failed: ${e.message}`;
      } finally {
        this.exporting = false;
      }
    },

    redraw() {
      if (!this.norm) return;
      const preset = getPreset(this.presetId);
      const renderer = getRenderer(this.layoutId);
      this.svg = renderer.render(this.norm, {
        labelMode: this.labelMode,
        preset: preset.id,
        tokens: preset.tokens?.[renderer.id] || {},
        legendCol: Number(this.legendCol),
        infoPos: this.infoPos,
        bottomOrder: this.bottomOrder,
        notesOrder: this.notesOrder,
        pads: {
          top: Number(this.padTop),
          header: Number(this.padHeader),
          pitch: Number(this.padPitch),
          bottom: Number(this.padBottom),
          bar: Number(this.padBar),
        },
        barStyle: this.barStyle,
        gridOrder: this.gridOrder,
        note: this.customNote.trim(),
        themeVars: this.currentThemeStyle(),
        vintage: {
          ink: this.vintageInk,
          wear: this.presetId === "ballpark" ? this.ballparkWear : this.vintageWear,
        },
        card: {
          ink: this.layoutId === "tencents" ? this.tencentsInk : this.foilInk,
          scheme: this.tencentsScheme,
          form: this.spiralForm,
          paper: this.layoutId === "spiral" ? this.spiralPaper : this.layoutId === "tencents" ? this.tencentsPaper : this.agatePaper,
          title: this.tencentsTitle,
          foil: this.foilFoil,
          wall: this.scoreboardWall,
        },
        poster: { ground: this.layoutId === "rings" ? this.ringsGround : this.homageGround },
      });
    },
  };
}
