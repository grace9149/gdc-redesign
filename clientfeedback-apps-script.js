// ─────────────────────────────────────────────────────────────────────────────
// GDC Client Feedback — Google Apps Script
//
// SETUP INSTRUCTIONS:
//  1. Open the Google Sheet:
//     https://docs.google.com/spreadsheets/d/1X0V8XmOwbkaNgElN_0NhN1FZB8WEBj_8MmduOql_yzI
//  2. Click Extensions → Apps Script
//  3. Delete any existing code and paste this entire file
//  4. Click Save (floppy disk icon)
//  5. Click Deploy → New Deployment
//     - Type: Web app
//     - Execute as: Me
//     - Who has access: Anyone
//  6. Click Deploy → copy the Web App URL
//  7. Paste that URL into clientfeedback.html where it says:
//        const APPS_SCRIPT_URL = 'PASTE_YOUR_APPS_SCRIPT_URL_HERE';
//  8. Commit & push clientfeedback.html
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_ID    = '1X0V8XmOwbkaNgElN_0NhN1FZB8WEBj_8MmduOql_yzI';
var NOTIFY_EMAIL = 'hr@gracedouganconsulting.com';

var HEADERS = [
  'Timestamp',
  'First Name',
  'Last Name',
  'Company',
  'Email',
  'Date',
  'Topic',
  'Rating',
  'Your Thoughts',
  'Suggestions'
];

// ── Handle POST from the feedback form ───────────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheets()[0]; // writes to the first (active) sheet

    // Add header row if the sheet is empty
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length)
           .setFontWeight('bold')
           .setBackground('#F2EDE5')
           .setFontColor('#B8975A');
      sheet.setFrozenRows(1);
    }

    // Append the new response
    sheet.appendRow([
      new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }),
      data.first_name   || '',
      data.last_name    || '',
      data.company      || '',
      data.email        || '',
      data.feedback_date || '',
      data.topic        || '',
      data.rating ? data.rating + ' / 5' : '',
      data.feedback_notes || '',
      data.suggestions  || ''
    ]);

    // Auto-resize columns for readability
    sheet.autoResizeColumns(1, HEADERS.length);

    // ── Email notification ────────────────────────────────────────────────
    var name    = (data.first_name || '') + ' ' + (data.last_name || '');
    var company = data.company ? ' · ' + data.company : '';
    var rating  = data.rating  ? data.rating + '/5 stars' : 'Not rated';

    var subject = 'New Client Feedback — ' + name.trim() + company;

    var body =
      'New feedback received via gracedouganconsulting.com\n' +
      '─────────────────────────────────────────────\n' +
      'Name:     ' + name.trim()             + '\n' +
      'Company:  ' + (data.company      || '—') + '\n' +
      'Email:    ' + (data.email        || '—') + '\n' +
      'Date:     ' + (data.feedback_date || '—') + '\n' +
      'Topic:    ' + (data.topic        || '—') + '\n' +
      'Rating:   ' + rating                    + '\n\n' +
      'YOUR THOUGHTS\n' +
      (data.feedback_notes || '—')              + '\n\n' +
      'SUGGESTIONS\n' +
      (data.suggestions    || '—')              + '\n\n' +
      '─────────────────────────────────────────────\n' +
      'View all responses in Google Sheets:\n' +
      'https://docs.google.com/spreadsheets/d/' + SHEET_ID;

    GmailApp.sendEmail(NOTIFY_EMAIL, subject, body);

    return ContentService
      .createTextOutput(JSON.stringify({ result: 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ result: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── Handle GET (browser sanity-check) ────────────────────────────────────────
function doGet() {
  return ContentService
    .createTextOutput('GDC Feedback endpoint is live.')
    .setMimeType(ContentService.MimeType.TEXT);
}
