/**
 * 9th International Cultural Festival Thailand — Registration App
 * Backend: Google Apps Script + Google Sheets
 *
 * ติดตั้ง: ดูไฟล์ คู่มือติดตั้ง.md
 *   1) สร้าง Google Sheet ใหม่ → Extensions → Apps Script
 *   2) วางไฟล์นี้เป็น Code.gs และสร้างไฟล์ HTML ชื่อ Index วางเนื้อหา Index.html
 *   3) รันฟังก์ชัน setup() หนึ่งครั้ง (อนุญาตสิทธิ์) → ดูรหัสผ่านเริ่มต้นใน Execution log
 *   4) Deploy → New deployment → Web app → Execute as: Me, Who has access: Anyone
 */

const SHEET_NAME = 'Registrations';
const HEADERS = ['Reg ID', 'Timestamp', 'Name', 'Email', 'Phone', 'Community', 'Community (Other)',
                 'Persons', 'Group Name', 'Consent', 'Checked In', 'Check-in Time', 'Attendees'];
const C = { ID:0, TS:1, NAME:2, EMAIL:3, PHONE:4, COMM:5, OTHER:6, PERSONS:7, GROUP:8, CONSENT:9, IN:10, INTIME:11, ATT:12 };
const ATT_SHEET = 'Attendees';   // one row per person: Reg ID, No., Name, Phone
const ID_PREFIX = 'ICF9-';
const MAX_PERSONS = 9;
const DEFAULTS = { CAPACITY: '500', REG_OPEN: 'true', SEND_EMAIL: 'true' };
const EVENT = {
  name: '9th International Cultural Festival, Bangkok',
  date: 'Sunday, 17 January 2027',
  time: '2:00 PM (14:00 hrs)',
  venue: "King Mongkut's University of Technology North Bangkok (KMUTNB)",
  venueTh: 'มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าพระนครเหนือ',
  map: 'https://maps.app.goo.gl/3GUiEf4jivWenQwt6',
  phone: '+66 89 901 2366',
  email: 'internationalculturalexchangeb@gmail.com'
};
const SETTING_KEYS = Object.keys(DEFAULTS);
const SESSION_SECONDS = 6 * 60 * 60;

/* ---------------- web app entry ---------------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle(EVENT.name + ' · Registration')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/* ---------------- JSON API (used when the page is hosted on GitHub Pages) ----------------
   The page POSTs {fn, args} as text/plain (no CORS preflight); only the functions below can be called. */
function doPost(e) {
  const allowed = {
    getPublicInfo: getPublicInfo, register: register,
    adminLogin: adminLogin, adminLogout: adminLogout, adminGetData: adminGetData,
    adminSetCheckIn: adminSetCheckIn, adminDelete: adminDelete, adminSaveSettings: adminSaveSettings
  };
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fn = Object.prototype.hasOwnProperty.call(allowed, req.fn) ? allowed[req.fn] : null;
    if (!fn) throw new Error('Unknown function');
    out = { result: fn.apply(null, Array.isArray(req.args) ? req.args.slice(0, 4) : []) };
  } catch (err) {
    out = { error: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------------- one-time setup ---------------- */
function setup() {
  const sh = getSheet_();
  getAttSheet_();
  const props = PropertiesService.getScriptProperties();
  SETTING_KEYS.forEach(k => { if (props.getProperty(k) === null) props.setProperty(k, DEFAULTS[k]); });
  if (!props.getProperty('NEXT_ID')) props.setProperty('NEXT_ID', String(Math.max(0, sh.getLastRow() - 1)));
  if (!props.getProperty('ADMIN_PASSWORD')) {
    const pw = 'ICF9-' + Utilities.getUuid().slice(0, 8);
    props.setProperty('ADMIN_PASSWORD', pw);
    Logger.log('รหัสผ่านผู้ดูแลเริ่มต้น (Admin password): ' + pw);
  } else {
    Logger.log('มีรหัสผ่านผู้ดูแลอยู่แล้ว — ดู/แก้ได้ที่ Project Settings → Script properties → ADMIN_PASSWORD');
  }
  Logger.log('ตั้งค่าเสร็จแล้ว: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#1c2766').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('E:E').setNumberFormat('@');   // keep leading 0 in phone numbers
    sh.setColumnWidths(1, HEADERS.length, 150);
  } else if (sh.getLastColumn() < HEADERS.length) {   // upgrade an older sheet
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold').setBackground('#1c2766').setFontColor('#ffffff');
  }
  return sh;
}

function getAttSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(ATT_SHEET);
  if (!sh) {
    sh = ss.insertSheet(ATT_SHEET);
    sh.getRange(1, 1, 1, 4).setValues([['Reg ID', 'No.', 'Name', 'Phone']])
      .setFontWeight('bold').setBackground('#1c2766').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('D:D').setNumberFormat('@');
    sh.setColumnWidths(1, 4, 180);
  }
  return sh;
}
// "1) Name — 0812345678" per line  <->  [{name, phone}]
function attToText_(list) { return list.map((a, i) => (i + 1) + ') ' + a.name + ' — ' + a.phone).join('\n'); }
function attFromText_(txt) {
  return String(txt || '').split('\n').filter(String).map(l => {
    const m = l.replace(/^\d+\)\s*/, ''), k = m.lastIndexOf(' — ');
    return k < 0 ? { name: m, phone: '' } : { name: m.slice(0, k), phone: m.slice(k + 3) };
  });
}

