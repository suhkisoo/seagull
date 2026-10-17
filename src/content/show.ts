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
    planning: '기획 고은채',                      // 10/17 연출 "첫 화면에 기획 고은채도"
    painting: '',                                 // 첫 화면 그림의 출처 한 줄. 끝의 크레딧 아래에 놓인다. 비면 숨김 【빈칸】
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
    // 오시는 길 안내. 값이 빈 행은 화면에 나오지 않는다. 값은 연출이 채운다 【빈칸】
    directions: [
      { label: '가까운 역과 출구', value: '' },
      { label: '걸어서 걸리는 시간', value: '' },
      { label: '건물 안 위치', value: '' },   // 층과 입구
    ],
  },
  shows: [
    { id: '1112-1500', startAt: '2026-11-12T15:00:00+09:00', url: '', soldOut: false, cast: { arkadina: '서채림', treplev: '백경환', sorin: '부신빈', nina: '김현아', masha: '이예림', trigorin: '오규헌', dorn: '전아침' } },
    { id: '1112-1930', startAt: '2026-11-12T19:30:00+09:00', url: '', soldOut: false, cast: { arkadina: '박세은', treplev: '이영종', sorin: '부신빈', nina: '김시연', masha: '이예림', trigorin: '조민석', dorn: '전아침' } },
    { id: '1113-1500', startAt: '2026-11-13T15:00:00+09:00', url: '', soldOut: false, cast: { arkadina: '박세은', treplev: '백경환', sorin: '부신빈', nina: '김시연', masha: '이예림', trigorin: '오규헌', dorn: '전아침' } },
    { id: '1113-1930', startAt: '2026-11-13T19:30:00+09:00', url: '', soldOut: false, cast: { arkadina: '서채림', treplev: '이영종', sorin: '부신빈', nina: '김현아', masha: '이예림', trigorin: '조민석', dorn: '전아침' } },
    { id: '1114-1300', startAt: '2026-11-14T13:00:00+09:00', url: '', soldOut: false, cast: { arkadina: '서채림', treplev: '이영종', sorin: '부신빈', nina: '김시연', masha: '이예림', trigorin: '조민석', dorn: '전아침' } },
    { id: '1114-1800', startAt: '2026-11-14T18:00:00+09:00', url: '', soldOut: false, cast: { arkadina: '박세은', treplev: '백경환', sorin: '부신빈', nina: '김현아', masha: '이예림', trigorin: '오규헌', dorn: '전아침' } },
  ] as ShowTime[], // 회차별 출연은 10/17 연출이 준 표
  runningMinutes: null as number | null,          // 인터미션 포함 총 시간. 비면 180분으로 본다 【확인】
  // 예매 전 안내. 공연 일정과 예매의 "가격과 좌석", "예매 오픈" 아래에 놓인다. 값이 빈 행은 화면에 나오지 않는다. 값은 연출이 채운다 【빈칸】
  notices: [
    { label: '러닝타임', value: '' },
    { label: '인터미션', value: '' },
    { label: '관람 연령', value: '' },
    { label: '지각 입장', value: '' },
    { label: '취소와 환불', value: '' },
    { label: '휠체어 접근', value: '' },
    { label: '촬영', value: '' },
  ],
  pricing: '티켓 9,000원, 책갈피 증정. 굿즈를 묶은 구성은 11,000원부터 30,000원까지', // 비면 "추후 공개". 연출이 10/7에 준 가격에서
  booking: {
    openAt: '',                                   // 예매 오픈 시각 ISO. 비면 "예매 일정 보기"
    commonUrl: '',                                // 외부 예매처 링크. 비면 이 페이지의 예매 흐름(/book/)을 쓴다
    vendorName: '',                               // 예매처 이름
    // 이 페이지의 예매 흐름(연출의 지시로 3단계 뒤에 추가). 좌석을 고르고 계좌로 입금하면 기획팀이 확인한다
    apiUrl: 'https://script.google.com/macros/s/AKfycbzEhT6uHNdixJcreudUj5P35BV0fAq93AMZEg3EBiJFZuv4kNpf_VxLmuKKEu9P9R1r/exec', // Apps Script 웹 앱 주소(10/16 연출). 비면 예매 흐름은 미리보기(저장되지 않음)
    seatPrice: 9000 as number | null,             // 티켓 한 장(책갈피 증정). 연출이 10/7에 준 가격
    balconyPrice: 9000 as number | null,          // 발코니도 같은 값으로 둔다 【확인】
    // 티켓 구성. 티켓 한 장마다 하나를 고른다. 모든 구성에 티켓 책갈피가 함께 나간다. 연출이 10/7에 준 가격
    packages: [
      // items: 구성에 든 굿즈(goods의 id). 그림으로 묶음을 보여 준다
      // pinPick: 구성 하나에 들어 있는 핀배지 가운데 예매자가 종류를 고르는 개수. 전체 구성은 두 종이 다 들어 있어 고르지 않는다(10/17 기획 확정)
      { id: 'ticket', name: '티켓', note: '책갈피 증정', price: 9000, items: [] as string[], pinPick: 0 },
      { id: 'stamp', name: '티켓 + 우표 스티커', note: '우표 스티커 두 장 한 묶음', price: 11000, items: ['stamp-sticker'], pinPick: 0 },
      { id: 'pin', name: '티켓 + 핀배지', note: '핀배지 한 종 선택', price: 12000, items: ['pinbadge'], pinPick: 1 },
      { id: 'book', name: '티켓 + 프로그램북', note: '', price: 20000, items: ['programbook'], pinPick: 0 },
      { id: 'book-stamp', name: '티켓 + 프로그램북 + 우표 스티커', note: '', price: 21000, items: ['programbook', 'stamp-sticker'], pinPick: 0 },
      { id: 'book-pin', name: '티켓 + 프로그램북 + 핀배지', note: '핀배지 한 종 선택', price: 22000, items: ['programbook', 'pinbadge'], pinPick: 1 },
      { id: 'all', name: '티켓 + 굿즈 전체', note: '프로그램북, 핀배지 두 종, 우표 스티커', price: 30000, items: ['programbook', 'pinbadge', 'stamp-sticker'], pinPick: 0 },
    ],
    account: { bank: '카카오뱅크', number: '3333327681353', holder: '고은채' }, // 입금 계좌(10/17 기획 고은채, 예금주는 연출)
    holdHours: 24,                                // 입금 대기 시간. 지나면 기획팀이 관리 화면에서 자리를 풀 수 있다
    contact: '010-8255-2119',                     // 예매와 입금 문의(10/17 기획 고은채)
  },
  // 굿즈. 9/17 인스타 일정표와 9/21 기획 스탭회의 기준 【확인】. 가격과 재고는 【빈칸】. price가 비면 "추후 공개"로 보이고 고를 수 없다
  // 따로 더 사는 굿즈. 티켓과 함께만 예매한다. 연출이 10/7에 준 가격. 그림은 드라이브 굿즈 폴더(10/5)
  goods: [
    { id: 'programbook', name: '프로그램북', price: 15000 as number | null, stock: null as number | null, note: '', images: ['goods/programbook-1.webp'] as string[] },
    { id: 'pinbadge', name: '핀배지', price: 4000 as number | null, stock: null as number | null, note: '한 종 선택', images: ['goods/pinbadge-1.webp', 'goods/pinbadge-2.webp'] },
    { id: 'stamp-sticker', name: '우표 스티커', price: 3000 as number | null, stock: null as number | null, note: '두 장 한 묶음', images: ['goods/stamp-sticker-1.webp', 'goods/stamp-sticker-2.webp'] },
  ],
  // 핀배지 두 종(10/17 기획 확정, 이름은 같은 날 연출). 이름이 비면 그림으로 고른다. id는 장부에 pinbadge:<id>로 적힌다
  pinKinds: [
    { id: 'sogang', name: '서강연극회 핀배지', image: 'goods/pinbadge-2.webp' },   // 초록 바탕, sogang Theatre
    { id: 'seagull', name: '갈매기 핀배지', image: 'goods/pinbadge-1.webp' },      // 아이보리 바탕, 갈매기와 ЧАЙКА
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
    // 극 안의 날짜 앞에 붙는 막 이름(10/17 연출 "날짜의 의미가 안 느껴진다"). 비면 날짜만
    stageActs: { act1: '1막', act2: '2막', act3: '3막', act4: '4막' },
    stageTimes: {
      act1: '1895년 8월 7일 수요일 저녁 8시 30분',   // 막이 오르는 시각. 달이 떠오를 때
      act2: '1895년 8월 12일 월요일 정오',
      act3: '1895년 8월 19일 월요일',
      act4: '1897년 10월 17일 일요일 저녁',
    },
    // 4막 첫 지문의 뒤쪽 문장들(시각, 빛, 소리). 공연대본 7인 각색판 806~807행 그대로 【확인】. 일정 구간의 날짜 아래에 놓는다
    act4Direction: '저녁. 갓을 씌운 램프 하나가 켜져 있다. 어스름. 나무들이 웅성대는 소리, 굴뚝에서 바람이 우는 소리가 들린다. 야경꾼이 딱따기를 친다.',
    // 연출의 글. 10/17 연출이 준 글로 10/2 임시본을 바꿨다. 같은 날 연출의 지시로 "아흔네 석짜리 방이다."를 빼고, 셋째 문단 끝을 "오니까"로 이었다. 첫 문단은 연출이 고른 안(저녁이 호수에 내려앉는다)으로 바꿨다.
    // 문단은 빈 줄(\n\n)로 나눈다. 첫 문단만 보이고 나머지는 "이어 읽기"로 접힌다. 마지막 문단(물음)은 떼어 놓는다
    directorsNoteBy: '서기수',                     // 연출의 말 끝의 서명. 화면에서 라벨 대신 "서기수의 글"로 읽힌다(스크린리더)
    directorsNote: '저녁이 호수에 내려앉는다. 물가에 집이 하나 있고, 그 앞에서 사람들이 연극이 시작되기를 기다린다. 누군가 호수 쪽을 바라보며 말을 꺼낸다. 옆에 앉은 사람은 그 말에 답하지 않고, 말하는 사람과 호수를 한 풍경처럼 본다.\n\n되는 것과 도착하는 것은 다른 일이다. 사람은 그 사이를 산다. 미워하고, 슬퍼하고, 견디면서. 그러다 이름을 하나 입는다. 갈매기, 불행, 상복. 맞는 이름은 없다. 그래도 하나는 입어야 저녁을 먹으러 갈 수 있다.\n\n체호프는 이 극을 희극이라 불렀다. 우리는 그 말을 지우지 않는다. 부서진 다음에도 저녁은 오니까.\n\n당신은 잠깐 앉았다가, 그들이 알아차리기 직전에 나간다. 그들은 당신이 오기 전부터 거기 있었고, 당신이 나간 뒤에는 아침을 먹고 있을 것이다.\n\n당신은 그 사이를 어떻게 견디고 있나.',
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
  links: { instagram: '', contact: 'sogangtheatre@naver.com' },          // 비면 숨김
  sponsors: '',                                   // 비면 숨김
  meta: {
    title: '〈갈매기〉 서강연극회 118회 정기공연',   // 【확인】
    description: '안톤 체호프 작. 2026년 11월 12일(목)~14일(토), 서강대학교 메리홀 소극장.',
    siteUrl: 'https://seagull.sgtheatre.art',     // 연출의 도메인(10/8 연결). 비면 절대 주소를 비워 둔다
    ogImage: 'og-2026-10b.jpg',                    // 바꿀 때 파일 이름도 바꾼다
  },
};

export type Show = typeof show;
