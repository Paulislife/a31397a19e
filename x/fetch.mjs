// Pull league data with the login cookies from env (S2, SWID, L) and run the model and live score scripts.
// Usage: node x/fetch.mjs <work folder>   (reads <work>/model.js, <work>/live.js, <work>/adjustments.json)
// Prints nothing identifying: the repo and its logs are public.
import fs from "node:fs";
import path from "node:path";
const work = process.argv[2];
const L = process.env.L, cookie = `espn_s2=${process.env.S2}; SWID=${process.env.SWID}`;
const realFetch = globalThis.fetch;
globalThis.fetch = (url, opts = {}) => {
  const u = String(url).replace(/leagues\/\d+/, "leagues/" + L);
  const headers = {...(opts.headers || {}), Cookie: cookie};
  return realFetch(u, {...opts, headers});
};
globalThis.window = globalThis;
for (const f of ["model.js", "live.js"]) (0, eval)(fs.readFileSync(path.join(work, f), "utf8"));
const adj = JSON.parse(fs.readFileSync(path.join(work, "adjustments.json"), "utf8")).players;
const o = await window.__hqModel(adj);
if (!o.csv || o.csv.split("\n").length < 100) { console.log("fetch: too few rows"); process.exit(1); }
fs.writeFileSync(path.join(work, "players_raw.csv"), o.csv);
fs.writeFileSync(path.join(work, "teams.json"), JSON.stringify(o.teams));
fs.writeFileSync(path.join(work, "my_cats.json"), JSON.stringify(o.myCats));
fs.writeFileSync(path.join(work, "rosters.json"), JSON.stringify(o.rosters));
fs.writeFileSync(path.join(work, "live.json"), JSON.stringify(await window.__hqLive()));
console.log("fetch: ok");
