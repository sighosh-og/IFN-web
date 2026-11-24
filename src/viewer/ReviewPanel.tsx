import { photos, reviewsById } from './data';
import { useLayoutEffect, useRef, useState } from 'react';
import { useVariant } from '../variants/variants';

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Rating pill fill (Figma "Ratings": green/700 for 5★); lower ratings keep noon's review-star colours.
const PILL: Record<number, string> = { 5: '#0f8857', 4: '#0f8857', 3: '#05af25', 2: '#f8b200', 1: '#f36302' };
// "silver" → "Silver", but leave "iPhone" / "eSIM" alone
const cap = (s: string) => (/^[a-z][a-z]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s);
const isArabic = (s: string) => /[؀-ۿ]/.test(s);

/**
 * The review behind the current photo (Figma 5314:6610 "Sidebar - Review for this photo").
 * Stepping through photos of the same review keeps this panel still (the top-bar dots show where you are
 * in the review); crossing into another review swaps the content.
 */
export function ReviewPanel({ index }: { index: number }) {
  const [reviewer] = useVariant('reviewer');
  const reviewId = photos[index].review;
  // the review on screen plus (briefly) the one fading out; fast stepping only ever keeps the latest leaver
  const [layers, setLayers] = useState([{ id: reviewId, out: false }]);
  const scroller = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    setLayers((ls) => {
      const cur = ls.find((l) => !l.out);
      if (cur?.id === reviewId) return ls;
      return [...(cur ? [{ id: cur.id, out: true }] : []), { id: reviewId, out: false }];
    });
    if (scroller.current) scroller.current.scrollTop = 0;
  }, [reviewId]);

  return (
    <aside className="pv__panel" aria-label="Review for this photo">
      {reviewer === 'top' && (
        // "Top, by close" variant: who + when sit in the panel's top band, level with the close button,
        // and crossfade with the review below them
        <div className="pv__panelHead">
          {layers.map((l) => (
            <div key={l.id} className="pv__reviewLayer" data-state={l.out ? 'out' : 'in'} aria-hidden={l.out || undefined}>
              <Reviewer review={reviewsById.get(l.id)!} />
            </div>
          ))}
        </div>
      )}
      <div ref={scroller} className="pv__panelScroll">
        <div className="pv__reviewStack">
          {layers.map((l) => (
            <div
              key={l.id}
              className="pv__reviewLayer"
              data-state={l.out ? 'out' : 'in'}
              aria-hidden={l.out || undefined}
              onAnimationEnd={(e) => {
                if (l.out && e.target === e.currentTarget) setLayers((ls) => ls.filter((x) => x !== l && !(x.out && x.id === l.id)));
              }}
            >
              <ReviewBody review={reviewsById.get(l.id)!} bylineOnTop={reviewer === 'top'} />
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

type Review = NonNullable<ReturnType<typeof reviewsById.get>>;

function Reviewer({ review }: { review: Review }) {
  return (
    <div className="pv__reviewer">
      <span className="pv__profile" aria-hidden />
      <div className="pv__reviewerText">
        <span className="pv__name">{review.name}</span>
        <span className="pv__date">{fmtDate(review.date)}</span>
      </div>
    </div>
  );
}

function ReviewBody({ review, bylineOnTop }: { review: Review; bylineOnTop: boolean }) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="pv__review">
      <div className="pv__ratingRow">
        <span className="pv__rating" style={{ background: PILL[review.rating] }} aria-label={`${review.rating} out of 5 stars`}>
          {review.rating}
          <img src="/viewer/star.svg" alt="" width="12" height="12" />
        </span>
        {review.verified && (
          <>
            <span className="pv__dot" aria-hidden>•</span>
            <span className="pv__verified">
              <span className="pv__verifiedIcon" aria-hidden>
                <img src="/viewer/verified-buy.svg" alt="" width="16" height="16" />
              </span>
              Verified Buy
            </span>
          </>
        )}
      </div>

      <div className="pv__body">
        {review.title?.trim() && <h3 className="pv__title" dir="auto">{review.title}</h3>}
        <p className="pv__comment" dir="auto">{review.comment}</p>
      </div>

      {review.variants.length > 0 && (
        <ul className="pv__specs" aria-label="Purchased variant">
          {review.variants.map((v) => (
            <li key={v.label} className="pv__spec" title={v.label}>{cap(v.value)}</li>
          ))}
        </ul>
      )}
      {isArabic(review.comment) && (
        <button type="button" className="pv__translate">See Translation (English)</button>
      )}

      <div className="pv__divider" aria-hidden />

      <footer className="pv__byline">
        {!bylineOnTop && (
          <div className="pv__who">
            <span className="pv__name">{review.name}</span>
            <span className="pv__dot" aria-hidden>•</span>
            <span className="pv__date">{fmtDate(review.date)}</span>
          </div>
        )}
        <button
          type="button"
          className="pv__like"
          aria-pressed={liked}
          aria-label={`Helpful, ${review.helpful + (liked ? 1 : 0)}`}
          onClick={() => setLiked((l) => !l)}
        >
          <span className="pv__likeIcon" aria-hidden />
          <span className="pv__likeCount">{review.helpful + (liked ? 1 : 0)}</span>
        </button>
      </footer>
    </article>
  );
}
