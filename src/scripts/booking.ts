// 예매 흐름. 다섯 단계가 차례로 열린다. 고른 자리에는 호박빛이 켜진다. 저장은 store.ts.
import { show } from '../content/show';
import { hall, noBalcony, balconySum, type BalconySide } from '../content/hall';
import { fmtDay, fmtTime, epoch } from './format';
import { now } from './state';
import { createStore, type ShowStatus } from './store';

const root = document.querySelector<HTMLElement>('[data-book]')!;
const store = createStore(root.dataset.api || '');
// 미리보기(apiUrl 없음)에서는 ?seat=15000&balcony=10000&goods=3000 으로 가격을 넣어 흐름을 볼 수 있다
const q = new URLSearchParams(location.search);
const previewPrice = (k: string) => (store.demo && q.get(k) ? Number(q.get(k)) : null);
const seatPrice = root.dataset.seatPrice ? Number(root.dataset.seatPrice) : previewPrice('seat');
const balconyPrice = root.dataset.balconyPrice ? Number(root.dataset.balconyPrice) : previewPrice('balcony') ?? seatPrice;
const goodsPreview = previewPrice('goods');
const goodsPrice = (id: string) => { const g = show.goods.find((x) => x.id === id); return g?.price ?? goodsPreview; };
const won = (n: number) => `${n.toLocaleString('ko-KR')}원`;
if (store.demo) document.querySelector<HTMLElement>('[data-demo]')!.hidden = false;

const ORDER = ['show', 'seats', 'goods', 'who', 'confirm'] as const;
type StepId = (typeof ORDER)[number];
const steps = Object.fromEntries(ORDER.map((id) => [id, document.querySelector<HTMLElement>(`[data-step="${id}"]`)!])) as Record<StepId, HTMLElement>;
const nextBtn = document.querySelector<HTMLButtonElement>('[data-step-next]')!;
let current: StepId = 'show';

// ----- 상태 -----
let showId = '';
let seats = new Set<string>();
const balcony = noBalcony();
const goods: Record<string, number> = {};
// 티켓 구성. 티켓 장수만큼, 나머지는 '티켓'(책갈피 증정)으로 채운다
const pkgs: Record<string, number> = Object.fromEntries(show.booking.packages.map((p) => [p.id, 0]));
const BASE_PKG = show.booking.packages[0].id;
const ticketsN = () => seats.size + balconySum(balcony);
const pkgName = (id: string) => show.booking.packages.find((p) => p.id === id)?.name ?? id;
let status: ShowStatus = { taken: [], balconyTaken: noBalcony(), goodsSold: {} };

// ----- 단계 열기와 닫기 -----
function open(id: StepId) {
  current = id;
  for (const k of ORDER) {
    const el = steps[k]; const done = ORDER.indexOf(k) < ORDER.indexOf(id);
    el.classList.toggle('is-open', k === id); el.classList.toggle('is-done', done);
    el.querySelector<HTMLElement>('[data-summary]')!.textContent = done ? summary(k) : '';
  }
  nextBtn.textContent = id === 'confirm' ? '예매 신청' : '다음';
  validate();
  steps[id].scrollIntoView({ block: 'start', behavior: 'smooth' });
}
function summary(k: StepId): string {
  const s = show.shows.find((x) => x.id === showId);
  if (k === 'show') return s ? `${fmtDay(s.startAt)} ${fmtTime(s.startAt)}` : '';
  if (k === 'seats') return [seats.size ? `지정석 ${[...seats].sort(seatSort).join(', ')}` : '', balconyText()].filter(Boolean).join(' · ');
  if (k === 'goods') { const p = Object.entries(pkgs).filter(([, n]) => n > 0).map(([id, n]) => `${pkgName(id)} ${n}`); const g = Object.entries(goods).filter(([, n]) => n > 0).map(([id, n]) => `${show.goods.find((x) => x.id === id)?.name} ${n}`); return [...p, ...g].join(', ') || '없음'; }
  if (k === 'who') return `${name()} ${phone()}`;
  return '';
}
function validate() {
  let ok = false, msg = '';
  if (current === 'show') ok = !!showId;
  else if (current === 'seats') { ok = seats.size + balconySum(balcony) > 0; if (!ok) msg = '좌석을 고르거나 발코니 인원을 정해 주세요'; }
  else if (current === 'goods') ok = true;
  else if (current === 'who') { ok = name().length >= 2 && /\d{3}-?\d{3,4}-?\d{4}/.test(phone()); }
  else if (current === 'confirm') ok = true;
  nextBtn.disabled = !ok;
  nextBtn.setAttribute('aria-disabled', String(!ok));
  if (current === 'seats') steps.seats.querySelector<HTMLElement>('[data-seat-list]')!.textContent = msg || summary('seats');
  return ok;
}
// 단계 제목을 누르면 그 단계로 돌아간다
for (const k of ORDER) steps[k].querySelector('.step__title')!.addEventListener('click', () => { if (steps[k].classList.contains('is-done')) open(k); });

