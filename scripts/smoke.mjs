// Renders a real game feed (downloaded JSON) through normalize + scorecard
// without a browser, to catch shape errors early. Embeds scorecard.css in
// the output so the standalone SVG is fully styled — the same technique
// the poster-export path will use. Usage:
//   node scripts/smoke.mjs path/to/feed.json out.svg [preset]
import { readFileSync, writeFileSync } from "node:fs";
import { normalizeGame } from "../src/normalize.js";
import { renderScorecard } from "../src/scorecard.js";
import { getPreset } from "../src/presets.js";

const [feedPath, outPath = "smoke-out.svg", presetId = "classic"] = process.argv.slice(2);
const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const norm = normalizeGame(feed);

console.log(`${norm.meta.away.name} @ ${norm.meta.home.name} — ${norm.meta.date}`);
console.log(`innings: ${norm.maxInning}, scoring plays: ${norm.scoring.length}`);
for (const side of ["away", "home"]) {
  const s = norm.sides[side];
  const paCount = Object.values(s.cells).reduce(
    (n, m) => n + Object.values(m).reduce((k, l) => k + l.length, 0), 0);
  console.log(`${side}: ${Object.keys(s.slots).length} slots, ${paCount} plate appearances`);
}

const preset = getPreset(presetId);
let svg = renderScorecard(norm, { labelMode: "names", preset: preset.id, tokens: preset.tokens });

// Standalone SVG has no page stylesheet; embed it. CDATA keeps CSS
// characters like & from breaking XML parsing.
const css = readFileSync(new URL("../src/scorecard.css", import.meta.url), "utf8");
svg = svg.replace(">", `><style><![CDATA[${css}]]></style>`);

writeFileSync(outPath, svg);
console.log(`wrote ${outPath} (${svg.length} bytes, preset: ${preset.id})`);
