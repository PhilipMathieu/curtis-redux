"""Radial Fenway fence lookup from data/geometry/fenway.json (spec §4)."""

from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

GEOMETRY_PATH = Path(__file__).resolve().parent.parent / "data" / "geometry" / "fenway.json"


@lru_cache(maxsize=1)
def _load():
    payload = json.loads(GEOMETRY_PATH.read_text())
    return payload["breakpoints"], payload["segments"]


def fence_at(spray: float) -> tuple[float, float]:
    """(fence distance ft, wall height ft) at a spray angle, linear in distance."""
    bps, _ = _load()
    s = max(bps[0][0], min(bps[-1][0], spray))
    for i in range(1, len(bps)):
        a0, d0, h0 = bps[i - 1]
        a1, d1, h1 = bps[i]
        if a0 <= s <= a1:
            f = (s - a0) / max(a1 - a0, 1e-9)
            return d0 + f * (d1 - d0), h0 if f < 0.5 else h1
    return bps[-1][1], bps[-1][2]


def segment_name(spray: float) -> str:
    _, segments = _load()
    for seg in segments:
        if seg["from_deg"] <= spray <= seg["to_deg"]:
            return seg["name"]
    return segments[-1]["name"]


def wall_sigma(spray: float) -> float:
    """Per-segment clearance noise (ft) for Layer 1 — Monster wind is the wild one."""
    return 5.0 if segment_name(spray) == "Green Monster" else 4.0
