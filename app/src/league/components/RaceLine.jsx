import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { DE_EMPH, GRID, INK_2, INK_MUTED, fmtDate, fmtPts } from "../lib/viz.js";
import { COPY } from "../copy.js";

const W = 720;
const H = 400;
const M = { l: 36, r: 78, t: 24, b: 26 };
const PLOT_W = W - M.l - M.r;
const PLOT_H = H - M.t - M.b;

// The hero chart: daily roto totals with the leader and chaser in ink, the
// other six as gray context, and the season's three turning points annotated.
export default function RaceLine({ days, teams, series, leader, chaser, colors, takeoverIdx, delta30 }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null);

  const inked = { [leader.id]: colors.leader, [chaser.id]: colors.chaser };

  const { x, y, paths, months, labels, hurt } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const t of teams) {
      for (const v of series[t.id].totals) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const yMin = Math.floor(lo / 10) * 10;
    const yMax = Math.ceil(hi / 10) * 10;
    const x = (i) => M.l + (i / (days.length - 1)) * PLOT_W;
    const y = (v) => M.t + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H;
    const paths = {};
    for (const t of teams) {
      paths[t.id] = series[t.id].totals
        .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
        .join("");
    }
    const months = [];
    for (let i = 1; i < days.length; i++) {
      if (days[i].slice(8, 10) === "01") months.push({ i, label: fmtDate(days[i]).split(" ")[0] });
    }
    // right-edge labels, de-collided
    const GAP = 13;
    const sorted = teams
      .map((t) => ({ id: t.id, abbrev: t.abbrev, v: series[t.id].totals.at(-1) }))
      .sort((a, b) => b.v - a.v);
    let prev = -Infinity;
    const labels = sorted.map((s) => {
      const ly = Math.max(y(s.v), prev + GAP);
      prev = ly;
      return { ...s, lineY: y(s.v), y: ly };
    });
    const over = labels.at(-1).y - (H - M.b);
    if (over > 0) for (const l of labels) l.y -= over;

    // the early-season leader other than today's protagonists (HURT's April)
    const third = teams
      .filter((t) => t.id !== leader.id && t.id !== chaser.id)
      .map((t) => {
        const window = series[t.id].totals.slice(0, Math.min(45, days.length));
        const peak = window.indexOf(Math.max(...window));
        return { t, peak, v: window[peak] };
      })
      .sort((a, b) => b.v - a.v)[0];

    return { x, y, paths, months, labels, hurt: third };
  }, [days, teams, series, leader, chaser]);

  const tickVals = useMemo(() => {
    const vals = [];
    let lo = Infinity;
    let hi = -Infinity;
    for (const t of teams) {
      for (const v of series[t.id].totals) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    for (let v = Math.floor(lo / 10) * 10; v <= Math.ceil(hi / 10) * 10; v += 10) vals.push(v);
    return vals;
  }, [teams, series]);

  function locate(evt) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * W;
    const py = ((evt.clientY - rect.top) / rect.height) * H;
    const i = Math.max(0, Math.min(days.length - 1, Math.round(((px - M.l) / PLOT_W) * (days.length - 1))));
    return { i, px, py };
  }

  const standings = hover
    ? teams.map((t) => ({ ...t, v: series[t.id].totals[hover.i] })).sort((a, b) => b.v - a.v)
    : [];

  // annotations: the early leader labeled just above its peak (anchored
  // away from the near edge), the takeover as a top-margin milestone with
  // a hairline down to the line, the surge as a caption in the empty
  // bottom-right corner
  const ann = [];
  if (hurt) {
    const hx = x(hurt.peak);
    const left = hx < W / 3;
    ann.push({
      x: left ? hx + 8 : hx - 8,
      y: y(series[hurt.t.id].totals[hurt.peak]) - 12,
      text: COPY.race.annEarly(hurt.t.abbrev),
      anchor: left ? "start" : "end",
    });
  }
  ann.push({
    x: W - M.r - 6,
    y: H - M.b - 10,
    text: COPY.race.annSurge(chaser.abbrev, delta30),
    anchor: "end",
    color: colors.chaserText,
  });
  const milestone =
    takeoverIdx > 0
      ? {
          x: x(takeoverIdx),
          yTo: y(series[leader.id].totals[takeoverIdx]) - 8,
          text: COPY.race.annTakeover(leader.abbrev, fmtDate(days[takeoverIdx])),
        }
      : null;

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full cursor-crosshair select-none"
        role="img"
        aria-label="Roto points by day for every team, leader and chaser emphasized"
        onPointerMove={(e) => setHover(locate(e))}
        onPointerLeave={() => setHover(null)}
      >
        {tickVals.map((v) => (
          <g key={v}>
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke={GRID} strokeWidth="1" />
            <text x={M.l - 6} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
          </g>
        ))}
        {months.map((m) => (
          <text key={m.i} x={x(m.i)} y={H - M.b + 16} textAnchor="middle" fontSize="10" fill={INK_MUTED}>
            {m.label}
          </text>
        ))}

        {teams.map(
          (t) =>
            !inked[t.id] && (
              <path key={t.id} d={paths[t.id]} fill="none" stroke={DE_EMPH} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
            ),
        )}
        <path d={paths[leader.id]} fill="none" stroke={colors.leader} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <path d={paths[chaser.id]} fill="none" stroke={colors.chaser} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {[leader, chaser].map((t) => (
          <circle key={t.id} cx={x(days.length - 1)} cy={y(series[t.id].totals.at(-1))} r="4.5" fill={inked[t.id]} stroke="#fff" strokeWidth="2" />
        ))}

        {milestone && (
          <g>
            <line x1={milestone.x} x2={milestone.x} y1={M.t - 4} y2={milestone.yTo} stroke="#C9C9C9" strokeWidth="1" />
            <text x={milestone.x + 5} y={14} fontSize="11" fill={INK_2} className="font-serif italic">
              {milestone.text}
            </text>
          </g>
        )}
        {ann.map((a) => (
          <text key={a.text} x={a.x} y={a.y} textAnchor={a.anchor} fontSize="11" fill={a.color ?? INK_2} className="font-serif italic">
            {a.text}
          </text>
        ))}

        {labels.map((l) => (
          <g key={l.id}>
            <line x1={W - M.r + 2} x2={W - M.r + 8} y1={l.lineY} y2={l.y - 3.5} stroke={GRID} strokeWidth="1" />
            <text
              x={W - M.r + 10}
              y={l.y}
              fontSize="10"
              fontWeight={inked[l.id] ? 600 : 400}
              fill={inked[l.id] ? (l.id === chaser.id ? colors.chaserText : colors.leaderText) : INK_2}
            >
              {l.abbrev}
              <tspan dx="3" fill={inked[l.id] ? undefined : INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtPts(l.v)}
              </tspan>
            </text>
          </g>
        ))}

        {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={M.t} y2={H - M.b} stroke={INK_MUTED} strokeWidth="1" />}
      </svg>

      {hover && wrapRef.current && (
        <Tip
          x={(hover.px / W) * wrapRef.current.clientWidth}
          y={(hover.py / H) * wrapRef.current.clientHeight}
          w={wrapRef.current.clientWidth}
          h={wrapRef.current.clientHeight}
          estH={30 + teams.length * 20}
        >
          <div className="mb-1 font-semibold text-gray-800">{fmtDate(days[hover.i])}</div>
          {standings.map((t) => (
            <div key={t.id} className="flex items-center gap-1.5 leading-5">
              <span className="inline-block h-[3px] w-3 rounded-full" style={{ background: inked[t.id] ?? DE_EMPH }} />
              <span className={inked[t.id] ? "font-medium text-gray-800" : "text-gray-600"}>{t.abbrev}</span>
              <span className="ml-auto font-mono font-semibold text-gray-800">{fmtPts(t.v)}</span>
            </div>
          ))}
        </Tip>
      )}
    </div>
  );
}
