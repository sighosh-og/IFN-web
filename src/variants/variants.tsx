import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

/**
 * Global prototype variants. Add a group here and it appears in the floating widget.
 * Values persist in localStorage and in the URL (?viewerTheme=black), so a link reproduces the state.
 */
export const VARIANT_GROUPS = {
  viewerTheme: {
    label: 'Image view',
    options: [
      { value: 'white', label: 'White' },
      { value: 'black', label: 'Black' },
    ],
    default: 'white',
  },
  viewAllTile: {
    label: 'View all tile',
    options: [
      { value: 'blur', label: 'Blurred' },
      { value: 'button', label: 'Gallery button' },
    ],
    default: 'blur',
  },
} as const;

type Groups = typeof VARIANT_GROUPS;
export type VariantKey = keyof Groups;
export type VariantValue<K extends VariantKey> = Groups[K]['options'][number]['value'];
type State = { [K in VariantKey]: VariantValue<K> };

const STORAGE_KEY = 'noon-web-pdp:variants';
const keys = Object.keys(VARIANT_GROUPS) as VariantKey[];
const isValid = <K extends VariantKey>(k: K, v: unknown): v is VariantValue<K> =>
  VARIANT_GROUPS[k].options.some((o) => o.value === v);

function initialState(): State {
  let stored: Partial<Record<VariantKey, unknown>> = {};
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}'); } catch { /* private mode */ }
  const url = new URLSearchParams(location.search);
  const out = {} as Record<VariantKey, unknown>;
  for (const k of keys) {
    const fromUrl = url.get(k);
    out[k] = isValid(k, fromUrl) ? fromUrl : isValid(k, stored[k]) ? stored[k] : VARIANT_GROUPS[k].default;
  }
  return out as State;
}

const Ctx = createContext<{ state: State; set: <K extends VariantKey>(k: K, v: VariantValue<K>) => void } | null>(null);

export function VariantsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const set = useCallback(<K extends VariantKey>(k: K, v: VariantValue<K>) => setState((s) => ({ ...s, [k]: v })), []);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    const url = new URL(location.href);
    for (const k of keys) {
      if (state[k] === VARIANT_GROUPS[k].default) url.searchParams.delete(k);
      else url.searchParams.set(k, state[k]);
    }
    history.replaceState(history.state, '', url);
  }, [state]);
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
