// Re-captures the live noon PDP into capture/ (rendered DOM + CSS list + reference screenshot).
// Uses system Chrome via Playwright. Then run `npm run extract`.
//   PLAYWRIGHT=/path/to/playwright/index.mjs node scripts/capture.mjs [url]
import fs from 'fs';
import path from 'path';
const pw = process.env.PLAYWRIGHT || '/Users/sighosh/Desktop/noon-plp-midroll/node_modules/playwright/index.mjs';
const { chromium } = await import(pw);
const root = path.resolve(import.meta.dirname, '..');
const out = path.join(root, 'capture');
fs.mkdirSync(out, { recursive: true });
const url = process.argv[2] || 'https://www.noon.com/uae-en/iphone-17-pro-max-256-gb-silver-5g-e-sim-only-middle-east-version/N70211544V/p/?o=ae59905acac1d0de';

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-blink-features=AutomationControlled'] });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'en-US',
  userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(6000);
for (let i = 0; i < 60; i++) {
  const done = await page.evaluate(() => { window.scrollBy(0, 400); return window.scrollY + innerHeight >= document.documentElement.scrollHeight - 5; });
  await page.waitForTimeout(450);
  if (done && i > 10) break;
}
await page.waitForTimeout(3000);
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(2500);

// canvas-based bits (Rive/Lottie) can't be snapshotted as DOM — grab them as images
fs.mkdirSync(path.join(root, 'public/noon'), { recursive: true });
const pill = page.locator('[data-qa=loyalty-header-button]');
if (await pill.count()) await pill.screenshot({ path: path.join(root, 'public/noon/noon-one-pill.png'), omitBackground: true });

await page.screenshot({ path: path.join(out, 'live-full.png'), fullPage: true, scale: 'css' });
const html = await page.evaluate(() => {
  const clone = document.documentElement.cloneNode(true);
  clone.querySelectorAll('script, noscript, link[rel=preload], link[rel=modulepreload], link[rel=prefetch], iframe').forEach((n) => n.remove());
  return '<!doctype html>\n' + clone.outerHTML;
});
fs.writeFileSync(path.join(out, 'page.html'), html);
const css = await page.evaluate(() => [...document.styleSheets].map((s) => s.href).filter(Boolean));
fs.writeFileSync(path.join(out, 'css.json'), JSON.stringify(css, null, 1));
console.log('captured', (html.length / 1024).toFixed(0) + 'KB html,', css.length, 'stylesheets');
await browser.close();
