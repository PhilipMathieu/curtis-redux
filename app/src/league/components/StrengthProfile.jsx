import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { ACCENT, ACCENT_TEXT, GRID, INK_2, INK_MUTED, fmtStat } from "../lib/viz.js";
import { COPY } from "../copy.js";

const W = 720;
const H = 330;
const M = { l: 44, r: 16, t: 22, b: 30 };
const CLAMP = 2.7; // σ

// Each category as a dot strip: every team in gray, the selected team in
// red, x = distance from league average with ERA/WHIP flipped so right is
// always good. Shows position *and* the league's spread at once.
export default function StrengthProfile({ teams, cats, current, selected, onSelect }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // {sid, tid}

  const { rows, x, rowY } = useMemo(() => {
    const rows = cats.map((c) => {
      const vals = teams.map((t) => current[t.id].espnValues[String(c.statId)]);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / vals.length) || 1;
      const z = {};
      teams.forEach((t, i) => {
        const raw = (vals[i] - mean) / sd;
        z[t.id] = Math.max(-CLAMP, Math.min(CLAMP, c.reverse ? -raw : raw));
      });
      return { ...c, z, vals: Object.fromEntries(teams.map((t, i) => [t.id, vals[i]])) };
    });
    const x = (z) => M.l + ((z + CLAMP) / (2 * CLAMP)) * (W - M.l - M.r);
    const rowY = (i) => M.t + ((i + 0.5) / cats.length) * (H - M.t - M.b);
    return { rows, x, rowY };
  }, [teams, cats, current]);

  return (
    <div ref={wrapRef} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full select-none" role="img" aria-label="Category strength versus league average for every team">
        <line x1={x(0)} x2={x(0)} y1={M.t - 8} y2={H - M.b} stroke="#BBBBBB" strokeWidth="1" />
        <text x={x(0)} y={M.t - 12} textAnchor="middle" fontSize="9" fill={INK_MUTED}>
          {COPY.profile.avgTick}
        </text>
        <line x1={M.l} x2={W - M.r} y1={rowY(4.5) + 1} y2={rowY(4.5) + 1} stroke={GRID} strokeWidth="1" />
        <text x={W - M.r} y={H - 6} textAnchor="end" fontSize="9" fill={INK_MUTED}>
          {COPY.profile.axis}
        </text>

        {rows.map((row, i) => (
          <g key={row.statId}>
            <text x={M.l - 8} y={rowY(i) + 3.5} textAnchor="end" fontSize="10" fontWeight="500" fill={INK_2}>
              {row.abbrev}
            </text>
            <line x1={M.l} x2={W - M.r} y1={rowY(i)} y2={rowY(i)} stroke="#F4F4F4" strokeWidth="1" />
            {teams.map(
              (t) =>
                t.id !== selected && (
                  <circle
                    key={t.id}
                    cx={x(row.z[t.id])}
                    cy={rowY(i)}
                    r="4.5"
                    fill="#BDBDBD"
                    stroke="#fff"
                    strokeWidth="1.5"
                    className="cursor-pointer"
                    onClick={() => onSelect(t.id)}
                    onPointerEnter={() => setHover({ sid: row.statId, tid: t.id })}
                    onPointerLeave={() => setHover(null)}
                  />
                ),
            )}
            <circle
              cx={x(row.z[selected])}
              cy={rowY(i)}
              r="5.5"
              fill={ACCENT}
              stroke="#fff"
              strokeWidth="2"
              onPointerEnter={() => setHover({ sid: row.statId, tid: selected })}
              onPointerLeave={() => setHover(null)}
            />
            <text x={x(row.z[selected])} y={rowY(i) - 9} textAnchor="middle" fontSize="8.5" fontWeight="600" fill={ACCENT_TEXT} style={{ fontVariantNumeric: "tabular-nums" }}>
              {fmtStat(row.statId, row.vals[selected])}
            </text>
          </g>
        ))}
      </svg>

      {hover && wrapRef.current && (() => {
        const row = rows.find((r) => r.statId === hover.sid);
        const i = rows.indexOf(row);
        return (
          <Tip
            x={(x(row.z[hover.tid]) / W) * wrapRef.current.clientWidth}
            y={(rowY(i) / H) * wrapRef.current.clientHeight}
            w={wrapRef.current.clientWidth}
            h={wrapRef.current.clientHeight}
            estH={64}
          >
            <div className="font-semibold text-gray-800">
              {teams.find((t) => t.id === hover.tid)?.abbrev} · {row.name}
            </div>
            <div className="text-gray-600">
              <span className="font-mono font-semibold text-gray-800">{fmtStat(row.statId, row.vals[hover.tid])}</span>
              {" · "}
              {row.z[hover.tid] >= 0 ? COPY.profile.above : COPY.profile.below}
            </div>
          </Tip>
        );
      })()}
    </div>
  );
}
