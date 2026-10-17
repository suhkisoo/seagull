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
  water.state.lamp = [r.left + r.width / 2, b.top + Math.min(60, Math.max(0, dist) * 0.2), r.width * (0.9 + 0.25 * boost), 1.6 * vis * (1 + boost)];
}
// 회차를 고르면 램프의 불을 돋운다(4막 지문, 마샤가 램프의 불을 돋운다). 한 번 밝게 올랐다가 조금 낮춰 둔다
let boost = 0;
function raiseLamp() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const t0 = performance.now();
  // 방의 램프(.room__lamp)도 같이 돋운다
  const up = (v: number) => document.documentElement.style.setProperty('--lamp-up', v.toFixed(3));
  const step = (t: number) => { const k = Math.min(1, (t - t0) / 1600); boost = Math.sin(Math.PI * k) * 0.7 * (1 - 0.4 * k); trackLamp(); up(boost); if (k < 1) requestAnimationFrame(step); else { boost = 0; trackLamp(); up(0); } };
  requestAnimationFrame(step);
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
    applyState(); trackLamp(); raiseLamp();
    const link = document.querySelector<HTMLAnchorElement>('[data-book-link]'); if (link && !link.target) link.search = `?show=${input.value}`;
  });
  applyState();
  setInterval(applyState, 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) applyState(); });

  // 지도에 닿으면 그 자리에서 물결이 두 번 번지고 공연장의 램프가 잠깐 넓게 비춘다
  const mapFrame = document.querySelector<HTMLElement>('[data-map] .map__frame');
  let lampT = 0;
  mapFrame?.addEventListener('pointerdown', (e) => {
    const r = mapFrame.getBoundingClientRect();
    for (let i = 0; i < 2; i++) {
      const sp = document.createElement('span'); sp.className = 'map__ripple';
      sp.style.left = `${e.clientX - r.left}px`; sp.style.top = `${e.clientY - r.top}px`;
      mapFrame.appendChild(sp); setTimeout(() => sp.remove(), 2000);
    }
    mapFrame.classList.add('is-lit'); clearTimeout(lampT); lampT = window.setTimeout(() => mapFrame.classList.remove('is-lit'), 650);
  });
  // 역 이름 자리. 틀의 비율에 따라 가장자리가 잘리므로 화면에서 재어 놓는다(10/17).
  // 공연장 표시(원과 이름)에 닿거나 오른쪽 끝을 넘으면 점의 왼쪽으로 옮기고, 점이 틀 밖이면 그 역은 숨긴다
  const placeStations = () => {
    if (!mapFrame) return;
    const f = mapFrame.getBoundingClientRect(); if (!f.width) return;
    const venue = mapFrame.querySelector<HTMLElement>('.map__venue'), vname = mapFrame.querySelector<HTMLElement>('.map__venue-name');
    const v = venue?.getBoundingClientRect(), n = vname?.getBoundingClientRect();
    const keep = [v ? { left: v.left - 22, right: v.left + 22, top: v.top - 22, bottom: v.top + 22 } : null, n].filter(Boolean) as { left: number; right: number; top: number; bottom: number }[];
    const hit = (a: DOMRect) => keep.some((b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom);
    for (const st of mapFrame.querySelectorAll<HTMLElement>('.map__station')) {
      st.classList.remove('map__station--left'); st.hidden = false;
      const r = st.getBoundingClientRect(); const dot = r.left; // 점은 글자의 왼쪽 끝
      if (dot < f.left + 4 || dot > f.right - 4 || r.top < f.top || r.bottom > f.bottom) { st.hidden = true; continue; }
      if (hit(r) || r.right > f.right - 4) {
        st.classList.add('map__station--left');
        const l = st.getBoundingClientRect();
        if (l.left < f.left + 4 || hit(l)) st.hidden = true;
      }
    }
  };
  placeStations();
  let placeT = 0; window.addEventListener('resize', () => { clearTimeout(placeT); placeT = window.setTimeout(placeStations, 150); });
  document.fonts?.ready.then(placeStations);
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
