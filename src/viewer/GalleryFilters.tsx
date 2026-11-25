import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { DEFAULT_FILTERS, SORTS, THIS_VARIANT, activeCount, type Filters } from './filters';
import { IconClose } from './icons';

/* Gallery header + Filters modal, Figma flow 4 (5400:6224 … 5400:6912). */

const IconPrefs = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
    <path fillRule="evenodd" clipRule="evenodd" d="M6.43066 11.4998C6.21302 10.7303 5.50553 10.1665 4.66634 10.1665C3.65382 10.1665 2.83301 10.9873 2.83301 11.9998C2.83301 13.0124 3.65382 13.8332 4.66634 13.8332C5.50553 13.8332 6.21302 13.2693 6.43066 12.4998H12.6663C12.9425 12.4998 13.1663 12.276 13.1663 11.9998C13.1663 11.7237 12.9425 11.4998 12.6663 11.4998H6.43066ZM5.33307 11.4998C5.18103 11.2974 4.93898 11.1665 4.66634 11.1665C4.3937 11.1665 4.15165 11.2974 3.99961 11.4998C3.895 11.6391 3.83301 11.8122 3.83301 11.9998C3.83301 12.1874 3.895 12.3606 3.99961 12.4998C4.15165 12.7022 4.3937 12.8332 4.66634 12.8332C4.93898 12.8332 5.18103 12.7022 5.33307 12.4998C5.43768 12.3606 5.49967 12.1874 5.49967 11.9998C5.49967 11.8122 5.43768 11.6391 5.33307 11.4998Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M11.333 6.1665C10.4938 6.1665 9.78633 6.73034 9.56869 7.49984H3.33301C3.05687 7.49984 2.83301 7.7237 2.83301 7.99984C2.83301 8.27598 3.05687 8.49984 3.33301 8.49984H9.56869C9.78633 9.26934 10.4938 9.83317 11.333 9.83317C12.3455 9.83317 13.1663 9.01236 13.1663 7.99984C13.1663 6.98732 12.3455 6.1665 11.333 6.1665ZM11.333 8.83317C11.0604 8.83317 10.8183 8.70225 10.6663 8.49984C10.5617 8.36056 10.4997 8.18744 10.4997 7.99984C10.4997 7.81224 10.5617 7.63911 10.6663 7.49984C10.8183 7.29743 11.0604 7.1665 11.333 7.1665C11.6056 7.1665 11.8477 7.29743 11.9997 7.49984C12.1044 7.63911 12.1663 7.81224 12.1663 7.99984C12.1663 8.18744 12.1044 8.36056 11.9997 8.49984C11.8477 8.70225 11.6056 8.83317 11.333 8.83317Z" />
    <path fillRule="evenodd" clipRule="evenodd" d="M4.66634 2.1665C5.50553 2.1665 6.21302 2.73034 6.43066 3.49984H12.6663C12.9425 3.49984 13.1663 3.72369 13.1663 3.99984C13.1663 4.27598 12.9425 4.49984 12.6663 4.49984H6.43066C6.21302 5.26934 5.50553 5.83317 4.66634 5.83317C3.65382 5.83317 2.83301 5.01236 2.83301 3.99984C2.83301 2.98732 3.65382 2.1665 4.66634 2.1665ZM3.99961 3.49984C4.15165 3.29743 4.3937 3.1665 4.66634 3.1665C4.93898 3.1665 5.18103 3.29743 5.33307 3.49984C5.43768 3.63911 5.49967 3.81224 5.49967 3.99984C5.49967 4.18744 5.43768 4.36056 5.33307 4.49984C5.18103 4.70225 4.93898 4.83317 4.66634 4.83317C4.3937 4.83317 4.15165 4.70225 3.99961 4.49984C3.895 4.36056 3.83301 4.18744 3.83301 3.99984C3.83301 3.81224 3.895 3.63911 3.99961 3.49984Z" />
  </svg>
);
const IconCaret = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden fill="currentColor">
    <path d="M11.9999 6.1665H3.99988C3.79738 6.1665 3.61571 6.28817 3.53821 6.47484C3.46071 6.6615 3.50321 6.8765 3.64654 7.01984L7.64654 11.0198C7.74071 11.114 7.86738 11.1665 7.99988 11.1665C8.13238 11.1665 8.25988 11.114 8.35321 11.0198L12.3532 7.01984C12.4965 6.8765 12.539 6.6615 12.4615 6.47484C12.384 6.28817 12.2015 6.1665 11.9999 6.1665Z" />
  </svg>
);
// Origin rating colours (Figma Web IFN / Rating tag)
const STAR = { 5: '#0F8857', 4: '#26B57C', 3: '#F5C400', 2: '#FD8835', 1: '#F04242' } as Record<number, string>;
const Star = ({ rating }: { rating: number }) => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
    <path
      fill={STAR[rating]}
      d="M7.88464 3.05095C8.40374 2.20923 9.64488 2.22282 10.1407 3.09169L11.6473 5.73226L14.5444 6.43886C14.5491 6.43988 14.5538 6.44074 14.5585 6.44188C15.498 6.67143 15.8758 7.80444 15.2603 8.55144L13.268 10.9702L13.5278 14.1204L13.5308 14.1669C13.5781 15.1376 12.5801 15.8269 11.6841 15.4266L9.00149 14.2286L6.319 15.4266C5.40784 15.833 4.39322 15.1153 4.47531 14.1204L4.73495 10.9702L2.74267 8.55153C2.12716 7.80453 2.5051 6.67143 3.44461 6.44188L6.35379 5.73226L7.86047 3.09169L7.88464 3.05095Z"
    />
  </svg>
);

