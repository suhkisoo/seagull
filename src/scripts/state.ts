// 예매 버튼 상태 기계. docs/plan.md 3.2. 비교는 epoch 밀리초, 한국 시간은 +09:00 문자열에서 나온다.
import { show, type ShowTime } from '../content/show';

export type TicketState =
  | { id: 'ended'; label: string }
  | { id: 'before-open'; label: string; href: string }
  | { id: 'see-schedule'; label: string; href: string }
  | { id: 'closed'; label: string }
  | { id: 'sold-out'; label: string }
  | { id: 'past'; label: string }
  | { id: 'open'; label: string; href: string; external?: true };

const KST = (iso: string) => new Date(iso).getTime();
export function now(): number {
  const q = new URLSearchParams(location.search).get('now');
  const t = q ? Date.parse(q) : NaN;
  return Number.isFinite(t) ? t : Date.now();
}
export function fmtShow(s: ShowTime): string {
  const d = new Date(KST(s.startAt) + 9 * 3600 * 1000); // UTC로 옮겨 한국 시간 필드를 읽는다
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
export function fmtOpen(iso: string): string {
  const d = new Date(KST(iso) + 9 * 3600 * 1000);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}
export function ticketState(picked: ShowTime | null, t = now()): TicketState {
  const running = (show.runningMinutes ?? 180) * 60 * 1000;
  const last = show.shows.reduce((a, b) => (KST(a.startAt) > KST(b.startAt) ? a : b));
  const endOfRun = KST(last.startAt) + running;
  const bookPage = `${import.meta.env.BASE_URL.replace(/\/$/, '')}/book/`;
  const hasLink = !!show.booking.commonUrl || show.shows.some((s) => s.url) || !!show.booking.apiUrl;
  if (t >= endOfRun) return { id: 'ended', label: '공연이 끝났습니다' };
  if (!show.booking.openAt || !hasLink) return { id: 'see-schedule', label: '예매 일정 보기', href: '#tickets' };
  if (t < KST(show.booking.openAt)) return { id: 'before-open', label: `${fmtOpen(show.booking.openAt)} 예매 오픈`, href: '#tickets' };
  const available = show.shows.filter((s) => !s.soldOut && t < KST(s.startAt));
  if (available.length === 0 && !picked) return { id: 'closed', label: '예매 마감' };
  if (picked) {
    if (picked.soldOut) return { id: 'sold-out', label: '매진' };
    if (t >= KST(picked.startAt)) return { id: 'past', label: '종료' };
    const ext = picked.url || show.booking.commonUrl;
    return ext ? { id: 'open', label: `${fmtShow(picked)} 예매하기`, href: ext, external: true } : { id: 'open', label: `${fmtShow(picked)} 예매하기`, href: `${bookPage}?show=${picked.id}` };
  }
  if (show.booking.commonUrl) return { id: 'open', label: '예매하기', href: show.booking.commonUrl, external: true };
  if (show.booking.apiUrl) return { id: 'open', label: '예매하기', href: bookPage };
  return { id: 'see-schedule', label: '예매하기', href: '#tickets' };
}
export function applyTicketState(el: HTMLAnchorElement | HTMLButtonElement, st: TicketState) {
  el.textContent = st.label;
  el.dataset.state = st.id;
  const clickable = 'href' in st;
  if (el instanceof HTMLAnchorElement) {
    if (clickable) { el.setAttribute('href', (st as { href: string }).href); el.removeAttribute('aria-disabled'); el.removeAttribute('tabindex'); }
    else { el.removeAttribute('href'); el.setAttribute('aria-disabled', 'true'); el.setAttribute('role', 'button'); }
    if ('external' in st && st.external) { el.target = '_blank'; el.rel = 'noopener'; } else { el.removeAttribute('target'); el.removeAttribute('rel'); }
  }
  document.documentElement.dataset.ticketState = st.id;
}
