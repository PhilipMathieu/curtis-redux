"""Fetch all MLB batted balls hit AT Fenway Park, 2021-2026 (spec §5 Layer 2).

Pulls Red Sox games month-by-month via pybaseball.statcast(team="BOS") —
far smaller than a league-wide pull — then keeps home games only
(home_team == BOS). Monthly parquet chunks are cached so a rate-limit
failure resumes where it left off (spec §9).

Usage: uv run python data/fetch_fenway_bbe.py

Writes:
- data/raw/fenway/bos_YYYY_MM.parquet  (per-month raw chunks)
- data/raw/fenway_bbe.parquet          (cleaned Fenway BBE, all seasons)
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
CHUNK_DIR = RAW_DIR / "fenway"

# (season, months) — regular seasons; 2026 through July
SEASONS = {
    2021: (4, 10), 2022: (4, 10), 2023: (3, 10),
    2024: (3, 9), 2025: (3, 9), 2026: (3, 7),
}


def month_bounds(year: int, month: int) -> tuple[str, str]:
    start = f"{year}-{month:02d}-01"
    if month == 12:
        end = f"{year}-12-31"
    else:
        end = (pd.Timestamp(year=year, month=month + 1, day=1) - pd.Timedelta(days=1)).date().isoformat()
    return start, end


def main() -> None:
    from pybaseball import cache, statcast

    cache.enable()
    CHUNK_DIR.mkdir(parents=True, exist_ok=True)

    chunks = []
    for year, (m0, m1) in SEASONS.items():
        for month in range(m0, m1 + 1):
            path = CHUNK_DIR / f"bos_{year}_{month:02d}.parquet"
            if path.exists():
                chunks.append(pd.read_parquet(path))
                continue
            start, end = month_bounds(year, month)
            print(f"fetching BOS {start}..{end}")
            # Savant throttles occasionally surface as malformed CSV mid-pull;
            # back off and retry rather than dying with 5 seasons half-cached.
            for attempt in range(4):
                try:
                    df = statcast(start_dt=start, end_dt=end, team="BOS")
                    break
                except Exception as e:  # noqa: BLE001 - parser/HTTP errors alike
                    if attempt == 3:
                        raise
                    wait = 30 * (attempt + 1)
                    print(f"  attempt {attempt + 1} failed ({type(e).__name__}: {e}); retrying in {wait}s")
                    time.sleep(wait)
            df.to_parquet(path)
            chunks.append(df)
            print(f"  {len(df)} pitches -> {path.name}")

    raw = pd.concat(chunks, ignore_index=True)
    fenway = raw[raw["home_team"] == "BOS"]
    print(f"total pitches: {len(raw)}, at Fenway: {len(fenway)}")

    # regular season + playoffs are at Fenway; spring "BOS home" games are
    # at JetBlue Park. Exclude the roster hitters so a predicted ball is
    # never its own nearest neighbor.
    bbe, counts = clean_bbe(
        fenway, game_types=("R", "F", "D", "L", "W"), exclude_batters=roster_ids()
    )
    bbe = bbe[KEEP_COLS].reset_index(drop=True)
    out_path = RAW_DIR / "fenway_bbe.parquet"
    bbe.to_parquet(out_path)

    print(f"wrote {len(bbe)} Fenway BBE -> {out_path}")
    print("exclusions:", counts)
    print("by stand:", bbe["stand"].value_counts().to_dict())
    print("outcomes:", bbe["outcome"].value_counts().to_dict())


if __name__ == "__main__":
    main()
