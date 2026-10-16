// 기획팀 관리 화면. 목록, 입금 확인, 자리 풀기, 메모, 자리 직접 넣기, 회차별 좌석표, 찾기, 명단 내려받기.
import { show } from '../content/show';
import { hall, balconySides, allSeats } from '../content/hall';
import { fmtDay, fmtTime } from './format';
import { createStore, type Reservation, type Status } from './store';

const root = document.querySelector<HTMLElement>('[data-admin]')!;
const store = createStore(root.dataset.api || '');
const holdHours = Number(root.dataset.holdHours || 24);
const seatPrice = Number(root.dataset.seatPrice || 0);
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
$(store.demo ? '[data-demo]' : '[data-live]').hidden = false;
const login = $<HTMLFormElement>('[data-login]');
const body = $('[data-body]');
const rowsEl = $('[data-rows]');
const err = $('[data-admin-error]');
const fShow = $<HTMLSelectElement>('[data-filter-show]'), fStatus = $<HTMLSelectElement>('[data-filter-status]'), fQ = $<HTMLInputElement>('[data-filter-q]');
let token = ''; try { token = sessionStorage.getItem('seagull-admin') || ''; } catch { /* */ }
let rows: Reservation[] = [];

const showLabel = (id: string) => { const s = show.shows.find((x) => x.id === id); return s ? `${fmtDay(s.startAt)} ${fmtTime(s.startAt)}` : id; };
const won = (n: number | null) => (n == null ? '미정' : `${n.toLocaleString('ko-KR')}원`);
const when = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const goodsText = (r: Reservation) => Object.entries(r.goods).map(([k, n]) => `${k.startsWith('pkg:') ? show.booking.packages.find((p) => p.id === k.slice(4))?.name ?? k : show.goods.find((g) => g.id === k)?.name ?? k} ${n}`).join(', ');
const placeText = (r: Reservation) => [r.seats.join(' '), balconySides().filter((x) => r.balcony[x.id] > 0).map((x) => `발코니 ${x.label} ${r.balcony[x.id]}`).join(', ')].filter(Boolean).join(', ');
const norm = (s: string) => s.replace(/[\s-]/g, '').toLowerCase();

async function load() {
  err.textContent = '';
  try { rows = await store.list(token); render(); return true; }
  catch (e) { err.textContent = `목록을 받지 못했습니다. ${(e as Error).message}`; return false; }
}
function filtered() {
  const q = norm(fQ.value);
  return rows.filter((r) => (!fShow.value || r.show === fShow.value) && (!fStatus.value || r.status === fStatus.value)
    && (!q || [r.id, r.name, r.phone, r.payer, r.seats.join(' '), r.note ?? ''].some((v) => norm(v).includes(q))));
}
function render() {
  rowsEl.replaceChildren(...filtered().map((r) => {
    const tr = document.createElement('tr'); tr.dataset.status = r.status;
    const expired = r.status === '입금대기' && Date.now() - Date.parse(r.createdAt) > holdHours * 3600000;
    const cells = [r.id, when(r.createdAt), showLabel(r.show), placeText(r), goodsText(r),
      `${r.name} ${r.phone}${r.payer && r.payer !== r.name ? ` (입금 ${r.payer})` : ''}`, won(r.amount), r.status + (expired ? ' (기한 지남)' : '')];
    for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
    tr.appendChild(noteCell(r));
    const td = document.createElement('td');
    const mk = (label: string, st: Status) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'action'; b.textContent = label; b.addEventListener('click', async () => { b.disabled = true; const ok = await store.setStatus(token, r.id, st); if (!ok) err.textContent = '처리하지 못했습니다'; await load(); }); return b; };
    if (r.status === '입금대기') { td.append(mk('입금 확인', '입금확인'), mk('자리 풀기', '취소')); }
    else if (r.status === '입금확인') td.append(mk('대기로', '입금대기'), mk('자리 풀기', '취소'));
    else td.append(mk('대기로 되살리기', '입금대기'));
    tr.appendChild(td); return tr;
  }));
  renderCounts(); renderMap();
}
// 메모. 누르면 그 자리에서 고쳐 쓴다
function noteCell(r: Reservation) {
  const td = document.createElement('td'); td.className = 'admin__note';
  const text = document.createElement('span'); text.textContent = r.note || '';
  const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'action'; edit.textContent = r.note ? '고치기' : '메모';
  edit.addEventListener('click', () => {
    const input = document.createElement('input'); input.value = r.note || ''; input.className = 'admin__note-input'; input.setAttribute('aria-label', `${r.id} 메모`);
    const save = document.createElement('button'); save.type = 'button'; save.className = 'action'; save.textContent = '저장';
    const done = async () => { save.disabled = true; const ok = await store.setNote(token, r.id, input.value.trim()); if (!ok) err.textContent = '메모를 저장하지 못했습니다'; await load(); };
    save.addEventListener('click', done); input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(); } });
    td.replaceChildren(input, save); input.focus();
  });
  td.append(text, edit); return td;
}
function renderCounts() {
  const total = hall.rows.reduce((a, r) => a + r.seats.length, 0);
  $('[data-counts]').replaceChildren(...show.shows.flatMap((s) => {
    const rs = rows.filter((r) => r.show === s.id && r.status !== '취소');
    const seatsN = rs.reduce((a, r) => a + r.seats.length, 0), paid = rs.filter((r) => r.status === '입금확인').length;
    const bal = balconySides().map((x) => `, 발코니 ${x.label} ${rs.reduce((a, r) => a + r.balcony[x.id], 0)}/${x.max}`).join('');
    const dt = document.createElement('dt'); dt.textContent = showLabel(s.id);
    const dd = document.createElement('dd'); dd.textContent = `좌석 ${seatsN}/${total}${bal}, 입금 확인 ${paid}건, 대기 ${rs.length - paid}건`;
    return [dt, dd];
  }));
}