type BarProps = {
  filters: Filters;
  /** sort chips + Verified purchases apply on click */
  onApply: (f: Filters) => void;
  onOpenFilters: () => void;
  modalOpen: boolean;
  onClose: () => void;
  filterChip: RefObject<HTMLButtonElement>;
};

export function GalleryBar({ filters, onApply, onOpenFilters, modalOpen, onClose, filterChip }: BarProps) {
  const n = activeCount(filters);
  // keep the last count on screen while " (n)" folds away, so the text doesn't vanish before the width does
  const lastN = useRef(n);
  if (n > 0) lastN.current = n;
  return (
    <header className="pv__bar gf__bar">
      <div className="gf__chips" role="toolbar" aria-label="Sort and filter photos">
        <button
          ref={filterChip}
          type="button"
          className="gf__chip"
          data-selected={n > 0 || undefined}
          aria-haspopup="dialog"
          aria-expanded={modalOpen}
          onClick={onOpenFilters}
        >
          <IconPrefs />
          <span>
            Filter
            {/* " (n)" opens and closes its width instead of jumping, so the chips after it glide */}
            <span className="gf__count" data-on={n > 0 || undefined} aria-hidden={n === 0 || undefined}>
              <span>{lastN.current > 0 ? ` (${lastN.current})` : ""}</span>
            </span>
          </span>
          <IconCaret />
        </button>
        {SORTS.map((s) => (
          <button
            key={s.id}
            type="button"
            className="gf__chip"
            data-selected={filters.sort === s.id || undefined}
            aria-pressed={filters.sort === s.id}
            onClick={() => filters.sort !== s.id && onApply({ ...filters, sort: s.id })}
          >
            {s.label}
          </button>
        ))}
        <button
          type="button"
          className="gf__chip"
          data-selected={filters.verified || undefined}
          aria-pressed={filters.verified}
          onClick={() => onApply({ ...filters, verified: !filters.verified })}
        >
          Verified purchases
        </button>
      </div>
      <button type="button" className="pv__icon pv__close" aria-label="Close" onClick={onClose}>
        <IconClose />
      </button>
    </header>
  );
}

const OUT_MS = 180;
const APPLY_MS = 700; // the prototype's stand-in for the request: Show results holds its loader this long

type ModalProps = {
  open: boolean;
  /** the applied filters — the modal opens on them */
  filters: Filters;
  onApply: (f: Filters) => void;
  onDismiss: () => void;
  /** focus returns here on close */
  returnTo: RefObject<HTMLElement>;
};

/**
 * Centred Filters modal. Choices are staged; nothing applies until Show results. Esc, × or a scrim click
 * discards them. Clear filters resets the sections and keeps the modal open.
 */
