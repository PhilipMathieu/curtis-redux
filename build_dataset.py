"""Emit app/src/data.json — one row per Mead 2026 BBE, plus summary meta.

Row schema (spec §8 + arc):
  id, date, opp, park, ev, la, spray, bb, dist, apex, orig,
  fp {HR,3B,2B,1B,Out} (blended Fenway distribution), fmode,
  pflip (park flip: modal outcome differs AND the fence is causally in play),
  hf (ball height at Fenway fence, null if lands short), fdist, fh, seg,
  pclear (Layer 1 overlay, null if short/low wall), arc [[x,y]*20], des, flags

Summary meta includes a 1000-draw bootstrap CI on expected Fenway HR
(spec §9: no bare point estimates at n=231).

Usage: uv run python build_dataset.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "model"))
from fence import segment_name
from outcomes import OUTCOMES, FenwayOutcomeModel, predict_fenway
from trajectory import arc_points

RAW = HERE / "data" / "raw"
OUT = HERE / "app" / "src" / "data.json"
BOOTSTRAP_DRAWS = 1000


def display_distance(r: pd.Series) -> float:
    """Landing distance for dot placement: tracked carry for airballs,
    fielded position for grounders (direction is what matters there)."""
    if r.launch_angle >= 10 and pd.notna(r.hit_distance_sc):
        return float(r.hit_distance_sc)
    return float(np.hypot(r.x_ft, r.y_ft))


def main() -> None:
    mead = pd.read_parquet(RAW / "mead_2026_bbe.parquet").sort_values("game_date").reset_index(drop=True)
    fenway = pd.read_parquet(RAW / "fenway_bbe.parquet")
    model = FenwayOutcomeModel().fit(fenway)

    rows = []
    for i, r in mead.iterrows():
        pred = predict_fenway(model, r.launch_speed, r.launch_angle, r.spray_deg)
        l1 = pred["layer1"]
        fp = pred["dist"]
        fmode = max(fp, key=fp.get)
        # A "park flip" requires Fenway's fence to be causally in play: the
        # ball reaches the fence plane airborne, or is an airball dying
        # within 40 ft of it. Without this, the flip list is dominated by
        # luck-regression (infield singles whose modal outcome is "out"
        # at every park), not by Fenway.
        fence_in_play = l1["height_at_fence"] is not None or (
            r.launch_angle >= 10 and l1["fence_dist"] - l1["carry"] <= 40
        )
        opp = r.away_team if r.home_team == "WSH" else r.home_team
        rows.append({
            "id": int(i),
            "date": str(r.game_date)[:10],
            "opp": opp,
            "park": r.home_team,
            "ev": round(float(r.launch_speed), 1),
            "la": round(float(r.launch_angle), 1),
            "spray": round(float(r.spray_deg), 1),
            "bb": r.bb_type,
            "dist": round(display_distance(r)),
            "apex": round(l1["apex"]),
            "orig": r.outcome,
            "fp": fp,
            "fmode": fmode,
            "pflip": bool(fence_in_play and r.outcome != fmode),
            "hf": None if l1["height_at_fence"] is None else round(l1["height_at_fence"], 1),
            "fdist": round(l1["fence_dist"]),
            "fh": l1["fence_height"],
            "seg": segment_name(r.spray_deg),
            "pclear": None if l1["p_clear"] is None else round(l1["p_clear"], 3),
            "arc": arc_points(l1["xs"], l1["ys"]),
            "des": str(r.des),
            "flags": list(r["flags"]),
        })

    # bootstrap the summary numbers (each ball sampled from its fp)
    rng = np.random.default_rng(42)
    probs = np.array([[row["fp"][o] for o in OUTCOMES] for row in rows])
    probs = probs / probs.sum(axis=1, keepdims=True)
    draws = np.array([
        [(np.array([rng.choice(len(OUTCOMES), p=p) for p in probs]) == j).sum()
         for j in range(len(OUTCOMES))]
        for _ in range(BOOTSTRAP_DRAWS)
    ])  # (draws, outcome)
    hr_draws = draws[:, 0]

    # actual vs expected-at-Fenway line on contact, with CIs per outcome
    actual_counts = {o: sum(1 for row in rows if row["orig"] == o) for o in OUTCOMES}
    expected_line = {
        o: {
            "mean": round(float(probs[:, j].sum()), 1),
            "ci": [int(np.percentile(draws[:, j], 2.5)), int(np.percentile(draws[:, j], 97.5))],
        }
        for j, o in enumerate(OUTCOMES)
    }
    hit_draws = draws[:, :4].sum(axis=1)  # everything but Out
    actual_counts["H"] = sum(actual_counts[o] for o in OUTCOMES if o != "Out")
    expected_line["H"] = {
        "mean": round(float(probs[:, :4].sum()), 1),
        "ci": [int(np.percentile(hit_draws, 2.5)), int(np.percentile(hit_draws, 97.5))],
    }

    exp_hr = float(probs[:, 0].sum())
    meta = {
        "player": "Curtis Mead",
        "mlbam_id": 678554,
        "season": 2026,
        "vintage": max(row["date"] for row in rows),
        "n_bbe": len(rows),
        "no_track_excluded": 3,
        "actual_hr": sum(1 for row in rows if row["orig"] == "HR"),
        "expected_fenway_hr": round(exp_hr, 1),
        "expected_fenway_hr_ci": [int(np.percentile(hr_draws, 2.5)), int(np.percentile(hr_draws, 97.5))],
        "wall_balls": sum(1 for row in rows if row["hf"] is not None and row["fp"]["HR"] < 0.5),
        "flipped": sum(1 for row in rows if row["pflip"]),
        "actual_line": actual_counts,
        "expected_line": expected_line,
    }

    OUT.write_text(json.dumps({"meta": meta, "rows": rows}, separators=(",", ":")))
    # the field SVG needs the full fence outline, not just per-ball lookups
    geo = json.loads((HERE / "data" / "geometry" / "fenway.json").read_text())
    (OUT.parent / "geometry.json").write_text(json.dumps(geo, separators=(",", ":")))
    print(json.dumps(meta, indent=2))
    print(f"wrote {len(rows)} rows -> {OUT} ({OUT.stat().st_size // 1024} KB)")


if __name__ == "__main__":
    main()
