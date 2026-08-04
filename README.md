# Boston's 2026 deadline pickups at Fenway Park

Interactive spray charts translating every 2026 batted ball by the hitters
Boston acquired at the trade deadline onto Fenway Park's fences — wall heights
included. One page per player; it started as the Curtis Mead page, built the
week Boston got him from Washington.

**Live:** https://philipmathieu.github.io/curtis-redux/

| Page | Player | Acquired |
| --- | --- | --- |
| `?player=mead` | Curtis Mead, 3B | from Washington for Connelly Early, July 25 |
| `?player=rutschman` | Adley Rutschman, C (switch) | from Baltimore, August 3 |
| `?player=rogers` | Jake Rogers, C | from Baltimore in the Rutschman deal, August 3 |
| `?player=white` | Eli White, OF | from Atlanta for Tyler Uberstine, August 3 |

Erik Miller (LHP) and Carlos Gutierrez (MiLB OF) have no MLB batted balls to
translate, so they get no page.

## How it works

- `data/roster.json` — the one place a player is added: MLBAM id (or a name to
  resolve), handedness, and the trade line the page's kicker is built from.
- `data/` — Statcast pulls (pybaseball): each hitter's 2026 batted balls and
  ~12k league batted balls at Fenway 2021–2026, plus fence geometry traced from
  the GeomMLBStadiums outline with published wall heights (`geometry/fenway.json`).
  The comparison pools exclude every roster hitter, so no ball is ever its own
  nearest neighbor.
- `model/` — two layers: a drag+lift trajectory model refit on each hitter's own
  home runs (falling back to Mead's constants when there are too few to fit),
  and a k=100 nearest-neighbor outcome model over real Fenway batted balls in
  (EV, LA, spray) space. The neighbor pool is same-handed — pull side is the
  whole story at Fenway — so a switch hitter like Rutschman is modeled twice,
  once per side he swings from. Over tall walls the physics gets weight by how
  unambiguous its clearance verdict is; over the 3–5 ft fences the empirical
  model stands alone. `model/validate.py` runs the reconciliation/calibration
  checks per player.
- `build_dataset.py` — emits `app/src/players/<slug>.json` (committed; the Pages
  build needs no Python).
- `app/` — Vite + React + Tailwind 4. `?player=<slug>` selects the page and each
  player's data is a separate lazy chunk. All user-facing prose is in
  `app/src/copy.js`.

Rebuild data:

```
uv run python data/fetch_players.py       # add --player <slug> for one hitter
uv run python data/fetch_fenway_bbe.py
uv run python data/fetch_neutral_bbe.py
uv run python build_dataset.py            # same --player flag
```

Or run the **Rebuild batted-ball data** workflow (`.github/workflows/data.yml`)
from the Actions tab — it does all of the above on a runner and commits the
JSON back to the branch.

## Embedding in a blog post

The app supports `?embed=1` (suppresses header/footnotes) and posts its
rendered height to the parent window. Add `&player=<slug>` to embed a hitter
other than the default. In the post:

```html
<iframe
  id="fenway-mead"
  src="https://philipmathieu.github.io/curtis-redux/?embed=1&player=mead"
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

The height message carries a `player` field alongside `height`, so one page can
host several embeds.
