// ─────────────────────────────────────────────────────────────────────────────
// GDC Client Onboarding — Google Apps Script
//
// SETUP:
//  1. Create a NEW Google Sheet (separate from the feedback sheet)
//  2. Copy its ID from the URL and paste below as SHEET_ID
//  3. Open Extensions → Apps Script in that sheet
//  4. Delete existing code, paste this entire file, save
//  5. Deploy → New Deployment → Web app
//     Execute as: Me  |  Who has access: Anyone
//  6. Copy the Web App URL
//  7. Paste it into client-onboarding.html AND onboarding-dashboard.html
//     where it says:  const APPS_SCRIPT_URL = 'PASTE_URL_HERE';
// ─────────────────────────────────────────────────────────────────────────────

var SHEET_ID     = 'YOUR_ONBOARDING_SHEET_ID';   // ← replace after creating sheet
var NOTIFY_EMAIL = 'hr@gracedouganconsulting.com';
var ADMIN_PW     = 'GDCteam2026';                 // ← change to something private

// Sheet tab names (created automatically on first use)
var TAB_CLIENTS  = 'Clients';
var TAB_PROGRESS = 'Progress';

// ── GET handler — auth, reads ─────────────────────────────────────────────────
function doGet(e) {
  var p = e.parameter;
  try {
    if (p.action === 'verify_client')  return respond(verifyClient(p.id, p.pw));
    if (p.action === 'get_progress')   return respond(getProgress(p.id, p.pw));
    if (p.action === 'verify_admin')   return respond(verifyAdmin(p.pw));
    if (p.action === 'get_clients')    return respond(getClients(p.pw));
    if (p.action === 'create_client')  return respond(createClient(p.pw, p.company, p.contact, p.email));
    return respond({ ok: false, error: 'Unknown action' });
  } catch(e) {
    return respond({ ok: false, error: e.toString() });
  }
}

// ── POST handler — writes, file submissions ───────────────────────────────────
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'save_section')  return respond(saveSection(data));
    if (data.action === 'final_submit')  return respond(finalSubmit(data));
    return respond({ ok: false, error: 'Unknown action' });
  } catch(err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function verifyClient(id, pw) {
  var sheet = getSheet(TAB_CLIENTS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id) && String(rows[i][4]) === String(pw)) {
      sheet.getRange(i + 1, 8).setValue(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
      return { ok: true, company: rows[i][1], contact: rows[i][2], email: rows[i][3], status: rows[i][6] };
    }
  }
  return { ok: false, error: 'Invalid ID or password' };
}

function verifyAdmin(pw) {
  return { ok: pw === ADMIN_PW };
}

function isValidClient(id, pw) {
  var r = verifyClient(id, pw);
  return r.ok;
}

// ── Client management ─────────────────────────────────────────────────────────
function createClient(adminPw, company, contact, email) {
  if (adminPw !== ADMIN_PW) return { ok: false, error: 'Unauthorized' };

  var id       = generateId();
  var password = generatePassword();
  var sheet    = getSheet(TAB_CLIENTS);

  // Ensure headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['ID','Company','Contact','Email','Password','Created','Status','Last Activity','Sections Done']);
    sheet.getRange(1,1,1,9).setFontWeight('bold').setBackground('#F2EDE5').setFontColor('#B8975A');
    sheet.setFrozenRows(1);
  }

  sheet.appendRow([id, company, contact, email, password,
    new Date().toLocaleString('en-US', {timeZone:'America/Los_Angeles'}),
    'Not Started', '', '']);

  var link = 'https://gdc-redesign.pages.dev/client-onboarding?id=' + id;
  return { ok: true, id: id, password: password, link: link, company: company };
}

function getClients(adminPw) {
  if (adminPw !== ADMIN_PW) return { ok: false, error: 'Unauthorized' };

  var clientSheet = getSheet(TAB_CLIENTS);
  var progSheet   = getSheet(TAB_PROGRESS);
  var clientRows  = clientSheet.getDataRange().getValues();
  var progRows    = progSheet.getLastRow() > 1 ? progSheet.getDataRange().getValues() : [[]];

  // Build a map of clientId → array of completed sections
  var sectionMap = {};
  for (var i = 1; i < progRows.length; i++) {
    var cid = String(progRows[i][1]);
    if (!sectionMap[cid]) sectionMap[cid] = [];
    if (progRows[i][4] === 'saved' || progRows[i][4] === 'submitted') {
      sectionMap[cid].push(progRows[i][3]);
    }
  }

  var clients = [];
  for (var j = 1; j < clientRows.length; j++) {
    var id = String(clientRows[j][0]);
    clients.push({
      id:        id,
      company:   clientRows[j][1],
      contact:   clientRows[j][2],
      email:     clientRows[j][3],
      password:  clientRows[j][4],
      created:   clientRows[j][5],
      status:    clientRows[j][6],
      lastSeen:  clientRows[j][7],
      sections:  sectionMap[id] || [],
      link:      'https://gdc-redesign.pages.dev/client-onboarding?id=' + id
    });
  }
  return { ok: true, clients: clients };
}

