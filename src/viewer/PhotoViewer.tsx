import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useVariant } from '../variants/variants';
import { photos } from './data';
import { ReviewPanel } from './ReviewPanel';
import { PhotoGrid } from './PhotoGrid';
import { ReviewDots } from './ReviewDots';
import { ReviewThumbs } from './ReviewThumbs';
import { SlideStrip } from './SlideStrip';
import { IconArrow, IconClose } from './icons';
import { GalleryButton } from './GalleryButton';
import { FiltersModal, GalleryBar, NoResults } from './GalleryFilters';
import { ALL_PHOTOS, DEFAULT_FILTERS, photoOrder, sameFilters, type Filters } from './filters';
import type { ViewerMode } from './ViewerContext';
import './viewer.css';

type Props = {
  open: boolean;
  mode: ViewerMode;
  index: number;
  origin: MutableRefObject<Element | null>;
  onIndex: (i: number) => void;
  onMode: (m: ViewerMode) => void;
  onClose: () => void;
};

type Rect = { x: number; y: number; w: number; h: number };
/**
 * A shared-element morph. One floating copy of the photo flies between two rects while the real
 * elements at both ends are hidden; `to` is filled in once the destination has been laid out.
 *  open    page strip tile → photo        close   photo → page strip tile
 *  toPhoto grid tile → photo              toGrid  photo → grid tile
 */
type Transit = { kind: 'open' | 'close' | 'toPhoto' | 'toGrid'; index: number; from: Rect; fromR: number; to?: Rect; toR?: number; /** photo zoom inside the source tile (grid hover) */ fromZoom?: number };

const FLY_MS = 460;
const FLY_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'; // fast start, long soft landing
// Photo → photo: one rounded mask holds the photos. It contracts (keeping the current shape), then expands
// into the next photo's exact width × height while the photos crossfade inside it.
// Two layers, so the motion stays continuous however different the two photos' shapes are:
//  - shape: width × height morph on ONE curve (a short hold, then a soft ease) — no mid-way speed jump;
//  - breath: a separate subtle scale dip (1 → BREATH → 1) — the "contract, then open" feel.
// Both photos fill the mask (object-fit: cover) during the morph, so no empty band ever shows,
// even portrait ↔ landscape. Big aspect changes get a little more time (up to +SWAP_EXTRA ms).
const SWAP_MS = 520;
const SWAP_EXTRA = 180;
const SHAPE_HOLD = 0.12; // share of the swap before the shape starts to change (the breath leads)
const SHAPE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
const BREATH = 0.965;
const BREATH_AT = 0.32;
const SINE = 'cubic-bezier(0.37, 0, 0.63, 1)';
const PHOTO_R = 32; // Airbnb viewer radius
const LOAD_MS = 600; // the prototype's stand-in for fetching a new page of results (placeholder tiles meanwhile)
const TILE_R = 16; // Airbnb grid radius

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
};
const radiusOf = (el: Element) => parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
const inViewport = (r: Rect) => r.y + r.h > 0 && r.y < innerHeight && r.x + r.w > 0 && r.x < innerWidth;

/** Largest rect with the photo's aspect ratio that fits the box, centred. */
function fit(i: number, box: Rect): Rect {
  const p = photos[i];
  const s = Math.min(box.w / p.w, box.h / p.h);
  const w = Math.round(p.w * s);
  const h = Math.round(p.h * s);
  return { x: box.x + (box.w - w) / 2, y: box.y + (box.h - h) / 2, w, h };
}

/**
 * Full-screen image view modelled on Airbnb's experience gallery:
 * photo mode = one large rounded photo, edge arrows, "n of N", grid toggle top-left, close top-right;
 * grid mode = masonry. Added for noon: a review panel docked right.
 */
