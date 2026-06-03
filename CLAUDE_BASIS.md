# GDC Website & Onboarding Systems — Claude Basis File

This document tells Claude everything needed to continue work on this project in a new session.

---

## Repository & Deployment

| Item | Value |
|------|-------|
| **GitHub repo** | `https://github.com/grace9149/gdc-redesign` |
| **Local path** | `/Users/gracedougan/.claude/gdc-redesign/` |
| **Live domain** | `https://www.gracedouganconsulting.com` |
| **Staging URL** | `https://gdc-redesign.pages.dev` |
| **Hosting** | Cloudflare Pages — auto-deploys from GitHub on every push to `main` |
| **DNS** | Domain at Ionos, nameservers point to Cloudflare (`lily.ns.cloudflare.com`, `luke.ns.cloudflare.com`) |

**To make changes:** Edit files in `/Users/gracedougan/.claude/gdc-redesign/`, then `git add`, `git commit`, `git push origin main`. Cloudflare deploys in ~1 minute.

---

## Public Website Pages

### Main Homepage
- **File:** `index.html`
- **URL:** `www.gracedouganconsulting.com`
- **Also:** `version-a-editorial.html` (alternate design, same content)
- **Key features:** Team grid, services, testimonials, contact form
- **Contact form:** Submits to Formspree `https://formspree.io/f/mbdqgvje`

### Application Form
- **File:** `application-form.html`
- **URL:** `www.gracedouganconsulting.com/application-form`
- **Submits to:** Formspree `https://formspree.io/f/mbdqgvje` (same as contact form — consider separating)

### Client Feedback Form
- **File:** `clientfeedback.html`
- **URL:** `www.gracedouganconsulting.com/clientfeedback`
- **Submits to:** Formspree `https://formspree.io/f/xpqnbnnd`

### Team Signatures
- **File:** `signatures.html`
- **URL:** `www.gracedouganconsulting.com/signatures`
- **Password protected:** `GDCteam2026`
- **Purpose:** Generates HTML email signatures for each team member to copy into Gmail
- **Team list:** Hardcoded array of `{ name, title, phone, tel, email }` objects starting around line 315

### Grace's iPhone Signature
- **File:** `grace-signature.html`
- **URL:** `www.gracedouganconsulting.com/grace-signature`
- **Purpose:** One-tap copy of Grace's branded email signature for iPhone Mail Settings

---

## Client Onboarding System

### Client Portal
- **File:** `client-onboarding.html`
- **URL:** `www.gracedouganconsulting.com/client-onboarding?id=CLIENTID`
- **Login:** Client ID + auto-generated password (created from dashboard)
- **8 sections:** Business Info, Banking, Bookkeeping, Payroll, Sales Tax, AP/AR, Reporting, Documents
- **Saves to:** Google Apps Script (no-cors POST) + localStorage backup

### Client Onboarding Dashboard
- **File:** `onboarding-dashboard.html`
- **URL:** `www.gracedouganconsulting.com/onboarding-dashboard`
- **Login:** Username: `grace` / Password: `GDCteam2026`
- **Features:** Create clients, view progress, copy login credentials

### Client Apps Script
- **File:** `onboarding-apps-script.js`
- **Deployed URL:** `https://script.google.com/macros/s/AKfycbwTKNh7-ju73qumg7hASv2RgbwyuU__BOLIkAKdJQtWEAxPDr8Y5w7pgV34dWuAME6FeQ/exec`
- **Google Sheet ID:** `19-vge0YZsmsPBTmFs0bG5uRbMWYP4lydsl6aji6xILQ`
- **Sheet tabs:** `Clients`, `Progress`

---

## Employee Onboarding System

### Employee Portal
- **File:** `employeeonboarding.html`
- **URL:** `www.gracedouganconsulting.com/employeeonboarding?id=EMPLOYEEID`
- **Login:** Employee ID + auto-generated password (created from dashboard)
- **Structure:** 12-week Candyland journey map (Month 1 = Weeks 1-4, Month 2 = Weeks 5-8, Month 3 = Weeks 9-12)
- **Sections (dynamic, managed from dashboard):**
  - Getting Started (Week 1 only) — name + phone + onboarding meeting checkbox
  - Tools — 8 tool cards with sub-item checklists (Gmail, 1Password, ClickUp, QBO, QBT, Slack, Insightful, Ramp)
  - Clients — proficiency tracking per client per week
  - Procedures — GDC procedure checklist
  - GDC Feedback — Insightful score + operations team feedback + weekly check-in
  - Monthly Check-in (Weeks 4, 8)
  - 90-Day Check-in (Week 12)
  - Custom sections (added via dashboard)
- **Completed items:** Show as checked/strikethrough; disappear from future weeks
- **Saves to:** Google Apps Script (no-cors POST) + localStorage

### Employee Dashboard
- **File:** `employee-dashboard.html`
- **URL:** `www.gracedouganconsulting.com/employee-dashboard`
- **Login:** Username: `grace` / Password: `GDCteam2026` (or team member credentials)
- **Sidebar navigation:**
  - All Employees — Candyland overview per employee
  - Team Access — manage dashboard logins
  - Onboarding Content — manage portal content