// ----- 1. 회차 -----
const t = now();
for (const input of document.querySelectorAll<HTMLInputElement>('input[name="book-show"]')) {
  const past = t >= epoch(input.dataset.start!);
  if (past) { input.disabled = true; input.closest('[data-pick-show]')!.querySelector('[data-pick-note]')!.textContent = '종료'; }
  input.addEventListener('change', async () => { showId = input.value; await loadStatus(); validate(); });
}
async function loadStatus() {
  try { status = await store.status(showId); } catch { status = { taken: [], balconyTaken: noBalcony(), goodsSold: {} }; }
  for (const s of [...seats]) if (status.taken.includes(s)) seats.delete(s);
  renderSeats();
}
const pre = q.get('show');
if (pre) { const input = document.querySelector<HTMLInputElement>(`input[name="book-show"][value="${pre}"]`); if (input && !input.disabled) { input.checked = true; showId = pre; loadStatus(); } }

// ----- 2. 좌석 -----
const seatSort = (a: string, b: string) => a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a[0] < b[0] ? 1 : -1;
function renderSeats() {
  for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-seat]')) {
    const id = btn.dataset.seat!; const taken = status.taken.includes(id);
    btn.classList.toggle('is-taken', taken); btn.disabled = taken || (seatPrice == null && !store.demo);
    btn.classList.toggle('is-picked', seats.has(id)); btn.setAttribute('aria-pressed', String(seats.has(id)));
  }
  for (const side of hall.balcony.sides) {
    const box = document.querySelector<HTMLElement>(`[data-balcony="${side.id}"]`)!;
    const left = Math.max(0, side.max - status.balconyTaken[side.id]);
    if (balcony[side.id] > left) balcony[side.id] = left;
    box.querySelector<HTMLElement>('[data-balcony-count]')!.textContent = String(balcony[side.id]);
    box.querySelector<HTMLElement>('[data-balcony-left]')!.textContent = left === 0 ? '남은 자리 없음' : `${left}명 남음`;
    box.classList.toggle('is-lit', balcony[side.id] > 0);
    (box.querySelector('[data-balcony-plus]') as HTMLButtonElement).disabled = balcony[side.id] >= left || (balconyPrice == null && !store.demo);
    (box.querySelector('[data-balcony-minus]') as HTMLButtonElement).disabled = balcony[side.id] <= 0;
  }
}
document.querySelector('[data-hall]')!.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-seat]'); if (!btn || btn.disabled) return;
  const id = btn.dataset.seat!; if (seats.has(id)) seats.delete(id); else seats.add(id);
  renderSeats(); validate();
});
for (const side of hall.balcony.sides) {
  const box = document.querySelector<HTMLElement>(`[data-balcony="${side.id}"]`)!;
  box.querySelector('[data-balcony-plus]')!.addEventListener('click', () => { balcony[side.id]++; renderSeats(); validate(); });
  box.querySelector('[data-balcony-minus]')!.addEventListener('click', () => { balcony[side.id] = Math.max(0, balcony[side.id] - 1); renderSeats(); validate(); });
}
function balconyText(): string {
  const parts = hall.balcony.sides.filter((s) => balcony[s.id] > 0).map((s) => `${s.label} ${balcony[s.id]}명`);
  return parts.length ? `발코니 ${parts.join(', ')}` : '';
}

