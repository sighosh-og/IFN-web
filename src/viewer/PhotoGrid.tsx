import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { photos, siblingsOf } from './data';

const GAP = 12; // Airbnb grid: 12px gutters, 16px tile radius

/**
 * Airbnb-style masonry: each photo drops into the currently shortest column, keeping its own aspect ratio.
 * Photos from the same review are adjacent in the feed, carry an "n/N" badge, and hovering one
 * dims every tile that isn't from that review.
 */
export function PhotoGrid({ current, onPick }: { current: number; onPick: (i: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [hoverReview, setHoverReview] = useState<string | null>(null);

  useLayoutEffect(() => {
    const el = box.current!;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const cols = width >= 1100 ? 4 : width >= 760 ? 3 : 2;
  const layout = useMemo(() => {
    if (!width) return { items: [], height: 0 };
    const colW = (width - GAP * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);
    const items = photos.map((p, i) => {
      const c = heights.indexOf(Math.min(...heights));
      const h = Math.round((colW * p.h) / p.w);
      const item = { i, x: c * (colW + GAP), y: heights[c], w: colW, h };
      heights[c] += h + GAP;
      return item;
    });
    return { items, height: Math.max(...heights) - GAP };
  }, [width, cols]);

  // returning from photo mode: bring the photo you were on into view
  useLayoutEffect(() => {
    const it = layout.items[current];
    const scroller = box.current?.closest('.pv__gridScroll');
    if (it && scroller) scroller.scrollTop = Math.max(0, it.y - (scroller.clientHeight - it.h) / 2);
  }, [layout.items.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="pv__gridScroll">
      <div ref={box} className="pv__grid" style={{ height: layout.height }} onPointerLeave={() => setHoverReview(null)}>
        {layout.items.map(({ i, x, y, w, h }) => {
          const p = photos[i];
          const sib = siblingsOf(i);
          const n = sib.findIndex((s) => s.index === i) + 1;
          return (
            <button
              key={p.src}
              type="button"
              className="pv__tile"
              style={{ transform: `translate(${x}px, ${y}px)`, width: w, height: h }}
              data-dim={(hoverReview && hoverReview !== p.review) || undefined}
              data-current={i === current || undefined}
              aria-label={`Open photo ${i + 1}${sib.length > 1 ? `, ${n} of ${sib.length} from one review` : ''}`}
              onPointerEnter={() => setHoverReview(p.review)}
              onFocus={() => setHoverReview(p.review)}
              onClick={() => onPick(i)}
            >
              <img src={p.src} alt="" loading="lazy" />
              {sib.length > 1 && (
                <span className="pv__badge" aria-hidden>
                  <svg width="12" height="12" viewBox="0 0 16 16">
                    <rect x="4.5" y="1.5" width="10" height="10" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M1.5 5v7a2.5 2.5 0 0 0 2.5 2.5h7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  {n}/{sib.length}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
