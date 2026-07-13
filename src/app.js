import { fetchTeams, fetchSchedule, fetchFeed, fetchNotes } from "./api.js";
import { normalizeGame } from "./normalize.js";
import { STYLE_PRESETS, getPreset } from "./presets.js";
import { RENDERERS, getRenderer } from "./renderers.js";
import { downloadPNG } from "./export.js";

const PRESETS = [
  { label: "BOS @ NYY · 2025 AL Wild Card G2", date: "2025-10-01", team: 147 },
  { label: "SD @ CHC · 2025-10-01", date: "2025-10-01", team: 112 },
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

    // settings
    layouts: RENDERERS,
    styles: STYLE_PRESETS,
    layoutId: "classic",
    presetId: "classic",
    labelMode: "names",
    legendCol: 1,
    infoPos: "footer",
    bottomOrder: "notes-first",
    notesOrder: "scoring-first",

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
      this.$watch("legendCol", () => this.redraw());
      this.$watch("infoPos", () => this.redraw());
      this.$watch("bottomOrder", () => this.redraw());
      this.$watch("notesOrder", () => this.redraw());
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

    async loadGame(gamePk) {
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
      });
    },
  };
}
