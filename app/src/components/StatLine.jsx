import { COPY } from "../copy.js";
import { OUTCOME_COLOR } from "../lib/field.js";

const ROWS = [
  ["H", "Hits"],
  ["1B", "Singles"],
  ["2B", "Doubles"],
  ["3B", "Triples"],
  ["HR", "Home runs"],
];

// Actual on-contact line vs the expected line at Fenway, with bootstrap CIs.
export default function StatLine({ meta }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-2 text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {COPY.lineTitle}
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="w-1/4 py-1 font-medium" />
            <th className="py-1 text-right font-medium">{COPY.lineActual}</th>
            <th className="py-1 text-right font-medium">{COPY.lineNeutral}</th>
            <th className="py-1 text-right font-medium">{COPY.lineFenway}</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([key, label]) => {
            const exp = meta.expected_line[key];
            const neu = meta.neutral_line[key];
            const act = meta.actual_line[key];
            const luck = neu.mean - act; // actual vs contact quality
            const delta = exp.mean - neu.mean; // the park effect, luck removed
            return (
              <tr key={key} className="border-t border-gray-100">
                <td className="flex items-center gap-1.5 py-1.5 text-gray-600">
                  {key !== "H" && (
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{
                        background: OUTCOME_COLOR[key],
                      }}
                    />
                  )}
                  {label}
                </td>
                <td className="py-1.5 text-right font-mono text-gray-800">{act}</td>
                <td
                  className="py-1.5 text-right font-mono text-gray-600"
                  title={COPY.rangeHover(neu.ci)}
                >
                  {neu.mean}
                  <span className={`ml-1 text-[10px] ${luck >= 0.5 ? "text-outcome-2b" : luck <= -0.5 ? "text-primary-500" : "text-gray-500"}`}>
                    {luck > 0 ? `+${luck.toFixed(1)}` : luck.toFixed(1)}
                  </span>
                </td>
                <td
                  className="py-1.5 text-right font-mono text-gray-800"
                  title={COPY.rangeHover(exp.ci)}
                >
                  {exp.mean}
                  <span className={`ml-1 text-[10px] ${delta >= 0.5 ? "text-outcome-2b" : delta <= -0.5 ? "text-primary-500" : "text-gray-500"}`}>
                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
