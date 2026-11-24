import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { photos } from './data';

const GAP = 12; // Airbnb grid: 12px gutters, 16px tile radius

type Props = {
  current: number;
  /** tile hidden while the shared-element flyer is standing in for it */
  hiddenIndex: number | null;
  onPick: (i: number, tile: HTMLElement) => void;
  /** fires once tiles are positioned and the current one is scrolled into view */
  onLaidOut: (grid: HTMLElement) => void;
};

/** Airbnb-style masonry: each photo drops into the currently shortest column, keeping its own aspect ratio. */
export function PhotoGrid({ current, hiddenIndex, onPick, onLaidOut }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = box.current!;
    setWidth(el.getBoundingClientRect().width); // synchronous first measure, so a morph can target a tile immediately
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

  // first layout: bring the photo you were on into view, then let the viewer start its morph
  const ready = layout.items.length > 0;
  useLayoutEffect(() => {
    if (!ready) return;
    const it = layout.items[current];
    const s = scroller.current!;
    if (it) s.scrollTop = Math.max(0, it.y + 16 - (s.clientHeight - it.h) / 2);
    onLaidOut(box.current!);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={scroller} className="pv__gridScroll">
      <div ref={box} className="pv__grid" style={{ height: layout.height }}>
        {layout.items.map(({ i, x, y, w, h }) => (
          <button
            key={photos[i].src}
            type="button"
            className="pv__tile"
            data-index={i}
            style={{ transform: `translate(${x}px, ${y}px)`, width: w, height: h, visibility: hiddenIndex === i ? 'hidden' : undefined }}
            aria-label={`Open photo ${i + 1} of ${photos.length}`}
            onClick={(e) => onPick(i, e.currentTarget)}
          >
            <img src={photos[i].src} alt="" loading={Math.abs(i - current) < 16 ? 'eager' : 'lazy'} />
          </button>
        ))}
      </div>
    </div>
  );
}