// ----- 3. 굿즈 -----
for (const row of document.querySelectorAll<HTMLElement>('[data-goods]')) {
  const id = row.dataset.goods!; goods[id] = 0;
  if (goodsPreview != null && !row.dataset.price) { // 미리보기 가격
    row.querySelector('.goods__price')!.textContent = won(goodsPreview);
    const soon = row.querySelector('.goods__soon'); if (soon) { const span = document.createElement('span'); span.className = 'qty'; span.innerHTML = '<button class="qty__btn" type="button" data-qty-minus aria-label="줄이기">−</button><output class="qty__n" data-qty>0</output><button class="qty__btn" type="button" data-qty-plus aria-label="늘리기">+</button>'; soon.replaceWith(span); }
  }
  const out = row.querySelector<HTMLElement>('[data-qty]');
  const upd = () => { if (out) out.textContent = String(goods[id]); row.classList.toggle('is-lit', goods[id] > 0); };
  row.querySelector('[data-qty-plus]')?.addEventListener('click', () => { const stock = row.dataset.stock ? Number(row.dataset.stock) - (status.goodsSold[id] || 0) : 99; if (goods[id] < Math.min(10, stock)) goods[id]++; upd(); });
  row.querySelector('[data-qty-minus]')?.addEventListener('click', () => { goods[id] = Math.max(0, goods[id] - 1); upd(); });
}

// 티켓 구성. 다른 구성을 늘리면 '티켓'이 줄고, 장수가 바뀌면 '티켓'이 나머지를 채운다
const pkgRows = [...document.querySelectorAll<HTMLElement>('[data-pkg]')];
function syncPkgs() {
  const n = ticketsN();
  let others = Object.entries(pkgs).filter(([id]) => id !== BASE_PKG).reduce((a, [, v]) => a + v, 0);
  // 장수가 줄었으면 비싼 구성부터 덜어 낸다
  for (const p of [...show.booking.packages].reverse()) { if (others <= n) break; if (p.id === BASE_PKG) continue; const cut = Math.min(pkgs[p.id], others - n); pkgs[p.id] -= cut; others -= cut; }
  pkgs[BASE_PKG] = n - others;
  for (const row of pkgRows) {
    const id = row.dataset.pkg!; row.querySelector<HTMLElement>('[data-qty]')!.textContent = String(pkgs[id]);
    (row.querySelector('[data-qty-plus]') as HTMLButtonElement).disabled = id === BASE_PKG ? true : pkgs[BASE_PKG] <= 0;
    (row.querySelector('[data-qty-minus]') as HTMLButtonElement).disabled = id === BASE_PKG ? true : pkgs[id] <= 0;
    row.classList.toggle('is-lit', pkgs[id] > 0);
  }
  const c = document.querySelector<HTMLElement>('[data-pkg-count]'); if (c) c.textContent = n ? `티켓 ${n}장` : '';
}
for (const row of pkgRows) {
  const id = row.dataset.pkg!;
  row.querySelector('[data-qty-plus]')?.addEventListener('click', () => { if (id !== BASE_PKG && pkgs[BASE_PKG] > 0) pkgs[id]++; syncPkgs(); });
  row.querySelector('[data-qty-minus]')?.addEventListener('click', () => { if (id !== BASE_PKG && pkgs[id] > 0) pkgs[id]--; syncPkgs(); });
}

// ----- 4. 예매자 -----
const name = () => (document.getElementById('bk-name') as HTMLInputElement).value.trim();
const phone = () => (document.getElementById('bk-phone') as HTMLInputElement).value.trim();
const payer = () => (document.getElementById('bk-payer') as HTMLInputElement).value.trim() || name();
for (const id of ['bk-name', 'bk-phone', 'bk-payer']) document.getElementById(id)!.addEventListener('input', validate);

