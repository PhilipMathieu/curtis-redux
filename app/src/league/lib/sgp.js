// League-true player value in SGP (standings gain points): the average stat
// gap between consecutive standings places prices each category, and a
// player's production is what it bought. Ratio categories (AVG/ERA/WHIP)
// aren't additive, so a player's contribution there is impact — the team's
// ratio with him minus without him — priced with the same denominators.
// RV+ indexes total SGP to 100 = the average starter, the wRC+ analog.

import { BAT_ORDER } from "./viz.js";

const COUNT = [20, 5, 21, 23, 53, 57, 48];
const RATIO = [2, 47, 41];
export const CAT_SGP_ORDER = [20, 5, 21, 23, 2, 53, 57, 48, 47, 41];

// active lineup slots in a standard ESPN roto roster; sets the "starter
// pool" size that RV+ indexes against
const STARTERS_PER_TEAM = 13;

const ratioOf = (sid, c) => {
  if (sid === 2) return c.ab ? c.h / c.ab : 0;
  if (sid === 47) return c.outs ? (c.er * 27) / c.outs : 0;
  return c.outs ? ((c.ha + c.bba) * 3) / c.outs : 0;
};

const comps = (stats) => ({
  ab: stats["0"] ?? 0,
  h: stats["1"] ?? 0,
  outs: stats["34"] ?? 0,
  ha: stats["37"] ?? 0,
  bba: stats["39"] ?? 0,
  er: stats["45"] ?? 0,
});

export function computeSgp(league) {
  const teamIds = league.teams.map((t) => String(t.id));
  const reverse = Object.fromEntries(league.categories.map((c) => [c.statId, c.reverse]));

  // denominators from the current category ladders
  const denoms = {};
  for (const cat of league.categories) {
    const vals = teamIds
      .map((tid) => league.current[tid].espnValues[String(cat.statId)])
      .sort((a, b) => a - b);
    denoms[cat.statId] = (vals.at(-1) - vals[0]) / (vals.length - 1) || 1;
  }

  // per-team component totals, for with/without ratio impact
  const teamComps = {};
  for (const tid of teamIds) {
    const sum = { ab: 0, h: 0, outs: 0, ha: 0, bba: 0, er: 0 };
    for (const p of league.players[tid]) {
      const c = comps(p.stats);
      for (const k in sum) sum[k] += c[k];
    }
    teamComps[tid] = sum;
  }

  // each roster stint valued separately (a traded player's value splits
  // across the teams he actually produced for)
  const stintsByTeam = {};
  const merged = new Map(); // name → league-wide totals
  for (const tid of teamIds) {
    stintsByTeam[tid] = league.players[tid].map((p) => {
      const byCat = {};
      for (const sid of COUNT) byCat[sid] = (p.stats[String(sid)] ?? 0) / denoms[sid];
      const c = comps(p.stats);
      for (const sid of RATIO) {
        // small samples produce absurd impacts; require a real stint
        if (sid === 2 ? c.ab < 50 : c.outs < 60) continue;
        const w = teamComps[tid];
        const without = {
          ab: w.ab - c.ab, h: w.h - c.h, outs: w.outs - c.outs,
          ha: w.ha - c.ha, bba: w.bba - c.bba, er: w.er - c.er,
        };
        const impact = (ratioOf(sid, w) - ratioOf(sid, without)) * (reverse[sid] ? -1 : 1);
        byCat[sid] = impact / denoms[sid];
      }
      const sgp = Object.values(byCat).reduce((a, b) => a + b, 0);
      const stint = {
        name: p.name, gp: p.gp, byCat, sgp,
        pitcher: (p.stats["34"] ?? 0) > (p.stats["0"] ?? 0),
      };
      const m = merged.get(p.name) ?? { name: p.name, byCat: {}, sgp: 0, gp: 0, teams: [], pitcher: stint.pitcher };
      for (const [sid, v] of Object.entries(byCat)) m.byCat[sid] = (m.byCat[sid] ?? 0) + v;
      m.sgp += sgp;
      m.gp += p.gp;
      m.teams.push(tid);
      merged.set(p.name, m);
      return stint;
    });
    stintsByTeam[tid].sort((a, b) => b.sgp - a.sgp);
  }

  const leaderboard = [...merged.values()].sort((a, b) => b.sgp - a.sgp);
  const pool = leaderboard.slice(0, teamIds.length * STARTERS_PER_TEAM);
  const rvBase = pool.reduce((a, p) => a + p.sgp, 0) / pool.length;

  return { denoms, leaderboard, stintsByTeam, rvBase };
}

export const rvPlus = (sgp, rvBase) => Math.round((100 * sgp) / rvBase);

export const sgpSplit = (byCat) => {
  let bat = 0;
  let pit = 0;
  for (const [sid, v] of Object.entries(byCat)) {
    if (BAT_ORDER.includes(Number(sid))) bat += v;
    else pit += v;
  }
  return { bat, pit };
};

// "Witt Jr." → "Witt", for compact labels
export function lastName(full) {
  const parts = full.split(" ");
  let last = parts.at(-1);
  if (/^(jr\.?|sr\.?|ii|iii|iv)$/i.test(last) && parts.length > 1) last = parts.at(-2);
  return last;
}
