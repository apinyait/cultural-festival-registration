# 9th International Cultural Festival, Bangkok Thailand — Registration

Registration website for the **9th International Cultural Festival, Bangkok Thailand**
— Chirantana Academy in Association with King Mongkut's University of Technology North Bangkok.
**Sunday 17 January 2027 · 2:00 PM · KMUTNB, Bangkok** · Entry FREE

- **Front end:** `index.html` + `config.js` on **GitHub Pages**
- **Back end:** Google Apps Script (`Code.gs`) + Google Sheet

## Features
- Event details, programme highlights, venue map and contact info; poster slideshow (up to 3 images, managed in the admin panel); EN / ไทย; mobile-friendly
- Registration with one name + phone row per person (1–9), capacity control, ticket with an on-device QR code, confirmation email
- Admin panel (☰ top-right, English / ไทย): dashboard, list, search, check-in, Excel / PDF / CSV export, slideshow images, settings

## Security
- No secrets in the web page: the admin password is stored server-side as a salted SHA-256 hash; nothing sensitive is visible via "view source"
- Admins change their own password in the admin panel (current password required, strength rules, all other sessions signed out); `resetAdminPassword()` for recovery
- Allow-listed API functions only; admin-only functions require a session token (30-min idle timeout)
- Login lockout (5 failures → 15 min), bot honeypot, registration rate limit, request size limit
- Content-Security-Policy, anti-framing, formula-injection protection for Sheets/CSV, HTML escaping of all data

## Privacy (Thailand PDPA)
- Bilingual Privacy Notice; separate consents (own data, other attendees) recorded with notice version and timestamp
- Data minimisation, no third-party QR/tracking, 90-day retention with `purgeAllPersonalData()`

## Setup
See **[INSTALL-TH.md](INSTALL-TH.md)** (Thai). In short:
1. Google Sheet → Extensions → Apps Script → paste `Code.gs` → run `setup()` then `resetAdminPassword()` (password appears in the Execution log)
2. Deploy → Web app (Execute as *Me*, access *Anyone*) → paste the `/exec` URL into `config.js`
3. Settings → Pages → `main` / root
