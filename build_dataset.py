"""Emit app/src/players/<slug>.json — one row per 2026 BBE, plus summary meta.

One file per hitter in data/roster.json (Boston's deadline pickups), plus
copies of the roster and the Fenway outline the app renders.

Row schema (spec §8 + arc):
  id, date, opp, park, stand, ev, la, spray, bb, dist, apex, orig,
  fp {HR,3B,2B,1B,Out} (blended Fenway distribution), fmode,
  pflip (park flip: modal outcome differs AND the fence is causally in play),
  hf (ball height at Fenway fence, null if lands short), fdist, fh, seg,
  pclear (Layer 1 overlay, null if short/low wall), arc [[x,y]*20], des, flags

Summary meta includes a 1000-draw bootstrap CI on expected Fenway HR
(spec §9: no bare point estimates at these sample sizes).

Usage:
  uv run python build_dataset.py                # every roster hitter
  uv run python build_dataset.py --player mead  # just one
"""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "model"))
sys.path.insert(0, str(HERE / "data"))
from fence import segment_name
from outcomes import OUTCOMES, FenwayOutcomeModel, predict_fenway
from roster import DEFAULT_KD, DEFAULT_KL, MIN_HR_FOR_REFIT, get_player, load_roster
from trajectory import arc_points, carry_error, fit_drag_lift

RAW = HERE / "data" / "raw"
OUT_DIR = HERE / "app" / "src" / "players"
BOOTSTRAP_DRAWS = 1000


def display_distance(r: pd.Series) -> float:
    """Landing distance for dot placement: tracked carry for airballs,
    fielded position for grounders (direction is what matters there)."""
    if r.launch_angle >= 10 and pd.notna(r.hit_distance_sc):
        return float(r.hit_distance_sc)
    return float(np.hypot(r.x_ft, r.y_ft))


def drag_lift(player: dict, bbe: pd.DataFrame) -> dict:
    """Trajectory constants for one hitter: pinned, refit, or inherited.

    Pinned values in roster.json win (they keep a published page's numbers
    stable). Otherwise refit on his own tracked home runs when there are
    enough of them, and fall back to the Mead fit when there aren't — a
    part-time bat with four home runs would fit noise, not drag.
    """
    hr = bbe[(bbe.outcome == "HR") & bbe.hit_distance_sc.notna()]

    def scored(kd: float, kl: float, source: str) -> dict:
        # carry error is only meaningful against tracked home runs; with none
        # to check against, say so rather than reporting a hollow 0.0
        if len(hr) == 0:
            return {"kd": kd, "kl": kl, "source": source, "n_hr": 0,
                    "mae_ft": None, "bias_ft": None}
        mae, bias = carry_error(hr.launch_speed, hr.launch_angle, hr.hit_distance_sc, kd, kl)
        return {"kd": kd, "kl": kl, "source": source, "n_hr": len(hr),
                "mae_ft": round(mae, 1), "bias_ft": round(bias, 1)}

    if player.get("kd") is not None and player.get("kl") is not None:
        return scored(float(player["kd"]), float(player["kl"]), "pinned")
    if len(hr) >= MIN_HR_FOR_REFIT:
        fit = fit_drag_lift(hr.launch_speed, hr.launch_angle, hr.hit_distance_sc)
        return {**fit, "source": "own", "n_hr": len(hr)}
    return scored(DEFAULT_KD, DEFAULT_KL, "default")


def own_team_by_date(bbe: pd.DataFrame, fallback: str) -> dict:
    """The hitter's own club for each of his game dates.

    Statcast rows carry only home_team/away_team, so his club is inferred:
    he appears in every one of his team's games, while any single opponent
    shows up in a handful. Two clubs clearing the bar is the normal case
    here — these are all midseason trades — and a game where both sides are
    "his" (facing a former club) is resolved from the dates around it.
    """
    games = bbe[["game_date", "home_team", "away_team"]].drop_duplicates("game_date")
    counts = pd.concat([games.home_team, games.away_team]).value_counts()
    mine = {t for t, c in counts.items() if c >= 0.25 * len(games)} or {fallback}
    picks = []
    for _, g in games.iterrows():
        cands = [t for t in (g.home_team, g.away_team) if t in mine]
        picks.append(cands[0] if len(cands) == 1 else None)
    s = pd.Series(picks, index=games.game_date).ffill().bfill().fillna(fallback)
    return s.to_dict()


def resolved_id(player: dict) -> int | None:
    """MLBAM id as actually fetched — pinned in roster.json, or whatever
    data/fetch_players.py resolved by name and cached."""
    if player.get("mlbam") is not None:
        return int(player["mlbam"])
    cache = RAW / "roster_ids.json"
    if cache.exists():
        seen = json.loads(cache.read_text())
        if player["slug"] in seen:
            return int(seen[player["slug"]])
    return None


def bootstrap(probs: np.ndarray, rng: np.random.Generator) -> np.ndarray:
    """(draws, outcome) counts from sampling every ball's outcome distribution."""
    return np.array([
        [(np.array([rng.choice(len(OUTCOMES), p=p) for p in probs]) == j).sum()
         for j in range(len(OUTCOMES))]
        for _ in range(BOOTSTRAP_DRAWS)
    ])


