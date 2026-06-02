// =============================================================================
// GDC Employee Onboarding — Google Apps Script
//
// SETUP:
//  1. Create a NEW Google Sheet for employee onboarding
//  2. Copy its Sheet ID from the URL and paste below as SHEET_ID
//  3. Open Extensions > Apps Script in that sheet
//  4. Delete all existing code, paste this entire file, Save (Cmd+S)
//  5. Deploy > New Deployment > Web app
//     Execute as: Me  |  Who has access: Anyone
//  6. Copy the Web App URL
//  7. Paste it into BOTH employeeonboarding.html AND employee-dashboard.html
//     where it says: const APPS_SCRIPT_URL = 'PASTE_URL_HERE';
// =============================================================================

var SHEET_ID      = '1OcgqBD7Zacyr78XZ-djrcZEQ9AfSnN6a5d5G1-HWLqU';
var NOTIFY_EMAIL  = 'grace@gracedouganconsulting.com';
var GRACE_ID      = 'grace';
var GRACE_PW      = 'GDCteam2026';

var TABS = {
  EMPLOYEES:     'Employees',
  PROGRESS:      'Progress',
  CLIENTS:       'Clients',
  INSIGHTFUL:    'Insightful',
  TEAM:          'Team_Members',
  PROCEDURES:    'Procedures',
  SECTION_ITEMS: 'Section_Items',
  SECTIONS:      'Sections'
};

var DEFAULT_SECTIONS = [
  { key:'getstarted', name:'Getting Started',  enabled:true,  order:1 },
  { key:'tools',      name:'Tools',            enabled:true,  order:2 },
  { key:'clients',    name:'Clients',          enabled:true,  order:3 },
  { key:'procedures', name:'Procedures',       enabled:true,  order:4 },
  { key:'checkin',    name:'GDC Feedback',     enabled:true,  order:5 },
  { key:'monthly',    name:'Monthly Check-in', enabled:true,  order:6 },
  { key:'final',      name:'90-Day Check-in',  enabled:true,  order:7 }
];

var DEFAULT_PROCEDURES = [
  'Email formatting',
  'Communications',
  'Team overlap'
];

// -- GET -----------------------------------------------------------------------
function doGet(e) {
  var p = e.parameter;
  try {
    if (p.action === 'verify_employee')    return respond(verifyEmployee(p.id, p.pw));
    if (p.action === 'get_progress')       return respond(getEmployeeProgress(p.id, p.pw));
    if (p.action === 'verify_dashboard')   return respond(verifyDashboard(p.id, p.pw));
    if (p.action === 'get_employees')      return respond(getEmployees(p.id, p.pw));
    if (p.action === 'get_employee_detail') return respond(getEmployeeDetail(p.id, p.pw, p.empId));
    if (p.action === 'get_team_members')   return respond(getTeamMembers(p.id, p.pw));
    if (p.action === 'get_procedures')     return respond(getProcedures(p.id, p.pw));
    if (p.action === 'create_employee')    return respond(createEmployee(p));
    if (p.action === 'create_team_member') return respond(createTeamMember(p));
    if (p.action === 'add_client')         return respond(addClient(p));
    if (p.action === 'remove_client')      return respond(removeClient(p));
    if (p.action === 'add_procedure')      return respond(addProcedure(p));
    if (p.action === 'remove_employee')    return respond(removeEmployee(p));
    if (p.action === 'remove_team_member') return respond(removeTeamMember(p));
    if (p.action === 'remove_procedure')   return respond(removeProcedure(p));
    if (p.action === 'update_procedure')   return respond(updateProcedure(p));
    if (p.action === 'get_section_items')  return respond(getSectionItems(p.id, p.pw));
    if (p.action === 'add_section_item')   return respond(addSectionItem(p));
    if (p.action === 'remove_section_item') return respond(removeSectionItem(p));
    if (p.action === 'update_section_item') return respond(updateSectionItem(p));
    if (p.action === 'get_sections')        return respond(getSections(p.id, p.pw));
    if (p.action === 'add_section')         return respond(addSection(p));
    if (p.action === 'update_section')      return respond(updateSection(p));
    if (p.action === 'remove_section')      return respond(removeSection(p));
    if (p.action === 'reorder_section')     return respond(reorderSection(p));
    return respond({ ok: false, error: 'Unknown action' });
  } catch(err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// -- POST ----------------------------------------------------------------------
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (data.action === 'save_progress')          return respond(saveProgress(data));
    if (data.action === 'save_progress_admin')    return respond(saveProgressAdmin(data));
    if (data.action === 'save_insightful')        return respond(saveInsightful(data));
    if (data.action === 'save_client_proficiency') return respond(saveClientProficiency(data));
    if (data.action === 'final_submit')           return respond(finalSubmit(data));
    return respond({ ok: false, error: 'Unknown action' });
  } catch(err) {
    return respond({ ok: false, error: err.toString() });
  }
}

