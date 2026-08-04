// Field projection + fence lookups shared by the spray chart and detail card.
// Ported from the prototype's display logic; geometry now comes from the
// traced Fenway outline (data/geometry/fenway.json) instead of a hand table.
import geometry from "../geometry.json";

export const BREAKPOINTS = geometry.breakpoints; // [spray, dist, height][]
export const OUTLINE = geometry.outline; // corner-preserving [spray, dist][] for drawing
export const SEGMENTS = geometry.segments;

export function fenceAt(spray) {
  const bps = BREAKPOINTS;
  const s = Math.max(bps[0][0], Math.min(bps[bps.length - 1][0], spray));
  // height from the segment table so boundaries match segment names exactly
  // (mirrors model/fence.py)
  let height = SEGMENTS[SEGMENTS.length - 1].height_ft;
  for (const seg of SEGMENTS) {
    if (s >= seg.from_deg && s <= seg.to_deg) {
      height = seg.height_ft;
      break;
    }
  }
  for (let i = 1; i < bps.length; i++) {
    const [a0, d0] = bps[i - 1];
    const [a1, d1] = bps[i];
    if (s >= a0 && s <= a1) {
      const f = (s - a0) / Math.max(a1 - a0, 1e-9);
      return [d0 + f * (d1 - d0), height];
    }
  }
  return [bps[bps.length - 1][1], height];
}

export function wallSigma(seg) {
  // per-segment clearance noise (ft) — Monster wind is the variable one
  return seg === "Green Monster" ? 5 : 4;
}

// SVG projection: home plate bottom-center, 1 ft -> PX
export const PX = 1.02;
export const HX = 320;
export const HY = 500;

export function proj(spray, d) {
  const t = (spray * Math.PI) / 180;
  return [HX + Math.sin(t) * d * PX, HY - Math.cos(t) * d * PX];
}

export function fencePath(inflateFt = 0) {
  return OUTLINE.map(([a, d]) => proj(a, d + inflateFt));
}

export function monsterPath() {
  // the Monster band: outline vertices up to the corner, plus the exact
  // -9.4deg corner point (the simplified outline's next vertex overshoots it)
  const corner = SEGMENTS[0].to_deg;
  const pts = OUTLINE.filter(([a]) => a < corner).map(([a, d]) => proj(a, d));
  pts.push(proj(corner, fenceAt(corner)[0]));
  return pts;
}

// display position: wall balls pinned at the fence, HRs land beyond it
export function dotPos(r) {
  const [fd] = fenceAt(r.spray);
  let d = r.dist;
  if (r.hf != null) d = r.fp.HR >= 0.5 ? Math.max(r.dist, fd + 14) : fd - 3;
  return proj(r.spray, Math.min(d, fd + 42));
}

export const OUTCOMES = ["HR", "3B", "2B", "1B", "Out"];

export const OUTCOME_COLOR = {
  HR: "#CE112D",
  "3B": "#B8860B",
  "2B": "#157A4A",
  "1B": "#1580B0",
  Out: "#CCCCCC",
};

export const OUTCOME_LABEL = {
  HR: "Home run",
  "3B": "Triple",
  "2B": "Double",
  "1B": "Single",
  Out: "Out",
};

// All 30, since the pages now cover hitters who played all over the league.
export const TEAM_NAME = {
  WSH: "Nationals Park", ATH: "Sutter Health Park", SF: "Oracle Park",
  PIT: "PNC Park", BAL: "Camden Yards", MIL: "American Family Field",
  AZ: "Chase Field", CLE: "Progressive Field", ATL: "Truist Park",
  CWS: "Rate Field", BOS: "Fenway Park", TB: "George M. Steinbrenner Field",
  NYM: "Citi Field", COL: "Coors Field", PHI: "Citizens Bank Park",
  MIA: "loanDepot park", TEX: "Globe Life Field", LAA: "Angel Stadium",
  SD: "Petco Park", CIN: "Great American Ball Park", CHC: "Wrigley Field",
  DET: "Comerica Park", HOU: "Daikin Park", KC: "Kauffman Stadium",
  LAD: "Dodger Stadium", MIN: "Target Field", NYY: "Yankee Stadium",
  SEA: "T-Mobile Park", STL: "Busch Stadium", TOR: "Rogers Centre",
};