// ── Section save ──────────────────────────────────────────────────────────────
function saveSection(data) {
  if (!isValidClient(data.id, data.pw)) return { ok: false, error: 'Unauthorized' };

  var sheet = getSheet(TAB_PROGRESS);

  // Ensure headers
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Timestamp','Client ID','Company','Section','Status','Data']);
    sheet.getRange(1,1,1,6).setFontWeight('bold').setBackground('#F2EDE5').setFontColor('#B8975A');
    sheet.setFrozenRows(1);
  }

  // Update or append
  var rows = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(data.id) && rows[i][3] === data.section) {
      sheet.getRange(i+1, 1).setValue(new Date().toLocaleString('en-US',{timeZone:'America/Los_Angeles'}));
      sheet.getRange(i+1, 5).setValue('saved');
      sheet.getRange(i+1, 6).setValue(JSON.stringify(data.sectionData));
      found = true;
      break;
    }
  }
  if (!found) {
    sheet.appendRow([
      new Date().toLocaleString('en-US',{timeZone:'America/Los_Angeles'}),
      data.id, data.company, data.section, 'saved', JSON.stringify(data.sectionData)
    ]);
  }

  // Update client last activity
  var cs = getSheet(TAB_CLIENTS);
  var cr = cs.getDataRange().getValues();
  for (var k = 1; k < cr.length; k++) {
    if (String(cr[k][0]) === String(data.id)) {
      cs.getRange(k+1, 8).setValue(new Date().toLocaleString('en-US',{timeZone:'America/Los_Angeles'}));
      cs.getRange(k+1, 7).setValue('In Progress');
      break;
    }
  }

  return { ok: true };
}

// ── Get progress ──────────────────────────────────────────────────────────────
function getProgress(id, pw) {
  if (!isValidClient(id, pw)) return { ok: false, error: 'Unauthorized' };

  var sheet = getSheet(TAB_PROGRESS);
  if (sheet.getLastRow() < 2) return { ok: true, sections: {} };

  var rows     = sheet.getDataRange().getValues();
  var sections = {};
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(id)) {
      try { sections[rows[i][3]] = JSON.parse(rows[i][5]); }
      catch(e) { sections[rows[i][3]] = {}; }
    }
  }
  return { ok: true, sections: sections };
}

// ── Final submission ──────────────────────────────────────────────────────────
function finalSubmit(data) {
  if (!isValidClient(data.id, data.pw)) return { ok: false, error: 'Unauthorized' };

  // Mark complete in Clients sheet
  var cs = getSheet(TAB_CLIENTS);
  var cr = cs.getDataRange().getValues();
  var clientEmail = '';
  for (var i = 1; i < cr.length; i++) {
    if (String(cr[i][0]) === String(data.id)) {
      cs.getRange(i+1, 7).setValue('Complete');
      cs.getRange(i+1, 8).setValue(new Date().toLocaleString('en-US',{timeZone:'America/Los_Angeles'}));
      clientEmail = cr[i][3];
      break;
    }
  }

  // Build email body
  var body = buildEmailBody(data);

  // Handle file attachments
  var attachments = [];
  if (data.files && data.files.length > 0) {
    data.files.forEach(function(f) {
      try {
        var bytes = Utilities.base64Decode(f.data);
        attachments.push(Utilities.newBlob(bytes, f.mimeType || 'application/octet-stream', f.name));
      } catch(e) {}
    });
  }

  // Send notification to GDC team
  var subject = 'Client Onboarding Complete — ' + data.company;
  var opts = { name: 'Grace Dougan Consulting' };
  if (attachments.length > 0) opts.attachments = attachments;
  GmailApp.sendEmail(NOTIFY_EMAIL, subject, body, opts);

  // Send receipt to client
  if (clientEmail) {
    var receiptBody =
      'Dear ' + data.contact + ',\n\n' +
      'Thank you for completing your onboarding with Grace Dougan Consulting.\n\n' +
      'We have received all of your information and will review it promptly. ' +
      'A member of our team will be in touch within 1–2 business days to confirm your setup and next steps.\n\n' +
      'If you have any questions in the meantime, please reach out to us at:\n' +
      'hr@gracedouganconsulting.com  |  415.827.9648\n\n' +
      'Warm regards,\n' +
      'Grace Dougan Consulting\n' +
      'gracedouganconsulting.com';
    GmailApp.sendEmail(clientEmail, 'Onboarding Received — Grace Dougan Consulting', receiptBody,
      { name: 'Grace Dougan Consulting' });
  }

  return { ok: true };
}