// -- AUTH ----------------------------------------------------------------------
function verifyEmployee(id, pw) {
  var sheet = getSheet(TABS.EMPLOYEES);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id) && String(rows[i][4]) === String(pw)) {
      sheet.getRange(i+1, 8).setValue(now());
      return {
        ok: true, id: id,
        firstName: rows[i][1], lastName: rows[i][2],
        phone: rows[i][3], startDate: rows[i][5],
        role: rows[i][6], status: rows[i][7],
        teamMemberId: rows[i][9]
      };
    }
  }
  return { ok: false, error: 'Invalid ID or password' };
}

function verifyDashboard(id, pw) {
  if (id === GRACE_ID && pw === GRACE_PW) {
    return { ok: true, name: 'Grace Dougan', id: GRACE_ID };
  }
  var sheet = getSheet(TABS.TEAM);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(id) && String(rows[i][3]) === String(pw)) {
      sheet.getRange(i+1, 6).setValue(now());
      return { ok: true, name: rows[i][1], id: id };
    }
  }
  return { ok: false, error: 'Invalid credentials' };
}

function isDashboardUser(id, pw) {
  return verifyDashboard(id, pw).ok;
}

// -- EMPLOYEE MANAGEMENT -------------------------------------------------------
function createEmployee(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var empId    = generateId();
  var password = generatePassword();
  var sheet    = getSheet(TABS.EMPLOYEES);
  ensureHeaders(sheet, ['ID','First Name','Last Name','Phone','Password','Start Date','Role/Title','Status','Last Activity','Team Member ID']);
  sheet.appendRow([empId, p.firstName||'', p.lastName||'', p.phone||'', password,
    p.startDate||'', p.role||'', 'Active', '', p.teamMemberId||'']);
  return { ok: true, empId: empId, password: password,
    link: 'https://www.gracedouganconsulting.com/employeeonboarding?id=' + empId };
}

