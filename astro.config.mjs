import { defineConfig } from 'astro/config';
import { show } from './src/content/show.ts';

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