// ----- 5. 확인 -----
function total(): number | null {
  // 티켓 값은 고른 구성의 값이다(티켓 한 장 9,000원이 '티켓' 구성). 구성이 없으면 좌석 값으로
  let sum = 0;
  const pk = Object.entries(pkgs).reduce((a, [, v]) => a + v, 0);
  if (pk === ticketsN() && pk > 0) { for (const [id, n] of Object.entries(pkgs)) sum += n * (show.booking.packages.find((p) => p.id === id)?.price ?? 0); }
  else {
    if (seats.size && seatPrice == null) return null;
    const bn = balconySum(balcony); if (bn && balconyPrice == null) return null;
    sum = seats.size * (seatPrice ?? 0) + bn * (balconyPrice ?? 0);
  }
  for (const [id, n] of Object.entries(goods)) { const pr = goodsPrice(id); if (n > 0) { if (pr == null) return null; sum += n * pr; } }
  return sum;
}
function bill(): [string, string][] {
  const s = show.shows.find((x) => x.id === showId)!;
  const rows: [string, string][] = [['회차', `${fmtDay(s.startAt)} ${fmtTime(s.startAt)}`]];
  if (seats.size) rows.push(['지정석', `${[...seats].sort(seatSort).join(', ')} (${seats.size}석)`]);
  const bn = balconySum(balcony);
  if (bn) rows.push(['발코니', balconyText().replace('발코니 ', '')]);
  for (const p of show.booking.packages) if (pkgs[p.id] > 0) rows.push([p.name, `${pkgs[p.id]}장, ${won(pkgs[p.id] * p.price)}`]);
  for (const [id, n] of Object.entries(goods)) if (n > 0) { const g = show.goods.find((x) => x.id === id)!; const pr = goodsPrice(id); rows.push([g.name, `${n}개${pr != null ? `, ${won(n * pr)}` : ''}`]); }
  rows.push(['예매자', `${name()} ${phone()}`]); if (payer() !== name()) rows.push(['입금자명', payer()]);
  return rows;
}
function renderBill(el: HTMLElement, rows: [string, string][]) { el.replaceChildren(...rows.flatMap(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; return [dt, dd]; })); }
function renderConfirm() {
  renderBill(document.querySelector<HTMLElement>('[data-bill]')!, bill());
  const tt = total(); document.querySelector<HTMLElement>('[data-total]')!.textContent = tt == null ? '가격 공개 뒤 안내' : won(tt);
}

// ----- 다음 -----
nextBtn.addEventListener('click', async () => {
  if (!validate()) return;
  const i = ORDER.indexOf(current);
  if (current === 'confirm') { await submit(); return; }
  if (current === 'seats') { await loadStatus(); if (!validate()) return; }
  if (ORDER[i + 1] === 'goods') syncPkgs();
  if (ORDER[i + 1] === 'confirm') renderConfirm();
  open(ORDER[i + 1]);
});
async function submit() {
  const err = document.querySelector<HTMLElement>('[data-confirm-error]')!; err.textContent = '';
  nextBtn.disabled = true; nextBtn.textContent = '보내는 중';
  const r = await store.reserve({ show: showId, seats: [...seats].sort(seatSort), balcony: { ...balcony }, goods: Object.fromEntries([...Object.entries(pkgs).map(([id, n]) => [`pkg:${id}`, n] as [string, number]), ...Object.entries(goods)].filter(([, n]) => n > 0)), name: name(), phone: phone(), payer: payer(), amount: total() });
  nextBtn.textContent = '예매 신청';
  if (!r.ok) {
    nextBtn.disabled = false;
    if (r.reason === 'conflict') { err.textContent = `${r.conflict!.join(', ')} 자리가 방금 예매되었습니다. 좌석을 다시 골라 주세요.`; await loadStatus(); open('seats'); }
    else if (r.reason === 'balcony') { const sd = hall.balcony.sides.find((x) => x.id === r.side); err.textContent = `발코니${sd ? ` ${sd.label}` : ''} 자리가 모자랍니다. 인원을 줄여 주세요.`; await loadStatus(); open('seats'); }
    else err.textContent = '보내지 못했습니다. 잠시 뒤 다시 눌러 주세요.';
    return;
  }
  document.querySelector<HTMLElement>('[data-steps]')!.hidden = true;
  const done = document.querySelector<HTMLElement>('[data-done]')!; done.hidden = false;
  renderBill(done.querySelector<HTMLElement>('[data-done-bill]')!, bill());
  const tt = total(); done.querySelector<HTMLElement>('[data-done-total]')!.textContent = tt == null ? '가격 공개 뒤 안내' : won(tt);
  const acc = show.booking.account; const accText = acc.number ? `${acc.bank} ${acc.number} ${acc.holder}` : '추후 공개';
  done.querySelector<HTMLElement>('[data-done-account]')!.textContent = accText;
  done.querySelector<HTMLElement>('[data-done-id]')!.textContent = r.id;
  document.querySelector<HTMLElement>('[data-copy-account]')!.addEventListener('click', async () => { const el = document.querySelector<HTMLElement>('[data-copy-account-done]')!; try { await navigator.clipboard.writeText(acc.number || accText); el.textContent = '복사됨'; } catch { el.textContent = accText; } });
  nextBtn.hidden = true;
  done.scrollIntoView({ block: 'start' });
}
validate();
