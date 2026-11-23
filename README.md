# 9th International Cultural Festival, Bangkok — Registration

Registration website for the **9th International Cultural Festival, Bangkok**
— Chirantana Academy in Association with KMUTNB.
**Sunday 17 January 2027 · 2:00 PM · King Mongkut's University of Technology North Bangkok (KMUTNB)** · Entry FREE

- **Front end:** `index.html`, hosted on **GitHub Pages**
- **Back end:** Google Apps Script (`Code.gs`) + a Google Sheet that stores every registration

## Features
**Public page:** event details (date, time, venue + map, contact), programme highlights, poster, EN / ไทย, mobile-friendly
· registration form with one name + phone row per person (1–9), duplicate registrant email / phone check
· seat capacity with auto-close · ticket with ID + QR code · confirmation email

**Admin** (☰ menu, top-right, password protected): dashboard, registration list (search, filter, check-in, delete, CSV export), on-site check-in, settings.

## Files
| File | Purpose |
|---|---|
| `index.html` | The website (registration page + admin panel) |
| `config.js` | Where you paste the Apps Script Web app URL |
| `Code.gs` | Apps Script back end — paste into the Google Sheet's Apps Script editor |
| `INSTALL-TH.md` | Step-by-step guide in Thai |

## Setup (about 15 minutes)
### 1. Back end — Google Sheet + Apps Script
1. Create a Google Sheet → **Extensions → Apps Script**
2. Replace the code in `Code.gs` with this repo's `Code.gs`
3. Add an HTML file named `Index` and paste `index.html` into it (lets the app also run directly from Apps Script)
4. Run `setup()` once and allow permissions → the initial **admin password** is printed in the Execution log
5. **Deploy → New deployment → Web app** · Execute as: **Me** · Who has access: **Anyone** → copy the **Web app URL**

### 2. Front end — GitHub Pages
1. Edit `config.js` on GitHub and paste the Web app URL into `apiUrl`
2. **Settings → Pages** · Source: *Deploy from a branch* · Branch: `main` / `(root)` → Save
3. The site goes live at `https://<username>.github.io/cultural-festival-registration/`

> After changing `Code.gs`, redeploy with **Manage deployments → ✏️ → Version: New version** so the URL stays the same.
> Change the admin password in Apps Script → *Project Settings → Script properties → `ADMIN_PASSWORD`*.
