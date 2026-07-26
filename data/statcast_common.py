"""Shared Statcast transforms for the Fenway translation pipeline.

Coordinate conventions (handoff spec §3):
- Feet coords from MLBAM stringer coords: x = 2.495*(hc_x - 125.42),
  y = 2.495*(198.27 - hc_y). Home plate at origin, +y toward CF.
- Spray angle = atan2(x, y) in degrees: -45 = LF line, 0 = CF, +45 = RF line.
  For a RHB, negative spray = pull side.

Caveats encoded as row flags (spec §3):
- hc_x/hc_y is the FIELDED position, not the landing spot, for caught balls.
  For airballs the projected full carry (hit_distance_sc) is the better
  distance; hc gives direction only.
- ~1-3% of BBE have no tracked EV/LA; they are dropped and counted.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

MEAD_MLBAM_ID = 678554

FEET_PER_UNIT = 2.495
HC_X0 = 125.42
HC_Y0 = 198.27

EVENT_MAP = {
    "single": "1B",
    "double": "2B",
    "triple": "3B",
    "home_run": "HR",
}

# events dropped entirely (not a fair "what would this ball do" sample)
DROP_EVENTS = {"sac_bunt", "sac_bunt_double_play", "bunt_ground_out", "bunt_pop_out"}


def to_feet(df: pd.DataFrame) -> pd.DataFrame:
    """Add x_ft/y_ft/spray_deg columns from hc_x/hc_y."""
    df = df.copy()
    df["x_ft"] = FEET_PER_UNIT * (df["hc_x"] - HC_X0)
    df["y_ft"] = FEET_PER_UNIT * (HC_Y0 - df["hc_y"])
    df["spray_deg"] = np.degrees(np.arctan2(df["x_ft"], df["y_ft"]))
    return df


def map_events(events: pd.Series) -> pd.Series:
    """Collapse Statcast `events` to {HR, 3B, 2B, 1B, Out}."""
    return events.map(EVENT_MAP).fillna("Out")


def clean_bbe(
    df: pd.DataFrame,
    game_types: tuple[str, ...] = ("R",),
    exclude_batters: tuple[int, ...] = (),
) -> tuple[pd.DataFrame, dict]:
    """Filter a raw Statcast frame to usable batted-ball events.

    game_types defaults to regular season only — spring-training rows carry
    the parent club's team codes but were played at spring venues, which
    poisons park attribution. Fenway pulls pass ("R","F","D","L","W") since
    playoff games are legitimately at Fenway.

    exclude_batters drops specific hitters from model training pools so a
    predicted ball can never be its own nearest neighbor.

    Returns (bbe, counts) where counts records what was excluded so the UI
    footnote can be honest about it.
    """
    counts = {"raw_rows": len(df)}

    bbe = df[df["type"] == "X"].copy()
    counts["bbe_all_game_types"] = len(bbe)

    if "game_type" in bbe.columns:
        non_regular = ~bbe["game_type"].isin(game_types)
        counts["dropped_game_type"] = int(non_regular.sum())
        bbe = bbe[~non_regular]

    if exclude_batters and "batter" in bbe.columns:
        excluded = bbe["batter"].isin(exclude_batters)
        counts["dropped_excluded_batters"] = int(excluded.sum())
        bbe = bbe[~excluded]

    counts["bbe_total"] = len(bbe)

    dropped_bunts = bbe["events"].isin(DROP_EVENTS)
    bbe = bbe[~dropped_bunts]
    counts["dropped_bunts"] = int(dropped_bunts.sum())

    no_track = bbe[["launch_speed", "launch_angle", "hc_x", "hc_y"]].isna().any(axis=1)
    counts["no_track"] = int(no_track.sum())
    bbe = bbe[~no_track]

    bbe = to_feet(bbe)
    bbe["outcome"] = map_events(bbe["events"])

    # data-quality flags per row
    airball = bbe["launch_angle"] >= 10
    flags = []
    for _, r in bbe.iterrows():
        f = []
        if r["events"] in ("field_error", "fielders_choice", "fielders_choice_out"):
            f.append("fc_or_error_as_out")
        if r["launch_angle"] >= 10 and r["outcome"] == "Out":
            f.append("hc_is_fielded_pos")  # caught airball: hc != landing spot
        if pd.isna(r.get("hit_distance_sc")):
            f.append("no_tracked_distance")
        flags.append(f)
    bbe["flags"] = flags
    counts["kept"] = len(bbe)
    counts["airballs"] = int(airball.sum())
    return bbe, counts


KEEP_COLS = [
    "game_date", "events", "outcome", "launch_speed", "launch_angle",
    "hc_x", "hc_y", "x_ft", "y_ft", "spray_deg", "hit_distance_sc",
    "home_team", "away_team", "stand", "des", "bb_type", "flags",
]
