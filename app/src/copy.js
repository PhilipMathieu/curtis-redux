// All user-facing prose lives here — edit freely, nothing else references
// these strings. {vintage}, {n} etc. are filled in by the components.

export const COPY = {
  kicker: "Traded to Boston · July 25, 2026",
  titleName: "Curtis Mead",
  titleJoin: "at",
  titlePark: "Fenway Park",
  dek: "Every ball he put in play in 2026, replayed against Fenway's fences — including the 37-foot Green Monster.",

  stats: {
    actualHr: "HR, actual parks",
    neutralHr: "Expected HR, any park",
    expectedHr: "Expected HR, Fenway",
    parkHits: "Hits, Fenway effect",
  },

  filters: {
    all: "All balls",
    flipped: "Outcome flips",
    monster: "Off the Monster",
    hard: "95+ mph",
    allTypes: "All types",
    ground_ball: "Grounders",
    line_drive: "Liners",
    fly_ball: "Flies",
    popup: "Popups",
  },

  legendFlips: "outcome flips at Fenway",
  ballsShown: (shown, total) => `${shown} of ${total} balls shown`,

  emptyCard: "Select a batted ball.",
  actualHeader: (park) => `Actual · ${park}`,
  fenwayHeader: "At Fenway",
  sideView: (angle, side, seg, wall, dist) =>
    `Side view at ${angle}° ${side} — ${seg}, ${wall} ft wall at ${dist} ft`,
  landsShort: (ft) => `lands ${ft} ft short`,
  atWall: (h, pct) => `${h} ft at the wall${pct != null ? ` · clears ${pct}%` : ""}`,

  lineTitle: "2026 on contact",
  lineActual: "Actual",
  lineNeutral: "Any park",
  lineFenway: "At Fenway",

  matrixTitle: "Where the outcomes go",
  matrixCorner: "Actual ↓ · Fenway →",
  matrixTotal: "Total",
  matrixCaption:
    "Each row spreads the balls with that actual result across their expected Fenway outcomes. " +
    "Right edge: actual counts. Bottom edge: the expected Fenway line.",

  openFull: "Open full screen ↗",

  footnote: (vintage, n, excluded) =>
    `Statcast through ${vintage} · ${n} batted balls (${excluded} untracked excluded; ` +
    `fielder's choices and errors counted as outs). Fenway probabilities: the 100 most ` +
    `similar right-handed batted balls at Fenway since 2021, blended with a trajectory ` +
    `model fit to Mead's own home runs. "Any park" is the same model over a league-wide ` +
    `sample across all 30 parks — the gap between it and his actual line is batted-ball ` +
    `luck; the gap between it and the Fenway line is the park. Spin and wind aren't ` +
    `public — the ± band on the wall stands in for them.`,
};
