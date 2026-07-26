import { useEffect, useMemo, useRef, useState } from "react";
import data from "./data.json";
import { COPY } from "./copy.js";
import { OUTCOME_COLOR, OUTCOME_LABEL } from "./lib/field.js";
import SprayChart from "./components/SprayChart.jsx";
import DetailCard from "./components/DetailCard.jsx";
import StatLine from "./components/StatLine.jsx";

const { meta, rows: ROWS } = data;
const EMBED = new URLSearchParams(window.location.search).get("embed") === "1";

const STORY_FILTERS = ["all", "flipped", "monster", "hard"];
const TYPE_FILTERS = ["all", "ground_ball", "line_drive", "fly_ball", "popup"];

function Chip({ on, children, onClick }) {
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

export default function App() {
  const [sel, setSel] = useState(null);
  const [story, setStory] = useState("all");
  const [type, setType] = useState("all");
  const rootRef = useRef(null);

  // iframe embed: report rendered height to the parent page
  useEffect(() => {
    if (!EMBED || !rootRef.current) return;
    const post = () =>
      window.parent.postMessage(
        { type: "fenway-mead:height", height: rootRef.current.offsetHeight },
        "*",
      );
    const obs = new ResizeObserver(post);
    obs.observe(rootRef.current);
    post();
    return () => obs.disconnect();
  }, []);

  const rows = useMemo(
    () =>
      ROWS.filter((r) => {
        if (story === "flipped" && !r.pflip) return false;
        if (story === "monster" && !(r.seg === "Green Monster" && r.hf != null)) return false;
        if (story === "hard" && r.ev < 95) return false;
        if (type !== "all" && r.bb !== type) return false;
        return true;
      }),
    [story, type],
  );

  const selRow = sel != null ? ROWS[sel] : null;

  const parkHits = meta.expected_line.H.mean - meta.neutral_line.H.mean;
  const stats = [
    [COPY.stats.actualHr, meta.actual_hr],
    [COPY.stats.neutralHr, `${meta.neutral_line.HR.mean}`, `95% CI ${meta.neutral_line.HR.ci[0]}–${meta.neutral_line.HR.ci[1]}`],
    [COPY.stats.expectedHr, `${meta.expected_fenway_hr}`, `95% CI ${meta.expected_fenway_hr_ci[0]}–${meta.expected_fenway_hr_ci[1]}`],
    [COPY.stats.parkHits, `${parkHits > 0 ? "+" : ""}${parkHits.toFixed(1)}`],
  ];

  return (
    <div ref={rootRef} className={EMBED ? "py-2" : "py-8"}>
      <main className="mx-auto max-w-2xl px-4">
        {!EMBED && (
          <header className="mb-5 border-b-2 border-gray-200 pb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-500">
              {COPY.kicker}
            </div>
            <h1 className="mt-1 text-4xl">
              {COPY.titleName} <span className="font-normal text-gray-500">{COPY.titleJoin}</span> {COPY.titlePark}
            </h1>
            <p className="mt-2 mb-0 text-gray-600">{COPY.dek}</p>
          </header>
        )}

        {/* summary strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {stats.map(([label, value, sub]) => (
            <div key={label} className="rounded border border-gray-200 bg-white px-2 py-2 text-center shadow-sm">
              <div className="font-mono text-2xl font-semibold text-gray-800">{value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
              {sub && <div className="text-[10px] font-mono text-gray-500">{sub}</div>}
            </div>
          ))}
        </div>

        {/* filters */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {STORY_FILTERS.map((k) => (
            <Chip key={k} on={story === k} onClick={() => setStory(k)}>{COPY.filters[k]}</Chip>
          ))}
          <span className="mx-1 hidden border-l border-gray-300 sm:inline" aria-hidden="true" />
          {TYPE_FILTERS.map((k) => (
            <Chip key={k} on={type === k} onClick={() => setType(k)}>
              {k === "all" ? COPY.filters.allTypes : COPY.filters[k]}
            </Chip>
          ))}
        </div>

        <SprayChart rows={rows} sel={sel} onSelect={setSel} />

        {/* legend */}
        <div className="mt-2 mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
          {Object.entries(OUTCOME_COLOR).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: c, border: k === "Out" ? "1px solid #666666" : "none" }}
              />
              {OUTCOME_LABEL[k]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded-full border border-gray-800 opacity-60" />
            {COPY.legendFlips}
          </span>
          <span className="ml-auto font-mono text-[10px] text-gray-500">
            {COPY.ballsShown(rows.length, ROWS.length)}
          </span>
        </div>

        <DetailCard r={selRow} />

        <div className="mt-4">
          <StatLine meta={meta} />
        </div>

        {!EMBED ? (
          <footer className="mt-5 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
            <p className="mb-0">{COPY.footnote(meta.vintage, meta.n_bbe, meta.no_track_excluded)}</p>
          </footer>
        ) : (
          <div className="mt-2 text-right text-[11px]">
            <a href={window.location.pathname} target="_blank" rel="noopener">
              {COPY.openFull}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
