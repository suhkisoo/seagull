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
    naverMap: '',                                 // 비면 검색 링크로 만든다
    kakaoMap: '',
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
  pricing: '',                                    // 비면 "추후 공개"
  booking: {
    openAt: '',                                   // 예매 오픈 시각 ISO. 비면 "예매 일정 보기"
    commonUrl: '',                                // 외부 예매처 링크. 비면 이 페이지의 예매 흐름(/book/)을 쓴다
    vendorName: '',                               // 예매처 이름
    // 이 페이지의 예매 흐름(연출의 지시로 3단계 뒤에 추가). 좌석을 고르고 계좌로 입금하면 기획팀이 확인한다
    apiUrl: '',                                   // Apps Script 웹 앱 주소 【빈칸】. 비면 예매 흐름은 미리보기(저장되지 않음)
    seatPrice: null as number | null,             // 지정석 가격(원) 【빈칸】
    balconyPrice: null as number | null,          // 발코니 가격(원) 【빈칸】. 비면 지정석과 같다
    account: { bank: '', number: '', holder: '' }, // 입금 계좌 【빈칸】
    holdHours: 24,                                // 입금 대기 시간. 지나면 기획팀이 관리 화면에서 자리를 풀 수 있다
    contact: '',                                  // 예매 문의(카카오톡 채널, 전화 등) 【빈칸】
  },
  // 굿즈. 9/17 인스타 일정표와 9/21 기획 스탭회의 기준 【확인】. 가격과 재고는 【빈칸】. price가 비면 "추후 공개"로 보이고 고를 수 없다
  goods: [
    { id: 'programbook', name: '프로그램북', price: null as number | null, stock: null as number | null, note: '' },
    { id: 'pinbadge', name: '핀배지', price: null as number | null, stock: null as number | null, note: '' },
    { id: 'bookmark-ticket', name: '책갈피(티켓)', price: null as number | null, stock: null as number | null, note: '' },
    { id: 'bookmark-poster', name: '책갈피(포스터)', price: null as number | null, stock: null as number | null, note: '' },
    { id: 'stamp-sticker', name: '우표 스티커', price: null as number | null, stock: null as number | null, note: '' },
    { id: 'actor-poster', name: '배우 포스터', price: null as number | null, stock: null as number | null, note: '11종 가운데 고른다' },
  ],
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
    directorsNote: '',                            // 비면 숨김
    waterLines: [] as string[],                   // 수면에 띄울 대사. 비면 대표 대사만
  },
  video: { youtubeId: '', aspect: '16/9', poster: '' }, // 비면 숨김
  links: { instagram: '', contact: '' },          // 비면 숨김
  sponsors: '',                                   // 비면 숨김
  meta: {
    title: '〈갈매기〉 서강연극회 118회 정기공연',   // 【확인】
    description: '안톤 체호프 작. 2026년 11월 12일(목)~14일(토), 서강대학교 메리홀 소극장.',
    siteUrl: '',                                  // 연출의 도메인. 비면 절대 주소를 비워 둔다
    ogImage: 'og-2026-10.jpg',                    // 바꿀 때 파일 이름도 바꾼다
  },
};

export type Show = typeof show;
