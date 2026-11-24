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
To drop a component *inside* a fragment, have `scripts/extract.mjs` replace that markup with `<div data-slot="name">`, then pass `slots={{ name: <Comp /> }}` to `<Html>`. The component renders into the placeholder through a portal.

## Features

- **Customer photos** ([src/features/CustomerPhotos.tsx](src/features/CustomerPhotos.tsx)) — Figma `Image-first-navigation` node `5297:2221` (reference image in `capture/figma-customer-photos.png`).
  A row of seven 4:5 tiles with 12px corners. The 7th tile is blurred and dimmed and reads "View all (n)".
  Tiles open the image view on that photo. "View all" opens the grid.
- **Image view** (`src/viewer/`): layout and motion modelled on Airbnb's experience gallery.
  - Photo mode: one large photo with 32px corners, sized in JS to fit the stage at any window size. It has edge arrows, "n of N", a grid toggle and close. Photos sit inside one rounded mask. On next/prev the mask contracts (keeping its shape), then expands into the next photo's exact width × height while the photos crossfade inside it (620ms). Photos are decoded before the swap starts. Keys: ← → Esc.
  - Grid mode: 4-column masonry with 16px corners, no badges and no hover.
  - Shared-element morphs: strip tile → photo on open, photo → strip tile on close, photo ⇄ grid tile. A single flyer runs all of them (`Transit` in `PhotoViewer.tsx`).
  - Review panel, docked right: the review behind the photo, Read more, variant chips and Helpful. A "Photo n of N from this review" thumbnail row links photos from the same review, and the panel stays still while you step within one review.
  - Photos in the captured review cards also open the view.
  - Data: `npm run fetch-photos` → `src/data/photoReviews.json`, with 80 photos from 46 reviews. It comes from noon's `mp-trust-api/product-reviews/sku/images-list` (paged with `page`).
- **Variants widget** (`src/variants/`): a floating pill at the bottom left, available on every page and above the image view. Groups live in `VARIANT_GROUPS`:
  - Image view: White / Black.
  - View all tile: Blurred, where the 7th tile reads "View all (n)", or Gallery button, where the 7th photo stays sharp and a small frosted gallery button bottom-right opens the grid. The choice persists in localStorage and the URL (`?viewerTheme=black`).

Not included: the sponsored ad strip above the breadcrumb, the cookie banner, and the hover mega-menus in the nav.
