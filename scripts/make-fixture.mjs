// Fetches a game feed, normalizes it, and writes the (plain-JSON) model
// as a fixture for the design harness. Usage:
//   node scripts/make-fixture.mjs <gamePk> src/fixtures/<name>.json
import { writeFileSync } from "node:fs";
import { normalizeGame } from "../src/normalize.js";

const [gamePk, outPath] = process.argv.slice(2);
if (!gamePk || !outPath) {
  console.error("usage: node scripts/make-fixture.mjs <gamePk> <out.json>");
  process.exit(1);
}

const res = await fetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`);
if (!res.ok) throw new Error(`MLB API ${res.status}`);
const norm = normalizeGame(await res.json());
writeFileSync(outPath, JSON.stringify(norm, null, 1));
console.log(
  `wrote ${outPath}: ${norm.meta.away.name} @ ${norm.meta.home.name} ` +
  `${norm.meta.date}, ${norm.maxInning} innings`
);
