import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import roster from "./roster.json";
import { COPY } from "./copy.js";
import { OUTCOME_COLOR, OUTCOME_LABEL } from "./lib/field.js";
import SprayChart from "./components/SprayChart.jsx";
import DetailCard from "./components/DetailCard.jsx";
import PlayerNav from "./components/PlayerNav.jsx";
import StatLine from "./components/StatLine.jsx";
import TransitionMatrix from "./components/TransitionMatrix.jsx";
import PipelinePage from "./components/PipelinePage.jsx";

const PLAYERS = roster.players;
// One JSON per player, code-split: a page only downloads its own hitter.
const DATA = import.meta.glob("./players/*.json");
const AVAILABLE = Object.keys(DATA).map((p) => p.slice("./players/".length, -".json".length));
const DEFAULT_SLUG = PLAYERS.find((p) => AVAILABLE.includes(p.slug))?.slug ?? PLAYERS[0].slug;

const params = new URLSearchParams(window.location.search);
const EMBED = params.get("embed") === "1";

function slugFromUrl() {
  const q = new URLSearchParams(window.location.search).get("player");
  return PLAYERS.some((p) => p.slug === q) ? q : DEFAULT_SLUG;
}

function viewFromUrl() {
  return new URLSearchParams(window.location.search).get("view") === "pipeline"
    ? "pipeline"
    : "player";
}

