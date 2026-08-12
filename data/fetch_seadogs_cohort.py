"""Pull the 2023 Portland Sea Dogs full-season roster and follow each
player forward through the Red Sox system and the majors, using MLB
StatsAPI. Emits app/src/pipeline_cohort.json so the app can render the
real numbers instead of an industry-shape approximation.

Only real levels count — we do not synthesize anything. A player is
counted as having "reached AAA" only if StatsAPI puts them on Worcester
in a season 2023-2026; "reached MLB" only if they show up on any MLB
club's roster in the same window.

Each player also carries a `debut_before_cohort` flag (via /people?
hydrate=mlbDebutDate) so the app can honestly separate rehab and depth
veterans from genuine AA→MLB prospects — the Sea Dogs' 2023 roster
included a chunk of MLB veterans on rehab (Story, Kluber, Bleier, …)
and inflating the headline conversion rate with them would be dishonest.

Re-run whenever a new season is complete:

  uv run python data/fetch_seadogs_cohort.py
"""

from __future__ import annotations
import json, sys, time, urllib.request, urllib.error
from pathlib import Path

BASE = "https://statsapi.mlb.com/api/v1"
COHORT_SEASON = 2023
TRACK_SEASONS = (2023, 2024, 2025, 2026)
PORTLAND_ID = 546
WORCESTER_ID = 533
BOSTON_ID = 111

# BOS affiliates present in Statcast today. Sport IDs: 1 MLB / 11 AAA /
# 12 AA / 13 A+ / 14 A / 16 R Complex / 17 R DSL.
BOS_AFFILIATES = {
    "MLB": (BOSTON_ID, "Boston Red Sox", 1),
    "AAA": (WORCESTER_ID, "Worcester Red Sox", 11),
    "AA": (PORTLAND_ID, "Portland Sea Dogs", 12),
    "A+": (428, "Greenville Drive", 13),
    "A": (414, "Salem Red Sox", 14),
    "R (FCL)": (471, "FCL Red Sox", 16),
    "R (DSL Blue)": (626, "DSL Red Sox Blue", 17),
    "R (DSL Red)": (627, "DSL Red Sox Red", 17),
}

OUT_PATH = Path(__file__).resolve().parent.parent / "app" / "src" / "pipeline_cohort.json"


def get(url: str) -> dict:
    """StatsAPI GET with polite retries. Sleeps on transient errors and
    surfaces the actual response body on the final failure so a broken
    field name doesn't just look like a 400."""
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            body = e.read()[:400].decode(errors="replace") if hasattr(e, "read") else ""
            if attempt == 3 or (e.code < 500 and e.code != 429):
                raise RuntimeError(f"HTTP {e.code} on {url}: {body}") from e
        except urllib.error.URLError:
            if attempt == 3:
                raise
        time.sleep(2 ** attempt)
    raise RuntimeError("unreachable")


def roster(team_id: int, season: int) -> list[dict]:
    d = get(f"{BASE}/teams/{team_id}/roster?season={season}&rosterType=fullSeason")
    return d.get("roster", []) or []


def mlb_teams_index(season: int) -> dict[int, str]:
    """{team_id: team_name} for every MLB club that season."""
    d = get(f"{BASE}/teams?sportId=1&season={season}")
    return {t["id"]: t["name"] for t in d["teams"]}


def pos(entry: dict) -> str:
    return entry.get("position", {}).get("abbreviation") or "-"


def hydrate_debut_dates(pids: list[int]) -> dict[int, str | None]:
    """Batched /people?personIds=...&hydrate=mlbDebutDate lookup."""
    out: dict[int, str | None] = {}
    for i in range(0, len(pids), 60):
        chunk = pids[i : i + 60]
        d = get(f"{BASE}/people?personIds={','.join(str(x) for x in chunk)}&hydrate=mlbDebutDate")
        for person in d.get("people", []):
            out[person["id"]] = person.get("mlbDebutDate")
    return out


