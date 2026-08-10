// All user-facing prose for the league page, same convention as ../copy.js.
// Framing rule: this is the anatomy of a roto race, not a promised comeback —
// every line has to stay true whether the gap closes or not.

const fmtPts = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export const COPY = {
  kicker: (league) => `${league.name} · ${league.season} season`,
  title: "The Chase",
  dek: (leader, chaser, gap, delta30, sinceLabel) =>
    `${leader.name} has led since ${sinceLabel}. ${chaser.name} has gained ` +
    `${fmtPts(delta30)} points in the last 30 days and sits ${fmtPts(gap)} back. ` +
    `The gap, the momentum, and the category rungs the race turns on.`,

  stats: {
    gap: "The gap",
    hot: (abbrev) => `${abbrev}, last 30 days`,
    quiet: "Days since a lead change",
  },

  race: {
    title: "The gap",
    sub: "Total roto points by day — the leader in blue, the chaser in red, the other six in gray. Hover any date for the full standings.",
    annTakeover: (abbrev, date) => `${abbrev} takes over, ${date}`,
    annEarly: (abbrev) => `${abbrev}'s April lead`,
    annSurge: (abbrev, delta) => `${abbrev} +${fmtPts(delta)} in 30 days`,
  },
  momentum: {
    title: "The momentum",
    sub: "Roto points gained and lost over the last 30 days, every team.",
  },
  rungs: {
    title: "The rungs",
    sub: "A roto race moves one category rung at a time. Each row: every team's rank (right is better), what the chaser needs to climb one rung, and the leader's cushion above the team just below — in real stat units, sorted by the chaser's cheapest point.",
    needHead: (abbrev) => `${abbrev} climbs with`,
    holdHead: (abbrev) => `${abbrev}'s cushion`,
    leads: "leads",
    fromLeader: (abbrev) => `· from ${abbrev}`,
    fromChaser: (abbrev) => `· ${abbrev} next`,
    maxed: "—",
  },

  footnote: (fetched) =>
    `Standings history is reconstructed from each day's lineups (ESPN doesn't ` +
    `archive roto standings); the current day matches ESPN's official scoring ` +
    `exactly. Rung costs are the live stat gaps in this league's category ` +
    `ladders. Data through ${fetched}, refreshed by the league-data workflow.`,
  espnLink: "View the league on ESPN",
  fenwayLink: "Also on this site: Boston's deadline pickups at Fenway Park",
};
