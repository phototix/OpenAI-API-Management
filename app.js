const STORAGE_KEY = "openai_accounts_v1";
const CORS_PROXY_KEY = "openai_cors_proxy";
const RANGE_KEY = "openai_usage_range"; // '1d' | '7d' | '1m' | '3m'
const MASTER_AUTH_BASE = "https://n8n.brandon.my/webhook/v1/api";
const MASTER_AUTH_PROFILE_KEY = "masterauth_profile_v1";
const MASTER_AUTH_LAST_SYNC_KEY = "masterauth_last_sync_v1";
const MASTER_AUTH_RESERVED_KEYS = new Set([MASTER_AUTH_PROFILE_KEY, MASTER_AUTH_LAST_SYNC_KEY]);
const MASTER_AUTH_DEFAULT_APPS = "post-man-test";
const MASTER_AUTH_PASSWORD_COOKIE = "masterauth_password_key";
const MASTER_AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
const AUTH_STATUS_CLASS_MAP = {
  info: "text-gray-600",
  success: "text-green-600",
  error: "text-red-600",
  warning: "text-amber-600",
};

const els = {
  form: document.getElementById("apiKeyForm"),
  name: document.getElementById("accountName"),
  vendor: document.getElementById("vendorSelect"),
  adminKey: document.getElementById("adminKey"),
  teamId: document.getElementById("teamId"),
  teamIdRow: document.getElementById("teamIdRow"),
  addKeyModal: document.getElementById("addKeyModal"),
  openAddKeyModal: document.getElementById("openAddKeyModal"),
  closeAddKeyModal: document.getElementById("closeAddKeyModal"),
  cancelAddKey: document.getElementById("cancelAddKey"),
  accounts: document.getElementById("accountsContainer"),
  noAccounts: document.getElementById("noAccountsMessage"),
  refreshAll: document.getElementById("refreshAll"),
  clearAll: document.getElementById("clearAllKeys"),
  loadingModal: document.getElementById("loadingModal"),
  rangeModal: document.getElementById("rangeModal"),
  openRangeModal: document.getElementById("openRangeModal"),
  closeRangeModal: document.getElementById("closeRangeModal"),
  saveRange: document.getElementById("saveRange"),
  cancelRange: document.getElementById("cancelRange"),
  currentRangeLabel: document.getElementById("currentRangeLabel"),
};

function getAccounts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr;
  } catch {
    return [];
  }
}

function saveAccounts(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function addAccount(name, adminKey, vendor = "openai", extra = {}) {
  const list = getAccounts();
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  const account = { id, name, vendor: vendor || "openai", adminKey: adminKey || "", lastUpdated: null, balance: null, error: null };
  if (vendor === "grok" && extra && extra.teamId) account.teamId = extra.teamId;
  list.push(account);
  saveAccounts(list);
  return id;
}

function removeAccount(id) {
  const next = getAccounts().filter((a) => a.id !== id);
  saveAccounts(next);
}

function updateAccount(id, patch) {
  const list = getAccounts();
  const idx = list.findIndex((a) => a.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch };
    saveAccounts(list);
  }
}

function maskKey(k) {
  if (!k) return "";
  if (k.length <= 8) return "••••";
  return `${k.slice(0, 4)}••••${k.slice(-4)}`;
}

