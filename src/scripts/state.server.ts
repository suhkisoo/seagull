// 빌드 시점(서버) 상태. 브라우저의 state.ts와 같은 규칙이되 location이 없다.
import { show, type ShowTime } from '../content/show';
const KST = (iso: string) => new Date(iso).getTime();
export function ticketState(picked: ShowTime | null = null, t = Date.now()) {
  const running = (show.runningMinutes ?? 180) * 60 * 1000;
  const last = show.shows.reduce((a, b) => (KST(a.startAt) > KST(b.startAt) ? a : b));
  if (t >= KST(last.startAt) + running) return { id: 'ended', label: '공연이 끝났습니다' } as const;
  const hasLink = !!show.booking.commonUrl || show.shows.some((s) => s.url);
  if (!show.booking.openAt || !hasLink) return { id: 'see-schedule', label: '예매 일정 보기', href: '#tickets' } as const;
  if (show.booking.commonUrl) return { id: 'open', label: '예매하기', href: show.booking.commonUrl, external: true } as const;
  return { id: 'see-schedule', label: '예매하기', href: '#tickets' } as const;
}