def main() -> None:
    print(f"Fetching {COHORT_SEASON} Portland Sea Dogs roster...", file=sys.stderr)
    sea_dogs = roster(PORTLAND_ID, COHORT_SEASON)
    cohort = {p["person"]["id"]: {"name": p["person"]["fullName"], "pos": pos(p)} for p in sea_dogs}
    print(f"  cohort size: {len(cohort)}", file=sys.stderr)

    # Debut date per player — anyone with an mlbDebutDate before the
    # cohort season was a big-league guy already, on rehab or org depth.
    print("Hydrating MLB debut dates...", file=sys.stderr)
    debut = hydrate_debut_dates(list(cohort))

    # For each tracked season: which MLB team (if any) each cohort player
    # was on. We prefer the first Boston appearance if there is one, then
    # the first non-Boston appearance, so a player who logged both in one
    # year still shows Boston on their card.
    mlb_team_by_player: dict[int, dict[int, str]] = {p: {} for p in cohort}
    bos_appearance: dict[str, dict[int, set[int]]] = {lvl: {} for lvl in BOS_AFFILIATES}
    reached_mlb: dict[int, set[int]] = {}

    for season in TRACK_SEASONS:
        print(f"season {season}: MLB rosters...", file=sys.stderr)
        team_names = mlb_teams_index(season)
        mlb_ids: set[int] = set()
        for team_id, team_name in team_names.items():
            for entry in roster(team_id, season):
                pid = entry["person"]["id"]
                mlb_ids.add(pid)
                if pid in cohort:
                    prev = mlb_team_by_player[pid].get(season)
                    if prev is None:
                        mlb_team_by_player[pid][season] = team_name
                    elif prev != "Boston Red Sox" and team_name == "Boston Red Sox":
                        # Boston wins over any non-Boston appearance in the same year.
                        mlb_team_by_player[pid][season] = team_name
        reached_mlb[season] = mlb_ids

        for lvl, (team_id, _, _) in BOS_AFFILIATES.items():
            if lvl == "MLB":
                continue
            r = roster(team_id, season)
            bos_appearance[lvl][season] = {e["person"]["id"] for e in r}

    LEVEL_ORDER = ["AAA", "AA", "A+", "A", "R (FCL)", "R (DSL Blue)", "R (DSL Red)"]

    def player_path(pid: int) -> list[dict]:
        rows = []
        for season in TRACK_SEASONS:
            stops = []
            for lvl in LEVEL_ORDER:
                if pid in bos_appearance.get(lvl, {}).get(season, set()):
                    stops.append({"level": lvl, "team": BOS_AFFILIATES[lvl][1]})
            if pid in reached_mlb.get(season, set()):
                team = mlb_team_by_player[pid].get(season, "MLB")
                stops.append({"level": "MLB", "team": team})
            if stops:
                rows.append({"season": season, "stops": stops})
        return rows

    players = []
    for pid, meta in cohort.items():
        path = player_path(pid)
        reached_woo = any(any(s["level"] == "AAA" for s in row["stops"]) for row in path)
        reached_mlb_any = any(any(s["level"] == "MLB" for s in row["stops"]) for row in path)
        reached_mlb_bos = any(
            any(s["level"] == "MLB" and s["team"] == "Boston Red Sox" for s in row["stops"])
            for row in path
        )
        debut_date = debut.get(pid) or ""
        # Debuted in an MLB game before Jan 1 of the cohort season → rehab
        # or org-depth vet, not a genuine AA→MLB prospect.
        debut_before_cohort = bool(debut_date) and debut_date < f"{COHORT_SEASON}-01-01"
        players.append(
            {
                "id": pid,
                "name": meta["name"],
                "pos": meta["pos"],
                "mlb_debut": debut_date or None,
                "debut_before_cohort": debut_before_cohort,
                "path": path,
                "reached_woo": reached_woo,
                "reached_mlb_any": reached_mlb_any,
                "reached_mlb_bos": reached_mlb_bos,
            }
        )

    # Sort so the app can render a stable list.
    players.sort(
        key=lambda p: (
            not p["reached_mlb_bos"],
            not p["reached_mlb_any"],
            not p["reached_woo"],
            p["name"],
        )
    )

    def count(pred) -> int:
        return sum(1 for p in players if pred(p))

    prospect = lambda p: not p["debut_before_cohort"]
    vet = lambda p: p["debut_before_cohort"]

    summary = {
        "cohort_season": COHORT_SEASON,
        "track_seasons": list(TRACK_SEASONS),
        "cohort_size": len(cohort),
        # Vets already in the majors before the cohort year — the "rehab
        # and depth" bucket the app should split off in the headline.
        "prior_mlb_vets": count(vet),
        # Whole-cohort counts (include vets).
        "reached_woo": count(lambda p: p["reached_woo"]),
        "reached_mlb_any": count(lambda p: p["reached_mlb_any"]),
        "reached_mlb_bos": count(lambda p: p["reached_mlb_bos"]),
        # Prospect-only counts (exclude vets) — the honest conversion story.
        "prospect_count": count(prospect),
        "prospect_reached_woo": count(lambda p: prospect(p) and p["reached_woo"]),
        "prospect_reached_mlb_any": count(lambda p: prospect(p) and p["reached_mlb_any"]),
        "prospect_reached_mlb_bos": count(lambda p: prospect(p) and p["reached_mlb_bos"]),
    }
    payload = {"summary": summary, "players": players}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2))
    print(json.dumps(summary, indent=2))
    print(f"wrote {OUT_PATH.relative_to(OUT_PATH.parent.parent.parent)}", file=sys.stderr)


if __name__ == "__main__":
    main()
