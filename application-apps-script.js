// =============================================================================
// GDC Job Applications — Google Apps Script
//
// SETUP:
//  1. Create a new Google Sheet (name it "GDC Job Applications" or similar)
//  2. Copy the Sheet ID from the URL and paste below as SHEET_ID
//  3. Open Extensions > Apps Script in that sheet
//  4. Delete all existing code, paste this entire file, Save (Cmd+S)
//  5. Deploy > New Deployment > Web app
//     Execute as: Me  |  Who has access: Anyone
//  6. Copy the Web App URL
//  7. Paste it into application-form.html where it says:
//     const APPS_SCRIPT_URL = 'PASTE_URL_HERE';
// =============================================================================

var SHEET_ID     = '1XMGWVZyXfgzKuc1Rt5d0M_XtHO7fnMJ-0JrZ7mzOCQg';
var NOTIFY_EMAIL = 'hr@gracedouganconsulting.com';

// ── POST handler ──────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var p = e.parameter;

    var sheet = getSheet('Applications');
    ensureHeaders(sheet, [
      'Submitted', 'First Name', 'Last Name', 'Email', 'Phone',
      'City / State', 'LinkedIn', 'Position', 'Experience', 'Availability',
      'Hours/Week', 'Work Auth', 'Start Date', 'Desired Pay', 'Schedule',
      'Felony', 'Involuntary Term', 'Software', 'Certifications',
      'Cover Letter', 'Resume Link', 'Referral', 'Certification'
    ]);

    sheet.appendRow([
      now(),
      p.first_name || '',
      p.last_name  || '',
      p.email      || '',
      p.phone      || '',
      p.location   || '',
      p.linkedin   || '',
      p.position   || '',
      p.experience || '',
      p.availability   || '',
      p.hours_per_week || '',
      p.work_auth  || '',
      p.start_date || '',
      p.desired_pay || '',
      p.schedule   || '',
      p.felony     || '',
      p.involuntary_term || '',
      p.software   || '',
      p.certifications || '',
      p.cover      || '',
      p.resume_link || '',
      p.referral   || '',
      p.certification || ''
    ]);

    sendNotification(p);

    return respond({ ok: true });
  } catch(err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// ── GET handler (health check) ────────────────────────────────────────────────
function doGet(e) {
  return respond({ ok: true, message: 'GDC Applications script is running.' });
}

// ── Email notification ────────────────────────────────────────────────────────
function sendNotification(p) {
  var name = (p.first_name || '') + ' ' + (p.last_name || '');
  var subject = 'New Application: ' + name.trim() + ' — ' + (p.position || 'Unknown Role');
  var body = [
    'A new job application was submitted on gracedouganconsulting.com.',
    '',
    'NAME:       ' + name.trim(),
    'EMAIL:      ' + (p.email || ''),
    'PHONE:      ' + (p.phone || ''),
    'LOCATION:   ' + (p.location || ''),
    'LINKEDIN:   ' + (p.linkedin || ''),
    '',
    'POSITION:   ' + (p.position || ''),
    'EXPERIENCE: ' + (p.experience || ''),
    'AVAIL:      ' + (p.availability || '') + (p.hours_per_week ? ' / ' + p.hours_per_week + ' hrs/wk' : ''),
    'WORK AUTH:  ' + (p.work_auth || ''),
    'START DATE: ' + (p.start_date || ''),
    'PAY:        ' + (p.desired_pay || ''),
    'SCHEDULE:   ' + (p.schedule || ''),
    '',
    'SOFTWARE:   ' + (p.software || ''),
    'CERTS:      ' + (p.certifications || ''),
    'REFERRAL:   ' + (p.referral || ''),
    '',
    'COVER LETTER:',
    p.cover || '',
    '',
    'RESUME:     ' + (p.resume_link || '(none provided)'),
  ].join('\n');

  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, {
    replyTo: p.email || NOTIFY_EMAIL
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSheet(name) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#F2EDE5')
      .setFontColor('#B8975A');
    sheet.setFrozenRows(1);
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function now() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
}
