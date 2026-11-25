import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { photos } from './data';

const GAP = 12; // Airbnb grid: 12px gutters, 16px tile radius

// "Populate" reveal for when the gallery opens directly (View all): tiles on screen rise + fade in,
// staggered top-left → bottom-right. Off-screen tiles are simply there.
const REVEAL_MS = 520;
const REVEAL_STEP = 22; // ms between tiles
const REVEAL_MAX = 330; // cap on the last tile's delay, so a tall viewport doesn't drag
const REVEAL_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)';

type Props = {
  current: number;
  /** tile hidden while the shared-element flyer is standing in for it */
  hiddenIndex: number | null;
  onPick: (i: number, tile: HTMLElement) => void;
  /** fires once tiles are positioned and the current one is scrolled into view */
  onLaidOut: (grid: HTMLElement) => void;
  /** read once on mount: true when opened straight into the grid (not morphing in from a photo) */
  reveal?: boolean;
  /** photo indices to show, in order (sort + filters applied) */
  order: number[];
  /** results are on their way: tiles show the placeholder only (Figma 4.2) */
  loading?: boolean;
  /** bumps whenever new results are requested — the grid goes back to the top */
  reloadKey?: number;
  /** read once on mount: open at the top instead of on the current photo (results that just loaded) */
  startAtTop?: boolean;
};

/** Airbnb-style masonry: each photo drops into the currently shortest column, keeping its own aspect ratio. */
export function PhotoGrid({ current, hiddenIndex, onPick, onLaidOut, reveal = false, order, loading = false, reloadKey = 0, startAtTop = false }: Props) {
  const topOnMount = useRef(startAtTop);
  const revealOnMount = useRef(reveal);
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
    const items = order.map((i) => {
      const p = photos[i];
      const c = heights.indexOf(Math.min(...heights));
      const h = Math.round((colW * p.h) / p.w);
      const item = { i, x: c * (colW + GAP), y: heights[c], w: colW, h };
      heights[c] += h + GAP;
      return item;
    });
    return { items, height: Math.max(...heights) - GAP };
  }, [width, cols, order]);

  // first layout: bring the photo you were on into view, then let the viewer start its morph
  const ready = layout.items.length > 0;
  useLayoutEffect(() => {
    if (!ready) return;
    const it = layout.items.find((t) => t.i === current);
    const s = scroller.current!;
    if (it && !topOnMount.current) s.scrollTop = Math.max(0, it.y + 16 - (s.clientHeight - it.h) / 2);
    if (revealOnMount.current) populate(box.current!, layout.items, s.scrollTop, s.clientHeight);
    onLaidOut(box.current!);
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // new results load from the top
  const firstKey = useRef(reloadKey);
  useLayoutEffect(() => {
    if (reloadKey !== firstKey.current) scroller.current!.scrollTop = 0;
  }, [reloadKey]);

  const near = Math.max(0, order.indexOf(current));
  return (
    <div ref={scroller} className="pv__gridScroll">
      <div ref={box} className="pv__grid" style={{ height: layout.height }} data-loading={loading || undefined} aria-busy={loading}>
        {layout.items.map(({ i, x, y, w, h }, rank) => (
          <button
            key={photos[i].src}
            type="button"
            className="pv__tile"
            data-index={i}
            style={{ left: x, top: y, width: w, height: h, visibility: hiddenIndex === i ? 'hidden' : undefined }}
            aria-label={`Open photo ${rank + 1} of ${order.length}`}
            tabIndex={loading ? -1 : undefined}
            onClick={(e) => !loading && onPick(i, e.currentTarget)}
          >
            <img
              ref={markIfLoaded}
              src={photos[i].src}
              alt=""
              loading={Math.abs(rank - near) < 16 ? 'eager' : 'lazy'}
              onLoad={(e) => e.currentTarget.setAttribute('data-loaded', '')}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

/** cached images are complete before React's onLoad can matter: show them straight away */
function markIfLoaded(img: HTMLImageElement | null) {
  if (img?.complete && img.naturalWidth) img.setAttribute('data-loaded', '');
}

type Item = { i: number; x: number; y: number; w: number; h: number };

/** Runs before first paint, so tiles start hidden (fill: backwards) — no flash of the finished grid. */
function populate(grid: HTMLElement, items: Item[], scrollTop: number, viewH: number) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const visible = items
    .filter((it) => it.y + it.h > scrollTop && it.y < scrollTop + viewH)
    // reading order with a slight diagonal: rows lead, columns trail a little
    .sort((a, b) => a.y - scrollTop + a.x * 0.45 - (b.y - scrollTop + b.x * 0.45));
  visible.forEach((it, rank) => {
    const tile = grid.querySelector<HTMLElement>(`[data-index="${it.i}"]`);
    if (!tile) return;
    const delay = 60 + Math.min(rank * REVEAL_STEP, REVEAL_MAX);
    tile.animate(
      reduce
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { opacity: 0, translate: '0 18px', scale: '0.97' },
            { opacity: 1, translate: '0 0', scale: '1' },
          ],
      { duration: reduce ? 200 : REVEAL_MS, delay: reduce ? 0 : delay, easing: REVEAL_EASE, fill: 'backwards' },
    );
  });
}
