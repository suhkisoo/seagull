// 스크린샷. docs/brief.md 9장 4단계, docs/plan.md 5.5. 설치된 Chromium을 쓴다(playwright install 금지).
// 사용: npm run shots [출력 폴더]. SIZES=m390,d1440 으로 화면을 고를 수 있다.
import { chromium } from 'playwright';
import { mkdirSync, rmSync } from 'node:fs';
import { spawn } from 'node:child_process';

const PORT = 4173, BASE = process.env.BASE_PATH || '/';
const out = process.argv[2] || 'docs/shots';
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
const server = spawn('npx', ['serve', 'dist', '-l', String(PORT), '-n'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));
const url = (qs = '') => `http://127.0.0.1:${PORT}${BASE}${qs}`;
const exe = process.env.CHROME_PATH || '/opt/pw-browsers/chromium';
const browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
const sizes = { m390: { width: 390, height: 844, mobile: true, full: true }, m360: { width: 360, height: 800, mobile: true }, t768: { width: 768, height: 1024, mobile: true }, d1440: { width: 1440, height: 900, mobile: false, full: true } };
const only = process.env.SIZES ? process.env.SIZES.split(',') : Object.keys(sizes);
const sections = ['about', 'people', 'two-years', 'tickets', 'directions', 'credits'];
const shot = (page, path) => page.screenshot({ type: 'jpeg', quality: 82, path });
const goTo = async (page, id) => { await page.evaluate((id) => { document.getElementById(id).scrollIntoView({ block: 'start' }); window.scrollBy(0, -48); }, id); await page.waitForTimeout(900); };

for (const key of only) {
  const s = sizes[key];
  const ctx = await browser.newContext({ viewport: { width: s.width, height: s.height }, deviceScaleFactor: 1, isMobile: s.mobile, hasTouch: s.mobile });
  const page = await ctx.newPage();
  const tag = (n) => `${out}/${key}-${n}.jpg`;
  await page.goto(url('?quality=3'), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  await shot(page, tag('01-first'));
  const w = await page.evaluate(() => (window.__water ? { tier: window.__water.tier, base: window.__water.base, water: document.querySelector('.water')?.dataset.water } : null));
  if (s.full) {
    // 움직임은 한 장으로 판단하지 않는다. 닿은 뒤 0.2초, 0.8초, 2초, 잔잔해진 뒤
    const x = s.width * 0.55, y = s.height * 0.8;
    if (s.mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(250); await shot(page, tag('02-touch-0.2s'));
    await page.waitForTimeout(600); await shot(page, tag('03-touch-0.8s'));
    await page.waitForTimeout(1200); await shot(page, tag('04-touch-2s'));
    await page.waitForTimeout(3000); await shot(page, tag('05-calm'));
    await page.mouse.wheel(0, s.height * 0.3); await page.waitForTimeout(700); await shot(page, tag('06-curtain-half'));
    await page.mouse.wheel(0, s.height * 0.6); await page.waitForTimeout(3500); await shot(page, tag('07-curtain-up'));
  }
  for (const [i, id] of sections.entries()) { await goTo(page, id); await shot(page, tag(`${String(i + 10)}-${id}`)); }
  // 회차 고르기, 창 열기
  await goTo(page, 'tickets'); await page.click('[data-cell="1113-1930"]'); await page.waitForTimeout(700); await shot(page, tag('20-tickets-picked'));
  await goTo(page, 'people'); await page.click('.window__summary'); await page.waitForTimeout(600); await shot(page, tag('21-people-open'));
  await goTo(page, 'directions'); await page.click('[data-copy-address]'); await page.waitForTimeout(400); await shot(page, tag('22-copied'));
  console.log(key, JSON.stringify(w));
  await ctx.close();
}
// 날짜별 상태. ?now= 로 시각을 지정한다
const states = [['open-before', '2026-10-05T12:00:00+09:00'], ['show-day', '2026-11-13T19:31:00+09:00'], ['ended', '2026-11-15T00:00:00+09:00']];
for (const [name, now] of states) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage(); await page.goto(url(`?quality=3&now=${encodeURIComponent(now)}`)); await page.waitForTimeout(1200);
  await goTo(page, 'tickets'); await shot(page, `${out}/m390-30-state-${name}.jpg`);
  console.log(name, await page.evaluate(() => document.querySelector('[data-ticket-button]')?.textContent));
  await ctx.close();
}
// 예매 흐름(미리보기 가격)과 관리 화면
{
  const U = url('book/?show=1113-1930&seat=15000&balcony=10000&goods=3000');
  const click = (p, sel) => p.click(sel, { force: true, timeout: 5000 });
  for (const [key, vp, mobile] of [['m390', { width: 390, height: 844 }, true], ['d1440', { width: 1440, height: 900 }, false]]) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
    const page = await ctx.newPage(); await page.goto(U); await page.waitForTimeout(700); await shot(page, `${out}/${key}-50-book-show.jpg`);
    await click(page, '[data-step-next]'); await page.waitForTimeout(700); await click(page, '[data-seat="D6"]'); await click(page, '[data-seat="D7"]'); await click(page, '[data-balcony-plus]'); await page.waitForTimeout(400); await shot(page, `${out}/${key}-51-book-seats.jpg`);
    await click(page, '[data-step-next]'); await page.waitForTimeout(700); await click(page, '[data-goods="pinbadge"] [data-qty-plus]'); await page.waitForTimeout(200); await shot(page, `${out}/${key}-52-book-goods.jpg`);
    await click(page, '[data-step-next]'); await page.waitForTimeout(600); await page.fill('#bk-name', '홍길동'); await page.fill('#bk-phone', '010-1234-5678'); await page.waitForTimeout(200);
    await click(page, '[data-step-next]'); await page.waitForTimeout(700); await shot(page, `${out}/${key}-53-book-confirm.jpg`);
    await click(page, '[data-step-next]'); await page.waitForTimeout(900); await shot(page, `${out}/${key}-54-book-done.jpg`);
    await page.goto(url('admin/')); await page.waitForTimeout(500); await page.fill('#ad-token', 'x'); await click(page, '[data-login] button'); await page.waitForTimeout(600); await shot(page, `${out}/${key}-55-admin.jpg`);
    await ctx.close();
  }
}
// 대체 경로. 움직임 줄임, 자바스크립트 없음, WebGL 없음
let ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
let page = await ctx.newPage(); await page.goto(url()); await page.waitForTimeout(1500); await page.touchscreen.tap(200, 700); await page.waitForTimeout(300);
await shot(page, `${out}/m390-40-reduced-motion.jpg`); await goTo(page, 'tickets'); await shot(page, `${out}/m390-41-reduced-motion-tickets.jpg`); await ctx.close();
ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, javaScriptEnabled: false });
page = await ctx.newPage(); await page.goto(url()); await page.waitForTimeout(800);
await shot(page, `${out}/m390-42-no-js.jpg`); await page.evaluate(() => document.getElementById('tickets').scrollIntoView()); await page.waitForTimeout(300); await shot(page, `${out}/m390-43-no-js-tickets.jpg`); await ctx.close();
const nogl = await chromium.launch({ executablePath: exe, args: ['--no-sandbox', '--disable-webgl'] });
ctx = await nogl.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
page = await ctx.newPage(); await page.goto(url()); await page.waitForTimeout(1500); await page.touchscreen.tap(200, 700); await page.waitForTimeout(300);
await shot(page, `${out}/m390-44-no-webgl.jpg`); await ctx.close(); await nogl.close();
await browser.close(); server.kill();
