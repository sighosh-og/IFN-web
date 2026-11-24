// Turns capture/page.html (rendered noon PDP DOM) into:
//  public/noon/noon.css  — all noon stylesheets + inline <style>s, fonts localised
//  src/sections/*.html   — one HTML fragment per page section
import { parseHTML } from 'linkedom';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const root = path.resolve(import.meta.dirname, '..');
const cap = (p) => path.join(root, 'capture', p);
const html = fs.readFileSync(cap('page.html'), 'utf8');
const { document } = parseHTML(html);
const SLIDES_PER_CAROUSEL = 18;

// ---------- CSS ----------
const cssUrls = JSON.parse(fs.readFileSync(cap('css.json'), 'utf8'));
const assetDir = path.join(root, 'public/noon/assets');
fs.mkdirSync(assetDir, { recursive: true });
async function get(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(r.status + ' ' + url);
  return Buffer.from(await r.arrayBuffer());
}
async function localiseUrls(css, base) {
  const re = /url\((['"]?)([^'")]+)\1\)/g;
  const jobs = new Map();
  for (const m of css.matchAll(re)) {
    const u = m[2];
    if (u.startsWith('data:') || u.startsWith('#')) continue;
    const abs = new URL(u, base).href;
    if (!/\.(woff2?|ttf|otf|eot)(\?|$)/i.test(abs)) continue; // only fonts; images stay on CDN
    if (!jobs.has(u)) jobs.set(u, abs);
  }
  for (const [u, abs] of jobs) {
    const ext = path.extname(new URL(abs).pathname);
    const name = path.basename(new URL(abs).pathname, ext).slice(0, 40) + '-' + crypto.createHash('md5').update(abs).digest('hex').slice(0, 6) + ext;
    const file = path.join(assetDir, name);
    if (!fs.existsSync(file)) fs.writeFileSync(file, await get(abs));
    css = css.split(u).join('/noon/assets/' + name);
  }
  // absolutise remaining relative urls (images) against the CDN
  return css.replace(re, (all, q, u) => (u.startsWith('data:') || u.startsWith('#') || u.startsWith('/noon/') || /^https?:/.test(u)) ? all : `url(${q}${new URL(u, base).href}${q})`);
}
let cssOut = '';
for (const u of cssUrls) {
  const text = (await get(u)).toString('utf8');
  cssOut += `/* ${path.basename(new URL(u).pathname)} */\n` + (await localiseUrls(text, u)) + '\n';
}
const seen = new Set();
for (const s of document.querySelectorAll('style')) {
  const t = s.textContent.trim();
  if (seen.has(t)) continue; seen.add(t);
  cssOut += '/* inline */\n' + (await localiseUrls(t, 'https://www.noon.com/')) + '\n';
}
fs.writeFileSync(path.join(root, 'public/noon/noon.css'), cssOut);
console.log('css', (cssOut.length / 1024).toFixed(0) + 'KB', fs.readdirSync(assetDir).length, 'font files');

// ---------- sections ----------
document.querySelectorAll('script, noscript, iframe, style').forEach((n) => n.remove());

// canvas animations → static captures (see scripts/capture.mjs)
const pillCanvas = document.querySelector('[data-qa=loyalty-header-button] canvas');
if (pillCanvas) {
  const img = document.createElement('img');
  img.setAttribute('src', '/noon/noon-one-pill.png');
  img.setAttribute('alt', 'Get Free Delivery with noon one');
  img.setAttribute('style', 'width:100%;height:100%;object-fit:contain');
  pillCanvas.parentNode.replaceWith(img);
}

// Customer photos strip → React slot (src/features/CustomerPhotos.tsx).
// Its photos + reviews come from scripts/fetch-photo-reviews.mjs → src/data/photoReviews.json.
const photoStrip = document.querySelector('[class*=_carouselContainer_11xnc]');
if (photoStrip) {
  const slot = document.createElement('div');
  slot.setAttribute('data-slot', 'customer-photos');
  photoStrip.replaceWith(slot);
}

// trim recommendation carousels so the page stays light
for (const track of document.querySelectorAll('[class*=_emblaContainer_]')) {
  [...track.children].slice(SLIDES_PER_CAROUSEL).forEach((n) => n.remove());
}

const out = path.join(root, 'src/sections');
fs.mkdirSync(out, { recursive: true });
const write = (name, el) => {
  if (!el) throw new Error('missing section ' + name);
  fs.writeFileSync(path.join(out, name + '.html'), el.outerHTML + '\n');
  console.log(name.padEnd(14), (el.outerHTML.length / 1024).toFixed(0) + 'KB');
};
const q = (s, r = document) => r.querySelector(s);
const main = q('#catalog-page-container');
const mainInner = q('[class*=_mainContainer_]', main);
const [topWrap, , , reviewsWrap, recosWrap] = mainInner.children;

write('header', q('#default-header-desktop'));
write('breadcrumb', topWrap.children[0]);
write('gallery', q('[class*=_imgCtr_]', main));
write('core', q('[class*=_coreCtr_]', main));
write('seller', q('[class*=_secondaryDetails_]', main));
write('reviews', q('#ReviewArea', reviewsWrap));
write('recos', q('[class*=_recommendations_]', recosWrap));
write('stickyBar', q('[class*=_stickyBottomBarContainer_]', main));
write('footer', q('[class*=_container_fijny_]'));

// shell class names, so App.tsx can rebuild the wrappers exactly
const shell = {
  html: Object.fromEntries([...document.documentElement.attributes].map((a) => [a.name, a.value])),
  main: main.className,
  mainInner: mainInner.className,
  topWrap: topWrap.className,
  breadcrumbWrap: topWrap.children[0].className,
  productWrap: topWrap.children[1].className,
  middle: q('[class*=_middleSection_]', main).className,
  primary: q('[class*=_primaryDetails_]', main).className,
  separator: mainInner.children[1].className,
  stickyTrigger: mainInner.children[2].className,
  reviewsWrap: reviewsWrap.className,
  reviewsSeparator: reviewsWrap.children[0].className,
  reviewsAfter: reviewsWrap.children[2]?.className,
  recosWrap: recosWrap.className,
  scrollTop: mainInner.children[6]?.outerHTML,
};
fs.writeFileSync(path.join(out, 'shell.json'), JSON.stringify(shell, null, 2) + '\n');
console.log(shell);
