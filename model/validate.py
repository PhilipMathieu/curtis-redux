"""Pre-ship validation (spec §6), per roster hitter.

1. Physics anchors: model carry vs hit_distance_sc on the hitter's actual
   HRs (MAE must be < 15 ft, else refit KD/KL on his HR set).
2. Layer 2 calibration: reliability of KNN outcome probabilities on
   held-out same-handed Fenway BBE.
3. HR reconciliation: expected-Fenway-HR vs a physics hand count
   (must agree within +/-3).
4. Layer 1 vs Layer 2 divergence on fence-reaching balls (bug signal).

Usage: uv run python model/validate.py [--player SLUG] [--plot-dir DIR]
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from outcomes import OUTCOMES, FenwayOutcomeModel, predict_fenway
from trajectory import trajectory

sys.path.insert(0, str(HERE.parent / "data"))
sys.path.insert(0, str(HERE.parent))
from roster import load_roster  # noqa: E402
from build_dataset import drag_lift  # noqa: E402 — same KD/KL precedence as the build

RAW = HERE.parent / "data" / "raw"


def check_physics_anchors(bbe: pd.DataFrame, kd: float, kl: float) -> dict:
    hr = bbe[(bbe.outcome == "HR") & bbe.hit_distance_sc.notna()]
    errs = []
    for _, r in hr.iterrows():
        carry, *_ = trajectory(r.launch_speed, r.launch_angle, kd=kd, kl=kl)
        errs.append(carry - r.hit_distance_sc)
    errs = np.array(errs)
    return {"n_hr": len(hr), "mae_ft": float(np.abs(errs).mean()),
            "bias_ft": float(errs.mean()), "max_abs_ft": float(np.abs(errs).max())}


def check_calibration(fenway: pd.DataFrame, stand: str, plot_dir: Path | None,
                      seed: int = 7) -> dict:
    pool = fenway[fenway["stand"] == stand].reset_index(drop=True)
    rng = np.random.default_rng(seed)
    test_mask = rng.random(len(pool)) < 0.2
    train, test = pool[~test_mask], pool[test_mask]

    model = FenwayOutcomeModel(stand=stand).fit(train)
    X = model.scaler.transform(model.features(test))
    _, idx = model.nn.kneighbors(X)
    neigh_out = model.outcomes[idx]  # (n_test, k)

    stats: dict = {"n_train": len(train), "n_test": len(test)}
    rows = []
    for o in OUTCOMES:
        p = (neigh_out == o).mean(axis=1)
        y = (test["outcome"] == o).to_numpy()
        bins = np.clip((p * 10).astype(int), 0, 9)
        ece = 0.0
        for b in range(10):
            m = bins == b
            if m.sum():
                gap = abs(p[m].mean() - y[m].mean())
                ece += (m.sum() / len(p)) * gap
                rows.append({"outcome": o, "bin": b, "n": int(m.sum()),
                             "p_mean": float(p[m].mean()), "obs_rate": float(y[m].mean())})
        stats[f"ece_{o}"] = round(float(ece), 4)
        stats[f"base_{o}"] = round(float(y.mean()), 4)

    if plot_dir is not None:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        rel = pd.DataFrame(rows)
        fig, axes = plt.subplots(1, 5, figsize=(18, 3.6), facecolor="#F7F7F7")
        for ax, o in zip(axes, OUTCOMES):
            sub = rel[rel.outcome == o]
            ax.plot([0, 1], [0, 1], color="#CCCCCC", lw=1)
            ax.scatter(sub.p_mean, sub.obs_rate, s=sub.n / sub.n.max() * 120 + 8, color="#1580B0")
            ax.set_title(f"{o} (ECE {stats[f'ece_{o}']})", fontsize=10)
            ax.set_xlabel("predicted"); ax.set_xlim(-0.03, 1.03); ax.set_ylim(-0.03, 1.03)
            ax.set_facecolor("#F7F7F7")
        axes[0].set_ylabel("observed")
        fig.suptitle(f"Layer 2 KNN reliability — held-out {stand}HB Fenway BBE", fontsize=12)
        fig.tight_layout()
        fig.savefig(plot_dir / f"calibration_{stand}.png", dpi=150)
        stats["plot"] = str(plot_dir / f"calibration_{stand}.png")
    return stats


def check_hr_reconciliation(bbe: pd.DataFrame, fenway: pd.DataFrame,
                            kd: float, kl: float) -> dict:
    models = {s: FenwayOutcomeModel(stand=s).fit(fenway) for s in bbe["stand"].unique()}
    exp_hr = 0.0
    knn_exp_hr = 0.0
    hand_count = 0
    actual_hr_still_hr = 0
    diverg = []
    for _, r in bbe.iterrows():
        pred = predict_fenway(models[r.stand], r.launch_speed, r.launch_angle,
                              r.spray_deg, kd=kd, kl=kl)
        l1 = pred["layer1"]
        exp_hr += pred["dist"]["HR"]
        knn_exp_hr += pred["layer2"]["HR"]
        # hand count: unambiguous physics clears over tall walls only — over
        # the 3-5 ft fences "clearing the plane" is catchable, not a HR.
        clears = (
            l1["height_at_fence"] is not None
            and l1["fence_height"] >= 10.0
            and l1["height_at_fence"] > l1["fence_height"]
        )
        if clears:
            hand_count += 1
            if r.outcome == "HR":
                actual_hr_still_hr += 1
        if l1["p_clear"] is not None and l1["fence_height"] >= 10.0:
            diverg.append((l1["p_clear"], pred["layer2"]["HR"]))
    d = np.array(diverg)
    return {
        "expected_fenway_hr_blended": round(exp_hr, 1),
        "expected_fenway_hr_knn_only": round(knn_exp_hr, 1),
        "physics_hand_count_tall_walls": hand_count,
        "actual_hr": int((bbe.outcome == "HR").sum()),
        "actual_hr_clearing_fenway": actual_hr_still_hr,
        "tall_wall_fence_reaching": len(d),
        "layer_divergence_corr": round(float(np.corrcoef(d[:, 0], d[:, 1])[0, 1]), 3),
        "layer_divergence_mad": round(float(np.abs(d[:, 0] - d[:, 1]).mean()), 3),
    }


def validate_player(player: dict, fenway: pd.DataFrame, plot_dir: Path | None) -> None:
    path = RAW / f"{player['slug']}_2026_bbe.parquet"
    if not path.exists():
        print(f"skipping {player['name']}: no {path.name}\n")
        return
    bbe = pd.read_parquet(path)
    # same precedence as build_dataset.py: pinned constants, else the fit
    fit = drag_lift(player, bbe)
    kd, kl = fit["kd"], fit["kl"]

    print(f"########## {player['name']} ({len(bbe)} BBE, {fit['source']} KD/KL) ##########")
    print(f"=== 1. Physics anchors ({player['short']} HRs) ===")
    anchors = check_physics_anchors(bbe, kd, kl)
    print(anchors)
    status = "PASS" if anchors["mae_ft"] < 15 else "FAIL — refit KD/KL"
    print(f"MAE {anchors['mae_ft']:.1f} ft -> {status}\n")

    for stand in sorted(bbe["stand"].unique()):
        print(f"=== 2. Layer 2 calibration (held-out Fenway {stand}HB) ===")
        cal = check_calibration(fenway, stand, plot_dir)
        print({k: v for k, v in cal.items() if not k.startswith("base_")}, "\n")

    print("=== 3+4. HR reconciliation & layer divergence ===")
    rec = check_hr_reconciliation(bbe, fenway, kd, kl)
    print(rec)
    gap = abs(rec["expected_fenway_hr_blended"] - rec["physics_hand_count_tall_walls"])
    print(f"blended expected vs tall-wall hand count gap: {gap:.1f} -> "
          f"{'PASS' if gap <= 3 else 'REVIEW'}\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--player", help="roster slug; default all")
    ap.add_argument("--plot-dir", type=Path, default=None)
    args = ap.parse_args()
    if args.plot_dir:
        args.plot_dir.mkdir(parents=True, exist_ok=True)

    fenway = pd.read_parquet(RAW / "fenway_bbe.parquet")
    players = load_roster()
    if args.player:
        players = [p for p in players if p["slug"] == args.player]
    for player in players:
        validate_player(player, fenway, args.plot_dir)


if __name__ == "__main__":
    main()
