// One-off pull of the league's PAST seasons (and this season's activity feed) for model calibration.
// Usage: node x/history.mjs <out folder>   -> <out>/history.json  ({season: {league, comm}}), <out>/fetched_at.txt
// Same login cookies as fetch.mjs (S2, SWID, L from env). Non-fatal per season; prints only season numbers and HTTP codes.
import fs from "node:fs";
import path from "node:path";
const out = process.argv[2];
const L = process.env.L, SEASON = 2027, FIRST = 2020;
const cookie = `espn_s2=${process.env.S2}; SWID=${process.env.SWID}`;
const H = {"x-fantasy-platform": "kona-PROD", "x-fantasy-source": "kona", Cookie: cookie};
const views = "view=mMatchupScore&view=mMatchup&view=mTeam&view=mSettings&view=mStatus";
async function get(url, extra = {}) {
  const r = await fetch(url, {headers: {...H, ...extra}});
  if (!r.ok) return [null, r.status];
  return [await r.json(), 200];
}
const res = {};
for (let S = SEASON; S >= FIRST; S--) {
  const one = {};
  if (S < SEASON) {
    // finished seasons: matchups with per-category results, teams, settings
    let [j, code] = await get(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${S}/segments/0/leagues/${L}?${views}`);
    if (!j) { [j, code] = await get(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/leagueHistory/${L}?seasonId=${S}&${views}`); if (Array.isArray(j)) j = j[0]; }
    console.log(`history: ${S} league HTTP ${code}`);
    if (j) one.league = j;
  }
  // activity feed (adds, drops, trades) for GM habits, paged
  const feed = [];
  for (let off = 0; off < 5000; off += 250) {
    const f = {topics: {filterType: {value: ["ACTIVITY_TRANSACTIONS"]}, limit: 250, offset: off, sortMessageDate: {sortPriority: 1, sortAsc: false}}};
    const [c, cc] = await get(`https://lm-api-reads.fantasy.espn.com/apis/v3/games/fba/seasons/${S}/segments/0/leagues/${L}/communication/?view=kona_league_communication`,
      {"x-fantasy-filter": JSON.stringify(f)});
    if (!c) { console.log(`history: ${S} feed HTTP ${cc}`); break; }
    const t = c.topics || [];
    feed.push(...t);
    if (t.length < 250) break;
  }
  console.log(`history: ${S} feed items ${feed.length}`);
  one.comm = feed;
  if (one.league || feed.length) res[S] = one;
}
if (!Object.keys(res).length) { console.log("history: nothing fetched (login cookies expired?)"); process.exit(1); }
fs.mkdirSync(out, {recursive: true});
fs.writeFileSync(path.join(out, "history.json"), JSON.stringify(res));
fs.writeFileSync(path.join(out, "fetched_at.txt"), new Date().toISOString());
console.log("history: ok");
