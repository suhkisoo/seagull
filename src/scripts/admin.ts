// 기획팀 관리 화면. 목록, 입금 확인, 자리 풀기, 기한 지난 대기 일괄 풀기.
import { show } from '../content/show';
import { hall } from '../content/hall';
import { fmtDay, fmtTime } from './format';
import { createStore, type Reservation, type Status } from './store';

const root = document.querySelector<HTMLElement>('[data-admin]')!;
const store = createStore(root.dataset.api || '');
const holdHours = Number(root.dataset.holdHours || 24);
if (store.demo) document.querySelector<HTMLElement>('[data-demo]')!.hidden = false;
const login = document.querySelector<HTMLFormElement>('[data-login]')!;
const body = document.querySelector<HTMLElement>('[data-body]')!;
const rowsEl = document.querySelector<HTMLElement>('[data-rows]')!;
const err = document.querySelector<HTMLElement>('[data-admin-error]')!;
let token = ''; try { token = sessionStorage.getItem('seagull-admin') || ''; } catch { /* */ }
let rows: Reservation[] = [];

const showLabel = (id: string) => { const s = show.shows.find((x) => x.id === id); return s ? `${fmtDay(s.startAt)} ${fmtTime(s.startAt)}` : id; };
const won = (n: number | null) => (n == null ? '미정' : `${n.toLocaleString('ko-KR')}원`);
const when = (iso: string) => { const d = new Date(iso); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };

async function load() {
  err.textContent = '';
  try { rows = await store.list(token); render(); return true; }
  catch (e) { err.textContent = `목록을 받지 못했습니다. ${(e as Error).message}`; return false; }
}
function render() {
  const fs = (document.querySelector('[data-filter-show]') as HTMLSelectElement).value;
  const fst = (document.querySelector('[data-filter-status]') as HTMLSelectElement).value;
  const list = rows.filter((r) => (!fs || r.show === fs) && (!fst || r.status === fst));
  rowsEl.replaceChildren(...list.map((r) => {
    const tr = document.createElement('tr'); tr.dataset.status = r.status;
    const expired = r.status === '입금대기' && Date.now() - Date.parse(r.createdAt) > holdHours * 3600000;
    const bal = hall.balcony.sides.filter((x) => r.balcony[x.id] > 0).map((x) => `발코니 ${x.label} ${r.balcony[x.id]}`).join(', ');
    const cells = [r.id, when(r.createdAt), showLabel(r.show), [r.seats.join(' '), bal].filter(Boolean).join(', '),
      Object.entries(r.goods).map(([k, n]) => `${show.goods.find((g) => g.id === k)?.name ?? k} ${n}`).join(', ') || '',
      `${r.name} ${r.phone}${r.payer && r.payer !== r.name ? ` (입금 ${r.payer})` : ''}`, won(r.amount), r.status + (expired ? ' (기한 지남)' : '')];
    for (const c of cells) { const td = document.createElement('td'); td.textContent = c; tr.appendChild(td); }
    const td = document.createElement('td');
    const mk = (label: string, st: Status) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'action'; b.textContent = label; b.addEventListener('click', async () => { b.disabled = true; const ok = await store.setStatus(token, r.id, st); if (!ok) err.textContent = '처리하지 못했습니다'; await load(); }); return b; };
    if (r.status === '입금대기') { td.append(mk('입금 확인', '입금확인'), mk('자리 풀기', '취소')); }
    else if (r.status === '입금확인') td.append(mk('대기로', '입금대기'));
    else td.append(mk('대기로 되살리기', '입금대기'));
    tr.appendChild(td); return tr;
  }));
  // 회차별 집계
  const counts = document.querySelector<HTMLElement>('[data-counts]')!;
  counts.replaceChildren(...show.shows.flatMap((s) => {
    const rs = rows.filter((r) => r.show === s.id && r.status !== '취소');
    const seatsN = rs.reduce((a, r) => a + r.seats.length, 0), paid = rs.filter((r) => r.status === '입금확인').length;
    const bal = hall.balcony.sides.map((x) => `발코니 ${x.label} ${rs.reduce((a, r) => a + r.balcony[x.id], 0)}/${x.max}`).join(', ');
    const dt = document.createElement('dt'); dt.textContent = showLabel(s.id);
    const dd = document.createElement('dd'); dd.textContent = `지정석 ${seatsN}/${hall.rows.reduce((a, r) => a + r.seats.length, 0)}, ${bal}, 입금 확인 ${paid}건, 대기 ${rs.length - paid}건`;
    return [dt, dd];
  }));
}
login.addEventListener('submit', async (e) => {
  e.preventDefault();
  token = (document.getElementById('ad-token') as HTMLInputElement).value;
  const ok = await load();
  const le = document.querySelector<HTMLElement>('[data-login-error]')!;
  if (!ok) { le.textContent = '열지 못했습니다. 암호를 확인해 주세요.'; return; }
  try { sessionStorage.setItem('seagull-admin', token); } catch { /* */ }
  login.hidden = true; body.hidden = false;
});
document.querySelector('[data-refresh]')!.addEventListener('click', load);
document.querySelector('[data-release]')!.addEventListener('click', async () => { const n = await store.releaseExpired(token, holdHours); err.textContent = `${n}건의 자리를 풀었습니다.`; await load(); });
for (const sel of document.querySelectorAll('select')) sel.addEventListener('change', render);
if (token) load().then((ok) => { if (ok) { login.hidden = true; body.hidden = false; } });
