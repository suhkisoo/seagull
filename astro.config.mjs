import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { show } from './src/content/show.ts';
import { hall } from './src/content/hall.ts';

// 예매 장부(backend/Code.gs)는 금액을 다시 센다. 그 값이 show.ts, hall.ts와 다르면 빌드를 멈춘다
const expected = {
  seatPrice: show.booking.seatPrice, balconyPrice: show.booking.balconyPrice,
  packages: Object.fromEntries(show.booking.packages.map((p) => [p.id, p.price])),
  goods: Object.fromEntries(show.goods.filter((g) => g.price != null).map((g) => [g.id, g.price])),
  balconyMax: Object.fromEntries(hall.balcony.sides.map((s) => [s.id, s.max])),
  rows: Object.fromEntries(hall.rows.map((r) => [r.row, Math.max(...r.seats)])),
  shows: show.shows.map((s) => s.id),
};
const gs = /\/\*config\*\/(.*?)\/\*end\*\//s.exec(readFileSync(new URL('./backend/Code.gs', import.meta.url), 'utf8'));
if (!gs || JSON.stringify(JSON.parse(gs[1])) !== JSON.stringify(expected)) {
  throw new Error(`backend/Code.gs의 CONFIG가 show.ts, hall.ts와 다르다. 이 값으로 바꾸고 Apps Script도 새 버전으로 배포한다:\n${JSON.stringify(expected)}`);
}

// 사이트 주소는 내용 파일의 siteUrl 한 곳에서 나온다. 미리보기(GitHub Pages)는 환경 변수로 덮어쓴다.
// 인증서가 나오기 전에는 GitHub가 주소를 http로 넘긴다. 공유 그림과 대표 주소는 언제나 https로 적는다
const site = (process.env.SITE_URL || show.meta.siteUrl || '').replace(/^http:\/\//, 'https://') || undefined;
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  output: 'static',
  site,
  base,
  trailingSlash: 'ignore',
  compressHTML: true,
  build: { inlineStylesheets: 'auto', format: 'directory' },
  devToolbar: { enabled: false },
});