function getEmployees(id, pw) {
  if (!isDashboardUser(id, pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.EMPLOYEES);
  var rows  = sheet.getDataRange().getValues();
  var progMap = buildProgressMap();
  var employees = [];
  for (var i = 1; i < rows.length; i++) {
    var eid = String(rows[i][0]);
    employees.push({
      id: eid, firstName: rows[i][1], lastName: rows[i][2],
      name: rows[i][1] + ' ' + rows[i][2],
      phone: rows[i][3], password: rows[i][4],
      startDate: rows[i][5], role: rows[i][6],
      status: rows[i][7], lastActivity: rows[i][8],
      teamMemberId: rows[i][9],
      completedSections: progMap[eid] || [],
      link: 'https://www.gracedouganconsulting.com/employeeonboarding?id=' + eid
    });
  }
  return { ok: true, employees: employees };
}

function getEmployeeDetail(id, pw, empId) {
  if (!isDashboardUser(id, pw)) return { ok: false, error: 'Unauthorized' };
  // Get base employee data
  var empSheet = getSheet(TABS.EMPLOYEES);
  var empRows  = empSheet.getDataRange().getValues();
  var emp = null;
  for (var i = 1; i < empRows.length; i++) {
    if (String(empRows[i][0]) === String(empId)) {
      emp = {
        id: empId, firstName: empRows[i][1], lastName: empRows[i][2],
        name: empRows[i][1] + ' ' + empRows[i][2],
        phone: empRows[i][3], password: empRows[i][4],
        startDate: empRows[i][5], role: empRows[i][6],
        status: empRows[i][7], teamMemberId: empRows[i][9],
        link: 'https://www.gracedouganconsulting.com/employeeonboarding?id=' + empId
      };
      break;
    }
  }
  if (!emp) return { ok: false, error: 'Employee not found' };

  // Progress
  var progSheet = getSheet(TABS.PROGRESS);
  var progRows  = progSheet.getLastRow() > 1 ? progSheet.getDataRange().getValues() : [[]];
  var progress  = {};
  for (var j = 1; j < progRows.length; j++) {
    if (String(progRows[j][1]) === String(empId)) {
      try { progress[progRows[j][2]] = JSON.parse(progRows[j][3]); }
      catch(e) { progress[progRows[j][2]] = {}; }
    }
  }

  // Clients
  var clientSheet = getSheet(TABS.CLIENTS);
  var clientRows  = clientSheet.getLastRow() > 1 ? clientSheet.getDataRange().getValues() : [[]];
  var clients = [];
  for (var k = 1; k < clientRows.length; k++) {
    if (String(clientRows[k][1]) === String(empId)) {
      var prof = {};
      try { prof = JSON.parse(clientRows[k][4]); } catch(e) {}
      clients.push({
        clientId: clientRows[k][0], name: clientRows[k][2],
        clickupUrl: clientRows[k][3], proficiency: prof
      });
    }
  }

  // Insightful
  var insSheet = getSheet(TABS.INSIGHTFUL);
  var insRows  = insSheet.getLastRow() > 1 ? insSheet.getDataRange().getValues() : [[]];
  var insightful = {};
  for (var m = 1; m < insRows.length; m++) {
    if (String(insRows[m][1]) === String(empId)) {
      insightful[insRows[m][2]] = { score: insRows[m][3], goal: insRows[m][4], notes: insRows[m][5], by: insRows[m][6], ops_feedback: insRows[m][7]||'' };
    }
  }

  return { ok: true, employee: emp, progress: progress, clients: clients, insightful: insightful };
}

function buildProgressMap() {
  var sheet = getSheet(TABS.PROGRESS);
  if (sheet.getLastRow() < 2) return {};
  var rows = sheet.getDataRange().getValues();
  var map = {};
  for (var i = 1; i < rows.length; i++) {
    var eid = String(rows[i][1]);
    if (!map[eid]) map[eid] = [];
    if (map[eid].indexOf(rows[i][2]) < 0) map[eid].push(rows[i][2]);
  }
  return map;
}

// -- TEAM MEMBERS --------------------------------------------------------------
function createTeamMember(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  // Username = firstname+lastname, lowercase, no spaces or special chars
  var firstName = (p.firstName || '').trim();
  var lastName  = (p.lastName  || '').trim();
  var fullName  = firstName + (lastName ? ' ' + lastName : '');
  var tmId      = (firstName + lastName).toLowerCase().replace(/[^a-z0-9]/g, '') || generateId();
  var password  = generatePassword();
  var sheet     = getSheet(TABS.TEAM);
  ensureHeaders(sheet, ['ID','Name','Email','Password','Created','Last Activity']);
  // Check for duplicate username
  if (sheet.getLastRow() > 1) {
    var rows = sheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === tmId) return { ok: false, error: 'Username ' + tmId + ' already exists.' };
    }
  }
  sheet.appendRow([tmId, fullName, p.email||'', password, now(), '']);

  // Send invitation email if email provided
  if (p.email) {
    var subject = 'You now have access to the GDC Employee Dashboard';

    var htmlBody =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;color:#1C1C1C;">' +

      // Body
      '<p style="font-size:14px;line-height:1.7;margin:0 0 16px;">Hi ' + firstName + ',</p>' +
      '<p style="font-size:14px;line-height:1.7;margin:0 0 16px;">Grace has given you access to the <strong>GDC Employee Onboarding Dashboard</strong>. Use it to track employee progress, enter weekly Insightful scores, and add feedback for your team members.</p>' +

      // Credentials box
      '<table cellpadding="0" cellspacing="0" border="0" style="background:#FAF8F4;border:1px solid #E5E0D8;margin:24px 0;width:100%;">' +
        '<tr><td style="padding:20px 24px;">' +
          '<div style="font-size:10px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#B8975A;margin-bottom:14px;">Your Login Credentials</div>' +
          '<table cellpadding="0" cellspacing="0" border="0">' +
            '<tr><td style="font-size:12px;color:#888;padding-bottom:6px;padding-right:16px;">Dashboard</td><td style="font-size:13px;padding-bottom:6px;"><a href="https://www.gracedouganconsulting.com/employee-dashboard" style="color:#B8975A;text-decoration:none;">gracedouganconsulting.com/employee-dashboard</a></td></tr>' +
            '<tr><td style="font-size:12px;color:#888;padding-bottom:6px;padding-right:16px;">Username</td><td style="font-size:13px;font-weight:600;padding-bottom:6px;font-family:monospace;">' + tmId + '</td></tr>' +
            '<tr><td style="font-size:12px;color:#888;padding-right:16px;">Password</td><td style="font-size:13px;font-weight:600;font-family:monospace;">' + password + '</td></tr>' +
          '</table>' +
        '</td></tr>' +
      '</table>' +

      '<p style="font-size:14px;line-height:1.7;margin:0 0 32px;">Questions? Just reply to this email.</p>' +

      // Signature
      '<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;max-width:520px;width:100%;">' +
        '<tr><td style="padding:0 0 20px 0;"><table cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr><td style="height:2px;background-color:#B8975A;padding:0;font-size:0;"></td></tr></table></td></tr>' +
        '<tr><td style="padding:0 0 16px 0;">' +
          '<table cellpadding="0" cellspacing="0" border="0"><tr>' +
            '<td style="vertical-align:top;padding-right:18px;">' +
              '<table cellpadding="0" cellspacing="0" border="0" style="border:2px solid #B8975A;background:#ffffff;width:52px;height:52px;"><tr><td style="padding:5px;"><table cellpadding="0" cellspacing="0" border="0" style="border:1px dashed #B8975A;width:100%;height:100%;"><tr><td style="text-align:center;vertical-align:middle;font-family:Georgia,serif;font-size:11px;color:#B8975A;letter-spacing:3px;padding-left:3px;">GDC</td></tr></table></td></tr></table>' +
            '</td>' +
            '<td style="vertical-align:top;">' +
              '<div style="font-family:Georgia,serif;font-size:19px;color:#111;margin-bottom:2px;">Grace Dougan</div>' +
              '<div style="font-size:11px;color:#888;margin-bottom:8px;">Founder &amp; Principal</div>' +
              '<table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;"><tr><td style="width:24px;height:1.5px;background-color:#B8975A;font-size:0;line-height:0;">&nbsp;</td></tr></table>' +
              '<div style="font-family:Georgia,serif;font-size:12px;letter-spacing:0.05em;color:#B8975A;margin-bottom:8px;">GRACE DOUGAN <span style="font-style:italic;">Consulting</span></div>' +
              '<table cellpadding="0" cellspacing="0" border="0">' +
                '<tr><td style="padding-bottom:3px;"><span style="font-size:11px;color:#666;">P:&nbsp;<a href="tel:4158279648" style="color:#666;text-decoration:none;">415.827.9648</a></span></td></tr>' +
                '<tr><td style="padding-bottom:3px;"><span style="font-size:11px;color:#666;">E:&nbsp;<a href="mailto:grace@gracedouganconsulting.com" style="color:#B8975A;text-decoration:none;">grace@gracedouganconsulting.com</a></span></td></tr>' +
                '<tr><td><span style="font-size:11px;color:#666;">W:&nbsp;<a href="https://www.gracedouganconsulting.com" style="color:#B8975A;text-decoration:none;">gracedouganconsulting.com</a></span></td></tr>' +
              '</table>' +
            '</td>' +
          '</tr></table>' +
        '</td></tr>' +
        '<tr><td style="padding-bottom:14px;"><div style="font-family:Georgia,serif;font-size:11px;font-style:italic;color:#aaa;">Your business in a box. &mdash; Bay Area Back-Office Consulting since 2010.</div></td></tr>' +
        '<tr><td><table cellpadding="0" cellspacing="0" border="0" style="width:100%;"><tr><td style="height:1px;background-color:#E8E4DE;padding:0;font-size:0;"></td></tr></table></td></tr>' +
      '</table>' +

      '</div>';

    var plainBody =
      'Hi ' + firstName + ',\n\n' +
      'Grace has given you access to the GDC Employee Onboarding Dashboard.\n\n' +
      'Dashboard: https://www.gracedouganconsulting.com/employee-dashboard\n' +
      'Username: ' + tmId + '\n' +
      'Password: ' + password + '\n\n' +
      'Grace Dougan Consulting\n415.827.9648\ngracedouganconsulting.com';

    MailApp.sendEmail(p.email, subject, plainBody, {
      name: 'Grace Dougan Consulting',
      htmlBody: htmlBody
    });
  }

  return { ok: true, tmId: tmId, password: password, name: fullName };
}

