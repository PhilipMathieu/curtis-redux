"""Roster config loader — data/roster.json is the source of truth.

Both the fetch scripts and build_dataset.py go through here so a player is
added in exactly one place. Player ids are also what the Fenway/neutral
training pools exclude, so no batted ball is ever its own nearest neighbor.
"""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

ROSTER_PATH = Path(__file__).resolve().parent / "roster.json"

# Trajectory constants refit on Mead's 2026 HRs; the fallback for a hitter
# without enough tracked home runs of his own (see model/trajectory.py).
DEFAULT_KD = 0.00190
DEFAULT_KL = 0.00088
MIN_HR_FOR_REFIT = 10


@lru_cache(maxsize=1)
def load_roster() -> list[dict]:
    return json.loads(ROSTER_PATH.read_text())["players"]


def get_player(slug: str) -> dict:
    for p in load_roster():
        if p["slug"] == slug:
            return p
    raise SystemExit(f"unknown player {slug!r}; roster has {[p['slug'] for p in load_roster()]}")


def slugs() -> list[str]:
    return [p["slug"] for p in load_roster()]


def resolve_mlbam(player: dict) -> int:
    """MLBAM id for a roster entry, resolving by name when it isn't pinned.

    A pinned id is verified against the Chadwick register rather than
    trusted: fetching the wrong hitter's batted balls would be invisible
    downstream, so a mismatch is a hard error.
    """
    pinned = player.get("mlbam")
    lookup = player.get("lookup")
    if pinned is not None and not lookup:
        return int(pinned)

    from pybaseball import playerid_lookup

    hits = playerid_lookup(lookup["last"], lookup["first"], fuzzy=False)
    hits = hits[hits["key_mlbam"].notna()]
    if "mlb_played_last" in hits.columns:  # drop long-retired namesakes
        hits = hits[hits["mlb_played_last"] >= 2024]
    ids = sorted({int(v) for v in hits["key_mlbam"]})
    if not ids:
        raise SystemExit(f"no MLBAM id found for {player['name']} — pin one in data/roster.json")
    if pinned is not None:
        if int(pinned) not in ids:
            raise SystemExit(
                f"{player['name']}: pinned mlbam {pinned} not in lookup result {ids} — "
                "fix data/roster.json before fetching"
            )
        return int(pinned)
    if len(ids) > 1:
        raise SystemExit(
            f"{player['name']}: ambiguous lookup {ids} — pin the right one in data/roster.json"
        )
    print(f"resolved {player['name']} -> mlbam {ids[0]}")
    return ids[0]


def roster_ids() -> tuple[int, ...]:
    """Every roster player's MLBAM id, for training-pool exclusion.

    Uses only pinned ids when offline resolution isn't possible; the fetch
    scripts pin what they resolve back into raw/roster_ids.json so the pool
    pulls can exclude everyone without re-hitting the lookup service.
    """
    cache = Path(__file__).resolve().parent / "raw" / "roster_ids.json"
    known = {p["slug"]: p["mlbam"] for p in load_roster() if p.get("mlbam") is not None}
    if cache.exists():
        known.update({k: int(v) for k, v in json.loads(cache.read_text()).items()})
    return tuple(sorted(known.values()))


def remember_id(slug: str, mlbam: int) -> None:
    cache = Path(__file__).resolve().parent / "raw" / "roster_ids.json"
    cache.parent.mkdir(parents=True, exist_ok=True)
    seen = json.loads(cache.read_text()) if cache.exists() else {}
    seen[slug] = int(mlbam)
    cache.write_text(json.dumps(seen, indent=2, sort_keys=True))
