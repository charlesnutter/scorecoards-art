// Entry for design.html: renders checked-in fixture games (no network)
// with a preset/label switcher. The fast loop for scorecard design work —
// edits to scorecard.css, presets.js, or scorecard.js hot-reload here.
import "./style.css";
import Alpine from "alpinejs";
import { renderScorecard } from "./scorecard.js";
import { DESIGN_PRESETS, getPreset } from "./presets.js";
import nineInnings from "./fixtures/game-nine-innings.json";
import extraInnings from "./fixtures/game-extra-innings.json";

Alpine.data("designHarness", () => ({
  designs: DESIGN_PRESETS,
  presetId: "classic",
  labelMode: "names",
  fixtures: [
    { name: "9 innings — game-nine-innings.json", norm: nineInnings },
    { name: "11 innings — game-extra-innings.json", norm: extraInnings },
  ],

  render(fixture) {
    const preset = getPreset(this.presetId);
    return renderScorecard(fixture.norm, {
      labelMode: this.labelMode,
      preset: preset.id,
      tokens: preset.tokens,
    });
  },
}));

window.Alpine = Alpine;
Alpine.start();
