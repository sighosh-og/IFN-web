import { createElement, memo, useMemo } from 'react';

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

export const Html = memo(function Html({ html, ...extra }: { html: string } & Record<string, unknown>) {
  const { tag, props, inner } = useMemo(() => parse(html), [html]);
  return createElement(tag, { ...props, ...extra, dangerouslySetInnerHTML: { __html: inner } });
});
