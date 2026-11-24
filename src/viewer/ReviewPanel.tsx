import { useLayoutEffect, useRef, useState } from 'react';
import { firstPhotoOf, photos, reviewOrder, reviewsById, siblingsOf } from './data';
import { IconChevron, Stars } from './icons';

const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * The review behind the current photo. Stepping through photos of the same review keeps this panel still
 * (only the "photos from this review" thumbnail ring moves); crossing into another review swaps the content.
 */
export function ReviewPanel({ index, onIndex }: { index: number; onIndex: (i: number) => void }) {
  const reviewId = photos[index].review;
  const review = reviewsById.get(reviewId)!;
  const siblings = siblingsOf(index);
  const pos = siblings.findIndex((s) => s.index === index);
  const r = reviewOrder.indexOf(reviewId);
  const prevReview = reviewOrder[r - 1];
  const nextReview = reviewOrder[r + 1];

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
                  <img src={s.src} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="pv__panelFoot">
        <button type="button" className="pv__reviewNav" disabled={!prevReview} onClick={() => onIndex(firstPhotoOf(prevReview))}>
          <IconChevron dir="left" /> Previous review
        </button>
        <span className="pv__reviewPos">
          {r + 1} / {reviewOrder.length}
        </span>
        <button type="button" className="pv__reviewNav" disabled={!nextReview} onClick={() => onIndex(firstPhotoOf(nextReview))}>
          Next review <IconChevron dir="right" />
        </button>
      </footer>
    </aside>
  );
}

function ReviewBody({ review }: { review: NonNullable<ReturnType<typeof reviewsById.get>> }) {
  const [expanded, setExpanded] = useState(false);
  const [clamped, setClamped] = useState(false);
  const [helpful, setHelpful] = useState(false);
  const comment = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const el = comment.current;
    if (el) setClamped(el.scrollHeight > el.clientHeight + 1);
  }, []);

  return (
    <div className="pv__review">
      <div className="pv__reviewer">
        <span className="pv__avatar" aria-hidden>{review.name.trim()[0]}</span>
        <div className="pv__reviewerText">
          <div className="pv__reviewerTop">
            <span className="pv__name">{review.name}</span>
            {review.verified && (
              <span className="pv__verified">
                <img src="https://f.nooncdn.com/s/app/com/noon/icons/verified-purchase.svg" alt="" width="13" height="13" />
                Verified Purchase
              </span>
            )}
          </div>
          <span className="pv__date">{fmtDate(review.date)}</span>
        </div>
      </div>

      <Stars rating={review.rating} />
      {review.title?.trim() && <h3 className="pv__title">{review.title}</h3>}
      <p ref={comment} className="pv__comment" data-expanded={expanded || undefined}>
        {review.comment}
      </p>
      {(clamped || expanded) && (
        <button type="button" className="pv__more" onClick={() => setExpanded((e) => !e)}>
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}

      <dl className="pv__variants">
        {review.variants.map((v) => (
          <div key={v.label} className="pv__variant">
            <dt>{v.label}</dt>
            <dd>{v.value}</dd>
          </div>
        ))}
      </dl>

      <button type="button" className="pv__helpful" aria-pressed={helpful} onClick={() => setHelpful((h) => !h)}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
          <path
            d="M7 10v11M3 11.5v8A1.5 1.5 0 0 0 4.5 21H17a2 2 0 0 0 2-1.6l1.4-7A2 2 0 0 0 18.4 10H14V5.5A2.5 2.5 0 0 0 11.5 3L7 10"
            fill={helpful ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
        Helpful ({review.helpful + (helpful ? 1 : 0)})
      </button>
    </div>
  );
}
