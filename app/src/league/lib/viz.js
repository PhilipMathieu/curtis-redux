// Chart constants for the league page. Colors come from the site palette in
// ../../index.css and were validated with the dataviz six-checks against the
// white card surface (batting↔pitching worst-pair CVD ΔE 21.1, normal 25.5).

export const ACCENT = "#CE112D"; // primary-500 — the emphasized team
export const ACCENT_TEXT = "#A00E24"; // primary-600 — passes text contrast

// Up to two teams can be emphasized at once: the focus team in the site
// red, a comparison team in the link blue (pair CVD ΔE 20.0 on white).
export const EMPHASIS = [
  { mark: "#CE112D", text: "#A00E24" },
  { mark: "#1580B0", text: "#0F6285" },
];
export const emphasisOf = (selected, id) => {
  const i = selected.indexOf(id);
  return i >= 0 ? EMPHASIS[i] : null;
};
export const DE_EMPH = "#CCCCCC"; // gray-300 — every other team's line
export const GRID = "#E5E5E5"; // gray-200 hairlines
export const INK = "#1A1A1A"; // gray-800
export const INK_2 = "#4A4A4A"; // gray-600
export const INK_MUTED = "#666666"; // gray-500

export const BATTING = "#1580B0"; // link-600
export const PITCHING = "#B8860B"; // gold, shared with the 3B outcome color

// Sequential ramp on the link-blue hue, OKLCH monotone lightness L 0.95→0.37.
// Domain is roto points 1..N teams, light→dark.
export const RAMP = [
  "#dff2fd", "#b5def7", "#8dcaee", "#64b2de",
  "#3596c8", "#077bab", "#085f85", "#004564",
];

export function rampIndex(points, nTeams) {
  const t = (points - 1) / Math.max(1, nTeams - 1); // 1..N → 0..1
  return Math.min(RAMP.length - 1, Math.max(0, Math.round(t * (RAMP.length - 1))));
}
export const rampColor = (points, nTeams) => RAMP[rampIndex(points, nTeams)];
// White ink only on the four darkest steps — the lighter ones keep gray-800.
export const rampInk = (points, nTeams) =>
  rampIndex(points, nTeams) >= 5 ? "#FFFFFF" : INK;

// Canonical 5×5 display order (the feed lists scoringItems interleaved).
export const BAT_ORDER = [20, 5, 21, 23, 2]; // R HR RBI SB AVG
export const PIT_ORDER = [53, 57, 48, 47, 41]; // W SV K ERA WHIP

export const fmtPts = (n) =>
  n == null ? "—" : Number.isInteger(n) ? `${n}` : n.toFixed(1);

const RATIO_FMT = {
  2: (v) => v.toFixed(3).replace(/^0/, ""), // AVG .252
  47: (v) => v.toFixed(2), // ERA
  41: (v) => v.toFixed(2), // WHIP
};
export function fmtStat(statId, v) {
  if (v == null) return "—";
  const f = RATIO_FMT[statId];
  return f ? f(v) : `${Math.round(v).toLocaleString("en-US")}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDate(iso) {
  const d = new Date(`${iso}T12:00:00`);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}
export const monthOf = (iso) => MONTHS[new Date(`${iso}T12:00:00`).getMonth()];
