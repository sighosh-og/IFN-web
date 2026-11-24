// Pulls customer photos + the review each belongs to from noon's own endpoint
// (mp-trust-api/product-reviews/sku/images-list, the one the live "Customer Photos" strip uses)
// and writes src/data/photoReviews.json grouped by review.
//   node scripts/fetch-photo-reviews.mjs [pages=4]
import fs from 'fs';
import path from 'path';
const pw = process.env.PLAYWRIGHT || '/Users/sighosh/Desktop/noon-plp-midroll/node_modules/playwright/index.mjs';
const { chromium } = await import(pw);
const root = path.resolve(import.meta.dirname, '..');
const SKU = 'N70211544V';
const PAGES = Number(process.argv[2] || 4);

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({ locale: 'en-US', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' });
const page = await ctx.newPage();
await page.goto(`https://www.noon.com/uae-en/p/${SKU}/p/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);
const pages = await page.evaluate(async ({ sku, n }) => {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const r = await fetch('/_vs/mp/mp-trust-api/product-reviews/sku/images-list', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sku, ratings: [1, 2, 3, 4, 5], verifiedPurchase: false, sortFilter: 'helpful', grouped: true, page: i }),
    });
    const j = await r.json();
    out.push(j);
    if (!j.hasMore) break;
  }
  return out;
}, { sku: SKU, n: PAGES });
await browser.close();

fs.writeFileSync(path.join(root, 'research/noon-api/images-list-raw.json'), JSON.stringify(pages, null, 1));
const total = pages[0].totalCount;
const reviews = new Map();
const photos = [];
for (const img of pages.flatMap((p) => p.images)) {
  if (!reviews.has(img.uid)) {
    reviews.set(img.uid, {
      id: img.uid,
      name: img.displayName,
      rating: img.rating,
      title: img.title,
      comment: img.comment,
      date: img.updatedAt,
      helpful: img.helpfulCount,
      verified: img.isVerifiedPurchase,
      variants: (img.productGroupVariant ?? []).map((v) => ({ label: v.title, value: v.value })),
      images: img.imageUrlsV2 ?? img.imageUrls.map((f) => `https://f.nooncdn.com/review/${f.replace(/"/g, "")}`),
    });
  }
  if (!photos.some((p) => p.src === img.imageUrl)) photos.push({ src: img.imageUrl, review: img.uid });
}
// image dimensions (first 64KB is enough for the JPEG SOF / PNG IHDR header) so the masonry grid needs no reflow
async function dims(url) {
  const buf = Buffer.from(await (await fetch(url, { headers: { Range: 'bytes=0-65535' } })).arrayBuffer());
  if (buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    const len = buf.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + len;
  }
  return [3, 4];
}
await Promise.all(photos.map(async (p) => { const [w, h] = await dims(p.src); p.w = w; p.h = h; }));

const data = { sku: SKU, total, fetchedAt: new Date().toISOString().slice(0, 10), photos, reviews: [...reviews.values()] };
fs.writeFileSync(path.join(root, 'src/data/photoReviews.json'), JSON.stringify(data, null, 2) + '\n');
const multi = data.reviews.filter((r) => r.images.length > 1);
console.log(`${photos.length} photos from ${data.reviews.length} reviews (total ${total}); ${multi.length} reviews have 2+ photos:`, multi.map((r) => r.images.length).join(','));
console.log('photos whose review lists them:', photos.filter((p) => reviews.get(p.review).images.includes(p.src)).length);
