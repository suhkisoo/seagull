// 예매 저장소. apiUrl이 있으면 Apps Script 웹 앱, 없으면 이 브라우저의 localStorage(미리보기).
// 요청은 text/plain JSON POST로 보내 CORS 사전 요청을 피한다(Apps Script의 제약).
import { hall, asBalcony, noBalcony, type Balcony } from '../content/hall';
export type Status = '입금대기' | '입금확인' | '취소';
export type Reservation = {
  id: string; createdAt: string; show: string; seats: string[]; balcony: Balcony; goods: Record<string, number>;
  name: string; phone: string; payer: string; amount: number | null; status: Status; confirmedAt?: string; note?: string;
};
export type ShowStatus = { taken: string[]; balconyTaken: Balcony; goodsSold: Record<string, number> };
export type ReserveInput = Omit<Reservation, 'id' | 'createdAt' | 'status' | 'confirmedAt' | 'note'>;
export type ReserveResult = { ok: true; id: string } | { ok: false; reason: 'conflict' | 'balcony' | 'closed' | 'error'; conflict?: string[]; side?: string; message?: string };

export interface Store {
  demo: boolean;
  status(show: string): Promise<ShowStatus>;
  reserve(input: ReserveInput): Promise<ReserveResult>;
  // 관리자
  list(token: string): Promise<Reservation[]>;
  setStatus(token: string, id: string, status: Status): Promise<boolean>;
  releaseExpired(token: string, hours: number): Promise<number>;
}

const KEY = 'seagull-booking-demo';
const genId = () => { const d = new Date(); const s = `${d.getMonth() + 1}`.padStart(2, '0') + `${d.getDate()}`.padStart(2, '0'); return `G${s}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`; };

function demoStore(): Store {
  const read = (): Reservation[] => { try { return (JSON.parse(localStorage.getItem(KEY) || '[]') as Reservation[]).map((r) => ({ ...r, balcony: asBalcony(r.balcony) })); } catch { return []; } };
  const write = (rows: Reservation[]) => { try { localStorage.setItem(KEY, JSON.stringify(rows)); } catch { /* 사생활 보호 모드 */ } };
  const active = (rows: Reservation[], show: string) => rows.filter((r) => r.show === show && r.status !== '취소');
  return {
    demo: true,
    async status(show) {
      const rows = active(read(), show);
      const goodsSold: Record<string, number> = {};
      for (const r of rows) for (const [k, v] of Object.entries(r.goods)) goodsSold[k] = (goodsSold[k] || 0) + v;
      const balconyTaken = noBalcony(); for (const r of rows) { balconyTaken.L += r.balcony.L; balconyTaken.R += r.balcony.R; }
      return { taken: rows.flatMap((r) => r.seats), balconyTaken, goodsSold };
    },
    async reserve(input) {
      const rows = read(); const st = await this.status(input.show);
      const conflict = input.seats.filter((s) => st.taken.includes(s));
      if (conflict.length) return { ok: false, reason: 'conflict', conflict };
      for (const side of hall.balcony.sides) if (st.balconyTaken[side.id] + input.balcony[side.id] > side.max) return { ok: false, reason: 'balcony', side: side.id };
      const id = genId();
      rows.push({ ...input, id, createdAt: new Date().toISOString(), status: '입금대기' });
      write(rows); return { ok: true, id };
    },
    async list() { return read().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)); },
    async setStatus(_t, id, status) { const rows = read(); const r = rows.find((x) => x.id === id); if (!r) return false; r.status = status; if (status === '입금확인') r.confirmedAt = new Date().toISOString(); write(rows); return true; },
    async releaseExpired(_t, hours) { const rows = read(); const limit = Date.now() - hours * 3600000; let n = 0; for (const r of rows) if (r.status === '입금대기' && Date.parse(r.createdAt) < limit) { r.status = '취소'; r.note = '기한 지나 자동 취소'; n++; } write(rows); return n; },
  };
}

function apiStore(url: string): Store {
  const call = async (body: Record<string, unknown>) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(body), redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  };
  return {
    demo: false,
    async status(show) { const r = await call({ action: 'status', show }); return { taken: r.taken || [], balconyTaken: asBalcony(r.balconyTaken), goodsSold: r.goodsSold || {} }; },
    async reserve(input) { try { return await call({ action: 'reserve', ...input }); } catch (e) { return { ok: false, reason: 'error', message: String(e) }; } },
    async list(token) { const r = await call({ action: 'admin', token, op: 'list' }); if (!r.ok) throw new Error(r.message || '거부됨'); return (r.rows as Reservation[]).map((x) => ({ ...x, balcony: asBalcony(x.balcony) })); },
    async setStatus(token, id, status) { const r = await call({ action: 'admin', token, op: 'set', id, status }); return !!r.ok; },
    async releaseExpired(token, hours) { const r = await call({ action: 'admin', token, op: 'release', hours }); return r.ok ? r.count : 0; },
  };
}

export function createStore(apiUrl: string): Store { return apiUrl ? apiStore(apiUrl) : demoStore(); }
