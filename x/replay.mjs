// Run the model and live scripts against recorded API responses (from x/fetch.mjs), no network.
// Usage: node x/replay.mjs <raw.json> <work folder>   (reads <work>/model.js, live.js, adjustments.json;
// writes players_raw.csv, teams.json, my_cats.json, rosters.json, live.json into <work>)
import fs from "node:fs";
import path from "node:path";
const [rawPath, work] = process.argv.slice(2);
const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
const pick = u => u.includes("kona_player_info") ? raw.players : u.includes("mMatchupScore") ? raw.live : u.includes("mRoster") ? raw.teams : null;
globalThis.fetch = async url => { const b = pick(String(url)); if (!b) throw new Error("no recording for " + url); return {ok: true, json: async () => b}; };
globalThis.window = globalThis;
for (const f of ["model.js", "live.js"]) (0, eval)(fs.readFileSync(path.join(work, f), "utf8"));
const adj = JSON.parse(fs.readFileSync(path.join(work, "adjustments.json"), "utf8")).players;
const o = await window.__hqModel(adj);
if (!o.csv || o.csv.split("\n").length < 100) { console.log("replay: too few rows"); process.exit(1); }
fs.writeFileSync(path.join(work, "players_raw.csv"), o.csv);
fs.writeFileSync(path.join(work, "teams.json"), JSON.stringify(o.teams));
fs.writeFileSync(path.join(work, "my_cats.json"), JSON.stringify(o.myCats));
fs.writeFileSync(path.join(work, "rosters.json"), JSON.stringify(o.rosters));
fs.writeFileSync(path.join(work, "live.json"), JSON.stringify(await window.__hqLive()));
console.log("replay: ok");
