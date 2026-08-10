// All user-facing prose for the league page, same convention as ../copy.js.

const fmtPts = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export const COPY = {
  kicker: (league) => `${league.name} · ${league.season} season`,
  title: "The Roto Race",
  dek: (leader, second, gap) =>
    `${leader.name} leads with ${fmtPts(leader.total)} rotisserie points, ` +
    `${fmtPts(gap)} clear of ${second.name}. Below: how the race got here, ` +
    `and which categories every point comes from.`,

  stats: {
    leader: "League leader",
    gap: "Lead over 2nd",
    hot: "Hottest 30 days",
    swing: "Biggest range",
  },
  hotHover: (team, delta) =>
    `${team} gained ${fmtPts(delta)} points over the last 30 days`,
  swingHover: (team, lo, hi) =>
    `${team} has ranged from ${fmtPts(lo)} to ${fmtPts(hi)} points`,

  progress: {
    title: "The season so far",
    sub: "Total roto points by day. Pick a team to trace its path; hover for the full standings on any date.",
  },
  split: {
    title: "Where the points come from",
    sub: "Each team's current points, split between the five batting and five pitching categories.",
    batting: "Batting points",
    pitching: "Pitching points",
  },
  matrix: {
    title: "Category by category",
    sub: "Roto points in each of the ten categories — darker cells are more points. Toggle to see the underlying season stats.",
    showPoints: "Roto points",
    showValues: "Season stats",
    batting: "Batting",
    pitching: "Pitching",
    total: "Total",
  },

  footnote: (fetched) =>
    `Standings history is reconstructed from each day's lineups (ESPN doesn't ` +
    `archive roto standings), so a day here or there can differ by a tie-break ` +
    `from what the league page showed that morning; the current day matches ` +
    `ESPN's official scoring exactly. Data through ${fetched}, refreshed by the ` +
    `league-data workflow.`,
  espnLink: "View the league on ESPN",
  fenwayLink: "Also on this site: Boston's deadline pickups at Fenway Park",
};
