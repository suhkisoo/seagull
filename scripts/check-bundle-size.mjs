// 빌드 산출물의 전송 크기. docs/plan.md 5.5. 첫 화면 JS의 gzip 합이 150KB를 넘으면 실패, 22KB를 넘으면 경고.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
const root = process.argv[2] ?? 'dist';
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const rows = walk(root).filter((p) => ['.js', '.css', '.html', '.woff2', '.avif', '.webp'].includes(extname(p)))
  .map((p) => { const b = readFileSync(p); return { file: relative(root, p), raw: b.length, gzip: gzipSync(b, { level: 9 }).length }; }).sort((a, b) => b.gzip - a.gzip);
for (const r of rows) console.log(`${String(r.gzip).padStart(7)}  ${String(r.raw).padStart(7)}  ${r.file}`);
const hero = rows.filter((r) => /(entry|index\.astro|water|scroll|curtain|state)[^/]*\.js$/.test(r.file));
const sum = hero.reduce((s, r) => s + r.gzip, 0);
console.log(`첫 화면 JS gzip 합계 ${(sum / 1024).toFixed(1)}KB / 150KB (${hero.map((r) => r.file).join(', ')})`);
if (sum > 22 * 1024) console.warn('경고: 자체 예산 22KB를 넘었다');
if (sum > 150 * 1024) { console.error('FAIL: 첫 화면 JS가 150KB를 넘었다'); process.exit(1); }
