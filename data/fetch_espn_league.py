"""Pull ESPN fantasy baseball league 45839 and rebuild the roto dataset.

ESPN's fantasy hosts aren't reachable from every sandbox, so like the
Statcast pipeline this is meant to run where the API is reachable — locally
or via .github/workflows/league-data.yml — and the small JSON it emits is
committed.

Two subcommands:

    python3 data/fetch_espn_league.py probe   # dump response shapes to stdout
    python3 data/fetch_espn_league.py build   # write app/src/league/league.json

Roto standings history isn't stored by ESPN, so `build` reconstructs it:
for every scoring period it pulls that day's lineups (mRoster keeps
historical daily lineups), sums each starter's daily stat line into team
totals, and re-ranks the cumulative categories day by day. The final day is
checked against ESPN's own mStandings values.

A private league needs ESPN_S2 and SWID in the environment.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import date, timedelta
from pathlib import Path

LEAGUE_ID = 45839
SEASON = 2026
BASE = (
    "https://lm-api-reads.fantasy.espn.com/apis/v3/games/flb/"
    f"seasons/{SEASON}/segments/0/leagues/{LEAGUE_ID}"
)
OUT = Path(__file__).resolve().parent.parent / "app" / "src" / "league" / "league.json"

# Lineup slots whose stats don't count toward the team's totals.
NON_COUNTING_SLOTS = {16, 17}  # BE, IL

# ESPN MLB stat ids → labels, batting and pitching. Only the ones a roto
# league plausibly scores, plus the raw components ratios are derived from.
STAT_NAMES = {
    0: ("AB", "At Bats", "batting"),
    1: ("H", "Hits", "batting"),
    2: ("AVG", "Batting Average", "batting"),
    3: ("2B", "Doubles", "batting"),
    4: ("3B", "Triples", "batting"),
    5: ("HR", "Home Runs", "batting"),
    8: ("TB", "Total Bases", "batting"),
    9: ("SLG", "Slugging Pct", "batting"),
    10: ("BB", "Walks", "batting"),
    12: ("HBP", "Hit By Pitch", "batting"),
    13: ("SF", "Sac Flies", "batting"),
    16: ("PA", "Plate Appearances", "batting"),
    17: ("OBP", "On-Base Pct", "batting"),
    18: ("OPS", "On-Base Plus Slugging", "batting"),
    20: ("R", "Runs", "batting"),
    21: ("RBI", "Runs Batted In", "batting"),
    23: ("SB", "Stolen Bases", "batting"),
    24: ("CS", "Caught Stealing", "batting"),
    25: ("SB-CS", "Net Steals", "batting"),
    27: ("SO", "Strikeouts (batter)", "batting"),
    34: ("OUTS", "Outs Recorded", "pitching"),
    35: ("TBF", "Batters Faced", "pitching"),
    37: ("HA", "Hits Allowed", "pitching"),
    39: ("BBA", "Walks Allowed", "pitching"),
    41: ("WHIP", "Walks+Hits per IP", "pitching"),
    45: ("ER", "Earned Runs", "pitching"),
    46: ("HRA", "Home Runs Allowed", "pitching"),
    47: ("ERA", "Earned Run Average", "pitching"),
    48: ("K", "Strikeouts (pitcher)", "pitching"),
    53: ("W", "Wins", "pitching"),
    54: ("L", "Losses", "pitching"),
    57: ("SV", "Saves", "pitching"),
    58: ("BS", "Blown Saves", "pitching"),
    60: ("HLD", "Holds", "pitching"),
    63: ("QS", "Quality Starts", "pitching"),
    83: ("SVHD", "Saves Plus Holds", "pitching"),
}

# Ratio categories, derived from accumulated components rather than summed.
def _ip(acc):
    return acc.get(34, 0.0) / 3.0

DERIVED = {
    2: lambda a: _safe_div(a.get(1, 0.0), a.get(0, 0.0)),  # AVG = H/AB
    9: lambda a: _safe_div(a.get(8, 0.0), a.get(0, 0.0)),  # SLG = TB/AB
    17: lambda a: _safe_div(  # OBP = (H+BB+HBP)/(AB+BB+HBP+SF)
        a.get(1, 0.0) + a.get(10, 0.0) + a.get(12, 0.0),
        a.get(0, 0.0) + a.get(10, 0.0) + a.get(12, 0.0) + a.get(13, 0.0),
    ),
    18: lambda a: (
        None
        if DERIVED[17](a) is None or DERIVED[9](a) is None
        else DERIVED[17](a) + DERIVED[9](a)
    ),  # OPS
    41: lambda a: _safe_div(a.get(37, 0.0) + a.get(39, 0.0), _ip(a)),  # WHIP
    47: lambda a: _safe_div(a.get(45, 0.0) * 9.0, _ip(a)),  # ERA
}


def _safe_div(num, den):
    return None if den == 0 else num / den


def fetch(params: dict, tries: int = 4) -> dict:
    """GET the league endpoint with the given query params."""
    query = "&".join(f"{k}={v}" for k, v in params.items())
    url = f"{BASE}?{query}" if query else BASE
    headers = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
    cookies = []
    if os.environ.get("ESPN_S2"):
        cookies.append(f"espn_s2={os.environ['ESPN_S2']}")
    if os.environ.get("SWID"):
        cookies.append(f"SWID={os.environ['SWID']}")
    if cookies:
        headers["Cookie"] = "; ".join(cookies)
    for attempt in range(tries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as err:
            if err.code in (401, 403):
                sys.exit(
                    f"HTTP {err.code} from ESPN — the league is private. "
                    "Set ESPN_S2 and SWID (repo secrets for the workflow)."
                )
            if attempt == tries - 1:
                raise
            time.sleep(2**attempt)
        except urllib.error.URLError:
            if attempt == tries - 1:
                raise
            time.sleep(2**attempt)
    raise AssertionError("unreachable")


# ---------------------------------------------------------------- probe ----


def probe() -> None:
    """Dump the response shapes the build relies on."""
    league = fetch({"view": "mSettings"})
    status = league.get("status", {})
    settings = league.get("settings", {})
    scoring = settings.get("scoringSettings", {})
    print("=== SETTINGS ===")
    print("name:", settings.get("name"))
    print("size:", settings.get("size"))
    print("scoringType:", scoring.get("scoringType"))
    print("playerRankType:", scoring.get("playerRankType"))
    print(
        "status: firstScoringPeriod=%s latestScoringPeriod=%s finalScoringPeriod=%s currentMatchupPeriod=%s isActive=%s"
        % (
            status.get("firstScoringPeriod"),
            status.get("latestScoringPeriod"),
            status.get("finalScoringPeriod"),
            status.get("currentMatchupPeriod"),
            status.get("isActive"),
        )
    )
    print("scoringItems:")
    for item in scoring.get("scoringItems", []):
        print("  ", json.dumps(item))
    print("statCategoryIds keys in scoringSettings:", sorted(scoring.keys()))

    standings = fetch({"view": "mStandings", "view2": "mTeam"})
    # ESPN ignores unknown params; ask for both views properly below.
    standings = fetch_views(["mStandings", "mTeam"])
    print("\n=== TEAMS / STANDINGS ===")
    for team in standings.get("teams", [])[:20]:
        record = team.get("record", {})
        print(
            "team id=%s abbrev=%r name=%r points=%s"
            % (
                team.get("id"),
                team.get("abbrev"),
                team.get("name"),
                team.get("points"),
            )
        )
        vbs = team.get("valuesByStat")
        pbs = team.get("pointsByStat")
        if vbs:
            print("   valuesByStat:", json.dumps(vbs))
        if pbs:
            print("   pointsByStat:", json.dumps(pbs))
        for key in team:
            if key not in {
                "id", "abbrev", "name", "logo", "points", "valuesByStat",
                "pointsByStat", "record", "owners", "playoffSeed",
                "rankCalculatedFinal", "primaryOwner", "divisionId",
                "currentProjectedRank", "draftDayProjectedRank",
                "isActive", "logoType", "rankFinal", "transactionCounter",
                "waiverRank", "pendingTransactions", "roster",
            }:
                print("   extra key:", key)
        break  # full dump for one team is enough
    print("team count:", len(standings.get("teams", [])))
    for team in standings.get("teams", []):
        print(
            "  id=%s abbrev=%r name=%r points=%s"
            % (team.get("id"), team.get("abbrev"), team.get("name"), team.get("points"))
        )

    latest = status.get("latestScoringPeriod") or 100
    for period in (2, min(15, latest - 1), latest - 1):
        roster = fetch({"view": "mRoster", "scoringPeriodId": period})
        print(f"\n=== ROSTER period={period} ===")
        teams = roster.get("teams", [])
        if not teams:
            print("no teams in response")
            continue
        entries = teams[0].get("roster", {}).get("entries", [])
        print("entries for team", teams[0].get("id"), "count:", len(entries))
        for entry in entries[:3]:
            player = entry.get("playerPoolEntry", {}).get("player", {})
            print(
                "  slot=%s player=%r eligible=%s"
                % (
                    entry.get("lineupSlotId"),
                    player.get("fullName"),
                    player.get("eligibleSlots"),
                )
            )
            for st in player.get("stats", []):
                print(
                    "    stat entry: scoringPeriodId=%s sourceId=%s splitTypeId=%s externalId=%r nStats=%d"
                    % (
                        st.get("scoringPeriodId"),
                        st.get("statSourceId"),
                        st.get("statSplitTypeId"),
                        st.get("externalId"),
                        len(st.get("stats", {}) or {}),
                    )
                )
                if (
                    st.get("scoringPeriodId") == period
                    and st.get("statSourceId") == 0
                ):
                    print("      stats:", json.dumps(st.get("stats", {})))


def fetch_views(views: list[str]) -> dict:
    query = "&".join(f"view={v}" for v in views)
    url = f"{BASE}?{query}"
    headers = {"Accept": "application/json", "User-Agent": "Mozilla/5.0"}
    if os.environ.get("ESPN_S2"):
        headers["Cookie"] = (
            f"espn_s2={os.environ['ESPN_S2']}; SWID={os.environ.get('SWID', '')}"
        )
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


# ---------------------------------------------------------------- build ----


def roto_points(values: list, reverse: bool) -> list:
    """Standard roto scoring: best of N teams gets N points, ties averaged.

    None values (no AB/IP yet) rank below everything.
    """
    n = len(values)

    def sort_key(idx):
        val = values[idx]
        if val is None:
            return (0, 0.0)
        return (1, -val if reverse else val)

    order = sorted(range(n), key=sort_key)
    points = [0.0] * n
    i = 0
    while i < n:
        j = i
        while j + 1 < n and sort_key(order[j + 1]) == sort_key(order[i]):
            j += 1
        # positions i..j (0-based, worst first) share the averaged points
        shared = sum(pos + 1 for pos in range(i, j + 1)) / (j - i + 1)
        for pos in range(i, j + 1):
            points[order[pos]] = shared
        i = j + 1
    return points


def build() -> None:
    league = fetch_views(["mSettings", "mTeam", "mStandings"])
    status = league["status"]
    settings = league["settings"]
    scoring = settings["scoringSettings"]

    if scoring.get("scoringType") not in {"ROTO", None}:
        print(
            f"warning: scoringType is {scoring.get('scoringType')!r}, "
            "computing roto-style rankings anyway",
            file=sys.stderr,
        )

    cat_items = scoring.get("scoringItems", [])
    categories = []
    for item in cat_items:
        stat_id = item["statId"]
        abbrev, name, group = STAT_NAMES.get(
            stat_id, (f"STAT{stat_id}", f"Stat {stat_id}", "other")
        )
        categories.append(
            {
                "statId": stat_id,
                "abbrev": abbrev,
                "name": name,
                "group": group,
                "reverse": bool(item.get("isReverseItem")),
            }
        )

    teams = [
        {
            "id": t["id"],
            "abbrev": t.get("abbrev", ""),
            "name": t.get("name")
            or f"{t.get('location', '')} {t.get('nickname', '')}".strip(),
        }
        for t in league["teams"]
    ]
    teams.sort(key=lambda t: t["id"])
    team_ids = [t["id"] for t in teams]
    official_values = {
        t["id"]: t.get("valuesByStat", {}) for t in league["teams"]
    }
    official_points = {
        t["id"]: t.get("pointsByStat", {}) for t in league["teams"]
    }

    first = status.get("firstScoringPeriod", 1)
    latest = status["latestScoringPeriod"]
    # The latest period is today and may be mid-games; include it anyway so
    # the chart runs to now — a re-run tomorrow finalizes it.

    acc = {tid: {} for tid in team_ids}  # cumulative raw stat sums
    days = []
    day_points = {tid: [] for tid in team_ids}  # per day: {statId: pts}
    day_totals = {tid: [] for tid in team_ids}

    period_date = None
    for period in range(first, latest + 1):
        roster = fetch({"view": "mRoster", "scoringPeriodId": period})
        stamp = None
        for team in roster.get("teams", []):
            tid = team["id"]
            if tid not in acc:
                continue
            for entry in team.get("roster", {}).get("entries", []):
                if entry.get("lineupSlotId") in NON_COUNTING_SLOTS:
                    continue
                player = entry.get("playerPoolEntry", {}).get("player", {})
                for st in player.get("stats", []):
                    if (
                        st.get("scoringPeriodId") != period
                        or st.get("statSourceId") != 0
                        or st.get("statSplitTypeId") != 5
                    ):
                        continue
                    ext = st.get("externalId")
                    if ext and len(str(ext)) == 8 and stamp is None:
                        stamp = str(ext)
                    for sid, val in (st.get("stats") or {}).items():
                        sid = int(sid)
                        acc[tid][sid] = acc[tid].get(sid, 0.0) + float(val)

        if stamp:
            period_date = date(
                int(stamp[:4]), int(stamp[4:6]), int(stamp[6:8])
            )
        elif period_date:
            period_date += timedelta(days=1)
        days.append(period_date.isoformat() if period_date else f"period-{period}")

        # cumulative category values → roto points for this day
        cat_values = {}
        for cat in categories:
            sid = cat["statId"]
            vals = []
            for tid in team_ids:
                if sid in DERIVED:
                    vals.append(DERIVED[sid](acc[tid]))
                else:
                    vals.append(acc[tid].get(sid, 0.0))
            cat_values[sid] = vals
        for cat in categories:
            sid = cat["statId"]
            pts = roto_points(cat_values[sid], cat["reverse"])
            for idx, tid in enumerate(team_ids):
                if len(day_points[tid]) < len(days):
                    day_points[tid].append({})
                    day_totals[tid].append(0.0)
                day_points[tid][-1][sid] = pts[idx]
                day_totals[tid][-1] += pts[idx]
        print(
            f"period {period} ({days[-1]}): "
            + ", ".join(
                f"{t['abbrev']}={day_totals[t['id']][-1]:g}" for t in teams
            ),
            flush=True,
        )
        time.sleep(0.3)

    # Reconcile final cumulative values against ESPN's own standings.
    print("\nreconciliation vs mStandings valuesByStat:")
    for cat in categories:
        sid = cat["statId"]
        for tid in team_ids:
            ours = (
                DERIVED[sid](acc[tid])
                if sid in DERIVED
                else acc[tid].get(sid, 0.0)
            )
            theirs = official_values.get(tid, {}).get(str(sid))
            if theirs is None:
                continue
            ours_f = 0.0 if ours is None else ours
            if abs(ours_f - float(theirs)) > max(0.005, abs(float(theirs)) * 0.002):
                print(
                    f"  MISMATCH stat {cat['abbrev']} team {tid}: "
                    f"ours={ours_f:.4f} espn={float(theirs):.4f}"
                )

    payload = {
        "fetched": days[-1] if days else None,
        "league": {
            "id": LEAGUE_ID,
            "season": SEASON,
            "name": settings.get("name"),
            "scoringType": scoring.get("scoringType"),
        },
        "categories": categories,
        "teams": teams,
        "days": days,
        "series": {
            str(tid): {
                "totals": [round(v, 2) for v in day_totals[tid]],
                "byCat": {
                    str(cat["statId"]): [
                        round(day_points[tid][d].get(cat["statId"], 0.0), 2)
                        for d in range(len(days))
                    ]
                    for cat in categories
                },
            }
            for tid in team_ids
        },
        "current": {
            str(tid): {
                "values": {
                    str(cat["statId"]): (
                        DERIVED[cat["statId"]](acc[tid])
                        if cat["statId"] in DERIVED
                        else acc[tid].get(cat["statId"], 0.0)
                    )
                    for cat in categories
                },
                "espnValues": official_values.get(tid, {}),
                "espnPoints": official_points.get(tid, {}),
            }
            for tid in team_ids
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload) + "\n")
    print(f"\nwrote {OUT} ({OUT.stat().st_size / 1024:.0f} KB)")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=["probe", "build"])
    args = parser.parse_args()
    if args.mode == "probe":
        probe()
    else:
        build()


if __name__ == "__main__":
    main()
