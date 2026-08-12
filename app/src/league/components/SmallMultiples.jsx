import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { ACCENT, ACCENT_TEXT, GRID, INK_MUTED, fmtDate, fmtPts } from "../lib/viz.js";

const W = 170;
const H = 112;
const M = { l: 6, r: 6, t: 6, b: 14 };

// One mini panel per team, the league grayed behind it — every team's arc
// readable at once. Clicking a panel selects that team page-wide.
export default function SmallMultiples({ days, teams, series, order, selected, onSelect }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // {tid, i, cx, cy}

  const { x, y, paths, months } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const t of teams) {
      for (const v of series[t.id].totals) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
    }
    const pad = (hi - lo) * 0.06;
    lo -= pad;
    hi += pad;
    const x = (i) => M.l + (i / (days.length - 1)) * (W - M.l - M.r);
    const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
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
    return { x, y, paths, months };
  }, [days, teams, series]);

  const rankOn = (tid, i) =>
    1 + teams.filter((u) => series[u.id].totals[i] > series[tid].totals[i]).length;

  return (
    <div ref={wrapRef} className="relative">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {order.map((t) => {
          const role = selected.indexOf(t.id);
          return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`cursor-pointer rounded border bg-white p-1.5 text-left transition-colors ${
              role === 0 ? "border-primary-500" : role === 1 ? "border-link-600" : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <div className="flex items-baseline justify-between px-1">
              <span className={`text-xs font-semibold ${role === 0 ? "text-primary-600" : role === 1 ? "text-link-600" : "text-gray-800"}`}>
                {t.abbrev}
              </span>
              <span className="font-mono text-xs text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtPts(series[t.id].totals.at(-1))}
              </span>
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="block w-full"
              role="img"
              aria-label={`${t.name} roto points by day`}
              onPointerMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const i = Math.max(0, Math.min(days.length - 1,
                  Math.round((((e.clientX - rect.left) / rect.width) * W - M.l) / (W - M.l - M.r) * (days.length - 1))));
                const wrap = wrapRef.current.getBoundingClientRect();
                setHover({ tid: t.id, i, cx: e.clientX - wrap.left, cy: e.clientY - wrap.top });
              }}
              onPointerLeave={() => setHover(null)}
            >
              {months.map((m) => (
                <g key={m.i}>
                  <line x1={x(m.i)} x2={x(m.i)} y1={M.t} y2={H - M.b} stroke="#F2F2F2" strokeWidth="1" />
                  <text x={x(m.i)} y={H - 3} textAnchor="middle" fontSize="7.5" fill={INK_MUTED}>
                    {m.label}
                  </text>
                </g>
              ))}
              {teams.map(
                (u) => u.id !== t.id && <path key={u.id} d={paths[u.id]} fill="none" stroke="#E9E9E9" strokeWidth="1" />,
              )}
              <path d={paths[t.id]} fill="none" stroke={ACCENT} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
              {hover?.tid === t.id && (
                <g>
                  <line x1={x(hover.i)} x2={x(hover.i)} y1={M.t} y2={H - M.b} stroke={GRID} strokeWidth="1" />
                  <circle cx={x(hover.i)} cy={y(series[t.id].totals[hover.i])} r="3" fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
                </g>
              )}
            </svg>
          </button>
          );
        })}
      </div>

      {hover && wrapRef.current && (
        <Tip x={hover.cx} y={hover.cy} w={wrapRef.current.clientWidth} h={wrapRef.current.clientHeight} estH={64}>
          <div className="font-semibold text-gray-800">{fmtDate(days[hover.i])}</div>
          <div className="text-gray-600">
            <span className="font-mono font-semibold" style={{ color: ACCENT_TEXT }}>
              {fmtPts(series[hover.tid].totals[hover.i])}
            </span>{" "}
            pts · {rankOn(hover.tid, hover.i)} of {teams.length}
          </div>
        </Tip>
      )}
    </div>
  );
}
