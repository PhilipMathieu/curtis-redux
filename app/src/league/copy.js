// All user-facing prose for the league page, same convention as ../copy.js.

const fmtPts = (n) => (Number.isInteger(n) ? `${n}` : n.toFixed(1));

export const COPY = {
  kicker: (league) => `${league.name} · ${league.season} season`,
  title: "The Roto Race",
  dek: (leader, second, gap) =>
    `${leader.name} leads with ${fmtPts(leader.total)} rotisserie points, ` +
    `${fmtPts(gap)} clear of ${second.name}. Below: how the race got here, ` +
    `where every point comes from — and which players bought them.`,

  stats: {
    leader: "League leader",
    gap: "Lead over 2nd",
    hot: "Hottest 30 days",
    mvp: "League MVP (SGP)",
  },
  hotHover: (team, delta) =>
    `${team} gained ${fmtPts(delta)} points over the last 30 days`,
  mvpHover: (name, sgp) =>
    `${name} — ${sgp.toFixed(1)} standings points bought, the most in the league`,

  multiples: {
    title: "The season so far",
    sub: "Every team's roto points by day, the rest of the league in gray behind it. Click a panel to focus that team everywhere below; hover for the value on any date.",
  },
  bump: {
    title: "The rank race",
    sub: "Standings position, sampled weekly — only the moves that stuck. Hover any week for the full order.",
  },
  scatter: {
    title: "Built on bats or arms",
    sub: "Each team's points split by source. Above the diagonal is a pitching-built team; below it, a batting-built one.",
    diagonal: "perfect balance",
  },
  profile: {
    title: "Strength profile",
    sub: "Each category as a strip: all eight teams in gray, the focused team in red, farther right is better. The spread shows how contested each category is.",
    axis: "← weaker · distance from league average · stronger →",
    avgTick: "league avg",
    above: "above league average",
    below: "below league average",
  },
  split: {
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
  players: {
    title: "Player value",
    sub: "SGP — standings gain points — prices every category by this league's own ladder (the average stat gap between consecutive places), then credits each player with the standings points his production actually bought while started. RV+ indexes that to 100 = the average starter. Ratio categories are credited as impact: the team's AVG/ERA/WHIP with the player minus without him.",
    leaderboard: "The league's most valuable players",
    roster: (team) => `${team}'s roster, in standings points`,
    rosterSub: "Counting columns are production bought; AVG/ERA/WHIP columns are the player's impact on the team ratio. Red cells hurt.",
    rvHead: "SGP · RV+",
    player: "Player",
    gpHead: "G",
    gpLong: "Games with a counted stat line for this team",
    sgpHead: "SGP",
    sgpUnit: "standings points",
    gp: (n) => `${n} games with a counted stat line`,
    tooSmall: (cat) => `Sample too small to credit ${cat} impact`,
  },

  footnote: (fetched) =>
    `Standings history is reconstructed from each day's lineups (ESPN doesn't ` +
    `archive roto standings), so a day here or there can differ by a tie-break ` +
    `from what the league page showed that morning; the current day matches ` +
    `ESPN's official scoring exactly. Player value counts production only while ` +
    `started for a team in this league, and ratio impacts depend on team ` +
    `context, like RBI do. Data through ${fetched}, refreshed by the ` +
    `league-data workflow.`,
  espnLink: "View the league on ESPN",
  fenwayLink: "Also on this site: Boston's deadline pickups at Fenway Park",
};
