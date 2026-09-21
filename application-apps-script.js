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
//
// PERMISSIONS REQUIRED (grant on first run):
//  - Gmail (send email notifications)
//  - Google Sheets (write submissions)
//  - Google Drive (save resume PDFs)
//  - External requests (Turnstile verification + forwarding to gdc-app)
//
// SCRIPT PROPERTIES (File > Project Settings > Script Properties):
//  - TURNSTILE_SECRET          -- Cloudflare Turnstile secret key
//  - APPLICATIONS_SYNC_SECRET  -- shared secret, must match the
//    APPLICATIONS_SYNC_SECRET env var set in Cloudflare Pages -> gdc-app ->
//    Settings -> Environment variables. Forwards every submission into the
//    "Potential Employees" tab of app.gracedouganconsulting.com (HR section)
//    -- see functions/api/applications/index.js in the gdc-app repo.
// =============================================================================

var SHEET_ID      = '1XMGWVZyXfgzKuc1Rt5d0M_XtHO7fnMJ-0JrZ7mzOCQg';
var NOTIFY_EMAIL  = 'hr@gracedouganconsulting.com';
var RESUME_FOLDER = 'GDC Job Application Resumes'; // Drive folder name (created automatically)
var TURNSTILE_ACTION    = 'apply';
var TURNSTILE_HOSTNAMES = ['gracedouganconsulting.com', 'www.gracedouganconsulting.com'];
var GDC_APP_APPLICATIONS_URL = 'https://app.gracedouganconsulting.com/api/applications';

// ── Turnstile verification ──────────────────────────────────────────────────
function verifyTurnstile(token) {
  if (!token) return false;
  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret) return false;
  try {
    var resp = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true
    });
    var result = JSON.parse(resp.getContentText());
    return !!result.success &&
      result.action === TURNSTILE_ACTION &&
      TURNSTILE_HOSTNAMES.indexOf(result.hostname) !== -1;
  } catch (err) {
    return false;
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);

    if (!verifyTurnstile(p['cf-turnstile-response'])) {
      return respond({ ok: false, error: 'verification_failed' });
    }

    // Save resume PDF to Drive if provided
    var resumeLink = '';
    if (p.resume_base64 && p.resume_filename) {
      resumeLink = saveResume(p.resume_base64, p.resume_filename, p.first_name, p.last_name);
    }

    var sheet = getSheet('Applications');
    ensureHeaders(sheet, [
      'Submitted', 'First Name', 'Last Name', 'Email', 'Phone',
      'City / State', 'LinkedIn', 'Position', 'Experience', 'Availability',
      'Hours/Week', 'Work Auth', 'Start Date', 'Desired Pay', 'Schedule',
      'Felony', 'Involuntary Term', 'Software', 'Certifications',
      'Cover Letter', 'Resume', 'Referral', 'Certification'
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
      resumeLink,
      p.referral   || '',
      p.certification || ''
    ]);

    sendNotification(p, resumeLink, !!p.resume_base64 && !resumeLink);

    // Best-effort -- the Sheet row and email above are already the durable
    // record, so a gdc-app outage or a missing script property here should
    // never fail the applicant's submission.
    try { forwardToGdcApp(p, resumeLink); } catch (fwdErr) { /* swallow */ }

    return respond({ ok: true });
  } catch(err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// ── GET handler (health check) ────────────────────────────────────────────────
function doGet(e) {
  return respond({ ok: true, message: 'GDC Applications script is running.' });
}

// ── Save resume to Google Drive ───────────────────────────────────────────────
function saveResume(base64, filename, firstName, lastName) {
  var folders = DriveApp.getFoldersByName(RESUME_FOLDER);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(RESUME_FOLDER);
  var name = (lastName || 'Unknown') + ', ' + (firstName || '') + ' — ' + filename;
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), 'application/pdf', name);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

// ── Email notification ────────────────────────────────────────────────────────
function sendNotification(p, resumeLink, resumeFailed) {
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
    'RESUME:     ' + (resumeLink ? resumeLink : resumeFailed ? '⚠️ Applicant uploaded a resume but it failed to save — follow up directly.' : '(none provided)'),
  ].join('\n');

  var options = { replyTo: p.email || NOTIFY_EMAIL };
  if (resumeLink && p.resume_base64 && p.resume_filename) {
    var blob = Utilities.newBlob(
      Utilities.base64Decode(p.resume_base64),
      'application/pdf',
      p.resume_filename
    );
    options.attachments = [blob];
  }
  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, options);
}

// ── Forward to gdc-app's "Potential Employees" tab ────────────────────────────
function forwardToGdcApp(p, resumeLink) {
  var secret = PropertiesService.getScriptProperties().getProperty('APPLICATIONS_SYNC_SECRET');
  if (!secret) return; // not configured yet -- skip quietly

  var payload = {};
  for (var key in p) {
    if (key === 'resume_base64' || key === 'cf-turnstile-response') continue;
    payload[key] = p[key];
  }
  payload.resume_url = resumeLink || '';

  UrlFetchApp.fetch(GDC_APP_APPLICATIONS_URL, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'X-Apps-Script-Secret': secret },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
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
