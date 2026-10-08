/**
 * 〈갈매기〉 예매 백엔드. Google Apps Script 웹 앱 하나와 구글 시트 하나.
 * 시트 "예매" 탭이 장부다. 기획팀은 이 시트를 직접 봐도 되고, 사이트의 /admin/ 화면에서 처리해도 된다.
 *
 * 설치(연출 또는 기획팀, 10분). 시트를 만든 구글 계정이 장부의 주인이 된다:
 *  1. 구글 시트를 새로 만든다. 이름은 아무거나(예: 갈매기 예매).
 *  2. 확장 프로그램 → Apps Script. 이 파일 내용을 전부 붙여 넣고 저장한다.
 *  3. 왼쪽 톱니바퀴(프로젝트 설정) → 맨 아래 "스크립트 속성" → 속성 추가.
 *     속성 이름 ADMIN_TOKEN, 값은 관리 암호. 이 암호가 /admin/ 화면의 암호다.
 *     저장소가 공개라서 암호는 이 파일에 적지 않는다.
 *  4. 배포 → 새 배포 → 유형 "웹 앱". 실행 계정 "나", 액세스 권한 "모든 사용자". 배포한다. 권한 허용을 묻으면 허용한다.
 *  5. 나온 웹 앱 주소(https://script.google.com/macros/s/.../exec)를 src/content/show.ts의 booking.apiUrl에 넣고 사이트를 다시 빌드한다.
 *  6. 코드를 고치면 배포 → 배포 관리 → 연필 → 버전 "새 버전"으로 다시 배포해야 반영된다. 주소는 그대로다.
 *
 * 금액은 이 파일이 다시 센다. 브라우저가 보낸 금액은 믿지 않는다. 아래 CONFIG의 값은 show.ts, hall.ts와 같아야 하고,
 * 다르면 사이트 빌드가 멈춘다(astro.config.mjs). 가격을 바꾸면 show.ts와 여기 둘 다 고치고 Apps Script도 새 버전으로 배포한다.
 *
 * 자리 풀기: 시트에서 상태 칸을 "취소"로 바꿔도 되고, /admin/에서 "자리 풀기"를 눌러도 된다. 되돌리려면 "입금대기"로.
 */
