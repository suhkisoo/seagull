# 갈매기 랜딩 페이지

서강연극회 118회 정기공연 〈갈매기〉 랜딩 페이지 저장소.

* 지시서: `docs/brief.md`. 모든 결정의 근거다.
* 계획서: `docs/plan.md`. 1단계에서 정한 색, 서체, 구도, 인터랙션, 수면 구현, 속도 예산, 남은 빈칸.
* 작업 규칙 요약: `CLAUDE.md`. 새 세션은 이것부터 읽는다.
* 원본 자료: `assets-src/` (포스터, 그림, 로고, 사진, 영상 썸네일, 음원)
* 스크린샷: `docs/shots/`

## 미리보기

작업 브랜치나 `main`에 올릴 때마다 GitHub Actions가 빌드해 GitHub Pages에 둔다. 주소는 `https://suhkisoo.github.io/seagull/`다. 저장소는 공개이고, Settings → Pages의 Source가 "GitHub Actions", Settings → Environments → github-pages의 Deployment branches가 "No restriction"이어야 작업 브랜치에서도 올라간다(둘 다 2단계에서 맞췄다). 공개본은 이 주소가 아니라 연출의 서버에 올린다.

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
* `npm run shots` 가 `docs/shots/`에 스크린샷을 찍는다(설치된 Chromium 사용). `npm run check:size` 가 첫 화면 JS 크기를 잰다. `npm run og` 가 포스터로 og 이미지를 다시 만든다.

## 예매(좌석 고르기)와 기획팀 관리

`/book/`에서 회차, 좌석, 굿즈를 고르고 계좌로 입금하면 `/admin/`에서 기획팀이 입금을 확인하거나 자리를 푼다. 장부는 구글 시트이고 그 앞에 Apps Script 웹 앱이 있다. 설치는 `backend/Code.gs` 맨 위의 여섯 줄을 따른다(기획팀 구글 계정, 10분). 나온 웹 앱 주소를 `src/content/show.ts`의 `booking.apiUrl`에 넣고 다시 빌드한다. 주소가 비어 있으면 예매 흐름은 미리보기(이 브라우저에만 저장)로 돌고, `?seat=15000&balcony=10000&goods=3000`처럼 가격을 넣어 볼 수 있다.

발코니는 자리 지정 없이 왼쪽과 오른쪽으로 나눠 받는다. 쪽마다 최대 인원은 `src/content/hall.ts`의 `balcony.sides`와 `backend/Code.gs`의 `BALCONY_MAX`에 같은 값으로 적는다. 장부에는 "발코니 왼쪽", "발코니 오른쪽" 두 칸이 있다. 예전 장부(발코니 한 칸)를 쓰던 시트라면 새 탭에서 다시 시작한다.

## 오시는 길 지도

지도는 OpenStreetMap 자료로 그린다. 자료는 GitHub Actions의 **map-data** 워크플로가 받아 `src/content/map.json`으로 커밋하고, 미리보기를 다시 올린다. 다시 받고 싶으면 Actions 탭에서 map-data를 고르고 Run workflow를 누른다. 공연장(메리홀)을 가운데 두고 사방 1.1km를 그린다. 지도 위 공연장 이름과 지도 앱에서 찾을 말은 `show.ts`의 `venue.mapLabel`, `venue.mapQuery`다.

* 가격은 `booking.seatPrice`, `booking.balconyPrice`(비면 지정석과 같다), `goods[].price`. 계좌는 `booking.account`. 입금 대기 시간은 `booking.holdHours`. 문의처는 `booking.contact`.
* 관리 암호는 `Code.gs`의 `ADMIN_TOKEN`이다. 기획팀만 알고 있으면 된다. `/admin/`은 검색에 걸리지 않게 `noindex`다.
* 시트에서 상태 칸을 직접 "취소"나 "입금확인"으로 바꿔도 사이트에 그대로 반영된다.

## 내용 고치는 법