const STORY_FILTERS = ["all", "flipped", "monster"];

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
  const [slug, setSlug] = useState(slugFromUrl);
  const [view, setView] = useState(viewFromUrl);
  const [payload, setPayload] = useState(null);
  const [sel, setSel] = useState(null);
  const [story, setStory] = useState("all");
  const rootRef = useRef(null);
  const player = PLAYERS.find((p) => p.slug === slug);

  // back/forward between pages
  useEffect(() => {
    const onPop = () => {
      setSlug(slugFromUrl());
      setView(viewFromUrl());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const go = useCallback((next) => {
    const url = new URL(window.location.href);
    url.searchParams.set("player", next);
    url.searchParams.delete("view");
    window.history.pushState({}, "", url);
    setSlug(next);
    setView("player");
  }, []);

  const goPipeline = useCallback(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("view", "pipeline");
    url.searchParams.delete("player");
    window.history.pushState({}, "", url);
    setView("pipeline");
  }, []);

  // load the selected player's batted balls; ignore a stale resolve if the
  // reader clicked through to another player mid-flight
  useEffect(() => {
    let live = true;
    setPayload(null);
    setSel(null);
    setStory("all");
    const load = DATA[`./players/${slug}.json`];
    if (!load) return;
    load().then((mod) => {
      if (live) setPayload(mod.default ?? mod);
    });
    return () => {
      live = false;
    };
  }, [slug]);

  useEffect(() => {
    if (EMBED) return;
    document.title = view === "pipeline" ? `${COPY.pipeline.title} — ${COPY.siteTitle}` : COPY.pageTitle(player);
  }, [player, view]);

  // iframe embed: report rendered height to the parent page
  useEffect(() => {
    if (!EMBED || !rootRef.current) return;
    const post = () =>
      window.parent.postMessage(
        { type: "fenway-mead:height", player: slug, height: rootRef.current.offsetHeight },
        "*",
      );
    const obs = new ResizeObserver(post);
    obs.observe(rootRef.current);
    post();
    return () => obs.disconnect();
  }, [slug]);

  const meta = payload?.meta;
  const allRows = useMemo(() => payload?.rows ?? [], [payload]);
  const hands = useMemo(() => Object.keys(meta?.hands ?? {}), [meta]);
  const filters = hands.length > 1 ? [...STORY_FILTERS, ...hands] : STORY_FILTERS;

  const rows = useMemo(
    () =>
      allRows.filter((r) => {
        if (story === "flipped" && !r.pflip) return false;
        if (story === "monster" && !(r.seg === "Green Monster" && r.hf != null)) return false;
        if ((story === "L" || story === "R") && r.stand !== story) return false;
        return true;
      }),
    [allRows, story],
  );

  // look up by id (not index) and drop the selection if filters hide it
  const selRow = sel != null ? rows.find((r) => r.id === sel) ?? null : null;
  useEffect(() => {
    if (sel != null && !rows.some((r) => r.id === sel)) setSel(null);
  }, [rows, sel]);

  const stats = meta
    ? [
        [COPY.stats.actualHr, meta.actual_hr],
        [COPY.stats.neutralHr, `${meta.neutral_line.HR.mean}`, COPY.rangeHover(meta.neutral_line.HR.ci)],
        [COPY.stats.expectedHr, `${meta.expected_fenway_hr}`, COPY.rangeHover(meta.expected_fenway_hr_ci)],
        [
          COPY.stats.parkHits,
          `${meta.expected_line.H.mean - meta.neutral_line.H.mean > 0 ? "+" : ""}` +
            `${(meta.expected_line.H.mean - meta.neutral_line.H.mean).toFixed(1)}`,
        ],
      ]
    : []; // [label, value, hoverDetail?]

  const isPipeline = view === "pipeline" && !EMBED;

  return (
    <div ref={rootRef} className={EMBED ? "py-2" : "py-8"}>
      <main className="mx-auto max-w-2xl px-4">
        {!EMBED && !isPipeline && (
          <header className="mb-5 border-b-2 border-gray-200 pb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-500">
              {COPY.kicker(player)}
            </div>
            <h1 className="mt-1 text-4xl">
              {COPY.titleName(player)}{" "}
              <span className="font-normal text-gray-500">{COPY.titleJoin}</span> {COPY.titlePark}
            </h1>
            <p className="mt-2 mb-0 text-gray-600">{COPY.dek(player)}</p>
          </header>
        )}

        <PlayerNav
          players={PLAYERS}
          slug={isPipeline ? null : slug}
          available={AVAILABLE}
          onSelect={go}
          onPipeline={goPipeline}
          onPipelineActive={isPipeline}
        />

        {isPipeline ? (
          <PipelinePage />
        ) : !meta ? (
          <p className="rounded border border-dashed border-gray-300 bg-white p-6 text-center text-gray-500">
            {AVAILABLE.includes(slug) ? COPY.loading(player) : COPY.noData(player)}
          </p>
        ) : (
          <>
            {/* summary strip */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {stats.map(([label, value, hover]) => (
                <div
                  key={label}
                  className="rounded border border-gray-200 bg-white px-2 py-2 text-center shadow-sm"
                  title={hover}
                >
                  <div className="font-mono text-2xl font-semibold text-gray-800">{value}</div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                    {label}
                  </div>
                </div>
              ))}
            </div>

            {/* part-time bats: Rogers at 67 batted balls and White at 102 carry
                intervals wide enough that the point estimates mislead on their own */}
            {meta.n_bbe < 120 && (
              <p className="mb-4 rounded border border-gray-200 bg-white px-3 py-2 text-[11px] leading-snug text-gray-600">
                {COPY.thinSample(meta.n_bbe)}
              </p>
            )}

            {/* filters */}
            <div className="mb-2 flex flex-wrap gap-1.5">
              {filters.map((k) => (
                <Chip key={k} on={story === k} onClick={() => setStory(k)}>
                  {COPY.filters[k]}
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
                {COPY.ballsShown(rows.length, allRows.length)}
              </span>
            </div>

            <DetailCard r={selRow} switchHitter={hands.length > 1} />

            <div className="mt-4">
              <StatLine meta={meta} />
            </div>

            <div className="mt-4">
              <TransitionMatrix rows={allRows} />
            </div>
          </>
        )}

        {!EMBED && !isPipeline ? (
          <footer className="mt-5 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
            <p className="mb-0">{meta ? COPY.footnote(meta, player.short) : COPY.navHint}</p>
          </footer>
        ) : !EMBED ? null : (
          <div className="mt-2 text-right text-[11px]">
            <a href={`${window.location.pathname}?player=${slug}`} target="_blank" rel="noopener">
              {COPY.openFull}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
