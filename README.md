# noon web PDP — base clone

A 1:1 copy of the desktop noon PDP for
[iPhone 17 Pro Max 256 GB Silver](https://www.noon.com/uae-en/iphone-17-pro-max-256-gb-silver-5g-e-sim-only-middle-east-version/N70211544V/p/?o=ae59905acac1d0de),
to use as the starting point for feature prototypes.

```bash
npm run dev        # http://localhost:5211
```

## How it's built

- `capture/page.html` — the rendered DOM from the live page, taken with headless Chrome at 1440px (`npm run capture`).
  `capture/live-full.png` is the reference screenshot.
- `npm run extract` turns it into:
  - `public/noon/noon.css` — noon's 95 stylesheets plus inline styles, with fonts saved in `public/noon/assets/`. Images still load from noon's CDN.
  - `src/sections/*.html` — one fragment per section: header, breadcrumb, gallery, core (product info), seller, reviews, recos, stickyBar and footer.
- `src/App.tsx` rebuilds noon's page wrappers with their real class names. It renders each fragment through `<Html>`, which outputs the fragment's own root element with no extra wrapper.
- `src/interactions.ts` wires up the gallery thumbnails, Read more, the carousels, the sticky add-to-cart bar and scroll-to-top. Links do nothing.

## Building a feature

Swap the section you're changing for a real React component, e.g. replace `<Html html={core} />` with `<Core />`, and keep noon's class names so `noon.css` still styles it.
Put local style changes in `src/overrides.css`.

Not included: the sponsored ad strip above the breadcrumb, the cookie banner, and the hover mega-menus in the nav.