function removeEmployee(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.EMPLOYEES);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.empId)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Employee not found' };
}

function removeTeamMember(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.TEAM);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.tmId)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Team member not found' };
}

function removeProcedure(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.PROCEDURES);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.procId)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Procedure not found' };
}

function getTeamMembers(id, pw) {
  if (!isDashboardUser(id, pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.TEAM);
  if (sheet.getLastRow() < 2) return { ok: true, members: [] };
  var rows    = sheet.getDataRange().getValues();
  var members = [];
  for (var i = 1; i < rows.length; i++) {
    members.push({ id: rows[i][0], name: rows[i][1], email: rows[i][2],
      password: rows[i][3], created: rows[i][4], lastActivity: rows[i][5] });
  }
  return { ok: true, members: members };
}

// -- CLIENTS -------------------------------------------------------------------
function addClient(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var cId   = generateId();
  var sheet = getSheet(TABS.CLIENTS);
  ensureHeaders(sheet, ['Client ID','Employee ID','Client Name','ClickUp URL','Proficiency (JSON)','Added By','Added Date']);
  sheet.appendRow([cId, p.empId, p.clientName||'', p.clickupUrl||'', '{}', p.id, now()]);
  return { ok: true, clientId: cId };
}

function removeClient(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.CLIENTS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.clientId)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Client not found' };
}

