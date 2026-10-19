// 굿즈 그림. assets-src/goods/*.jpg(드라이브 굿즈 폴더, 흰 바탕에 도안 두 개)에서 흰 바탕을 걷어 내고
// 도안을 하나씩 잘라 public/goods/에 투명 바탕 webp로 쓴다. 사용: node scripts/make-goods.mjs
// 바탕은 가장자리에서 이어진 거의 흰 화소만 지운다. 도안 안의 아이보리(카드, 뱃지의 바탕)는 남는다.
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const SRC = ['bookmark', 'pinbadge', 'stamp-sticker'];
mkdirSync('public/goods', { recursive: true });
const dims = {};
for (const name of SRC) {
  const { data, info } = await sharp(`assets-src/goods/${name}.jpg`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const white = (i) => data[i] > 246 && data[i + 1] > 246 && data[i + 2] > 246;
  // 가장자리에서 흰 바탕을 따라 채운다
  const seen = new Uint8Array(W * H); const stack = [];
  for (let x = 0; x < W; x++) stack.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) stack.push(y * W, y * W + W - 1);
  while (stack.length) {
    const p = stack.pop(); if (seen[p]) continue; const i = p * 4; if (!white(i)) continue;
    seen[p] = 1; data[i + 3] = 0; const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  // 가장자리 반 화소를 부드럽게: 지운 화소에 닿은 밝은 화소는 반쯤 투명하게
  for (let p = 0; p < W * H; p++) { if (seen[p]) continue; const x = p % W, y = (p / W) | 0; const nb = (x > 0 && seen[p - 1]) || (x < W - 1 && seen[p + 1]) || (y > 0 && seen[p - W]) || (y < H - 1 && seen[p + W]); if (nb) { const i = p * 4; const l = (data[i] + data[i + 1] + data[i + 2]) / 3; if (l > 225) data[i + 3] = 110; } }
  // 도안마다 자른다(가로로 나란한 두 개). 세로 열에 보이는 화소가 없는 틈으로 나눈다
  const colHas = new Uint8Array(W); for (let p = 0; p < W * H; p++) if (data[p * 4 + 3] > 0) colHas[p % W] = 1;
  const parts = []; let s = -1;
  for (let x = 0; x <= W; x++) { const on = x < W && colHas[x]; if (on && s < 0) s = x; if (!on && s >= 0) { if (x - s > 40) parts.push([s, x]); s = -1; } }
  const full = sharp(data, { raw: { width: W, height: H, channels: 4 } });
  const out = [];
  for (let k = 0; k < parts.length; k++) {
    const [x0, x1] = parts[k];
    const buf = await full.clone().extract({ left: x0, top: 0, width: x1 - x0, height: H }).png().toBuffer();
    const trimmed = await sharp(buf).trim({ threshold: 1 }).resize({ height: 520, withoutEnlargement: true }).webp({ quality: 82, alphaQuality: 90 }).toBuffer({ resolveWithObject: true });
    const file = `goods/${name}-${k + 1}.webp`; writeFileSync(`public/${file}`, trimmed.data);
    dims[file] = [trimmed.info.width, trimmed.info.height]; out.push(file);
  }
  console.log(name, out.join(' '));
}
// 표지처럼 바탕이 그림인 것은 자르지 않고 줄여서만 쓴다(프로그램북 표지, 10/7에 받음)
for (const name of ['programbook']) {
  const r = await sharp(`assets-src/goods/${name}.webp`).resize({ height: 520, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const file = `goods/${name}-1.webp`; writeFileSync(`public/${file}`, r.data); dims[file] = [r.info.width, r.info.height];
  console.log(name, file);
}
writeFileSync('src/content/goods-images.json', JSON.stringify(dims, null, 1) + '\n');
