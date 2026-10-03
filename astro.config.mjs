import { defineConfig } from 'astro/config';
import { show } from './src/content/show.ts';

// 사이트 주소는 내용 파일의 siteUrl 한 곳에서 나온다. 미리보기(GitHub Pages)는 환경 변수로 덮어쓴다.
const site = process.env.SITE_URL || show.meta.siteUrl || undefined;
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
