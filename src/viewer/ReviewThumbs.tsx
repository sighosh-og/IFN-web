import { useLayoutEffect, useRef } from 'react';
import { photos, siblingsOf } from './data';

/**
 * Bottom carousel of the photos in the review on screen — the "Thumbnails" alternative to the top-bar dots.
 * Others sit at low opacity; the selected one is fully opaque with a white border (dark in the white theme).
 * Single-photo reviews show nothing — there's nothing to step through.
 */
export function ReviewThumbs({ index, onIndex }: { index: number; onIndex: (i: number) => void }) {
  const siblings = siblingsOf(index);
  const pos = siblings.findIndex((s) => s.index === index);
  const row = useRef<HTMLDivElement>(null);

  // keep the selected thumbnail in view if a review ever has more photos than fit
  useLayoutEffect(() => {
    const el = row.current?.querySelector<HTMLElement>('[aria-current]');
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [index]);

  if (siblings.length < 2) return null;
  return (
    // keyed by review so the row fades in fresh when you cross into another review
    <div key={photos[index].review} ref={row} className="pv__thumbs" role="group" aria-label={`Photo ${pos + 1} of ${siblings.length} from this review`}>
      {siblings.map((s, i) => (
        <button
          key={s.src}
          type="button"
          className="pv__thumb"
          aria-current={s.index === index || undefined}
          aria-label={`Photo ${i + 1} of ${siblings.length} from this review`}
          onClick={() => onIndex(s.index)}
        >
          <img src={s.src} alt="" draggable={false} />
        </button>
      ))}
    </div>
  );
}
