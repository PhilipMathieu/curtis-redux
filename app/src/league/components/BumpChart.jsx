import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { ACCENT, ACCENT_TEXT, DE_EMPH, GRID, INK_2, INK_MUTED, fmtDate } from "../lib/viz.js";

const W = 720;
const H = 300;
const M = { l: 30, r: 64, t: 14, b: 26 };

// Standings position over the season, sampled weekly — daily ranks swap
// constantly mid-pack and read as noise, so the bump chart keeps only the
// moves that stuck.
export default function BumpChart({ days, teams, series, selected, onSelect }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // {k, px, py}

  const { samples, ranks, x, y } = useMemo(() => {
    const samples = [];
    for (let i = 0; i < days.length - 1; i += 7) samples.push(i);
    samples.push(days.length - 1);

    const ranks = {};
    for (const t of teams) ranks[t.id] = [];
    for (const i of samples) {
      const order = [...teams].sort((a, b) => series[b.id].totals[i] - series[a.id].totals[i]);
      order.forEach((t, pos) => ranks[t.id].push(pos + 1));
    }
    const x = (k) => M.l + (k / (samples.length - 1)) * (W - M.l - M.r);
    const y = (r) => M.t + ((r - 1) / (teams.length - 1)) * (H - M.t - M.b);
    return { samples, ranks, x, y };
  }, [days, teams, series]);

  const path = (tid) =>
    ranks[tid].map((r, k) => `${k ? "L" : "M"}${x(k).toFixed(1)},${y(r).toFixed(1)}`).join("");

  const months = useMemo(() => {
    const out = [];
    for (let k = 1; k < samples.length; k++) {
      if (days[samples[k]].slice(5, 7) !== days[samples[k - 1]].slice(5, 7)) {
        out.push({ k, label: fmtDate(days[samples[k]]).split(" ")[0] });
      }
    }
    return out;
  }, [samples, days]);

  function locate(evt) {
    const rect = wrapRef.current.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * W;
    const py = ((evt.clientY - rect.top) / rect.height) * H;
    const k = Math.max(0, Math.min(samples.length - 1, Math.round(((px - M.l) / (W - M.l - M.r)) * (samples.length - 1))));
    return { k, px, py };
  }

  return (
    <div ref={wrapRef} className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full cursor-crosshair select-none"
        role="img"
        aria-label="Weekly standings position for every team"
        onPointerMove={(e) => setHover(locate(e))}
        onPointerLeave={() => setHover(null)}
        onClick={(e) => {
          const { k, py } = locate(e);
          let best = null;
          for (const t of teams) {
            const d = Math.abs(y(ranks[t.id][k]) - py);
            if (!best || d < best.d) best = { id: t.id, d };
          }
          if (best) onSelect(best.id);
        }}
      >
        {teams.map((_, i) => (
          <g key={i}>
            <line x1={M.l} x2={W - M.r} y1={y(i + 1)} y2={y(i + 1)} stroke="#F2F2F2" strokeWidth="1" />
            <text x={M.l - 8} y={y(i + 1) + 3.5} textAnchor="end" fontSize="10" fill={INK_MUTED} style={{ fontVariantNumeric: "tabular-nums" }}>
              {i + 1}
            </text>
          </g>
        ))}
        {months.map((m) => (
          <text key={m.k} x={x(m.k)} y={H - M.b + 16} textAnchor="middle" fontSize="10" fill={INK_MUTED}>
            {m.label}
          </text>
        ))}

        {teams.map(
          (t) =>
            t.id !== selected && (
              <path key={t.id} d={path(t.id)} fill="none" stroke={DE_EMPH} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            ),
        )}
        <path d={path(selected)} fill="none" stroke={ACCENT} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {ranks[selected].map((r, k) => (
          <circle key={k} cx={x(k)} cy={y(r)} r="3" fill={ACCENT} stroke="#fff" strokeWidth="1.5" />
        ))}

        {teams.map((t) => (
          <text
            key={t.id}
            x={W - M.r + 8}
            y={y(ranks[t.id].at(-1)) + 3.5}
            fontSize="10"
            fontWeight={t.id === selected ? 600 : 400}
            fill={t.id === selected ? ACCENT_TEXT : INK_2}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(t.id);
            }}
          >
            {t.abbrev}
          </text>
        ))}

        {hover && <line x1={x(hover.k)} x2={x(hover.k)} y1={M.t} y2={H - M.b} stroke={GRID} strokeWidth="1" />}
      </svg>

      {hover && wrapRef.current && (
        <Tip
          x={(hover.px / W) * wrapRef.current.clientWidth}
          y={(hover.py / H) * wrapRef.current.clientHeight}
          w={wrapRef.current.clientWidth}
          h={wrapRef.current.clientHeight}
          estH={30 + teams.length * 18}
        >
          <div className="mb-1 font-semibold text-gray-800">{fmtDate(days[samples[hover.k]])}</div>
          {[...teams]
            .sort((a, b) => ranks[a.id][hover.k] - ranks[b.id][hover.k])
            .map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 leading-[18px]">
                <span className="w-4 text-right font-mono text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {ranks[t.id][hover.k]}
                </span>
                <span className={t.id === selected ? "font-medium text-primary-600" : "text-gray-600"}>{t.abbrev}</span>
              </div>
            ))}
        </Tip>
      )}
    </div>
  );
}
