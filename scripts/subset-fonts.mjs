// 빌드 때 내용 파일의 글자만 담은 폰트 서브셋을 만든다. docs/plan.md 5.1.
// 원본은 npm 패키지 안의 전체 한글 파일이다. 산출물은 public/fonts/ (커밋하지 않는다).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import subsetFont from 'subset-font';

const require = createRequire(import.meta.url);
const { show } = await import('../src/content/show.ts').catch(async () => {
  // astro 밖에서 .ts를 읽을 수 없으면 글자를 정규식으로 긁는다
  const src = readFileSync(new URL('../src/content/show.ts', import.meta.url), 'utf8');
  return { show: null, src };
});

const srcText = readFileSync(new URL('../src/content/show.ts', import.meta.url), 'utf8');
// 내용 파일의 문자열 리터럴 안 글자를 모두 모은다 (주석은 뺀다)
const literals = [...srcText.replace(/\/\/.*$/gm, '').matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]).join('');
const uiText = '예매 회차 좌석 굿즈 예매자 확인 다음 신청 지정석 발코니 왼쪽 오른쪽 명까지 남음 남은 자리 없음 빈자리 고른 자리 예매된 자리 무대 입구는 객석 뒤 준비 중 이름 연락처 입금자명 입금 계좌 합계 금액 번호 공연 페이지로 돌아가기 지금은 미리보기입니다 브라우저에만 남고 실제로 예매되지 않습니다 고르고 계좌로 입금하면 기획팀이 확인한 뒤 완료됩니다 전에는 잡혀 있습니다 누르면 불이 켜집니다 당일 로비에서 받습니다 따로 살 수는 없습니다 다르면 적어 주세요 안내에만 쓰고 끝나면 지웁니다 안에 해 주세요 알립니다 시간이 지나면 풀립니다 받았습니다 복사 찾기 어렵습니다 관리 암호 열기 전체 상태 대기 취소 새로 고침 기한 지난 자리 풀기 되돌리려면 대로 처리 되살리기 목록 받지 못했습니다 열지 못했습니다 암호를 보내는 보내지 잠시 뒤 다시 눌러 방금 되었습니다 골라 모자랍니다 인원을 줄여 줄이기 늘리기 정해 종에서 고른다 프로그램북 핀배지 책갈피 티켓 포스터 우표 스티커 배우 추후 공개 가격 공개 뒤 안내 미정 건 길게 눌러 복사하세요 링크 복사됨 홍보영상 영상을 누르면 재생됩니다 가격과 좌석 예매 오픈 ›예매하기 예매 일정 보기 예매 마감 매진 종료 공연이 끝났습니다 월일 오픈 추후 공개 영상 네이버 지도 열기 카카오맵 주소 복사 복사됨 공유 캘린더에 넣기 구글 캘린더 파일 받기 텀블벅 러닝타임 인터미션 관람 연령 티켓 가격 좌석 작품 소개 나오는 사람들 공연 일정과 예매 오시는 길 만든 사람들 인스타그램 문의 소리 켜기 끄기 기울기 분 시간 회차 출연 〔 〕 자리 연출의 말 0123456789:.·~()〈〉, …';
const heroChars = new Set((show ? [show.title, show.originalTitle, show.company, show.credits.author, show.credits.directing, show.periodShort, show.period, show.venue.name].join('') : '') + uiText);
// 지도의 역 이름(src/content/map.json, OpenStreetMap 자료)
let mapText = '';
try { const m = JSON.parse(readFileSync(new URL('../src/content/map.json', import.meta.url), 'utf8')); mapText = (m.stations || []).map((x) => x.name).join('') + '지도 자료 © OpenStreetMap 기여자 둘레 가까운 역은 길찾기 200m'; } catch { /* 지도 자료가 아직 없다 */ }
const allChars = new Set(literals + uiText + mapText);
const titleChars = '갈매기';

const files = {
  400: require.resolve('@fontsource/noto-serif-kr/files/noto-serif-kr-korean-400-normal.woff2'),
  700: require.resolve('@fontsource/noto-serif-kr/files/noto-serif-kr-korean-700-normal.woff2'),
};
const outDir = new URL('../public/fonts/', import.meta.url);
mkdirSync(outDir, { recursive: true });

const ranges = (chars) => {
  const cps = [...new Set([...chars].map((c) => c.codePointAt(0)))].sort((a, b) => a - b);
  const out = [];
  for (let i = 0; i < cps.length; i++) {
    let j = i;
    while (j + 1 < cps.length && cps[j + 1] === cps[j] + 1) j++;
    out.push(i === j ? `U+${cps[i].toString(16).toUpperCase()}` : `U+${cps[i].toString(16).toUpperCase()}-${cps[j].toString(16).toUpperCase()}`);
    i = j;
  }
  return out.join(',');
};

const made = {};
for (const [weight, file] of Object.entries(files)) {
  const buf = readFileSync(file);
  const jobs = weight === '700'
    ? [['title', titleChars], ['hero', [...heroChars].join('')], ['rest', [...allChars].join('')]]
    : [['hero', [...heroChars].join('')], ['rest', [...allChars].join('')]];
  for (const [name, text] of jobs) {
    const t0 = performance.now();
    const out = await subsetFont(buf, text, { targetFormat: 'woff2' });
    const outName = `seagull-${name}-${weight}.woff2`;
    writeFileSync(new URL(outName, outDir), out);
    made[outName] = { bytes: out.length, ms: Math.round(performance.now() - t0), range: ranges(text), chars: new Set(text).size };
  }
}
// 제목 서브셋은 data URI로 인라인하므로 base64도 남긴다
const titleB64 = readFileSync(new URL('seagull-title-700.woff2', outDir)).toString('base64');
writeFileSync(new URL('manifest.json', outDir), JSON.stringify({ made, titleB64, titleRange: ranges(titleChars) }, null, 2));
for (const [k, v] of Object.entries(made)) console.log(`${k}: ${v.bytes}B, ${v.chars}자, ${v.ms}ms`);