// -- PROCEDURES ----------------------------------------------------------------
function getProcedures(id, pw) {
  if (!isDashboardUser(id, pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.PROCEDURES);
  if (sheet.getLastRow() < 2) {
    ensureHeaders(sheet, ['ID','Text','Created By','Created Date','Description','Video URL']);
    DEFAULT_PROCEDURES.forEach(function(text) {
      sheet.appendRow([generateId(), text, 'grace', now(), '', '']);
    });
  }
  var rows = sheet.getDataRange().getValues();
  var procs = [];
  for (var i = 1; i < rows.length; i++) {
    procs.push({ id: rows[i][0], text: rows[i][1], description: rows[i][4]||'', videoUrl: rows[i][5]||'' });
  }
  return { ok: true, procedures: procs };
}

function addProcedure(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var pId   = generateId();
  var sheet = getSheet(TABS.PROCEDURES);
  ensureHeaders(sheet, ['ID','Text','Created By','Created Date','Description','Video URL']);
  sheet.appendRow([pId, p.text, p.id, now(), '', '']);
  return { ok: true, procId: pId };
}

function updateProcedure(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.PROCEDURES);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.procId)) {
      if (p.text)        sheet.getRange(i+1, 2).setValue(p.text);
      sheet.getRange(i+1, 5).setValue(p.description || '');
      sheet.getRange(i+1, 6).setValue(p.videoUrl    || '');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Procedure not found' };
}

// -- SECTION ITEMS -------------------------------------------------------------
function getSectionItems(id, pw) {
  if (!isDashboardUser(id, pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTION_ITEMS);
  if (sheet.getLastRow() < 2) return { ok: true, items: [] };
  var rows  = sheet.getDataRange().getValues();
  var items = [];
  for (var i = 1; i < rows.length; i++) {
    items.push({ id: rows[i][0], section: rows[i][1], title: rows[i][2],
      description: rows[i][3]||'', videoUrl: rows[i][4]||'' });
  }
  return { ok: true, items: items };
}

function addSectionItem(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var iId   = generateId();
  var sheet = getSheet(TABS.SECTION_ITEMS);
  ensureHeaders(sheet, ['ID','Section','Title','Description','Video URL','Created By','Created Date']);
  sheet.appendRow([iId, p.section||'', p.title||'', p.description||'', p.videoUrl||'', p.id, now()]);
  return { ok: true, itemId: iId };
}

function removeSectionItem(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTION_ITEMS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.itemId)) {
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Item not found' };
}

