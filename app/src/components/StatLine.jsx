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
            <th className="w-1/3 py-1 font-medium" />
            <th className="py-1 text-right font-medium">{COPY.lineActual}</th>
            <th className="py-1 text-right font-medium">{COPY.lineFenway}</th>
            <th className="hidden py-1 text-right font-normal text-gray-500 sm:table-cell">95% CI</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map(([key, label]) => {
            const exp = meta.expected_line[key];
            const act = meta.actual_line[key];
            const delta = exp.mean - act;
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
                <td className="py-1.5 text-right font-mono text-gray-800">
                  {exp.mean}
                  <span className={`ml-1 text-[10px] ${delta >= 0.5 ? "text-outcome-2b" : delta <= -0.5 ? "text-primary-500" : "text-gray-500"}`}>
                    {delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)}
                  </span>
                </td>
                <td className="hidden py-1.5 text-right font-mono text-gray-500 sm:table-cell">
                  {exp.ci[0]}–{exp.ci[1]}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
