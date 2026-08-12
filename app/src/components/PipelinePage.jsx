import { useState } from "react";
import { COPY } from "../copy.js";

// Every player on the 2026 Red Sox roster the site tells a story about,
// unified into one shape: source lane, stops that go through the
// Portland/Worcester pipeline (if any), and a compact career timeline of
// year → level/team stops.
//
// Timeline `kind` drives the marker color on the card:
//   draft  — draft pick or intl signing (dashed)
//   milb   — a minor-league stop (rookie/A/A+/AA/AAA)
//   npb    — Japanese/foreign pro
//   mlbOther — MLB with another org
//   mlbBos — MLB Boston
//   event  — a transaction (trade / FA sign / Rule 5)
const PLAYERS = [
  {
    name: "Roman Anthony",
    pos: "OF",
    lane: "pipeline",
    stops: ["seadogs", "woosox", "redsox"],
    from: "2022 draft, 2nd rd",
    line: "84 games in Portland (.269/.367/.489) at 20, then Worcester by summer, Boston by the next season.",
    timeline: [
      { year: "2022", label: "Drafted by BOS (2nd rd)", kind: "draft" },
      { year: "2023", label: "A+ Greenville", kind: "milb" },
      { year: "2024", label: "AA Portland → AAA Worcester", kind: "milb" },
      { year: "2025", label: "MLB debut, Boston", kind: "mlbBos" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Marcelo Mayer",
    pos: "SS / 3B",
    lane: "pipeline",
    stops: ["seadogs", "woosox", "redsox"],
    from: "2021 draft, 1st rd",
    line: "Doubled in his first Sea Dogs at-bat of '24, hit .307 through 77 AA games, up in Boston the same season.",
    timeline: [
      { year: "2021", label: "Drafted by BOS (1st rd, #4)", kind: "draft" },
      { year: "2022", label: "A / A+", kind: "milb" },
      { year: "2023", label: "AA Portland", kind: "milb" },
      { year: "2024", label: "AA Portland → AAA Worcester", kind: "milb" },
      { year: "2025", label: "MLB debut, Boston", kind: "mlbBos" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Kristian Campbell",
    pos: "2B / OF",
    lane: "pipeline",
    stops: ["seadogs", "woosox", "redsox"],
    from: "2023 draft, 4th rd",
    line: "Cleared all three affiliates inside a calendar year — the rocket the funnel is drawn to make you appreciate.",
    timeline: [
      { year: "2023", label: "Drafted by BOS (4th rd)", kind: "draft" },
      { year: "2024", label: "A+ → AA → AAA", kind: "milb" },
      { year: "2025", label: "MLB debut, Boston", kind: "mlbBos" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Ceddanne Rafaela",
    pos: "OF / SS",
    lane: "pipeline",
    stops: ["seadogs", "woosox", "redsox"],
    from: "2017 int'l signing",
    line: "AA All-Star in '22, .302/.349/.520 between Portland and Worcester in '23, in Boston that August at three positions.",
    timeline: [
      { year: "2017", label: "Signed intl (Curaçao)", kind: "draft" },
      { year: "2019", label: "DSL / GCL", kind: "milb" },
      { year: "2021", label: "A Salem", kind: "milb" },
      { year: "2022", label: "A+ / AA Portland", kind: "milb" },
      { year: "2023", label: "AAA Worcester → MLB Boston", kind: "mlbBos" },
      { year: "2024–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Wilyer Abreu",
    pos: "OF",
    lane: "trade",
    stops: ["seadogs", "woosox", "redsox"],
    from: "trade from HOU, 2022",
    line: "40 Sea Dogs games after the trade, IL All-Star bat in Worcester, called up Aug 22 '23 and hit .316 the rest of the way.",
    timeline: [
      { year: "2015", label: "Signed intl by HOU", kind: "draft" },
      { year: "2017–21", label: "HOU minor leagues", kind: "milb" },
      { year: "2022", label: "HOU AA → traded to BOS AA Portland", kind: "event" },
      { year: "2023", label: "AAA Worcester → MLB Boston (Aug 22)", kind: "mlbBos" },
      { year: "2024–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Jarren Duran",
    pos: "OF",
    lane: "pipeline",
    stops: ["seadogs", "woosox", "redsox"],
    from: "2018 draft, 7th rd",
    line: "Prototype for this decade of the pipeline — Portland late '19, Worcester's first summer, Boston that July.",
    timeline: [
      { year: "2018", label: "Drafted by BOS (7th rd)", kind: "draft" },
      { year: "2019", label: "A+ / AA Portland", kind: "milb" },
      { year: "2021", label: "AAA Worcester → MLB Boston (July)", kind: "mlbBos" },
      { year: "2022–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Brayan Bello",
    pos: "RHP",
    lane: "pipeline",
    stops: ["seadogs", "woosox", "redsox"],
    from: "2017 int'l signing",
    line: "Punched out 116 Sea Dogs hitters in 90 innings, moved to Worcester on his 23rd-birthday week, starting at Fenway inside two months.",
    timeline: [
      { year: "2017", label: "Signed intl (DR)", kind: "draft" },
      { year: "2018–20", label: "DSL / A", kind: "milb" },
      { year: "2021", label: "AA Portland", kind: "milb" },
      { year: "2022", label: "AAA Worcester → MLB Boston", kind: "mlbBos" },
      { year: "2023–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Connor Wong",
    pos: "C",
    lane: "trade",
    stops: ["woosox", "redsox"],
    from: "trade from LAD, 2020 (Mookie Betts deal)",
    line: "The Betts trade's quiet keeper — skipped Portland, caught two full Worcester seasons, has been Boston's depth catcher since '22.",
    timeline: [
      { year: "2017", label: "Drafted by LAD (3rd rd)", kind: "draft" },
      { year: "2018–19", label: "LAD system", kind: "milb" },
      { year: "2020", label: "Traded to BOS in Mookie Betts deal", kind: "event" },
      { year: "2021–22", label: "AAA Worcester → MLB debut", kind: "mlbBos" },
      { year: "2023–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  // ── Outside the org ─────────────────────────────────────────────────
  {
    name: "Garrett Crochet",
    pos: "LHP",
    lane: "trade",
    stops: ["redsox"],
    from: "trade from CHW, Dec 2024",
    line: "For Teel, Montgomery, Meidroth and Wikelman Gonzalez — the ace this rotation was built around.",
    timeline: [
      { year: "2020", label: "Drafted by CHW (1st rd, #11)", kind: "draft" },
      { year: "2020–24", label: "MLB Chicago (AL)", kind: "mlbOther" },
      { year: "2024 Dec", label: "Traded to BOS", kind: "event" },
      { year: "2025–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Sonny Gray",
    pos: "RHP",
    lane: "trade",
    stops: ["redsox"],
    from: "trade from STL, Nov 2025",
    line: "For Richard Fitts and Brandon Clarke. Three-time All-Star, Cy Young runner-up in '23.",
    timeline: [
      { year: "2011", label: "Drafted by OAK (1st rd)", kind: "draft" },
      { year: "2013–17", label: "MLB Oakland", kind: "mlbOther" },
      { year: "2017–19", label: "MLB New York (AL)", kind: "mlbOther" },
      { year: "2019–22", label: "MLB Cincinnati", kind: "mlbOther" },
      { year: "2023", label: "MLB Minnesota — AL Cy Young runner-up", kind: "mlbOther" },
      { year: "2024–25", label: "MLB St. Louis", kind: "mlbOther" },
      { year: "2025 Nov", label: "Traded to BOS", kind: "event" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Willson Contreras",
    pos: "1B / DH",
    lane: "trade",
    stops: ["redsox"],
    from: "trade from STL, winter 2025–26",
    line: "Cardinals-to-Boston in a separate deal (Hunter Dobbins the other way) — a legit veteran bat for the middle of the order.",
    timeline: [
      { year: "2009", label: "Signed intl by CHC", kind: "draft" },
      { year: "2016–22", label: "MLB Chicago (NL)", kind: "mlbOther" },
      { year: "2023–25", label: "MLB St. Louis", kind: "mlbOther" },
      { year: "winter '25–26", label: "Traded to BOS", kind: "event" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Johan Oviedo",
    pos: "RHP",
    lane: "trade",
    stops: ["redsox"],
    from: "trade winter 2025–26",
    line: "One of the three rotation moves alongside Gray and Suárez — back-end depth after Tommy John recovery.",
    timeline: [
      { year: "2016", label: "Signed intl by STL", kind: "draft" },
      { year: "2020–22", label: "MLB St. Louis", kind: "mlbOther" },
      { year: "2023", label: "MLB Pittsburgh", kind: "mlbOther" },
      { year: "2024–25", label: "Tommy John rehab", kind: "milb" },
      { year: "winter '25–26", label: "Acquired by BOS", kind: "event" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Ranger Suárez",
    pos: "LHP",
    lane: "fa",
    stops: ["redsox"],
    from: "5 yr / $130M — Jan 2026",
    line: "Eight years in Philadelphia, then Boston's biggest FA pitching splash of the winter. 12–8, 3.20 ERA the year before.",
    timeline: [
      { year: "2012", label: "Signed intl by PHI", kind: "draft" },
      { year: "2018–25", label: "MLB Philadelphia", kind: "mlbOther" },
      { year: "2026 Jan", label: "Signed 5y/$130M with BOS", kind: "event" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Trevor Story",
    pos: "SS",
    lane: "fa",
    stops: ["redsox"],
    from: "6 yr / $140M — Mar 2022",
    line: "The Chaim Bloom-era gamble that finally started paying full dividends in '26 — still on the left side of the infield.",
    timeline: [
      { year: "2011", label: "Drafted by COL (1st rd)", kind: "draft" },
      { year: "2016–21", label: "MLB Colorado", kind: "mlbOther" },
      { year: "2022 Mar", label: "Signed 6y/$140M with BOS", kind: "event" },
      { year: "2022–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Aroldis Chapman",
    pos: "LHP",
    lane: "fa",
    stops: ["redsox"],
    from: "1 yr / $10.75M — Dec 2024, extended '25",
    line: "Signed cheap as a bounce-back, ran a 1.02 ERA and 27 saves in his first season, re-upped through '26.",
    timeline: [
      { year: "2009", label: "Defected from Cuba", kind: "event" },
      { year: "2010", label: "Signed by CIN", kind: "draft" },
      { year: "2010–16", label: "MLB Cincinnati / New York (AL)", kind: "mlbOther" },
      { year: "2017–22", label: "MLB NYY / Chicago (NL)", kind: "mlbOther" },
      { year: "2023–24", label: "MLB KC / TEX / PIT", kind: "mlbOther" },
      { year: "2024 Dec", label: "Signed 1y with BOS", kind: "event" },
      { year: "2025", label: "1.02 ERA, extended in-season", kind: "mlbBos" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Isiah Kiner-Falefa",
    pos: "IF / OF",
    lane: "fa",
    stops: ["redsox"],
    from: "1 yr / $6M — Feb 2026",
    line: "Late-winter depth signing: SS, 3B, 2B and OF all in the same week if the day calls for it.",
    timeline: [
      { year: "2013", label: "Drafted by TEX", kind: "draft" },
      { year: "2018–21", label: "MLB Texas", kind: "mlbOther" },
      { year: "2022–23", label: "MLB New York (AL)", kind: "mlbOther" },
      { year: "2024", label: "MLB Toronto → Pittsburgh", kind: "mlbOther" },
      { year: "2025", label: "MLB Pittsburgh", kind: "mlbOther" },
      { year: "2026 Feb", label: "Signed 1y/$6M with BOS", kind: "event" },
      { year: "2026", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Masataka Yoshida",
    pos: "OF / DH",
    lane: "intl",
    stops: ["redsox"],
    from: "posted from NPB — Dec 2022",
    line: "5 yr / $90M straight out of the Orix Buffaloes — the org's first big move into the Japanese posting market since Daisuke.",
    timeline: [
      { year: "2015", label: "NPB draft, Orix Buffaloes (1st rd)", kind: "draft" },
      { year: "2016–22", label: "NPB Orix", kind: "npb" },
      { year: "2022 Dec", label: "Posted, signed 5y/$90M with BOS", kind: "event" },
      { year: "2023–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
  {
    name: "Justin Slaten",
    pos: "RHP",
    lane: "rule5",
    stops: ["redsox"],
    from: "Rule 5 via NYM, Dec 2023",
    line: "Selected by New York out of TEX, then flipped to Boston for Ryan Ammons and cash. 2.93 rookie ERA — the second coming of the Whitlock trick.",
    timeline: [
      { year: "2019", label: "Drafted by TEX (3rd rd)", kind: "draft" },
      { year: "2019–23", label: "TEX system → AA / AAA in '23", kind: "milb" },
      { year: "2023 Dec", label: "Rule 5 by NYM → traded to BOS", kind: "event" },
      { year: "2024–26", label: "MLB Boston", kind: "mlbBos" },
    ],
  },
];

// Source lanes are still meaningful — they colour the strands and label
// each player's card — but the Sankey now stacks Worcester alongside the
// four outside lanes as direct predecessors of Boston. Sea Dogs sits in
// its own left column feeding into the Worcester band.
const LANES = [
  { key: "pipeline", label: "Draft / int'l signing (BOS)" },
  { key: "trade", label: "Trade" },
  { key: "fa", label: "Free agent" },
  { key: "intl", label: "Int'l posting" },
  { key: "rule5", label: "Rule 5" },
];

// A player's "immediate predecessor to Boston" — the band they occupy in
// the middle column. Anyone who touched Worcester is Worcester (Abreu and
// Wong included); everyone else is the lane they entered the org through.
function predecessor(p) {
  if (p.stops.includes("woosox")) return "worcester";
  return p.lane;
}

// The middle column, top → bottom.
const MID_BANDS = [
  { key: "worcester", label: "Worcester Red Sox", subtitle: "TRIPLE-A", fill: "#CE112D" },
  { key: "trade", label: "Trade", subtitle: "MLB elsewhere", fill: "#1580B0" },
  { key: "fa", label: "Free agent", subtitle: "signed off the market", fill: "#B8860B" },
  { key: "intl", label: "Int'l posting", subtitle: "NPB / KBO", fill: "#7A5197" },
  { key: "rule5", label: "Rule 5", subtitle: "another org's system", fill: "#157A4A" },
];

// Layout constants. Three columns:
//   COL 1 — Sea Dogs (feeder into Worcester, only for AA-Portland alumni)
//   COL 2 — the stacked "direct predecessor" bands
//   COL 3 — Boston Red Sox terminus
const W = 820;
const PAD_X = 20;
const SEA_W = 110;
const MID_W = 170;
const BOS_W = 150;
const X_SEA = PAD_X;
const X_MID = W - PAD_X - BOS_W - 80 - MID_W;
const X_BOS = W - PAD_X - BOS_W;

const ROW_H = 22;
const BAND_GAP = 14;
const TOP_PAD = 44;

// Assign each player a "predecessor" band and an in-band slot index.
const playersByBand = Object.fromEntries(
  MID_BANDS.map((b) => [b.key, PLAYERS.filter((p) => predecessor(p) === b.key)]),
);

const layout = {};
{
  let y = TOP_PAD;
  const bandBounds = {};
  for (const band of MID_BANDS) {
    const list = playersByBand[band.key];
    const startY = y;
    list.forEach((p, i) => {
      layout[p.name] = { midY: startY + i * ROW_H + ROW_H / 2 };
    });
    const endY = startY + list.length * ROW_H;
    bandBounds[band.key] = { top: startY - 8, bot: endY + 8 };
    y = endY + BAND_GAP;
  }
  layout._bands = bandBounds;
}

const H = (() => {
  const last = MID_BANDS[MID_BANDS.length - 1];
  return layout._bands[last.key].bot + 28;
})();

// Boston column is centered vertically. Slot order follows the middle-
// column stack so strands mostly run flat and don't cross needlessly.
const bosOrder = MID_BANDS.flatMap((b) => playersByBand[b.key]);
const bosH = bosOrder.length * ROW_H;
const midStackTop = layout._bands[MID_BANDS[0].key].top + 8;
const midStackBot = layout._bands[MID_BANDS[MID_BANDS.length - 1].key].bot - 8;
const bosTop = (midStackTop + midStackBot) / 2 - bosH / 2;
bosOrder.forEach((p, i) => {
  layout[p.name].bosY = bosTop + i * ROW_H + ROW_H / 2;
});

// Sea Dogs feeder box: only pipeline+Abreu players (whose stops include
// "seadogs") appear here. They align vertically with their Worcester slot
// so the SEA → WOO segment reads as a flat line.
const seaPlayers = PLAYERS.filter((p) => p.stops.includes("seadogs"));
seaPlayers.forEach((p) => {
  layout[p.name].seaY = layout[p.name].midY;
});
const seaBox = (() => {
  if (!seaPlayers.length) return null;
  const ys = seaPlayers.map((p) => layout[p.name].seaY);
  return { top: Math.min(...ys) - ROW_H / 2 - 4, bot: Math.max(...ys) + ROW_H / 2 + 4 };
})();

// One path per player: (Sea Dogs?) → middle band → Boston. If the player
// entered at the middle column, the strand starts at the band's left edge
// with a small tick so it visually roots inside the band.
function strandPath(p) {
  const l = layout[p.name];
  const yMid = l.midY;
  const yBos = l.bosY;
  const points = [];
  if (l.seaY != null) {
    points.push({ x: X_SEA + SEA_W, y: l.seaY });
    points.push({ x: X_MID, y: yMid });
  } else {
    points.push({ x: X_MID + 4, y: yMid });
  }
  points.push({ x: X_MID + MID_W, y: yMid });
  points.push({ x: X_BOS, y: yBos });
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.y === b.y) {
      d += ` L ${b.x} ${b.y}`;
    } else {
      const mx = (a.x + b.x) / 2;
      d += ` C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
    }
  }
  return d;
}

const LANE_FILL = {
  pipeline: "#CE112D",
  trade: "#1580B0",
  fa: "#B8860B",
  intl: "#7A5197",
  rule5: "#157A4A",
};

// Kind → dot color for timeline entries.
const KIND_COLOR = {
  draft: "#CCCCCC",
  milb: "#B8860B",
  npb: "#7A5197",
  mlbOther: "#666666",
  mlbBos: "#CE112D",
  event: "#1580B0",
};

function Sankey({ hovered, setHovered }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Sankey: Sea Dogs feeds Worcester, and Worcester stacks with Trade, Free agent, Int'l posting and Rule 5 as direct predecessors of Boston."
    >
      {/* Column headers */}
      <text x={X_SEA + SEA_W / 2} y={20} textAnchor="middle" className="fill-gray-800" style={{ fontSize: 12, fontWeight: 700 }}>
        Portland Sea Dogs
      </text>
      <text x={X_SEA + SEA_W / 2} y={34} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10, letterSpacing: 1.4 }}>
        AA · FEEDS WORCESTER
      </text>
      <text x={X_MID + MID_W / 2} y={20} textAnchor="middle" className="fill-gray-800" style={{ fontSize: 12, fontWeight: 700 }}>
        Direct predecessor
      </text>
      <text x={X_MID + MID_W / 2} y={34} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10, letterSpacing: 1.4 }}>
        LAST STOP BEFORE BOSTON
      </text>
      <text x={X_BOS + BOS_W / 2} y={20} textAnchor="middle" className="fill-gray-800" style={{ fontSize: 12, fontWeight: 700 }}>
        Boston Red Sox
      </text>
      <text x={X_BOS + BOS_W / 2} y={34} textAnchor="middle" className="fill-gray-500" style={{ fontSize: 10, letterSpacing: 1.4 }}>
        2026 ACTIVE ROSTER
      </text>

      {/* Sea Dogs feeder box (left column). Only pipeline + Abreu appear
          here; the strand's SEA → WOO segment stays flat because they use
          the same y coord in both columns. */}
      {seaBox && (
        <g>
          <rect
            x={X_SEA}
            y={seaBox.top}
            width={SEA_W}
            height={seaBox.bot - seaBox.top}
            fill="#CE112D"
            opacity="0.18"
            rx="4"
          />
          <text x={X_SEA + 10} y={seaBox.top + 14} className="fill-gray-800" style={{ fontSize: 11, fontWeight: 700 }}>
            Sea Dogs
          </text>
          <text x={X_SEA + 10} y={seaBox.top + 26} className="fill-gray-500" style={{ fontSize: 9, letterSpacing: 1.2 }}>
            AA PORTLAND
          </text>
          <text
            x={X_SEA + SEA_W - 10}
            y={seaBox.top + 14}
            textAnchor="end"
            className="fill-gray-600"
            style={{ fontSize: 11, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}
          >
            {seaPlayers.length}
          </text>
        </g>
      )}

      {/* Stacked middle-column bands: Worcester + the four outside lanes. */}
      {MID_BANDS.map((band) => {
        const b = layout._bands[band.key];
        const count = playersByBand[band.key].length;
        return (
          <g key={band.key}>
            <rect
              x={X_MID}
              y={b.top}
              width={MID_W}
              height={b.bot - b.top}
              fill={band.fill}
              opacity="0.18"
              rx="4"
            />
            <text x={X_MID + 10} y={b.top + 14} className="fill-gray-800" style={{ fontSize: 11, fontWeight: 700 }}>
              {band.label}
            </text>
            {band.subtitle && (
              <text x={X_MID + 10} y={b.top + 26} className="fill-gray-500" style={{ fontSize: 9, letterSpacing: 1.2 }}>
                {band.subtitle}
              </text>
            )}
            <text
              x={X_MID + MID_W - 10}
              y={b.top + 14}
              textAnchor="end"
              className="fill-gray-600"
              style={{ fontSize: 11, fontWeight: 700, fontFamily: "ui-monospace, monospace" }}
            >
              {count}
            </text>
          </g>
        );
      })}

      {/* Boston terminus pill */}
      <rect x={X_BOS} y={bosTop - 8} width={BOS_W} height={bosH + 16} fill="#CE112D" opacity="0.24" rx="4" />
      <text x={X_BOS + 10} y={bosTop + 4} className="fill-gray-500" style={{ fontSize: 9, letterSpacing: 1.2 }}>
        {PLAYERS.length} STRANDS IN
      </text>

      {/* Background strands (thin, colored by source lane) */}
      {PLAYERS.map((p) => (
        <path
          key={`bg-${p.name}`}
          d={strandPath(p)}
          fill="none"
          stroke={LANE_FILL[p.lane]}
          strokeOpacity={hovered && hovered !== p.name ? 0.12 : 0.55}
          strokeWidth={2}
        />
      ))}

      {/* Hovered strand highlighted */}
      {hovered &&
        (() => {
          const p = PLAYERS.find((x) => x.name === hovered);
          return (
            <path
              d={strandPath(p)}
              fill="none"
              stroke={LANE_FILL[p.lane]}
              strokeOpacity={1}
              strokeWidth={4}
            />
          );
        })()}

      {/* Hit targets — one wide invisible path per strand for reliable hover.
          Rendered last so they sit above the visible strands. Explicit
          pointer-events="stroke" is required because a transparent stroke
          would otherwise be ignored by the default visiblePainted rule. */}
      {PLAYERS.map((p) => (
        <path
          key={`hit-${p.name}`}
          d={strandPath(p)}
          fill="none"
          stroke="rgba(0,0,0,0)"
          strokeWidth={ROW_H - 2}
          pointerEvents="stroke"
          onMouseEnter={() => setHovered(p.name)}
          onFocus={() => setHovered(p.name)}
          tabIndex={0}
          aria-label={p.name}
          style={{ cursor: "pointer", outline: "none" }}
        />
      ))}

      {/* Small player-name chip at the Boston end of each strand, so the
          diagram reads even without hovering. */}
      {PLAYERS.map((p) => {
        const yB = layout[p.name].bosY;
        const on = hovered === p.name;
        return (
          <text
            key={`lbl-${p.name}`}
            x={X_BOS + 8}
            y={yB + 3.5}
            className={on ? "fill-gray-800" : "fill-gray-600"}
            style={{ fontSize: 10, fontWeight: on ? 700 : 500, pointerEvents: "none" }}
          >
            {p.name}
          </text>
        );
      })}
    </svg>
  );
}

function TimelineRow({ e }) {
  return (
    <li className="flex items-baseline gap-3 py-0.5">
      <span
        className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full"
        style={{ background: KIND_COLOR[e.kind] || "#CCCCCC" }}
        aria-hidden="true"
      />
      <span className="w-24 shrink-0 font-mono text-[11px] text-gray-500">{e.year}</span>
      <span className="text-[13px] leading-snug text-gray-700">{e.label}</span>
    </li>
  );
}

function DetailCard({ p }) {
  if (!p) {
    return (
      <div className="flex h-full min-h-40 items-center justify-center rounded border border-dashed border-gray-300 bg-white p-4 text-center text-[12px] text-gray-500">
        Hover a strand to see one player's route and career timeline.
      </div>
    );
  }
  return (
    <article className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <header className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <div className="font-serif text-lg font-semibold text-gray-800">{p.name}</div>
          <div className="text-[11px] uppercase tracking-wider text-gray-500">
            {p.pos} · {p.from}
          </div>
        </div>
        <span
          className="rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-white"
          style={{ background: LANE_FILL[p.lane] }}
        >
          {LANES.find((l) => l.key === p.lane).label}
        </span>
      </header>
      <p className="mb-3 text-[13px] leading-snug text-gray-600">{p.line}</p>
      <ol className="m-0 list-none border-t border-gray-100 pt-2 pl-0">
        {p.timeline.map((e, i) => (
          <TimelineRow key={i} e={e} />
        ))}
      </ol>
    </article>
  );
}

// Compact aggregate funnel — the illustrative cohort ("100 → 45 → 18 → 7")
// that sets the scene before the strand Sankey pulls in individual paths.
function CohortStrip() {
  const cells = [
    { label: "Sea Dogs", sub: "AA cohort", value: 100 },
    { label: "Worcester", sub: "AAA cohort", value: 45 },
    { label: "Boston debut", sub: "MLB call-up", value: 18 },
    { label: "Sticks in Boston", sub: "regular role", value: 7 },
  ];
  const max = cells[0].value;
  return (
    <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-gray-500">
        A typical cohort, three years out
      </div>
      <p className="mt-0 mb-2 text-[11px] leading-snug text-gray-500">
        {COPY.pipeline.funnelCaption}
      </p>
      <div className="flex items-end gap-1">
        {cells.map((c, i) => (
          <div key={c.label} className="flex flex-1 flex-col items-center">
            <div
              className="w-full rounded-sm bg-primary-500"
              style={{ height: `${(c.value / max) * 68}px`, opacity: 0.9 - i * 0.1 }}
              title={`${c.value} of every 100`}
            />
            <div className="mt-1 font-mono text-[12px] font-semibold text-gray-800">{c.value}</div>
            <div className="text-center text-[10px] font-medium uppercase tracking-wider text-gray-500">
              {c.label}
            </div>
            <div className="text-center text-[9px] text-gray-500">{c.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [hovered, setHovered] = useState(null);
  const hoveredPlayer = hovered ? PLAYERS.find((p) => p.name === hovered) : null;
  return (
    <>
      <header className="mb-5 border-b-2 border-gray-200 pb-4">
        <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-500">
          {COPY.pipeline.kicker}
        </div>
        <h1 className="mt-1 text-4xl">{COPY.pipeline.title}</h1>
        <p className="mt-2 mb-0 text-gray-600">{COPY.pipeline.dek}</p>
      </header>

      <div className="mb-5">
        <CohortStrip />
      </div>

      <section
        className="rounded border border-gray-200 bg-white p-4 shadow-sm"
        onMouseLeave={() => setHovered(null)}
      >
        <div className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
          Every current Red Sox contributor — one strand each
        </div>
        <p className="mt-1 mb-3 text-[11px] leading-snug text-gray-500">
          Five source lanes converge on the 2026 active roster: the Portland–Worcester pipeline plus every
          way a player arrives from outside the org. Hover a strand to see who it is and how they got here.
        </p>
        <Sankey hovered={hovered} setHovered={setHovered} />
      </section>

      <div className="mt-4">
        <DetailCard p={hoveredPlayer} />
      </div>

      <p className="mt-6 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
        {COPY.pipeline.footnote}
      </p>
    </>
  );
}
