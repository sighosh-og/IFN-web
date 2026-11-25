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
  - Photo mode: one large photo with 32px corners, sized in JS to fit the stage at any window size. It has edge arrows, a grid toggle and close (all the same 48px filled circle at a 16px inset, lightening on hover; glyphs 16px / 1.5px stroke; an arrow with nowhere to go fades out), and a dot indicator in the top bar for the photos of the current review (current = pill; dots are clickable; hidden for single-photo reviews; `ReviewDots.tsx`). Photos sit inside one rounded mask. On next/prev, two layers run together: the mask's width × height reshapes into the next photo's on one continuous curve (a short hold, then a soft ease), while a separate subtle scale breath (1 → 0.965 → 1) gives the contract-then-open feel. Both photos fill the mask (object-fit: cover) mid-morph, so portrait ↔ landscape never shows an empty band. It takes 520ms, and up to 700ms for big aspect changes. Photos are decoded before the swap starts. Keys: ← → Esc.
  - Review photos: Bottom carousel (default, `ReviewThumbs.tsx`): a row of square (52px, 1:1) thumbnails of the current review's photos, 24px under the main photo; the others are at 40% opacity, and the selected one is at 100% with a 2px white border (dark in the white theme). Click to jump. Hidden for single-photo reviews. Or Top dots: pips in the top bar, `?reviewPhotos=dots`.
  - Reviewer: Top, by close (default): a 40px round avatar slot (the reviewer's photo when there is one, else their initials on a tint picked from their name) with the name and date in the panel's top band, vertically centred on the close button, crossfading with the review. The helpful button then sits alone on the left at the bottom. Or Bottom: name · date beside the helpful button, `?reviewer=bottom`.
  - Also: horizontal trackpad swipe = one step per gesture; Tab is trapped in the dialog; position is announced ("Photo n of 80"); focus returns to the opener on close; classic scrollbars are compensated while the page is locked.
  - Grid mode: 4-column masonry with 16px corners, no badges and no hover. Opened from View all, the on-screen tiles populate in a staggered rise + fade (18px, 0.97 → 1, 520ms, 22ms apart, top-left first; `populate()` in `PhotoGrid.tsx`), and each photo fades in once loaded. Coming from a photo, the morph is used instead.
  - Shared-element morphs: strip tile → photo on open, photo → strip tile on close, photo ⇄ grid tile. A single flyer runs all of them (`Transit` in `PhotoViewer.tsx`).
  - Review panel, docked right (Figma 5314:6610, "Panel v3"): rating pill + Verified Buy, title, full comment, variant chips, "See Translation" on Arabic reviews, dashed divider, then name · date and a helpful (thumbs-up) count; liking swaps to Origin's thumbs-up-filled with a small pop. Changing review crossfades the old and new review (out 220ms, in 420ms with a 6px rise and 2px blur). Icons live in public/viewer/. The panel stays still while you step within one review; the top-bar dots show where you are in it.
  - Photos in the captured review cards also open the view.
  - Data: `npm run fetch-photos` → `src/data/photoReviews.json`, with 80 photos from 46 reviews. It comes from noon's `mp-trust-api/product-reviews/sku/images-list` (paged with `page`).
- **Variants widget** (`src/variants/`): a floating pill at the bottom left, available on every page and above the image view. Groups live in `VARIANT_GROUPS`:
  - Image view: White / Black.
  - Next photo: Mask (default: the contract-then-expand mask) or Slide (`SlideStrip.tsx`, from a reference recording): a parallax pager. Photos are cards on a strip, with neighbours resting just outside the stage. Inside an off-centre card the photo is zoomed 14% and lags back toward the centre, so the card edge sweeps over it; cards one step away sit 8% smaller. It's spring-driven (critically damped, ω 15), so a click mid-slide keeps its momentum. `?photoSwap=slide`.
  - View all tile: Blurred, where the 7th tile reads "View all (n)", or Gallery button, where the 7th photo stays sharp and a small frosted gallery button bottom-right opens the grid. Every visit starts on Black · Blurred · Mask · Top dots · Bottom; widget changes last until reload. A link can preselect values (`?viewerTheme=white&photoSwap=slide`).

Not included: the sponsored ad strip above the breadcrumb, the cookie banner, and the hover mega-menus in the nav.

## Deploying to noonprototype.com

Live: https://vivid-badger.noonprototype.com/ (app 89, deploy region europe-west1; it's deleted on 23 Jan 2027 unless extended). Only signed-in noon employees can open it. To redeploy, run `npm run package`, then upload the new zip from the app's Deploy tab.


`npm run package` builds and writes `noon-web-pdp-deploy.zip`, which has `Dockerfile`, `nginx.conf.template` and `dist/` at the top level. It serves the static build with nginx on `$PORT`, per the platform contract (Cloud Run behind IAP). The zip is a build artifact and is gitignored. Deploy it through the `noon-prototype` MCP server: `register_app` → `create_source_upload` → PUT the zip → `finalize_source_upload` → `deploy_app`. You can also upload it on the site under New App.

## Dev handoff: animation spec sheet

`/spec/` is the image view's animation spec for developers, and the **Spec** pill next to Variants opens it on the iteration that's showing. It's the spec-sheet page from `saswata2002/product-upscale` (the engine is copied unchanged apart from the two fixes below), configured for this prototype in its `<script id="spec-config">` block (`public/spec/index.html`).

- It loads the real prototype in a hidden frame on a virtual clock, records one play of each scene, and then lets you scrub it frame by frame. The display is a static copy, so the prototype itself is never edited.
- **Scenes:** 00 Overview, 01 Open photo, 02 Next photo, 03 Next review, 04 Portrait → landscape, 05 Open gallery, 06 Pick from gallery, 07 View all, 08 Close, 09 Gallery label folds, 10 Gallery button hover, 11 Gallery tile hover, 12 Mark helpful.
- **Iterations:** 01 Mask (`/?photoSwap=mask`) and 02 Slide (`/?photoSwap=slide`), picked in the header (`?v=1|2&s=<scene>`).
- **Values:** every value comes from `src/viewer/*` (PhotoViewer, SlideStrip, PhotoGrid, GalleryButton, viewer.css), measured on a 1440×900 window. When an animation changes in code, update the matching row in the config.
- **Hover:** a script can't hover, so `[data-spec-hover]` on `.pv__galleryBtn` / `.pv__tile` plays the hover states (see viewer.css).
- **Variants widget:** it hides itself in the spec's frames (`?spec=` in the URL).
- **Engine fixes (worth sending upstream):**
  - The page's own scroll position is recorded, so scenes set up below the fold show there.
  - Every attribute change is recorded, not just `style`/`class`/`hidden`. That replays states kept in `data-*`/`aria-*`, such as `[data-labelled]` and `[aria-current]`.
  - A failed recording is logged to the console.

`/motion/` is the noon motion standard (the `noon_sas_motion` skill as a reference page). Its markdown is served from `public/.claude/skills/noon_sas_motion/`.

In `npm run dev` / `vite preview`, a small Vite plugin maps `/spec/` and `/motion/` to their `index.html`. In production, nginx serves the folder index (`absolute_redirect off` keeps `/spec` → `/spec/` relative).
