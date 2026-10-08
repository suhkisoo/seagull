// 여섯 구간의 빛. CSS 변수와 수면 셰이더 유니폼의 공통 원천. 값은 docs/plan.md 1.1의 색표에서 나온다.
export const palette = {
  floor: '#262E27',    // 호수 바닥
  deep: '#3E4838',     // 호수 깊은 초록
  olive: '#5B6041',    // 물풀 올리브
  sun: '#ABAB76',      // 햇빛 연두
  ivory: '#F8F8EC',    // 안개 낀 아이보리
  amber: '#CDA668',    // 램프 호박빛
  morningShadow: '#AEBFB7', // 파생: 아침의 푸른 기운
  morningRoom: '#DDE0D4',   // 파생: 아침 실내의 바탕
  lampRoom: '#F0EAD9',      // 파생: 4막의 실내. 갓을 씌운 램프 하나가 켜진 방. 아이보리에 호박빛이 조금 밴다
  night: '#2A3328',         // 파생: 2년의 밤. 페이지에서 가장 긴 어둠은 여기 한 곳
} as const;

export type Light = {
  id: string;
  skyTop: string;    // 수면 위쪽(수평선 가까이)의 물빛
  skyBot: string;    // 수면 아래쪽의 물빛
  bgTop: string;     // 구간 바탕 위쪽
  bgBot: string;     // 구간 바탕 아래쪽(수평선 쪽)
  text: string;      // 글자색
  room: string;      // 방의 빛. 구간 전체의 바탕색(docs/plan.md 9.5.3)
  glow?: number;     // 물에서 올라오는 낮은 빛의 세기 0~1
  shade?: [number, number]; // 빛이 오는 쪽. [CSS 각도, 반대쪽 그늘의 세기]. 180은 위에서, 90은 왼쪽에서, 0은 아래(물)에서
  sparkle: string;   // 반짝임 색
  wind: number;      // 0~1 바람
};

export const lights: Light[] = [
  // 첫 화면. 해 질 무렵. 맨 위 가장자리만 햇빛 연두, 글자 뒤는 올리브
  { id: 'hero', skyTop: palette.olive, skyBot: palette.floor, bgTop: palette.sun, bgBot: palette.olive, text: palette.ivory, room: palette.floor, sparkle: palette.sun, wind: 0.15 },
  // 첫 화면이 다 저문 뒤. 달빛은 아래 물에서 올라온다
  { id: 'hero-dusk', skyTop: palette.deep, skyBot: '#4C5A4C', bgTop: palette.olive, bgBot: palette.deep, text: palette.ivory, room: palette.floor, sparkle: palette.ivory, wind: 0.15 },
  { id: 'about', skyTop: palette.sun, skyBot: palette.olive, bgTop: palette.ivory, bgBot: palette.ivory, text: palette.floor, room: palette.ivory, shade: [180, 0.1], sparkle: palette.ivory, wind: 0.05 },
  { id: 'people', skyTop: palette.morningShadow, skyBot: palette.olive, bgTop: palette.morningRoom, bgBot: palette.morningRoom, text: palette.floor, room: palette.morningRoom, shade: [90, 0.13], sparkle: palette.ivory, wind: 0.05 },
  { id: 'two-years', skyTop: palette.deep, skyBot: palette.floor, bgTop: palette.morningRoom, bgBot: palette.deep, text: palette.ivory, room: palette.night, shade: [0, 0.32], sparkle: palette.ivory, wind: 0.35 },
  // 4막. 밖은 폭풍이고 방에는 램프가 켜져 있다. 방은 램프 빛의 종이, 물은 폭풍의 밤(scroll.ts). 10/8 연출 "바탕이 너무 어둡다"
  { id: 'tickets', skyTop: palette.deep, skyBot: palette.floor, bgTop: palette.lampRoom, bgBot: palette.lampRoom, text: palette.floor, room: palette.lampRoom, shade: [0, 0.07], sparkle: palette.ivory, wind: 0.62 },
  // 끝. 포스터의 아랫단처럼 종이 위에 이름들. 물은 다시 포스터의 반영으로 돌아온다
  { id: 'credits', skyTop: palette.olive, skyBot: palette.floor, bgTop: palette.ivory, bgBot: palette.ivory, text: palette.floor, room: '#F4F1E5', shade: [0, 0.05], sparkle: palette.ivory, wind: 0.1 },
];
