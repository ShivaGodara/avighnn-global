/**
 * AVIGHNN GLOBAL — quote form receiver
 * ============================================================
 * Deployed as a Google Apps Script Web App bound to the inquiry
 * spreadsheet. The website posts one JSON body per inquiry; this
 * appends a row and (optionally) emails a notification.
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone
 * Copy the /exec URL into ENDPOINT in main.js.
 *
 * The browser sends Content-Type: text/plain so the request stays a
 * CORS "simple request" and no preflight is needed — Apps Script web
 * apps cannot answer an OPTIONS preflight.
 * ============================================================ */

/* ---- configuration ---------------------------------------- */

var SHEET_NAME    = 'Inquiries';
var NOTIFY_EMAIL  = 'aviiral@avighnnglobal.com';  /* '' to disable email */
var NOTIFY_SUBJECT = 'New quote request — Avighnn Global';

/* Column order. Add a field here and in FIELD_LABELS to capture more;
   existing rows keep their shape because the header is written once. */
var FIELDS = ['name', 'company', 'email', 'port', 'type', 'quantity', 'specs'];

var FIELD_LABELS = {
  name: 'Name', company: 'Company', email: 'Email', port: 'Country / Port',
  type: 'Product type', quantity: 'Quantity', specs: 'Specifications'
};

var REQUIRED = ['name', 'company', 'email', 'specs'];
var MAX_LEN  = 5000;   /* per field, guards against paste-bombs */

/* ---- entry points ------------------------------------------ */

function doPost(e) {
  try {
    var data = parseBody(e);

    /* Honeypot: a real person never fills a hidden field. Answer OK so
       the bot has nothing to learn, but write nothing. */
    if (String(data.website || '').trim()) return json({ ok: true });

    var missing = REQUIRED.filter(function (k) { return !String(data[k] || '').trim(); });
    if (missing.length) {
      return json({ ok: false, error: 'Missing required field: ' + missing.join(', ') });
    }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(data.email).trim())) {
      return json({ ok: false, error: 'Invalid email address.' });
    }

    var row = appendRow(data);
    notify(data);
    return json({ ok: true, row: row });
  } catch (err) {
    console.error(err);
    return json({ ok: false, error: 'Server error. Please email us directly.' });
  }
}

/** Health check — open the /exec URL in a browser to verify a deployment. */
function doGet() {
  return json({ ok: true, service: 'avighnn-global-inquiries' });
}

/**
 * Diagnostic. Run this from the Apps Script editor (Run > whereAmI) and read
 * the execution log to see which spreadsheet and tab rows are actually going
 * to — rows land in the SHEET_NAME tab of the *bound* spreadsheet, which is
 * not always the tab you have open.
 */
function whereAmI() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getSheet();
  console.log('Spreadsheet: ' + ss.getName());
  console.log('URL:         ' + ss.getUrl());
  console.log('Tab:         ' + sheet.getName());
  console.log('Rows:        ' + sheet.getLastRow() + ' (1 is the header)');
}

/* ---- sheet -------------------------------------------------- */

function appendRow(data) {
  /* Concurrent submissions would otherwise race for the same row. */
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sheet = getSheet();
    var values = [new Date()].concat(FIELDS.map(function (k) { return clean(data[k]); }));
    values.push(clean(data.page), clean(data.referrer), clean(data.userAgent));
    sheet.appendRow(values);
    return sheet.getLastRow();
  } finally {
    lock.releaseLock();
  }
}

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    var header = ['Timestamp']
      .concat(FIELDS.map(function (k) { return FIELD_LABELS[k] || k; }))
      .concat(['Page', 'Referrer', 'User agent']);
    sheet.appendRow(header);
    sheet.getRange(1, 1, 1, header.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/* ---- email -------------------------------------------------- */

function notify(data) {
  if (!NOTIFY_EMAIL) return;
  var lines = FIELDS.map(function (k) {
    return (FIELD_LABELS[k] || k) + ': ' + (clean(data[k]) || '—');
  });
  lines.push('', 'Page: ' + (clean(data.page) || '—'));
  try {
    MailApp.sendEmail({
      to: NOTIFY_EMAIL,
      subject: NOTIFY_SUBJECT + ' — ' + (clean(data.company) || clean(data.name)),
      body: lines.join('\n'),
      replyTo: clean(data.email)
    });
  } catch (err) {
    /* A failed notification must not lose the row that is already saved. */
    console.error('Notification failed: ' + err);
  }
}

/* ---- helpers ------------------------------------------------ */

function parseBody(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (err) { /* fall through */ }
  }
  return (e && e.parameter) || {};   /* form-encoded / no-cors fallback */
}

function clean(v) {
  return String(v == null ? '' : v).trim().slice(0, MAX_LEN);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
