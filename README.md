# API Credit Dashboard (Multi‑Vendor)

A lightweight, mobile‑friendly, client‑side dashboard to track balances and usage across providers. No backend needed — keys are stored locally in your browser and requests go directly to each provider’s API (or your optional CORS proxy).

Start with OpenAI usage (organization costs), Deepseek balance, and Grok (xAI) prepaid balance. Designed for a simple multi‑account overview in one place.

## Features

- Multiple accounts: Add and label multiple provider accounts.
- Usage ranges (OpenAI): Today, last 3 days, 7 days, or 1 month.
- One‑click refresh: Update all cards at once.
- Private by design: Data saved in `localStorage`; nothing sent to third‑party servers.
- CORS proxy support: Optional proxy base to bypass browser CORS restrictions.
- Fast + responsive UI: Tailwind CSS + vanilla JS; optimized for mobile.
- MasterAuth sync: (Optional) register/login to securely sync your local data via the provided webhook API, with automatic download/upload after login.

## How It Works

For OpenAI, this app calls the organization costs endpoint with a date range:

- Endpoint: `GET https://api.openai.com/v1/organization/costs?start_time=UNIX&end_time=UNIX`
- Auth: Bearer token using an OpenAI Organization Admin Key
- Pagination supported: The app auto-follows `next_page` and accumulates totals
- Fallbacks: If a wide range fails, it retries in chunks (weekly, then daily) to ensure results

Only the amount “Used” is shown for the selected time range. Granted/available credits are not fetched by this tool.

For Deepseek, this app calls the balance endpoint:

- Endpoint: `GET https://api.deepseek.com/user/balance`
- Auth: Bearer token using your Deepseek API key
- Displayed: Available balance (in USD if provided by API)

For Grok (xAI), this app calls the prepaid balance endpoint for a team:

- Endpoint: `GET https://management-api.x.ai/v1/billing/teams/{team_id}/prepaid/balance`
- Auth: Bearer token (your xAI management API key)
- Displayed: Available prepaid balance (converted from cents)

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

1. Choose a provider and provide the corresponding API key.

  OpenAI:
   - https://platform.openai.com/settings/organization/admin-keys
  Deepseek:
  - Use your Deepseek API key (Bearer) for the balance endpoint.

2. Click “Add Key”, pick the provider, name it, paste the key, and save.
3. For OpenAI, pick a usage range with the calendar button (Today/3d/7d/1m). Deepseek ignores the range and shows current available balance.
4. Click “Refresh All” to fetch and display totals.
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

## Providers

- OpenAI
  - Key: Organization Admin Key
  - Endpoint: `/v1/organization/costs?start_time&end_time`
  - Display: Used amount over selected range

- Deepseek
  - Key: API key (Bearer)
  - Endpoint: `GET https://api.deepseek.com/user/balance`
  - Display: Available balance (currency as provided by API)

- Grok (xAI)
  - Key: API key (Bearer)
  - Team ID: Required (e.g., `65c1e471-205f-4566-9c5a-07198bcdf4ce`)
  - Endpoint: `GET https://management-api.x.ai/v1/billing/teams/{team_id}/prepaid/balance`
  - Display: Available prepaid balance (USD), parsed from `total.val` (assumed cents)

## CORS: When to Use a Proxy

Some providers may not send CORS headers for all origins. If you see “Failed to fetch” or network/CORS errors, set a proxy base (stored in localStorage) and have it forward to the target API host (OpenAI or Deepseek):

- App setting (stored in your browser `localStorage`):

```js
localStorage.setItem('cors_proxy', 'https://your-proxy.example');
```

The app will prepend this base to provider URLs. Your proxy should:

- Forward path/query to the intended host (`https://api.openai.com`, `https://api.deepseek.com`, or `https://management-api.x.ai`)
- Add `Access-Control-Allow-Origin: *` (or your domain)
- Pass through `Authorization: Bearer ...`
- Use HTTPS

Example Cloudflare Worker (minimal, for reference only):

