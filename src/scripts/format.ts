// 한국 시간 표기. 빌드와 브라우저가 같이 쓴다. +09:00 ISO를 UTC로 옮겨 필드를 읽는다.
const DAY = ['일', '월', '화', '수', '목', '금', '토'];
export const epoch = (iso: string) => new Date(iso).getTime();
function kst(iso: string) { return new Date(epoch(iso) + 9 * 3600 * 1000); }
export function fmtDay(iso: string): string { const d = kst(iso); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${DAY[d.getUTCDay()]})`; }
export function fmtDate(iso: string): string { const d = kst(iso); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`; }
export function fmtTime(iso: string): string { const d = kst(iso); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; }
export function dayKey(iso: string): string { const d = kst(iso); return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()}`; }
