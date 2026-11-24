import { photos, reviewsById, siblingsOf } from './data';
import { useState } from 'react';

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Rating pill fill (Figma "Ratings": green/700 for 5★); lower ratings keep noon's review-star colours.
const PILL: Record<number, string> = { 5: '#0f8857', 4: '#0f8857', 3: '#05af25', 2: '#f8b200', 1: '#f36302' };
// "silver" → "Silver", but leave "iPhone" / "eSIM" alone
const cap = (s: string) => (/^[a-z][a-z]/.test(s) ? s[0].toUpperCase() + s.slice(1) : s);
const isArabic = (s: string) => /[؀-ۿ]/.test(s);

/**
 * The review behind the current photo (Figma 5314:6610 "Sidebar - Review for this photo").
 * Stepping through photos of the same review keeps this panel still (only the "photos from this review"
 * thumbnail ring moves); crossing into another review swaps the content.
 */
export function ReviewPanel({ index, onIndex }: { index: number; onIndex: (i: number) => void }) {
  const reviewId = photos[index].review;
  const review = reviewsById.get(reviewId)!;
  const siblings = siblingsOf(index);
  const pos = siblings.findIndex((s) => s.index === index);

  return (
    <aside className="pv__panel" aria-label="Review for this photo">
      <div className="pv__panelScroll">
        {/* keyed by review: content re-mounts (and fades in) only when the review changes */}
        <ReviewBody key={reviewId} review={review} />

        {siblings.length > 1 && (
          <section className="pv__siblings" aria-label="Photos from this review">
            <div className="pv__siblingsLabel">
              Photo {pos + 1} of {siblings.length} from this review
            </div>
            <div className="pv__siblingsRow">
              {siblings.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  className="pv__thumb"
                  aria-current={s.index === index || undefined}
                  aria-label={`Photo ${i + 1} of ${siblings.length} from this review`}
                  onClick={() => onIndex(s.index)}
                >
                  <img src={s.src} alt="" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </aside>
  );
}

function ReviewBody({ review }: { review: NonNullable<ReturnType<typeof reviewsById.get>> }) {
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
        <div className="pv__who">
          <span className="pv__name">{review.name}</span>
          <span className="pv__dot" aria-hidden>•</span>
          <span className="pv__date">{fmtDate(review.date)}</span>
        </div>
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
