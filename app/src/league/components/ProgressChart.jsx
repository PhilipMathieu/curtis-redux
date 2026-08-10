import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import {
  ACCENT, ACCENT_TEXT, DE_EMPH, GRID, INK_2, INK_MUTED, fmtDate, fmtPts,
} from "../lib/viz.js";

const W = 720;
const H = 380;
const M = { l: 36, r: 78, t: 14, b: 26 };
const PLOT_W = W - M.l - M.r;
const PLOT_H = H - M.t - M.b;

// Total roto points per day, one line per team. Emphasis form: the selected
// team wears the accent; everyone else is context gray, identified by
// de-collided end labels with hairline leaders.
export default function ProgressChart({ days, teams, series, selected, onSelect }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // {i, px, py}

  const { yMin, yMax, x, y, paths, months, labels } = useMemo(() => {
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
    const x = (i) => M.l + (i / Math.max(1, days.length - 1)) * PLOT_W;
    const y = (v) => M.t + (1 - (v - yMin) / (yMax - yMin)) * PLOT_H;

    const paths = {};
    for (const t of teams) {
      paths[t.id] = series[t.id].totals
        .map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
        .join("");
    }

    const months = [];
    for (let i = 1; i < days.length; i++) {
      if (days[i].slice(5, 7) !== days[i - 1].slice(5, 7)) {
        months.push({ i, label: fmtDate(days[i]).split(" ")[0] });
      }
    }

    // end labels: sort by final value, then walk down enforcing spacing
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

    return { yMin, yMax, x, y, paths, months, labels };
  }, [days, teams, series]);

  const yTicks = [];
  for (let v = yMin; v <= yMax; v += 10) yTicks.push(v);

  function locate(evt) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * W;
    const py = ((evt.clientY - rect.top) / rect.height) * H;
    const i = Math.max(
      0,
      Math.min(days.length - 1, Math.round(((px - M.l) / PLOT_W) * (days.length - 1))),
    );
    return { i, px, py, rect };
  }

  const standings = hover
    ? teams
        .map((t) => ({ ...t, v: series[t.id].totals[hover.i] }))
        .sort((a, b) => b.v - a.v)
    : [];

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full cursor-crosshair select-none"
        role="img"
        aria-label="Roto points by day for every team"
        onPointerMove={(e) => {
          const { i, px, py } = locate(e);
          setHover({ i, px, py });
        }}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const { i, py } = locate(e);
          let best = null;
          for (const t of teams) {
            const d = Math.abs(y(series[t.id].totals[i]) - py);
            if (!best || d < best.d) best = { id: t.id, d };
          }
          if (best) onSelect(best.id);
        }}
      >
        {/* grid + axes */}
        {yTicks.map((v) => (
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

        {/* context lines first, the emphasized one on top */}
        {teams.map(
          (t) =>
            t.id !== selected && (
              <path key={t.id} d={paths[t.id]} fill="none" stroke={DE_EMPH} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ),
        )}
        <path d={paths[selected]} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(days.length - 1)} cy={y(series[selected].totals.at(-1))} r="4.5" fill={ACCENT} stroke="#fff" strokeWidth="2" />

        {/* end labels with hairline leaders */}
        {labels.map((l) => (
          <g
            key={l.id}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(l.id);
            }}
          >
            <line x1={W - M.r + 2} x2={W - M.r + 8} y1={l.lineY} y2={l.y - 3.5} stroke={GRID} strokeWidth="1" />
            <text
              x={W - M.r + 10}
              y={l.y}
              fontSize="10"
              fontWeight={l.id === selected ? 600 : 400}
              fill={l.id === selected ? ACCENT_TEXT : INK_2}
            >
              {l.abbrev}
              <tspan dx="3" fill={l.id === selected ? ACCENT_TEXT : INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtPts(l.v)}
              </tspan>
            </text>
          </g>
        ))}

        {/* crosshair */}
        {hover && (
          <line x1={x(hover.i)} x2={x(hover.i)} y1={M.t} y2={H - M.b} stroke={INK_MUTED} strokeWidth="1" />
        )}
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
              <span
                className="inline-block h-[3px] w-3 rounded-full"
                style={{ background: t.id === selected ? ACCENT : DE_EMPH }}
              />
              <span className={t.id === selected ? "font-medium text-gray-800" : "text-gray-600"}>
                {t.abbrev}
              </span>
              <span className="ml-auto font-mono font-semibold text-gray-800">{fmtPts(t.v)}</span>
            </div>
          ))}
        </Tip>
      )}
    </div>
  );
}
