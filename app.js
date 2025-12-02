const STORAGE_KEY = "openai_accounts_v1";
const CORS_PROXY_KEY = "openai_cors_proxy";
const RANGE_KEY = "openai_usage_range"; // '1d' | '7d' | '1m' | '3m'

const els = {
  form: document.getElementById("apiKeyForm"),
  name: document.getElementById("accountName"),
  adminKey: document.getElementById("adminKey"),
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
  infoModal: document.getElementById("infoModal"),
  openInfoModal: document.getElementById("openInfoModal"),
  closeInfoModal: document.getElementById("closeInfoModal"),
  dismissInfoModal: document.getElementById("dismissInfoModal"),
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

function addAccount(name, adminKey) {
  const list = getAccounts();
  const id = crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
  list.push({ id, name, adminKey: adminKey || "", lastUpdated: null, balance: null, error: null });
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
  const hasBalance = !!(a && a.balance);
  const hasUsed = hasBalance && typeof a.balance.used === "number";
  const used = hasUsed ? a.balance.used : null;
  const updated = a.lastUpdated ? new Date(a.lastUpdated).toLocaleString() : "Never";
  const err = a.error ? String(a.error) : "";

  const secretForLabel = a.adminKey || "";
  return `
    <div class="balance-card border border-gray-200 rounded-xl p-5 fade-in">
      <div class="flex items-start justify-between">
        <div>
          <div class="text-sm text-gray-500">${maskKey(secretForLabel)}</div>
          <h3 class="text-lg font-semibold text-gray-800 mt-1">${a.name}</h3>
        </div>
        <div class="flex items-center space-x-2">
          <button data-action="refresh" data-id="${a.id}" class="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg"><i class="fas fa-sync-alt mr-1"></i> Refresh</button>
          <button data-action="remove" data-id="${a.id}" class="text-red-600 hover:text-red-700 text-sm font-medium px-3 py-2 rounded-lg"><i class="fas fa-trash mr-1"></i> Remove</button>
        </div>
      </div>

      <div class="mt-4 grid grid-cols-1 gap-3">
        <div class="bg-gray-50 rounded-lg p-4 text-center">
          <div class="text-xs text-gray-500">Used (range)</div>
          <div class="text-xl font-semibold text-gray-800">${hasUsed ? formatUSD(used) : "—"}</div>
        </div>
      </div>
      <div class="mt-3 flex justify-end text-xs text-gray-500">
        <span>Updated: ${updated}</span>
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

function getProxyBase() {
  const v = localStorage.getItem(CORS_PROXY_KEY);
  if (!v) return "";
  return v.replace(/\/$/, "");
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
  const base = getProxyBase();
  const url = (base ? `${base}` : "https://api.openai.com") + `/v1/organization/costs?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(endExclusive)}`;
  const res = await fetchWithTimeout(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${adminKey}`,
      "Content-Type": "application/json",
    },
    mode: base ? "cors" : "cors",
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
  const base = getProxyBase();
  const baseApi = base ? `${base}` : "https://api.openai.com";
  let url = `${baseApi}/v1/organization/costs?start_time=${encodeURIComponent(start)}&end_time=${encodeURIComponent(endExclusive)}`;

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
        mode: base ? "cors" : "cors",
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
          url = next;
        } else if (next.startsWith("/")) {
          url = baseApi.replace(/\/$/, "") + next;
        } else {
          url = `${baseApi}/v1/organization/costs${next.startsWith("?") ? next : `?${next}`}`;
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

// Removed session token path

async function refreshOne(id, showModal) {
  const acct = getAccounts().find((a) => a.id === id);
  if (!acct) return;
  if (showModal) showLoading(true);
  try {
    let bal;
    if (acct.adminKey) {
      bal = await fetchUsageRangeWithAdminKey(acct.adminKey);
    } else {
      throw new Error("No admin key found");
    }
    updateAccount(id, { balance: bal, lastUpdated: Date.now(), error: null });
  } catch (e) {
    const errMsg = String(e && e.message ? e.message : e);
    const corsHint = errMsg.includes("Failed to fetch") || errMsg.includes("Network/CORS") ? " • CORS blocked: set a proxy in localStorage key 'openai_cors_proxy'" : "";
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
      const bal = a.adminKey ? await fetchUsageRangeWithAdminKey(a.adminKey) : { used: null };
      updateAccount(a.id, { balance: bal, lastUpdated: Date.now(), error: null });
    } catch (e) {
      const errMsg = String(e && e.message ? e.message : e);
      const corsHint = errMsg.includes("Failed to fetch") || errMsg.includes("Network/CORS") ? " • CORS blocked: set a proxy in localStorage key 'openai_cors_proxy'" : "";
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
      if (!name) return;
      if (!adminKey) {
        alert("Provide an Admin Key.");
        return;
      }
      const id = addAccount(name, adminKey);
      els.name.value = "";
      if (els.adminKey) els.adminKey.value = "";
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

  // Information modal events
  const openInfo = () => { if (els.infoModal) els.infoModal.classList.remove("hidden"); };
  const closeInfo = () => { if (els.infoModal) els.infoModal.classList.add("hidden"); };
  if (els.openInfoModal && els.infoModal) {
    els.openInfoModal.addEventListener("click", openInfo);
  }
  if (els.closeInfoModal) {
    els.closeInfoModal.addEventListener("click", closeInfo);
  }
  if (els.dismissInfoModal) {
    els.dismissInfoModal.addEventListener("click", closeInfo);
  }
  if (els.infoModal) {
    els.infoModal.addEventListener("click", (e) => {
      if (e.target === els.infoModal) closeInfo();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && els.infoModal && !els.infoModal.classList.contains("hidden")) {
      e.preventDefault();
      if (els.closeInfoModal) els.closeInfoModal.click(); else els.infoModal.classList.add("hidden");
    }
  });

  // Expose for init to open on load
  initEvents.openInfo = openInfo;
}

function init() {
  render();
  initEvents();
  updateRangeLabel();
  // Show information modal on every visit
  if (typeof initEvents.openInfo === "function") {
    initEvents.openInfo();
  } else if (els.infoModal) {
    els.infoModal.classList.remove("hidden");
  }
}

document.addEventListener("DOMContentLoaded", init);
