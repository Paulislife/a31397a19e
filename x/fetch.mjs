// Record the league's raw API responses with the login cookies from env (S2, SWID, L).
// Usage: node x/fetch.mjs <out folder>   -> <out>/raw.json  ({key: response JSON})
// Contains nothing identifying (the league number comes from a secret); prints nothing identifying.
import fs from "node:fs";
import path from "node:path";
const out = process.argv[2];
const L = process.env.L, SEASON = 2027;
const B = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${SEASON}/segments/0/leagues/${L}`;
const cookie = `espn_s2=${process.env.S2}; SWID=${process.env.SWID}`;
const filter = {players: {filterSlotIds: {value: [0,1,2,3,4,5,6,7,8,9,10,11]}, sortDraftRanks: {sortPriority: 1, sortAsc: true, value: "STANDARD"},
  limit: 400, filterStatsForTopScoringPeriodIds: {value: 5, additionalValue: [`00${SEASON}`, `10${SEASON}`]}}};
const req = {
  players: [B + "?view=kona_player_info", {"x-fantasy-filter": JSON.stringify(filter), "x-fantasy-platform": "kona-PROD", "x-fantasy-source": "kona"}],
  teams: [B + "?view=mTeam&view=mRoster", {}],
  live: [B + "?view=mMatchupScore&view=mMatchup&view=mStatus&view=mSettings", {}],
};
const raw = {};
for (const [k, [u, h]] of Object.entries(req)) {
  const r = await fetch(u, {headers: {...h, Cookie: cookie}});
  if (!r.ok) { console.log(`fetch: ${k} HTTP ${r.status}`); process.exit(1); }
  raw[k] = await r.json();
}
if (!(raw.players.players || []).length || !(raw.teams.teams || []).length) { console.log("fetch: empty (login cookies expired?)"); process.exit(1); }
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, "raw.json"), JSON.stringify(raw));
fs.writeFileSync(path.join(out, "fetched_at.txt"), new Date().toISOString());
console.log("fetch: ok");