function updateSectionItem(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTION_ITEMS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.itemId)) {
      sheet.getRange(i+1, 4).setValue(p.description || '');
      sheet.getRange(i+1, 5).setValue(p.videoUrl    || '');
      return { ok: true };
    }
  }
  return { ok: false, error: 'Item not found' };
}

// -- SAVE PROGRESS ADMIN (Dashboard) ------------------------------------------
function saveProgressAdmin(data) {
  if (!isDashboardUser(data.userId, data.userPw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.PROGRESS);
  ensureHeaders(sheet, ['Timestamp','Employee ID','Section Key','Data (JSON)']);
  var rows  = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(data.empId) && rows[i][2] === data.section) {
      sheet.getRange(i+1, 1).setValue(now());
      sheet.getRange(i+1, 4).setValue(JSON.stringify(data.sectionData));
      found = true; break;
    }
  }
  if (!found) {
    sheet.appendRow([now(), data.empId, data.section, JSON.stringify(data.sectionData)]);
  }
  updateEmployeeActivity(data.empId);
  return { ok: true };
}

// -- SAVE PROGRESS (Employee) --------------------------------------------------
function saveProgress(data) {
  var emp = verifyEmployee(data.empId, data.empPw);
  if (!emp.ok) return { ok: false, error: 'Unauthorized' };

  var sheet = getSheet(TABS.PROGRESS);
  ensureHeaders(sheet, ['Timestamp','Employee ID','Section Key','Data (JSON)']);

  var rows  = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(data.empId) && rows[i][2] === data.section) {
      sheet.getRange(i+1, 1).setValue(now());
      sheet.getRange(i+1, 4).setValue(JSON.stringify(data.sectionData));
      found = true; break;
    }
  }
  if (!found) {
    sheet.appendRow([now(), data.empId, data.section, JSON.stringify(data.sectionData)]);
  }

  // Update last activity
  updateEmployeeActivity(data.empId);
  return { ok: true };
}

// -- SAVE INSIGHTFUL (Dashboard) -----------------------------------------------
function saveInsightful(data) {
  if (!isDashboardUser(data.userId, data.userPw)) return { ok: false, error: 'Unauthorized' };

  var sheet = getSheet(TABS.INSIGHTFUL);
  ensureHeaders(sheet, ['Timestamp','Employee ID','Week','Score','Goal','Notes','Entered By','Ops Feedback']);

  var rows  = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][1]) === String(data.empId) && String(rows[i][2]) === String(data.week)) {
      sheet.getRange(i+1, 1).setValue(now());
      sheet.getRange(i+1, 4).setValue(data.score || '');
      sheet.getRange(i+1, 5).setValue(data.goal || '');
      sheet.getRange(i+1, 6).setValue(data.notes || '');
      sheet.getRange(i+1, 7).setValue(data.userId);
      sheet.getRange(i+1, 8).setValue(data.ops_feedback || '');
      found = true; break;
    }
  }
  if (!found) {
    sheet.appendRow([now(), data.empId, data.week, data.score||'', data.goal||'', data.notes||'', data.userId, data.ops_feedback||'']);
  }
  return { ok: true };
}

// -- SAVE CLIENT PROFICIENCY (Dashboard) ---------------------------------------
function saveClientProficiency(data) {
  if (!isDashboardUser(data.userId, data.userPw)) return { ok: false, error: 'Unauthorized' };

  var sheet = getSheet(TABS.CLIENTS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.clientId)) {
      var prof = {};
      try { prof = JSON.parse(rows[i][4]); } catch(e) {}
      prof[String(data.week)] = data.proficiency;
      sheet.getRange(i+1, 5).setValue(JSON.stringify(prof));
      return { ok: true };
    }
  }
  return { ok: false, error: 'Client not found' };
}

