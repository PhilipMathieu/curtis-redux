// Hover tooltip, absolutely positioned inside a relative container.
// Content arrives as React children (auto-escaped), never raw HTML.
export default function Tip({ x, y, w, h, estH = 60, children }) {
  const width = 176;
  const left = Math.max(4, Math.min(x + 14, (w ?? 640) - width - 4));
  // flip above the pointer when the estimated box would leave the container
  const top = h != null && y + 14 + estH > h ? Math.max(4, y - estH - 10) : y + 14;
  return (
    <div
      className="pointer-events-none absolute z-10 rounded border border-gray-200 bg-white px-2.5 py-2 text-xs shadow-md"
      style={{ left, top, width }}
    >
      {children}
    </div>
  );
}
