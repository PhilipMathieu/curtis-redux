// All user-facing prose lives here — edit freely, nothing else references
// these strings. Player facts ({name}, trade line, handedness) come from
// data/roster.json and the per-player meta; the sentences are here.

const HAND = { R: "right-handed", L: "left-handed", S: "switch-hitting" };
const SIDE = { R: "right-handed", L: "left-handed" };

export const COPY = {
  siteTitle: "Boston's 2026 deadline pickups at Fenway Park",
  navLabel: "Deadline pickups",
  navHint: "Every hitter Boston added at the 2026 trade deadline, re-fenced at Fenway.",
  navPending: "data pending",

  kicker: (p) => `Traded to Boston ${p.acquired}, ${p.trade_date}`,
  titleName: (p) => p.name,
  titleJoin: "at",
  titlePark: "Fenway Park",
  dek: (p) =>
    `Modeling park effect for every ball the ${HAND[p.bats]} ${p.pos} put in play in 2026, ` +
    `and projecting Green Monster effects.`,
  pageTitle: (p) => `${p.name} at Fenway Park — every batted ball, re-fenced`,

  loading: (p) => `Loading ${p.name}'s batted balls…`,
  noData: (p) =>
    `No batted-ball file for ${p.name} yet. Run "uv run python data/fetch_players.py ` +
    `--player ${p.slug} && uv run python build_dataset.py --player ${p.slug}" to build this page.`,

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
    L: "Batting lefty",
    R: "Batting righty",
  },

  legendFlips: "likely different result at Fenway",
  rangeHover: (ci) => `${ci[0]}-${ci[1]} across 1,000 random simulations`,
  ballsShown: (shown, total) => `${shown} of ${total} balls shown`,

  emptyCard: "Select a batted ball.",
  actualHeader: (park) => `Actual · ${park}`,
  fenwayHeader: "At Fenway",
  standNote: (stand) => `batting ${stand === "L" ? "lefty" : "righty"}`,
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

  // The comparison pool is same-handed, so a switch hitter gets both pools —
  // his pull side changes with the side he swings from, and at Fenway that
  // is the whole ballgame.
  poolPhrase: (meta) => {
    const hands = Object.keys(meta.hands ?? { [meta.bats]: meta.n_bbe });
    return hands.length > 1
      ? "the 100 most similar batted balls at Fenway since 2021 from the side he swung from"
      : `the 100 most similar ${SIDE[hands[0]] ?? "right-handed"} batted balls at Fenway since 2021`;
  },
  fitPhrase: (meta, short) =>
    meta.fit?.source === "own"
      ? `a trajectory model refit on ${short}'s own ${meta.fit.n_hr} tracked 2026 home runs` +
        (meta.fit.mae_ft != null ? ` (carry MAE ${meta.fit.mae_ft} ft)` : "")
      : meta.fit?.source === "default"
        ? "a trajectory model whose drag and lift constants come from Curtis Mead's 2026 home runs — " +
          "too few tracked home runs here to refit them"
        : `a trajectory model fit to ${short}'s own home runs`,

  footnote: (meta, short) =>
    `Statcast through ${meta.vintage}, ${meta.n_bbe} batted balls (${meta.no_track_excluded} untracked ` +
    `excluded; fielder's choices and errors counted as outs). Fenway probabilities: ` +
    `${COPY.poolPhrase(meta)}, blended with ${COPY.fitPhrase(meta, short)}. ` +
    `"Generic park" is the same model over a league-wide sample across all 30 parks — the gap ` +
    `between it and his actual line is batted-ball luck; the gap between it and the Fenway line ` +
    `is the park effect. This is a somewhat simplified model, not accounting for spin or weather ` +
    `conditions, so it should be interpreted only as a ballpark estimate (see what I did there).`,

  thinSample: (n) =>
    `Only ${n} tracked batted balls — every number on this page carries a wide interval. ` +
    `Read the ranges, not the point estimates.`,
};
