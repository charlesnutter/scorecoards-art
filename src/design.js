// Entry for design.html: renders checked-in fixture games (no network)
// with layout/style/label switchers. The fast loop for scorecard design
// work — edits to scorecard.css, presets.js, renderers, or fixtures
// hot-reload here.
import "./style.css";
import Alpine from "alpinejs";
import { STYLE_PRESETS, getPreset } from "./presets.js";
import { RENDERERS, getRenderer } from "./renderers.js";
import nineInnings from "./fixtures/game-nine-innings.json";
import extraInnings from "./fixtures/game-extra-innings.json";

Alpine.data("designHarness", () => ({
  layouts: RENDERERS,
  styles: STYLE_PRESETS,
  layoutId: "classic",
  presetId: "classic",
  labelMode: "names",
  fixtures: [
    { name: "9 innings — game-nine-innings.json", norm: nineInnings },
    { name: "11 innings — game-extra-innings.json", norm: extraInnings },
  ],

  render(fixture) {
    const preset = getPreset(this.presetId);
    const renderer = getRenderer(this.layoutId);
    return renderer.render(fixture.norm, {
      labelMode: this.labelMode,
      preset: preset.id,
      tokens: preset.tokens?.[renderer.id] || {},
    });
  },
}));

window.Alpine = Alpine;
Alpine.start();
