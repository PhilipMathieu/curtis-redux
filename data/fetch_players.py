"""Fetch 2026 batted balls for the roster hitters from Statcast (spec §3).

One pull per player in data/roster.json — Mead plus the rest of Boston's
deadline pickups.

Usage:
  uv run python data/fetch_players.py                  # everyone on the roster
  uv run python data/fetch_players.py --player mead    # just one
  uv run python data/fetch_players.py --end 2026-08-04 # freeze the vintage

Writes, per player:
- data/raw/<slug>_2026_raw.parquet   (untouched statcast_batter pull)
- data/raw/<slug>_2026_bbe.parquet   (cleaned BBE with transforms + flags)
- data/raw/<slug>_counts.json        (exclusion counts for the UI footnote)
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from roster import get_player, load_roster, remember_id, resolve_mlbam
from statcast_common import KEEP_COLS, clean_bbe

RAW_DIR = Path(__file__).resolve().parent / "raw"
SEASON_START = "2026-03-01"


def fetch_one(player: dict, end: str, force: bool) -> None:
    slug = player["slug"]
    raw_path = RAW_DIR / f"{slug}_2026_raw.parquet"

    if raw_path.exists() and not force:
        print(f"cached: {raw_path}")
        raw = pd.read_parquet(raw_path)
    else:
        from pybaseball import cache, statcast_batter

        cache.enable()
        mlbam = resolve_mlbam(player)
        remember_id(slug, mlbam)
        raw = statcast_batter(SEASON_START, end, mlbam)
        raw.to_parquet(raw_path)
        print(f"fetched {len(raw)} pitches for {player['name']} -> {raw_path}")

    bbe, counts = clean_bbe(raw)
    bbe = bbe[KEEP_COLS].reset_index(drop=True)
    out_path = RAW_DIR / f"{slug}_2026_bbe.parquet"
    bbe.to_parquet(out_path)
    # build_dataset.py reads these for the UI footnote — never hardcode them
    (RAW_DIR / f"{slug}_counts.json").write_text(json.dumps(counts))

    print(f"wrote {len(bbe)} BBE -> {out_path}")
    print("exclusions:", counts)
    print("outcomes:", bbe["outcome"].value_counts().to_dict())
    print("by stand:", bbe["stand"].value_counts().to_dict())
    print("parks (home_team):", bbe["home_team"].value_counts().to_dict())
    print("date range:", bbe["game_date"].min(), "->", bbe["game_date"].max())
    if len(bbe) < 40:
        # part-time bats (White, Rogers) get thin samples; the page is still
        # honest, but the bootstrap CIs will be wide and should stay wide.
        print(f"NOTE: only {len(bbe)} tracked BBE — expect wide intervals on this page")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--player", help="roster slug; default all")
    ap.add_argument("--end", default=dt.date.today().isoformat())
    ap.add_argument("--force", action="store_true", help="refetch even if cached")
    args = ap.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    players = [get_player(args.player)] if args.player else load_roster()
    for player in players:
        print(f"\n=== {player['name']} ({player['pos']}, bats {player['bats']}) ===")
        fetch_one(player, args.end, args.force)


if __name__ == "__main__":
    main()
