import { photos, totalPhotos } from '../viewer/data';
import { useViewer } from '../viewer/ViewerContext';
import './CustomerPhotos.css';

// Figma: Image-first navigation › IFN View › Customer Photos (5297:2221)
// Seven 4:5 tiles in one row; the 7th is blurred and dimmed and reads "View all (n)".
// Tiles open the image view on that photo; "View all" opens the grid.
const VISIBLE = 6;

export function CustomerPhotos() {
  const { openPhoto, openGrid } = useViewer();
  const shown = photos.slice(0, VISIBLE);
  const more = photos[VISIBLE] ?? photos[0];
  const remaining = Math.max(0, totalPhotos - VISIBLE);

  return (
    <section className="cp" aria-labelledby="cp-title">
      <h3 id="cp-title" className="cp__title">
        Customer Photos <span className="cp__count">({totalPhotos.toLocaleString('en-US')})</span>
      </h3>
      <div className="cp__row">
        {shown.map((p, i) => (
          <button key={p.src} type="button" className="cp__tile" aria-label={`Customer photo ${i + 1} of ${totalPhotos}`} onClick={() => openPhoto(i)}>
            <img src={p.src} alt="" loading="lazy" />
          </button>
        ))}
        {more && (
          <button type="button" className="cp__tile cp__tile--more" aria-label={`View all ${totalPhotos} customer photos`} onClick={openGrid}>
            <img src={more.src} alt="" loading="lazy" />
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
