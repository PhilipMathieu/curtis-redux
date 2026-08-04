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


SEARCH_URL = "https://baseballsavant.mlb.com/player/search-all"


def lookup_ids(player: dict) -> list[int]:
    """Active-MLB MLBAM ids matching a roster entry's name, via Savant.

    Savant rather than the Chadwick register: it is the same host the
    batted balls come from, so a run that can fetch data can also resolve
    names, and namesakes are filtered by is_player/mlb/last_year rather
    than by hand.
    """
    import requests

    name = f"{player['lookup']['first']} {player['lookup']['last']}"
    hits = requests.get(SEARCH_URL, params={"search": name}, timeout=30).json()
    return sorted({
        int(h["id"]) for h in hits
        if h.get("is_player") == 1 and h.get("mlb") == 1
        and str(h.get("name", "")).lower() == name.lower()
        and int(h.get("last_year") or 0) >= 2025
    })


def resolve_mlbam(player: dict) -> int:
    """MLBAM id for a roster entry, resolving by name when it isn't pinned.

    A pinned id is verified rather than trusted: fetching the wrong hitter's
    batted balls would be invisible downstream, so a mismatch is a hard
    error. A lookup that can't be reached is not — a pinned id still stands
    on its own.
    """
    pinned = player.get("mlbam")
    if not player.get("lookup"):
        if pinned is None:
            raise SystemExit(f"{player['name']}: needs either mlbam or lookup in data/roster.json")
        return int(pinned)

    try:
        ids = lookup_ids(player)
    except Exception as e:  # noqa: BLE001 — network/parse alike
        if pinned is not None:
            print(f"  WARNING: id lookup unavailable ({type(e).__name__}); using pinned {pinned}")
            return int(pinned)
        raise SystemExit(
            f"{player['name']}: id lookup failed ({e}) and no mlbam pinned in data/roster.json"
        ) from e

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
