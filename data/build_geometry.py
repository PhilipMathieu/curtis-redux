"""Build data/geometry/fenway.json — radial fence model (spec §4).

Distances: traced from the GeomMLBStadiums Fenway outline
(inst/extdata/mlb_stadia_paths.csv, segment=outfield_outer), transformed with
the same MLBAM feet transform used for batted balls, resampled to 1-degree
spray breakpoints, with the Pesky Pole knot (45deg, 302 ft) appended since the
traced outline cuts the sharply curved RF corner.

Heights: piecewise by segment. The Monster's angular span was validated
against its documented 231-ft length: pole (310 ft @ -45deg) to a corner at
-9.4deg gives a 223-ft wall (matches); the prototype's -19.5deg corner gives
166 ft (doesn't). Seamheads lists 37/18/9/5/3 at its five fixed markers; its
LC=18 and CF=9 disagree with the documented Monster span and the 17-ft CF
wall, so heights here follow the standard published values and the outline's
kinks, with Seamheads as corroboration for LF/RC/RF.

Usage: uv run python data/build_geometry.py
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
CSV = HERE / "raw" / "mlb_stadia_paths.csv"
OUT = HERE / "geometry" / "fenway.json"

# (start_deg, end_deg, height_ft) — corners from outline kinks
HEIGHT_SEGMENTS = [
    (-45.0, -9.4, 37.17, "Green Monster"),
    (-9.4, 12.5, 17.0, "CF / Triangle"),
    (12.5, 41.5, 5.0, "Bullpen fence"),
    (41.5, 45.0, 3.0, "Right field (Pesky)"),
]

PESKY_POLE = (45.0, 302.0)


def height_at(spray: float) -> float:
    for a0, a1, h, _ in HEIGHT_SEGMENTS:
        if a0 <= spray <= a1:
            return h
    return HEIGHT_SEGMENTS[-1][2]


def main() -> None:
    df = pd.read_csv(CSV)
    oo = df[(df.team == "red_sox") & (df.segment == "outfield_outer")].copy()
    oo["x_ft"] = 2.495 * (oo.x - 125.42)
    oo["y_ft"] = 2.495 * (198.27 - oo.y)
    oo["d"] = np.hypot(oo.x_ft, oo.y_ft)
    oo["spray"] = np.degrees(np.arctan2(oo.x_ft, oo.y_ft))
    oo = oo[(oo.spray >= -45.5) & (oo.spray <= 45.5)].sort_values("spray")

    sprays = np.arange(-45.0, 45.0 + 0.001, 1.0)
    dists = np.interp(sprays, oo.spray, oo.d)
    # traced outline cuts the RF corner; force the pole knot
    dists[-1] = PESKY_POLE[1]

    breakpoints = [
        [round(float(s), 1), round(float(d), 1), height_at(float(s))]
        for s, d in zip(sprays, dists)
    ]

    # Drawing outline: corner-preserving simplification of the trace so the
    # bullpen fence renders as the straight segments it actually is, rather
    # than the resample's synthetic-looking smooth arc. Model lookups keep
    # the 1-degree table above.
    pts = [(np.sin(np.radians(s)) * d, np.cos(np.radians(s)) * d) for s, d in zip(sprays, dists)]

    def rdp(points, eps):
        if len(points) < 3:
            return points
        (x0, y0), (x1, y1) = points[0], points[-1]
        dx, dy = x1 - x0, y1 - y0
        norm = np.hypot(dx, dy) or 1e-9
        dmax, imax = 0.0, 0
        for i in range(1, len(points) - 1):
            d = abs(dy * (points[i][0] - x0) - dx * (points[i][1] - y0)) / norm
            if d > dmax:
                dmax, imax = d, i
        if dmax > eps:
            return rdp(points[: imax + 1], eps)[:-1] + rdp(points[imax:], eps)
        return [points[0], points[-1]]

    outline_xy = rdp(pts, 2.5)
    outline = [
        [round(float(np.degrees(np.arctan2(x, y))), 2), round(float(np.hypot(x, y)), 1)]
        for x, y in outline_xy
    ]

    checks = {
        "lf_line_310": breakpoints[0][1],
        "monster_corner_-9deg": breakpoints[36][1],
        "cf_389_9": breakpoints[45][1],
        "triangle_deepest": max(b[1] for b in breakpoints),
        "rf_pole_302": breakpoints[-1][1],
    }

    payload = {
        "park": "Fenway Park",
        "convention": "spray_deg: -45 = LF line, 0 = CF, +45 = RF line; dist ft; height ft",
        "breakpoints": breakpoints,
        "outline": outline,
        "segments": [
            {"name": name, "from_deg": a0, "to_deg": a1, "height_ft": h}
            for a0, a1, h, name in HEIGHT_SEGMENTS
        ],
        "provenance": {
            "distances": "GeomMLBStadiums mlb_stadia_paths.csv (bdilday, GitHub main) outfield_outer, MLBAM transform 2.495*(x-125.42)/(198.27-y), 1-deg resample; RF pole knot forced to 302",
            "heights": "Published Fenway values (Monster 37'2\", CF 17, bullpen 5, Pesky 3); segment corners from outline kinks; Monster span validated vs its 231-ft documented length; Seamheads corroborates LF 37 / RC 5 / RF 3 (its LC 18 / CF 9 markers conflict with Monster span and were not used)",
            "built": "2026-07-26",
        },
        "sanity": checks,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, indent=1))
    print(json.dumps(checks, indent=2))
    print(f"wrote {len(breakpoints)} breakpoints -> {OUT}")


if __name__ == "__main__":
    main()
