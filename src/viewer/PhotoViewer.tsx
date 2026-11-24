import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { useVariant } from '../variants/variants';
import { photos, totalPhotos } from './data';
import { ReviewPanel } from './ReviewPanel';
import { PhotoGrid } from './PhotoGrid';
import { IconArrow, IconClose, IconGrid } from './icons';
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
type Transit = { kind: 'open' | 'close' | 'toPhoto' | 'toGrid'; index: number; from: Rect; fromR: number; to?: Rect; toR?: number };

const FLY_MS = 460;
const FLY_EASE = 'cubic-bezier(0.32, 0.72, 0, 1)'; // fast start, long soft landing
// Photo → photo: one rounded mask holds the photos. It contracts (keeping the current shape), then expands
// into the next photo's exact width × height while the photos crossfade inside it.
const SWAP_MS = 620;
const CONTRACT_AT = 0.36; // share of SWAP_MS spent contracting
const CONTRACT = 0.9; // how far the mask closes (relative to the smaller of the two photos)
const PHOTO_R = 32; // Airbnb viewer radius
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
  const [theme] = useVariant('viewerTheme');
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  const [transit, setTransit] = useState<Transit | null>(null);
  const [box, setBox] = useState<Rect | null>(null); // the photo stage's content box
  const sheet = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const mask = useRef<HTMLDivElement>(null);
  const maskFrom = useRef<{ w: number; h: number } | null>(null);
  const maskAnim = useRef<Animation | null>(null);
  const flyer = useRef<HTMLDivElement>(null);
  const focusBack = useRef<Element | null>(null);

  // ---------- open / close ----------
  useEffect(() => {
    if (open) {
      focusBack.current = document.activeElement;
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
    html.style.overflow = 'hidden';
    sheet.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev;
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
  const step = (i: number) => {
    if (i < 0 || i >= photos.length || i === index) return;
    const token = ++stepToken.current;
    const img = new Image();
    img.src = photos[i].src;
    Promise.race([img.decode().catch(() => {}), new Promise((r) => setTimeout(r, 350))]).then(() => {
      if (token !== stepToken.current) return;
      // the mask's live size (mid-animation if the user is clicking fast) is where the next morph starts
      const r = mask.current?.getBoundingClientRect();
      maskFrom.current = r ? { w: r.width, h: r.height } : null;
      onIndex(i);
    });
  };

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
    const from = maskFrom.current;
    const to = box ? fit(index, box) : null;
    maskFrom.current = null;
    if (el && from && to && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      maskAnim.current?.cancel();
      // contract uniformly (same shape as now) to just inside both photos, then open into the next photo's size
      const k = Math.min(CONTRACT, CONTRACT * Math.min(to.w / from.w, to.h / from.h));
      maskAnim.current = el.animate(
        [
          { width: `${from.w}px`, height: `${from.h}px`, easing: 'cubic-bezier(0.45, 0, 0.55, 1)' },
          { width: `${from.w * k}px`, height: `${from.h * k}px`, offset: CONTRACT_AT, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' },
          { width: `${to.w}px`, height: `${to.h}px` },
        ],
        { duration: SWAP_MS },
      );
    }
    const t = setTimeout(() => setLeaving(null), SWAP_MS);
    return () => clearTimeout(t);
  }, [index, mode, open]); // eslint-disable-line react-hooks/exhaustive-deps

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (mode === 'photo' && e.key === 'ArrowRight') { e.preventDefault(); step(index + 1); }
      else if (mode === 'photo' && e.key === 'ArrowLeft') { e.preventDefault(); step(index - 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // warm the neighbours
  useEffect(() => {
    if (!open) return;
    for (const d of [1, -1, 2]) {
      const p = photos[index + d];
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
    setTransit({ kind: 'toPhoto', index: i, from: rectOf(tile), fromR: TILE_R });
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
              <button type="button" className="pv__icon" aria-label="Show all photos" onClick={toGrid}>
                <IconGrid />
              </button>
              <div className="pv__counter" aria-live="polite">
                {index + 1} of {photos.length}
              </div>
              <button type="button" className="pv__icon pv__close" aria-label="Close" onClick={onClose}>
                <IconClose />
              </button>
            </header>

            <div className="pv__stage">
              <button type="button" className="pv__arrow pv__arrow--prev" aria-label="Previous photo" disabled={index === 0} onClick={() => step(index - 1)}>
                <IconArrow dir="left" />
              </button>
              <div ref={frame} className="pv__frame">
                {size && box && (
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
                        style={{ width: fit(leaving, box).w, height: fit(leaving, box).h }}
                        alt=""
                        aria-hidden
                      />
                    )}
                    <img
                      key={`in-${index}`}
                      className="pv__img pv__img--in"
                      src={photo.src}
                      style={{ width: size.w, height: size.h }}
                      alt={`Customer photo ${index + 1}`}
                    />
                  </div>
                )}
              </div>
              <button type="button" className="pv__arrow pv__arrow--next" aria-label="Next photo" disabled={index === photos.length - 1} onClick={() => step(index + 1)}>
                <IconArrow dir="right" />
              </button>
            </div>

            <ReviewPanel index={index} onIndex={step} />
          </div>
        )}

        {showGrid && (
          <div className="pv__layer pv__gridMode" data-leaving={mode !== 'grid' || undefined}>
            <header className="pv__bar pv__bar--grid">
              <span />
              <div className="pv__gridTitle">
                <span className="pv__gridTitleMain">Customer photos</span>
                <span className="pv__gridTitleSub">
                  {photos.length} of {totalPhotos.toLocaleString('en-US')}
                </span>
              </div>
              <button type="button" className="pv__icon pv__close" aria-label="Close" onClick={onClose}>
                <IconClose />
              </button>
            </header>
            <PhotoGrid current={index} hiddenIndex={hideTile} onPick={pickFromGrid} onLaidOut={onGridLaidOut} />
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