```js
export default {
  async fetch(request) {
    const url = new URL(request.url);
    // Optionally constrain to one host; or route based on path/header
    // Example below forwards to OpenAI unconditionally. For Deepseek, set `api.deepseek.com` accordingly.
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

- `openai_accounts_v1`: Array of saved accounts `{ id, name, vendor, adminKey, lastUpdated, balance, error }`.
- `cors_proxy`: Optional base URL to a CORS‑enabled reverse proxy.
- `openai_usage_range`: One of `1d`, `3d`, `7d`, `1m`.
- `openai_sync_base`: Optional base URL for manual Upload/Download (e.g., `https://your-server.example`). The app will call `GET {base}/download` and `POST {base}/upload` only when you click the buttons and confirm.

## Manual Upload/Download (Optional)

The app does not auto‑sync. If you want manual control:

1. Configure your server URL in the browser console:

  ```js
  localStorage.setItem('openai_sync_base','https://your-server.example');
  ```

2. Use the new “Upload” and “Download” buttons:
  - Upload: You will be prompted that this exposes your saved API keys/configs to your server, then `POST {base}/upload` with `{ accounts: [...] }`.
  - Download: You will be prompted that this replaces your local configs, then `GET {base}/download` and replace `openai_accounts_v1` with the received list.

Security: Only use a server you fully control. Uploaded data may include API keys depending on your stored accounts. Ensure HTTPS and proper server protections.

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

- "Failed to fetch" / CORS: Configure `cors_proxy` as described above.
- 401/403 errors: Verify the Admin Key is valid and you have org permissions.
- Empty totals: Ensure the selected date range actually includes usage.
- Browser storage: Clearing site data will remove saved accounts.

## SEO Keywords

OpenAI usage tracker, OpenAI billing dashboard, Deepseek balance checker, multi-vendor API dashboard, OpenAI organization usage, Admin Key, client-side dashboard, API usage analytics, API management, spend tracker, billing API.

## Developer Disclaimer (Code-of-Scale)

This project follows a "Code-of-Scale" approach to keep the app lightweight and privacy-first while allowing thoughtful growth. Use these guardrails when proposing or accepting changes:

- Sensitive data local-only (baseline): Store API keys and any sensitive values only in browser storage APIs (`localStorage`/`sessionStorage`/`IndexedDB`). Never commit keys to source, never send them to third-party services, and avoid logging secrets.
- Client-side first: Keep the core as a static, client-only app. Backends, databases, user accounts, or auth servers are out of scope unless explicitly opt-in and self-hosted.
- Optional proxy only: A CORS proxy is user-supplied and optional. This repo will not ship or run a shared/hosted proxy. Documentation must clearly warn to self-host proxies.
- Minimal surface area: No telemetry, analytics, cookies, or trackers. Avoid features that collect or centralize user data.
- Opt-in growth: New capabilities should be additive, off by default, and degrade gracefully if unavailable. The default experience stays simple.
- Modularity over complexity: Prefer small, composable utilities and clear seams. Keep `app.js` readable; place larger additions in separate modules/files when needed.
- Security by default: Do not render untrusted HTML. Avoid exposing raw responses that may include secrets. Respect CSP when hosted. Never widen permissions without reason.
- Performance budgets: Favor vanilla JS and small dependencies. Avoid heavy frameworks. Keep bundle size lean to preserve fast loads on mobile.
- Accessibility and UX: Maintain keyboard access, contrast, and ARIA where appropriate. Prioritize clear, compact UI.
- Storage compatibility: When changing `localStorage` keys or shapes, provide migrations and avoid breaking existing users.
- Documentation first: Any new feature must document scope, security implications, and how to disable it. Mention if it affects privacy or storage.
- Contribution guideline: PRs that significantly expand scope (accounts, billing management, server sync, analytics dashboards, etc.) may be declined to preserve project goals.

## Disclaimer

This project is not affiliated with OpenAI. Use at your own risk and follow your organization’s security policies. Admin Keys are sensitive — store and use them responsibly.