export function PhotoViewer({ open, mode, index, origin, onIndex, onMode, onClose }: Props) {
  // when this opening started — the gallery button's "Gallery" label times itself from it
  const openedAt = useRef(0);
  const wasOpen = useRef(false);
  if (open && !wasOpen.current) openedAt.current = performance.now();
  wasOpen.current = open;
  const [theme] = useVariant('viewerTheme');
  const [swap] = useVariant('photoSwap');
  const [reviewPhotos] = useVariant('reviewPhotos');
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  const [transit, setTransit] = useState<Transit | null>(null);
  const [box, setBox] = useState<Rect | null>(null); // the photo stage's content box
  const sheet = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const mask = useRef<HTMLDivElement>(null);
  const maskAnim = useRef<Animation | null>(null);
  const breathAnim = useRef<Animation | null>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const focusBack = useRef<Element | null>(null);

  // ---------- gallery sort + filters (Figma flow 4) ----------
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const filterChip = useRef<HTMLButtonElement>(null);
  const order = useMemo(() => photoOrder(filters), [filters]);
  // the grid keeps the last non-empty layout as placeholders while a request is out
  const shown = useRef(order);
  if (order.length || !loading) shown.current = order;
  // photo mode pages through the gallery's order; a photo outside it (opened from the PDP) pages through all
  const nav = order.includes(index) ? order : ALL_PHOTOS;
  const at = nav.indexOf(index);

  const loadTimer = useRef(0);
  const applyFilters = useCallback((f: Filters) => {
    setFiltersOpen(false);
    setFilters((cur) => (sameFilters(cur, f) ? cur : f));
    setReloadKey((k) => k + 1);
    setLoading(true);
    clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), LOAD_MS);
  }, []);
  const dismissFilters = useCallback(() => setFiltersOpen(false), []);
  useEffect(() => () => clearTimeout(loadTimer.current), []);

  // ---------- open / close ----------
  useEffect(() => {
    if (open) {
      focusBack.current = document.activeElement;
      // every opening starts on the default sort with no filters
      clearTimeout(loadTimer.current);
      setFilters(DEFAULT_FILTERS);
      setFiltersOpen(false);
      setLoading(false);
      setClosing(false);
      setPresent(true);
      const from = origin.current;
      if (mode === 'photo' && from?.isConnected) {
        setTransit({ kind: 'open', index, from: rectOf(from), fromR: radiusOf(from) });
      }
      return;
    }
    if (!present) return;
    setClosing(true);
    // fly back into the strip tile (or whatever opened us) when it's on screen; otherwise just fade
    const target = mode === 'photo' && box ? returnTarget(index, origin.current) : null;
    if (target) {
      setTransit({ kind: 'close', index, from: fit(index, box!), fromR: PHOTO_R, to: rectOf(target), toR: radiusOf(target) });
      return;
    }
    const t = setTimeout(() => { setPresent(false); setClosing(false); }, 200);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // page scroll lock + focus
  useLayoutEffect(() => {
    if (!present) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    const prevPad = html.style.paddingRight;
    const bar = innerWidth - html.clientWidth; // classic (non-overlay) scrollbar: keep the page from shifting
    html.style.overflow = 'hidden';
    if (bar > 0) html.style.paddingRight = `${bar}px`;
    sheet.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev;
      html.style.paddingRight = prevPad;
      (focusBack.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [present]);

  // ---------- stage measurement (photo is sized in JS so it always fits) ----------
  const showPhoto = mode === 'photo' || transit?.kind === 'toGrid';
  const showGrid = mode === 'grid' || transit?.kind === 'toPhoto';
  useLayoutEffect(() => {
    if (!present || !showPhoto || !frame.current) return;
    const el = frame.current;
    const measure = () => setBox(rectOf(el));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [present, showPhoto]);

  // a pending morph into the photo can start as soon as the stage is measured
  useLayoutEffect(() => {
    if (transit && !transit.to && (transit.kind === 'open' || transit.kind === 'toPhoto') && box) {
      setTransit({ ...transit, to: fit(transit.index, box), toR: PHOTO_R });
    }
  }, [transit, box]);

  // run the flight
  useLayoutEffect(() => {
    const el = flyer.current;
    if (!transit?.to || !el) return;
    const { from, to, fromR, toR } = transit;
    const kf = (r: Rect, rad: number) => ({ left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: `${rad}px` });
    const anim = el.animate([kf(from, fromR), kf(to, toR!)], { duration: FLY_MS, easing: FLY_EASE, fill: 'forwards' });
    if (transit.fromZoom) el.firstElementChild?.animate([{ scale: transit.fromZoom }, { scale: 1 }], { duration: FLY_MS, easing: FLY_EASE });
    anim.onfinish = () => {
      if (transit.kind === 'close') { setPresent(false); setClosing(false); }
      setTransit(null);
    };
    return () => anim.cancel();
  }, [transit?.to]); // eslint-disable-line react-hooks/exhaustive-deps

  // safety: never leave a morph hanging if its destination couldn't be measured
  useEffect(() => {
    if (!transit || transit.to) return;
    const t = setTimeout(() => setTransit(null), 600);
    return () => clearTimeout(t);
  }, [transit]);

  // ---------- photo ↔ photo ----------
  // preload + decode before swapping so the mask never opens onto an empty frame
  const stepToken = useRef(0);
  // where a step still waiting on decode is headed — relative moves count from here, so fast presses add up
  const pending = useRef<number | null>(null);
  useEffect(() => { if (pending.current === index) pending.current = null; }, [index]);
  useEffect(() => { pending.current = null; stepToken.current++; }, [open, mode]); // a closed/switched viewer forgets queued steps
  const step = (i: number) => {
    if (i === undefined || i < 0 || i >= photos.length || i === (pending.current ?? index)) return;
    const token = ++stepToken.current;
    if (swap === 'slide') return onIndex(i); // the spring starts at once; neighbours are already preloaded
    pending.current = i;
    const img = new Image();
    img.src = photos[i].src;
    Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 350))]).then(() => {
      if (token !== stepToken.current) return;
      onIndex(i);
    });
  };

  /** relative move (arrows, keys, swipe) — counts from a step still in flight */
  const move = (delta: number) => step(nav[nav.indexOf(pending.current ?? index) + delta]);

  const [leaving, setLeaving] = useState<number | null>(null);
  const last = useRef({ index, mode, open });
  useLayoutEffect(() => {
    const prev = last.current;
    last.current = { index, mode, open };
    const isStep = mode === 'photo' && prev.mode === 'photo' && open && prev.open;
    if (!isStep) { setLeaving(null); return; }
    if (prev.index === index) return;
    setLeaving(prev.index);

    const el = mask.current;
    const to = box ? fit(index, box) : null;
    // start from where the mask really is: mid-morph on a fast click (layout size, before the breath's scale),
    // otherwise the previous photo's fitted size (the inline style already shows the new one)
    const morphing = maskAnim.current?.playState === 'running';
    const from = el && box ? (morphing ? { w: el.offsetWidth, h: el.offsetHeight } : fit(prev.index, box)) : null;
    const s0 = el && breathAnim.current?.playState === 'running' ? parseFloat(getComputedStyle(el).scale) || 1 : 1;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (swap === 'slide') { setLeaving(null); return; } // SlideStrip animates itself

    const aspectJump = from && to ? Math.abs(Math.log(to.w / to.h / (from.w / from.h))) : 0; // 0 same shape … ~0.9 portrait↔landscape
    const dur = Math.round(SWAP_MS + Math.min(SWAP_EXTRA, aspectJump * 220));
    if (el && from && to && !reduce) {
      maskAnim.current?.cancel();
      breathAnim.current?.cancel();
      el.style.setProperty('--pv-swap', `${dur}ms`);
      maskAnim.current = el.animate(
        [
          { width: `${from.w}px`, height: `${from.h}px` },
          { width: `${from.w}px`, height: `${from.h}px`, offset: SHAPE_HOLD, easing: SHAPE_EASE },
          { width: `${to.w}px`, height: `${to.h}px` },
        ],
        { duration: dur },
      );
      breathAnim.current = el.animate(
        [
          { scale: String(s0), easing: SINE },
          { scale: String(BREATH), offset: BREATH_AT, easing: SINE },
          { scale: '1' },
        ],
        { duration: dur },
      );
    }
    const t = setTimeout(() => setLeaving(null), dur);
    return () => clearTimeout(t);
  }, [index, mode, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard
  useEffect(() => {
    if (!open || filtersOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (e.key === 'Tab' && sheet.current) {
        // keep focus inside the dialog
        const items = [...sheet.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], [tabindex="0"]')].filter(
          (n) => n.offsetParent !== null && !n.closest('[data-leaving], [aria-hidden="true"]'),
        );
        if (!items.length) return;
        const first = items[0];
        const lastEl = items[items.length - 1];
        const at = document.activeElement as HTMLElement | null;
        const inside = at && sheet.current.contains(at) && items.includes(at);
        if (e.shiftKey && (!inside || at === first)) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && (!inside || at === lastEl)) { e.preventDefault(); first.focus(); }
      }
      else if (mode === 'photo' && e.key === 'ArrowRight') { e.preventDefault(); move(1); }
      else if (mode === 'photo' && e.key === 'ArrowLeft') { e.preventDefault(); move(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // horizontal trackpad swipe → one step per gesture (momentum events after the step are swallowed)
  const swipe = useRef({ acc: 0, locked: false, timer: 0 });
  const onWheel = (e: React.WheelEvent) => {
    if (mode !== 'photo' || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const w = swipe.current;
    clearTimeout(w.timer);
    w.timer = window.setTimeout(() => { w.acc = 0; w.locked = false; }, 180); // gesture over once events pause
    if (w.locked) return;
    w.acc += e.deltaX;
    if (Math.abs(w.acc) > 60) {
      w.locked = true;
      move(Math.sign(w.acc));
    }
  };

  // warm the neighbours
  useEffect(() => {
    if (!open) return;
    for (const d of [1, -1, 2]) {
      const p = photos[nav[at + d]];
      if (p) new Image().src = p.src;
    }
  }, [open, index]);

  // ---------- grid ↔ photo ----------
  const toGrid = () => {
    if (!box) return onMode('grid');
    setTransit({ kind: 'toGrid', index, from: fit(index, box), fromR: PHOTO_R });
    onMode('grid');
  };
  const pickFromGrid = (i: number, tile: HTMLElement) => {
    // a hovered tile has its photo zoomed in a little; the flight starts from that zoom so nothing pops
    const z = parseFloat(getComputedStyle(tile.querySelector('img')!).scale);
    setTransit({ kind: 'toPhoto', index: i, from: rectOf(tile), fromR: TILE_R, fromZoom: z > 1 ? z : undefined });
    onIndex(i);
    onMode('photo');
  };
  const onGridLaidOut = (grid: HTMLElement) => {
    setTransit((t) => {
      if (!t || t.to || t.kind !== 'toGrid') return t;
      const tile = grid.querySelector(`[data-index="${t.index}"]`);
      return tile ? { ...t, to: rectOf(tile), toR: TILE_R } : null;
    });
  };

  if (!present) return null;
  const photo = photos[index];
  const size = box ? fit(index, box) : null;
  const flying = transit !== null;
  const hidePhoto = flying && transit.index === index;
  const hideTile = flying && (transit.kind === 'toPhoto' || transit.kind === 'toGrid') ? transit.index : null;

  return (
    <>
      <div
        ref={sheet}
        className="pv"
        data-theme={theme}
        data-closing={closing || undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Customer photos"
        tabIndex={-1}
      >
        {showPhoto && (
          <div className="pv__layer pv__photoMode" data-leaving={mode !== 'photo' || undefined}>
            <header className="pv__bar">
              <GalleryButton openedAt={openedAt.current} onClick={toGrid} />
              {reviewPhotos === 'dots' ? <ReviewDots index={index} onIndex={step} /> : <div className="pv__pips" aria-hidden />}
              <span className="pv__sr" aria-live="polite" aria-atomic="true">
                Photo {at + 1} of {nav.length}
              </span>
              <button type="button" className="pv__icon pv__close" aria-label="Close" onClick={onClose}>
                <IconClose />
              </button>
            </header>

            <div className="pv__stage" onWheel={onWheel} data-thumbs={reviewPhotos === 'thumbs' || undefined}>
              <button type="button" className="pv__arrow pv__arrow--prev" aria-label="Previous photo" disabled={at <= 0} onClick={() => move(-1)}>
                <IconArrow dir="left" />
              </button>
              <div ref={frame} className="pv__frame" data-swap={swap}>
                {swap === 'slide' && box && (
                  <SlideStrip at={at} seq={nav} box={box} stageW={frame.current?.parentElement?.clientWidth ?? box.w} hidden={hidePhoto} />
                )}
                {swap === 'mask' && size && box && (
                  <div
                    ref={mask}
                    className="pv__mask"
                    style={{ width: size.w, height: size.h, visibility: hidePhoto ? 'hidden' : undefined }}
                  >
                    {leaving !== null && photos[leaving] && (
                      <img
                        key={`out-${leaving}`}
                        className="pv__img pv__img--out"
                        src={photos[leaving].src}
                        alt=""
                        aria-hidden
                      />
                    )}
                    <img
                      key={`in-${index}`}
                      className="pv__img pv__img--in"
                      src={photo.src}
                      alt={`Customer photo ${index + 1}`}
                    />
                  </div>
                )}
              </div>
              <button type="button" className="pv__arrow pv__arrow--next" aria-label="Next photo" disabled={at >= nav.length - 1} onClick={() => move(1)}>
                <IconArrow dir="right" />
              </button>
              {reviewPhotos === 'thumbs' && <ReviewThumbs index={index} onIndex={step} />}
            </div>

            <ReviewPanel index={index} />
          </div>
        )}

        {showGrid && (
          <div className="pv__layer pv__gridMode" data-leaving={mode !== 'grid' || undefined}>
            <GalleryBar
              filters={filters}
              onApply={applyFilters}
              onOpenFilters={() => setFiltersOpen(true)}
              modalOpen={filtersOpen}
              onClose={onClose}
              filterChip={filterChip}
            />
            {shown.current.length ? (
              <PhotoGrid
                current={index}
                hiddenIndex={hideTile}
                onPick={pickFromGrid}
                onLaidOut={onGridLaidOut}
                reveal={transit?.kind !== 'toGrid'}
                order={shown.current}
                loading={loading}
                reloadKey={reloadKey}
                startAtTop={loading}
              />
            ) : (
              <NoResults onClear={() => applyFilters(DEFAULT_FILTERS)} />
            )}
            <FiltersModal
              open={filtersOpen}
              filters={filters}
              onApply={applyFilters}
              onDismiss={dismissFilters}
              returnTo={filterChip}
            />
            <span className="pv__sr" aria-live="polite" aria-atomic="true">
              {loading ? 'Loading photos' : order.length ? `${order.length} photos` : 'No photos match these filters'}
            </span>
          </div>
        )}
      </div>

      {transit?.to && (
        <div ref={flyer} className="pv__flyer" aria-hidden>
          <img src={photos[transit.index].src} alt="" />
        </div>
      )}
    </>
  );
}

/** Where a closing photo should land: the element it opened from (if it shows this photo) or its strip tile. */
function returnTarget(index: number, origin: Element | null): Element | null {
  const src = photos[index].src;
  const shows = (el: Element) => (el as HTMLImageElement).src === src || el.querySelector(`img[src="${src}"]`);
  const candidates = [origin, document.querySelector(`.cp__tile[data-index="${index}"]`)];
  for (const el of candidates) {
    if (el?.isConnected && shows(el) && inViewport(rectOf(el))) return el;
  }
  return null;
}
