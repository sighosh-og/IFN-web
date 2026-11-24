import { photos, totalPhotos } from '../viewer/data';
import { useViewer } from '../viewer/ViewerContext';
import { useVariant } from '../variants/variants';
import { IconGrid } from '../viewer/icons';
import './CustomerPhotos.css';

// Figma: Image-first navigation › IFN View › Customer Photos (5297:2221)
// Seven 4:5 tiles in one row. The 7th tile has two variants (Variants widget → "View all tile"):
//  blur   — photo blurred + dimmed, reads "View all (n)", opens the gallery
//  button — photo stays sharp and opens itself; a small frosted gallery button bottom-right opens the gallery
const VISIBLE = 6;

export function CustomerPhotos() {
  const { openPhoto, openGrid } = useViewer();
  const [viewAll] = useVariant('viewAllTile');
  const shown = photos.slice(0, VISIBLE);
  const last = photos[VISIBLE];
  const remaining = Math.max(0, totalPhotos - VISIBLE);

  return (
    <section className="cp" aria-labelledby="cp-title">
      <h3 id="cp-title" className="cp__title">
        Customer Photos <span className="cp__count">({totalPhotos.toLocaleString('en-US')})</span>
      </h3>
      <div className="cp__row">
        {shown.map((p, i) => (
          <button
            key={p.src}
            type="button"
            className="cp__tile"
            data-index={i}
            aria-label={`Customer photo ${i + 1} of ${totalPhotos}`}
            onClick={(e) => openPhoto(i, e.currentTarget)}
          >
            <img src={p.src} alt="" loading="lazy" />
          </button>
        ))}

        {last && viewAll === 'blur' && (
          <button type="button" className="cp__tile cp__tile--more" aria-label={`View all ${totalPhotos} customer photos`} onClick={openGrid}>
            <img src={last.src} alt="" loading="lazy" />
            <span className="cp__scrim" aria-hidden />
            <span className="cp__moreLabel">
              <span>View all</span>
              <span>({remaining.toLocaleString('en-US')})</span>
            </span>
          </button>
        )}

        {last && viewAll === 'button' && (
          <div className="cp__tileWrap">
            <button
              type="button"
              className="cp__tile"
              data-index={VISIBLE}
              aria-label={`Customer photo ${VISIBLE + 1} of ${totalPhotos}`}
              onClick={(e) => openPhoto(VISIBLE, e.currentTarget)}
            >
              <img src={last.src} alt="" loading="lazy" />
            </button>
            <button type="button" className="cp__galleryBtn" aria-label={`View all ${totalPhotos} customer photos`} onClick={openGrid}>
              <IconGrid />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