function settings_() {
  const p = PropertiesService.getScriptProperties().getProperties();
  const s = {};
  SETTING_KEYS.forEach(k => s[k] = (p[k] !== undefined ? p[k] : DEFAULTS[k]));
  return s;
}

/* ---------------- helpers ---------------- */
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max || 200); }
function safe_(v) { const s = String(v); return /^[=+\-@]/.test(s) ? "'" + s : s; }  // block formula injection
function digits_(v) { return String(v).replace(/\D/g, ''); }
function iso_(v) { return v instanceof Date ? v.toISOString() : (v ? String(v) : ''); }
function rowObj_(r) {
  return {
    id: String(r[C.ID]), ts: iso_(r[C.TS]), name: String(r[C.NAME]), email: String(r[C.EMAIL]),
    phone: String(r[C.PHONE]), community: String(r[C.COMM]), communityOther: String(r[C.OTHER]),
    persons: Number(r[C.PERSONS]) || 0, group: String(r[C.GROUP]), consent: String(r[C.CONSENT]),
    checkedIn: r[C.IN] === true || String(r[C.IN]).toUpperCase() === 'TRUE' || r[C.IN] === 'Yes',
    checkinTime: iso_(r[C.INTIME]),
    attendees: r[C.ATT] ? attFromText_(r[C.ATT]) : [{ name: String(r[C.NAME]), phone: String(r[C.PHONE]) }]
  };
}
function allRows_() {
  const sh = getSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, 1, n, HEADERS.length).getValues().filter(r => r[C.ID]);
}
function usedSeats_(rows) { return rows.reduce((a, r) => a + (Number(r[C.PERSONS]) || 0), 0); }

/* ---------------- public API ---------------- */
function getPublicInfo() {
  const s = settings_();
  return {
    settings: { CAPACITY: s.CAPACITY, REG_OPEN: s.REG_OPEN },
    used: usedSeats_(allRows_())
  };
}

