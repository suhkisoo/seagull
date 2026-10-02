// 빌드 때 내용 파일 검사. docs/plan.md 3.2. 경고만 하고 빌드를 막지 않는다.
import { show } from './show';

export function validateShow(): string[] {
  const warn: string[] = [];
  const t = show.shows.map((s) => new Date(s.startAt).getTime());
  if (t.some((x) => !Number.isFinite(x))) warn.push('회차 시각 가운데 읽을 수 없는 값이 있다');
  for (let i = 1; i < t.length; i++) if (t[i] <= t[i - 1]) warn.push(`회차가 시간순이 아니다: ${show.shows[i].id}`);
  if (!/\+09:00$/.test(show.shows[0]?.startAt ?? '')) warn.push('회차 시각에 +09:00 오프셋이 없다');
  if (show.booking.openAt && !show.booking.commonUrl && !show.shows.some((s) => s.url)) warn.push('예매 오픈 시각은 있는데 예매 링크가 없다. 버튼은 "예매 일정 보기"로 간다');
  if (show.booking.commonUrl === '' && show.shows.some((s) => s.url) && show.shows.some((s) => !s.url)) warn.push('회차별 링크가 일부에만 있다. 없는 회차는 공통 링크도 없다');
  for (const r of show.roles) { if (!r.name) warn.push('이름이 빈 배역이 있다'); if (r.actors.some((a) => !a)) warn.push(`${r.name}의 배우 이름이 비었다`); }
  for (const s of show.shows) for (const [k, v] of Object.entries(s.cast)) if (!show.roles.find((r) => r.id === k)) warn.push(`${s.id}의 출연에 모르는 배역 id ${k}`); else if (v && !show.roles.find((r) => r.id === k)!.actors.includes(v)) warn.push(`${s.id}의 ${k}에 명단에 없는 이름 ${v}`);
  if (!show.meta.siteUrl && !process.env.SITE_URL) warn.push('사이트 주소(meta.siteUrl)가 비어 있다. og:url, og:image, JSON-LD의 절대 주소를 비워 둔다');
  if (/[—–]/.test(JSON.stringify(show))) warn.push('내용에 대시(—, –)가 있다. 지시서 7장');
  for (const w of warn) console.warn(`[내용 검사] ${w}`);
  return warn;
}
