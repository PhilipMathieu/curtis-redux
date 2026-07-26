// All user-facing prose lives here — edit freely, nothing else references
// these strings. {vintage}, {n} etc. are filled in by the components.

export const COPY = {
  kicker: "Traded to Boston for Connelly Early, July 25, 2026",
  titleName: "Curtis Mead",
  titleJoin: "at",
  titlePark: "Fenway Park",
  dek: "Modeling park effect for every ball put in play in 2026 and projecting Green Monster effects.",

  stats: {
    actualHr: "HR, actual",
    neutralHr: "Expected HR, generic park",
    expectedHr: "Expected HR, Fenway effect",
    parkHits: "Hits, Fenway effect",
  },

  filters: {
    all: "All balls",
    flipped: "Outcome flips",
    monster: "Off the Monster",
  },

  legendFlips: "likely different result at Fenway",
  rangeHover: (ci) => `${ci[0]}-${ci[1]} across 1,000 random simulations`,
  ballsShown: (shown, total) => `${shown} of ${total} balls shown`,

  emptyCard: "Select a batted ball.",
  actualHeader: (park) => `Actual · ${park}`,
  fenwayHeader: "At Fenway",
  sideView: (angle, side, seg, wall, dist) =>
    `Side view at ${angle}° ${side} — ${seg}, ${wall} ft wall at ${dist} ft`,
  landsShort: (ft) => `lands ${ft} ft short`,
  atWall: (h, pct) => `${h} ft at the wall${pct != null ? ` clears ${pct}%` : ""}`,

  lineTitle: "2026 on contact",
  lineActual: "Actual",
  lineNeutral: "Generic park",
  lineFenway: "Fenway",

  matrixTitle: "Where the outcomes go",
  matrixCorner: "Actual ↓ · Fenway →",
  matrixTotal: "Total",
  matrixCaption:
    "Each row shows where the balls with that actual outcome would likely wind up at Fenway. " +
    "Right edge: actual counts. Bottom edge: the expected line if those same balls were hit at Fenway.",
  // hover sentence: nouns as [singular, plural]; sentence takes the
  // pre-joined outcome list ("11.3 home runs, 2.8 doubles and 1.4 outs")
  matrixNouns: {
    HR: ["home run", "home runs"],
    "3B": ["triple", "triples"],
    "2B": ["double", "doubles"],
    "1B": ["single", "singles"],
    Out: ["out", "outs"],
  },
  matrixRowSentence: (n, noun, outcomes) =>
    `The ${n} ${noun} could have resulted in ${outcomes} at Fenway, given their trajectory.`,
  matrixRowHint: "Hover a row for the plain-English version.",

  openFull: "Open full screen ↗",

  footnote: (vintage, n, excluded) =>
    `Statcast through ${vintage}, ${n} batted balls (${excluded} untracked excluded; ` +
    `fielder's choices and errors counted as outs). Fenway probabilities: the 100 most ` +
    `similar right-handed batted balls at Fenway since 2021, blended with a trajectory ` +
    `model fit to Mead's own home runs. "Generic park" is the same model over a league-wide ` +
    `sample across all 30 parks — the gap between it and his actual line is batted-ball ` +
    `luck; the gap between it and the Fenway line is the park effect. This is a somewhat ` +
    `simplified model, not accounting for spin or weather conditions, so it should be ` +
    `interpreted only as a ballpark estimate (see what I did there).`,
};