function register(f) {
  f = f || {};
  const name = clean_(f.name, 100);
  const email = clean_(f.email, 120).toLowerCase();
  const phone = clean_(f.phone, 20);
  const community = clean_(f.community, 100);
  const other = clean_(f.communityOther, 100);
  const group = clean_(f.group, 100);
  const persons = parseInt(f.persons, 10);

  if (!name || !community || !f.consent) return { ok: false, code: 'invalid', message: 'Missing required fields' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { ok: false, code: 'invalid', message: 'Invalid email' };
  const pd = digits_(phone);
  if (pd.length < 9 || pd.length > 15) return { ok: false, code: 'invalid', message: 'Invalid phone number' };
  if (!(persons >= 1 && persons <= MAX_PERSONS)) return { ok: false, code: 'invalid', message: 'Invalid number of persons' };
  if (community === 'Others' && !other) return { ok: false, code: 'invalid', message: 'Please specify community' };

  // attendee list: exactly `persons` entries, #1 = registrant
  const rawAtt = Array.isArray(f.attendees) ? f.attendees : [];
  if (rawAtt.length !== persons) return { ok: false, code: 'invalid', message: 'Attendee list does not match number of persons' };
  const attendees = rawAtt.map((a, i) => i === 0 ? { name: name, phone: phone } : { name: clean_(a && a.name, 100), phone: clean_(a && a.phone, 20) });
  for (let i = 1; i < attendees.length; i++) {
    const d = digits_(attendees[i].phone);
    if (!attendees[i].name || d.length < 9 || d.length > 15) return { ok: false, code: 'invalid', message: 'Please enter name and phone for person ' + (i + 1) };
  }

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) return { ok: false, code: 'busy', message: 'System busy, please try again' };
  let result;
  try {
    const s = settings_();
    if (s.REG_OPEN !== 'true') return { ok: false, code: 'closed' };
    const rows = allRows_();
    if (rows.some(r => String(r[C.EMAIL]).toLowerCase() === email || digits_(r[C.PHONE]) === pd)) {
      return { ok: false, code: 'duplicate' };
    }
    const cap = parseInt(s.CAPACITY, 10) || 0;
    const used = usedSeats_(rows);
    if (cap > 0 && used + persons > cap) return { ok: false, code: 'full', remaining: Math.max(0, cap - used) };

    const props = PropertiesService.getScriptProperties();
    const n = (parseInt(props.getProperty('NEXT_ID'), 10) || rows.length) + 1;
    props.setProperty('NEXT_ID', String(n));
    const id = ID_PREFIX + ('000' + n).slice(-4);

    getSheet_().appendRow([id, new Date(), safe_(name), safe_(email), safe_(phone), safe_(community),
      safe_(other), persons, safe_(group), 'Agree', false, '', attToText_(attendees)]);
    getAttSheet_().getRange(getAttSheet_().getLastRow() + 1, 1, attendees.length, 4)
      .setValues(attendees.map((a, i) => [id, i + 1, safe_(a.name), safe_(a.phone)]));
    SpreadsheetApp.flush();
    result = { ok: true, id: id, name: name, persons: persons,
               community: community === 'Others' ? other : community, group: group, attendees: attendees };
    if (s.SEND_EMAIL === 'true') sendConfirmation_(email, result, s);
  } finally {
    lock.releaseLock();
  }
  return result;
}

function sendConfirmation_(to, r, s) {
  try {
    const qr = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(r.id);
    const e = x => String(x).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const html =
      '<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:2px solid #b07d22;border-radius:14px;overflow:hidden">' +
      '<div style="background:#1c2766;color:#fff;padding:16px;text-align:center"><div style="color:#e3c271;font-size:12px;letter-spacing:2px">ADMISSION TICKET · บัตรเข้างาน</div>' +
      '<div style="font-size:20px;font-weight:bold">' + EVENT.name + '</div></div>' +
      '<div style="padding:18px;text-align:center;background:#fffaf0">' +
      '<p>Dear ' + e(r.name) + ',<br>Thank you for registering. Please show this ticket (or your registration ID) at the entrance.</p>' +
      '<div style="font-size:28px;font-weight:bold;color:#a3222b">' + e(r.id) + '</div>' +
      '<img src="' + qr + '" width="180" height="180" alt="QR" style="margin:10px 0">' +
      '<p style="margin:4px 0">Persons: <b>' + e(r.persons) + '</b> · Community: <b>' + e(r.community) + '</b>' + (r.group ? ' · Group: <b>' + e(r.group) + '</b>' : '') + '</p>' +
      (r.attendees.length > 1 ? '<ol style="text-align:left;display:inline-block;margin:6px 0">' + r.attendees.map(a => '<li>' + e(a.name) + ' <span style="color:#6f6556">' + e(a.phone) + '</span></li>').join('') + '</ol>' : '') +
      '<table style="margin:12px auto 0;font-size:14px;text-align:left;border-collapse:collapse">' +
      '<tr><td style="color:#6f6556;padding:3px 10px">Date</td><td><b>' + EVENT.date + '</b></td></tr>' +
      '<tr><td style="color:#6f6556;padding:3px 10px">Time</td><td><b>' + EVENT.time + '</b></td></tr>' +
      '<tr><td style="color:#6f6556;padding:3px 10px">Venue</td><td><b>' + EVENT.venue + '</b><br>' + EVENT.venueTh + '<br><a href="' + EVENT.map + '">Get directions (Google Maps)</a></td></tr>' +
      '<tr><td style="color:#6f6556;padding:3px 10px">Entry</td><td><b>FREE</b> · Basic refreshments provided</td></tr></table>' +
      '<p style="color:#6f6556;font-size:13px;margin-top:14px">Grand performance by Team Shivapriya, under the guidance of Karnataka Kalashree Dr. Sanjay Shantaram<br>' +
      'Questions? ' + EVENT.phone + ' (phone / WhatsApp) · ' + EVENT.email + '</p></div></div>';
    MailApp.sendEmail({ to: to, subject: 'Your registration ' + r.id + ' – ' + EVENT.name, replyTo: EVENT.email,
      htmlBody: html, name: 'Chirantana Academy in Association with KMUTNB' });
  } catch (err) {
    console.warn('Email failed: ' + err);
  }
}

