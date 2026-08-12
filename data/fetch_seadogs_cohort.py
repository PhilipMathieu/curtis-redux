"""Pull the 2023 Portland Sea Dogs full-season roster and follow each
player forward through the Red Sox system and the majors, using MLB
StatsAPI. Emits app/src/pipeline_cohort.json so the app can render the
real numbers instead of an industry-shape approximation.

Only real levels count — we do not synthesize anything. A player is
counted as having "reached AAA" only if StatsAPI puts them on Worcester
in a season 2023-2026; "reached MLB" only if they show up on any MLB
club's roster in the same window.

Re-run whenever a new season is complete: `uv run python
data/fetch_seadogs_cohort.py`.
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
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if attempt == 2 or e.code < 500:
                raise
        time.sleep(1 + attempt)
    raise RuntimeError("unreachable")


def roster(team_id: int, season: int) -> list[dict]:
    d = get(f"{BASE}/teams/{team_id}/roster?season={season}&rosterType=fullSeason")
    return d.get("roster", []) or []


def mlb_teams(season: int) -> list[int]:
    d = get(f"{BASE}/teams?sportId=1&season={season}")
    return [t["id"] for t in d["teams"]]


def pos(entry: dict) -> str:
    return entry.get("position", {}).get("abbreviation") or "-"


def main() -> None:
    print(f"Fetching {COHORT_SEASON} Portland Sea Dogs roster...", file=sys.stderr)
    sea_dogs = roster(PORTLAND_ID, COHORT_SEASON)
    cohort = {p["person"]["id"]: {"name": p["person"]["fullName"], "pos": pos(p)} for p in sea_dogs}
    print(f"  cohort size: {len(cohort)}", file=sys.stderr)

    # For each tracked season, build sets: everyone who appeared on any MLB
    # team, plus per-BOS-affiliate rosters.
    mlb_appearance: dict[int, set[int]] = {}
    mlb_team_by_player: dict[int, dict[int, str]] = {p: {} for p in cohort}
    bos_appearance: dict[str, dict[int, set[int]]] = {lvl: {} for lvl in BOS_AFFILIATES}

    for season in TRACK_SEASONS:
        print(f"season {season}: MLB rosters...", file=sys.stderr)
        mlb_ids: set[int] = set()
        for team_id in mlb_teams(season):
            for entry in roster(team_id, season):
                pid = entry["person"]["id"]
                mlb_ids.add(pid)
                if pid in cohort:
                    # Track which MLB team; first-touched wins per season.
                    mlb_team_by_player[pid].setdefault(season, entry.get("parentOrgName") or "?")
                    # Prefer the actual team name.
                    tinfo = get(f"{BASE}/teams/{team_id}?season={season}")
                    tname = tinfo["teams"][0]["name"] if tinfo.get("teams") else "?"
                    mlb_team_by_player[pid][season] = tname
        mlb_appearance[season] = mlb_ids

        for lvl, (team_id, _, _) in BOS_AFFILIATES.items():
            if lvl == "MLB":
                continue
            r = roster(team_id, season)
            bos_appearance[lvl][season] = {e["person"]["id"] for e in r}

    # Per-player path across 2023-26: for each season, the highest level they
    # appeared on inside the BOS system, and separately whether they made MLB
    # (with which team).
    LEVEL_ORDER = ["MLB", "AAA", "AA", "A+", "A", "R (FCL)", "R (DSL Blue)", "R (DSL Red)"]

    def player_path(pid: int) -> list[dict]:
        rows = []
        for season in TRACK_SEASONS:
            stops = []
            # BOS-system stops.
            for lvl in LEVEL_ORDER[1:]:  # skip MLB
                if pid in bos_appearance.get(lvl, {}).get(season, set()):
                    stops.append({"level": lvl, "team": BOS_AFFILIATES[lvl][1]})
            # MLB — Boston or elsewhere.
            if pid in mlb_appearance.get(season, set()):
                team = mlb_team_by_player[pid].get(season, "MLB")
                stops.append({"level": "MLB", "team": team})
            if stops:
                rows.append({"season": season, "stops": stops})
        return rows

    players = []
    for pid, meta in cohort.items():
        path = player_path(pid)
        # Determine highest level reached during the tracking window.
        highest = None
        reached_woo = any(
            any(s["level"] == "AAA" for s in row["stops"]) for row in path
        )
        reached_mlb_any = any(
            any(s["level"] == "MLB" for s in row["stops"]) for row in path
        )
        reached_mlb_bos = any(
            any(s["level"] == "MLB" and s["team"] == "Boston Red Sox" for s in row["stops"])
            for row in path
        )
        players.append(
            {
                "id": pid,
                "name": meta["name"],
                "pos": meta["pos"],
                "path": path,
                "reached_woo": reached_woo,
                "reached_mlb_any": reached_mlb_any,
                "reached_mlb_bos": reached_mlb_bos,
            }
        )

    # Sort so the app can render a stable list.
    players.sort(key=lambda p: (not p["reached_mlb_bos"], not p["reached_mlb_any"], not p["reached_woo"], p["name"]))

    summary = {
        "cohort_season": COHORT_SEASON,
        "track_seasons": list(TRACK_SEASONS),
        "cohort_size": len(cohort),
        "reached_woo": sum(1 for p in players if p["reached_woo"]),
        "reached_mlb_any": sum(1 for p in players if p["reached_mlb_any"]),
        "reached_mlb_bos": sum(1 for p in players if p["reached_mlb_bos"]),
    }
    payload = {"summary": summary, "players": players}

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2))
    print(json.dumps(summary, indent=2))
    print(f"wrote {OUT_PATH.relative_to(OUT_PATH.parent.parent.parent)}", file=sys.stderr)


if __name__ == "__main__":
    main()
