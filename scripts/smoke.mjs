// Renders a real game feed (downloaded JSON) through normalize + scorecard
// without a browser, to catch shape errors early. Usage:
//   node scripts/smoke.mjs path/to/feed.json out.svg
import { readFileSync, writeFileSync } from "node:fs";
import { normalizeGame } from "../src/normalize.js";
import { renderScorecard } from "../src/scorecard.js";

const [feedPath, outPath = "smoke-out.svg"] = process.argv.slice(2);
const feed = JSON.parse(readFileSync(feedPath, "utf8"));
const norm = normalizeGame(feed);

console.log(`${norm.meta.away.name} @ ${norm.meta.home.name} — ${norm.meta.date}`);
console.log(`innings: ${norm.maxInning}, scoring plays: ${norm.scoring.length}`);
for (const side of ["away", "home"]) {
  const s = norm.sides[side];
  const paCount = [...s.cells.values()].reduce(
    (n, m) => n + [...m.values()].reduce((k, l) => k + l.length, 0), 0);
  console.log(`${side}: ${s.slots.size} slots, ${paCount} plate appearances`);
}

const svg = renderScorecard(norm, { labelMode: "names" });
writeFileSync(outPath, svg);
console.log(`wrote ${outPath} (${svg.length} bytes)`);
