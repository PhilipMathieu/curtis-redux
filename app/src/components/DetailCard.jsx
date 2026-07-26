import { OUTCOMES, OUTCOME_COLOR, OUTCOME_LABEL, TEAM_NAME } from "../lib/field.js";
import WallSection from "./WallSection.jsx";

export default function DetailCard({ r }) {
  if (!r) {
    return (
      <div className="rounded border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
        Select any batted ball to run it into Fenway's walls.
      </div>
    );
  }
  const park = TEAM_NAME[r.park] ?? r.park;
  return (
    <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-mono text-xs text-gray-600">
          {r.date} · {r.ev} mph · {r.la}° launch · {r.dist} ft
        </div>
        <div className="text-xs text-gray-500">{r.seg}</div>
      </div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2">
        {/* actual result */}
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-gray-500">
            Actual result · {park}
          </div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{
                background: OUTCOME_COLOR[r.orig],
                border: r.orig === "Out" ? "1px solid #666666" : "none",
              }}
            />
            <span className="font-serif text-2xl">{OUTCOME_LABEL[r.orig]}</span>
          </div>
          <p className="mt-1 mb-0 text-xs leading-snug text-gray-600">{r.des}</p>
        </div>

        {/* Fenway distribution */}
        <div>
          <div className="mb-1 text-[11px] font-medium uppercase tracking-widest text-gray-500">
            Same ball at Fenway
          </div>
          <div className="flex flex-col gap-1" role="list" aria-label="Fenway outcome probabilities">
            {OUTCOMES.map((o) => (
              <div key={o} role="listitem" className="flex items-center gap-2 text-xs">
                <span className="w-12 shrink-0 text-gray-600">{OUTCOME_LABEL[o]}</span>
                <span className="h-2.5 grow overflow-hidden rounded-sm bg-gray-100">
                  <span
                    className="block h-full rounded-sm"
                    style={{
                      width: `${Math.max(r.fp[o] * 100, r.fp[o] > 0 ? 1.5 : 0)}%`,
                      background: o === "Out" ? "#999999" : OUTCOME_COLOR[o],
                    }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right font-mono text-gray-800">
                  {Math.round(r.fp[o] * 100)}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-1.5 mb-0 text-[11px] leading-snug text-gray-500">
            Of the 100 most similar balls real right-handed hitters put in play
            at Fenway{r.hf != null && r.fh >= 10 ? ", blended with the physics of the wall" : ""}.
          </p>
        </div>
      </div>

      <WallSection r={r} />
    </div>
  );
}