var CONFIG = /*config*/{"seatPrice":9000,"balconyPrice":9000,"packages":{"ticket":9000,"stamp":11000,"pin":13000,"book":20000,"book-stamp":21000,"book-pin":22000,"all":30000},"goods":{"programbook":15000,"pinbadge":4000,"stamp-sticker":3000},"balconyMax":{"L":4,"R":4},"rows":{"H":10,"G":12,"F":12,"E":12,"D":12,"C":12,"B":12,"A":12},"shows":["1112-1500","1112-1930","1113-1500","1113-1930","1114-1300","1114-1800"]}/*end*/;
var SHEET = '예매';
var HEAD = ['예매번호', '신청시각', '회차', '좌석', '발코니 왼쪽', '발코니 오른쪽', '굿즈', '이름', '연락처', '입금자명', '금액', '상태', '확인시각', '메모'];
var COL_STATUS = 12, COL_CONFIRMED = 13, COL_NOTE = 14; // 1부터 센 열 번호
var MAX_TICKETS = 20, MAX_GOODS = 20; // 한 번에 받는 최대 장수와 개수
var LOCK_FAILS = 8, LOCK_SECONDS = 600; // 관리 암호를 이만큼 틀리면 이 시간 동안 관리 화면을 닫는다

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
      seats: String(r[3] || '').split(/[ ,]+/).filter(Boolean), balcony: { L: Number(r[4] || 0), R: Number(r[5] || 0) }, goods: parseGoods_(String(r[6] || '')),
      name: String(r[7] || ''), phone: String(r[8] || ''), payer: String(r[9] || ''), amount: r[10] === '' || r[10] === null ? null : Number(r[10]),
      status: String(r[11] || '입금대기'), confirmedAt: r[12] ? (r[12] instanceof Date ? r[12].toISOString() : String(r[12])) : '', note: String(r[13] || '') });
  }
  return out;
}
function parseGoods_(s) { var o = {}; s.split(',').forEach(function (p) { var m = p.trim().match(/^(.+?)\s+(\d+)$/); if (m) o[m[1]] = Number(m[2]); }); return o; }
function goodsText_(g) { return Object.keys(g || {}).filter(function (k) { return g[k] > 0; }).map(function (k) { return k + ' ' + g[k]; }).join(', '); }
function status_(showId) {
  var taken = [], bal = { L: 0, R: 0 }, sold = {};
  rows_().forEach(function (r) {
    if (r.show !== showId || r.status === '취소') return;
    taken = taken.concat(r.seats); bal.L += r.balcony.L; bal.R += r.balcony.R;
    Object.keys(r.goods).forEach(function (k) { sold[k] = (sold[k] || 0) + r.goods[k]; });
  });
  return { taken: taken, balconyTaken: bal, goodsSold: sold };
}
function newId_() {
  var d = new Date(); var md = Utilities.formatDate(d, 'Asia/Seoul', 'MMdd');
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', s = '';
  for (var i = 0; i < 4; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
  return 'G' + md + '-' + s;
}
// 시트가 =, +, -, @로 시작하는 글을 수식으로 읽지 않게
function text_(v, max) { var s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max || 60); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function int_(v) { var n = Math.floor(Number(v)); return isFinite(n) && n > 0 ? n : 0; }
function seatOk_(id) { var m = /^([A-Z])(\d{1,2})$/.exec(id); return !!m && CONFIG.rows[m[1]] >= Number(m[2]) && Number(m[2]) >= 1; }
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
  var showId = String(b.show || '');
  if (CONFIG.shows.indexOf(showId) < 0) return { ok: false, reason: 'error', message: 'show' };
  var seats = [], seen = {};
  (b.seats || []).forEach(function (s) { s = String(s); if (seatOk_(s) && !seen[s]) { seen[s] = 1; seats.push(s); } });
  if (seats.length !== (b.seats || []).length) return { ok: false, reason: 'error', message: 'seat' };
  var balcony = { L: int_((b.balcony || {}).L), R: int_((b.balcony || {}).R) };
  var tickets = seats.length + balcony.L + balcony.R;
  if (tickets === 0 || tickets > MAX_TICKETS) return { ok: false, reason: 'error', message: 'empty' };
  var name = text_(b.name, 30), phone = text_(b.phone, 20), payer = text_(b.payer || b.name, 30);
  if (name.length < 2 || !/\d{3}-?\d{3,4}-?\d{4}/.test(phone)) return { ok: false, reason: 'error', message: 'who' };
  // 티켓 구성(pkg:)과 따로 사는 굿즈. 구성은 티켓 장수와 같아야 한다. 모자라면 '티켓'으로 채운다
  var goods = {}, pk = 0, amount = 0, gn = 0;
  Object.keys(b.goods || {}).forEach(function (k) {
    var n = int_(b.goods[k]); if (!n) return;
    if (k.indexOf('pkg:') === 0) { var p = CONFIG.packages[k.slice(4)]; if (p == null) return; goods[k] = n; pk += n; amount += n * p; }
    else if (CONFIG.goods[k] != null) { goods[k] = n; gn += n; amount += n * CONFIG.goods[k]; }
  });
  if (pk > tickets || gn > MAX_GOODS) return { ok: false, reason: 'error', message: 'goods' };
  if (pk < tickets) { var base = 'pkg:ticket'; goods[base] = (goods[base] || 0) + tickets - pk; amount += (tickets - pk) * CONFIG.packages.ticket; }
  var note = b.amount != null && Number(b.amount) !== amount ? '화면 금액 ' + Number(b.amount) + '원과 다름' : '';

  var lock = LockService.getScriptLock(); lock.waitLock(10000); // 같은 자리를 둘이 동시에 잡지 않게
  try {
    var st = status_(showId);
    var conflict = seats.filter(function (s) { return st.taken.indexOf(s) >= 0; });
    if (conflict.length) return { ok: false, reason: 'conflict', conflict: conflict };
    if (st.balconyTaken.L + balcony.L > CONFIG.balconyMax.L) return { ok: false, reason: 'balcony', side: 'L' };
    if (st.balconyTaken.R + balcony.R > CONFIG.balconyMax.R) return { ok: false, reason: 'balcony', side: 'R' };
    var id = newId_();
    sheet_().appendRow([id, new Date(), showId, seats.join(' '), balcony.L, balcony.R, goodsText_(goods), name, phone, payer, amount, '입금대기', '', note]);
    return { ok: true, id: id, amount: amount };
  } finally { lock.releaseLock(); }
}
function admin_(b) {
  var token = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN');
  if (!token) return { ok: false, message: '관리 암호가 아직 설정되지 않았습니다(스크립트 속성 ADMIN_TOKEN)' };
  var cache = CacheService.getScriptCache(), fails = Number(cache.get('admin-fails') || 0);
  if (fails >= LOCK_FAILS) return { ok: false, message: '암호를 여러 번 틀려 10분 동안 닫혔습니다' };
  if (String(b.token) !== token) { cache.put('admin-fails', String(fails + 1), LOCK_SECONDS); return { ok: false, message: '암호가 다릅니다' }; }
  var sh = sheet_();
  if (b.op === 'list') return { ok: true, rows: rows_().map(function (r) { delete r.row; return r; }).reverse() };
  if (b.op === 'set') {
    var r = rows_().filter(function (x) { return x.id === String(b.id); })[0]; if (!r) return { ok: false };
    var st = String(b.status); if (['입금대기', '입금확인', '취소'].indexOf(st) < 0) return { ok: false };
    sh.getRange(r.row, COL_STATUS).setValue(st); sh.getRange(r.row, COL_CONFIRMED).setValue(st === '입금확인' ? new Date() : '');
    return { ok: true };
  }
  if (b.op === 'release') {
    var hours = Number(b.hours || 24), limit = Date.now() - hours * 3600000, n = 0;
    rows_().forEach(function (r) { if (r.status === '입금대기' && Date.parse(r.createdAt) < limit) { sh.getRange(r.row, COL_STATUS).setValue('취소'); sh.getRange(r.row, COL_NOTE).setValue('기한 지나 자리 풀림'); n++; } });
    return { ok: true, count: n };
  }
  return { ok: false };
}
