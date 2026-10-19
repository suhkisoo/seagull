// 메리홀 소극장 좌석표. 기획팀이 보낸 Seating Plan(xlsx) 그대로. 무대가 아래, A열이 무대에 가장 가깝다.
// 좌석 번호는 객석에서 무대를 보고 왼쪽이 12, 오른쪽이 1. H열은 10석이고 6과 5 사이가 통로다.
// 1층 발코니는 왼쪽(L)과 오른쪽(R)으로 나누어 받는다. 자리 지정 없이 쪽마다 인원만 고른다(연출의 지시). 쪽마다 최대 인원은 아래 max 【확인】.

export type BalconySide = 'L' | 'R';
export type Balcony = Record<BalconySide, number>;
export const noBalcony = (): Balcony => ({ L: 0, R: 0 });
export const asBalcony = (v: unknown): Balcony => (typeof v === 'number' ? { L: v, R: 0 } : { L: Number((v as Balcony)?.L) || 0, R: Number((v as Balcony)?.R) || 0 });
export const balconySum = (b: Balcony) => b.L + b.R;

export type SeatRow = { row: string; seats: number[]; gapAfter?: number }; // gapAfter: 이 번호 뒤에 통로

export const hall = {
  name: '서강대학교 메리홀 소극장',
  rows: [
    { row: 'H', seats: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1], gapAfter: 6 },
    { row: 'G', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { row: 'F', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { row: 'E', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { row: 'D', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { row: 'C', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { row: 'B', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
    { row: 'A', seats: [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1] },
  ] as SeatRow[],
  balcony: {
    // 10/16 기획(고은채) "발코니석도 안 적어야 될 것 같아". 예매에서 뺀다. 다시 열려면 true로 바꾸고 backend/Code.gs의 CONFIG도 맞춘다(빌드가 알려 준다)
    open: false,
    label: '1층 발코니',
    // 좌석표의 1st BALCONY (L), (R). 둘을 합쳐 회차당 8명이던 것을 반씩 나눴다 【확인】
    sides: [
      { id: 'L', label: '왼쪽', max: 4 },
      { id: 'R', label: '오른쪽', max: 4 },
    ] as { id: BalconySide; label: string; max: number }[],
  },
  // 좌석도는 무대가 아래라 화면의 왼쪽과 관객 기준 왼쪽이 반대다. 그래서 무대를 바라보는 쪽으로 적는다(10/17)
  entrance: '입구는 A열 왼쪽',   // 10/19 연출. 무대 바로 앞줄의 왼쪽
  // 좌석도에서 "입구" 표시를 놓을 모서리. 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'. A열 왼쪽은 좌석도의 왼쪽 아래(무대 옆)
  entranceCorner: 'bottom-left' as 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
};

export const seatId = (row: string, n: number) => `${row}${n}`;
// 예매에서 받는 발코니의 쪽들. 발코니를 닫으면 비어 있다
export const balconySides = () => (hall.balcony.open ? hall.balcony.sides : []);
export const allSeats = () => hall.rows.flatMap((r) => r.seats.map((n) => seatId(r.row, n)));