function formatUSD(n) {
  if (typeof n !== "number" || Number.isNaN(n)) return "-";
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// No percent bar needed; we only display Used

function showLoading(show) {
  if (!els.loadingModal) return;
  els.loadingModal.classList.toggle("hidden", !show);
}

function accountCardHTML(a) {
  const vendor = a.vendor || "openai";
  const hasBalance = !!(a && a.balance);
  const hasUsed = hasBalance && typeof a.balance.used === "number";
  const used = hasUsed ? a.balance.used : null;
  const availableNum = hasBalance ? Number(a.balance.available) : NaN;
  const hasAvailable = Number.isFinite(availableNum);
  const available = hasAvailable ? availableNum : null;
  const updated = a.lastUpdated ? new Date(a.lastUpdated).toLocaleString() : "Never";
  const err = a.error ? String(a.error) : "";

  const secretForLabel = a.adminKey || "";
  const vendorName = vendor === "openai" ? "OpenAI" : vendor === "deepseek" ? "Deepseek" : vendor === "grok" ? "Grok" : (vendor || "").toUpperCase();
  const vendorBadgeClass = vendor === "openai"
    ? "bg-purple-100 text-purple-800"
    : vendor === "deepseek"
    ? "bg-teal-100 text-teal-800"
    : vendor === "grok"
    ? "bg-amber-100 text-amber-800"
    : "bg-gray-100 text-gray-800";
  const teamBadge = vendor === "grok" && a.teamId
    ? `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Team: ${a.teamId}</span>`
    : "";
  const extraInfo = vendor === "grok" && a.teamId
    ? `Team: ${a.teamId}`
    : ""; // Future: show Org ID if stored for OpenAI
  return `
    <div class="balance-card border border-gray-200 rounded-xl p-5 fade-in">
      <div class="flex items-start justify-between">
        <div class="w-full">
          <div class="flex items-center flex-wrap gap-2">
            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${vendorBadgeClass}">${vendorName}</span>
            <div class="text-sm text-gray-500">${maskKey(secretForLabel)}</div>
          </div>
          <h3 class="text-lg font-semibold text-gray-800 mt-2">${a.name}</h3>
          ${extraInfo ? `<div class="text-xs text-gray-500 mt-1">${extraInfo}</div>` : ""}
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3">
        ${vendor === "openai" ? `
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-500">Used (range)</div>
            <div class="text-xl font-semibold text-gray-800">${hasUsed ? formatUSD(used) : "—"}</div>
          </div>
        ` : `
          <div class="bg-gray-50 rounded-lg p-4 text-center">
            <div class="text-xs text-gray-500">Available</div>
            <div class="text-xl font-semibold text-gray-800">${hasAvailable ? formatUSD(available) : "—"}</div>
          </div>
        `}
      </div>
      <div class="mt-3 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <button data-action="refresh" data-id="${a.id}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg"><i class="fas fa-sync-alt mr-1"></i></button>
          <button data-action="remove" data-id="${a.id}" class="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg"><i class="fas fa-trash mr-1"></i></button>
        </div>
        <div class="text-xs text-gray-500">
          <span>Updated: ${updated}</span>
        </div>
      </div>

      ${err ? `<div class="mt-3 text-sm text-red-600"><i class=\"fas fa-exclamation-circle mr-1\"></i>${err}</div>` : ""}
    </div>
  `;
}

function render() {
  const list = getAccounts();
  els.accounts.innerHTML = "";
  if (!list.length) {
    els.noAccounts.classList.remove("hidden");
    els.accounts.appendChild(els.noAccounts);
    return;
  }
  els.noAccounts.classList.add("hidden");
  const frag = document.createDocumentFragment();
  list.forEach((a) => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = accountCardHTML(a);
    frag.appendChild(wrapper.firstElementChild);
  });
  els.accounts.appendChild(frag);
}

async function fetchWithTimeout(resource, options = {}, timeoutMs = 20000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(resource, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

function buildQueryParams(payload = {}) {
  const params = new URLSearchParams();
  Object.entries(payload || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    const encoded = typeof value === "object" ? JSON.stringify(value) : value;
    params.append(key, encoded);
  });
  return params.toString();
}

async function masterAuthRequest(path, method = "POST", payload = {}) {
  const trimmedPath = path.replace(/^\/+/, "");
  let url = `${MASTER_AUTH_BASE.replace(/\/$/, "")}/${trimmedPath}`;
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
    },
  };
  if (method === "GET") {
    const qs = buildQueryParams(payload);
    if (qs) url += `?${qs}`;
  } else {
    options.body = JSON.stringify(payload || {});
  }
  const res = await fetchWithTimeout(url, options, 20000);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const statusText = (data && (data.status || data.success)) || `HTTP ${res.status}`;
    throw new Error(statusText);
  }
  return data || {};
}

function collectAppDataForUpload() {
  const snapshot = {};
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || MASTER_AUTH_RESERVED_KEYS.has(key)) continue;
    const value = localStorage.getItem(key);
    snapshot[key] = safeJSONParse(value);
  }
  return snapshot;
}

function normalizeRemoteAppData(payload) {
  if (payload == null) return null;
  let data = payload;
  let depth = 0;
  while (typeof data === "string" && depth < 3) {
    const parsed = safeJSONParse(data);
    if (parsed === data) break;
    data = parsed;
    depth += 1;
  }
  if (Array.isArray(data)) {
    const firstObject = data.find((entry) => entry && typeof entry === "object");
    if (!firstObject) return null;
    data = firstObject;
  }
  if (data === null) return null;
  const isObject = typeof data === "object" && !Array.isArray(data);
  return isObject && Object.keys(data).length ? data : null;
}

function applyRemoteAppData(remoteData) {
  if (!remoteData || typeof remoteData !== "object") return;
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || MASTER_AUTH_RESERVED_KEYS.has(key)) continue;
    toRemove.push(key);
  }
  toRemove.forEach((key) => localStorage.removeItem(key));
  Object.entries(remoteData).forEach(([key, value]) => {
    if (!key || MASTER_AUTH_RESERVED_KEYS.has(key) || value === undefined) return;
    if (typeof value === "object") {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      localStorage.setItem(key, String(value));
    }
  });
  render();
}

async function handleMasterAuthRegister() {
  const { email, password, apps } = getAuthFormValues();
  if (!email || !password || !apps) {
    setAuthStatus("Email, password, and app identifier are required.", "warning");
    return;
  }
  setAuthBusy(true);
  try {
    const res = await masterAuthRequest("auth/register", "POST", { email, password, apps });
    if (res.status === "success-registered") {
      const profile = { email, apps, password_key: res.password_key || null, session: res.session || null };
      saveMasterAuthProfile(profile);
      updateAuthFormFromProfile();
      setAuthStatus("Registration successful. Password key saved.", "success");
    } else {
      setAuthStatus(res.status || "Registration failed.", res.status ? "warning" : "error");
    }
  } catch (err) {
    setAuthStatus(`Register failed: ${err.message}`, "error");
  } finally {
    setAuthBusy(false);
  }
}

async function handleMasterAuthLogin() {
  const { email, password, apps } = getAuthFormValues();
  if (!email || !password || !apps) {
    setAuthStatus("Email, password, and app identifier are required.", "warning");
    return;
  }
  setAuthBusy(true);
  try {
    const res = await masterAuthRequest("auth/login", "POST", { email, apps, password });
    if (res.status === "success-login") {
      const passwordKey = res.password_key || getPasswordKeyCookie();
      if (!passwordKey) {
        setAuthStatus("Password key missing from response. Try again.", "warning");
        return;
      }
      setPasswordKeyCookie(passwordKey);
      const profile = { email, apps, password_key: passwordKey, session: res.session || null };
      saveMasterAuthProfile(profile);
      updateAuthFormFromProfile();
      setAuthStatus("Login successful. Syncing dashboard data...", "info");
      await synchronizeWithCloud(profile, "login");
      updateAuthLastSyncLabel();
      updateAuthUI();
    } else {
      setAuthStatus(res.status || "Login failed.", res.status ? "warning" : "error");
    }
  } catch (err) {
    setAuthStatus(`Login failed: ${err.message}`, "error");
  } finally {
    setAuthBusy(false);
  }
}

function stableStringify(obj) {
  const seen = new WeakSet();
  const helper = (value) => {
    if (value && typeof value === "object") {
      if (seen.has(value)) return '"[Circular]"';
      seen.add(value);
      if (Array.isArray(value)) {
        return `[${value.map((v) => helper(v)).join(",")}]`;
      }
      const keys = Object.keys(value).sort();
      const parts = keys.map((k) => `${JSON.stringify(k)}:${helper(value[k])}`);
      return `{${parts.join(",")}}`;
    }
    return JSON.stringify(value);
  };
  return helper(obj);
}

async function handleMasterAuthLogout() {
  // Best-effort sync on logout if data changed
  const profile = getMasterAuthProfile();
  const passwordKey = getPasswordKeyCookie();
  if (!profile || !profile.email || !passwordKey) {
    // Nothing to do, just clear any cookie and reset UI
    clearPasswordKeyCookie();
    saveMasterAuthProfile({ email: (profile && profile.email) || "", apps: getDefaultAppIdentifier(), password_key: null, session: null });
    updateAuthUI();
    setAuthStatus("Logged out.", "success");
    return;
  }

  setAuthBusy(true);
  try {
    const payload = { email: profile.email, apps: profile.apps || getDefaultAppIdentifier(), password_key: passwordKey };
    let remoteData = null;
    try {
      const res = await masterAuthRequest("config/app", "GET", payload);
      remoteData = normalizeRemoteAppData(res.data);
    } catch (e) {
      // ignore fetch error here; we'll still try to upload if needed
      remoteData = null;
    }

    const localData = collectAppDataForUpload();
    const localStr = stableStringify(localData);
    const remoteStr = stableStringify(remoteData || {});
    const changed = localStr !== remoteStr;

    if (changed) {
      try {
        await masterAuthRequest("config/app", "POST", { ...payload, app_data: localData });
        setLastSyncMeta({ direction: "upload", timestamp: Date.now(), serverTimestamp: new Date().toISOString() });
        setAuthStatus("Changes saved to cloud. Logged out.", "success");
      } catch (err) {
        setAuthStatus(`Logout: failed to upload changes (${err.message}). Logged out locally.`, "warning");
      }
    } else {
      setAuthStatus("No changes detected. Logged out.", "success");
    }
  } finally {
    // Clear credentials regardless of upload result
    clearPasswordKeyCookie();
    saveMasterAuthProfile({ email: profile.email, apps: profile.apps || getDefaultAppIdentifier(), password_key: null, session: null });
    updateAuthUI();
    setAuthBusy(false);
  }
}

function parseRemoteTimestamp(value) {
  if (!value || value === "new-data") return 0;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? 0 : ts;
}

function getLocalSyncTimestamp(meta = getLastSyncMeta()) {
  if (!meta) return 0;
  const remote = parseRemoteTimestamp(meta.serverTimestamp);
  if (remote) return remote;
  return typeof meta.timestamp === "number" ? meta.timestamp : 0;
}

async function synchronizeWithCloud(profile, reason = "auto") {
  if (!profile || !profile.email || !profile.password_key) return;
  setAuthStatus("Checking sync status...", "info");
  const payload = { email: profile.email, apps: profile.apps, password_key: profile.password_key };
  try {
    const res = await masterAuthRequest("config/app", "GET", payload);
    const remoteTimestamp = parseRemoteTimestamp(res.last_sync);
    const localTimestamp = getLocalSyncTimestamp();
    const remoteData = normalizeRemoteAppData(res.data);
    const hasRemoteData = !!remoteData;
    if (remoteTimestamp > localTimestamp && hasRemoteData) {
      applyRemoteAppData(remoteData);
      setLastSyncMeta({ direction: "download", timestamp: Date.now(), serverTimestamp: res.last_sync || null });
      setAuthStatus("Downloaded newer data from cloud.", "success");
      return;
    }
    const appData = collectAppDataForUpload();
    if (!Object.keys(appData).length) {
      if (hasRemoteData) {
        applyRemoteAppData(remoteData);
        setLastSyncMeta({ direction: "download", timestamp: Date.now(), serverTimestamp: res.last_sync || null });
        setAuthStatus("Imported dashboard data from cloud.", "success");
      } else {
        setAuthStatus("Cloud has no data yet. Add keys locally to create the first backup.", "info");
      }
      return;
    }
    const shouldUpload = !remoteTimestamp || localTimestamp > remoteTimestamp || !hasRemoteData;
    if (shouldUpload) {
      await masterAuthRequest("config/app", "POST", { ...payload, app_data: appData });
      const serverTimestamp = new Date().toISOString();
      setLastSyncMeta({ direction: "upload", timestamp: Date.now(), serverTimestamp });
      setAuthStatus("Uploaded local dashboard data to cloud.", "success");
    } else {
      setAuthStatus("Cloud data already up to date.", "info");
    }
  } catch (err) {
    const prefix = reason === "login" ? "Auto-sync failed" : "Sync failed";
    setAuthStatus(`${prefix}: ${err.message}`, "error");
  }
}

async function attemptAutoSyncFromCookie() {
  const profile = getMasterAuthProfile();
  const passwordKey = getPasswordKeyCookie();
  if (!profile || !profile.email) {
    setAuthStatus("Connect with MasterAuth to enable automatic backups.", "info");
    updateAuthUI();
    return;
  }
  if (!passwordKey) {
    setAuthStatus("Login to refresh your password key before syncing.", "warning");
    updateAuthUI();
    return;
  }
  const normalized = { ...profile, apps: profile.apps || getDefaultAppIdentifier(), password_key: passwordKey };
  saveMasterAuthProfile(normalized);
  updateAuthFormFromProfile();
  try {
    await synchronizeWithCloud(normalized, "cookie");
    updateAuthLastSyncLabel();
  } catch (err) {
    setAuthStatus(`Auto-sync failed: ${err.message}`, "error");
  } finally {
    updateAuthUI();
  }
}

function getProxyBase() {
  const v = localStorage.getItem(CORS_PROXY_KEY);
  if (!v) return "";
  return v.replace(/\/$/, "");
}

// Build a URL that optionally routes via a CORS proxy.
// Supported proxy base formats:
//  - Base containing "{url}" placeholder: e.g. https://your-proxy.example.com?url={url}
//  - Plain base: appends "?/proxy?url=" by default: https://your-proxy.example.com/proxy?url=<encoded target>
//  - If no proxy configured, returns the direct host+path
function buildProxiedUrl(host, path) {
  const base = getProxyBase();
  const full = host.replace(/\/$/, "") + path;
  if (!base) return full;

  if (base.includes("{url}")) {
    return base.replace("{url}", encodeURIComponent(full));
  }
  // Default convention: base + "/proxy?url=" + encoded full URL
  return base + (base.endsWith("/") ? "" : "/") + "proxy?url=" + encodeURIComponent(full);
}

function toISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getRangeSetting() {
  const v = localStorage.getItem(RANGE_KEY);
  return v || "7d";
}

function setRangeSetting(v) {
  localStorage.setItem(RANGE_KEY, v);
  updateRangeLabel();
}

function updateRangeLabel() {
  const map = { "1d": "Today", "3d": "Last 3 days", "7d": "Last 7 days", "1m": "Last 1 month" };
  if (els.currentRangeLabel) els.currentRangeLabel.textContent = map[getRangeSetting()] || "Custom";
}

function computeRangeDates(range = getRangeSetting()) {
  const end = new Date();
  const endStr = toISODate(end);
  const start = new Date(end);
  if (range === "1d") {
    // same day
  } else if (range === "3d") {
    start.setDate(start.getDate() - 2);
  } else if (range === "7d") {
    start.setDate(start.getDate() - 6);
  } else if (range === "1m") {
    start.setMonth(start.getMonth() - 1);
  } else {
    start.setDate(start.getDate() - 6);
  }
  const startStr = toISODate(start);
  return { startStr, endStr };
}

// Removed API key usage paths; admin key only

function listDatesInclusive(startStr, endStr) {
  const out = [];
  const start = new Date(startStr + "T00:00:00Z");
  const end = new Date(endStr + "T00:00:00Z");
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(toISODate(new Date(d)));
  }
  return out;
}

// Removed API key aggregations

function toUnixStartOfDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  return Math.floor(d.getTime() / 1000);
}

function toUnixStartOfNextDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return Math.floor(d.getTime() / 1000);
}

async function fetchOrgCostsDay(adminKey, dateStr) {
  const start = toUnixStartOfDay(dateStr);
  const endExclusive = toUnixStartOfNextDay(dateStr);
  const url = buildProxiedUrl(
    "https://api.openai.com",
    `/v1/organization/costs?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(endExclusive)}`
  );
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminKey}`,
      "Content-Type": "application/json",
    },
    mode: "cors",
  }, 20000);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try { console.error("[OpenAI] org costs error", { date: dateStr, status: res.status, body: text }); } catch {}
    throw new Error(`HTTP ${res.status}`);
  }

  const data = await res.json();
  try { console.log("[OpenAI] /v1/organization/costs payload", { date: dateStr, start_time: start, end_time: endExclusive, payload: data }); } catch {}
  const bucket = Array.isArray(data.data) && data.data[0];
  const result = bucket && Array.isArray(bucket.results) && bucket.results[0];
  const val = result && result.amount && typeof result.amount.value === "number" ? result.amount.value : 0;
  return Number(val || 0);
}

