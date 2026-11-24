import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Global prototype variants. Add a group here and it appears in the floating widget.
 * Every visit starts on the defaults (Black · Blurred · Mask); changes last until the page is reloaded.
 * A link can still preselect values (?viewerTheme=white&photoSwap=slide) — handy for sharing one variant.
 */
export const VARIANT_GROUPS = {
  viewerTheme: {
    label: 'Image view',
    options: [
      { value: 'white', label: 'White' },
      { value: 'black', label: 'Black' },
    ],
    default: 'black',
  },
  viewAllTile: {
    label: 'View all tile',
    options: [
      { value: 'blur', label: 'Blurred' },
      { value: 'button', label: 'Gallery button' },
    ],
    default: 'blur',
  },
  photoSwap: {
    label: 'Next photo',
    options: [
      { value: 'mask', label: 'Mask' },
      { value: 'slide', label: 'Slide' },
    ],
    default: 'mask',
  },
  reviewPhotos: {
    label: 'Review photos',
    options: [
      { value: 'dots', label: 'Top dots' },
      { value: 'thumbs', label: 'Bottom carousel' },
    ],
    default: 'dots',
  },
} as const;

type Groups = typeof VARIANT_GROUPS;
export type VariantKey = keyof Groups;
export type VariantValue<K extends VariantKey> = Groups[K]['options'][number]['value'];
type State = { [K in VariantKey]: VariantValue<K> };

const OLD_STORAGE_KEY = 'noon-web-pdp:variants'; // earlier builds remembered choices; clear them
const keys = Object.keys(VARIANT_GROUPS) as VariantKey[];
const isValid = <K extends VariantKey>(k: K, v: unknown): v is VariantValue<K> =>
  VARIANT_GROUPS[k].options.some((o) => o.value === v);

function initialState(): State {
  try { localStorage.removeItem(OLD_STORAGE_KEY); } catch { /* private mode */ }
  const url = new URLSearchParams(location.search);
  const out = {} as Record<VariantKey, unknown>;
  for (const k of keys) {
    const fromUrl = url.get(k);
    out[k] = isValid(k, fromUrl) ? fromUrl : VARIANT_GROUPS[k].default;
  }
  return out as State;
}

const Ctx = createContext<{ state: State; set: <K extends VariantKey>(k: K, v: VariantValue<K>) => void } | null>(null);

export function VariantsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [first] = useState(state);
  const set = useCallback(<K extends VariantKey>(k: K, v: VariantValue<K>) => setState((s) => ({ ...s, [k]: v })), []);
  // once the widget is used, drop any preselecting params so a reload goes back to the defaults
  useEffect(() => {
    if (state === first) return;
    const url = new URL(location.href);
    if (!keys.some((k) => url.searchParams.has(k))) return;
    for (const k of keys) url.searchParams.delete(k);
    history.replaceState(history.state, '', url);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps
  const value = useMemo(() => ({ state, set }), [state, set]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useVariant<K extends VariantKey>(key: K): [VariantValue<K>, (v: VariantValue<K>) => void] {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVariant needs <VariantsProvider>');
  return [ctx.state[key], (v) => ctx.set(key, v)];
}

export function useVariants() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useVariants needs <VariantsProvider>');
  return ctx;
}
