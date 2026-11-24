import { photos, siblingsOf } from './data';

/**
 * Top-bar indicator for the photos of the review on screen (replaces the old "n of N" counter and the
 * panel's thumbnail row). The current photo is a pill; the others are dots you can click.
 * Single-photo reviews show nothing — there's nothing to step through.
 */
export function ReviewDots({ index, onIndex }: { index: number; onIndex: (i: number) => void }) {
  const siblings = siblingsOf(index);
  const pos = siblings.findIndex((s) => s.index === index);
  if (siblings.length < 2) return <div className="pv__pips" aria-hidden />;

  return (
    // keyed by review so the group fades in fresh when you cross into another review
    <div key={photos[index].review} className="pv__pips" role="group" aria-label={`Photo ${pos + 1} of ${siblings.length} from this review`}>
      {siblings.map((s, i) => (
        <button
          key={s.src}
          type="button"
          className="pv__pip"
          aria-current={s.index === index || undefined}
          aria-label={`Photo ${i + 1} of ${siblings.length} from this review`}
          onClick={() => onIndex(s.index)}
        />
      ))}
    </div>
  );
}
