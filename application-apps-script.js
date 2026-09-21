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
// hr@ is a Google Group (Grace + Grant) -- Groups commonly don't deliver a
// copy back to the sender's own inbox, and since this script sends FROM
// grace@gracedouganconsulting.com, that's exactly the one address that
// silently never saw it (confirmed: every notification since June sent
// successfully but landed in All Mail with no Inbox label, not Spam).
// Sending directly to both real addresses sidesteps the group entirely.
var NOTIFY_EMAIL  = 'grace@gracedouganconsulting.com,grantm@gracedouganconsulting.com';
var RESUME_FOLDER = 'GDC Job Application Resumes'; // Drive folder name (created automatically)
var TURNSTILE_ACTION    = 'apply';
var TURNSTILE_HOSTNAMES = ['gracedouganconsulting.com', 'www.gracedouganconsulting.com'];
var GDC_APP_APPLICATIONS_URL = 'https://app.gracedouganconsulting.com/api/applications';

// ── Turnstile verification ──────────────────────────────────────────────────
// Returns a diagnostic object instead of a bare boolean -- the client's
// fetch uses mode:'no-cors' so it can never read our response anyway, and
// TEMPORARILY (see doPost) we log the raw Cloudflare verdict into the Sheet
// on failure so we can actually see WHY, instead of guessing.
function checkTurnstile(token) {
  if (!token) return { pass: false, reason: 'no_token', raw: null };
  var secret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
  if (!secret) return { pass: false, reason: 'no_secret_configured', raw: null };
  try {
    var resp = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'post',
      payload: { secret: secret, response: token },
      muteHttpExceptions: true
    });
    var result = JSON.parse(resp.getContentText());
    var pass = !!result.success &&
      result.action === TURNSTILE_ACTION &&
      TURNSTILE_HOSTNAMES.indexOf(result.hostname) !== -1;
    return { pass: pass, reason: pass ? 'ok' : 'verdict_mismatch', raw: result };
  } catch (err) {
    return { pass: false, reason: 'exception: ' + err, raw: null };
  }
}

// ── POST handler ──────────────────────────────────────────────────────────────
function doPost(e) {
  try {
    var p = JSON.parse(e.postData.contents);

    var ts = checkTurnstile(p['cf-turnstile-response']);
    if (!ts.pass) {
      // TEMPORARY: log why, into the same Sheet everyone's already looking
      // at, since the client can never read our response (no-cors) and the
      // Executions log doesn't show return values without a linked Cloud
      // project. Remove this block once Turnstile is confirmed working.
      try {
        var diagSheet = getSheet('Applications');
        diagSheet.appendRow([
          now(), '[TURNSTILE FAIL] ' + (p.first_name || ''), p.last_name || '', p.email || '',
          '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
          'reason=' + ts.reason + ' raw=' + JSON.stringify(ts.raw),
          ''
        ]);
      } catch (logErr) { /* swallow -- diagnostics must never break the real flow */ }
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
      'Cover Letter', 'Resume', 'Referral', 'Certification',
      'Notify Error', 'Forward Error'
    ]);

    // Notification and gdc-app forwarding are each best-effort and isolated
    // from each other -- a failure in one (e.g. Gmail quota) must not also
    // block the other. Errors are written into the row itself (temporary,
    // for diagnosing the current issue) instead of only the Executions log,
    // which isn't easy to read without a linked Cloud project.
    var notifyError = '';
    try {
      sendNotification(p, resumeLink, !!p.resume_base64 && !resumeLink);
    } catch (notifyErr) {
      notifyError = notifyErr.toString();
    }

    var forwardError = '';
    try {
      forwardToGdcApp(p, resumeLink);
    } catch (fwdErr) {
      forwardError = fwdErr.toString();
    }

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
      p.certification || '',
      notifyError,
      forwardError
    ]);

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
