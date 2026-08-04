"""Batted-ball trajectory model, ported from the prototype (scratch/pipeline.py).

2D point mass with quadratic drag + effective backspin lift; constants refit
per hitter on his own tracked home runs (fit_drag_lift), falling back to the
Mead-fit KD/KL below for hitters without enough of them. With the fallback
values the reference carries are 100 mph / 27 deg -> ~385 ft; 105/30 ->
~414; 110/28 -> ~436. Lift components are the perpendicular rotation of
the velocity vector: (-KL*s*vy, +KL*s*vx).
"""

from __future__ import annotations

import math

G = 32.17  # ft/s^2
CONTACT_HEIGHT = 3.0  # ft

# Refit on Mead's 18 tracked 2026 HRs (spec §6.2): carry vs hit_distance_sc
# MAE 13.0 ft, bias +4.0 ft. Prototype values (0.00170/0.00060) gave
# MAE 14.9 with +8.6 overcarry bias.
KD = 0.00190  # drag, 1/ft
KL = 0.00088  # lift, 1/ft


def trajectory(ev_mph: float, la_deg: float, dt: float = 0.01,
               kd: float = KD, kl: float = KL):
    """Integrate flight; returns (carry_ft, apex_ft, hang_s, xs, ys)."""
    v = ev_mph * 1.46667  # ft/s
    th = math.radians(la_deg)
    vx, vy = v * math.cos(th), v * math.sin(th)
    x, y = 0.0, CONTACT_HEIGHT
    xs, ys = [x], [y]
    t = 0.0
    apex = y
    while y > 0 and t < 12:
        s = math.hypot(vx, vy)
        ax = -kd * s * vx - kl * s * vy
        ay = -G - kd * s * vy + kl * s * vx
        vx += ax * dt
        vy += ay * dt
        x += vx * dt
        y += vy * dt
        t += dt
        apex = max(apex, y)
        xs.append(x)
        ys.append(y)
    return x, apex, t, xs, ys


def carry_error(evs, las, dists, kd: float, kl: float) -> tuple[float, float]:
    """(MAE, bias) of modeled carry vs tracked distance for a set of balls."""
    errs = [trajectory(ev, la, kd=kd, kl=kl)[0] - d for ev, la, d in zip(evs, las, dists)]
    n = max(len(errs), 1)
    # plain floats, not numpy scalars: these land in JSON
    return float(sum(abs(e) for e in errs) / n), float(sum(errs) / n)


def fit_drag_lift(evs, las, dists) -> dict:
    """Grid-search KD/KL against a hitter's own tracked home runs.

    Home runs only: they are the balls whose carry Statcast measures rather
    than infers, and they are the flights this model has to get right. The
    grid brackets the physically plausible range for a batted ball with
    backspin; the search is coarse on purpose, since with ~20 HRs anything
    finer is fitting noise.
    """
    best = None
    kd = 0.00150
    while kd <= 0.00240001:
        kl = 0.00050
        while kl <= 0.00130001:
            mae, bias = carry_error(evs, las, dists, kd, kl)
            if best is None or mae < best["mae_ft"]:
                best = {"kd": round(kd, 6), "kl": round(kl, 6),
                        "mae_ft": round(mae, 1), "bias_ft": round(bias, 1)}
            kl += 0.00002
        kd += 0.00005
    return best


def height_at(xs: list[float], ys: list[float], d: float) -> float | None:
    """Ball height when horizontal distance = d (None if it lands short)."""
    if d > xs[-1]:
        return None
    for i in range(1, len(xs)):
        if xs[i] >= d:
            f = (d - xs[i - 1]) / max(xs[i] - xs[i - 1], 1e-9)
            return ys[i - 1] + f * (ys[i] - ys[i - 1])
    return None


def arc_points(xs: list[float], ys: list[float], n: int = 20) -> list[list[float]]:
    """Downsample the flight path for the UI cross-section (real arc, not a sketch)."""
    if len(xs) <= n:
        idx = range(len(xs))
    else:
        step = (len(xs) - 1) / (n - 1)
        idx = [round(i * step) for i in range(n)]
    return [[round(xs[i], 1), round(ys[i], 1)] for i in idx]


if __name__ == "__main__":
    for ev, la, expect in [(100, 27, 385), (105, 30, 414), (110, 28, 436)]:
        c, a, t, xs, ys = trajectory(ev, la)
        print(f"EV {ev} LA {la}: carry {c:.0f} ft (refit ref ~{expect}), apex {a:.0f}, hang {t:.1f}s")
