# OpenAI API Credit Dashboard (OpenAI API Management)

A lightweight, mobile‑friendly, client‑side dashboard to track OpenAI organization usage (costs) with your Admin Key. No backend needed — keys are stored locally in your browser and requests go directly to OpenAI’s `/v1/organization/costs` API.

Ideal for teams and power users who want a simple OpenAI usage tracker, billing monitor, and multi‑account overview in one place.

## Features

- Multiple accounts: Add and label multiple OpenAI accounts/orgs.
- Usage ranges: Today, last 3 days, 7 days, or 1 month.
- One‑click refresh: Update all cards at once.
- Private by design: Data saved in `localStorage`; nothing sent to third‑party servers.
- CORS proxy support: Optional proxy base to bypass browser CORS restrictions.
- Fast + responsive UI: Tailwind CSS + vanilla JS; optimized for mobile.
- MasterAuth sync: (Optional) register/login to securely sync your local data via the provided webhook API, with automatic download/upload after login.

## How It Works

This app calls OpenAI’s organization costs endpoint with a date range:

- Endpoint: `GET https://api.openai.com/v1/organization/costs?start_time=UNIX&end_time=UNIX`
- Auth: Bearer token using an OpenAI Organization Admin Key
- Pagination supported: The app auto-follows `next_page` and accumulates totals
- Fallbacks: If a wide range fails, it retries in chunks (weekly, then daily) to ensure results

Only the amount “Used” is shown for the selected time range. Granted/available credits are not fetched by this tool.

## Quick Start

You can host this as any static site. Two easy options:

### Option 1 — Open the HTML directly

1. Open `index.html` in your browser.
2. If requests are blocked by CORS, see the CORS section below.

### Option 2 — Serve locally (recommended)

From the project root in Windows PowerShell:

```powershell
# Using http-server (installs temporarily via npx)
npx http-server -p 8080
# Or serve over HTTPS with the included self-signed certs
npx http-server -S -C ./localhost.pem -K ./localhost-key.pem -p 8443
```

Then open:

- HTTP: http://localhost:8080
- HTTPS: https://localhost:8443 (allow the self‑signed certificate warning)

You can also use any static server you prefer (e.g., `npx serve`, VS Code Live Server, Nginx, GitHub Pages).

## Using the Dashboard

1. Create an OpenAI Organization Admin Key:
   - https://platform.openai.com/settings/organization/admin-keys
2. Click “Add Key”, give it a name, paste your Admin Key, and save.
3. Pick a usage range with the calendar button (Today/3d/7d/1m).
4. Click “Refresh All” to fetch and display usage totals.
5. Keys and labels are stored only in your browser; use “Clear All Keys” to remove.

## MasterAuth Backup & Sync

Use the credentials shared in `masterAuth-WebbyCMS.md` to keep your dashboard data backed up:

1. Open the **MasterAuth Sync** card at the top of the page.
2. Enter your email, password, and (hidden) app identifier – it auto-fills with the current domain, falling back to `post-man-test`.
3. Click **Register** if you’re new; otherwise click **Login**. On success we store the returned `password_key` in a secure cookie.
4. After login (and whenever you revisit with that cookie present) the app automatically compares the cloud `last_sync` timestamp with your local one:
  - If the cloud data is newer, it downloads and replaces the local snapshot.
  - If your local data is newer or the cloud is empty, it immediately uploads your latest `localStorage` data as `app_data`.
5. No manual sync buttons are needed—just login once on each device and let the app keep everything aligned.

> Tip: Login is still required whenever the password key cookie expires or is cleared so the app can refresh its credentials.

## CORS: When to Use a Proxy

OpenAI may not send CORS headers for all origins. If you see “Failed to fetch” or network/CORS errors, set a proxy base that forwards to `https://api.openai.com`:

- App setting (stored in your browser `localStorage`):

```js
localStorage.setItem('openai_cors_proxy', 'https://your-proxy.example');
```

The app will prepend this base to OpenAI URLs. Your proxy should:

- Forward path/query to `https://api.openai.com`
- Add `Access-Control-Allow-Origin: *` (or your domain)
- Pass through `Authorization: Bearer ...`
- Use HTTPS

Example Cloudflare Worker (minimal, for reference only):

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    url.hostname = 'api.openai.com';
    url.protocol = 'https:';
    const init = {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body,
    };
    const resp = await fetch(url.toString(), init);
    const newHeaders = new Headers(resp.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: newHeaders });
  }
};
```

Security note: Never use public/unknown proxies with secrets. Run your own (Cloudflare Worker, Nginx reverse proxy, etc.).

## Configuration (Local Storage Keys)

- `openai_accounts_v1`: Array of saved accounts `{ id, name, adminKey, lastUpdated, balance, error }`.
- `openai_cors_proxy`: Optional base URL to a CORS‑enabled reverse proxy.
- `openai_usage_range`: One of `1d`, `3d`, `7d`, `1m`.

## Project Structure

```
OpenAI-API-Management/
├─ index.html          # UI (Tailwind, Font Awesome)
├─ app.js              # Core logic: storage, fetch, rendering
├─ localhost.pem       # Self-signed cert (optional local HTTPS)
├─ localhost-key.pem   # Self-signed key (optional local HTTPS)
└─ http_serve.bat      # Example script (paths are environment-specific)
```

## Tech Stack

- HTML + Tailwind CSS + Font Awesome
- Vanilla JavaScript (no frameworks)
- No backend; static hosting compatible

## Troubleshooting

- "Failed to fetch" / CORS: Configure `openai_cors_proxy` as described above.
- 401/403 errors: Verify the Admin Key is valid and you have org permissions.
- Empty totals: Ensure the selected date range actually includes usage.
- Browser storage: Clearing site data will remove saved accounts.

## SEO Keywords

OpenAI API usage tracker, OpenAI billing dashboard, OpenAI costs monitor, OpenAI organization usage, OpenAI Admin Key, client-side OpenAI dashboard, OpenAI usage analytics, OpenAI API management, OpenAI spend tracker, OpenAI billing API.

## Disclaimer

This project is not affiliated with OpenAI. Use at your own risk and follow your organization’s security policies. Admin Keys are sensitive — store and use them responsibly.