def expected_line(probs: np.ndarray, draws: np.ndarray) -> dict:
    line = {
        o: {
            "mean": round(float(probs[:, j].sum()), 1),
            "ci": [int(np.percentile(draws[:, j], 2.5)), int(np.percentile(draws[:, j], 97.5))],
        }
        for j, o in enumerate(OUTCOMES)
    }
    hit_draws = draws[:, :4].sum(axis=1)  # everything but Out
    line["H"] = {
        "mean": round(float(probs[:, :4].sum()), 1),
        "ci": [int(np.percentile(hit_draws, 2.5)), int(np.percentile(hit_draws, 97.5))],
    }
    return line


def build_player(player: dict, fenway: pd.DataFrame, neutral: pd.DataFrame,
                 models: dict, neutral_models: dict) -> dict:
    slug = player["slug"]
    # stable sort with tiebreakers so row ids are deterministic across rebuilds
    bbe = (
        pd.read_parquet(RAW / f"{slug}_2026_bbe.parquet")
        .sort_values(["game_date", "launch_speed", "launch_angle", "spray_deg"], kind="mergesort")
        .reset_index(drop=True)
    )
    fetch_counts = json.loads((RAW / f"{slug}_counts.json").read_text())
    fit = drag_lift(player, bbe)
    kd, kl = fit["kd"], fit["kl"]
    own_team = own_team_by_date(bbe, player["from_team"])

    # A switch hitter is two hitters as far as Fenway is concerned, so each
    # ball is compared against the pool for the side he swung from.
    for stand in sorted(bbe["stand"].unique()):
        if stand not in models:
            models[stand] = FenwayOutcomeModel(stand=stand).fit(fenway)
            neutral_models[stand] = FenwayOutcomeModel(stand=stand).fit(neutral)

    rows = []
    neutral_probs_rows = []
    for i, r in bbe.iterrows():
        model, neu_model = models[r.stand], neutral_models[r.stand]
        pred = predict_fenway(model, r.launch_speed, r.launch_angle, r.spray_deg, kd=kd, kl=kl)
        np_dist = neu_model.predict_dist(r.launch_speed, r.launch_angle, r.spray_deg)
        neutral_probs_rows.append([np_dist[o] for o in OUTCOMES])
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
        mine = own_team[r.game_date]
        opp = r.away_team if r.home_team == mine else r.home_team
        rows.append({
            "id": int(i),
            "date": str(r.game_date)[:10],
            "opp": opp,
            "park": r.home_team,
            "stand": r.stand,
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
    draws = bootstrap(probs, rng)  # (draws, outcome)
    hr_draws = draws[:, 0]

    # actual vs expected-at-Fenway line on contact, with CIs per outcome
    actual_counts = {o: sum(1 for row in rows if row["orig"] == o) for o in OUTCOMES}
    actual_counts["H"] = sum(actual_counts[o] for o in OUTCOMES if o != "Out")
    exp_line = expected_line(probs, draws)

    # park-neutral expected line (same bootstrap treatment)
    nprobs = np.array(neutral_probs_rows)
    nprobs = nprobs / nprobs.sum(axis=1, keepdims=True)
    neutral_line = expected_line(nprobs, bootstrap(nprobs, rng))

    hands = {s: int((bbe["stand"] == s).sum()) for s in sorted(bbe["stand"].unique())}
    meta = {
        "slug": slug,
        "player": player["name"],
        "mlbam_id": resolved_id(player),
        "bats": player["bats"],
        "hands": hands,
        "season": 2026,
        "vintage": max(row["date"] for row in rows),
        "n_bbe": len(rows),
        "no_track_excluded": fetch_counts["no_track"],
        "pool_sizes": {s: models[s].n_train for s in hands},
        "fit": fit,
        "actual_hr": sum(1 for row in rows if row["orig"] == "HR"),
        "expected_fenway_hr": exp_line["HR"]["mean"],
        "expected_fenway_hr_ci": [int(np.percentile(hr_draws, 2.5)), int(np.percentile(hr_draws, 97.5))],
        "wall_balls": sum(1 for row in rows if row["hf"] is not None and row["fp"]["HR"] < 0.5),
        "flipped": sum(1 for row in rows if row["pflip"]),
        "actual_line": actual_counts,
        "expected_line": exp_line,
        "neutral_line": neutral_line,
    }

    out = OUT_DIR / f"{slug}.json"
    out.write_text(json.dumps({"meta": meta, "rows": rows}, separators=(",", ":")))
    print(json.dumps(meta, indent=2))
    print(f"wrote {len(rows)} rows -> {out} ({out.stat().st_size // 1024} KB)\n")
    return meta


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--player", help="roster slug; default all")
    args = ap.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    fenway = pd.read_parquet(RAW / "fenway_bbe.parquet")
    neutral = pd.read_parquet(RAW / "neutral_bbe.parquet")
    models: dict[str, FenwayOutcomeModel] = {}
    neutral_models: dict[str, FenwayOutcomeModel] = {}

    players = [get_player(args.player)] if args.player else load_roster()
    built = []
    for player in players:
        if not (RAW / f"{player['slug']}_2026_bbe.parquet").exists():
            print(f"skipping {player['name']}: run data/fetch_players.py --player {player['slug']} first\n")
            continue
        built.append(build_player(player, fenway, neutral, models, neutral_models))

    # the app needs the roster (page list + trade facts) and the full fence
    # outline for the field SVG, not just per-ball lookups
    shutil.copyfile(HERE / "data" / "roster.json", OUT_DIR.parent / "roster.json")
    geo = json.loads((HERE / "data" / "geometry" / "fenway.json").read_text())
    (OUT_DIR.parent / "geometry.json").write_text(json.dumps(geo, separators=(",", ":")))
    print("built pages:", ", ".join(m["slug"] for m in built) or "(none)")


if __name__ == "__main__":
    main()
