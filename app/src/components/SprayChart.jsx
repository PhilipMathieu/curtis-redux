import { useState } from "react";
import {
  dotPos, fencePath, monsterPath, proj, OUTCOME_COLOR, HX, HY,
} from "../lib/field.js";

export default function SprayChart({ rows, sel, onSelect }) {
  const [tip, setTip] = useState(null);
  const fence = fencePath();
  const monster = monsterPath();

  const show = (row, evt) => {
    const box = evt.currentTarget.ownerSVGElement.getBoundingClientRect();
    // keyboard focus has no pointer coords — anchor to the dot itself
    const dot = evt.clientX
      ? { x: evt.clientX, y: evt.clientY }
      : (() => {
          const b = evt.currentTarget.getBoundingClientRect();
          return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
        })();
    setTip({
      row,
      x: ((dot.x - box.left) / box.width) * 100,
      y: ((dot.y - box.top) / box.height) * 100,
    });
  };

  return (
    <div className="relative">
      <svg
        viewBox="0 0 640 520"
        className="w-full rounded border border-gray-200 bg-white"
        role="group"
        aria-label="Spray chart of batted balls over the Fenway Park outline"
      >
        {/* grass + deep-field tint */}
        <polygon
          points={`${HX},${HY} ${fence.map((p) => p.join(",")).join(" ")}`}
          fill="#157A4A"
          opacity="0.08"
        />
        {/* infield dirt + basepaths */}
        <circle cx={HX} cy={HY - 46} r={68} fill="#A97C50" opacity="0.22" />
        <rect
          x={HX - 46} y={HY - 92} width={92} height={92}
          transform={`rotate(45 ${HX} ${HY - 46})`}
          fill="none" stroke="#666666" strokeOpacity="0.4" strokeWidth="1.2"
        />
        {/* foul lines */}
        <line x1={HX} y1={HY} x2={proj(-45, 330)[0]} y2={proj(-45, 330)[1]} stroke="#666666" strokeOpacity="0.45" strokeWidth="1.4" />
        <line x1={HX} y1={HY} x2={proj(45, 320)[0]} y2={proj(45, 320)[1]} stroke="#666666" strokeOpacity="0.45" strokeWidth="1.4" />
        {/* fence + Monster band */}
        <polyline points={fence.map((p) => p.join(",")).join(" ")} fill="none" stroke="#666666" strokeOpacity="0.6" strokeWidth="1.4" />
        <polyline points={monster.map((p) => p.join(",")).join(" ")} fill="none" stroke="#157A4A" strokeWidth="8" strokeLinecap="butt" />
        <text
          x={proj(-29, 442)[0]} y={proj(-29, 442)[1]}
          fill="#157A4A" fontSize="11" fontWeight="600" fontFamily="Inter"
          textAnchor="middle"
          transform={`rotate(-45 ${proj(-29, 442)[0]} ${proj(-29, 442)[1]})`}
        >
          GREEN MONSTER · 37 FT
        </text>
        {/* distance markers */}
        {[["310", -44.5, 278], ["390", 0, 406], ["420", 10.5, 432], ["302", 44, 280]].map(([t, a, d]) => (
          <text key={t} x={proj(a, d)[0]} y={proj(a, d)[1]} fill="#666666" fontSize="10" fontFamily="ui-monospace, monospace" textAnchor="middle">
            {t}
          </text>
        ))}
        {/* dots — hits above, de-emphasized outs below */}
        {[...rows].sort((a, b) => (a.orig === "Out" ? -1 : 1) - (b.orig === "Out" ? -1 : 1)).map((row) => {
          const [x, y] = dotPos(row);
          const on = sel === row.id;
          const isOut = row.orig === "Out";
          const flipped = row.pflip;
          return (
            <g
              key={row.id}
              role="button"
              tabIndex={0}
              aria-label={`${Math.round(row.dist)} foot ${row.bb?.replace("_", " ")}, ${Math.abs(row.spray)} degrees ${row.spray < 0 ? "left" : "right"}, ${row.orig} at ${row.park}; ${Math.round(row.fp.HR * 100)}% home run at Fenway`}
              className="cursor-pointer focus:outline-none"
              onClick={() => onSelect(on ? null : row.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(on ? null : row.id);
                }
              }}
              onMouseEnter={(e) => show(row, e)}
              onMouseLeave={() => setTip(null)}
              onFocus={(e) => show(row, { currentTarget: e.currentTarget, clientX: 0 })}
              onBlur={() => setTip(null)}
            >
              {flipped && (
                <circle cx={x} cy={y} r={on ? 9 : 7} fill="none" stroke="#1A1A1A" strokeWidth="1" opacity="0.55" />
              )}
              <circle
                cx={x} cy={y}
                r={on ? 6.5 : isOut ? 3.5 : 5}
                fill={OUTCOME_COLOR[row.orig]}
                stroke={on ? "#1A1A1A" : isOut ? "#666666" : "#FFFFFF"}
                strokeWidth={on ? 2 : 0.8}
                opacity={sel != null && !on ? 0.35 : isOut ? 0.75 : 0.95}
              />
            </g>
          );
        })}
      </svg>
      {tip && (
        <div
          className="pointer-events-none absolute z-10 max-w-56 rounded border border-gray-200 bg-white px-2.5 py-1.5 text-xs shadow-sm"
          style={{
            left: `${Math.min(Math.max(tip.x, 2), 70)}%`,
            top: `${Math.max(tip.y, 14)}%`,
            transform: "translate(8px, -110%)",
          }}
        >
          <div className="font-medium text-gray-800">
            {tip.row.date} · {tip.row.opp === tip.row.park ? `at ${tip.row.park}` : `vs ${tip.row.opp}`}
          </div>
          <div className="font-mono text-gray-600">
            {tip.row.ev} mph · {tip.row.la}° · {tip.row.dist} ft
          </div>
          <div className="mt-0.5 line-clamp-2 text-gray-600">{tip.row.des}</div>
        </div>
      )}
    </div>
  );
}
