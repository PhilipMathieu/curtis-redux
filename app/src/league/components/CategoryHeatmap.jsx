import { useState } from "react";
import { fmtPts, fmtStat, rampColor, rampInk } from "../lib/viz.js";
import { COPY } from "../copy.js";

function Toggle({ on, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-sm border px-3 py-1 text-xs font-medium tracking-wide transition-colors ${
        on
          ? "border-primary-500 bg-primary-500/5 text-primary-600"
          : "border-gray-300 bg-white text-gray-600 hover:border-gray-500"
      }`}
    >
      {children}
    </button>
  );
}

// Teams × categories matrix. Cell shade is always roto points (sequential
// link-blue ramp, darker = more); the toggle switches the printed number
// between points and the underlying season stat. This table is also the
// page's screen-reader/table view of the standings.
export default function CategoryHeatmap({ order, batCats, pitCats, byTeam, nTeams, selected, onSelect }) {
  const [mode, setMode] = useState("points");
  const cats = [...batCats, ...pitCats];

  return (
    <div>
      <div className="mb-2 flex gap-1.5">
        <Toggle on={mode === "points"} onClick={() => setMode("points")}>
          {COPY.matrix.showPoints}
        </Toggle>
        <Toggle on={mode === "values"} onClick={() => setMode("values")}>
          {COPY.matrix.showValues}
        </Toggle>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate text-xs" style={{ borderSpacing: 2 }}>
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
              <th />
              <th colSpan={batCats.length} className="pb-0.5 text-center font-semibold">
                {COPY.matrix.batting}
              </th>
              <th colSpan={pitCats.length} className="pb-0.5 text-center font-semibold">
                {COPY.matrix.pitching}
              </th>
              <th />
            </tr>
            <tr className="text-[10px] font-medium text-gray-500">
              <th />
              {cats.map((c) => (
                <th key={c.statId} className="pb-1 text-center font-medium" title={c.name}>
                  {c.abbrev}
                </th>
              ))}
              <th className="pb-1 pl-1.5 text-right font-medium">{COPY.matrix.total}</th>
            </tr>
          </thead>
          <tbody>
            {order.map((t) => {
              const row = byTeam[t.id];
              return (
                <tr
                  key={t.id}
                  className="cursor-pointer"
                  onClick={() => onSelect(t.id)}
                >
                  <td
                    className={`pr-1.5 text-right text-xs whitespace-nowrap ${
                      t.id === selected ? "font-semibold text-primary-600" : "font-medium text-gray-600"
                    }`}
                    title={t.name}
                  >
                    {t.abbrev}
                  </td>
                  {cats.map((c) => {
                    const pts = row.points[c.statId];
                    const val = row.values[c.statId];
                    return (
                      <td
                        key={c.statId}
                        className="h-7 min-w-9 rounded-[2px] px-1 text-center"
                        style={{
                          background: rampColor(pts, nTeams),
                          color: rampInk(pts, nTeams),
                          fontVariantNumeric: "tabular-nums",
                        }}
                        title={`${t.abbrev} · ${c.name}: ${fmtStat(c.statId, val)} — ${fmtPts(pts)} of ${nTeams} points`}
                      >
                        {mode === "points" ? fmtPts(pts) : fmtStat(c.statId, val)}
                      </td>
                    );
                  })}
                  <td className="pl-1.5 text-right font-mono text-xs font-semibold text-gray-800" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {fmtPts(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
