import { COPY } from "../copy.js";
import { OUTCOMES } from "../lib/field.js";

// Outcome transition matrix: rows = what actually happened, columns = where
// that probability mass goes at Fenway. Cell (i,j) = sum of fp[j] over balls
// with actual outcome i. Right marginal = actual line; bottom marginal =
// expected Fenway line. Sequential single-hue shading (magnitude only).
export default function TransitionMatrix({ rows }) {
  const matrix = {};
  for (const o of OUTCOMES) matrix[o] = Object.fromEntries(OUTCOMES.map((x) => [x, 0]));
  for (const r of rows) {
    for (const o of OUTCOMES) matrix[r.orig][o] += r.fp[o];
  }
  const rowTotals = Object.fromEntries(
    OUTCOMES.map((o) => [o, rows.filter((r) => r.orig === o).length]),
  );
  const colTotals = Object.fromEntries(
    OUTCOMES.map((o) => [o, OUTCOMES.reduce((s, i) => s + matrix[i][o], 0)]),
  );
  const max = Math.max(...OUTCOMES.flatMap((i) => OUTCOMES.map((j) => matrix[i][j])));

  const fmt = (v) => (v < 0.05 ? "–" : v.toFixed(1));
  const shade = (v) => `rgba(21, 122, 74, ${(0.32 * Math.sqrt(v / max)).toFixed(3)})`;

  return (
    <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {COPY.matrixTitle}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-96 text-xs">
          <thead>
            <tr className="text-gray-500">
              <th className="py-1 pr-2 text-left font-medium">{COPY.matrixCorner}</th>
              {OUTCOMES.map((o) => (
                <th key={o} className="px-1.5 py-1 text-right font-medium">{o}</th>
              ))}
              <th className="py-1 pl-2 text-right font-medium">{COPY.matrixTotal}</th>
            </tr>
          </thead>
          <tbody>
            {OUTCOMES.map((i) => (
              <tr key={i} className="border-t border-gray-100">
                <td className="py-1 pr-2 text-gray-600">{i}</td>
                {OUTCOMES.map((j) => (
                  <td
                    key={j}
                    className={`px-1.5 py-1 text-right font-mono text-gray-800 ${i === j ? "font-semibold" : ""}`}
                    style={{ background: shade(matrix[i][j]) }}
                  >
                    {fmt(matrix[i][j])}
                  </td>
                ))}
                <td className="py-1 pl-2 text-right font-mono text-gray-600">{rowTotals[i]}</td>
              </tr>
            ))}
            <tr className="border-t border-gray-300">
              <td className="py-1 pr-2 text-gray-600">{COPY.matrixTotal}</td>
              {OUTCOMES.map((o) => (
                <td key={o} className="px-1.5 py-1 text-right font-mono font-semibold text-gray-800">
                  {colTotals[o].toFixed(1)}
                </td>
              ))}
              <td className="py-1 pl-2 text-right font-mono text-gray-600">{rows.length}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-1.5 mb-0 text-[11px] leading-snug text-gray-500">{COPY.matrixCaption}</p>
    </div>
  );
}
