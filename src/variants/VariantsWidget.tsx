import { useEffect, useRef, useState } from 'react';
import { VARIANT_GROUPS, useVariants, type VariantKey, type VariantValue } from './variants';
import './VariantsWidget.css';

// the spec sheet loads frames as /?photoSwap=…&?spec=<time>, so look for the key anywhere in the query
const IN_SPEC = /[?&]\??spec=/.test(location.search);

/** Floating, page-global switcher for prototype variants. Sits above everything, including the image view. */
export function VariantsWidget() {
  const { state, set } = useVariants();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const keys = Object.keys(VARIANT_GROUPS) as VariantKey[];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopImmediatePropagation(); setOpen(false); }
    };
    document.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey, true);
    return () => { document.removeEventListener('pointerdown', onDown); window.removeEventListener('keydown', onKey, true); };
  }, [open]);

  // inside the spec sheet's preview frames (?spec=…) the widget would just sit on top of the recording
  if (IN_SPEC) return null;

  const summary = keys.map((k) => VARIANT_GROUPS[k].options.find((o) => o.value === state[k])?.label).join(' · ');

  return (
    <div ref={root} className="vw" data-open={open || undefined}>
      <div className="vw__panel" role="dialog" aria-label="Prototype variants" hidden={!open}>
        <div className="vw__head">Variants</div>
        {keys.map((k) => (
          <fieldset key={k} className="vw__group">
            <legend className="vw__label">{VARIANT_GROUPS[k].label}</legend>
            <div className="vw__seg" role="radiogroup" aria-label={VARIANT_GROUPS[k].label}>
              {VARIANT_GROUPS[k].options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={state[k] === o.value}
                  className="vw__opt"
                  onClick={() => set(k, o.value as VariantValue<typeof k>)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="vw__pills">
      <button type="button" className="vw__pill" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M2 4h7M13 4h1M2 12h1M7 12h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="11" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="5" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <span className="vw__pillText">Variants</span>
        <span className="vw__pillValue">{summary}</span>
      </button>
      {/* dev handoff: the animation spec sheet for the image view, on the iteration that's showing */}
      <a className="vw__pill vw__spec" href={`/spec/?v=${state.photoSwap === 'slide' ? 2 : 1}`} target="_blank" rel="noopener">
        <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden>
          <path d="M2 4.5h12M2 8h12M2 11.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M6 3v3M10 6.5v3M5 10v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="vw__pillText">Spec</span>
      </a>
      </div>
    </div>
  );
}
