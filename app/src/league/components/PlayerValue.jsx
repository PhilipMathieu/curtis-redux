import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { BATTING, BAT_ORDER, INK, PITCHING, RAMP } from "../lib/viz.js";
import { CAT_SGP_ORDER, rvPlus, sgpSplit } from "../lib/sgp.js";
import { COPY } from "../copy.js";

const fmtSgp = (v) => (v >= 0 ? v.toFixed(1) : v.toFixed(1));

function breakdown(byCat, cats) {
  return CAT_SGP_ORDER.filter((sid) => Math.abs(byCat[sid] ?? 0) >= 0.25)
    .map((sid) => `${cats[sid].abbrev} ${byCat[sid] >= 0 ? "+" : ""}${byCat[sid].toFixed(1)}`)
    .join(" · ");
}

// League-wide SGP leaderboard: each bar is a player's standings points
// bought, split batting vs pitching. RV+ = SGP indexed to 100 = the
// average starter.
export function SgpLeaderboard({ sgp, cats, teamsById, count = 12 }) {
  const wrapRef = useRef(null);
  const [tip, setTip] = useState(null); // {x, y, player}
  const rows = sgp.leaderboard.slice(0, count);
  const max = rows[0].sgp;

  return (
    <div ref={wrapRef} className="relative">
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: BATTING }} />
          {COPY.split.batting}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: PITCHING }} />
          {COPY.split.pitching}
        </span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-gray-500">{COPY.players.rvHead}</span>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((p, i) => {
          const { bat, pit } = sgpSplit(p.byCat);
          const batW = (Math.max(0, bat) / max) * 100;
          const pitW = (Math.max(0, pit) / max) * 100;
          return (
            <div
              key={p.name}
              className="flex items-center gap-2"
              onPointerMove={(e) => {
                const rect = wrapRef.current.getBoundingClientRect();
                setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, player: p });
              }}
              onPointerLeave={() => setTip(null)}
            >
              <span className="w-4 shrink-0 text-right font-mono text-[10px] text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                {i + 1}
              </span>
              <span className="w-40 shrink-0 truncate text-xs text-gray-800">
                {p.name}
                <span className="ml-1 text-[10px] text-gray-500">
                  {p.teams.map((tid) => teamsById[tid].abbrev).join("→")}
                </span>
              </span>
              <span className="relative h-4 flex-1">
                <span className="absolute inset-y-0 left-0" style={{ width: `${batW}%`, background: BATTING }} />
                <span
                  className="absolute inset-y-0 rounded-r-[3px]"
                  style={{ left: `calc(${batW}% + 2px)`, width: `max(0px, calc(${pitW}% - 2px))`, background: PITCHING }}
                />
              </span>
              <span className="w-9 shrink-0 text-right font-mono text-xs font-semibold text-gray-800" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtSgp(p.sgp)}
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-[11px] text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                {rvPlus(p.sgp, sgp.rvBase)}
              </span>
            </div>
          );
        })}
      </div>

      {tip && (
        <Tip x={tip.x} y={tip.y} w={wrapRef.current?.clientWidth} h={wrapRef.current?.clientHeight} estH={70}>
          <div className="font-semibold text-gray-800">{tip.player.name}</div>
          <div className="text-gray-600">{breakdown(tip.player.byCat, cats)}</div>
          <div className="mt-0.5 text-[10px] text-gray-500">{COPY.players.gp(tip.player.gp)}</div>
        </Tip>
      )}
    </div>
  );
}

// The selected team's roster, every cell in the same SGP currency — the
// counting columns are production bought, the ratio columns are the
// player's impact on the team's AVG/ERA/WHIP.
export function RosterTable({ sgp, cats, teamId, count = 10 }) {
  const rows = useMemo(() => sgp.stintsByTeam[teamId].slice(0, count), [sgp, teamId, count]);
  const maxCell = useMemo(
    () => Math.max(0.01, ...rows.flatMap((p) => Object.values(p.byCat).filter((v) => v > 0))),
    [rows],
  );

  const cellStyle = (v) => {
    if (v == null) return { color: "#C4C4C4" };
    if (v < -0.05) return { background: "#FBEAEA", color: "#A00E24" };
    const idx = Math.min(RAMP.length - 1, Math.round((Math.max(0, v) / maxCell) * (RAMP.length - 1)));
    return { background: RAMP[idx], color: idx >= 5 ? "#FFFFFF" : INK };
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate text-xs" style={{ borderSpacing: 2 }}>
        <thead>
          <tr className="text-[10px] font-medium text-gray-500">
            <th className="text-left font-medium">{COPY.players.player}</th>
            <th className="pr-1 text-right font-medium" title={COPY.players.gpLong}>
              {COPY.players.gpHead}
            </th>
            {CAT_SGP_ORDER.map((sid) => (
              <th key={sid} className="min-w-8 pb-1 text-center font-medium" title={cats[sid].name}>
                {cats[sid].abbrev}
              </th>
            ))}
            <th className="pl-1.5 text-right font-medium">{COPY.players.sgpHead}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.name}>
              <td className="whitespace-nowrap pr-1.5 text-xs font-medium text-gray-800">{p.name}</td>
              <td className="pr-1 text-right font-mono text-[11px] text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                {p.gp}
              </td>
              {CAT_SGP_ORDER.map((sid) => {
                const v = p.byCat[sid];
                // a pitcher's empty batting columns (and vice versa) are
                // blanked — a 0.0 there reads as a stat he doesn't have
                const otherSide = p.pitcher === BAT_ORDER.includes(sid);
                if (v == null || (otherSide && Math.abs(v) < 0.005)) {
                  return (
                    <td
                      key={sid}
                      className="h-6 rounded-[2px] px-1 text-center text-gray-300"
                      title={v == null ? COPY.players.tooSmall(cats[sid].abbrev) : undefined}
                    >
                      {v == null ? "—" : "·"}
                    </td>
                  );
                }
                return (
                  <td
                    key={sid}
                    className="h-6 rounded-[2px] px-1 text-center"
                    style={{ ...cellStyle(v), fontVariantNumeric: "tabular-nums" }}
                    title={`${p.name} · ${cats[sid].name}: ${v >= 0 ? "+" : ""}${v.toFixed(2)} ${COPY.players.sgpUnit}`}
                  >
                    {v.toFixed(1)}
                  </td>
                );
              })}
              <td className="pl-1.5 text-right font-mono text-xs font-semibold text-gray-800" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtSgp(p.sgp)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