/* ---------------- admin auth ---------------- */
function adminLogin(pw) {
  const cache = CacheService.getScriptCache();
  const fails = parseInt(cache.get('login_fails') || '0', 10);
  if (fails >= 5) return { ok: false, code: 'locked' };
  const real = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!real || String(pw) !== real) {
    cache.put('login_fails', String(fails + 1), 300);
    Utilities.sleep(800);
    return { ok: false, code: 'bad' };
  }
  const token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('sess_' + token, '1', SESSION_SECONDS);
  return { ok: true, token: token };
}
function adminLogout(token) { if (token) CacheService.getScriptCache().remove('sess_' + token); return { ok: true }; }
function auth_(token) {
  if (!token || !CacheService.getScriptCache().get('sess_' + token)) throw new Error('AUTH');
}

/* ---------------- admin API ---------------- */
function adminGetData(token) {
  auth_(token);
  return { rows: allRows_().map(rowObj_), settings: settings_(), sheetUrl: SpreadsheetApp.getActiveSpreadsheet().getUrl() };
}

function findRow_(id) {
  const sh = getSheet_();
  const n = sh.getLastRow() - 1;
  if (n < 1) return -1;
  const ids = sh.getRange(2, 1, n, 1).getValues();
  for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(id)) return i + 2;
  return -1;
}

function adminSetCheckIn(token, id, value) {
  auth_(token);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const sh = getSheet_(), row = findRow_(id);
    if (row < 0) return { ok: false, message: 'ไม่พบรหัส ' + id };
    sh.getRange(row, C.IN + 1, 1, 2).setValues([[!!value, value ? new Date() : '']]);
    SpreadsheetApp.flush();
    return { ok: true, row: rowObj_(sh.getRange(row, 1, 1, HEADERS.length).getValues()[0]) };
  } finally { lock.releaseLock(); }
}

function adminDelete(token, id) {
  auth_(token);
  const lock = LockService.getScriptLock(); lock.waitLock(15000);
  try {
    const row = findRow_(id);
    if (row < 0) return { ok: false, message: 'ไม่พบรหัส ' + id };
    getSheet_().deleteRow(row);
    const as = getAttSheet_(), n = as.getLastRow() - 1;
    if (n > 0) {
      const ids = as.getRange(2, 1, n, 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === String(id)) as.deleteRow(i + 2);
    }
    return { ok: true };
  } finally { lock.releaseLock(); }
}

function adminSaveSettings(token, s) {
  auth_(token);
  s = s || {};
  const props = PropertiesService.getScriptProperties();
  const out = {
    CAPACITY: String(Math.max(0, parseInt(s.CAPACITY, 10) || 0)),
    REG_OPEN: String(s.REG_OPEN) === 'true' ? 'true' : 'false',
    SEND_EMAIL: String(s.SEND_EMAIL) === 'true' ? 'true' : 'false'
  };
  props.setProperties(out);
  return { ok: true, settings: settings_() };
}
