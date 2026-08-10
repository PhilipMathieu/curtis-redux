import { useEffect, useMemo, useRef, useState } from "react";
import league from "./league.json";
import { COPY } from "./copy.js";
import { BAT_ORDER, PIT_ORDER, fmtDate, fmtPts } from "./lib/viz.js";
import ProgressChart from "./components/ProgressChart.jsx";
import AttributionBars from "./components/AttributionBars.jsx";
import CategoryHeatmap from "./components/CategoryHeatmap.jsx";

const params = new URLSearchParams(window.location.search);
const EMBED = params.get("embed") === "1";

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

function Section({ title, sub, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-1 mb-3 text-xs leading-snug text-gray-500">{sub}</p>
      {children}
    </section>
  );
}

export default function LeagueApp() {
  const rootRef = useRef(null);
  const { teams, categories, days, series, current } = league;
  const nTeams = teams.length;

  const batCats = BAT_ORDER.map((id) => categories.find((c) => c.statId === id)).filter(Boolean);
  const pitCats = PIT_ORDER.map((id) => categories.find((c) => c.statId === id)).filter(Boolean);

  // Teams sorted by current total — the shared order for every chart.
  const { order, split, byTeam } = useMemo(() => {
    const byTeam = {};
    for (const t of teams) {
      const points = {};
      const values = {};
      let bat = 0;
      let pit = 0;
      for (const c of categories) {
        const pts = series[t.id].byCat[c.statId].at(-1);
        points[c.statId] = pts;
        const v = current[t.id].espnValues?.[c.statId];
        values[c.statId] = v ?? current[t.id].values[c.statId];
        if (BAT_ORDER.includes(c.statId)) bat += pts;
        else pit += pts;
      }
      byTeam[t.id] = { points, values, bat, pit, total: bat + pit };
    }
    const order = [...teams].sort((a, b) => byTeam[b.id].total - byTeam[a.id].total);
    const split = Object.fromEntries(
      teams.map((t) => [t.id, { bat: byTeam[t.id].bat, pit: byTeam[t.id].pit, total: byTeam[t.id].total }]),
    );
    return { order, split, byTeam };
  }, [teams, categories, series, current]);

  const [selected, setSelected] = useState(order[0].id);

  // headline stats
  const leader = { ...order[0], total: byTeam[order[0].id].total };
  const second = { ...order[1], total: byTeam[order[1].id].total };
  const hot = useMemo(() => {
    const span = Math.min(30, days.length - 1);
    let best = null;
    for (const t of teams) {
      const tot = series[t.id].totals;
      const delta = tot.at(-1) - tot[tot.length - 1 - span];
      if (!best || delta > best.delta) best = { ...t, delta };
    }
    return best;
  }, [teams, series, days]);
  const swing = useMemo(() => {
    let best = null;
    for (const t of teams) {
      const tot = series[t.id].totals;
      const lo = Math.min(...tot);
      const hi = Math.max(...tot);
      if (!best || hi - lo > best.range) best = { ...t, lo, hi, range: hi - lo };
    }
    return best;
  }, [teams, series]);

  const catLine = (teamId, group) => {
    const cats = group === "bat" ? batCats : pitCats;
    return cats
      .map((c) => `${c.abbrev} ${fmtPts(byTeam[teamId].points[c.statId])}`)
      .join(" · ");
  };

  // iframe embed: report rendered height to the parent page
  useEffect(() => {
    if (!EMBED || !rootRef.current) return;
    const post = () =>
      window.parent.postMessage({ type: "league:height", height: rootRef.current.offsetHeight }, "*");
    const obs = new ResizeObserver(post);
    obs.observe(rootRef.current);
    post();
    return () => obs.disconnect();
  }, []);

  const tiles = [
    [COPY.stats.leader, leader.abbrev, `${leader.name} — ${fmtPts(leader.total)} pts`],
    [COPY.stats.gap, fmtPts(leader.total - second.total), `${second.name} sits second at ${fmtPts(second.total)}`],
    [COPY.stats.hot, `${hot.abbrev} +${fmtPts(hot.delta)}`, COPY.hotHover(hot.name, hot.delta)],
    [COPY.stats.swing, `${swing.abbrev} ${fmtPts(swing.range)}`, COPY.swingHover(swing.name, swing.lo, swing.hi)],
  ];

  return (
    <div ref={rootRef} className={EMBED ? "py-2" : "py-8"}>
      <main className="mx-auto max-w-3xl px-4">
        {!EMBED && (
          <header className="mb-5 border-b-2 border-gray-200 pb-4">
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-primary-500">
              {COPY.kicker(league.league)}
            </div>
            <h1 className="mt-1 text-4xl">{COPY.title}</h1>
            <p className="mt-2 mb-0 text-gray-600">
              {COPY.dek(leader, second, leader.total - second.total)}
            </p>
          </header>
        )}

        {/* summary strip */}
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tiles.map(([label, value, hover]) => (
            <div
              key={label}
              className="rounded border border-gray-200 bg-white px-2 py-2 text-center shadow-sm"
              title={hover}
            >
              <div className="font-mono text-2xl font-semibold text-gray-800">{value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        {/* team selector — scopes the emphasis in every chart below */}
        <div className="mb-2 flex flex-wrap gap-1.5">
          {order.map((t) => (
            <Chip key={t.id} on={selected === t.id} onClick={() => setSelected(t.id)}>
              {t.abbrev}
            </Chip>
          ))}
        </div>

        <Section title={COPY.progress.title} sub={COPY.progress.sub}>
          <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
            <ProgressChart
              days={days}
              teams={teams}
              series={series}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        </Section>

        <Section title={COPY.split.title} sub={COPY.split.sub}>
          <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
            <AttributionBars
              order={order}
              split={split}
              selected={selected}
              onSelect={setSelected}
              catLine={catLine}
            />
          </div>
        </Section>

        <Section title={COPY.matrix.title} sub={COPY.matrix.sub}>
          <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">
            <CategoryHeatmap
              order={order}
              batCats={batCats}
              pitCats={pitCats}
              byTeam={byTeam}
              nTeams={nTeams}
              selected={selected}
              onSelect={setSelected}
            />
          </div>
        </Section>

        {!EMBED ? (
          <footer className="mt-5 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
            <p className="mb-1">{COPY.footnote(fmtDate(league.fetched))}</p>
            <p className="mb-0">
              <a
                href={`https://fantasy.espn.com/baseball/league?leagueId=${league.league.id}`}
                target="_blank"
                rel="noopener"
              >
                {COPY.espnLink}
              </a>
              {" · "}
              <a href="./index.html">{COPY.fenwayLink}</a>
            </p>
          </footer>
        ) : (
          <div className="mt-2 text-right text-[11px]">
            <a href={`${window.location.pathname}`} target="_blank" rel="noopener">
              Open full page
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
