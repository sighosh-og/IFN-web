// Inline icons so they follow the viewer theme via currentColor. Viewer glyphs share one structure:
// 16px box, 1.5px stroke (3 in the 32 viewBox), round caps, ~11px optical size — arrow, close and grid match.

export const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
    <path d="m7 7 18 18M25 7 7 25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);

export const IconGrid = () => (
  <svg width="16" height="16" viewBox="0 0 32 32" aria-hidden>
    <g fill="none" stroke="currentColor" strokeWidth="3">
      <rect x="5" y="5" width="9" height="9" rx="2" />
      <rect x="18" y="5" width="9" height="9" rx="2" />
      <rect x="5" y="18" width="9" height="9" rx="2" />
      <rect x="18" y="18" width="9" height="9" rx="2" />
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
