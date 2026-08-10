import { useEffect, useRef, useState } from "react";
import Tip from "./Tip.jsx";
import { BATTING, PITCHING, fmtPts } from "../lib/viz.js";
import { COPY } from "../copy.js";

// Horizontal stacked bars: each team's current total split into batting and
// pitching points, teams sorted by total. Baseline (left) square, data end
// rounded; a 2px surface gap separates the two segments.
export default function AttributionBars({ order, split, selected, onSelect, catLine }) {
  const wrapRef = useRef(null);
  const [barW, setBarW] = useState(520);
  const [tip, setTip] = useState(null); // {x, y, teamId, group}

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const obs = new ResizeObserver(() => {
      const bar = el.querySelector("[data-bar]");
      if (bar) setBarW(bar.clientWidth);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const max = Math.max(...order.map((t) => split[t.id].total));

  function showTip(evt, teamId, group) {
    const rect = wrapRef.current.getBoundingClientRect();
    setTip({ x: evt.clientX - rect.left, y: evt.clientY - rect.top, teamId, group });
  }

  return (
    <div ref={wrapRef} className="relative">
      {/* legend */}
      <div className="mb-2 flex items-center gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: BATTING }} />
          {COPY.split.batting}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: PITCHING }} />
          {COPY.split.pitching}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        {order.map((t) => {
          const s = split[t.id];
          const widthPx = (s.total / max) * barW;
          const batPx = (s.bat / s.total) * widthPx;
          const pitPx = widthPx - batPx;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              onPointerLeave={() => setTip(null)}
              className="group flex w-full cursor-pointer items-center gap-2 text-left"
            >
              <span
                className={`w-12 shrink-0 text-right text-xs ${
                  t.id === selected ? "font-semibold text-primary-600" : "font-medium text-gray-600"
                }`}
              >
                {t.abbrev}
              </span>
              <span data-bar className="relative h-5 flex-1">
                <span
                  className="absolute inset-y-0 left-0 flex"
                  style={{ width: `${(s.total / max) * 100}%` }}
                >
                  <span
                    className="flex h-full items-center justify-end pr-1.5"
                    style={{ width: `${(s.bat / s.total) * 100}%`, background: BATTING }}
                    onPointerMove={(e) => showTip(e, t.id, "bat")}
                  >
                    {batPx > 34 && (
                      <span className="text-[10px] font-medium text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmtPts(s.bat)}
                      </span>
                    )}
                  </span>
                  <span
                    className="ml-[2px] flex h-full items-center justify-end rounded-r-[4px] pr-1.5"
                    style={{ width: `calc(${(s.pit / s.total) * 100}% - 2px)`, background: PITCHING }}
                    onPointerMove={(e) => showTip(e, t.id, "pit")}
                  >
                    {pitPx > 34 && (
                      <span className="text-[10px] font-medium text-white" style={{ fontVariantNumeric: "tabular-nums" }}>
                        {fmtPts(s.pit)}
                      </span>
                    )}
                  </span>
                </span>
              </span>
              <span className="w-9 shrink-0 font-mono text-sm font-semibold text-gray-800" style={{ fontVariantNumeric: "tabular-nums" }}>
                {fmtPts(s.total)}
              </span>
            </button>
          );
        })}
      </div>

      {tip && (
        <Tip x={tip.x} y={tip.y} w={wrapRef.current?.clientWidth}>
          <div className="mb-1 font-semibold text-gray-800">
            {order.find((t) => t.id === tip.teamId)?.name}
          </div>
          <div className="text-gray-600">{catLine(tip.teamId, tip.group)}</div>
        </Tip>
      )}
    </div>
  );
}
