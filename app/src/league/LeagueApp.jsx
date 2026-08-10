import { useEffect, useMemo, useRef } from "react";
import league from "./league.json";
import { COPY } from "./copy.js";
import { BAT_ORDER, PIT_ORDER, EMPHASIS, fmtDate, fmtPts } from "./lib/viz.js";
import RaceLine from "./components/RaceLine.jsx";
import MomentumStrip from "./components/MomentumStrip.jsx";
import RungLadder from "./components/RungLadder.jsx";

const params = new URLSearchParams(window.location.search);
const EMBED = params.get("embed") === "1";

function Section({ title, sub, children }) {
  return (
    <section className="mt-6">
      <h2 className="text-xl">{title}</h2>
      <p className="mt-1 mb-3 text-xs leading-snug text-gray-500">{sub}</p>
      {children}
    </section>
  );
}

const Card = ({ children }) => (
  <div className="rounded border border-gray-200 bg-white p-3 shadow-sm">{children}</div>
);

export default function LeagueApp() {
  const rootRef = useRef(null);
  const { teams, categories, days, series } = league;

  const cats = [...BAT_ORDER, ...PIT_ORDER]
    .map((id) => categories.find((c) => c.statId === id))
    .filter(Boolean);

  const story = useMemo(() => {
    const order = [...teams].sort(
      (a, b) => series[b.id].totals.at(-1) - series[a.id].totals.at(-1),
    );
    // the race is between the top two; the trailing one is the chaser and
    // wears the site red
    const leader = order[0];
    const chaser = order[1];
    const gap = series[leader.id].totals.at(-1) - series[chaser.id].totals.at(-1);

    const span = Math.min(30, days.length - 1);
    const delta30 =
      series[chaser.id].totals.at(-1) -
      series[chaser.id].totals[series[chaser.id].totals.length - 1 - span];

    const leaderOn = (i) =>
      teams.reduce((best, t) => (series[t.id].totals[i] > series[best.id].totals[i] ? t : best), teams[0]).id;
    let takeoverIdx = 0;
    for (let i = 1; i < days.length; i++) if (leaderOn(i) !== leaderOn(i - 1)) takeoverIdx = i;
    const daysSinceChange = days.length - 1 - takeoverIdx;

    return { leader, chaser, gap, delta30, takeoverIdx, daysSinceChange };
  }, [teams, series, days]);

  const { leader, chaser, gap, delta30, takeoverIdx, daysSinceChange } = story;
  const colors = {
    leader: EMPHASIS[1].mark,
    leaderText: EMPHASIS[1].text,
    chaser: EMPHASIS[0].mark,
    chaserText: EMPHASIS[0].text,
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
    [COPY.stats.gap, fmtPts(gap), `${leader.name} ${fmtPts(series[leader.id].totals.at(-1))}, ${chaser.name} ${fmtPts(series[chaser.id].totals.at(-1))}`],
    [COPY.stats.hot(chaser.abbrev), `+${fmtPts(delta30)}`, `${chaser.name} over the last 30 days`],
    [COPY.stats.quiet, `${daysSinceChange}`, `${leader.name} took the lead on ${fmtDate(days[takeoverIdx])}`],
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
              {COPY.dek(leader, chaser, gap, delta30, fmtDate(days[takeoverIdx]))}
            </p>
          </header>
        )}

        <div className="mb-4 grid grid-cols-3 gap-2">
          {tiles.map(([label, value, hover]) => (
            <div key={label} className="rounded border border-gray-200 bg-white px-2 py-2 text-center shadow-sm" title={hover}>
              <div className="font-mono text-2xl font-semibold text-gray-800">{value}</div>
              <div className="text-[10px] font-medium uppercase tracking-wider text-gray-500">{label}</div>
            </div>
          ))}
        </div>

        <Section title={COPY.race.title} sub={COPY.race.sub}>
          <Card>
            <RaceLine
              days={days}
              teams={teams}
              series={series}
              leader={leader}
              chaser={chaser}
              colors={colors}
              takeoverIdx={takeoverIdx}
              delta30={delta30}
            />
          </Card>
        </Section>

        <Section title={COPY.momentum.title} sub={COPY.momentum.sub}>
          <Card>
            <MomentumStrip teams={teams} series={series} leader={leader} chaser={chaser} colors={colors} />
          </Card>
        </Section>

        <Section title={COPY.rungs.title} sub={COPY.rungs.sub}>
          <Card>
            <RungLadder teams={teams} cats={cats} current={league.current} leader={leader} chaser={chaser} colors={colors} />
          </Card>
        </Section>

        {!EMBED ? (
          <footer className="mt-5 border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
            <p className="mb-1">{COPY.footnote(fmtDate(league.fetched))}</p>
            <p className="mb-0">
              <a href={`https://fantasy.espn.com/baseball/league?leagueId=${league.league.id}`} target="_blank" rel="noopener">
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
