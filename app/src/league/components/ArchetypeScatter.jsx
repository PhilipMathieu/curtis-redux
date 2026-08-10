import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { GRID, INK_2, INK_MUTED, emphasisOf, fmtPts } from "../lib/viz.js";
import { COPY } from "../copy.js";

const W = 440;
const H = 380;
const M = { l: 40, r: 16, t: 12, b: 36 };

// Batting points vs pitching points — where a team's points come from at a
// glance. The diagonal is perfect balance.
export default function ArchetypeScatter({ teams, split, selected, onSelect }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // team id

  const { x, y, lo, hi, labelSide } = useMemo(() => {
    const all = teams.flatMap((t) => [split[t.id].bat, split[t.id].pit]);
    const lo = Math.max(0, Math.floor((Math.min(...all) - 3) / 5) * 5);
    const hi = Math.ceil((Math.max(...all) + 3) / 5) * 5;
    const x = (v) => M.l + ((v - lo) / (hi - lo)) * (W - M.l - M.r);
    const y = (v) => M.t + (1 - (v - lo) / (hi - lo)) * (H - M.t - M.b);
    // default label right of the dot; flip left when a neighbor crowds it
    const labelSide = {};
    for (const t of teams) {
      labelSide[t.id] = 1;
      for (const u of teams) {
        if (u.id === t.id) continue;
        const dx = x(split[u.id].bat) - x(split[t.id].bat);
        const dy = Math.abs(y(split[u.id].pit) - y(split[t.id].pit));
        if (dx > 0 && dx < 56 && dy < 14) labelSide[t.id] = -1;
      }
    }
    return { x, y, lo, hi, labelSide };
  }, [teams, split]);

  const ticks = [];
  for (let v = lo; v <= hi; v += 10) ticks.push(v);

  return (
    <div ref={wrapRef} className="relative mx-auto max-w-md">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" role="img" aria-label="Batting points versus pitching points by team">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={M.t} y2={H - M.b} stroke="#F2F2F2" strokeWidth="1" />
            <line x1={M.l} x2={W - M.r} y1={y(v)} y2={y(v)} stroke="#F2F2F2" strokeWidth="1" />
            <text x={x(v)} y={H - M.b + 14} textAnchor="middle" fontSize="9" fill={INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
            <text x={M.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill={INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {v}
            </text>
          </g>
        ))}
        <line x1={x(lo)} y1={y(lo)} x2={x(hi)} y2={y(hi)} stroke={GRID} strokeWidth="1" />
        <text x={W - M.r - 4} y={y(hi - (hi - lo) * 0.02) + 10} textAnchor="end" fontSize="8.5" fill="#AAAAAA">
          {COPY.scatter.diagonal}
        </text>
        <text x={(M.l + W - M.r) / 2} y={H - 4} textAnchor="middle" fontSize="10" fill={INK_2}>
          {COPY.split.batting}
        </text>
        <text x={12} y={(M.t + H - M.b) / 2} textAnchor="middle" fontSize="10" fill={INK_2} transform={`rotate(-90 12 ${(M.t + H - M.b) / 2})`}>
          {COPY.split.pitching}
        </text>

        {teams.map((t) => {
          const cx = x(split[t.id].bat);
          const cy = y(split[t.id].pit);
          const emp = emphasisOf(selected, t.id);
          return (
            <g
              key={t.id}
              className="cursor-pointer"
              onClick={() => onSelect(t.id)}
              onPointerEnter={() => setHover(t.id)}
              onPointerLeave={() => setHover(null)}
            >
              <circle cx={cx} cy={cy} r="14" fill="transparent" />
              <circle cx={cx} cy={cy} r={emp ? 7 : 5.5} fill={emp ? emp.mark : "#8A8A8A"} stroke="#fff" strokeWidth="2" />
              <text
                x={cx + labelSide[t.id] * 10}
                y={cy + 3.5}
                textAnchor={labelSide[t.id] > 0 ? "start" : "end"}
                fontSize="10"
                fontWeight={emp ? 600 : 400}
                fill={emp ? emp.text : INK_2}
              >
                {t.abbrev}
              </text>
            </g>
          );
        })}
      </svg>

      {hover != null && wrapRef.current && (
        <Tip
          x={(x(split[hover].bat) / W) * wrapRef.current.clientWidth}
          y={(y(split[hover].pit) / H) * wrapRef.current.clientHeight}
          w={wrapRef.current.clientWidth}
          h={wrapRef.current.clientHeight}
          estH={64}
        >
          <div className="font-semibold text-gray-800">{teams.find((t) => t.id === hover)?.name}</div>
          <div className="text-gray-600">
            {COPY.split.batting.toLowerCase()} <span className="font-mono font-semibold text-gray-800">{fmtPts(split[hover].bat)}</span>
            {" · "}
            {COPY.split.pitching.toLowerCase()} <span className="font-mono font-semibold text-gray-800">{fmtPts(split[hover].pit)}</span>
          </div>
        </Tip>
      )}
    </div>
  );
}
