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
