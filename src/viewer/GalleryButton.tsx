import { useEffect, useRef, useState } from 'react';
import { photos } from './data';

/** How long "Gallery" stays spelled out after the image view opens, before folding to just the photo stack. */
const LABEL_MS = 5000;
/** If the pointer is on the button when the time is up, fold this long after it leaves. */
const LEAVE_MS = 1200;

/**
 * Figma 5322:21728 "Button - Show all photos": a fanned stack of the gallery's first three photos plus a
 * "Gallery" label. The label shows when the image view opens, then folds away; hovering wiggles the stack.
 */
export function GalleryButton({ openedAt, onClick }: { openedAt: number; onClick: () => void }) {
  // counted from when the viewer opened, so coming back from the grid doesn't spell it out again
  const left = () => LABEL_MS - (performance.now() - openedAt);
  const [labelled, setLabelled] = useState(() => left() > 0);
  const hovering = useRef(false);
  const foldOnLeave = useRef(false);
  const leaveTimer = useRef<number>();

  // every time the viewer opens: spell it out, then fold
  useEffect(() => {
    const ms = left();
    setLabelled(ms > 0);
    foldOnLeave.current = false;
    if (ms <= 0) return;
    const t = window.setTimeout(() => {
      if (hovering.current) foldOnLeave.current = true;
      else setLabelled(false);
    }, ms);
    return () => { clearTimeout(t); clearTimeout(leaveTimer.current); };
  }, [openedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <button
      type="button"
      className="pv__galleryBtn"
      data-labelled={labelled || undefined}
      aria-label="Show all photos"
      onClick={onClick}
      onPointerEnter={() => { hovering.current = true; clearTimeout(leaveTimer.current); }}
      onPointerLeave={() => {
        hovering.current = false;
        if (!foldOnLeave.current) return;
        foldOnLeave.current = false;
        leaveTimer.current = window.setTimeout(() => setLabelled(false), LEAVE_MS);
      }}
    >
      <span className="pv__stack" aria-hidden>
        {/* back to front: 3rd, 2nd, 1st photo — the first photo sits on top */}
        {[2, 1, 0].map((i) => (
          <span key={i} className="pv__stackCard" data-card={i}>
            {photos[i] && <img src={photos[i].src} alt="" draggable={false} />}
          </span>
        ))}
      </span>
      <span className="pv__galleryLabel" aria-hidden>
        <span>Gallery</span>
      </span>
    </button>
  );
}
