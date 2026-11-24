import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
  onIndex: (i: number) => void;
  onMode: (m: ViewerMode) => void;
  onClose: () => void;
};

const SWAP_MS = 400; // Airbnb: outgoing fades + grows to 1.04 fast, incoming settles 1.04 → 1 over ~350–400ms
const CLOSE_MS = 180;

/**
 * Full-screen image view modelled on Airbnb's experience gallery:
 * photo mode = one large rounded photo, edge arrows, "n of N" counter, grid toggle top-left, close top-right;
 * grid mode = 4-column masonry. Added for noon: a review panel docked right.
 */
export function PhotoViewer({ open, mode, index, onIndex, onMode, onClose }: Props) {
  const [theme] = useVariant('viewerTheme');
  const [present, setPresent] = useState(open);
  const [closing, setClosing] = useState(false);
  const sheet = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  // mount / unmount with a short fade
  useEffect(() => {
    if (open) {
      opener.current = document.activeElement;
      setClosing(false);
      setPresent(true);
      return;
    }
    if (!present) return;
    setClosing(true);
    const t = setTimeout(() => { setPresent(false); setClosing(false); }, CLOSE_MS);
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // page scroll lock + focus management
  useLayoutEffect(() => {
    if (!present) return;
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    sheet.current?.focus({ preventScroll: true });
    return () => {
      html.style.overflow = prev;
      (opener.current as HTMLElement | null)?.focus?.({ preventScroll: true });
    };
  }, [present]);

  // crossfade bookkeeping: keep the previous photo around while it animates out
  // (only for arrow/thumbnail steps — opening the view or picking from the grid is a straight cut, like Airbnb)
  const [leaving, setLeaving] = useState<number | null>(null);
  const last = useRef({ index, mode, open });
  useEffect(() => {
    const prev = last.current;
    last.current = { index, mode, open };
    const isStep = mode === 'photo' && prev.mode === 'photo' && open && prev.open;
    if (!isStep) { setLeaving(null); return; }
    if (prev.index === index) return;
    const from = prev.index;
    setLeaving(from);
    const t = setTimeout(() => setLeaving(null), SWAP_MS);
    return () => clearTimeout(t);
  }, [index, mode, open]);

  const go = (d: number) => {
    const next = index + d;
    if (next >= 0 && next < photos.length) onIndex(next);
  };

  // keyboard
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
      else if (mode === 'photo' && e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (mode === 'photo' && e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // warm the neighbours so arrows feel instant
  useEffect(() => {
    if (!open) return;
    for (const d of [1, -1, 2]) {
      const p = photos[index + d];
      if (p) new Image().src = p.src;
    }
  }, [open, index]);

  if (!present) return null;
  const photo = photos[index];

  return (
    <div
      ref={sheet}
      className="pv"
      data-theme={theme}
      data-mode={mode}
      data-closing={closing || undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Customer photos"
      tabIndex={-1}
    >
      {mode === 'photo' ? (
        <div className="pv__photoMode" key="photo">
          <header className="pv__bar">
            <button type="button" className="pv__icon" aria-label="Show all photos" onClick={() => onMode('grid')}>
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
            <button type="button" className="pv__arrow pv__arrow--prev" aria-label="Previous photo" disabled={index === 0} onClick={() => go(-1)}>
              <IconArrow dir="left" />
            </button>
            <div className="pv__frame">
              {leaving !== null && photos[leaving] && (
                <img key={`out-${leaving}`} className="pv__img pv__img--out" src={photos[leaving].src} width={photos[leaving].w} height={photos[leaving].h} alt="" aria-hidden />
              )}
              <img key={`in-${index}`} className="pv__img pv__img--in" src={photo.src} width={photo.w} height={photo.h} alt={`Customer photo ${index + 1}`} />
            </div>
            <button type="button" className="pv__arrow pv__arrow--next" aria-label="Next photo" disabled={index === photos.length - 1} onClick={() => go(1)}>
              <IconArrow dir="right" />
            </button>
          </div>

          <ReviewPanel index={index} onIndex={onIndex} />
        </div>
      ) : (
        <div className="pv__gridMode" key="grid">
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
          <PhotoGrid
            current={index}
            onPick={(i) => {
              onIndex(i);
              onMode('photo');
            }}
          />
        </div>
      )}
    </div>
  );
}