// ── Email body builder ────────────────────────────────────────────────────────
function buildEmailBody(data) {
  var s = data.allSections || {};
  var line = '────────────────────────────────────────────\n';

  function section(title, fields) {
    var out = '\n' + line + title.toUpperCase() + '\n' + line;
    fields.forEach(function(f) {
      if (f.value) out += f.label + ': ' + f.value + '\n';
    });
    return out;
  }

  var b = 'New client onboarding submission received.\n';
  b += 'Submitted: ' + new Date().toLocaleString('en-US',{timeZone:'America/Los_Angeles'}) + '\n';
  b += 'Client ID: ' + data.id + '\n';

  var s1 = s['business'] || {};
  b += section('Your Business', [
    {label:'Company',     value: s1.company},
    {label:'Contact',     value: (s1.first_name||'') + ' ' + (s1.last_name||'')},
    {label:'Email',       value: s1.email},
    {label:'Phone',       value: s1.phone},
    {label:'Website',     value: s1.website},
    {label:'Address',     value: s1.address},
    {label:'Entity Type', value: s1.entity_type},
    {label:'Industry',    value: s1.industry},
    {label:'Employees',   value: s1.employees},
    {label:'In Business', value: s1.years_in_business + ' years'},
  ]);

  var s2 = s['banking'] || {};
  b += section('Banking & Accounts', [
    {label:'Bank Accounts',      value: s2.bank_accounts},
    {label:'Banks Used',         value: s2.banks_list},
    {label:'Credit Cards',       value: s2.credit_cards},
    {label:'Loans/LOC',          value: s2.loans},
    {label:'Access Method',      value: s2.access_method},
    {label:'Notes',              value: s2.banking_notes},
  ]);

  var s3 = s['bookkeeping'] || {};
  b += section('Bookkeeping Setup', [
    {label:'Accounting Software', value: s3.software},
    {label:'Books Status',        value: s3.books_status},
    {label:'Uses Classes',        value: s3.uses_classes},
    {label:'Job Costing',         value: s3.job_costing},
    {label:'Receipt Collection',  value: s3.receipt_method},
    {label:'COA Status',          value: s3.coa_status},
    {label:'Notes',               value: s3.bookkeeping_notes},
  ]);

  var s4 = s['payroll'] || {};
  b += section('Payroll', [
    {label:'Has Payroll',        value: s4.has_payroll},
    {label:'Provider',           value: s4.payroll_provider},
    {label:'Frequency',          value: s4.payroll_frequency},
    {label:'Time Tracking',      value: s4.time_tracking},
    {label:'Who Approves',       value: s4.payroll_approver},
    {label:'Retirement Plan',    value: s4.retirement},
    {label:'Workers Comp',       value: s4.workers_comp},
    {label:'PTO Policy',         value: s4.pto_policy},
  ]);

  var s5 = s['salestax'] || {};
  b += section('Sales Tax & Compliance', [
    {label:'Collects Sales Tax', value: s5.has_sales_tax},
    {label:'States',             value: s5.states},
    {label:'CDTFA Access',       value: s5.cdtfa_access},
    {label:'Rate Calculation',   value: s5.rate_calculation},
    {label:'Invoicing Platform', value: s5.invoicing_platform},
    {label:'Prepayments',        value: s5.prepayments},
  ]);

  var s6 = s['apar'] || {};
  b += section('Accounts Payable & Receivable', [
    {label:'AP Platform',       value: s6.ap_platform},
    {label:'AP Approver',       value: s6.ap_approver},
    {label:'Weekly AP Meeting', value: s6.ap_meeting},
    {label:'AR / Billing Platform', value: s6.ar_platform},
    {label:'Payment Terms',     value: s6.payment_terms},
    {label:'Billing Process',   value: s6.billing_process},
  ]);

  var s7 = s['reporting'] || {};
  b += section('Reporting & Taxes', [
    {label:'Reports Needed',    value: s7.reports},
    {label:'Report Frequency',  value: s7.report_frequency},
    {label:'Has CPA',           value: s7.has_cpa},
    {label:'CPA Name',          value: s7.cpa_name},
    {label:'CPA Email',         value: s7.cpa_email},
    {label:'CPA Phone',         value: s7.cpa_phone},
    {label:'Last Tax Return',   value: s7.last_tax_return},
    {label:'Custom Reports',    value: s7.custom_reports},
  ]);

  var s8 = s['documents'] || {};
  b += section('Documents', [
    {label:'Documents Provided', value: s8.docs_provided},
    {label:'File Count',         value: data.files ? data.files.length + ' file(s) attached' : '0'},
    {label:'Notes',              value: s8.doc_notes},
  ]);

  b += '\n' + line;
  b += 'View all submissions in Google Sheets:\n';
  b += 'https://docs.google.com/spreadsheets/d/' + SHEET_ID + '\n';

  return b;
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function getSheet(name) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  return sh;
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function generateId() {
  var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  var id = '';
  for (var i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function generatePassword() {
  var words1 = ['golden','silver','maple','cedar','stone','river','ocean','valley','summit','harbor'];
  var words2 = ['ridge','bridge','grove','creek','field','coast','bloom','crest','light','gate'];
  var n = Math.floor(Math.random() * 9000) + 1000;
  return words1[Math.floor(Math.random() * words1.length)] + '-' +
         words2[Math.floor(Math.random() * words2.length)] + '-' + n;
}
