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
          `too few tracked home runs here to refit them` +
          (meta.fit.mae_ft != null
            ? ` (against ${short}'s ${meta.fit.n_hr}, those constants carry ${meta.fit.mae_ft} ft off on average, ` +
              `${meta.fit.bias_ft > 0 ? "long" : "short"})`
            : "")
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

  // Pipeline page — copy for the Sea Dogs → WooSox → Red Sox visualization.
  pipeline: {
    navLabel: "Pipeline",
    kicker: "Portland → Worcester → Boston",
    title: "The road to Fenway",
    dek:
      "Boston's 2026 deadline pickups slot in beside a core that walked the same three-city path: " +
      "Double-A Portland, Triple-A Worcester, then the majors. Here is how narrow the last two doors are, " +
      "and who this year's Red Sox are because they got through them.",
    funnelTitle: "A typical cohort, three years out",
    funnelCaption:
      "Take everyone who wears a Sea Dogs uniform in a given season — the top prospects, the org depth, " +
      "the passing veterans on rehab. Roughly this many still have a Red Sox future two levels later. " +
      "Bands are illustrative, drawn from how affiliated-baseball cohorts typically thin out, not a Boston-specific audit; " +
      "the point is the shape of the funnel, not the decimal.",
    footnote:
      "Player paths are from MiLB.com and public reporting; cohort widths are an industry-shape " +
      "approximation, not a per-year Boston tally. The map is the road; every player runs it at their own pace.",
    columnLabels: {
      seadogs: "Portland Sea Dogs",
      seadogsSub: "Double-A",
      woosox: "Worcester Red Sox",
      woosoxSub: "Triple-A",
      redsox: "Boston Red Sox",
      redsoxSub: "MLB debut",
      stick: "Sticks in Boston",
      stickSub: "regular MLB role",
    },
    flowLabels: {
      // "of every 100 Sea Dogs, this many make it to the next level"
      seadogsToWoosox: "≈ 45 of 100",
      woosoxToRedsox: "≈ 18 of 100",
      redsoxToStick: "≈ 7 of 100",
    },
    // Two-line off-ramp captions — the SVG renders each string as its own tspan.
    offRampLabels: {
      seadogs: ["released, traded,", "or capped at AA"],
      woosox: ["AAA shuttle — DFA'd,", "dealt, cup elsewhere"],
      redsox: ["MLB cameo, then", "back to depth"],
    },
    narrativesTitle: "How this year's Red Sox got here",
    narrativesCaption:
      "Every current Red Sox contributor with a Portland–Worcester line on their card. " +
      "The dot chart under each name is the same three doors from the funnel above.",
    stepShort: { seadogs: "SEA", woosox: "WOO", redsox: "BOS" },

    outsideTitle: "From outside the org",
    outsideCaption:
      "The other lane onto the roster: signed off the free-agent market, acquired in a trade, " +
      "or plucked from another system's Rule 5 draft. They never wore a Sea Dogs or WooSox uniform.",
    outsideDeadlineNote:
      "The 2026 deadline pickups — Mead, Rutschman, Rogers and White — each have their own tab in the nav above.",
    routeLabels: {
      trade: "TRADE",
      fa: "FREE AGENT",
      rule5: "RULE 5",
      intl: "INT'L POSTING",
    },
  },
};