export function FiltersModal({ open, filters, onApply, onDismiss, returnTo }: ModalProps) {
  const [present, setPresent] = useState(open);
  const [leaving, setLeaving] = useState(false);
  const [draft, setDraft] = useState(filters);
  const [applying, setApplying] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (open) {
      setDraft(filters); // opens on the current state
      setApplying(false);
      setLeaving(false);
      setPresent(true);
      return;
    }
    if (!present) return;
    setLeaving(true);
    const t = setTimeout(() => { setPresent(false); setLeaving(false); }, OUT_MS);
    returnTo.current?.focus({ preventScroll: true });
    return () => clearTimeout(t);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open && present) panel.current?.focus({ preventScroll: true });
  }, [open, present]);

  // Esc closes the modal (not the viewer); Tab stays inside. Capture phase, so the viewer's handler never sees it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!applying) onDismiss();
      } else if (e.key === 'Tab' && panel.current) {
        e.stopImmediatePropagation();
        const items = [...panel.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])')];
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        const at = document.activeElement as HTMLElement | null;
        const inside = !!at && items.includes(at);
        if (e.shiftKey && (!inside || at === first)) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && (!inside || at === last)) { e.preventDefault(); first.focus(); }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.stopImmediatePropagation();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open, applying, onDismiss]);

  const apply = () => {
    if (applying) return;
    setApplying(true);
    setTimeout(() => onApply(draft), APPLY_MS);
  };
  const set = (patch: Partial<Filters>) => !applying && setDraft((d) => ({ ...d, ...patch }));
  const toggleRating = (r: number) =>
    set({ ratings: draft.ratings.includes(r) ? draft.ratings.filter((x) => x !== r) : [...draft.ratings, r] });

  if (!present) return null;
  return (
    <div className="gf__layer" data-leaving={leaving || undefined}>
      <div className="gf__scrim" onClick={() => !applying && onDismiss()} />
      <div
        ref={panel}
        className="gf__modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gf-title"
        tabIndex={-1}
      >
        <div className="gf__head">
          <h2 id="gf-title" className="gf__title">Filters</h2>
          <button type="button" className="gf__x" aria-label="Close filters" onClick={() => !applying && onDismiss()}>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden fill="currentColor">
              <path d="M13.7244 5.39155C13.9685 5.14748 14.3641 5.14748 14.6082 5.39155C14.8523 5.63563 14.8523 6.03126 14.6082 6.27534L10.8834 10.0001L14.6082 13.7249C14.8523 13.969 14.8523 14.3646 14.6082 14.6087C14.3641 14.8528 13.9685 14.8528 13.7244 14.6087L9.99962 10.8839L6.27485 14.6087C6.03077 14.8528 5.63514 14.8528 5.39106 14.6087C5.14699 14.3646 5.14699 13.969 5.39106 13.7249L9.11583 10.0001L5.39106 6.27534C5.14699 6.03126 5.14699 5.63563 5.39106 5.39155C5.63514 5.14748 6.03077 5.14748 6.27485 5.39155L9.99962 9.11632L13.7244 5.39155Z" />
            </svg>
          </button>
        </div>

        <div className="gf__body">
          <section className="gf__group" aria-labelledby="gf-sort">
            <h3 id="gf-sort" className="gf__groupTitle">Sort by</h3>
            <div className="gf__tags" role="radiogroup" aria-labelledby="gf-sort">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  className="gf__tag"
                  aria-checked={draft.sort === s.id}
                  onClick={() => set({ sort: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section className="gf__group gf__group--rating" aria-labelledby="gf-rating">
            <h3 id="gf-rating" className="gf__groupTitle">Rating</h3>
            <div className="gf__tags">
              {[5, 4, 3, 2, 1].map((r) => (
                <button
                  key={r}
                  type="button"
                  className="gf__tag"
                  aria-pressed={draft.ratings.includes(r)}
                  aria-label={`${r} star${r > 1 ? 's' : ''}`}
                  onClick={() => toggleRating(r)}
                >
                  {r}
                  <Star rating={r} />
                </button>
              ))}
            </div>
          </section>

          <section className="gf__group">
            <label className="gf__toggleRow">
              <span className="gf__groupTitle">Show reviews for this variant</span>
              <Toggle checked={draft.variant} onChange={(v) => set({ variant: v })} />
            </label>
            <div className="gf__product">
              <img className="gf__productImg" src={THIS_VARIANT.image} alt="" />
              <div className="gf__productText">
                <p className="gf__productName">{THIS_VARIANT.name}</p>
                <div className="gf__productChips">
                  {THIS_VARIANT.chips.map((c) => <span key={c}>{c}</span>)}
                </div>
              </div>
            </div>
          </section>

          <section className="gf__group">
            <label className="gf__toggleRow">
              <span className="gf__groupTitle">Show verified purchases only</span>
              <Toggle checked={draft.verified} onChange={(v) => set({ verified: v })} />
            </label>
          </section>
        </div>

        <div className="gf__foot">
          <button type="button" className="gf__btn gf__btn--secondary" onClick={() => set(DEFAULT_FILTERS)}>
            Clear filters
          </button>
          <button
            type="button"
            className="gf__btn gf__btn--primary"
            data-loading={applying || undefined}
            aria-busy={applying}
            onClick={apply}
          >
            <span>Show results</span>
            {applying && <span className="gf__spinner" aria-label="Loading results" />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <input
      type="checkbox"
      role="switch"
      className="gf__toggle"
      checked={checked}
      onChange={(e) => onChange(e.currentTarget.checked)}
    />
  );
}

/** 4.7 — nothing matches: Clear filters resets everything to the default. */
export function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="gf__empty">
      <img className="gf__emptyArt" src="/viewer/no-results.svg" alt="" width={330} height={188} />
      <div className="gf__emptyText">
        <p className="gf__emptyTitle">Edit your filter to see more results</p>
        <p className="gf__emptySub">Try removing some of your filters to get more results</p>
      </div>
      <button type="button" className="gf__btn gf__btn--secondary gf__btn--lg" onClick={onClear}>
        Clear filters
      </button>
    </div>
  );
}