// -- GET EMPLOYEE PROGRESS (Employee) ------------------------------------------
function getEmployeeProgress(id, pw) {
  var emp = verifyEmployee(id, pw);
  if (!emp.ok) return { ok: false, error: 'Unauthorized' };

  var progSheet   = getSheet(TABS.PROGRESS);
  var clientSheet = getSheet(TABS.CLIENTS);
  var insSheet    = getSheet(TABS.INSIGHTFUL);
  var procSheet   = getSheet(TABS.PROCEDURES);

  // Progress sections
  var progress = {};
  if (progSheet.getLastRow() > 1) {
    var rows = progSheet.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][1]) === String(id)) {
        try { progress[rows[i][2]] = JSON.parse(rows[i][3]); }
        catch(e) { progress[rows[i][2]] = {}; }
      }
    }
  }

  // Clients
  var clients = [];
  if (clientSheet.getLastRow() > 1) {
    var cr = clientSheet.getDataRange().getValues();
    for (var j = 1; j < cr.length; j++) {
      if (String(cr[j][1]) === String(id)) {
        var prof = {};
        try { prof = JSON.parse(cr[j][4]); } catch(e) {}
        clients.push({ clientId: cr[j][0], name: cr[j][2], clickupUrl: cr[j][3], proficiency: prof });
      }
    }
  }

  // Insightful
  var insightful = {};
  if (insSheet.getLastRow() > 1) {
    var ir = insSheet.getDataRange().getValues();
    for (var k = 1; k < ir.length; k++) {
      if (String(ir[k][1]) === String(id)) {
        insightful[String(ir[k][2])] = { score: ir[k][3], goal: ir[k][4], notes: ir[k][5], ops_feedback: ir[k][7]||'' };
      }
    }
  }

  // Procedures (with description + video)
  var procedures = [];
  if (procSheet.getLastRow() > 1) {
    var pr = procSheet.getDataRange().getValues();
    for (var m = 1; m < pr.length; m++) {
      procedures.push({ id: pr[m][0], text: pr[m][1], description: pr[m][4]||'', videoUrl: pr[m][5]||'' });
    }
  }

  // Section Items (custom checklist items from dashboard)
  var sectionItems = [];
  var siSheet = getSheet(TABS.SECTION_ITEMS);
  if (siSheet.getLastRow() > 1) {
    var si = siSheet.getDataRange().getValues();
    for (var n = 1; n < si.length; n++) {
      sectionItems.push({ id: si[n][0], section: si[n][1], title: si[n][2],
        description: si[n][3]||'', videoUrl: si[n][4]||'' });
    }
  }

  // Sections
  var sections = [];
  var secSheet = getSheet(TABS.SECTIONS);
  if (secSheet.getLastRow() > 1) {
    var sr = secSheet.getDataRange().getValues();
    for (var q = 1; q < sr.length; q++) {
      sections.push({ key: sr[q][0], name: sr[q][1], enabled: sr[q][2]===true||sr[q][2]==='TRUE', isCustom: sr[q][3]===true||sr[q][3]==='TRUE', order: Number(sr[q][4])||q });
    }
    sections.sort(function(a,b){ return a.order - b.order; });
  } else {
    sections = DEFAULT_SECTIONS;
  }

  return { ok: true, progress: progress, clients: clients, insightful: insightful, procedures: procedures, sectionItems: sectionItems, sections: sections };
}

// -- FINAL SUBMIT --------------------------------------------------------------
function finalSubmit(data) {
  var emp = verifyEmployee(data.empId, data.empPw);
  if (!emp.ok) return { ok: false, error: 'Unauthorized' };

  updateEmployeeStatus(data.empId, 'Complete');

  var body = '90-day onboarding complete.\n\n';
  body += 'Employee: ' + emp.firstName + ' ' + emp.lastName + '\n';
  body += 'Submitted: ' + now() + '\n';
  body += 'View sheet: https://docs.google.com/spreadsheets/d/' + SHEET_ID;

  MailApp.sendEmail(NOTIFY_EMAIL, '90-Day Onboarding Complete — ' + emp.firstName + ' ' + emp.lastName, body,
    { name: 'GDC Onboarding System' });

  return { ok: true };
}

