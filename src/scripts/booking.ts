// 예매 흐름. 다섯 단계가 차례로 열린다. 고른 자리에는 호박빛이 켜진다. 저장은 store.ts.
import { show } from '../content/show';
import { hall } from '../content/hall';
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
let balcony = 0;
const goods: Record<string, number> = {};
let status: ShowStatus = { taken: [], balconyTaken: 0, goodsSold: {} };

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
  if (k === 'seats') return [seats.size ? `지정석 ${[...seats].sort(seatSort).join(', ')}` : '', balcony ? `발코니 ${balcony}명` : ''].filter(Boolean).join(' · ');
  if (k === 'goods') { const g = Object.entries(goods).filter(([, n]) => n > 0).map(([id, n]) => `${show.goods.find((x) => x.id === id)?.name} ${n}`); return g.length ? g.join(', ') : '없음'; }
  if (k === 'who') return `${name()} ${phone()}`;
  return '';
}
function validate() {
  let ok = false, msg = '';
  if (current === 'show') ok = !!showId;
  else if (current === 'seats') { ok = seats.size + balcony > 0; if (!ok) msg = '좌석을 고르거나 발코니 인원을 정해 주세요'; }
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
  try { status = await store.status(showId); } catch { status = { taken: [], balconyTaken: 0, goodsSold: {} }; }
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
    btn.classList.toggle('is-taken', taken); btn.disabled = taken || seatPrice == null;
    btn.classList.toggle('is-picked', seats.has(id)); btn.setAttribute('aria-pressed', String(seats.has(id)));
  }
  const left = Math.max(0, hall.balcony.max - status.balconyTaken);
  if (balcony > left) balcony = left;
  document.querySelector<HTMLElement>('[data-balcony-count]')!.textContent = String(balcony);
  document.querySelector<HTMLElement>('[data-balcony-left]')!.textContent = left === 0 ? '남은 자리 없음' : `${left}명 남음`;
  (document.querySelector('[data-balcony-plus]') as HTMLButtonElement).disabled = balcony >= left || balconyPrice == null;
  (document.querySelector('[data-balcony-minus]') as HTMLButtonElement).disabled = balcony <= 0;
}
document.querySelector('[data-hall]')!.addEventListener('click', (e) => {
  const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-seat]'); if (!btn || btn.disabled) return;
  const id = btn.dataset.seat!; if (seats.has(id)) seats.delete(id); else seats.add(id);
  renderSeats(); validate();
});
document.querySelector('[data-balcony-plus]')!.addEventListener('click', () => { balcony++; renderSeats(); validate(); });
document.querySelector('[data-balcony-minus]')!.addEventListener('click', () => { balcony = Math.max(0, balcony - 1); renderSeats(); validate(); });

// ----- 3. 굿즈 -----
for (const row of document.querySelectorAll<HTMLElement>('[data-goods]')) {
  const id = row.dataset.goods!; goods[id] = 0;
  if (goodsPreview != null && !row.dataset.price) { // 미리보기 가격
    row.querySelector('.goods__price')!.textContent = won(goodsPreview);
    const soon = row.querySelector('.goods__soon'); if (soon) { const span = document.createElement('span'); span.className = 'qty'; span.innerHTML = '<button class="qty__btn" type="button" data-qty-minus aria-label="줄이기">−</button><output class="qty__n" data-qty>0</output><button class="qty__btn" type="button" data-qty-plus aria-label="늘리기">+</button>'; soon.replaceWith(span); }
  }
  const out = row.querySelector<HTMLElement>('[data-qty]');
  const upd = () => { if (out) out.textContent = String(goods[id]); };
  row.querySelector('[data-qty-plus]')?.addEventListener('click', () => { const stock = row.dataset.stock ? Number(row.dataset.stock) - (status.goodsSold[id] || 0) : 99; if (goods[id] < Math.min(10, stock)) goods[id]++; upd(); });
  row.querySelector('[data-qty-minus]')?.addEventListener('click', () => { goods[id] = Math.max(0, goods[id] - 1); upd(); });
}

// ----- 4. 예매자 -----
const name = () => (document.getElementById('bk-name') as HTMLInputElement).value.trim();
const phone = () => (document.getElementById('bk-phone') as HTMLInputElement).value.trim();
const payer = () => (document.getElementById('bk-payer') as HTMLInputElement).value.trim() || name();
for (const id of ['bk-name', 'bk-phone', 'bk-payer']) document.getElementById(id)!.addEventListener('input', validate);

// ----- 5. 확인 -----
function total(): number | null {
  if (seats.size && seatPrice == null) return null;
  if (balcony && balconyPrice == null) return null;
  let sum = seats.size * (seatPrice ?? 0) + balcony * (balconyPrice ?? 0);
  for (const [id, n] of Object.entries(goods)) { const pr = goodsPrice(id); if (n > 0) { if (pr == null) return null; sum += n * pr; } }
  return sum;
}
function bill(): [string, string][] {
  const s = show.shows.find((x) => x.id === showId)!;
  const rows: [string, string][] = [['회차', `${fmtDay(s.startAt)} ${fmtTime(s.startAt)}`]];
  if (seats.size) rows.push(['지정석', `${[...seats].sort(seatSort).join(', ')} (${seats.size}석${seatPrice != null ? `, ${won(seats.size * seatPrice)}` : ''})`]);
  if (balcony) rows.push(['발코니', `${balcony}명${balconyPrice != null ? `, ${won(balcony * balconyPrice)}` : ''}`]);
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
  if (ORDER[i + 1] === 'confirm') renderConfirm();
  open(ORDER[i + 1]);
});
async function submit() {
  const err = document.querySelector<HTMLElement>('[data-confirm-error]')!; err.textContent = '';
  nextBtn.disabled = true; nextBtn.textContent = '보내는 중';
  const r = await store.reserve({ show: showId, seats: [...seats].sort(seatSort), balcony, goods: Object.fromEntries(Object.entries(goods).filter(([, n]) => n > 0)), name: name(), phone: phone(), payer: payer(), amount: total() });
  nextBtn.textContent = '예매 신청';
  if (!r.ok) {
    nextBtn.disabled = false;
    if (r.reason === 'conflict') { err.textContent = `${r.conflict!.join(', ')} 자리가 방금 예매되었습니다. 좌석을 다시 골라 주세요.`; await loadStatus(); open('seats'); }
    else if (r.reason === 'balcony') { err.textContent = '발코니 자리가 모자랍니다. 인원을 줄여 주세요.'; await loadStatus(); open('seats'); }
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
