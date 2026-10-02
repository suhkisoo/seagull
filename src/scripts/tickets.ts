// 회차 고르기, 예매 버튼 문구, 주소 복사, 공유. docs/plan.md 3.1의 13~17, 3.2. 확인은 물결(수면 모듈의 pointerdown)과 글자로.
import { show, type ShowTime } from '../content/show';
import { ticketState, applyTicketState, now } from './state';
import { epoch } from './format';
import type { WaterState } from './water/index';

let water: { state: WaterState } | null = null;
export function setWater(w: { state: WaterState } | null) { water = w; trackLamp(); }
// 고른 칸의 자리를 수면 모듈에 넘긴다. 띠 위쪽의 불빛이 같은 x의 물에 비친다
function trackLamp() {
  if (!water) return;
  const cell = document.querySelector<HTMLElement>('.cell:has(.cell__input:checked)');
  const band = document.querySelector<HTMLElement>('.water');
  if (!cell || !band) { water.state.lamp[3] = 0; return; }
  const r = cell.getBoundingClientRect(), b = band.getBoundingClientRect();
  const dist = b.top - r.bottom; // 칸이 띠보다 얼마나 위에 있나
  const vis = dist > -r.height && r.top < innerHeight ? 0.45 + 0.55 * Math.max(0, 1 - Math.max(0, dist) / innerHeight) : 0;
  water.state.lamp = [r.left + r.width / 2, b.top + Math.min(60, Math.max(0, dist) * 0.2), r.width * 0.6, 0.4 * vis];
}
window.addEventListener('scroll', trackLamp, { passive: true });
window.addEventListener('resize', trackLamp, { passive: true });

let picked: ShowTime | null = null;
const btn = () => document.querySelector<HTMLAnchorElement>('[data-ticket-button]');

export function applyState() {
  const b = btn(); if (!b) return;
  const t = now();
  // 지난 회차는 "종료". 매진과 겹치면 "종료"
  for (const s of show.shows) {
    const cell = document.querySelector<HTMLElement>(`[data-cell="${s.id}"]`); if (!cell) continue;
    const past = t >= epoch(s.startAt);
    cell.classList.toggle('is-past', past);
    const st = cell.querySelector<HTMLElement>('[data-cell-status]');
    if (st) st.textContent = past ? '종료' : s.soldOut ? '매진' : '';
  }
  applyTicketState(b, ticketState(picked, t));
  const tb = document.querySelector<HTMLElement>('[data-tumblbug]');
  if (tb) { const a = tb.dataset.start ? epoch(tb.dataset.start) : -Infinity, z = tb.dataset.end ? epoch(tb.dataset.end) + 24 * 3600 * 1000 : Infinity; tb.hidden = !(t >= a && t < z); }
}

export function initTickets() {
  const group = document.querySelector<HTMLElement>('[data-showtimes]');
  group?.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement; if (input.name !== 'showtime') return;
    picked = show.shows.find((s) => s.id === input.value) ?? null;
    for (const list of document.querySelectorAll<HTMLElement>('[data-cast-for]')) list.hidden = list.dataset.castFor !== input.value;
    applyState(); trackLamp();
  });
  applyState();
  setInterval(applyState, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyState(); });

  // 주소 복사. 안 되면 주소 글자를 선택해 준다
  const copyBtn = document.querySelector<HTMLButtonElement>('[data-copy-address]');
  const copyDone = document.querySelector<HTMLElement>('[data-copy-done]');
  const addr = document.querySelector<HTMLElement>('[data-address]');
  copyBtn?.addEventListener('click', async () => {
    const text = addr?.textContent?.trim() ?? show.venue.address;
    if (await copy(text)) say(copyDone, '복사됨');
    else { selectText(addr); say(copyDone, '길게 눌러 복사하세요'); }
  });
  // 공유하기. 기기의 공유, 안 되면 링크 복사, 그것도 안 되면 주소 글자
  const shareBtn = document.querySelector<HTMLButtonElement>('[data-share]');
  const shareDone = document.querySelector<HTMLElement>('[data-share-done]');
  shareBtn?.addEventListener('click', async () => {
    const url = location.href.split('#')[0].split('?')[0];
    const data = { title: show.meta.title, text: show.meta.description, url };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (err) { if ((err as Error).name === 'AbortError') return; }
    }
    if (await copy(url)) say(shareDone, '링크 복사됨');
    else say(shareDone, url);
  });
}

async function copy(text: string): Promise<boolean> {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; } } catch { /* 아래로 */ }
  return false;
}
function selectText(el: HTMLElement | null) {
  if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(r);
}
let sayTimer = 0;
function say(el: HTMLElement | null, text: string) {
  if (!el) return; el.textContent = text; clearTimeout(sayTimer);
  sayTimer = window.setTimeout(() => { if (el.textContent === text && text.length < 20) el.textContent = ''; }, 4000);
}
