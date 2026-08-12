import { useMemo, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { fmtStat } from "../lib/viz.js";
import { COPY } from "../copy.js";

const STRIP_W = 300;
const ROW_H = 34;

// One row per category: everyone's ladder rank (right is better), the exact
// stat gap the chaser needs to climb one rung, and the leader's cushion over
// the team just below — sorted by the chaser's cheapest point.
export default function RungLadder({ teams, cats, current, leader, chaser, colors }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // statId

  const rows = useMemo(() => {
    const n = teams.length;
    const out = cats.map((cat) => {
      const sid = String(cat.statId);
      const vals = teams.map((t) => ({ ...t, v: current[t.id].espnValues[sid] }));
      // ladder order, best last (so index maps left→right = worst→best)
      const ladder = [...vals].sort((a, b) => (cat.reverse ? b.v - a.v : a.v - b.v));
      const pos = Object.fromEntries(ladder.map((t, i) => [t.id, i]));
      const better = (a, b) => (cat.reverse ? a < b : a > b);

      const chaserVal = vals.find((t) => t.id === chaser.id).v;
      const leaderVal = vals.find((t) => t.id === leader.id).v;

      // chaser: nearest team strictly better → cost of one rung
      const above = ladder.filter((t) => better(t.v, chaserVal));
      const nextUp = above.length ? above[0] : null;
      const need = nextUp ? Math.abs(nextUp.v - chaserVal) : null;

      // leader: nearest team strictly worse → cushion
      const below = ladder.filter((t) => better(leaderVal, t.v));
      const nextDown = below.length ? below.at(-1) : null;
      const cushion = nextDown ? Math.abs(leaderVal - nextDown.v) : null;

      // rung cost normalized by this ladder's average step, for sorting
      const span = Math.abs(ladder.at(-1).v - ladder[0].v) / (n - 1) || 1;
      const relCost = need == null ? Infinity : need / span;

      return { cat, ladder, pos, nextUp, need, nextDown, cushion, relCost };
    });
    out.sort((a, b) => a.relCost - b.relCost);
    return out;
  }, [teams, cats, current, leader, chaser]);

  const xOf = (idx) => 14 + (idx / (teams.length - 1)) * (STRIP_W - 28);

  const gapText = (cat, gap) => {
    if ([2, 41, 47].includes(cat.statId)) {
      const places = cat.statId === 2 ? 3 : 2;
      const s = gap.toFixed(places);
      // a gap that rounds to zero is a dead heat, not nothing
      if (Number(s) === 0) return `<${(10 ** -places).toFixed(places)}`.replace("0.", ".");
      return s.replace(/^0\./, ".");
    }
    return `${Math.ceil(gap)}`;
  };

  return (
    <div ref={wrapRef} className="relative overflow-x-auto">
      <table className="w-full border-separate text-xs" style={{ borderSpacing: "0 2px", minWidth: 560 }}>
        <thead>
          <tr className="text-[10px] font-medium text-gray-500">
            <th className="w-10 text-left font-medium" />
            <th className="text-left font-medium">
              <span className="pl-3">worst</span>
              <span className="float-right pr-3">best</span>
            </th>
            <th className="w-36 pl-2 text-left font-medium">{COPY.rungs.needHead(chaser.abbrev)}</th>
            <th className="w-36 pl-2 text-left font-medium">{COPY.rungs.holdHead(leader.abbrev)}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ cat, ladder, pos, nextUp, need, nextDown, cushion }) => (
            <tr
              key={cat.statId}
              onPointerMove={(e) => {
                const rect = wrapRef.current.getBoundingClientRect();
                setHover({ sid: cat.statId, x: e.clientX - rect.left, y: e.clientY - rect.top });
              }}
              onPointerLeave={() => setHover(null)}
            >
              <td className="pr-1 text-right text-xs font-medium text-gray-600" title={cat.name}>
                {cat.abbrev}
              </td>
              <td>
                <svg viewBox={`0 0 ${STRIP_W} ${ROW_H}`} className="block h-[34px] w-full" role="img" aria-label={`${cat.name} ladder`}>
                  <line x1={xOf(0)} x2={xOf(teams.length - 1)} y1={ROW_H / 2} y2={ROW_H / 2} stroke="#EDEDED" strokeWidth="2" />
                  {ladder.map(
                    (t) =>
                      t.id !== leader.id &&
                      t.id !== chaser.id && (
                        <circle key={t.id} cx={xOf(pos[t.id])} cy={ROW_H / 2} r="3.5" fill="#C6C6C6" stroke="#fff" strokeWidth="1.5" />
                      ),
                  )}
                  <circle cx={xOf(pos[leader.id])} cy={ROW_H / 2} r="5.5" fill={colors.leader} stroke="#fff" strokeWidth="2" />
                  <circle cx={xOf(pos[chaser.id])} cy={ROW_H / 2} r="5.5" fill={colors.chaser} stroke="#fff" strokeWidth="2" />
                </svg>
              </td>
              <td className="whitespace-nowrap pl-2 text-xs" style={{ color: colors.chaserText }}>
                {need == null ? (
                  <span className="font-semibold">{COPY.rungs.leads}</span>
                ) : (
                  <>
                    <span className="font-mono font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                      +{gapText(cat, need)} {cat.abbrev === "AVG" || cat.abbrev === "ERA" || cat.abbrev === "WHIP" ? "" : cat.abbrev}
                    </span>
                    {nextUp?.id === leader.id && (
                      <span className="ml-1 text-[10px] text-gray-500">{COPY.rungs.fromLeader(leader.abbrev)}</span>
                    )}
                  </>
                )}
              </td>
              <td className="whitespace-nowrap pl-2 text-xs" style={{ color: colors.leaderText }}>
                {cushion == null ? (
                  <span className="text-gray-400">{COPY.rungs.maxed}</span>
                ) : (
                  <>
                    <span className="font-mono font-semibold" style={{ fontVariantNumeric: "tabular-nums" }}>
                      {gapText(cat, cushion)} {cat.abbrev === "AVG" || cat.abbrev === "ERA" || cat.abbrev === "WHIP" ? "" : cat.abbrev}
                    </span>
                    {nextDown?.id === chaser.id && (
                      <span className="ml-1 text-[10px] text-gray-500">{COPY.rungs.fromChaser(chaser.abbrev)}</span>
                    )}
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {hover && wrapRef.current && (() => {
        const row = rows.find((r) => r.cat.statId === hover.sid);
        return (
          <Tip x={hover.x} y={hover.y} w={wrapRef.current.clientWidth} h={wrapRef.current.clientHeight} estH={40 + teams.length * 18}>
            <div className="mb-1 font-semibold text-gray-800">{row.cat.name}</div>
            {[...row.ladder].reverse().map((t, i) => (
              <div key={t.id} className="flex items-center gap-1.5 leading-[18px]">
                <span className="w-3 text-right font-mono text-gray-500" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {i + 1}
                </span>
                <span
                  className={t.id === leader.id || t.id === chaser.id ? "font-medium" : "text-gray-600"}
                  style={t.id === chaser.id ? { color: colors.chaserText } : t.id === leader.id ? { color: colors.leaderText } : undefined}
                >
                  {t.abbrev}
                </span>
                <span className="ml-auto font-mono font-semibold text-gray-800">{fmtStat(row.cat.statId, t.v)}</span>
              </div>
            ))}
          </Tip>
        );
      })()}
    </div>
  );
}
