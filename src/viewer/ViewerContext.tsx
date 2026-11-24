import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { photos } from './data';
import { PhotoViewer } from './PhotoViewer';

export type ViewerMode = 'photo' | 'grid';
type ViewerState = { open: boolean; mode: ViewerMode; index: number };
type Api = { openPhoto: (index: number) => void; openGrid: () => void };

const Ctx = createContext<Api | null>(null);

/** Owns the image view. Anything on the page can open it via useViewer() or a `pdp:open-photo` event. */
export function ViewerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ViewerState>({ open: false, mode: 'photo', index: 0 });
  const openPhoto = useCallback((index: number) => setState({ open: true, mode: 'photo', index }), []);
  const openGrid = useCallback(() => setState((s) => ({ ...s, open: true, mode: 'grid' })), []);

  // Captured (static) review cards dispatch this with the clicked image's src.
  useEffect(() => {
    const onOpen = (e: Event) => {
      const src = (e as CustomEvent<{ src: string }>).detail.src;
      const i = photos.findIndex((p) => p.src === src);
      if (i >= 0) openPhoto(i);
    };
    window.addEventListener('pdp:open-photo', onOpen);
    return () => window.removeEventListener('pdp:open-photo', onOpen);
  }, [openPhoto]);

  const api = useMemo(() => ({ openPhoto, openGrid }), [openPhoto, openGrid]);
  return (
    <Ctx.Provider value={api}>
      {children}
      <PhotoViewer
        {...state}
        onIndex={(index) => setState((s) => ({ ...s, index }))}
        onMode={(mode) => setState((s) => ({ ...s, mode }))}
        onClose={() => setState((s) => ({ ...s, open: false }))}
      />
    </Ctx.Provider>
  );
}

export function useViewer() {
  const api = useContext(Ctx);
  if (!api) throw new Error('useViewer needs <ViewerProvider>');
  return api;
}
