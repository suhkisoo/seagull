// og 이미지. 포스터를 1200×630 가운데에 놓는다. 바꿀 때는 show.meta.ogImage의 파일 이름도 바꾼다(카카오톡 캐시).
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const src = process.argv[2] || 'assets-src/갈매기_인스타용포스터_1080.jpg';
const out = process.argv[3] || 'public/og-2026-10.jpg';
mkdirSync('public', { recursive: true });
const W = 1200, H = 630;
const poster = await sharp(src).resize({ height: H, withoutEnlargement: false }).toBuffer();
const meta = await sharp(poster).metadata();
// 양옆은 포스터를 크게 흐린 것으로 채운다. 새 그림을 그리지 않는다
const bg = await sharp(src).resize(W, H, { fit: 'cover' }).blur(40).modulate({ brightness: 0.55 }).toBuffer();
await sharp(bg).composite([{ input: poster, left: Math.round((W - (meta.width ?? 0)) / 2), top: 0 }]).jpeg({ quality: 84, mozjpeg: true }).toFile(out);
console.log('og', out, W, H);
