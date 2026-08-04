"""Park-neutral league-wide BBE sample (experimental park-effect model).

One full calendar month per season, all teams and parks, 2021-2026 —
balanced across the deadened-ball / shift-ban eras like the Fenway pull.
~20k BBE per month. Cached per-month like fetch_fenway_bbe.py.

Usage: uv run python data/fetch_neutral_bbe.py

Writes:
- data/raw/neutral/mlb_YYYY_MM.parquet
- data/raw/neutral_bbe.parquet
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent))
from roster import roster_ids
from statcast_common import KEEP_COLS, clean_bbe

RAW_DIR = Path(__file__).resolve().parent / "raw"
CHUNK_DIR = RAW_DIR / "neutral"

MONTHS = [(2021, 8), (2022, 6), (2023, 7), (2024, 5), (2025, 9), (2026, 6)]


def month_bounds(year: int, month: int) -> tuple[str, str]:
    start = f"{year}-{month:02d}-01"
    end = (pd.Timestamp(year=year, month=month + 1, day=1) - pd.Timedelta(days=1)).date().isoformat()
    return start, end


def main() -> None:
    from pybaseball import cache, statcast

    cache.enable()
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)

    chunks = []
    for year, month in MONTHS:
        path = CHUNK_DIR / f"mlb_{year}_{month:02d}.parquet"
        if path.exists():
            chunks.append(pd.read_parquet(path))
            continue
        start, end = month_bounds(year, month)
        print(f"fetching all-MLB {start}..{end}")
        for attempt in range(4):
            try:
                df = statcast(start_dt=start, end_dt=end)
                break
            except Exception as e:  # noqa: BLE001
                if attempt == 3:
                    raise
                wait = 30 * (attempt + 1)
                print(f"  attempt {attempt + 1} failed ({type(e).__name__}); retrying in {wait}s")
                time.sleep(wait)
        df.to_parquet(path)
        chunks.append(df)
        print(f"  {len(df)} pitches -> {path.name}")

    raw = pd.concat(chunks, ignore_index=True)
    bbe, counts = clean_bbe(raw, exclude_batters=roster_ids())
    bbe = bbe[KEEP_COLS].reset_index(drop=True)
    out_path = RAW_DIR / "neutral_bbe.parquet"
    bbe.to_parquet(out_path)

    print(f"wrote {len(bbe)} neutral BBE -> {out_path}")
    print("exclusions:", counts)
    print("parks:", bbe["home_team"].nunique())
    print("by stand:", bbe["stand"].value_counts().to_dict())


if __name__ == "__main__":
    main()