#### Employee Detail View (tabs per employee):
| Tab | What you can do |
|-----|----------------|
| Overview | Name, phone, start date, week, status |
| Insightful | Enter weekly score, goal, internal notes, operations team feedback (visible to employee) |
| Clients | Add/remove clients + ClickUp links, set weekly proficiency |
| Tools | Check off tool sub-items directly; interactive checkboxes |
| Procedures | Check off procedures directly |
| [Custom sections] | Check off items in any custom section |
| Check-ins | View employee's weekly/monthly check-in responses |

#### Onboarding Content (tabs):
| Tab | What you can do |
|-----|----------------|
| Procedures | Add/edit/remove procedures; add description + Google Drive video |
| Tools | Edit tool checklist items; add description + video per item |
| Section Items | Add custom checklist items to any section with description, video, sub-checklist |
| Sections | Rename, reorder, show/hide, or add new custom portal sections |

### Employee Apps Script
- **File:** `employee-onboarding-apps-script.js`
- **Deployed URL:** `https://script.google.com/macros/s/AKfycbwgKRH3iG4xCWo65wdUeWA8QNM6xnJwSkQB_TFvJcViatsX3VoQZWJUdLmTAFQyFH1v/exec`
- **Google Sheet ID:** `1OcgqBD7Zacyr78XZ-djrcZEQ9AfSnN6a5d5G1-HWLqU`
- **Sheet tabs:** `Employees`, `Progress`, `Clients`, `Insightful`, `Team_Members`, `Procedures`, `Section_Items`, `Sections`, `Tool_Items`
- **Google account:** `grace@gracedouganconsulting.com`
- **Permissions granted:** Send email + Google Sheets read/write

#### Key Apps Script actions:
```
GET:  verify_employee, get_progress, verify_dashboard, get_employees,
      get_employee_detail, get_team_members, get_procedures, get_section_items,
      get_sections, get_tool_items, create_employee, create_team_member,
      add_client, remove_client, add_procedure, update_procedure, remove_procedure,
      add_section_item, update_section_item, remove_section_item,
      add_section, update_section, remove_section, reorder_section,
      add_tool_item, update_tool_item, remove_tool_item,
      remove_employee, remove_team_member

POST: save_progress, save_progress_admin, save_insightful,
      save_client_proficiency, final_submit
```

#### When to redeploy Apps Script:
After any change to `employee-onboarding-apps-script.js`, copy the file content to clipboard and tell Grace to:
1. Open the Apps Script editor
2. Cmd+A → Cmd+V → Cmd+S
3. Deploy → Manage Deployments → pencil → New Version → Deploy

**Copy command:**
```bash
python3 -c "
import re, subprocess
with open('/Users/gracedougan/.claude/gdc-redesign/employee-onboarding-apps-script.js','r') as f:
    content = f.read()
clean = re.sub(r'[^\x00-\x7F]+', '-', content)
subprocess.run('pbcopy', input=clean.encode('ascii'), check=True)
"
```

---

## Credentials Summary

| System | Username | Password |
|--------|----------|----------|
| Employee Dashboard | `grace` | `GDCteam2026` |
| Client Dashboard | `grace` | `GDCteam2026` |
| Signatures Page | (password prompt) | `GDCteam2026` |
| GitHub | grace9149 | (Grace's GitHub password) |

---

## Branding

- **Primary gold:** `#B8975A`
- **Gold light:** `#D4AF72`
- **Cream background:** `#FAF8F4`
- **Charcoal text:** `#1C1C1C`
- **Fonts:** Cormorant Garamond (serif, headings), Montserrat or Inter (sans, body)
- **Favicon:** `/favicon.ico` + `/img/gdc-logo-512.png` (cream bg, gold GDC mark)

---

## Pending / Known Items

- `test.html` and `testimonials-preview.html` — preview files, safe to delete
- The 4th testimonial (Executive Director, Santa Rosa CA) was previewed but not added to the live site — Grace chose to keep 3 for now
- Apps Script needs redeploy after the Tools tab and week-based reminders features are complete
- Team members Amanda Esquivel, Andrew Miller, Grant McElhinnie have random IDs — need to be re-added to get `firstnamelastname` format usernames

---

## File Structure (key files only)

```
/Users/gracedougan/.claude/gdc-redesign/
├── index.html                          # Main homepage
├── version-a-editorial.html            # Alternate homepage design
├── application-form.html               # Job application form
├── clientfeedback.html                 # Client feedback form
├── signatures.html                     # Team email signatures
├── grace-signature.html                # Grace's iPhone signature
├── client-onboarding.html              # Client onboarding portal
├── onboarding-dashboard.html           # Client onboarding admin
├── onboarding-apps-script.js           # Client Apps Script
├── employeeonboarding.html             # Employee onboarding portal
├── employee-dashboard.html             # Employee onboarding admin
├── employee-onboarding-apps-script.js  # Employee Apps Script
├── favicon.ico                         # Site favicon
├── img/
│   ├── gdc-logo-512.png                # Brand favicon source
│   ├── katy_web.jpg                    # Team photo
│   ├── melissa_web.jpg                 # Team photo
│   └── samia_web.jpg                   # Team photo
├── css/
│   └── version-a.css                   # Main stylesheet
└── CLAUDE_BASIS.md                     # This file
```
