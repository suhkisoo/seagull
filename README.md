# 갈매기 랜딩 페이지

서강연극회 118회 정기공연 〈갈매기〉 랜딩 페이지 저장소.

* 지시서: `docs/brief.md`. 모든 결정의 근거다.
* 계획서: `docs/plan.md`. 1단계에서 정한 색, 서체, 구도, 인터랙션, 수면 구현, 속도 예산, 남은 빈칸.
* 작업 규칙 요약: `CLAUDE.md`. 새 세션은 이것부터 읽는다.
* 원본 자료: `assets-src/` (포스터, 그림, 로고, 사진, 영상 썸네일, 음원)
* 스크린샷: `docs/shots/`

## 미리보기

작업 브랜치나 `main`에 올릴 때마다 GitHub Actions가 빌드해 GitHub Pages에 둔다. 주소는 `https://suhkisoo.github.io/seagull/`이고 실험실은 `/seagull/lab/a/`, `/seagull/lab/b/`다. 처음 한 번은 저장소 Settings → Pages에서 Source를 "GitHub Actions"로 바꿔야 한다. 워크플로가 스스로 켜려 하지만 권한이 없어 실패한다. 바꾼 뒤 Actions 탭에서 실패한 preview 실행을 "Re-run all jobs"로 다시 돌리면 주소가 열린다. 공개본은 이 주소가 아니라 연출의 서버에 올린다.

## 빌드

* 노드 22.19 이상(`.nvmrc`, `.node-version`).
* `npm ci` 뒤 `npm run build`. 출력 폴더는 `dist/`. 빌드 전에 `scripts/subset-fonts.mjs`가 내용 파일의 글자만 담은 폰트 서브셋을 `public/fonts/`에 만든다(커밋하지 않는다).
* 서버에 올릴 때는 `dist/`를 통째로 올린다. 도메인 루트가 아니면 `BASE_PATH=/하위경로/ npm run build`. 사이트 주소는 `src/content/show.ts`의 `meta.siteUrl`이고 `SITE_URL` 환경 변수로 덮어쓸 수 있다.
* 서버 조건은 `docs/plan.md` 9.4에 있다(HTTPS, MIME, 압축, 캐시).

## 검수용 주소 매개변수

* `?quality=0|1|2|3|still` 화질 단계 고정. `?water=off` 수면 끄기.
* `?t=800` 수면의 시각 고정(ms). `?ripples=0.5,0.5,0,6` 물결 심기(x, y 비율, t0ms, 진폭). `?calm=1`, `?wind=0.6`.
* `?now=2026-11-13T19:31:00+09:00` 날짜별 상태.
* `?debug=1` 띠 구석에 단계, 프레임 간격, 렌더러 글자 표시.
* `?reflection=1` 그림의 반영을 첫 화면 수면의 바탕으로 쓰는 안(P15).
* `npm run shots` 가 `docs/shots/`에 스크린샷을 찍는다(설치된 Chromium 사용).

## 내용 고치는 법

전부 `src/content/show.ts` 한 파일이다. 회차별 출연진, 매진, 예매 링크, 사진과 영상, og 이미지 항목은 3단계에서 적는다.
