import { COPY } from "../copy.js";

// Ordered, verifiable paths for current-team contributors. Years are the
// season(s) each player appeared at that affiliate at any point (per
// MiLB.com and public reporting); the goal is the shape of the road, not
// a game-log audit.
const NARRATIVES = [
  {
    name: "Roman Anthony",
    pos: "OF",
    signed: "2022 draft, 2nd rd",
    path: { seadogs: "2024", woosox: "2024–25", redsox: "2025" },
    line:
      "84 games in Portland (.269/.367/.489, 15 HR) at age 20, then never looked back — " +
      "Worcester by the same summer, Boston by the next.",
  },
  {
    name: "Marcelo Mayer",
    pos: "SS/3B",
    signed: "2021 draft, 1st rd",
    path: { seadogs: "2023–24", woosox: "2024–25", redsox: "2025" },
    line:
      "Doubled in his first Sea Dogs at-bat of 2024, hit .307 through 77 AA games, " +
      "answered every follow-up level, debuted in Boston that same season.",
  },
  {
    name: "Kristian Campbell",
    pos: "2B/OF",
    signed: "2023 draft, 4th rd",
    path: { seadogs: "2024", woosox: "2024", redsox: "2025" },
    line:
      "Cleared all three affiliates inside a calendar year — the kind of rise the funnel " +
      "below is drawn to make you appreciate.",
  },
  {
    name: "Ceddanne Rafaela",
    pos: "OF/SS",
    signed: "2017 intl signing",
    path: { seadogs: "2022–23", woosox: "2023", redsox: "2023" },
    line:
      "AA All-Star in 2022, .302/.349/.520 between Portland and Worcester in 2023, " +
      "up in Boston that August playing center, short and second in the same week.",
  },
  {
    name: "Wilyer Abreu",
    pos: "OF",
    signed: "traded from HOU, 2022",
    path: { seadogs: "2022", woosox: "2023", redsox: "2023" },
    line:
      "40 Sea Dogs games after the trade, an IL All-Star bat in Worcester the next year, " +
      "called up August 22 and hit .316 the rest of the way.",
  },
  {
    name: "Jarren Duran",
    pos: "OF",
    signed: "2018 draft, 7th rd",
    path: { seadogs: "2019", woosox: "2021", redsox: "2021" },
    line:
      "The prototype for this decade's version of the pipeline — Portland late 2019, " +
      "Worcester's first summer of existence, Boston that July.",
  },
  {
    name: "Brayan Bello",
    pos: "RHP",
    signed: "2017 intl signing",
    path: { seadogs: "2021", woosox: "2022", redsox: "2022" },
    line:
      "Punched out 116 Sea Dogs hitters in 90 innings, moved to Worcester on his 23rd birthday " +
      "week, was starting at Fenway inside two months.",
  },
  {
    name: "Connor Wong",
    pos: "C",
    signed: "traded from LAD, 2020",
    path: { seadogs: "—", woosox: "2021–22", redsox: "2022" },
    line:
      "The Mookie Betts trade's quiet keeper — jumped Portland entirely, caught two full " +
      "Worcester seasons, has been the depth catcher in Boston ever since.",
  },
];

// Aggregate cohort widths — illustrative shape, not a per-year Boston audit.
// Chosen so the funnel reads honestly at a glance: about half of AA gets to
// AAA, about a third of AAA gets an MLB debut, less than half of debuts stick.
const COHORT = { seadogs: 100, woosox: 45, redsox: 18, stick: 7 };

// Layout constants for the SVG funnel. Three fixed horizontal zones stacked
// top-to-bottom so labels never collide with the ribbons.
const W = 720;
const HEAD_H = 66; // column name (y≈16), subtitle (y≈32), flow labels (y≈54)
const BAND_H_MAX = 180; // vertical space the largest cohort band fills
const FOOT_H = 92; // cohort counts (y≈+22), off-ramp labels (two lines, y≈+50/+62)
const H = HEAD_H + BAND_H_MAX + FOOT_H;
const PAD_X = 24;
const COL_W = 96;
const GAP_X = (W - 2 * PAD_X - 4 * COL_W) / 3;
const BAND_TOP = HEAD_H;
// Top-aligned bands so a stayer ribbon shares a flat top edge with the next
// band and the funnel visually narrows downward, not toward a centered pinch.
const SCALE = BAND_H_MAX / COHORT.seadogs;
const bandH = (n) => n * SCALE;

