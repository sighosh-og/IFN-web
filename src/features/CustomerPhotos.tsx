import data from '../data/customerPhotos.json';
import './CustomerPhotos.css';

// Figma: Image-first navigation › IFN View › Customer Photos (5297:2221)
// Seven 4:5 tiles in one row; the 7th is blurred and dimmed and reads "View all (n)".
const VISIBLE = 6;

export function CustomerPhotos({ onOpen }: { onOpen?: (index: number) => void }) {
  const shown = data.photos.slice(0, VISIBLE);
  const more = data.photos[VISIBLE] ?? data.photos[0];
  const remaining = Math.max(0, data.total - VISIBLE);

  return (
    <section className="cp" aria-labelledby="cp-title">
      <h3 id="cp-title" className="cp__title">
        Customer Photos <span className="cp__count">({data.total.toLocaleString('en-US')})</span>
      </h3>
      <div className="cp__row">
        {shown.map((src, i) => (
          <button key={src} type="button" className="cp__tile" aria-label={`Customer photo ${i + 1} of ${data.total}`} onClick={() => onOpen?.(i)}>
            <img src={src} alt="" loading="lazy" />
          </button>
        ))}
        {more && (
          <button type="button" className="cp__tile cp__tile--more" aria-label={`View all ${data.total} customer photos`} onClick={() => onOpen?.(VISIBLE)}>
            <img src={more} alt="" loading="lazy" />
            <span className="cp__scrim" aria-hidden />
            <span className="cp__moreLabel">
              <span>View all</span>
              <span>({remaining.toLocaleString('en-US')})</span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
