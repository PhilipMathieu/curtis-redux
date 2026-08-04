"""Two-layer Fenway outcome model (spec §5).

Layer 2 (primary): empirical KNN over real Fenway batted balls — "of the
k=100 most similar balls hit at Fenway by a hitter batting from this side,
what happened?" Learns Monster caroms, Triangle triples, and shallow-RF
doubles from data. The pool is same-handed because pull side is the whole
story at Fenway: an RHB's pull side is the Monster, a LHB's is the Pesky
Pole, and mixing them would average two different parks together.

Layer 1 (overlay): physics P(clear) from the trajectory model and wall
height, with per-segment sigma. Shown in the cross-section viz and used as
a divergence check against Layer 2 — broad disagreement is a bug signal.
"""

from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.neighbors import NearestNeighbors
from sklearn.preprocessing import StandardScaler

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fence import fence_at, wall_sigma
from trajectory import KD, KL, height_at, trajectory

OUTCOMES = ["HR", "3B", "2B", "1B", "Out"]
K = 100


class FenwayOutcomeModel:
    """KNN in standardized (EV, LA, spray) space over same-handed Fenway BBE."""

    def __init__(self, k: int = K, stand: str = "R"):
        self.k = k
        self.stand = stand
        self.scaler = StandardScaler()
        self.nn = NearestNeighbors(n_neighbors=k)
        self.outcomes: np.ndarray | None = None
        self.n_train = 0

    @staticmethod
    def features(df: pd.DataFrame) -> np.ndarray:
        return df[["launch_speed", "launch_angle", "spray_deg"]].to_numpy()

    def fit(self, fenway_bbe: pd.DataFrame) -> "FenwayOutcomeModel":
        pool = fenway_bbe[fenway_bbe["stand"] == self.stand].reset_index(drop=True)
        if len(pool) < self.k:
            raise ValueError(
                f"{len(pool)} {self.stand}HB batted balls in the pool, need >= k={self.k}"
            )
        X = self.scaler.fit_transform(self.features(pool))
        self.nn.fit(X)
        self.outcomes = pool["outcome"].to_numpy()
        self.n_train = len(pool)
        return self

    def predict_dist(self, ev: float, la: float, spray: float) -> dict[str, float]:
        X = self.scaler.transform([[ev, la, spray]])
        _, idx = self.nn.kneighbors(X)
        neigh = self.outcomes[idx[0]]
        return {o: round(float((neigh == o).mean()), 3) for o in OUTCOMES}


def predict_fenway(
    model: FenwayOutcomeModel, ev: float, la: float, spray: float,
    kd: float = KD, kl: float = KL,
) -> dict:
    """Blended Fenway outcome distribution.

    Layer 2 (empirical KNN) is primary. Over TALL walls (Monster, CF — where
    clearing the plane IS a home run), the KNN over-smooths extreme balls:
    a 110-mph bomb crossing 40 ft above the wall averages in neighbors that
    died at the track. There, physics gets weight by how unambiguous its
    verdict is: alpha = z^2/(z^2+4), z = (height_at_fence - wall)/sigma.
    Over LOW walls (bullpen 5 ft, Pesky 3 ft) physics "clears the plane" is
    not a HR verdict at all — fielders catch balls at the fence — so the
    empirical distribution stands alone and physics is overlay-only.
    """
    p2 = model.predict_dist(ev, la, spray)
    l1 = layer1_fence_interaction(ev, la, spray, kd=kd, kl=kl)
    p_hr = p2["HR"]
    if (
        l1["height_at_fence"] is not None
        and l1["fence_height"] >= 10.0
        and l1["p_clear"] is not None
    ):
        sigma = wall_sigma(spray)
        z = (l1["height_at_fence"] - l1["fence_height"]) / sigma
        alpha = z * z / (z * z + 4.0)
        p_hr = alpha * l1["p_clear"] + (1 - alpha) * p2["HR"]
    # keep Layer 2's relative split for the non-HR mass
    rest = max(1.0 - p_hr, 0.0)
    p2_rest = max(1.0 - p2["HR"], 1e-9)
    dist = {o: round(rest * p2[o] / p2_rest, 3) for o in OUTCOMES if o != "HR"}
    dist["HR"] = round(max(p_hr, 0.0), 3)
    return {"dist": dist, "layer2": p2, "layer1": l1}


def layer1_fence_interaction(
    ev: float, la: float, spray: float, kd: float = KD, kl: float = KL,
) -> dict:
    """Physics fence interaction at Fenway for the cross-section overlay."""
    carry, apex, hang, xs, ys = trajectory(ev, la, kd=kd, kl=kl)
    fdist, fh = fence_at(spray)
    h_f = height_at(xs, ys, fdist)
    p_clear = None
    if h_f is not None:
        sigma = wall_sigma(spray)
        p_clear = 1 / (1 + math.exp(-(h_f - fh) / sigma))
    return {
        "carry": carry, "apex": apex, "hang": hang,
        "fence_dist": fdist, "fence_height": fh,
        "height_at_fence": h_f, "p_clear": p_clear,
        "xs": xs, "ys": ys,
    }