// Column x-positions (left edge of each cohort band).
const COLS = [
  { key: "seadogs", x: PAD_X },
  { key: "woosox", x: PAD_X + COL_W + GAP_X },
  { key: "redsox", x: PAD_X + 2 * (COL_W + GAP_X) },
  { key: "stick", x: PAD_X + 3 * (COL_W + GAP_X) },
];

const COL_X = Object.fromEntries(COLS.map((c) => [c.key, c.x]));

// Colors that stay in the site's palette.
const FILL_STAY = "#CE112D"; // primary — the players who advance
const FILL_OFFRAMP = "#E5E5E5"; // gray-200 — attrition

// A trapezoid ribbon between two column edges, curved on top and bottom so
// the whole funnel reads as one continuous stream.
function ribbonPath(x1, y1a, y1b, x2, y2a, y2b) {
  const mid = (x1 + COL_W + x2) / 2;
  return [
    `M ${x1 + COL_W} ${y1a}`,
    `C ${mid} ${y1a}, ${mid} ${y2a}, ${x2} ${y2a}`,
    `L ${x2} ${y2b}`,
    `C ${mid} ${y2b}, ${mid} ${y1b}, ${x1 + COL_W} ${y1b}`,
    "Z",
  ].join(" ");
}

function Funnel() {
  // Top-aligned cohort bands: every band starts at BAND_TOP and drops to
  // BAND_TOP + bandH(cohort). Bigger cohorts are taller, so the funnel
  // visibly steps down left-to-right.
  const bands = Object.fromEntries(
    Object.entries(COHORT).map(([k, n]) => {
      const h = bandH(n);
      return [k, { top: BAND_TOP, bot: BAND_TOP + h, h }];
    }),
  );

  const pairs = [
    ["seadogs", "woosox", COPY.pipeline.flowLabels.seadogsToWoosox, COPY.pipeline.offRampLabels.seadogs],
    ["woosox", "redsox", COPY.pipeline.flowLabels.woosoxToRedsox, COPY.pipeline.offRampLabels.woosox],
    ["redsox", "stick", COPY.pipeline.flowLabels.redsoxToStick, COPY.pipeline.offRampLabels.redsox],
  ];

  const offRampLandY = BAND_TOP + BAND_H_MAX + 6; // just below the deepest band
  const flowLabelY = HEAD_H - 14; // in the header strip, above the funnel
  const cohortNumY = BAND_TOP + BAND_H_MAX + 22; // below the bands, aligned across
  const offRampTextY = BAND_TOP + BAND_H_MAX + 52; // one row further down

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Funnel from Portland Sea Dogs to Worcester Red Sox to Boston Red Sox"
    >
      {/* Column headers */}
      {COLS.map(({ key, x }) => (
        <g key={`hdr-${key}`}>
          <text
            x={x + COL_W / 2}
            y={18}
            textAnchor="middle"
            className="fill-gray-800"
            style={{ fontSize: 12, fontWeight: 700 }}
          >
            {COPY.pipeline.columnLabels[key]}
          </text>
          <text
            x={x + COL_W / 2}
            y={34}
            textAnchor="middle"
            className="fill-gray-500"
            style={{ fontSize: 10, letterSpacing: 1.4 }}
          >
            {COPY.pipeline.columnLabels[`${key}Sub`].toUpperCase()}
          </text>
        </g>
      ))}

      {/* Off-ramps: rendered before stayers so the primary ribbon sits on top.
          Each drops from the source band's bottom edge down to a thin sliver
          near the funnel floor — the visual weight of players who don't advance. */}
      {pairs.map(([from, to]) => {
        const src = bands[from];
        const dst = bands[to];
        const x1 = COL_X[from];
        const x2 = COL_X[to];
        const stayerBotOnSrc = src.top + dst.h;
        return (
          <path
            key={`off-${from}`}
            d={ribbonPath(x1, stayerBotOnSrc, src.bot, x2, offRampLandY, offRampLandY + 0.5)}
            fill={FILL_OFFRAMP}
            opacity="0.85"
          />
        );
      })}

      {/* Stayer ribbons — top-flat, bottom drops to match destination band. */}
      {pairs.map(([from, to]) => {
        const src = bands[from];
        const dst = bands[to];
        const x1 = COL_X[from];
        const x2 = COL_X[to];
        return (
          <path
            key={`stay-${from}`}
            d={ribbonPath(x1, src.top, src.top + dst.h, x2, dst.top, dst.bot)}
            fill={FILL_STAY}
            opacity="0.55"
          />
        );
      })}

      {/* Flow labels in the header strip, centered between columns. */}
      {pairs.map(([from, to, label]) => {
        const x1 = COL_X[from];
        const x2 = COL_X[to];
        return (
          <text
            key={`flow-${from}`}
            x={(x1 + COL_W + x2) / 2}
            y={flowLabelY}
            textAnchor="middle"
            className="fill-gray-700"
            style={{ fontSize: 11, fontWeight: 600 }}
          >
            {label}
          </text>
        );
      })}

      {/* Solid cohort bands over the ribbons so the columns read as anchors. */}
      {COLS.map(({ key, x }) => {
        const b = bands[key];
        return (
          <g key={key}>
            <rect x={x} y={b.top} width={COL_W} height={b.h} fill={FILL_STAY} opacity="0.95" rx="2" />
            <text
              x={x + COL_W / 2}
              y={cohortNumY}
              textAnchor="middle"
              className="fill-gray-800"
              style={{ fontSize: 15, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}
            >
              {COHORT[key]}
            </text>
          </g>
        );
      })}

      {/* Off-ramp captions on their own row so the ribbons stay legible. Each
          caption is a two-string array so tight column gaps still get to
          carry a full sentence. */}
      {pairs.map(([from, to, , lines]) => {
        const x1 = COL_X[from];
        const x2 = COL_X[to];
        const cx = (x1 + COL_W + x2) / 2;
        return (
          <text
            key={`offlbl-${from}`}
            x={cx}
            y={offRampTextY}
            textAnchor="middle"
            className="fill-gray-500"
            style={{ fontSize: 10 }}
          >
            {lines.map((ln, i) => (
              <tspan key={i} x={cx} dy={i === 0 ? 0 : 12}>
                {ln}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

// A compact three-step path glyph — the same three doors from the funnel.
function PathDots({ path }) {
  const steps = ["seadogs", "woosox", "redsox"];
  return (
    <div className="flex flex-wrap items-center gap-1">
      {steps.map((s, i) => {
        const on = path[s] && path[s] !== "—";
        return (
          <div key={s} className="flex items-center gap-1">
            <span
              className={`inline-flex h-6 min-w-16 items-center justify-center rounded-sm px-1.5 font-mono text-[10px] font-semibold ${
                on
                  ? "bg-primary-500/10 text-primary-600"
                  : "border border-dashed border-gray-300 text-gray-400"
              }`}
              title={COPY.pipeline.columnLabels[s]}
            >
              {COPY.pipeline.stepShort[s]} {on ? path[s] : "—"}
            </span>
            {i < steps.length - 1 && <span className="text-gray-400">→</span>}
          </div>
        );
      })}
    </div>
  );
}

function NarrativeCard({ n }) {
  return (
    <article className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-2">
        <div className="font-serif text-lg font-semibold text-gray-800">{n.name}</div>
        <div className="text-[11px] uppercase tracking-wider text-gray-500">
          {n.pos} · {n.signed}
        </div>
      </header>
      <div className="mb-2">
        <PathDots path={n.path} />
      </div>
      <p className="mb-0 text-[13px] leading-snug text-gray-600">{n.line}</p>
    </article>
  );
}

export default function PipelinePage() {
  return (
    <>
      <header className="mb-5 border-b-2 border-gray-200 pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-500">
          {COPY.pipeline.kicker}
        </div>
        <h1 className="mt-1 text-4xl">{COPY.pipeline.title}</h1>
        <p className="mt-2 mb-0 text-gray-600">{COPY.pipeline.dek}</p>
      </header>

      <section className="mb-6 rounded border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
          {COPY.pipeline.funnelTitle}
        </div>
        <p className="mt-1 mb-3 text-[11px] leading-snug text-gray-500">
          {COPY.pipeline.funnelCaption}
        </p>
        <Funnel />
      </section>

      <section>
        <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-gray-500">
          {COPY.pipeline.narrativesTitle}
        </div>
        <p className="mt-0 mb-3 text-[11px] leading-snug text-gray-500">
          {COPY.pipeline.narrativesCaption}
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {NARRATIVES.map((n) => (
            <NarrativeCard key={n.name} n={n} />
          ))}
        </div>
      </section>

      <p className="mt-6 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
        {COPY.pipeline.footnote}
      </p>
    </>
  );
}