// -- SECTIONS ------------------------------------------------------------------
function getSections(id, pw) {
  if (!isDashboardUser(id, pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTIONS);
  if (sheet.getLastRow() < 2) {
    ensureHeaders(sheet, ['Key','Name','Enabled','Is Custom','Order']);
    DEFAULT_SECTIONS.forEach(function(s) {
      sheet.appendRow([s.key, s.name, s.enabled, false, s.order]);
    });
  }
  var rows = sheet.getDataRange().getValues();
  var sections = [];
  for (var i = 1; i < rows.length; i++) {
    sections.push({ key: rows[i][0], name: rows[i][1], enabled: rows[i][2]===true||rows[i][2]==='TRUE', isCustom: rows[i][3]===true||rows[i][3]==='TRUE', order: Number(rows[i][4])||i });
  }
  sections.sort(function(a,b){ return a.order - b.order; });
  return { ok: true, sections: sections };
}

function addSection(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var key   = 'custom_' + generateId();
  var sheet = getSheet(TABS.SECTIONS);
  ensureHeaders(sheet, ['Key','Name','Enabled','Is Custom','Order']);
  var lastOrder = sheet.getLastRow() > 1 ? sheet.getLastRow() : 1;
  sheet.appendRow([key, p.name||'New Section', true, true, lastOrder]);
  return { ok: true, key: key };
}

function updateSection(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTIONS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.key)) {
      if (p.name    !== undefined) sheet.getRange(i+1, 2).setValue(p.name);
      if (p.enabled !== undefined) sheet.getRange(i+1, 3).setValue(p.enabled === 'true' || p.enabled === true);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Section not found' };
}

function removeSection(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTIONS);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.key)) {
      if (rows[i][3] !== true && rows[i][3] !== 'TRUE') return { ok: false, error: 'Cannot remove built-in sections' };
      sheet.deleteRow(i + 1);
      return { ok: true };
    }
  }
  return { ok: false, error: 'Section not found' };
}

function reorderSection(p) {
  if (!isDashboardUser(p.id, p.pw)) return { ok: false, error: 'Unauthorized' };
  var sheet = getSheet(TABS.SECTIONS);
  var rows  = sheet.getDataRange().getValues();
  var idx   = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(p.key)) { idx = i; break; }
  }
  if (idx < 0) return { ok: false, error: 'Not found' };
  var currentOrder = Number(rows[idx][4]);
  var dir = p.direction === 'up' ? -1 : 1;
  // Swap with adjacent
  for (var j = 1; j < rows.length; j++) {
    if (Number(rows[j][4]) === currentOrder + dir && j !== idx) {
      sheet.getRange(j+1, 5).setValue(currentOrder);
      sheet.getRange(idx+1, 5).setValue(currentOrder + dir);
      return { ok: true };
    }
  }
  return { ok: true }; // already at edge
}

// -- UTILITIES -----------------------------------------------------------------
function updateEmployeeActivity(empId) {
  var sheet = getSheet(TABS.EMPLOYEES);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(empId)) {
      sheet.getRange(i+1, 8).setValue(now());
      if (rows[i][7] !== 'Complete') sheet.getRange(i+1, 7).setValue('Active');
      break;
    }
  }
}

function updateEmployeeStatus(empId, status) {
  var sheet = getSheet(TABS.EMPLOYEES);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(empId)) {
      sheet.getRange(i+1, 7).setValue(status);
      sheet.getRange(i+1, 8).setValue(now());
      break;
    }
  }
}

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
      .setFontWeight('bold').setBackground('#F2EDE5').setFontColor('#B8975A');
    sheet.setFrozenRows(1);
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function now() {
  return new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' });
}

function generateId() {
  var chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  var id = '';
  for (var i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

function generatePassword() {
  var w1 = ['golden','silver','maple','cedar','stone','river','ocean','valley','summit','harbor'];
  var w2 = ['ridge','bridge','grove','creek','field','coast','bloom','crest','light','gate'];
  return w1[Math.floor(Math.random()*w1.length)] + '-' +
         w2[Math.floor(Math.random()*w2.length)] + '-' +
         (Math.floor(Math.random()*9000)+1000);
}
