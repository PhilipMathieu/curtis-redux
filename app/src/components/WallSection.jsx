import { wallSigma } from "../lib/field.js";

// Side view at the ball's spray angle: the REAL integrated trajectory arc
// (r.arc from the physics model), the wall, and an uncertainty band around
// the wall top instead of a binary over/under verdict.
export default function WallSection({ r }) {
  const W = 560;
  const H = 130;
  const fd = r.fdist;
  const fh = r.fh;
  const sigma = wallSigma(r.seg);
  const carry = r.arc[r.arc.length - 1][0];
  const xMax = Math.max(carry, fd) + 40;
  const yMax = Math.max(r.apex + 14, fh + sigma + 10, 48);
  const X = (v) => (v / xMax) * W;
  const Y = (v) => H - (v / yMax) * H;

  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-gray-500">
        Side view at {Math.abs(r.spray)}° {r.spray < 0 ? "LF" : "RF"} — {r.seg}, {fh} ft wall at {fd} ft
      </div>
      <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full rounded bg-white border border-gray-200">
        {/* ground */}
        <line x1="0" y1={Y(0)} x2={W} y2={Y(0)} stroke="#E5E5E5" strokeWidth="1.5" />
        {/* wall uncertainty band (wind/spin sigma) */}
        <rect
          x={X(fd) - 7} y={Y(fh + sigma)}
          width="14" height={Y(fh - sigma) - Y(fh + sigma)}
          fill="#157A4A" opacity="0.15"
        />
        {/* wall */}
        <rect x={X(fd) - 3} y={Y(fh)} width="6" height={Y(0) - Y(fh)} fill="#157A4A" />
        <text x={X(fd) + 10} y={Y(fh) + 4} fill="#157A4A" fontSize="10" fontFamily="ui-monospace, monospace">
          {fh} ft ±{sigma}
        </text>
        {/* real trajectory */}
        <polyline
          points={r.arc.map(([x, y]) => `${X(x)},${Y(y)}`).join(" ")}
          fill="none" stroke="#4A4A4A" strokeWidth="1.6" strokeOpacity="0.85"
        />
        {r.hf != null ? (
          <>
            <circle cx={X(fd)} cy={Y(r.hf)} r="4.5" fill={r.fp.HR >= 0.5 ? "#CE112D" : "#B8860B"} stroke="#FFFFFF" strokeWidth="1.2" />
            <text
              x={X(fd) - 9} y={Y(r.hf) - 8}
              fill="#1A1A1A" fontSize="10" fontFamily="ui-monospace, monospace" textAnchor="end"
            >
              {r.hf} ft at the wall{r.pclear != null ? ` · clears ${Math.round(r.pclear * 100)}%` : ""}
            </text>
          </>
        ) : (
          <text x={X(Math.min(carry, xMax - 30))} y={Y(0) - 6} fill="#666666" fontSize="10" fontFamily="ui-monospace, monospace" textAnchor="middle">
            lands {Math.max(fd - carry, 0).toFixed(0)} ft short
          </text>
        )}
        <text x="4" y={H + 12} fill="#666666" fontSize="9" fontFamily="ui-monospace, monospace">0 ft</text>
        <text x={W - 4} y={H + 12} fill="#666666" fontSize="9" fontFamily="ui-monospace, monospace" textAnchor="end">
          {Math.round(xMax)} ft
        </text>
      </svg>
    </div>
  );
}
