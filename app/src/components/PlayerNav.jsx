import { COPY } from "../copy.js";

// One tab per roster hitter. Real links (?player=slug) so a page can be
// shared, bookmarked and crawled; the click handler keeps it a SPA nav.
export default function PlayerNav({ players, slug, available, onSelect }) {
  return (
    <nav aria-label={COPY.navLabel} className="mb-4 flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-500">
        {COPY.navLabel}
      </span>
      {players.map((p) => {
        const on = p.slug === slug;
        const has = available.includes(p.slug);
        return (
          <a
            key={p.slug}
            href={`?player=${p.slug}`}
            aria-current={on ? "page" : undefined}
            title={has ? p.name : `${p.name} — ${COPY.navPending}`}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              onSelect(p.slug);
            }}
            className={`rounded-sm border px-3 py-1 text-xs font-medium tracking-wide no-underline transition-colors hover:no-underline ${
              on
                ? "border-primary-500 bg-primary-500/5 text-primary-600"
                : has
                  ? "border-gray-300 bg-white text-gray-600 hover:border-gray-500"
                  : "border-dashed border-gray-300 bg-white text-gray-500"
            }`}
          >
            {p.short}
            <span className="ml-1 text-[10px] text-gray-500">{p.pos}</span>
          </a>
        );
      })}
    </nav>
  );
}
