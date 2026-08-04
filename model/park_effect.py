"""EXPERIMENTAL — park-effect model, not wired into the deployed app.

Fits the same KNN on a park-neutral league-wide sample and compares, for
every 2026 BBE of one roster hitter:
  - neutral distribution (pure KNN, league average across all 30 parks)
  - Fenway distribution (the shipped blend: KNN over Fenway BBE + wall physics)

A "park flip" here means the MODAL outcome differs between the two models —
the luck-free version of the flip definition. Also reports the de-lucked
expected line (neutral vs Fenway) and the largest per-ball P(HR) deltas.

Usage: uv run python model/park_effect.py [--player SLUG]
"""

from __future__ import annotations

import argparse
import sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from outcomes import OUTCOMES, FenwayOutcomeModel, predict_fenway

sys.path.insert(0, str(HERE.parent / "data"))
sys.path.insert(0, str(HERE.parent))
from roster import get_player  # noqa: E402
from build_dataset import drag_lift  # noqa: E402

RAW = HERE.parent / "data" / "raw"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--player", default="mead", help="roster slug")
    args = ap.parse_args()
    player = get_player(args.player)

    bbe = (
        pd.read_parquet(RAW / f"{player['slug']}_2026_bbe.parquet")
        .sort_values("game_date")
        .reset_index(drop=True)
    )
    fenway = pd.read_parquet(RAW / "fenway_bbe.parquet")
    neutral = pd.read_parquet(RAW / "neutral_bbe.parquet")

    fit = drag_lift(player, bbe)
    kd, kl = fit["kd"], fit["kl"]
    stands = sorted(bbe["stand"].unique())
    fen_models = {s: FenwayOutcomeModel(stand=s).fit(fenway) for s in stands}
    neu_models = {s: FenwayOutcomeModel(stand=s).fit(neutral) for s in stands}
    counts = neutral["stand"].value_counts().to_dict()
    print(f"{player['name']}: {len(bbe)} BBE from {'/'.join(stands)}HB, {fit['source']} KD/KL")
    print(f"neutral sample: {len(neutral)} BBE ({counts}) across {neutral['home_team'].nunique()} parks\n")

    rows = []
    for _, r in bbe.iterrows():
        fen = predict_fenway(fen_models[r.stand], r.launch_speed, r.launch_angle,
                             r.spray_deg, kd=kd, kl=kl)
        neu = neu_models[r.stand].predict_dist(r.launch_speed, r.launch_angle, r.spray_deg)
        rows.append({
            "ev": r.launch_speed, "la": r.launch_angle, "spray": r.spray_deg,
            "bb": r.bb_type, "orig": r.outcome, "des": str(r.des)[:60],
            "fen": fen["dist"], "neu": neu,
            "fmode": max(fen["dist"], key=fen["dist"].get),
            "nmode": max(neu, key=neu.get),
        })
    df = pd.DataFrame(rows)

    # --- de-lucked lines ---
    print(f"=== Expected line on contact ({len(df)} BBE) ===")
    print(f"{'':>10} {'actual':>7} {'neutral':>8} {'Fenway':>7} {'park effect':>12}")
    for o in OUTCOMES:
        act = (df.orig == o).sum()
        neu_e = sum(r[o] for r in df.neu)
        fen_e = sum(r[o] for r in df.fen)
        print(f"{o:>10} {act:>7} {neu_e:>8.1f} {fen_e:>7.1f} {fen_e - neu_e:>+12.1f}")

    # --- park flips (model vs model) ---
    flips = df[df.fmode != df.nmode]
    print(f"\n=== Park flips (Fenway modal != neutral modal): {len(flips)} ===")
    print("transitions (neutral -> Fenway):", Counter(zip(flips.nmode, flips.fmode)).most_common())
    print("by type:", Counter(flips.bb).most_common())

    # --- biggest P(HR) deltas ---
    df["d_hr"] = [f["HR"] - n["HR"] for f, n in zip(df.fen, df.neu)]
    print("\n=== Largest P(HR) deltas, Fenway - neutral ===")
    top = pd.concat([df.nlargest(5, "d_hr"), df.nsmallest(5, "d_hr")])
    for _, r in top.iterrows():
        print(f"  {r.d_hr:+.2f}  {r.ev:5.1f} mph {r.la:5.1f}deg {r.spray:+6.1f}  "
              f"P(HR) {r.neu['HR']:.2f}->{r.fen['HR']:.2f}  was {r.orig:3}  {r.des}")

    # --- overlap with shipped defn A ---
    import json
    shipped = json.load(open(HERE.parent / "app" / "src" / "players" / f"{player['slug']}.json"))["rows"]
    a = {i for i, r in enumerate(shipped) if r["pflip"]}
    b = set(flips.index)
    print(f"\n=== Definition overlap ===")
    print(f"defn A (fence-in-play, vs actual): {len(a)}  |  defn B (model vs model): {len(b)}")
    print(f"both: {len(a & b)}  A-only: {len(a - b)}  B-only: {len(b - a)}")


if __name__ == "__main__":
    main()
