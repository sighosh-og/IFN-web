import { createElement, Fragment, memo, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

// Renders a captured noon HTML fragment as its own outer element (no extra wrapper div),
// so noon's CSS and layout apply exactly as on the live page.
const toReactAttr: Record<string, string> = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex' };

function parse(raw: string) {
  const t = document.createElement('template');
  t.innerHTML = raw.trim();
  const el = t.content.firstElementChild!;
  const props: Record<string, unknown> = {};
  for (const a of Array.from(el.attributes)) {
    if (a.name === 'style') {
      const style: Record<string, string> = {};
      for (const decl of a.value.split(';')) {
        const i = decl.indexOf(':');
        if (i < 0) continue;
        const k = decl.slice(0, i).trim();
        const v = decl.slice(i + 1).trim();
        style[k.startsWith('--') ? k : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
      }
      props.style = style;
    } else props[toReactAttr[a.name] ?? a.name] = a.value;
  }
  return { tag: el.tagName.toLowerCase(), props, inner: el.innerHTML };
}

type HtmlProps = {
  html: string;
  /** React content to mount into `<div data-slot="name">` placeholders inside the fragment. */
  slots?: Record<string, ReactNode>;
} & Record<string, unknown>;

export const Html = memo(function Html({ html, slots, ...extra }: HtmlProps) {
  const { tag, props, inner } = useMemo(() => parse(html), [html]);
  const ref = useRef<HTMLElement>(null);
  const [targets, setTargets] = useState<Record<string, HTMLElement>>({});
  useLayoutEffect(() => {
    if (!slots || !ref.current) return;
    const found: Record<string, HTMLElement> = {};
    for (const name of Object.keys(slots)) {
      const el = ref.current.querySelector<HTMLElement>(`[data-slot="${name}"]`);
      if (el) found[name] = el;
      else console.warn(`<Html>: no [data-slot="${name}"] in fragment`);
    }
    setTargets(found);
  }, [inner, slots && Object.keys(slots).join()]);
  return createElement(
    Fragment,
    null,
    createElement(tag, { ...props, ...extra, ref, dangerouslySetInnerHTML: { __html: inner } }),
    slots && Object.entries(targets).map(([name, el]) => createPortal(slots[name], el, name)),
  );
});
