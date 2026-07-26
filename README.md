# Curtis Mead at Fenway Park

Interactive spray chart translating every Curtis Mead 2026 batted ball onto
Fenway Park's fences — wall heights included. Built the week Boston acquired
him from Washington.

**Live:** https://philipmathieu.github.io/curtis-redux/

## How it works

- `data/` — Statcast pulls (pybaseball): Mead's 2026 batted balls and ~12k
  league batted balls at Fenway 2021–2026, plus fence geometry traced from
  the GeomMLBStadiums outline with published wall heights (`geometry/fenway.json`).
- `model/` — two layers: a drag+lift trajectory model refit on Mead's own
  home runs (carry MAE 13 ft), and a k=100 nearest-neighbor outcome model
  over real right-handed Fenway batted balls in (EV, LA, spray) space.
  Over tall walls the physics gets weight by how unambiguous its clearance
  verdict is; over the 3–5 ft fences the empirical model stands alone.
  `model/validate.py` runs the reconciliation/calibration checks.
- `build_dataset.py` — emits `app/src/data.json` (committed; the Pages build
  needs no Python).
- `app/` — Vite + React + Tailwind 4. All user-facing prose is in
  `app/src/copy.js`.

Rebuild data: `uv run python data/fetch_mead.py && uv run python data/fetch_fenway_bbe.py && uv run python data/fetch_neutral_bbe.py && uv run python data/build_geometry.py && uv run python build_dataset.py`

## Embedding in a blog post

The app supports `?embed=1` (suppresses header/footnotes) and posts its
rendered height to the parent window. In the post:

```html
<iframe
  id="fenway-mead"
  src="https://philipmathieu.github.io/curtis-redux/?embed=1"
  style="width: 100%; border: 0;"
  title="Curtis Mead at Fenway Park — interactive spray chart"
></iframe>
<script>
  window.addEventListener("message", (e) => {
    if (e.origin !== "https://philipmathieu.github.io") return;
    if (e.data?.type === "fenway-mead:height") {
      document.getElementById("fenway-mead").style.height = e.data.height + "px";
    }
  });
</script>
```
