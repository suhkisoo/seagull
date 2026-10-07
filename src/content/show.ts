// 공연 정보 전부. 화면 코드에 날짜나 이름을 직접 적지 않는다. 이 파일만 고치면 페이지가 바뀐다.
// 비어 있는 값('' 또는 null)은 화면에서 숨기거나 "추후 공개"로 보인다. 지시서 2장의 표를 따른다.

export type ShowTime = {
  id: string;            // '1112-1500' 꼴. 캘린더 파일 이름과 고정 주소에 쓴다
  startAt: string;       // ISO, +09:00
  url: string;           // 회차별 예매 링크. 비면 공통 링크
  soldOut: boolean;      // 매진은 여기서 손으로 켠다
  cast: Record<string, string>; // 배역 id -> 배우 이름. 비면 "추후 공개"
};

export type Role = {
  id: string;
  name: string;          // 배역 이름
  scriptName: string;    // 대본의 이름 표기
  scriptNote: string;    // 대본의 인물 표기. 자리에서 뜻이 통하지 않으면 비운다
  actors: string[];      // 가나다순. 조 표기는 어디에도 쓰지 않는다
  photo: string;         // 비면 없음
  line: string;          // 대사 한 줄. 비면 없음
};

export const show = {
  title: '갈매기',
  originalTitle: 'ЧАЙКА',                       // 비면 숨김 【확인】
  company: '서강연극회 118회 정기공연',          // 포스터 표기 【확인】
  credits: {
    author: '안톤 체호프 作',                     // 포스터 표기 【확인】
    directing: '연출·각색·번역 서기수',
  },
  genreNote: '4막 희극 · 러시아어 원문 직역 · 7인 각색', // 비면 숨김 【확인】
  period: '2026년 11월 12일(목)~14일(토), 하루 2회, 모두 6회',
  periodShort: '2026년 11월 12일(목)~14일(토)',      // 첫 화면 390px에서만 쓰는 줄임
  venue: {
    name: '서강대학교 메리홀 소극장',
    address: '서울특별시 마포구 백범로 35',
    mapLabel: '메리홀',                            // 지도 위 공연장 이름
    mapQuery: '서강대학교 메리홀',                  // 지도 앱에서 찾을 말
    naverMap: '',                                 // 비면 mapQuery로 찾는 링크를 만든다
    kakaoMap: '',                                 // 비면 지도 자료의 좌표로 만든다
  },
  shows: [
    { id: '1112-1500', startAt: '2026-11-12T15:00:00+09:00', url: '', soldOut: false, cast: {} },
    { id: '1112-1930', startAt: '2026-11-12T19:30:00+09:00', url: '', soldOut: false, cast: {} },
    { id: '1113-1500', startAt: '2026-11-13T15:00:00+09:00', url: '', soldOut: false, cast: {} },
    { id: '1113-1930', startAt: '2026-11-13T19:30:00+09:00', url: '', soldOut: false, cast: {} },
    { id: '1114-1300', startAt: '2026-11-14T13:00:00+09:00', url: '', soldOut: false, cast: {} },
    { id: '1114-1800', startAt: '2026-11-14T18:00:00+09:00', url: '', soldOut: false, cast: {} },
  ] as ShowTime[],
  runningMinutes: null as number | null,          // 인터미션 포함 총 시간. 비면 180분으로 본다 【확인】
  intermission: '',                               // 비면 숨김
  ageLimit: '',                                   // 비면 숨김
  pricing: '티켓 9,000원, 책갈피 증정. 굿즈를 묶은 구성은 11,000원부터 30,000원까지', // 비면 "추후 공개". 연출이 10/7에 준 가격에서
  booking: {
    openAt: '',                                   // 예매 오픈 시각 ISO. 비면 "예매 일정 보기"
    commonUrl: '',                                // 외부 예매처 링크. 비면 이 페이지의 예매 흐름(/book/)을 쓴다
    vendorName: '',                               // 예매처 이름
    // 이 페이지의 예매 흐름(연출의 지시로 3단계 뒤에 추가). 좌석을 고르고 계좌로 입금하면 기획팀이 확인한다
    apiUrl: '',                                   // Apps Script 웹 앱 주소 【빈칸】. 비면 예매 흐름은 미리보기(저장되지 않음)
    seatPrice: 9000 as number | null,             // 티켓 한 장(책갈피 증정). 연출이 10/7에 준 가격
    balconyPrice: 9000 as number | null,          // 발코니도 같은 값으로 둔다 【확인】
    // 티켓 구성. 티켓 한 장마다 하나를 고른다. 모든 구성에 티켓 책갈피가 함께 나간다. 연출이 10/7에 준 가격
    packages: [
      // items: 구성에 든 굿즈(goods의 id). 그림으로 묶음을 보여 준다
      { id: 'ticket', name: '티켓', note: '책갈피 증정', price: 9000, items: [] as string[] },
      { id: 'stamp', name: '티켓 + 우표 스티커', note: '우표 스티커 두 장 한 묶음', price: 11000, items: ['stamp-sticker'] },
      { id: 'pin', name: '티켓 + 핀배지', note: '', price: 13000, items: ['pinbadge'] },
      { id: 'book', name: '티켓 + 프로그램북', note: '', price: 20000, items: ['programbook'] },
      { id: 'book-stamp', name: '티켓 + 프로그램북 + 우표 스티커', note: '', price: 21000, items: ['programbook', 'stamp-sticker'] },
      { id: 'book-pin', name: '티켓 + 프로그램북 + 핀배지', note: '', price: 22000, items: ['programbook', 'pinbadge'] },
      { id: 'all', name: '티켓 + 굿즈 전체', note: '프로그램북, 핀배지, 우표 스티커', price: 30000, items: ['programbook', 'pinbadge', 'stamp-sticker'] },
    ],
    account: { bank: '', number: '', holder: '' }, // 입금 계좌 【빈칸】
    holdHours: 24,                                // 입금 대기 시간. 지나면 기획팀이 관리 화면에서 자리를 풀 수 있다
    contact: '',                                  // 예매 문의(카카오톡 채널, 전화 등) 【빈칸】
  },
  // 굿즈. 9/17 인스타 일정표와 9/21 기획 스탭회의 기준 【확인】. 가격과 재고는 【빈칸】. price가 비면 "추후 공개"로 보이고 고를 수 없다
  // 따로 더 사는 굿즈. 티켓과 함께만 예매한다. 연출이 10/7에 준 가격. 그림은 드라이브 굿즈 폴더(10/5)
  goods: [
    { id: 'programbook', name: '프로그램북', price: 15000 as number | null, stock: null as number | null, note: '', images: ['goods/programbook-1.webp'] as string[] },
    { id: 'pinbadge', name: '핀배지', price: 4000 as number | null, stock: null as number | null, note: '', images: ['goods/pinbadge-1.webp', 'goods/pinbadge-2.webp'] },
    { id: 'stamp-sticker', name: '우표 스티커', price: 3000 as number | null, stock: null as number | null, note: '두 장 한 묶음', images: ['goods/stamp-sticker-1.webp', 'goods/stamp-sticker-2.webp'] },
  ],
  bookmarkImages: ['goods/bookmark-1.webp', 'goods/bookmark-2.webp'], // 티켓 책갈피(증정) 그림. scripts/make-goods.mjs
  tumblbug: { url: '', startAt: '', endAt: '' },  // 기간 안에서만 보인다
  roles: [
    { id: 'arkadina', name: '아르카지나', scriptName: '이리나 니콜라예브나 아르카지나 (남편 성으로는 트레플레바)', scriptNote: '배우', actors: ['박세은', '서채림'], photo: '', line: '' },
    { id: 'treplev', name: '트레플레프', scriptName: '콘스탄틴 가브릴로비치 트레플레프', scriptNote: '그녀의 아들, 청년', actors: ['백경환', '이영종'], photo: '', line: '' },
    { id: 'sorin', name: '소린', scriptName: '표트르 니콜라예비치 소린', scriptNote: '그녀의 오빠', actors: ['부신빈'], photo: '', line: '' },
    { id: 'nina', name: '니나', scriptName: '니나 미하일로브나 자레치나야', scriptNote: '젊은 처녀, 부유한 지주의 딸', actors: ['김시연', '김현아'], photo: '', line: '' },
    { id: 'masha', name: '마샤', scriptName: '마샤', scriptNote: '영지 관리인의 딸', actors: ['이예림'], photo: '', line: '' },
    { id: 'trigorin', name: '트리고린', scriptName: '보리스 알렉세예비치 트리고린', scriptNote: '소설가', actors: ['오규헌', '조민석'], photo: '', line: '' },
    { id: 'dorn', name: '도른', scriptName: '예브게니야 세르게예브나 도른', scriptNote: '의사', actors: ['전아침'], photo: '', line: '' },
  ] as Role[],
  // 만든 사람들. 포스터의 명단과 직함을 따른다 【확인】. 각 팀의 첫 이름이 그 팀을 맡은 사람이다.
  crew: [
    { team: '기획', members: [{ name: '고은채', title: '기획' }, { name: '김선준', title: '조기획' }, { name: '김정효', title: '기획팀원' }, { name: '이윤아', title: '기획팀원' }] },
    { team: '연출', members: [{ name: '서기수', title: '연출·각색·번역' }, { name: '류서원', title: '조연출' }, { name: '신정인', title: '조연출' }] },
    { team: '디자인', members: [{ name: '고은서', title: '디자인' }, { name: '고명진', title: '디자인' }] },
    { team: '무대', members: [{ name: '박지현', title: '무대감독' }, { name: '성예건', title: '무대팀원' }, { name: '오채은', title: '무대팀원' }, { name: '정성엽', title: '무대팀원' }] },
    { team: '음향', members: [{ name: '배준규', title: '음향감독' }, { name: '김시은', title: '음향팀원' }, { name: '전효린', title: '음향팀원' }] },
    { team: '조명', members: [{ name: '유해산', title: '조명감독' }, { name: '엄정현', title: '조명팀원' }, { name: '이상미', title: '조명팀원' }] },
    { team: '의상소품', members: [{ name: '김수빈', title: '의상소품감독' }, { name: '김보경', title: '의상소품팀원' }, { name: '김아영', title: '의상소품팀원' }, { name: '윤동현', title: '의상소품팀원' }] },
    { team: '영상', members: [{ name: '정유진', title: '영상팀원' }, { name: '정재형', title: '영상팀원' }, { name: '홍준영', title: '영상팀원' }, { name: '유민우', title: '영상팀원' }, { name: '정성엽', title: '영상팀원' }, { name: '김준범', title: '영상팀원' }, { name: '유태리', title: '영상팀원' }] },
  ],
  texts: {
    synopsis: [
      '호숫가 영지의 여름 저녁, 트레플레프가 정원에 세운 무대에서 자기 희곡을 올린다. 배우는 니나 한 사람. 객석에는 배우인 어머니와 어머니의 연인인 소설가가 앉아 있다. 공연은 중간에 끊긴다.',
      '2년 뒤 늦가을, 같은 사람들이 같은 집에 다시 모인다. 작가가 된 사람도 있고 배우가 된 사람도 있다. 그런데 아무도 원하던 곳에 와 있지 않다.',
    ],
    mainLine: { text: '나는 갈매기… 아니, 그게 아니지. 나는 배우예요.', source: '니나, 4막' },
    stageDirection: '셋째 막과 넷째 막 사이에 2년이 흐른다.',
    // 극 안의 날짜. 연출부 「타임라인 총람」 v2 봉인판(2026-08-30) §4-1 확정 스파인, 신력. 대본이 아니라 이 공연이 정한 값이다 【확인】
    // 구간 사이 암전에 장면의 시각처럼 하나씩 놓인다. 첫 화면은 막 위에, 2년 구간에는 놓지 않는다(두 날짜 사이의 빈자리가 2년이다)
    stageTimes: {
      act1: '1895년 8월 7일 수요일 저녁 8시 30분',   // 막이 오르는 시각. 달이 떠오를 때
      act2: '1895년 8월 12일 월요일 정오',
      act3: '1895년 8월 19일 월요일',
      act4: '1897년 10월 17일 일요일 저녁',
    },
    // 4막 첫 지문의 뒤쪽 문장들(시각, 빛, 소리). 공연대본 7인 각색판 806~807행 그대로 【확인】. 일정 구간의 날짜 아래에 놓는다
    act4Direction: '저녁. 갓을 씌운 램프 하나가 켜져 있다. 어스름. 나무들이 웅성대는 소리, 굴뚝에서 바람이 우는 소리가 들린다. 야경꾼이 딱따기를 친다.',
    // 연출이 10/2 대화로 준 임시본. 정리된 판이 오면 받은 그대로 바꾼다 【확인】. 문단은 빈 줄(\n\n)로 나눈다
    directorsNote: '체호프는 이 희곡의 표지에 "희극"이라고 적었습니다. 백삼십 년 전 첫 공연은 그 말을 웃음거리로 읽어 실패했고, 두 해 뒤 다시 올린 공연은 그 말을 비극으로 읽어 성공했습니다. 우리는 세 번째로 읽어 보려고 합니다. 이 극은 웃긴 극이 아니라, 무언가가 부서진 다음에도 저녁이 계속되는 극입니다.\n\n여기 일곱 사람이 있습니다. 배우가 된 사람과 작가가 된 사람, 아직 되지 못한 두 젊은이, 원하기만 하다가 늙은 사람, 아무것도 원하지 않으려 애쓰는 사람, 그리고 첫 대사부터 자기 인생을 상복이라고 부르는 사람. 이 극에서는 원하던 것이 된 사람조차 원하던 곳에 닿지 못합니다. 되는 것과 도착하는 것은 다른 일이고, 사람은 그 사이의 거리를 삽니다. 미워하고, 슬퍼하고, 견디면서.\n\n그들은 살기 위해 저마다 자기에게 이름 하나를 붙입니다. 나는 갈매기다, 나는 불행하다, 나는 원하기만 했던 사람이다. 정확한 이름은 하나도 없습니다. 그래도 하나는 믿어야 살 수 있어서, 사람들은 정확하지 않은 이름을 입고 저녁을 먹으러 갑니다. 그 이름을 알아차리는 순간은 크게 오지 않습니다. 저녁을 먹다가, 카드를 하다가, 누가 하는 말을 듣다가 옵니다. 말하는 사람은 잔잔하고 듣는 사람은 알아듣지 못합니다. 이 극에서 아무도 웃기려 하지 않는데 웃음이 나는 것은 그 때문입니다. 모두가 진심이고, 진심은 자기가 빗나가는 것을 잘 보지 못합니다.\n\n우리는 이 희곡을 러시아어에서 직접 옮기고 일곱 사람으로 다시 지었습니다. 백 석의 작은 방을 고른 것도 그래서입니다. 큰 극장이 이 극을 못 하는 것이 아니라, 작은 방이 이 극의 원래 크기라고 생각합니다. 관객 여러분은 그 방에 잠시 앉았다가, 그들이 무언가를 알아차리기 직전에 나가게 될 것입니다. 그들은 여러분이 오기 전부터 거기 있었고, 여러분이 나간 뒤에도 거기서 저녁을 먹고 있을 것입니다.\n\n당신은 그 거리를 어떻게 견디고 있습니까.',
    // 수면에 띄울 대사. 멈추면 한 줄씩 떠오른다. act가 있으면 그 막의 구간에서만 뜬다. 공연대본 7인 각색판 그대로 【확인】
    waterLines: [
      // 1막 극중극(트레플레프의 무대). 막이 오르면 떠오른다. cue가 있으면 그 순간(stage: 막이 오르고 어두워질 때, eyes: 붉은 점 두 개가 나타날 때)에 뜬다
      { text: '춥다, 춥다, 춥다. 비었다, 비었다, 비었다. 무섭다, 무섭다, 무섭다.', source: '니나, 1막', act: 'act1', cue: 'stage' },   // 168~169행
      { text: '나는 외롭다. 백 년에 한 번 나는 입술을 열어 말하고, 내 목소리는 이 공허 속에서 쓸쓸히 울리며, 아무도 듣지 않는다…', source: '니나, 1막', act: 'act1' },   // 180~181행
      { text: '저기 나의 강대한 적수, 악마가 다가온다. 그의 무시무시한, 검붉은 눈이 보인다…', source: '니나, 1막', act: 'act1', cue: 'eyes' },   // 193행
      { text: '날씨 한번 지독하군요! 벌써 이틀째예요.', source: '도른, 4막', act: 'act4' },   // 812행
      { text: '호수에 파도가 일어요. 집채만 한 게.', source: '마샤, 4막', act: 'act4' },      // 815~816행
      { text: '정원이 캄캄해요.', source: '도른, 4막', act: 'act4' },                       // 817행
    ] as { text: string; source: string; act?: 'act1' | 'act4'; cue?: 'stage' | 'eyes' }[],
  },
  video: { youtubeId: '', aspect: '16/9', poster: '' }, // 비면 숨김
  links: { instagram: '', contact: '' },          // 비면 숨김
  sponsors: '',                                   // 비면 숨김
  meta: {
    title: '〈갈매기〉 서강연극회 118회 정기공연',   // 【확인】
    description: '안톤 체호프 작. 2026년 11월 12일(목)~14일(토), 서강대학교 메리홀 소극장.',
    siteUrl: '',                                  // 연출의 도메인. 비면 절대 주소를 비워 둔다
    ogImage: 'og-2026-10b.jpg',                    // 바꿀 때 파일 이름도 바꾼다
  },
};

export type Show = typeof show;
