/**
 * Per-app monitoring: uptime checks, logs, and screenshot URLs.
 * Persists in localStorage; live checks probe the public URL.
 */

const STORAGE_KEY = 'app_monitoring_v1';

function storageKey() {
  const userId = localStorage.getItem('user_id') || 'anon';
  return `${STORAGE_KEY}:${userId}`;
}

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(storageKey()) || '{}');
  } catch {
    return {};
  }
}

function writeAll(map) {
  localStorage.setItem(storageKey(), JSON.stringify(map));
}

function ensureApp(map, appId) {
  const id = String(appId);
  if (!map[id]) {
    map[id] = {
      status: 'unknown',
      lastChecked: null,
      latencyMs: null,
      uptimePct: null,
      checks: [],
      logs: [],
      screenshotUrl: null,
      screenshotAt: null,
      monitorUrl: null,
    };
  }
  return map[id];
}

function pushLog(entry, level, message, meta = {}) {
  entry.logs = [
    {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      at: new Date().toISOString(),
      level,
      message,
      ...meta,
    },
    ...(entry.logs || []),
  ].slice(0, 100);
}

export function getAppUrl(app) {
  if (!app) return '';
  const raw = app.landing_page || app.domain || app.live_url || '';
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${String(raw).replace(/^\/+/, '')}`;
}

export function screenshotProxyUrl(url, { width = 800, height = 500 } = {}) {
  if (!url) return null;
  const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  // Public screenshot thumbnail service (no API key)
  return `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${normalized}`;
}

export const appMonitoring = {
  get(appId) {
    const map = readAll();
    return ensureApp(map, appId);
  },

  listLogs(appId, limit = 40) {
    return (this.get(appId).logs || []).slice(0, limit);
  },

  setMonitorUrl(appId, url) {
    const map = readAll();
    const entry = ensureApp(map, appId);
    entry.monitorUrl = url || null;
    writeAll(map);
    return entry;
  },

  refreshScreenshot(appId, url) {
    const map = readAll();
    const entry = ensureApp(map, appId);
    const target = url || entry.monitorUrl;
    if (!target) return entry;
    entry.monitorUrl = target;
    entry.screenshotUrl = screenshotProxyUrl(target);
    entry.screenshotAt = new Date().toISOString();
    pushLog(entry, 'info', `Screenshot captured for ${target}`);
    writeAll(map);
    return { ...entry };
  },

  /**
   * Probe URL. Uses no-cors fallback so browsers can still record a soft "reachable" signal.
   */
  async checkUptime(appId, url) {
    const map = readAll();
    const entry = ensureApp(map, appId);
    const target = url || entry.monitorUrl;
    if (!target) {
      pushLog(entry, 'warn', 'No monitor URL configured (set domain or landing page)');
      writeAll(map);
      return { ...entry };
    }

    entry.monitorUrl = target;
    const started = performance.now();
    let ok = false;
    let detail = '';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(target, {
        method: 'GET',
        mode: 'cors',
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      ok = res.ok || (res.status >= 200 && res.status < 500);
      detail = `HTTP ${res.status}`;
    } catch (corsOrNet) {
      // CORS often blocks reading status; try opaque request as soft up signal
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        await fetch(target, {
          method: 'GET',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timer);
        ok = true;
        detail = 'Reachable (opaque / CORS-limited)';
      } catch (err) {
        ok = false;
        detail = err?.name === 'AbortError' ? 'Timeout' : err?.message || 'Unreachable';
      }
    }

    const latencyMs = Math.round(performance.now() - started);
    entry.status = ok ? 'up' : 'down';
    entry.lastChecked = new Date().toISOString();
    entry.latencyMs = latencyMs;
    entry.checks = [
      { at: entry.lastChecked, ok, latencyMs, detail },
      ...(entry.checks || []),
    ].slice(0, 50);

    const recent = entry.checks.slice(0, 20);
    entry.uptimePct = Math.round((recent.filter((c) => c.ok).length / recent.length) * 100);

    pushLog(
      entry,
      ok ? 'info' : 'error',
      ok ? `Uptime check OK — ${latencyMs}ms · ${detail}` : `Uptime check FAILED — ${detail}`,
      { latencyMs }
    );

    if (ok && !entry.screenshotUrl) {
      entry.screenshotUrl = screenshotProxyUrl(target);
      entry.screenshotAt = entry.lastChecked;
    }

    writeAll(map);
    return { ...entry };
  },

  addLog(appId, level, message) {
    const map = readAll();
    const entry = ensureApp(map, appId);
    pushLog(entry, level, message);
    writeAll(map);
    return { ...entry };
  },

  /**
   * Apply status from an external provider (UptimeRobot / Better Stack) or webhook.
   */
  applyExternalStatus(appId, payload = {}) {
    const map = readAll();
    const entry = ensureApp(map, appId);
    const status = payload.status === 'paused' ? 'unknown' : payload.status || entry.status;
    const at = payload.at || new Date().toISOString();

    entry.status = status === 'up' || status === 'down' || status === 'unknown' ? status : 'unknown';
    entry.lastChecked = at;
    entry.source = payload.source || entry.source || 'external';
    if (payload.uptimePct != null) entry.uptimePct = Number(payload.uptimePct);
    if (payload.latencyMs != null) entry.latencyMs = Number(payload.latencyMs);
    if (payload.monitorUrl) entry.monitorUrl = payload.monitorUrl;
    if (payload.monitorId) entry.externalMonitorId = String(payload.monitorId);
    if (payload.monitorName) entry.externalMonitorName = payload.monitorName;

    entry.checks = [
      {
        at,
        ok: entry.status === 'up',
        latencyMs: entry.latencyMs,
        detail: payload.message || payload.source || 'external',
        source: payload.source,
      },
      ...(entry.checks || []),
    ].slice(0, 50);

    if (entry.uptimePct == null && entry.checks.length) {
      const recent = entry.checks.slice(0, 20);
      entry.uptimePct = Math.round((recent.filter((c) => c.ok).length / recent.length) * 100);
    }

    pushLog(
      entry,
      entry.status === 'down' ? 'error' : entry.status === 'up' ? 'info' : 'warn',
      payload.message || `External status → ${entry.status}`,
      { source: payload.source, monitorId: payload.monitorId }
    );

    writeAll(map);
    return { ...entry };
  },
};
