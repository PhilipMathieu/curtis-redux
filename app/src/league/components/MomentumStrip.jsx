import { fmtPts } from "../lib/viz.js";

// Points gained/lost over the trailing 30 days, all eight teams sorted.
// The all-8 guarantee: every manager finds their month here.
export default function MomentumStrip({ teams, series, leader, chaser, colors }) {
  const span = 30;
  const rows = teams
    .map((t) => {
      const tot = series[t.id].totals;
      const delta = tot.at(-1) - tot[Math.max(0, tot.length - 1 - span)];
      return { ...t, delta };
    })
    .sort((a, b) => b.delta - a.delta);
  const maxAbs = Math.max(...rows.map((r) => Math.abs(r.delta)), 1);

  const color = (id) =>
    id === chaser.id ? colors.chaser : id === leader.id ? colors.leader : "#9A9A9A";
  const textColor = (id) =>
    id === chaser.id ? colors.chaserText : id === leader.id ? colors.leaderText : undefined;

  return (
    <div className="mx-auto max-w-md">
      {rows.map((r) => {
        const frac = Math.abs(r.delta) / maxAbs;
        return (
          <div key={r.id} className="flex h-[26px] items-center gap-2" title={`${r.name}: ${r.delta >= 0 ? "+" : ""}${fmtPts(r.delta)} points in the last 30 days`}>
            <span className="w-12 shrink-0 text-right text-xs font-medium" style={{ color: textColor(r.id) ?? "#4A4A4A" }}>
              {r.abbrev}
            </span>
            <span className="relative h-[18px] flex-1">
              {/* zero baseline at 40% so losses have room to the left */}
              <span className="absolute inset-y-0" style={{ left: "40%", width: 1, background: "#C9C9C9" }} />
              <span
                className="absolute inset-y-0"
                style={
                  r.delta >= 0
                    ? { left: "40%", width: `${frac * 58}%`, background: color(r.id), borderRadius: "0 4px 4px 0" }
                    : { right: "60%", width: `${frac * 38}%`, background: color(r.id), borderRadius: "4px 0 0 4px" }
                }
              />
              <span
                className="absolute top-1/2 -translate-y-1/2 font-mono text-[11px] font-semibold"
                style={{
                  left: r.delta >= 0 ? `calc(40% + ${frac * 58}% + 6px)` : undefined,
                  right: r.delta < 0 ? `calc(60% + ${frac * 38}% + 6px)` : undefined,
                  color: textColor(r.id) ?? "#1A1A1A",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {r.delta >= 0 ? "+" : "−"}
                {fmtPts(Math.abs(r.delta))}
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