// ----- 좌석표 -----
const hallEl = $('[data-admin-hall]'), mapHint = $('[data-map-hint]');
const addShow = $<HTMLSelectElement>('[data-add-show]'), addSeats = $<HTMLInputElement>('[data-add-seats]'), addAmount = $<HTMLInputElement>('[data-add-amount]');
let amountTouched = false;
const pickedSeats = () => [...new Set(addSeats.value.toUpperCase().split(/[\s,]+/).filter(Boolean))];
function renderMap() {
  const sid = fShow.value;
  hallEl.hidden = !sid; mapHint.hidden = !!sid;
  if (!sid) return;
  const who = new Map<string, Reservation>();
  for (const r of rows) if (r.show === sid && r.status !== '취소') for (const s of r.seats) who.set(s, r);
  const picked = addShow.value === sid ? pickedSeats() : [];
  for (const b of hallEl.querySelectorAll<HTMLButtonElement>('[data-admin-seat]')) {
    const id = b.dataset.adminSeat!, r = who.get(id);
    b.classList.toggle('is-paid', r?.status === '입금확인'); b.classList.toggle('is-wait', r?.status === '입금대기');
    b.classList.toggle('is-picked', !r && picked.includes(id));
    b.title = r ? `${r.name} ${r.phone} · ${r.status}${r.note ? ` · ${r.note}` : ''}` : '빈자리';
  }
}
hallEl.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-admin-seat]'); if (!b) return;
  const id = b.dataset.adminSeat!, sid = fShow.value;
  const r = rows.find((x) => x.show === sid && x.status !== '취소' && x.seats.includes(id));
  if (r) { fQ.value = r.id; render(); rowsEl.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  if (addShow.value !== sid) { addShow.value = sid; addSeats.value = ''; }
  const set = new Set(pickedSeats()); if (set.has(id)) set.delete(id); else set.add(id);
  addSeats.value = [...set].join(' '); syncAmount(); renderMap();
});

// ----- 자리 직접 넣기 -----
function syncAmount() { if (!amountTouched) addAmount.value = String(pickedSeats().filter((x) => allSeats().includes(x)).length * seatPrice); }
addSeats.addEventListener('input', () => { syncAmount(); renderMap(); });
addShow.addEventListener('change', renderMap);
addAmount.addEventListener('input', () => { amountTouched = addAmount.value !== ''; });
$<HTMLFormElement>('[data-add]').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('[data-add-msg]'); msg.textContent = '넣는 중';
  const v = (s: string) => $<HTMLInputElement>(s).value;
  const r = await store.add(token, { show: addShow.value, seats: addSeats.value, name: v('[data-add-name]'), phone: v('[data-add-phone]'), amount: Number(addAmount.value || 0), status: v('[data-add-status]') as Status, note: v('[data-add-note]').trim() });
  if (!r.ok) { msg.textContent = r.message || '넣지 못했습니다'; return; }
  msg.textContent = `넣었습니다. 예매 번호 ${r.id}`;
  for (const s of ['[data-add-seats]', '[data-add-name]', '[data-add-phone]', '[data-add-note]']) $<HTMLInputElement>(s).value = '';
  amountTouched = false; addAmount.value = '';
  await load();
});

// ----- 명단 내려받기. 지금 보이는 목록 그대로, 엑셀에서 한글이 깨지지 않게 BOM을 붙인다 -----
$('[data-export]').addEventListener('click', () => {
  const head = ['예매번호', '신청시각', '회차', '자리', '굿즈', '이름', '연락처', '입금자명', '금액', '상태', '메모'];
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const lines = [head, ...filtered().map((r) => [r.id, when(r.createdAt), showLabel(r.show), placeText(r), goodsText(r), r.name, r.phone, r.payer, r.amount == null ? '' : String(r.amount), r.status, r.note ?? ''])].map((l) => l.map(esc).join(','));
  const url = URL.createObjectURL(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `갈매기_예매명단${fShow.value ? `_${fShow.value}` : ''}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
});

login.addEventListener('submit', async (e) => {
  e.preventDefault();
  token = $<HTMLInputElement>('#ad-token').value;
  const ok = await load();
  const le = $('[data-login-error]');
  if (!ok) { le.textContent = '열지 못했습니다. 암호를 확인해 주세요.'; return; }
  try { sessionStorage.setItem('seagull-admin', token); } catch { /* */ }
  login.hidden = true; body.hidden = false;
});
$('[data-refresh]').addEventListener('click', load);
$('[data-release]').addEventListener('click', async () => { const n = await store.releaseExpired(token, holdHours); err.textContent = `${n}건의 자리를 풀었습니다.`; await load(); });
fShow.addEventListener('change', () => { if (fShow.value) { addShow.value = fShow.value; } render(); });
fStatus.addEventListener('change', render);
fQ.addEventListener('input', render);
if (token) load().then((ok) => { if (ok) { login.hidden = true; body.hidden = false; } });
