// Inline icons so they follow the viewer theme via currentColor (16px, 2px stroke — Airbnb's viewer weight).

export const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
    <path d="m6 6 20 20M26 6 6 26" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="3">
      <rect x="3" y="3" width="10.5" height="10.5" rx="2" />
      <rect x="18.5" y="3" width="10.5" height="10.5" rx="2" />
      <rect x="3" y="18.5" width="10.5" height="10.5" rx="2" />
      <rect x="18.5" y="18.5" width="10.5" height="10.5" rx="2" />
    </g>
  </svg>
);

export const IconArrow = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden style={dir === 'left' ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="M4 16h23M18 7l9 9-9 9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconChevron = ({ dir }: { dir: 'left' | 'right' }) => (
  <svg width="12" height="12" viewBox="0 0 16 16" aria-hidden style={dir === 'left' ? { transform: 'scaleX(-1)' } : undefined}>
    <path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// noon's rating colours (Figma review bars): 5/4 green, 3 light green, 2 amber, 1 orange
const STAR_COLOUR: Record<number, string> = { 5: '#006300', 4: '#006300', 3: '#05af25', 2: '#f8b200', 1: '#f36302' };

export const Stars = ({ rating }: { rating: number }) => (
  <div className="pv__stars" role="img" aria-label={`${rating} out of 5 stars`} style={{ ['--star' as string]: STAR_COLOUR[rating] }}>
    {[1, 2, 3, 4, 5].map((n) => (
      <svg key={n} width="16" height="16" viewBox="0 0 24 24" data-on={n <= rating || undefined}>
        <path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z" />
      </svg>
    ))}
  </div>
);