async function fetchOrgCostsRange(adminKey, startStr, endStr) {
  const start = toUnixStartOfDay(startStr);
  // end_time is exclusive; use start of the day after endStr
  const endExclusive = toUnixStartOfNextDay(endStr);
  const baseApi = "https://api.openai.com";
  let url = buildProxiedUrl(baseApi, `/v1/organization/costs?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(endExclusive)}`);

  let total = 0;
  let pageCount = 0;
  const maxPages = 20;

  while (url && pageCount < maxPages) {
    const res = await fetchWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${adminKey}`,
          "Content-Type": "application/json",
        },
        mode: "cors",
      },
      20000
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      try {
        console.error("[OpenAI] org costs range error", { start: startStr, end: endStr, status: res.status, body: text, page: pageCount });
      } catch {}
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    try {
      console.log("[OpenAI] /v1/organization/costs range payload", { start_date: startStr, end_date: endStr, page: pageCount, payload: data });
    } catch {}

    if (data && Array.isArray(data.data)) {
      for (const bucket of data.data) {
        if (bucket && Array.isArray(bucket.results)) {
          for (const r of bucket.results) {
            const v = r && r.amount && typeof r.amount.value === "number" ? r.amount.value : 0;
            total += Number(v || 0);
          }
        }
      }
    }

    if (data && data.has_more && data.next_page) {
      const next = data.next_page;
      if (typeof next === "string") {
        if (/^https?:\/\//i.test(next)) {
          // When server returns absolute URL, re-wrap it via proxy if needed
          try {
            const u = new URL(next);
            url = buildProxiedUrl(u.origin, u.pathname + (u.search || ""));
          } catch {
            url = buildProxiedUrl(baseApi, `/v1/organization/costs${next.startsWith("?") ? next : `?${next}`}`);
          }
        } else if (next.startsWith("/")) {
          url = buildProxiedUrl(baseApi, next);
        } else {
          url = buildProxiedUrl(baseApi, `/v1/organization/costs${next.startsWith("?") ? next : `?${next}`}`);
        }
      } else {
        url = "";
      }
    } else {
      url = "";
    }

    pageCount += 1;
  }

  return total;
}

function addDaysStr(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return toISODate(d);
}

function chunkDateRange(startStr, endStr, chunkDays = 7) {
  const chunks = [];
  let curStart = startStr;
  while (true) {
    const tentativeEnd = addDaysStr(curStart, chunkDays - 1);
    const curEnd = tentativeEnd > endStr ? endStr : tentativeEnd;
    chunks.push({ startStr: curStart, endStr: curEnd });
    if (curEnd === endStr) break;
    curStart = addDaysStr(curEnd, 1);
  }
  return chunks;
}

async function fetchUsageRangeWithAdminKey(adminKey, range = getRangeSetting()) {
  const { startStr, endStr } = computeRangeDates(range);
  try {
    const total = await fetchOrgCostsRange(adminKey, startStr, endStr);
    return { granted: null, used: total, available: null };
  } catch (e) {
    // Fallback: chunk by 7 days to reduce number of calls vs daily
    let totalUSD = 0;
    const chunks = chunkDateRange(startStr, endStr, 7);
    for (const ch of chunks) {
      try {
        const v = await fetchOrgCostsRange(adminKey, ch.startStr, ch.endStr);
        totalUSD += Number(v || 0);
      } catch (err) {
        // As a last resort for this chunk, try per-day within the chunk
        const dates = listDatesInclusive(ch.startStr, ch.endStr);
        for (const ds of dates) {
          try {
            const dv = await fetchOrgCostsDay(adminKey, ds);
            totalUSD += Number(dv || 0);
          } catch (derr) {
            try { console.warn("[OpenAI] skip org costs date due to error", ds, derr); } catch {}
          }
        }
      }
    }
    return { granted: null, used: totalUSD, available: null };
  }
}

// Deepseek: simple balance endpoint. Returns available credit/balance.
async function fetchDeepseekBalance(token) {
  const host = "https://api.deepseek.com";
  const url = buildProxiedUrl(host, "/user/balance");
  const res = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      mode: "cors",
    },
    20000
  );

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try { console.error("[Deepseek] balance error", { status: res.status, body: text }); } catch {}
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  try { console.log("[Deepseek] /user/balance payload", data); } catch {}
  // Prefer USD entry if payload is an array of currency balances
  let available = null;
  let currency = null;
  const toNumberMaybe = (x) => {
    if (typeof x === "number") return x;
    if (typeof x === "string") {
      const n = Number(x.replace(/[,_\s]/g, ""));
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };

  if (Array.isArray(data)) {
    const usd = data.find((e) => e && typeof e.currency === "string" && e.currency.toUpperCase() === "USD");
    if (usd && typeof usd === "object") {
      available =
        toNumberMaybe(usd.total_balance) ??
        toNumberMaybe(usd.available_balance) ??
        toNumberMaybe(usd.remaining_balance) ??
        toNumberMaybe(usd.balance);
      currency = (usd.currency || "").toUpperCase();
    }
  }

  // Handle object payload with `balance_infos` array
  if (available === null && data && Array.isArray(data.balance_infos)) {
    const usd = data.balance_infos.find((e) => e && typeof e.currency === "string" && e.currency.toUpperCase() === "USD");
    const pick = usd || data.balance_infos[0];
    if (pick && typeof pick === "object") {
      available =
        toNumberMaybe(pick.total_balance) ??
        toNumberMaybe(pick.available_balance) ??
        toNumberMaybe(pick.remaining_balance) ??
        toNumberMaybe(pick.balance);
      currency = (pick.currency || "").toUpperCase();
    }
  }

  // If not array or USD not found, try common object field shapes
  if (available === null) {
    const tryFields = [
      "available_balance",
      "remaining_balance",
      "balance",
      "credit",
      "total_balance",
      "available",
    ];
    for (const f of tryFields) {
      if (data && (typeof data[f] === "number" || typeof data[f] === "string")) { available = toNumberMaybe(data[f]); break; }
      if (data && data.data && (typeof data.data[f] === "number" || typeof data.data[f] === "string")) { available = toNumberMaybe(data.data[f]); break; }
    }
    if (available === null && data && data.balance && (typeof data.balance.total === "number" || typeof data.balance.total === "string")) {
      available = toNumberMaybe(data.balance.total);
    }
  }
  try { console.log("[Deepseek] computed available", { available, currency, is_available: data && data.is_available }); } catch {}
  return { granted: null, used: null, available };
}

// Public IP helper (for Grok whitelist guidance)
async function fetchPublicIP() {
  try {
    const res = await fetchWithTimeout(
      "https://api.ipify.org?format=json",
      { method: "GET", headers: { Accept: "application/json" }, mode: "cors" },
      10000
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.ip === "string" ? data.ip : null;
  } catch {
    return null;
  }
}

// Grok (xAI): prepaid balance by team
async function fetchGrokPrepaidBalance(token, teamId) {
  if (!teamId) throw new Error("Missing Grok team ID");
  const host = "https://management-api.x.ai";
  const url = buildProxiedUrl(host, `/v1/billing/teams/${encodeURIComponent(teamId)}/prepaid/balance`);
  const res = await fetchWithTimeout(
    url,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      mode: "cors",
    },
    20000
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    try { console.error("[Grok] prepaid balance error", { status: res.status, body: text }); } catch {}
    throw new Error(`HTTP ${res.status}`);
  }
  const data = await res.json();
  try { console.log("[Grok] /v1/billing/teams/{team_id}/prepaid/balance payload", data); } catch {}
  const raw = data && data.total && (data.total.val ?? data.total.value);
  const n = typeof raw === "string" ? Number(raw) : (typeof raw === "number" ? raw : null);
  // Heuristic: values are likely cents with negative sign; convert to positive USD available
  let available = null;
  if (typeof n === "number" && !Number.isNaN(n)) {
    available = Math.abs(n) / 100;
  }
  return { granted: null, used: null, available };
}

// Removed session token path

async function refreshOne(id, showModal) {
  const acct = getAccounts().find((a) => a.id === id);
  if (!acct) return;
  if (showModal) showLoading(true);
  try {
    let bal;
    const vendor = acct.vendor || "openai";
    if (acct.adminKey) {
      if (vendor === "deepseek") {
        bal = await fetchDeepseekBalance(acct.adminKey);
      } else if (vendor === "grok") {
        bal = await fetchGrokPrepaidBalance(acct.adminKey, acct.teamId);
      } else {
        bal = await fetchUsageRangeWithAdminKey(acct.adminKey);
      }
    } else {
      throw new Error("No admin key found");
    }
    updateAccount(id, { balance: bal, lastUpdated: Date.now(), error: null });
  } catch (e) {
    let errMsg = String(e && e.message ? e.message : e);
    const corsHint = errMsg.includes("Failed to fetch") || errMsg.includes("Network/CORS") ? " • CORS blocked: set a proxy in localStorage key 'openai_cors_proxy'" : "";
    if ((acct.vendor || "openai") === "grok") {
      const ip = await fetchPublicIP();
      if (ip) errMsg += ` • Public IP: ${ip} (whitelist for Grok)`;
    }
    updateAccount(id, { error: errMsg + corsHint, lastUpdated: Date.now() });
  } finally {
    render();
    if (showModal) showLoading(false);
  }
}

async function refreshAllSequential() {
  const list = getAccounts();
  if (!list.length) return;
  showLoading(true);
  for (const a of list) {
    try {
      let bal = { used: null };
      if (a.adminKey) {
        const vendor = a.vendor || "openai";
        if (vendor === "deepseek") {
          bal = await fetchDeepseekBalance(a.adminKey);
        } else if (vendor === "grok") {
          bal = await fetchGrokPrepaidBalance(a.adminKey, a.teamId);
        } else {
          bal = await fetchUsageRangeWithAdminKey(a.adminKey);
        }
      }
      updateAccount(a.id, { balance: bal, lastUpdated: Date.now(), error: null });
    } catch (e) {
      let errMsg = String(e && e.message ? e.message : e);
      const corsHint = errMsg.includes("Failed to fetch") || errMsg.includes("Network/CORS") ? " • CORS blocked: set a proxy in localStorage key 'openai_cors_proxy'" : "";
      if ((a.vendor || "openai") === "grok") {
        const ip = await fetchPublicIP();
        if (ip) errMsg += ` • Public IP: ${ip} (whitelist for Grok)`;
      }
      updateAccount(a.id, { error: errMsg + corsHint, lastUpdated: Date.now() });
    }
    render();
  }
  showLoading(false);
}

function initEvents() {
  if (els.form) {
    els.form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = (els.name.value || "").trim();
      const adminKey = (els.adminKey && els.adminKey.value || "").trim();
      const vendor = (els.vendor && els.vendor.value) || "openai";
      const teamId = (els.teamId && els.teamId.value || "").trim();
      if (!name) return;
      if (!adminKey) {
        alert("Provide an API key.");
        return;
      }
      if (vendor === "grok" && !teamId) {
        alert("Provide the Grok Team ID.");
        return;
      }
      const id = addAccount(name, adminKey, vendor, { teamId });
      els.name.value = "";
      if (els.adminKey) els.adminKey.value = "";
      if (els.teamId) els.teamId.value = "";
      if (els.addKeyModal) els.addKeyModal.classList.add("hidden");
      render();
      await refreshOne(id, true);
    });
  }

  if (els.refreshAll) {
    els.refreshAll.addEventListener("click", () => {
      refreshAllSequential();
    });
  }

  if (els.clearAll) {
    els.clearAll.addEventListener("click", () => {
      if (!confirm("Remove all accounts?")) return;
      saveAccounts([]);
      render();
    });
  }

  els.accounts.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const action = btn.getAttribute("data-action");
    if (action === "remove") {
      if (!confirm("Remove this account?")) return;
      removeAccount(id);
      render();
    } else if (action === "refresh") {
      refreshOne(id, true);
    }
  });

  // Range modal events
  if (els.openAddKeyModal && els.addKeyModal) {
    els.openAddKeyModal.addEventListener("click", () => {
      els.addKeyModal.classList.remove("hidden");
    });
  }
  if (els.closeAddKeyModal) {
    els.closeAddKeyModal.addEventListener("click", () => els.addKeyModal.classList.add("hidden"));
  }
  if (els.cancelAddKey) {
    els.cancelAddKey.addEventListener("click", () => els.addKeyModal.classList.add("hidden"));
  }
  if (els.openRangeModal && els.rangeModal) {
    els.openRangeModal.addEventListener("click", () => {
      // set radio to current
      const val = getRangeSetting();
      document.querySelectorAll('input[name="usageRange"]').forEach((r) => {
        r.checked = r.value === val;
      });
      els.rangeModal.classList.remove("hidden");
    });
  }
  if (els.closeRangeModal) {
    els.closeRangeModal.addEventListener("click", () => els.rangeModal.classList.add("hidden"));
  }
  if (els.cancelRange) {
    els.cancelRange.addEventListener("click", () => els.rangeModal.classList.add("hidden"));
  }
  if (els.saveRange) {
    els.saveRange.addEventListener("click", async () => {
      const sel = document.querySelector('input[name="usageRange"]:checked');
      if (!sel) { els.rangeModal.classList.add("hidden"); return; }
      setRangeSetting(sel.value);
      els.rangeModal.classList.add("hidden");
      await refreshAllSequential();
    });
  }
}

function init() {
  render();
  initEvents();
  updateRangeLabel();
}

document.addEventListener("DOMContentLoaded", init);
