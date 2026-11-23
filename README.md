# 9th International Cultural Festival Thailand — Registration App

Registration web app for the **9th International Cultural Festival Thailand**
(Chirantana Academy × KMUTNB) — 17 January 2027, King Mongkut's University Auditorium, North Bangkok.

Built on **Google Apps Script + Google Sheets** — free to run, and attendees register without logging in.

## Features
**Registration page**
- Poster, EN / ไทย language toggle, mobile-friendly
- Name, email, phone, community (17 options + "Others"), 1–9 persons, optional group name, consent
- One name + phone row per person; duplicate-name check within the list and against existing registrations
- Duplicate email/phone check, seat capacity counting, auto-close when full
- Ticket with registration ID (ICF9-0001…) and QR code, printable; optional confirmation email

**Admin (☰ menu, top-right — password protected)**
- Dashboard: registrations, total persons, check-ins, seats left, breakdown by community
- Registration list: search, filter, check-in, delete, CSV export
- On-site check-in by ID / phone / email / attendee name
- Settings: capacity, open/close registration, event time, poster URL, confirmation email

## Files
| File | Purpose |
|---|---|
| `Code.gs` | Apps Script backend (Sheets storage, validation, admin auth, email) |
| `Index.html` | Front end — registration page + admin panel (opened directly in a browser it runs in demo mode, admin password `admin`) |
| `INSTALL-TH.md` | Step-by-step install guide (Thai) |

## Quick install
1. Create a Google Sheet → **Extensions → Apps Script**
2. Paste `Code.gs`; add an HTML file named `Index` and paste `Index.html`
3. Run `setup()` once → the initial admin password appears in the Execution log
4. **Deploy → New deployment → Web app** · Execute as: *Me* · Who has access: *Anyone*

Change the admin password under *Project Settings → Script properties → `ADMIN_PASSWORD`*.
