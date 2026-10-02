// 메리홀 소극장 좌석표. 기획팀이 보낸 Seating Plan(xlsx) 그대로. 무대가 아래, A열이 무대에 가장 가깝다.
// 좌석 번호는 객석에서 무대를 보고 왼쪽이 12, 오른쪽이 1. H열은 10석이고 6과 5 사이가 통로다.
// 1층 발코니(L, R)는 좌석 지정 없이 한 회차에 최대 8명(연출의 지시).

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
  balcony: { label: '1층 발코니', max: 8 },   // 회차당 최대 인원. 자리 지정 없음
  entrance: '입구는 객석 왼쪽 뒤',
};

export const seatId = (row: string, n: number) => `${row}${n}`;
export const allSeats = () => hall.rows.flatMap((r) => r.seats.map((n) => seatId(r.row, n)));
