// 스크린샷. docs/plan.md 4.8, 5.6. 설치된 Chromium을 쓴다(playwright install 금지).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PORT = 4173, BASE = process.env.BASE_PATH || '/';
const out = process.argv[2] || 'docs/shots';
mkdirSync(out, { recursive: true });
const server = spawn('npx', ['serve', 'dist', '-l', String(PORT), '-n'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const url = (p, qs = '') => `http://127.0.0.1:${PORT}${BASE}${p}${qs}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
const sizes = { m390: { width: 390, height: 844, mobile: true, full: true }, m360: { width: 360, height: 800, mobile: true }, t768: { width: 768, height: 1024, mobile: true }, d1440: { width: 1440, height: 900, mobile: false, full: true } };
const only = process.env.SIZES ? process.env.SIZES.split(',') : Object.keys(sizes);
for (const variant of ['a', 'b']) {
  for (const key of only) {
    const s = sizes[key];
    const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
    const page = await ctx.newPage();
    const tag = (n) => `${out}/${variant}-${key}-${n}.jpg`;
    await page.goto(url(`lab/${variant}/`, '?quality=3&debug=1'), { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await page.screenshot({ type: 'jpeg', quality: 82, path: tag('1-first') });
    const w = await page.evaluate(() => (window.__water ? { tier: window.__water.tier, base: window.__water.base } : null));
    const x = s.width * 0.55, y = s.height * 0.8;
    if (!s.full) { await page.mouse.wheel(0, s.height * 1.5); await page.waitForTimeout(3000); await page.screenshot({ type: 'jpeg', quality: 82, path: tag('6-scrolled') }); console.log(variant, key, 'short'); await ctx.close(); continue; }
    if (s.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(250); await page.screenshot({ type: 'jpeg', quality: 82, path: tag('2-touch-0.2s') });
    await page.waitForTimeout(600); await page.screenshot({ type: 'jpeg', quality: 82, path: tag('3-touch-0.8s') });
    await page.waitForTimeout(4200); await page.screenshot({ type: 'jpeg', quality: 82, path: tag('4-calm') });
    await page.mouse.wheel(0, s.height * 0.3); await page.waitForTimeout(700); await page.screenshot({ type: 'jpeg', quality: 82, path: tag('5-scroll-half') });
    await page.mouse.wheel(0, s.height * 1.2); await page.waitForTimeout(3500); await page.screenshot({ type: 'jpeg', quality: 82, path: tag('6-scrolled') });
    console.log(variant, key, JSON.stringify(w), await page.evaluate(() => document.querySelector('.water')?.dataset.water));
    await ctx.close();
  }
}
// 대체 경로. 움직임 줄임, 자바스크립트 없음, 그림 반영 텍스처 안
for (const variant of ['a', 'b']) {
  let ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
  let page = await ctx.newPage(); await page.goto(url(`lab/${variant}/`)); await page.waitForTimeout(1500); await page.touchscreen.tap(200, 700); await page.waitForTimeout(300);
  await page.screenshot({ type: 'jpeg', quality: 82, path: `${out}/${variant}-m390-7-reduced-motion.jpg` }); await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, javaScriptEnabled: false });
  page = await ctx.newPage(); await page.goto(url(`lab/${variant}/`)); await page.waitForTimeout(800);
  await page.screenshot({ type: 'jpeg', quality: 82, path: `${out}/${variant}-m390-8-no-js.jpg` }); await ctx.close();
  ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page = await ctx.newPage(); await page.goto(url(`lab/${variant}/`, '?quality=3&reflection=0.8')); await page.waitForTimeout(4500);
  await page.screenshot({ type: 'jpeg', quality: 82, path: `${out}/${variant}-m390-9-reflection-texture.jpg` }); await ctx.close();
}
const nogl = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-webgl'] });
for (const variant of ['a', 'b']) {
  const ctx = await nogl.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); await page.goto(url(`lab/${variant}/`)); await page.waitForTimeout(1500); await page.touchscreen.tap(200, 700); await page.waitForTimeout(300);
  await page.screenshot({ type: 'jpeg', quality: 82, path: `${out}/${variant}-m390-10-no-webgl.jpg` }); await ctx.close();
}
await nogl.close();
await browser.close(); server.kill();