전부 `src/content/show.ts` 한 파일이다. 고친 뒤 `npm run build`를 돌리면 빌드가 내용을 검사해 경고를 찍는다. 화면 코드에는 날짜나 이름이 없다.

* **회차별 출연진.** `shows[]`의 각 회차에 `cast: { arkadina: '박세은', treplev: '이영종', nina: '김시연', trigorin: '조민석' }`처럼 배역 id에 배우 이름 하나를 적는다. 배역 id는 `roles[]`의 `id`다. 비어 있는 배역은 "추후 공개"로 보인다. 한 배우만 맡는 배역(소린, 마샤, 도른)도 적어야 이름이 보인다. A, B 같은 조 표기는 쓰지 않는다.
* **극 안의 날짜.** `texts.stageTimes`의 넷(1막~4막). 구간 사이 어두운 곳에 하나씩 나온다. 비우면 그 자리는 숨는다. 4막 날짜 아래의 지문은 `texts.act4Direction`이다.
* **수면의 대사.** `texts.waterLines`. 멈추면 한 줄씩 떠오른다. `act: 'act4'`를 붙인 줄은 일정과 예매 구간에서만 뜬다.
* **소리.** 구간마다의 세기는 `src/scripts/sound.ts`의 `PROFILES`.
* **매진.** 그 회차의 `soldOut: true`. 칸에 "매진"이 적히고 그 회차를 고르면 예매 버튼이 "매진"으로 눌리지 않는다.
* **예매 오픈과 링크.** `booking.openAt`에 `'2026-10-12T14:00:00+09:00'`처럼 한국 시간 오프셋을 붙여 적고, `booking.commonUrl`에 예매처 링크, `booking.vendorName`에 예매처 이름을 적는다. 회차마다 링크가 다르면 `shows[]`의 `url`에 적는다(없는 회차는 공통 링크로 간다). 오픈 전에는 버튼이 "10월 12일 예매 오픈", 오픈 뒤에는 "예매하기"가 된다. 둘 중 하나라도 비면 "예매 일정 보기"다.
* **러닝타임, 관람 연령, 가격.** `runningMinutes`(인터미션 포함 분), `intermission`, `ageLimit`, `pricing`. 비어 있으면 숨기거나 "추후 공개"다. 러닝타임이 비는 동안 공연 끝은 마지막 회차 3시간 뒤로 본다.
* **텀블벅.** `tumblbug`의 `url`, `startAt`, `endAt`(마감일 당일 24:00까지). 기간 안에서만 보인다.
* **사진과 대사.** `roles[]`의 `photo`에 `public/` 아래 경로(예: `people/nina-kim.jpg`, 3:4), `line`에 대사 한 줄. 창을 열면 보인다.
* **영상.** `video.youtubeId`에 유튜브 영상 id, `video.poster`에 `public/` 아래 썸네일 경로, `video.aspect`에 비율(`'16/9'`). id가 비면 영상 블록이 통째로 숨는다.
* **연출의 말, 수면 대사.** `texts.directorsNote`(문단은 빈 줄로), `texts.waterLines`(멈추면 떠오르는 대사 목록. 받은 그대로 적는다).
* **링크.** `links.instagram`, `links.contact`(이메일이면 "문의하기" 링크), `venue.naverMap`, `venue.kakaoMap`(비면 검색 링크).
* **og 이미지.** `assets-src/`의 포스터를 바꾼 뒤 `npm run og -- assets-src/새포스터.jpg public/og-2026-11.jpg`처럼 새 파일 이름으로 만들고 `meta.ogImage`를 그 이름으로 바꾼다. 카카오톡이 예전 이미지를 오래 기억하므로 이름을 꼭 바꾼다.
* **사이트 주소.** `meta.siteUrl`에 도메인(`https://예시.kr`). 비어 있으면 `og:url`, `og:image`, 구조화 데이터의 절대 주소가 빠진다.
