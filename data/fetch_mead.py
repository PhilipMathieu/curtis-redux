"""Fetch Curtis Mead's 2026 batted balls from Statcast (spec §3).

Usage: uv run python data/fetch_mead.py [--end YYYY-MM-DD]

Writes:
- data/raw/mead_2026_raw.parquet   (untouched statcast_batter pull)
- data/raw/mead_2026_bbe.parquet   (cleaned BBE with transforms + flags)
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from statcast_common import KEEP_COLS, MEAD_MLBAM_ID, clean_bbe

RAW_DIR = Path(__file__).resolve().parent / "raw"
SEASON_START = "2026-03-01"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--end", default=dt.date.today().isoformat())
    ap.add_argument("--force", action="store_true", help="refetch even if cached")
    args = ap.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    raw_path = RAW_DIR / "mead_2026_raw.parquet"

    if raw_path.exists() and not args.force:
        print(f"cached: {raw_path}")
        raw = pd.read_parquet(raw_path)
    else:
        from pybaseball import cache, statcast_batter

        cache.enable()
        raw = statcast_batter(SEASON_START, args.end, MEAD_MLBAM_ID)
        raw.to_parquet(raw_path)
        print(f"fetched {len(raw)} pitches -> {raw_path}")

    bbe, counts = clean_bbe(raw)
    bbe = bbe[KEEP_COLS].reset_index(drop=True)
    out_path = RAW_DIR / "mead_2026_bbe.parquet"
    bbe.to_parquet(out_path)
    # build_dataset.py reads these for the UI footnote — never hardcode them
    (RAW_DIR / "mead_counts.json").write_text(json.dumps(counts))

    print(f"wrote {len(bbe)} BBE -> {out_path}")
    print("exclusions:", counts)
    print("\noutcomes:", bbe["outcome"].value_counts().to_dict())
    print("parks (home_team):", bbe["home_team"].value_counts().to_dict())
    print("date range:", bbe["game_date"].min(), "->", bbe["game_date"].max())


if __name__ == "__main__":
    main()
