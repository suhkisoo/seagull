/**
 * 〈갈매기〉 예매 백엔드. Google Apps Script 웹 앱 하나와 구글 시트 하나.
 * 시트 "예매" 탭이 장부다. 기획팀은 이 시트를 직접 봐도 되고, 사이트의 /admin/ 화면에서 처리해도 된다.
 *
 * 설치(기획팀, 10분):
 *  1. 구글 시트를 새로 만든다. 이름은 아무거나(예: 갈매기 예매).
 *  2. 확장 프로그램 → Apps Script. 이 파일 내용을 전부 붙여 넣는다.
 *  3. 아래 ADMIN_TOKEN을 기획팀만 아는 긴 암호로 바꾼다. 이 암호가 /admin/ 화면의 관리 암호다.
 *  4. 배포 → 새 배포 → 유형 "웹 앱". 실행 계정 "나", 액세스 권한 "모든 사용자". 배포한다.
 *  5. 나온 웹 앱 주소(https://script.google.com/macros/s/.../exec)를 src/content/show.ts의 booking.apiUrl에 넣고 사이트를 다시 빌드한다.
 *  6. 코드를 고치면 배포 → 배포 관리 → 새 버전으로 다시 배포해야 반영된다.
 *
 * 자리 풀기: 시트에서 상태 칸을 "취소"로 바꿔도 되고, /admin/에서 "자리 풀기"를 눌러도 된다. 되돌리려면 "입금대기"로.
 */
var ADMIN_TOKEN = '여기에-기획팀만-아는-긴-암호';
var SHEET = '예매';
var BALCONY_MAX = 8;
var HEAD = ['예매번호', '신청시각', '회차', '좌석', '발코니', '굿즈', '이름', '연락처', '입금자명', '금액', '상태', '확인시각', '메모'];

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET);
  if (!sh) { sh = ss.insertSheet(SHEET); sh.appendRow(HEAD); sh.setFrozenRows(1); }
  return sh;
}
function rows_() {
  var sh = sheet_(); var v = sh.getDataRange().getValues(); var out = [];
  for (var i = 1; i < v.length; i++) {
    var r = v[i]; if (!r[0]) continue;
    out.push({ row: i + 1, id: String(r[0]), createdAt: r[1] instanceof Date ? r[1].toISOString() : String(r[1]), show: String(r[2]),
      seats: String(r[3] || '').split(/[ ,]+/).filter(Boolean), balcony: Number(r[4] || 0), goods: parseGoods_(String(r[5] || '')),
      name: String(r[6] || ''), phone: String(r[7] || ''), payer: String(r[8] || ''), amount: r[9] === '' || r[9] === null ? null : Number(r[9]),
      status: String(r[10] || '입금대기'), confirmedAt: r[11] ? (r[11] instanceof Date ? r[11].toISOString() : String(r[11])) : '', note: String(r[12] || '') });
  }
  return out;
}
function parseGoods_(s) { var o = {}; s.split(',').forEach(function (p) { var m = p.trim().match(/^(.+?)\s+(\d+)$/); if (m) o[m[1]] = Number(m[2]); }); return o; }
function goodsText_(g) { return Object.keys(g || {}).filter(function (k) { return g[k] > 0; }).map(function (k) { return k + ' ' + g[k]; }).join(', '); }
function status_(showId) {
  var taken = [], bal = 0, sold = {};
  rows_().forEach(function (r) {
    if (r.show !== showId || r.status === '취소') return;
    taken = taken.concat(r.seats); bal += r.balcony;
    Object.keys(r.goods).forEach(function (k) { sold[k] = (sold[k] || 0) + r.goods[k]; });
  });
  return { taken: taken, balconyTaken: bal, goodsSold: sold };
}
function newId_() {
  var d = new Date(); var md = ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'G' + md + '-' + s;
}
function out_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function doGet(e) {
  var p = e.parameter || {};
  if (p.action === 'status' && p.show) return out_(status_(p.show));
  return out_({ ok: true, service: 'seagull-booking' });
}
function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) { return out_({ ok: false, reason: 'error', message: 'bad json' }); }
  if (body.action === 'status') return out_(status_(String(body.show || '')));
  if (body.action === 'reserve') return out_(reserve_(body));
  if (body.action === 'admin') return out_(admin_(body));
  return out_({ ok: false, reason: 'error', message: 'unknown action' });
}
function reserve_(b) {
  var lock = LockService.getScriptLock(); lock.waitLock(10000); // 같은 자리를 둘이 동시에 잡지 않게
  try {
    var showId = String(b.show || ''); var seats = (b.seats || []).map(String); var balcony = Number(b.balcony || 0);
    if (!showId || (seats.length === 0 && balcony === 0)) return { ok: false, reason: 'error', message: 'empty' };
    if (!b.name || !b.phone) return { ok: false, reason: 'error', message: 'who' };
    var st = status_(showId);
    var conflict = seats.filter(function (s) { return st.taken.indexOf(s) >= 0; });
    if (conflict.length) return { ok: false, reason: 'conflict', conflict: conflict };
    if (st.balconyTaken + balcony > BALCONY_MAX) return { ok: false, reason: 'balcony' };
    var id = newId_();
    sheet_().appendRow([id, new Date(), showId, seats.join(' '), balcony, goodsText_(b.goods), String(b.name), String(b.phone), String(b.payer || b.name), b.amount === null || b.amount === undefined ? '' : Number(b.amount), '입금대기', '', '']);
    return { ok: true, id: id };
  } finally { lock.releaseLock(); }
}
function admin_(b) {
  if (String(b.token) !== ADMIN_TOKEN) return { ok: false, message: '암호가 다릅니다' };
  var sh = sheet_();
  if (b.op === 'list') return { ok: true, rows: rows_().map(function (r) { delete r.row; return r; }).reverse() };
  if (b.op === 'set') {
    var r = rows_().filter(function (x) { return x.id === String(b.id); })[0]; if (!r) return { ok: false };
    var st = String(b.status); if (['입금대기', '입금확인', '취소'].indexOf(st) < 0) return { ok: false };
    sh.getRange(r.row, 11).setValue(st); sh.getRange(r.row, 12).setValue(st === '입금확인' ? new Date() : '');
    return { ok: true };
  }
  if (b.op === 'release') {
    var hours = Number(b.hours || 24), limit = Date.now() - hours * 3600000, n = 0;
    rows_().forEach(function (r) { if (r.status === '입금대기' && Date.parse(r.createdAt) < limit) { sh.getRange(r.row, 11).setValue('취소'); sh.getRange(r.row, 13).setValue('기한 지나 자리 풀림'); n++; } });
    return { ok: true, count: n };
  }
  return { ok: false };
}
